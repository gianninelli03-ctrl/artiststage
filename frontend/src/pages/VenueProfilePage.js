import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import {
  MapPin, Envelope, Phone, Globe, InstagramLogo,
  ArrowLeft, Buildings, CaretLeft, CaretRight, X as XIcon
} from '@phosphor-icons/react';
import { toast } from 'sonner';

function safeUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:' ? url : null;
  } catch {
    return null;
  }
}

export default function VenueProfilePage() {
  const { venueId } = useParams();
  const { user } = useAuth();
  const [venue, setVenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lightboxIdx, setLightboxIdx] = useState(null);
  const touchStartX = useRef(null);

  const mediaImages = (venue?.portfolio_media || []).filter(
    m => m.type?.startsWith('image/') || /\.(jpe?g|png|gif|webp|avif|svg)$/i.test(m.url || '')
  );
  const prevImage = useCallback(() => setLightboxIdx(i => (i > 0 ? i - 1 : i)), []);
  const nextImage = useCallback(() => setLightboxIdx(i => (i < mediaImages.length - 1 ? i + 1 : i)), [mediaImages.length]);

  useEffect(() => {
    if (lightboxIdx === null) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setLightboxIdx(null);
      if (e.key === 'ArrowLeft') prevImage();
      if (e.key === 'ArrowRight') nextImage();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxIdx, prevImage, nextImage]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('visitor_profiles')
          .select('*')
          .eq('user_id', venueId)
          .single();
        if (error) throw error;
        setVenue(data);
      } catch (e) {
        console.error(e);
        setVenue(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [venueId]);

  if (loading) return (
    <div className="min-h-screen bg-[#09090B]">
      <Navbar />
      <div className="pt-24 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-[#FF007A] border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );

  if (!venue) return (
    <div className="min-h-screen bg-[#09090B]">
      <Navbar />
      <div className="pt-24 px-4 max-w-7xl mx-auto text-center py-20">
        <h1 className="text-2xl font-bold mb-4 text-white">Venue non trovato</h1>
        <Link to="/stage" className="btn-primary">Torna a Stage</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#09090B]">
      <Navbar />
      <main className="pt-20">
        {/* Header banner */}
        <div className="relative h-32 md:h-40 lg:h-48">
          <div className="w-full h-full bg-gradient-to-br from-[#00F0FF]/30 to-[#FF007A]/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#09090B] via-transparent to-transparent" />
          <Link to="/stage"
            className="absolute top-4 left-4 glass px-4 py-2 rounded-full flex items-center gap-2 text-sm hover:bg-white/10 transition-colors">
            <ArrowLeft size={18} />Indietro
          </Link>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Colonna sinistra */}
            <div className="lg:col-span-1 card p-6 overflow-visible">
              <div className="flex flex-col items-center text-center mt-16">
                <div className="relative -mt-16 mb-4">
                  {venue.profile_image_url ? (
                    <img src={venue.profile_image_url} alt={venue.name}
                      className="w-32 h-32 rounded-full border-4 border-[#09090B] object-cover bg-zinc-900" />
                  ) : (
                    <div className="w-32 h-32 rounded-full border-4 border-[#09090B] bg-gradient-to-br from-[#00F0FF] to-[#FF007A] flex items-center justify-center">
                      <Buildings size={48} className="text-white" />
                    </div>
                  )}
                </div>

                <h1 className="text-2xl font-bold mb-1 font-['Unbounded'] text-white">{venue.name}</h1>
                {venue.activity_type && <span className="category-badge mb-3">{venue.activity_type}</span>}
                {venue.location && (
                  <p className="flex items-center gap-1 text-zinc-400 text-sm mb-4">
                    <MapPin size={16} />{venue.location}
                  </p>
                )}

                {/* Social links */}
                <div className="flex items-center gap-3 mb-6">
                  {venue.contact_email && (
                    <a href={`mailto:${venue.contact_email}`} className="p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 transition-colors">
                      <Envelope size={20} />
                    </a>
                  )}
                  {venue.phone && (
                    <a href={`tel:${venue.phone}`} className="p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 transition-colors">
                      <Phone size={20} />
                    </a>
                  )}
                  {safeUrl(venue.website) && (
                    <a href={safeUrl(venue.website)} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 transition-colors">
                      <Globe size={20} />
                    </a>
                  )}
                  {safeUrl(venue.instagram) && (
                    <a href={safeUrl(venue.instagram)} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 transition-colors">
                      <InstagramLogo size={20} />
                    </a>
                  )}
                </div>

                {user && user.id !== venue.user_id ? (
                  <Link to={`/messages/${venue.user_id}`}
                    className="btn-primary w-full flex items-center justify-center gap-2">
                    <Envelope size={20} />Contatta
                  </Link>
                ) : !user ? (
                  <Link to="/login" className="btn-primary w-full flex items-center justify-center gap-2">
                    <Envelope size={20} />Accedi per contattare
                  </Link>
                ) : null}
              </div>
            </div>

            {/* Colonna destra */}
            <div className="lg:col-span-2 space-y-6">
              {venue.bio && (
                <div className="card p-6">
                  <h2 className="text-lg font-bold mb-4 text-white">Chi siamo</h2>
                  <p className="text-zinc-300 whitespace-pre-wrap">{venue.bio}</p>
                </div>
              )}

              {venue.portfolio_media?.length > 0 && (
                <div className="card p-6">
                  <h2 className="text-lg font-bold mb-4 text-white">Foto</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {venue.portfolio_media.map(media => {
                      const imgIdx = mediaImages.indexOf(media);
                      return (
                        <div key={media.id} className="rounded-xl overflow-hidden border border-zinc-800">
                          <img
                            src={media.url}
                            alt={media.name}
                            className="w-full h-40 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => imgIdx !== -1 && setLightboxIdx(imgIdx)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {venue.portfolio_urls?.length > 0 && (
                <div className="card p-6">
                  <h2 className="text-lg font-bold mb-4 text-white">Video</h2>
                  {venue.portfolio_urls.map((url, i) => safeUrl(url) && (
                    <a key={i} href={safeUrl(url)} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 mb-2 text-sm text-[#00F0FF] hover:underline">
                      ▶ Video {i + 1}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Lightbox */}
      {lightboxIdx !== null && mediaImages[lightboxIdx] && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95"
          onClick={() => setLightboxIdx(null)}
          onTouchStart={e => { touchStartX.current = e.touches[0].clientX; }}
          onTouchEnd={e => {
            if (touchStartX.current === null) return;
            const dx = e.changedTouches[0].clientX - touchStartX.current;
            if (dx > 50) prevImage();
            else if (dx < -50) nextImage();
            touchStartX.current = null;
          }}
        >
          <button
            onClick={() => setLightboxIdx(null)}
            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
          >
            <XIcon size={20} />
          </button>

          {mediaImages.length > 1 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/60 text-white text-sm z-10">
              {lightboxIdx + 1} / {mediaImages.length}
            </div>
          )}

          {lightboxIdx > 0 && (
            <button
              onClick={e => { e.stopPropagation(); prevImage(); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors z-10"
            >
              <CaretLeft size={24} weight="bold" />
            </button>
          )}

          <img
            src={mediaImages[lightboxIdx].url}
            alt={mediaImages[lightboxIdx].name || ''}
            className="max-w-full max-h-[90vh] object-contain select-none"
            onClick={e => e.stopPropagation()}
            draggable={false}
          />

          {lightboxIdx < mediaImages.length - 1 && (
            <button
              onClick={e => { e.stopPropagation(); nextImage(); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors z-10"
            >
              <CaretRight size={24} weight="bold" />
            </button>
          )}

          {mediaImages[lightboxIdx].name && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-black/60 text-zinc-300 text-sm max-w-xs truncate">
              {mediaImages[lightboxIdx].name}
            </div>
          )}
        </div>
      )}
    </div>
  );
}