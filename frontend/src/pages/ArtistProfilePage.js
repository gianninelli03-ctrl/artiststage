import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import ArtistCalendar from '../components/ArtistCalendar';
import {
  MapPin, Star, Clock, CurrencyDollar, Envelope,
  InstagramLogo, YoutubeLogo, TiktokLogo, Globe,
  Play, Broadcast, ArrowLeft, Heart, UserPlus
} from '@phosphor-icons/react';
import { toast } from 'sonner';

const AVAILABILITY_LABELS = {
  available: { label: 'Disponibile', color: 'text-green-400 bg-green-400/10' },
  busy: { label: 'Occupato', color: 'text-yellow-400 bg-yellow-400/10' },
  unavailable: { label: 'Non disponibile', color: 'text-red-400 bg-red-400/10' }
};

export default function ArtistProfilePage() {
  const { profileId } = useParams();
  const { user } = useAuth();

  const [artist, setArtist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      try {
        // 1. Carica profilo
        let query = supabase.from('artist_profiles').select('*');
        if (profileId) {
          query = query.eq('id', profileId);
        } else if (user?.id) {
          query = query.eq('user_id', user.id);
        }
        const { data, error } = await query.single();
        if (error) throw error;
        setArtist(data);

        // 2. Carica contatori reali
        const [{ count: likesTotal }, { count: followersTotal }] = await Promise.all([
          supabase.from('likes').select('*', { count: 'exact', head: true }).eq('artist_id', data.id),
          supabase.from('followers').select('*', { count: 'exact', head: true }).eq('artist_id', data.id)
        ]);
        setLikesCount(likesTotal || 0);
        setFollowersCount(followersTotal || 0);

        // 3. Controlla interazioni utente corrente
        if (user?.id) {
          const [{ data: likeData }, { data: followData }] = await Promise.all([
            supabase.from('likes').select('id').eq('user_id', user.id).eq('artist_id', data.id).maybeSingle(),
            supabase.from('followers').select('id').eq('follower_id', user.id).eq('artist_id', data.id).maybeSingle()
          ]);
          setLiked(!!likeData);
          setFollowing(!!followData);
        }

      } catch (error) {
        console.error('Errore caricamento artista:', error);
        setArtist(null);
      } finally {
        setLoading(false);
      }
    };

    loadAll();
  }, [profileId, user?.id]);

  const handleLike = async () => {
    if (!user) { toast.error('Accedi per mettere like'); return; }
    try {
      if (liked) {
        await supabase.from('likes').delete().eq('user_id', user.id).eq('artist_id', artist.id);
        setLiked(false);
        setLikesCount(prev => prev - 1);
      } else {
        await supabase.from('likes').insert({ user_id: user.id, artist_id: artist.id });
        setLiked(true);
        setLikesCount(prev => prev + 1);
      }
    } catch (error) {
      console.error(error);
      toast.error('Errore');
    }
  };

  const handleFollow = async () => {
    if (!user) { toast.error('Accedi per seguire'); return; }
    try {
      if (following) {
        await supabase.from('followers').delete().eq('follower_id', user.id).eq('artist_id', artist.id);
        setFollowing(false);
        setFollowersCount(prev => prev - 1);
      } else {
        await supabase.from('followers').insert({ follower_id: user.id, artist_id: artist.id });
        setFollowing(true);
        setFollowersCount(prev => prev + 1);
      }
    } catch (error) {
      console.error(error);
      toast.error('Errore');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090B]">
        <Navbar />
        <div className="pt-24 flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-[#FF007A] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="min-h-screen bg-[#09090B]">
        <Navbar />
        <div className="pt-24 px-4 max-w-7xl mx-auto text-center py-20">
          <h1 className="text-2xl font-bold mb-4 text-white">Artista non trovato</h1>
          <Link to="/discover" className="btn-primary">Torna alla ricerca</Link>
        </div>
      </div>
    );
  }

  const availability = AVAILABILITY_LABELS[artist.availability] || AVAILABILITY_LABELS.available;

  return (
    <div className="min-h-screen bg-[#09090B]">
      <Navbar />

      <main className="pt-20">
        <div className="relative h-32 md:h-40 lg:h-48">
          <div className="w-full h-full bg-gradient-to-br from-[#FF007A]/30 to-[#00F0FF]/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#09090B] via-transparent to-transparent" />
          <Link
            to="/discover"
            className="absolute top-4 left-4 glass px-4 py-2 rounded-full flex items-center gap-2 text-sm hover:bg-white/10 transition-colors"
          >
            <ArrowLeft size={18} />
            Indietro
          </Link>
          {artist.is_live && (
            <div className="absolute top-4 right-4 live-indicator">
              <Broadcast size={16} weight="bold" />
              LIVE
            </div>
          )}
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Colonna sinistra */}
            <div className="lg:col-span-4 card p-6 overflow-visible">
              <div className="flex flex-col items-center text-center mt-24">
                <div className="relative -mt-20 mb-4">
                  {artist.profile_image_url ? (
                    <img
                      src={artist.profile_image_url}
                      alt={artist.stage_name}
                      className="w-32 h-32 rounded-full border-4 border-[#09090B] object-cover bg-zinc-900"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-full border-4 border-[#09090B] bg-gradient-to-br from-[#FF007A] to-[#00F0FF] flex items-center justify-center">
                      <span className="text-4xl font-bold text-white">{artist.stage_name?.charAt(0)}</span>
                    </div>
                  )}
                  {artist.availability === 'available' && (
                    <span className="absolute bottom-2 right-2 w-4 h-4 bg-green-500 rounded-full border-2 border-[#18181B]" />
                  )}
                </div>

                <h1 className="text-2xl font-bold mb-1 font-['Unbounded'] text-white">{artist.stage_name}</h1>
                {!!artist.category && <span className="category-badge mb-3">{artist.category}</span>}
                {artist.location && (
                  <p className="flex items-center gap-1 text-zinc-400 text-sm mb-4">
                    <MapPin size={16} />{artist.location}
                  </p>
                )}

                <div className="flex items-center gap-4 mb-6">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${availability.color}`}>
                    {availability.label}
                  </span>
                  {(artist.rating || 0) > 0 && (
                    <span className="flex items-center gap-1 text-sm">
                      <Star size={16} weight="fill" className="text-yellow-500" />
                      {artist.rating.toFixed(1)} ({artist.reviews_count || 0})
                    </span>
                  )}
                </div>

                {artist.social_links && (
                  <div className="flex items-center gap-3 mb-6">
                    {artist.social_links.instagram && (
                      <a href={artist.social_links.instagram} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 transition-colors">
                        <InstagramLogo size={20} />
                      </a>
                    )}
                    {artist.social_links.youtube && (
                      <a href={artist.social_links.youtube} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 transition-colors">
                        <YoutubeLogo size={20} />
                      </a>
                    )}
                    {artist.social_links.tiktok && (
                      <a href={artist.social_links.tiktok} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 transition-colors">
                        <TiktokLogo size={20} />
                      </a>
                    )}
                    {artist.social_links.website && (
                      <a href={artist.social_links.website} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 transition-colors">
                        <Globe size={20} />
                      </a>
                    )}
                  </div>
                )}

                {user && user.id !== artist.user_id ? (
                  <div className="flex flex-col gap-3 w-full">
                    <div className="flex gap-2 w-full">
                      <button
                        onClick={handleLike}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl border transition-colors ${
                          liked
                            ? 'bg-[#FF007A] border-[#FF007A] text-white'
                            : 'border-zinc-700 text-zinc-400 hover:border-[#FF007A] hover:text-[#FF007A]'
                        }`}
                      >
                        <Heart size={20} weight={liked ? 'fill' : 'regular'} />
                        {likesCount}
                      </button>
                      <button
                        onClick={handleFollow}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl border transition-colors ${
                          following
                            ? 'bg-[#00F0FF]/20 border-[#00F0FF] text-[#00F0FF]'
                            : 'border-zinc-700 text-zinc-400 hover:border-[#00F0FF] hover:text-[#00F0FF]'
                        }`}
                      >
                        <UserPlus size={20} />
                        {following ? 'Seguito' : 'Segui'}
                      </button>
                    </div>
                    <Link
                      to={`/messages/${artist.user_id}`}
                      className="btn-primary w-full flex items-center justify-center gap-2"
                    >
                      <Envelope size={20} />
                      Contatta
                    </Link>
                  </div>
                ) : !user ? (
                  <Link to="/login" className="btn-primary w-full flex items-center justify-center gap-2">
                    <Envelope size={20} />
                    Accedi per contattare
                  </Link>
                ) : null}
              </div>
            </div>

            {/* Colonna centrale */}
            <div className="lg:col-span-5 space-y-6">
              <div className="card p-6">
                <h2 className="text-lg font-bold mb-4 text-white">Bio</h2>
                <p className="text-zinc-300 whitespace-pre-wrap">{artist.bio || 'Nessuna biografia disponibile.'}</p>
              </div>

              {artist.experience && (
                <div className="card p-6">
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-white">
                    <Clock size={20} className="text-[#00F0FF]" />Esperienza
                  </h2>
                  <p className="text-zinc-300 whitespace-pre-wrap">{artist.experience}</p>
                </div>
              )}

              {artist.skills && artist.skills.length > 0 && (
                <div className="card p-6">
                  <h2 className="text-lg font-bold mb-4 text-white">Competenze</h2>
                  <div className="flex flex-wrap gap-2">
                    {artist.skills.map((skill, index) => (
                      <span key={index} className="px-3 py-1 rounded-full bg-zinc-800 text-sm text-zinc-300">{skill}</span>
                    ))}
                  </div>
                </div>
              )}
              <ArtistCalendar
  artistId={artist.id}
  artistUserId={artist.user_id}
  currentUser={user}
  isOwner={user?.id === artist.user_id}
/>
              {artist.portfolio_media && artist.portfolio_media.length > 0 && (
                <div className="card p-6">
                  <h2 className="text-lg font-bold mb-4 text-white">Foto e Video</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {artist.portfolio_media.map((media) => (
                      <div key={media.id} className="rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900">
                        {media.type?.startsWith('image/') ? (
                          <img src={media.url} alt={media.name} className="w-full h-56 object-cover" />
                        ) : media.type?.startsWith('video/') ? (
                          <video controls className="w-full h-56 bg-black" src={media.url} />
                        ) : (
                          <div className="h-56 flex items-center justify-center text-zinc-400 px-4 text-sm">{media.name}</div>
                        )}
                        <div className="p-3">
                          <p className="text-sm text-zinc-200 truncate">{media.name}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Colonna destra */}
            <div className="lg:col-span-3 space-y-6">
              {artist.hourly_rate && (
                <div className="card p-6 border-[#00F0FF]/30">
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-white">
                    <CurrencyDollar size={20} className="text-[#00F0FF]" />Tariffe
                  </h2>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-[#00F0FF]">€{artist.hourly_rate}</p>
                    <p className="text-sm text-zinc-400">all'ora</p>
                  </div>
                </div>
              )}

              {artist.portfolio_urls && artist.portfolio_urls.length > 0 && (
                <div className="card p-6">
                  <h2 className="text-lg font-bold mb-4 text-white">Portfolio Video</h2>
                  <div className="space-y-2">
                    {artist.portfolio_urls.map((url, index) => (
                      <a key={index} href={url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors">
                        <Play size={20} className="text-[#FF007A]" />
                        <span className="text-sm truncate text-zinc-200">Video {index + 1}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="card p-6">
                <h2 className="text-lg font-bold mb-4 text-white">Statistiche</h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Followers</span>
                    <span className="font-medium text-white">{followersCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Like</span>
                    <span className="font-medium text-white">{likesCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Media caricati</span>
                    <span className="font-medium text-white">{artist.portfolio_media?.length || 0}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}