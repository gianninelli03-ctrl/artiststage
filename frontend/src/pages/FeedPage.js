import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import {
  Heart, ChatCircleDots, MapPin, ArrowUp, ArrowDown
} from '@phosphor-icons/react';

function FeedCard({ item, user, onLike, isLiked, likesCount }) {
  const [currentPhoto, setCurrentPhoto] = useState(0);
  const photos = item.photos || [];
  const navigate = useNavigate();

  const goToProfile = () => {
    if (item.type === 'artist') navigate(`/artist/${item.id}`);
    else navigate(`/venue/${item.id}`);
  };

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
      {/* Sfondo sfocato */}
{(photos.length > 0 || item.profile_image_url) && (
  <img
    src={photos.length > 0 ? photos[currentPhoto] : item.profile_image_url}
    alt=""
    className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-60"
  />
)}

{/* Foto principale centrata */}
{photos.length > 0 ? (
  <img src={photos[currentPhoto]} alt={item.name}
    className="absolute inset-0 w-full h-full object-contain" />
) : item.profile_image_url ? (
  <img src={item.profile_image_url} alt={item.name}
    className="absolute inset-0 w-full h-full object-contain" />
) : (
  <div className="absolute inset-0 bg-gradient-to-br from-[#FF007A]/30 to-[#00F0FF]/30" />
)}

      {/* Overlay gradiente */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/30" />

      {/* Indicatori foto */}
      {photos.length > 1 && (
        <div className="absolute top-20 left-0 right-0 flex justify-center gap-1 z-10">
          {photos.map((_, i) => (
            <button key={i} onClick={() => setCurrentPhoto(i)}
              className={`w-1.5 h-1.5 rounded-full transition-all ${i === currentPhoto ? 'bg-white w-4' : 'bg-white/40'}`} />
          ))}
        </div>
      )}

      {/* Frecce foto */}
      {photos.length > 1 && (
        <>
          {currentPhoto > 0 && (
            <button onClick={() => setCurrentPhoto(p => p - 1)}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-black/40 p-2 rounded-full">
              ◀
            </button>
          )}
          {currentPhoto < photos.length - 1 && (
            <button onClick={() => setCurrentPhoto(p => p + 1)}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-black/40 p-2 rounded-full">
              ▶
            </button>
          )}
        </>
      )}

      {/* Info in basso a sinistra */}
      <div className="absolute bottom-0 left-0 right-16 p-6 z-10">
        <button onClick={goToProfile} className="text-left">
          <div className="flex items-center gap-3 mb-3">
            {item.profile_image_url ? (
              <img src={item.profile_image_url} alt={item.name}
                className="w-12 h-12 rounded-full border-2 border-white object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-full border-2 border-white bg-[#FF007A]/20 flex items-center justify-center text-white font-bold">
                {item.name?.charAt(0)}
              </div>
            )}
            <div>
              <h2 className="text-white font-bold text-lg">{item.name}</h2>
              <span className="category-badge text-xs">{item.category}</span>
            </div>
          </div>
          {item.location && (
            <p className="text-zinc-300 text-sm flex items-center gap-1 mb-2">
              <MapPin size={14} />{item.location}
            </p>
          )}
          {item.bio && (
            <p className="text-zinc-300 text-sm line-clamp-2">{item.bio}</p>
          )}
        </button>
      </div>

      {/* Azioni a destra */}
      <div className="absolute right-4 bottom-24 flex flex-col items-center gap-6 z-10">
        <button onClick={() => onLike(item)}
          className="flex flex-col items-center gap-1">
          <div className={`p-3 rounded-full transition-all ${isLiked ? 'bg-[#FF007A]' : 'bg-black/40'}`}>
            <Heart size={24} weight={isLiked ? 'fill' : 'regular'} className="text-white" />
          </div>
          <span className="text-white text-xs font-medium">{likesCount}</span>
        </button>

        <Link to={user ? `/messages/${item.user_id}` : '/login'}
          className="flex flex-col items-center gap-1">
          <div className="p-3 rounded-full bg-black/40">
            <ChatCircleDots size={24} className="text-white" />
          </div>
          <span className="text-white text-xs font-medium">Contatta</span>
        </Link>
      </div>
    </div>
  );
}

export default function FeedPage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likes, setLikes] = useState({});
  const [likesCounts, setLikesCounts] = useState({});
  const containerRef = useRef(null);
  const touchStartY = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        // Carica artisti
        const { data: artists } = await supabase
          .from('artist_profiles')
          .select('*')
          .order('created_at', { ascending: false });

        // Carica venue
        const { data: venues } = await supabase
          .from('visitor_profiles')
          .select('*')
          .order('created_at', { ascending: false });

        // Normalizza artisti
        const artistItems = (artists || []).map(a => ({
          id: a.id,
          user_id: a.user_id,
          type: 'artist',
          name: a.stage_name,
          category: a.category,
          location: a.location,
          bio: a.bio,
          profile_image_url: a.profile_image_url,
          likes_count: a.likes_count || 0,
          photos: (a.portfolio_media || []).map(m => m.url).filter(Boolean),
          created_at: a.created_at
        }));

        // Normalizza venue
        const venueItems = (venues || []).map(v => ({
          id: v.id,
          user_id: v.user_id,
          type: 'venue',
          name: v.name,
          category: v.activity_type,
          location: v.location,
          bio: v.bio || v.description,
          profile_image_url: v.profile_image_url,
          likes_count: 0,
          photos: (v.portfolio_media || []).map(m => m.url).filter(Boolean),
          created_at: v.created_at
        }));

        // Mescola artisti e venue con algoritmo semplice
        const all = [...artistItems, ...venueItems];
        const sorted = all.sort((a, b) => {
          const scorea = (a.likes_count * 2) + (a.photos.length * 0.5) + (new Date(a.created_at) / 1e10);
          const scoreb = (b.likes_count * 2) + (b.photos.length * 0.5) + (new Date(b.created_at) / 1e10);
          return scoreb - scorea;
        });

        setItems(sorted);

        // Conta likes
        const counts = {};
        for (const item of sorted) counts[item.id] = item.likes_count;
        setLikesCounts(counts);

        // Carica likes utente
        if (user?.id) {
          const { data: userLikes } = await supabase
            .from('likes')
            .select('artist_id')
            .eq('user_id', user.id);
          const likedMap = {};
          for (const l of userLikes || []) likedMap[l.artist_id] = true;
          setLikes(likedMap);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id]);

  const handleLike = async (item) => {
    if (!user) return;
    if (item.type !== 'artist') return; // Like solo per artisti per ora

    const isLiked = likes[item.id];
    try {
      if (isLiked) {
        await supabase.from('likes').delete().eq('user_id', user.id).eq('artist_id', item.id);
        setLikes(prev => ({ ...prev, [item.id]: false }));
        setLikesCounts(prev => ({ ...prev, [item.id]: (prev[item.id] || 1) - 1 }));
      } else {
        await supabase.from('likes').insert({ user_id: user.id, artist_id: item.id });
        setLikes(prev => ({ ...prev, [item.id]: true }));
        setLikesCounts(prev => ({ ...prev, [item.id]: (prev[item.id] || 0) + 1 }));
      }
    } catch (e) { console.error(e); }
  };

  const goNext = () => setCurrentIndex(i => Math.min(i + 1, items.length - 1));
  const goPrev = () => setCurrentIndex(i => Math.max(i - 1, 0));

  // Swipe touch
  const handleTouchStart = (e) => { touchStartY.current = e.touches[0].clientY; };
  const handleTouchEnd = (e) => {
    if (!touchStartY.current) return;
    const diff = touchStartY.current - e.changedTouches[0].clientY;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goNext();
      else goPrev();
    }
    touchStartY.current = null;
  };

  // Scroll wheel
  const handleWheel = (e) => {
    if (e.deltaY > 50) goNext();
    else if (e.deltaY < -50) goPrev();
  };

  if (loading) return (
    <div className="min-h-screen bg-[#09090B]">
      <Navbar />
      <div className="pt-24 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-[#FF007A] border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );

  if (items.length === 0) return (
    <div className="min-h-screen bg-[#09090B]">
      <Navbar />
      <div className="pt-24 flex items-center justify-center min-h-[60vh] text-zinc-500">
        Nessun contenuto disponibile
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      <Navbar />

      <div ref={containerRef} className="absolute inset-0 pt-16"
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}>

        {items[currentIndex] && (
          <FeedCard
            item={items[currentIndex]}
            user={user}
            onLike={handleLike}
            isLiked={!!likes[items[currentIndex].id]}
            likesCount={likesCounts[items[currentIndex].id] || 0}
          />
        )}

        {/* Navigazione */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-20">
          <button onClick={goPrev} disabled={currentIndex === 0}
            className={`p-2 rounded-full transition-all ${currentIndex === 0 ? 'opacity-20' : 'bg-black/40 hover:bg-black/60'}`}>
            <ArrowUp size={20} className="text-white" />
          </button>
          <button onClick={goNext} disabled={currentIndex === items.length - 1}
            className={`p-2 rounded-full transition-all ${currentIndex === items.length - 1 ? 'opacity-20' : 'bg-black/40 hover:bg-black/60'}`}>
            <ArrowDown size={20} className="text-white" />
          </button>
        </div>

        {/* Contatore */}
        <div className="absolute top-20 right-4 bg-black/40 px-3 py-1 rounded-full z-20">
          <span className="text-white text-xs">{currentIndex + 1} / {items.length}</span>
        </div>
      </div>
    </div>
  );
}