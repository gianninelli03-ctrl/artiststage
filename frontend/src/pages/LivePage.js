import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import { Broadcast, Users, Play } from '@phosphor-icons/react';

export default function LivePage() {
  const { user } = useAuth();
  const [liveStreams, setLiveStreams] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadLiveStreams = async () => {
    try {
      const { data, error } = await supabase
        .from('live_streams')
        .select(`
          *,
          artist:artist_profiles(id, stage_name, profile_image_url, category, location)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLiveStreams(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLiveStreams();

    // Realtime aggiornamenti live
    const channel = supabase
      .channel('live_streams_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'live_streams'
      }, () => loadLiveStreams())
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  return (
    <div className="min-h-screen bg-[#09090B]">
      <Navbar />

      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Broadcast size={32} weight="duotone" className="text-[#00F0FF]" />
              <h1 className="text-3xl sm:text-4xl font-bold font-['Unbounded']">Live</h1>
            </div>
            <p className="text-zinc-400">Guarda gli artisti in diretta</p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="card animate-pulse">
                  <div className="aspect-video bg-zinc-800 rounded-xl" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-zinc-800 rounded w-3/4" />
                    <div className="h-3 bg-zinc-800 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : liveStreams.length === 0 ? (
            <div className="text-center py-20">
              <Broadcast size={64} className="text-zinc-700 mx-auto mb-4" />
              <h3 className="text-xl font-medium mb-2 text-white">Nessuna live in corso</h3>
              <p className="text-zinc-400 mb-6">Al momento non ci sono artisti in diretta. Torna più tardi!</p>
              <Link to="/discover" className="btn-outline">Scopri gli artisti</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {liveStreams.map(stream => (
                <Link key={stream.id} to={`/live/${stream.id}`} className="card group overflow-hidden">
                  <div className="relative aspect-video overflow-hidden bg-zinc-900">
                    {stream.artist?.profile_image_url ? (
                      <img
                        src={stream.artist.profile_image_url}
                        alt={stream.artist.stage_name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-60"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#FF007A]/30 to-[#00F0FF]/30 flex items-center justify-center">
                        <Broadcast size={48} className="text-white/50" />
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                    {/* Live badge */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500 text-white text-xs font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      LIVE
                    </div>

                    {/* Viewers */}
                    <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full bg-black/60 text-xs text-white">
                      <Users size={12} />
                      {stream.viewer_count || 0}
                    </div>

                    {/* Play overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <Play size={28} weight="fill" className="text-white ml-1" />
                      </div>
                    </div>

                    {/* Info */}
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <h3 className="font-bold text-white mb-0.5">{stream.title}</h3>
                      <p className="text-sm text-zinc-300">{stream.artist?.stage_name}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}