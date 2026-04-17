import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { supabase } from '../supabaseClient';
import { MagnifyingGlass, MapPin, Envelope, X } from '@phosphor-icons/react';
import { useAuth } from '../contexts/AuthContext';

const PAGE_SIZE = 12;

const VENUE_CATEGORIES = [
  'Ristorante', 'Bar / Locale', 'Agenzia eventi',
  'Hotel', 'Teatro', 'Organizzatore privato', 'Altro'
];

export default function StagePage() {
  const { onlineUserIds } = useAuth();
  const [items, setItems] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [onlineFilter, setOnlineFilter] = useState('all');
  const sentinelRef = useRef(null);
  const offsetRef = useRef(0);

  // Debounce della ricerca testuale: 400ms dopo l'ultimo keystroke
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Query con filtri server-side + range per paginazione
  const fetchItems = useCallback(async (from) => {
    let query = supabase
      .from('visitor_profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (activeCategory) query = query.eq('activity_type', activeCategory);
    if (debouncedSearch) query = query.or(`name.ilike.%${debouncedSearch}%,bio.ilike.%${debouncedSearch}%`);
    if (locationFilter) query = query.ilike('location', `%${locationFilter}%`);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }, [activeCategory, debouncedSearch, locationFilter]);

  // Reset e carica pagina 0 quando cambiano i filtri server-side
  useEffect(() => {
    let cancelled = false;
    setItems([]);
    setHasMore(true);
    setLoading(true);
    offsetRef.current = 0;

    fetchItems(0).then(data => {
      if (cancelled) return;
      setItems(data);
      offsetRef.current = data.length;
      setHasMore(data.length === PAGE_SIZE);
      setLoading(false);
    }).catch(e => {
      if (!cancelled) { console.error(e); setLoading(false); }
    });

    return () => { cancelled = true; };
  }, [fetchItems]);

  // Carica la pagina successiva
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const data = await fetchItems(offsetRef.current);
      setItems(prev => [...prev, ...data]);
      offsetRef.current += data.length;
      setHasMore(data.length === PAGE_SIZE);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMore(false);
    }
  }, [fetchItems, loadingMore, hasMore]);

  // IntersectionObserver sul sentinel div
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) loadMore(); },
      { rootMargin: '300px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  // Filtri client-side: search + online
  const visible = useMemo(() => {
    return items.filter(v => {
      if (search) {
        const q = (search || "").toLowerCase().trim();
        if (!v.name?.toLowerCase().includes(q) && !v.bio?.toLowerCase().includes(q)) return false;
      }
      if (onlineFilter === 'online' && !onlineUserIds.has(v.user_id)) return false;
      return true;
    });
  }, [items, search, onlineFilter, onlineUserIds]);

  const hasFilters = activeCategory || locationFilter || onlineFilter !== 'all';

  const clearAll = () => { setActiveCategory(''); setLocationFilter(''); setSearch(''); setOnlineFilter('all'); };

  return (
    <div className="min-h-screen bg-[#09090B]">
      <Navbar />

      {/* Barra filtri fissa */}
      <div className="fixed top-16 left-0 right-0 z-30 bg-[#09090B]/95 backdrop-blur border-b border-zinc-800 px-4 py-3">
        <div className="max-w-7xl mx-auto space-y-3">
          <div className="relative">
            <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Cerca per nome o descrizione..."
              className="input-dark w-full pl-10 py-2 text-sm" />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {/* Toggle Online / Tutti */}
            <div className="flex-shrink-0 flex items-center bg-zinc-900 border border-zinc-700 rounded-full p-0.5 gap-0.5">
              <button
                onClick={() => setOnlineFilter('all')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  onlineFilter === 'all' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Tutti
              </button>
              <button
                onClick={() => setOnlineFilter('online')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  onlineFilter === 'online' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                Online
              </button>
            </div>

            <div className="flex-shrink-0 w-px h-5 bg-zinc-700" />

            <button onClick={() => setActiveCategory('')}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                activeCategory === '' ? 'bg-[#FF007A] border-[#FF007A] text-white' : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
              }`}>
              Tutti
            </button>
            {VENUE_CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(activeCategory === cat ? '' : cat)}
                className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  activeCategory === cat ? 'bg-[#FF007A] border-[#FF007A] text-white' : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
                }`}>
                {cat}
              </button>
            ))}

            <div className="flex-shrink-0 w-px h-5 bg-zinc-700 mx-1" />

            <div className="flex-shrink-0 relative">
              <MapPin size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input type="text" value={locationFilter} onChange={e => setLocationFilter(e.target.value)}
                placeholder="Città..."
                className="bg-zinc-900 border border-zinc-700 rounded-full pl-7 pr-3 py-1 text-xs text-white placeholder-zinc-500 w-28 focus:outline-none focus:border-zinc-500" />
            </div>

            {hasFilters && (
              <button onClick={clearAll}
                className="flex-shrink-0 flex items-center gap-1 px-3 py-1 rounded-full text-xs text-[#FF007A] border border-[#FF007A]/40 hover:bg-[#FF007A]/10 transition-colors">
                <X size={12} />Reset
              </button>
            )}
          </div>
        </div>
      </div>

      <main className="pt-40 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[...Array(PAGE_SIZE)].map((_, i) => (
                <div key={i} className="card animate-pulse aspect-[3/4] bg-zinc-800 rounded-xl" />
              ))}
            </div>
          ) : visible.length === 0 && !hasMore ? (
            <div className="text-center py-20">
              <p className="text-zinc-500 mb-2 text-lg">Nessun venue trovato</p>
              <p className="text-zinc-600 text-sm mb-6">
                {items.length === 0 ? 'Non ci sono ancora venue registrati.' : 'Prova a cambiare i filtri'}
              </p>
              {hasFilters && <button onClick={clearAll} className="btn-outline text-sm">Cancella filtri</button>}
            </div>
          ) : (
            <>
              <p className="text-xs text-zinc-500 mb-4">{visible.length} venue caricati</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {visible.map(venue => (
                  <Link key={venue.id} to={`/venue/${venue.user_id}`}
                    className="group relative rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-zinc-600 transition-colors aspect-[3/4]">
                    {venue.profile_image_url ? (
                      <img src={venue.profile_image_url} alt={venue.name}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
                        <span className="text-5xl">🏛️</span>
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                    {/* Dot online/offline */}
                    <span className={`absolute top-3 right-3 w-2.5 h-2.5 rounded-full border border-black ${onlineUserIds.has(venue.user_id) ? 'bg-green-400' : 'bg-red-500'}`} />

                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      {venue.activity_type && (
                        <span className="category-badge text-[10px] mb-1 inline-block">{venue.activity_type}</span>
                      )}
                      <h3 className="text-sm font-bold text-white leading-tight truncate">{venue.name}</h3>
                      {venue.location && (
                        <p className="flex items-center gap-1 text-[11px] text-zinc-400 mt-0.5">
                          <MapPin size={11} />{venue.location}
                        </p>
                      )}
                      <p className="flex items-center gap-1 text-[11px] text-[#00F0FF] mt-0.5">
                        <Envelope size={11} />Contatta
                      </p>
                    </div>
                  </Link>
                ))}

                {/* Skeleton per loadingMore */}
                {loadingMore && [...Array(PAGE_SIZE)].map((_, i) => (
                  <div key={`more-${i}`} className="card animate-pulse aspect-[3/4] bg-zinc-800 rounded-xl" />
                ))}
              </div>

              {/* Sentinel div — triggerare IntersectionObserver */}
              <div ref={sentinelRef} className="h-8 mt-4" />

              {!hasMore && items.length > 0 && (
                <p className="text-center text-xs text-zinc-600 mt-4">Hai visto tutti i venue</p>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
