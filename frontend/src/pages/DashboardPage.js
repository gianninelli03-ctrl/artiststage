import { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import ArtistCalendar from '../components/ArtistCalendar';
import {
  MicrophoneStage, MapPin, CurrencyDollar,
  Broadcast, Plus, X, Check, Camera, Envelope, Phone,
  Globe, InstagramLogo, Trash, Pencil
} from '@phosphor-icons/react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../components/ui/select';
import { toast } from 'sonner';

const ARTIST_CATEGORIES = [
  { id: 'cantante', name: 'Cantante' },
  { id: 'dj', name: 'DJ' },
  { id: 'musicista', name: 'Musicista' },
  { id: 'band', name: 'Band' },
  { id: 'ballerino', name: 'Ballerino/a' },
  { id: 'cabarettista', name: 'Cabarettista' },
  { id: 'presentatore', name: 'Presentatore/trice' },
  { id: 'attore', name: 'Attore/Attrice' },
  { id: 'intrattenitore', name: 'Intrattenitore' },
  { id: 'altro', name: 'Altro' }
];

const VISITOR_CATEGORIES = [
  'Ristorante', 'Bar / Locale', 'Agenzia eventi',
  'Hotel', 'Teatro', 'Organizzatore privato', 'Altro'
];

const DEFAULT_ARTIST_FORM = {
  stage_name: '', bio: '', category: '', location: '',
  availability: 'available', hourly_rate: '',
  contact_email: '', contact_phone: '',
  portfolio_urls: [], profile_image_url: '', portfolio_media: []
};

const DEFAULT_VISITOR_FORM = {
  name: '', location: '', activity_type: '', bio: '',
  contact_email: '', phone: '', website: '', instagram: '',
  profile_image_url: '', portfolio_urls: [], portfolio_media: []
};

const DELETE_USER_URL = `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/delete-user`;

async function callDeleteUser(userId) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Sessione non trovata');
  const response = await fetch(DELETE_USER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ user_id: userId })
  });
  const result = await response.json();
  if (!result.success) throw new Error(result.error || 'Errore eliminazione');
}

// ─── DASHBOARD VISITATORE ────────────────────────────────────
function VisitorDashboard({ user }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [form, setForm] = useState(DEFAULT_VISITOR_FORM);
  const [newVideoUrl, setNewVideoUrl] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      try {
        const { data } = await supabase
          .from('visitor_profiles').select('*')
          .eq('user_id', user.id).maybeSingle();
        if (data) {
          setProfile(data);
          setForm({
            name: data.name || '',
            location: data.location || '',
            activity_type: data.activity_type || '',
            bio: data.bio || data.description || '',
            contact_email: data.contact_email || '',
            phone: data.phone || '',
            website: data.website || '',
            instagram: data.instagram || '',
            profile_image_url: data.profile_image_url || '',
            portfolio_urls: data.portfolio_urls || [],
            portfolio_media: data.portfolio_media || []
          });
        } else {
          setEditing(true);
        }
      } catch { setEditing(true); }
      finally { setLoading(false); }
    };
    load();
  }, [user?.id]);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const fileName = `visitor_${user.id}/avatar_${Date.now()}.${file.name.split('.').pop()}`;
      const { error } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const url = urlData.publicUrl;
      if (profile) await supabase.from('visitor_profiles').update({ profile_image_url: url }).eq('user_id', user.id);
      setForm(prev => ({ ...prev, profile_image_url: url }));
      setProfile(prev => prev ? { ...prev, profile_image_url: url } : prev);
      toast.success('Foto aggiornata');
    } catch { toast.error('Errore caricamento foto'); }
    finally { setUploadingPhoto(false); e.target.value = ''; }
  };

  const handleSave = async () => {
    if (!form.name || !form.location) { toast.error('Nome e città sono obbligatori'); return; }
    setSaving(true);
    try {
      const { data, error } = await supabase.from('visitor_profiles')
        .upsert({ user_id: user.id, ...form, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
        .select().single();
      if (error) throw error;
      setProfile(data);
      setEditing(false);
      toast.success('Profilo salvato!');
    } catch { toast.error('Errore nel salvataggio'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm('Sei sicuro di voler eliminare il tuo account? Questa azione è irreversibile.')) return;
    try {
      await supabase.from('visitor_profiles').delete().eq('user_id', user.id);
      await callDeleteUser(user.id);
      await supabase.auth.signOut();
      window.location.href = '/';
    } catch (e) { toast.error('Errore: ' + e.message); }
  };

  const handleMediaUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name} supera 10 MB`); e.target.value = ''; return; }
    }
    setUploadingFiles(true);
    try {
      const uploaded = [];
      for (const file of files) {
        const fileName = `visitor_${user.id}/${Date.now()}_${file.name}`;
        const { error } = await supabase.storage.from('portfolio').upload(fileName, file, { upsert: true });
        if (error) throw error;
        const { data: urlData } = supabase.storage.from('portfolio').getPublicUrl(fileName);
        uploaded.push({ id: Date.now() + Math.random(), path: fileName, url: urlData.publicUrl, name: file.name, type: file.type });
      }
      const updatedMedia = [...(form.portfolio_media || []), ...uploaded];
      if (profile) await supabase.from('visitor_profiles').update({ portfolio_media: updatedMedia }).eq('user_id', user.id);
      setForm(prev => ({ ...prev, portfolio_media: updatedMedia }));
      toast.success('Foto caricate!');
    } catch { toast.error('Errore upload'); }
    finally { setUploadingFiles(false); e.target.value = ''; }
  };

  const removeMedia = async (id, path) => {
    try {
      await supabase.storage.from('portfolio').remove([path]);
      const updatedMedia = form.portfolio_media.filter(m => m.id !== id);
      if (profile) await supabase.from('visitor_profiles').update({ portfolio_media: updatedMedia }).eq('user_id', user.id);
      setForm(prev => ({ ...prev, portfolio_media: updatedMedia }));
      toast.success('File rimosso');
    } catch { toast.error('Errore rimozione'); }
  };

  const addVideoUrl = () => {
    const url = newVideoUrl.trim();
    if (!url) return;
    setForm(prev => ({ ...prev, portfolio_urls: [...(prev.portfolio_urls || []), url] }));
    setNewVideoUrl('');
  };

  const removeVideoUrl = (url) => {
    setForm(prev => ({ ...prev, portfolio_urls: prev.portfolio_urls.filter(u => u !== url) }));
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-[#FF007A] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!editing && profile) return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-4">
            {profile.profile_image_url ? (
              <img src={profile.profile_image_url} alt="Profile" className="w-32 h-32 rounded-full object-cover border-4 border-zinc-800" />
            ) : (
              <div className="w-32 h-32 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400"><Camera size={40} /></div>
            )}
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">{profile.name}</h2>
          {profile.activity_type && <span className="category-badge mb-2">{profile.activity_type}</span>}
          <p className="flex items-center gap-1 text-zinc-400 text-sm mb-3"><MapPin size={16} />{profile.location}</p>
          {profile.bio && <p className="text-zinc-300 text-sm max-w-lg mb-4">{profile.bio}</p>}
          <div className="flex items-center gap-3 mb-6">
            {profile.contact_email && <a href={`mailto:${profile.contact_email}`} className="p-2 rounded-full bg-zinc-800 hover:bg-zinc-700"><Envelope size={20} /></a>}
            {profile.phone && <a href={`tel:${profile.phone}`} className="p-2 rounded-full bg-zinc-800 hover:bg-zinc-700"><Phone size={20} /></a>}
            {profile.website && <a href={profile.website} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-zinc-800 hover:bg-zinc-700"><Globe size={20} /></a>}
            {profile.instagram && <a href={profile.instagram} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-zinc-800 hover:bg-zinc-700"><InstagramLogo size={20} /></a>}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setEditing(true)} className="btn-primary flex items-center gap-2"><Pencil size={18} />Modifica Profilo</button>
            <button onClick={handleDelete} className="btn-outline border-red-500/50 text-red-400 hover:bg-red-500/10 flex items-center gap-2"><Trash size={18} />Elimina Account</button>
          </div>
        </div>
      </div>

      {((profile.portfolio_media?.length > 0) || (profile.portfolio_urls?.length > 0)) && (
        <div className="card p-6">
          <h2 className="text-lg font-bold mb-4 text-white">Foto e Video</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {profile.portfolio_media?.map(media => (
              <div key={media.id} className="rounded-xl overflow-hidden border border-zinc-800">
                <img src={media.url} alt={media.name} className="w-full h-40 object-cover" />
              </div>
            ))}
          </div>
          {profile.portfolio_urls?.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 mt-3 text-sm text-[#00F0FF] hover:underline">▶ Video {i + 1}</a>
          ))}
        </div>
      )}

      <div className="card p-6">
        <h2 className="text-lg font-bold mb-4 text-white">Cosa puoi fare</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link to="/discover" className="flex items-center gap-3 p-4 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 transition-colors">
            <MicrophoneStage size={24} className="text-[#FF007A]" />
            <div><p className="font-medium text-white">Scopri Artisti</p><p className="text-xs text-zinc-400">Trova il talento per il tuo evento</p></div>
          </Link>
          <Link to="/messages" className="flex items-center gap-3 p-4 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 transition-colors">
            <Envelope size={24} className="text-[#00F0FF]" />
            <div><p className="font-medium text-white">Messaggi</p><p className="text-xs text-zinc-400">Contatta gli artisti</p></div>
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="text-lg font-bold mb-6 text-white">{profile ? 'Modifica Profilo' : 'Crea il tuo Profilo'}</h2>
        <div className="flex flex-col items-center mb-6">
          <div className="relative mb-3">
            {form.profile_image_url ? (
              <img src={form.profile_image_url} alt="Profile" className="w-28 h-28 rounded-full object-cover border-4 border-zinc-800" />
            ) : (
              <div className="w-28 h-28 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400"><Camera size={32} /></div>
            )}
          </div>
          <label className="cursor-pointer text-sm text-[#FF007A] hover:underline">
            {uploadingPhoto ? 'Caricamento...' : 'Carica foto profilo *'}
            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Nome / Locale / Agenzia *</label>
            <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="input-dark w-full" placeholder="Il tuo nome o nome del locale" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Città *</label>
            <input type="text" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} className="input-dark w-full" placeholder="Città, Regione" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Categoria</label>
            <select value={form.activity_type} onChange={e => setForm(p => ({ ...p, activity_type: e.target.value }))} className="input-dark w-full">
              <option value="">Seleziona...</option>
              {VISITOR_CATEGORIES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2"><Phone size={14} className="inline mr-1" />Telefono</label>
            <input type="text" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className="input-dark w-full" placeholder="+39 000 000 0000" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2"><Envelope size={14} className="inline mr-1" />Email di contatto</label>
            <input type="email" value={form.contact_email} onChange={e => setForm(p => ({ ...p, contact_email: e.target.value }))} className="input-dark w-full" placeholder="email@esempio.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2"><Globe size={14} className="inline mr-1" />Sito web</label>
            <input type="url" value={form.website} onChange={e => setForm(p => ({ ...p, website: e.target.value }))} className="input-dark w-full" placeholder="https://..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2"><InstagramLogo size={14} className="inline mr-1" />Instagram</label>
            <input type="url" value={form.instagram} onChange={e => setForm(p => ({ ...p, instagram: e.target.value }))} className="input-dark w-full" placeholder="https://instagram.com/..." />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-zinc-300 mb-2">Bio</label>
          <textarea value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} className="input-dark w-full h-28 resize-none" placeholder="Descrivi la tua attività e che tipo di artisti cerchi..." />
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-bold mb-4 text-white">Foto del locale</h2>
        <label className="flex items-center justify-center w-full min-h-[100px] border border-dashed border-zinc-700 rounded-xl cursor-pointer hover:border-[#FF007A] transition-colors px-4 text-center">
          <input type="file" accept="image/*" multiple className="hidden" onChange={handleMediaUpload} />
          <div>
            <p className="text-white font-medium">{uploadingFiles ? 'Caricamento...' : 'Clicca per caricare foto'}</p>
            <p className="text-sm text-zinc-400 mt-1">JPG, PNG, WebP — max 10 MB</p>
          </div>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
          {form.portfolio_media?.map(media => (
            <div key={media.id} className="relative rounded-xl overflow-hidden border border-zinc-800">
              <button onClick={() => removeMedia(media.id, media.path)} className="absolute top-2 right-2 z-10 bg-black/70 text-white rounded-full p-1 hover:bg-red-600"><X size={14} /></button>
              <img src={media.url} alt={media.name} className="w-full h-36 object-cover" />
            </div>
          ))}
        </div>

        <h2 className="text-lg font-bold mt-6 mb-4 text-white">Video (URL)</h2>
        <div className="flex gap-2 mb-3">
          <input type="url" value={newVideoUrl} onChange={e => setNewVideoUrl(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addVideoUrl(); } }} className="input-dark flex-1" placeholder="YouTube, Vimeo, TikTok..." />
          <button onClick={addVideoUrl} className="btn-outline px-4"><Plus size={20} /></button>
        </div>
        {form.portfolio_urls?.map((url, i) => (
          <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 mb-2">
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-[#00F0FF] hover:underline truncate flex-1 mr-4">{url}</a>
            <button onClick={() => removeVideoUrl(url)} className="text-zinc-400 hover:text-red-400"><X size={18} /></button>
          </div>
        ))}
      </div>

      <div className="flex justify-between">
        {profile && (
          <button onClick={handleDelete} className="btn-outline border-red-500/50 text-red-400 hover:bg-red-500/10 flex items-center gap-2"><Trash size={18} />Elimina Account</button>
        )}
        <div className="flex gap-3 ml-auto">
          {profile && <button onClick={() => setEditing(false)} className="btn-outline">Annulla</button>}
          <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
            {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Check size={20} />Salva Profilo</>}
          </button>
        </div>
      </div>
    </div>
  );
}

const FREE_PHOTO_LIMIT = 3;

// ─── DASHBOARD ARTISTA ───────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [form, setForm] = useState(DEFAULT_ARTIST_FORM);
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [isPro, setIsPro] = useState(false);

  // ── ref per scroll automatico al calendario via #calendar ──
  const calendarRef = useRef(null);
  const navigate = useNavigate();
  const handleGoLive = async () => {
  if (!profile?.id || !profile?.stage_name) {
    toast.error('Completa il profilo prima di andare in live');
    setEditing(true);
    return;
  }
  const title = window.prompt('Titolo della tua live:', `${profile.stage_name} in Live!`);
  if (!title) return;
  try {
    const { data, error } = await supabase.from('live_streams').insert({
      artist_id: profile.id,
      artist_user_id: user.id,
      title,
      is_active: true
    }).select().single();
    if (error) throw error;

    // Invia notifica a tutti i follower
    const { data: followers } = await supabase
      .from('followers')
      .select('follower_id')
      .eq('artist_id', profile.id);

    if (followers?.length > 0) {
      const notifications = followers.map(f => ({
        user_id: f.follower_id,
        type: 'live',
        title: `${profile.stage_name} è in Live! 🔴`,
        message: `Sta trasmettendo: "${title}"`,
        link: `/live/${data.id}`,
        read: false
      }));
      await supabase.from('notifications').insert(notifications);
    }

    navigate(`/live/${data.id}`);
  } catch (e) {
    toast.error('Errore nell\'avvio della live');
  }
};

  useEffect(() => {
    if (window.location.hash === '#calendar' && calendarRef.current) {
      setTimeout(() => {
        calendarRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 400); // piccolo delay per attendere il render
    }
  }, [profile]); // scatta quando il profilo è caricato e il calendario è montato

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('pro') === 'success') {
      toast.success('Abbonamento Pro attivato! Bentornato.');
      window.history.replaceState(null, '', '/dashboard');
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      try {
        const [{ data, error }, { data: subData }] = await Promise.all([
          supabase.from('artist_profiles').select('*').eq('user_id', user.id).single(),
          supabase.from('artist_subscriptions')
            .select('status, current_period_end')
            .eq('artist_id', user.id)
            .in('status', ['active', 'trialing'])
            .order('current_period_end', { ascending: false })
            .limit(1)
            .maybeSingle()
        ]);

        // Check active subscription (not expired)
        if (subData && subData.current_period_end) {
          const isActive = new Date(subData.current_period_end) > new Date();
          setIsPro(isActive);
        }

        if (error && error.code !== 'PGRST116') throw error;
        if (data) {
          setProfile(data);
          const [{ count: likesTotal }, { count: followersTotal }] = await Promise.all([
            supabase.from('likes').select('*', { count: 'exact', head: true }).eq('artist_id', data.id),
            supabase.from('followers').select('*', { count: 'exact', head: true }).eq('artist_id', data.id)
          ]);
          setProfile(prev => ({ ...prev, likes_count: likesTotal || 0, followers_count: followersTotal || 0 }));
          setForm({
            stage_name: data.stage_name || '',
            bio: data.bio || '',
            category: data.category || '',
            location: data.location || '',
            availability: data.availability || 'available',
            hourly_rate: data.hourly_rate || '',
            contact_email: data.contact_email || '',
            contact_phone: data.contact_phone || '',
            portfolio_urls: data.portfolio_urls || [],
            profile_image_url: data.profile_image_url || '',
            portfolio_media: data.portfolio_media || []
          });
        } else {
          setEditing(true);
        }
      } catch (e) { console.error(e); setEditing(true); }
      finally { setLoading(false); }
    };
    load();
  }, [user?.id]);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const fileName = `${user.id}/avatar_${Date.now()}.${file.name.split('.').pop()}`;
      const { error } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const url = urlData.publicUrl;
      if (profile) await supabase.from('artist_profiles').update({ profile_image_url: url }).eq('user_id', user.id);
      setForm(prev => ({ ...prev, profile_image_url: url }));
      setProfile(prev => prev ? { ...prev, profile_image_url: url } : prev);
      toast.success('Foto aggiornata');
    } catch { toast.error('Errore caricamento foto'); }
    finally { setUploadingPhoto(false); e.target.value = ''; }
  };

  const handleSave = async () => {
    if (!form.profile_image_url) { toast.error('La foto profilo è obbligatoria'); return; }
    if (!form.stage_name || !form.category || !form.location) { toast.error('Nome, categoria e città sono obbligatori'); return; }
    setSaving(true);
    try {
      const { data, error } = await supabase.from('artist_profiles')
        .upsert({
          user_id: user.id,
          stage_name: form.stage_name,
          bio: form.bio,
          category: form.category,
          location: form.location,
          availability: form.availability,
          hourly_rate: form.hourly_rate ? Number(form.hourly_rate) : null,
          contact_email: form.contact_email,
          contact_phone: form.contact_phone,
          portfolio_urls: form.portfolio_urls,
          profile_image_url: form.profile_image_url,
          portfolio_media: form.portfolio_media,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' })
        .select().single();
      if (error) throw error;
      const isNew = !profile;
      setProfile(data);
      setEditing(false);
      toast.success(isNew ? 'Profilo creato!' : 'Profilo aggiornato!');
    } catch (e) { toast.error('Errore: ' + e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm('Sei sicuro di voler eliminare il tuo account? Questa azione è irreversibile.')) return;
    try {
      await supabase.from('artist_profiles').delete().eq('user_id', user.id);
      await callDeleteUser(user.id);
      await supabase.auth.signOut();
      window.location.href = '/';
    } catch (e) { toast.error('Errore: ' + e.message); }
  };

  const handleMediaUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    // Enforce free plan limit
    if (!isPro) {
      const currentCount = form.portfolio_media?.length || 0;
      if (currentCount >= FREE_PHOTO_LIMIT) {
        toast.error(`Piano Free: massimo ${FREE_PHOTO_LIMIT} foto. Passa a Pro per foto illimitate.`);
        navigate('/pricing');
        e.target.value = '';
        return;
      }
      const allowed = FREE_PHOTO_LIMIT - currentCount;
      if (files.length > allowed) {
        toast.error(`Puoi aggiungere solo altre ${allowed} foto con il piano Free.`);
        e.target.value = '';
        return;
      }
    }

    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name} supera 10 MB`); e.target.value = ''; return; }
    }
    setUploadingFiles(true);
    try {
      const uploaded = [];
      for (const file of files) {
        const fileName = `${user.id}/${Date.now()}_${file.name}`;
        const { error } = await supabase.storage.from('portfolio').upload(fileName, file, { upsert: true });
        if (error) throw error;
        const { data: urlData } = supabase.storage.from('portfolio').getPublicUrl(fileName);
        uploaded.push({ id: Date.now() + Math.random(), path: fileName, url: urlData.publicUrl, name: file.name, type: file.type });
      }
      const updatedMedia = [...form.portfolio_media, ...uploaded];
      if (profile) await supabase.from('artist_profiles').update({ portfolio_media: updatedMedia }).eq('user_id', user.id);
      setForm(prev => ({ ...prev, portfolio_media: updatedMedia }));
      toast.success('Foto caricate!');
    } catch { toast.error('Errore upload'); }
    finally { setUploadingFiles(false); e.target.value = ''; }
  };

  const removeMedia = async (id, path) => {
    try {
      await supabase.storage.from('portfolio').remove([path]);
      const updatedMedia = form.portfolio_media.filter(m => m.id !== id);
      if (profile) await supabase.from('artist_profiles').update({ portfolio_media: updatedMedia }).eq('user_id', user.id);
      setForm(prev => ({ ...prev, portfolio_media: updatedMedia }));
      toast.success('File rimosso');
    } catch { toast.error('Errore rimozione'); }
  };

  const addVideoUrl = () => {
    const url = newVideoUrl.trim();
    if (!url) return;
    setForm(prev => ({ ...prev, portfolio_urls: [...prev.portfolio_urls, url] }));
    setNewVideoUrl('');
  };

  const removeVideoUrl = (url) => {
    setForm(prev => ({ ...prev, portfolio_urls: prev.portfolio_urls.filter(u => u !== url) }));
  };

  if (loading) return (
    <div className="min-h-screen bg-[#09090B]">
      <Navbar />
      <div className="pt-24 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-[#FF007A] border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );

  if (user?.user_type === 'visitor') {
    return (
      <div className="min-h-screen bg-[#09090B]">
        <Navbar />
        <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold font-['Unbounded'] text-white">Dashboard</h1>
              <p className="text-zinc-400">Benvenuto, {user?.name}</p>
            </div>
            <VisitorDashboard user={user} />
          </div>
        </main>
      </div>
    );
  }

  if (!editing && profile) {
    return (
      <div className="min-h-screen bg-[#09090B]">
        <Navbar />
        <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold font-['Unbounded'] text-white">Dashboard</h1>
                <p className="text-zinc-400">Benvenuto, {user?.name}</p>
              </div>
              <button onClick={handleGoLive} className="btn-primary flex items-center gap-2">
  <Broadcast size={20} weight="bold" />Vai in Live
</button>
<button onClick={() => navigate('/coins')} className="btn-outline flex items-center gap-2">
  🪙 Shop Monete
</button>
            </div>

            <div className="space-y-6">
              <div className="card p-6">
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-4">
                    {profile.profile_image_url ? (
                      <img src={profile.profile_image_url} alt={profile.stage_name} className="w-32 h-32 rounded-full object-cover border-4 border-zinc-800" />
                    ) : (
                      <div className="w-32 h-32 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400"><Camera size={40} /></div>
                    )}
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-1">{profile.stage_name}</h2>
                  <div className="flex items-center gap-2 mb-2">
                    {profile.category && <span className="category-badge">{profile.category}</span>}
                    {isPro && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#6C63FF]/20 text-[#6C63FF] border border-[#6C63FF]/40">PRO</span>}
                  </div>
                  <p className="flex items-center gap-1 text-zinc-400 text-sm mb-2"><MapPin size={16} />{profile.location}</p>
                  {profile.availability && (
                    <span className={`px-3 py-1 rounded-full text-xs font-medium mb-4 ${
                      profile.availability === 'available' ? 'text-green-400 bg-green-400/10' :
                      profile.availability === 'busy' ? 'text-yellow-400 bg-yellow-400/10' :
                      'text-red-400 bg-red-400/10'
                    }`}>
                      {profile.availability === 'available' ? 'Disponibile' : profile.availability === 'busy' ? 'Occupato' : 'Non disponibile'}
                    </span>
                  )}
                  {profile.bio && <p className="text-zinc-300 text-sm max-w-lg mb-4">{profile.bio}</p>}
                  <div className="flex items-center gap-3 mb-6">
                    {profile.contact_email && <a href={`mailto:${profile.contact_email}`} className="p-2 rounded-full bg-zinc-800 hover:bg-zinc-700"><Envelope size={20} /></a>}
                    {profile.contact_phone && <a href={`tel:${profile.contact_phone}`} className="p-2 rounded-full bg-zinc-800 hover:bg-zinc-700"><Phone size={20} /></a>}
                  </div>
                  {/* Statistiche */}
                  <div className="w-full grid grid-cols-3 gap-3 mb-6 mt-4">
                    <div className="bg-zinc-800/50 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-[#FF007A]">{profile.likes_count || 0}</p>
                      <p className="text-xs text-zinc-400 mt-1">Like</p>
                    </div>
                    <div className="bg-zinc-800/50 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-[#00F0FF]">{profile.followers_count || 0}</p>
                      <p className="text-xs text-zinc-400 mt-1">Followers</p>
                    </div>
                    <div className="bg-zinc-800/50 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-white">{profile.portfolio_media?.length || 0}</p>
                      <p className="text-xs text-zinc-400 mt-1">Foto</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setEditing(true)} className="btn-primary flex items-center gap-2"><Pencil size={18} />Modifica Profilo</button>
                    <button onClick={handleDelete} className="btn-outline border-red-500/50 text-red-400 hover:bg-red-500/10 flex items-center gap-2"><Trash size={18} />Elimina Account</button>
                  </div>
                </div>
              </div>

              {!isPro && (
                <div className="card p-5 flex items-center justify-between gap-4 border border-[#6C63FF]/30 bg-[#6C63FF]/5">
                  <div>
                    <p className="font-semibold text-white">Passa a Pro</p>
                    <p className="text-sm text-zinc-400">Portfolio illimitato, badge verificato e analytics avanzati.</p>
                  </div>
                  <button onClick={() => navigate('/pricing')} className="shrink-0 px-4 py-2 rounded-lg bg-[#6C63FF] text-white text-sm font-bold hover:bg-[#5a52e0] transition-colors">
                    Scopri Pro
                  </button>
                </div>
              )}

              {/* ── CALENDARIO con ref per scroll automatico ── */}
              <div ref={calendarRef}>
                <ArtistCalendar
                  artistId={profile.id}
                  artistUserId={profile.user_id}
                  currentUser={user}
                  isOwner={true}
                />
              </div>

              {profile.portfolio_media?.length > 0 && (
                <div className="card p-6">
                  <h2 className="text-lg font-bold mb-4 text-white">Foto Portfolio</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {profile.portfolio_media.map(media => (
                      <div key={media.id} className="rounded-xl overflow-hidden border border-zinc-800">
                        <img src={media.url} alt={media.name} className="w-full h-40 object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {profile.portfolio_urls?.length > 0 && (
                <div className="card p-6">
                  <h2 className="text-lg font-bold mb-4 text-white">Video Portfolio</h2>
                  {profile.portfolio_urls.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 mb-2 text-sm text-[#00F0FF] hover:underline">▶ Video {i + 1}</a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090B]">
      <Navbar />
      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold font-['Unbounded'] text-white">Dashboard</h1>
            <p className="text-zinc-400">Benvenuto, {user?.name}</p>
          </div>

          <div className="space-y-6">
            <div className="card p-6">
              <h2 className="text-lg font-bold mb-6 text-white">{profile ? 'Modifica Profilo' : 'Crea il tuo Profilo Artista'}</h2>

              <div className="flex flex-col items-center mb-6">
                <div className="relative mb-3">
                  {form.profile_image_url ? (
                    <img src={form.profile_image_url} alt="Profile" className="w-28 h-28 rounded-full object-cover border-4 border-zinc-800" />
                  ) : (
                    <div className="w-28 h-28 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400"><Camera size={32} /></div>
                  )}
                </div>
                <label className="cursor-pointer text-sm text-[#FF007A] hover:underline">
                  {uploadingPhoto ? 'Caricamento...' : 'Carica foto profilo *'}
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Nome d'Arte *</label>
                  <input type="text" value={form.stage_name} onChange={e => setForm(p => ({ ...p, stage_name: e.target.value }))} className="input-dark w-full" placeholder="Il tuo nome d'arte" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Città *</label>
                  <input type="text" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} className="input-dark w-full" placeholder="Città, Regione" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Categoria *</label>
                  <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                    <SelectTrigger className="bg-zinc-900 border-zinc-800">
                      <SelectValue placeholder="Seleziona categoria">{ARTIST_CATEGORIES.find(c => c.id === form.category)?.name || ''}</SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                      {ARTIST_CATEGORIES.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Disponibilità</label>
                  <Select value={form.availability} onValueChange={v => setForm(p => ({ ...p, availability: v }))}>
                    <SelectTrigger className="bg-zinc-900 border-zinc-800"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                      <SelectItem value="available">Disponibile</SelectItem>
                      <SelectItem value="busy">Occupato</SelectItem>
                      <SelectItem value="unavailable">Non disponibile</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2"><Envelope size={14} className="inline mr-1" />Email di contatto</label>
                  <input type="email" value={form.contact_email} onChange={e => setForm(p => ({ ...p, contact_email: e.target.value }))} className="input-dark w-full" placeholder="email@esempio.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2"><Phone size={14} className="inline mr-1" />Telefono</label>
                  <input type="text" value={form.contact_phone} onChange={e => setForm(p => ({ ...p, contact_phone: e.target.value }))} className="input-dark w-full" placeholder="+39 000 000 0000" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2"><CurrencyDollar size={14} className="inline mr-1" />Tariffa oraria (€)</label>
                  <input type="number" value={form.hourly_rate} onChange={e => setForm(p => ({ ...p, hourly_rate: e.target.value }))} className="input-dark w-full" placeholder="50" min="0" />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-zinc-300 mb-2">Bio</label>
                <textarea value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} className="input-dark w-full h-32 resize-none" placeholder="Racconta chi sei, cosa fai, la tua esperienza..." />
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">Foto Portfolio</h2>
                {!isPro && (
                  <span className="text-xs text-zinc-400">
                    {form.portfolio_media?.length || 0}/{FREE_PHOTO_LIMIT} foto (piano Free)
                  </span>
                )}
              </div>
              {!isPro && (form.portfolio_media?.length || 0) >= FREE_PHOTO_LIMIT ? (
                <div className="flex flex-col items-center justify-center p-6 rounded-xl border border-[#6C63FF]/30 bg-[#6C63FF]/5 text-center">
                  <p className="text-white font-medium mb-1">Limite foto raggiunto</p>
                  <p className="text-sm text-zinc-400 mb-4">Con il piano Free puoi caricare massimo {FREE_PHOTO_LIMIT} foto.</p>
                  <button onClick={() => navigate('/pricing')} className="px-4 py-2 rounded-lg bg-[#6C63FF] text-white text-sm font-semibold hover:bg-[#5a52e0] transition-colors">
                    Passa a Pro — foto illimitate
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center w-full min-h-[100px] border border-dashed border-zinc-700 rounded-xl cursor-pointer hover:border-[#FF007A] transition-colors px-4 text-center">
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleMediaUpload} />
                  <div>
                    <p className="text-white font-medium">{uploadingFiles ? 'Caricamento...' : 'Clicca per caricare foto'}</p>
                    <p className="text-sm text-zinc-400 mt-1">JPG, PNG, WebP — max 10 MB</p>
                  </div>
                </label>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
                {form.portfolio_media?.map(media => (
                  <div key={media.id} className="relative rounded-xl overflow-hidden border border-zinc-800">
                    <button onClick={() => removeMedia(media.id, media.path)} className="absolute top-2 right-2 z-10 bg-black/70 text-white rounded-full p-1 hover:bg-red-600"><X size={14} /></button>
                    <img src={media.url} alt={media.name} className="w-full h-36 object-cover" />
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-6">
              <h2 className="text-lg font-bold mb-4 text-white">Video Portfolio (URL)</h2>
              <div className="flex gap-2 mb-3">
                <input type="url" value={newVideoUrl} onChange={e => setNewVideoUrl(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addVideoUrl(); } }} className="input-dark flex-1" placeholder="YouTube, Vimeo, TikTok..." />
                <button onClick={addVideoUrl} className="btn-outline px-4"><Plus size={20} /></button>
              </div>
              {form.portfolio_urls?.map((url, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 mb-2">
                  <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-[#00F0FF] hover:underline truncate flex-1 mr-4">{url}</a>
                  <button onClick={() => removeVideoUrl(url)} className="text-zinc-400 hover:text-red-400"><X size={18} /></button>
                </div>
              ))}
            </div>

            <div className="flex justify-between">
              {profile && (
                <button onClick={handleDelete} className="btn-outline border-red-500/50 text-red-400 hover:bg-red-500/10 flex items-center gap-2"><Trash size={18} />Elimina Account</button>
              )}
              <div className="flex gap-3 ml-auto">
                {profile && <button onClick={() => setEditing(false)} className="btn-outline">Annulla</button>}
                <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
                  {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Check size={20} />{profile ? 'Salva Modifiche' : 'Crea Profilo'}</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}