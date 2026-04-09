import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import {
  Broadcast, MicrophoneSlash, Microphone,
  VideoCamera, VideoCameraSlash, PhoneDisconnect,
  PaperPlaneTilt, Heart, Users
} from '@phosphor-icons/react';
import { toast } from 'sonner';

// STUN pubblici + TURN relay gratuito (Open Relay Project)
// Senza TURN la maggior parte degli utenti dietro NAT non riesce a connettersi
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    {
      urls: ['turn:openrelay.metered.ca:80', 'turn:openrelay.metered.ca:443'],
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turns:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ]
};

export default function LiveStreamPage() {
  const { streamId } = useParams(); // ← param corretto da App.js
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stream, setStream] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isArtist, setIsArtist] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [likes, setLikes] = useState(0);
  const [viewerCount, setViewerCount] = useState(0);
  const [showLikeAnim, setShowLikeAnim] = useState(false);
  const [coinBalance, setCoinBalance] = useState(null);
  const [coinAmount, setCoinAmount] = useState('');
  const [sendingCoins, setSendingCoins] = useState(false);
  const [coinError, setCoinError] = useState('');
  const [videoConnected, setVideoConnected] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const peerConnectionRef = useRef(null);
  const messagesEndRef = useRef(null);
  const channelRef = useRef(null);
  const messagesChannelRef = useRef(null);
  const sessionRef = useRef(null);
  const videoConnectedRef = useRef(false);
  const handleSignalRef = useRef(null); // evita stale closure nel listener broadcast

  // ── Carica dati live ──────────────────────────────────────
  useEffect(() => {
    const loadStream = async () => {
      try {
        const { data, error } = await supabase
          .from('live_streams')
          .select(`*, artist:artist_profiles(id, stage_name, profile_image_url, user_id)`)
          .eq('id', streamId)
          .single();

        if (error || !data) { toast.error('Live non trovata'); navigate('/live'); return; }
        if (!data.is_active) { toast.error('Questa live è terminata'); navigate('/live'); return; }

        setStream(data);
        setLikes(data.likes_count || 0);
        setViewerCount(data.viewer_count || 0);
        setIsArtist(data.artist?.user_id === user?.id);
      } catch (e) {
        console.error(e);
        navigate('/live');
      } finally {
        setLoading(false);
      }
    };

    if (user !== undefined) loadStream();
  }, [streamId, user, navigate]);

  // ── Carica messaggi ───────────────────────────────────────
  useEffect(() => {
    if (!streamId) return;
    supabase.from('live_messages').select('*')
      .eq('live_id', streamId)
      .order('created_at', { ascending: true })
      .limit(100)
      .then(({ data }) => setMessages(data || []));
  }, [streamId]);

  // ── Realtime ──────────────────────────────────────────────
  useEffect(() => {
    if (!streamId || !user?.id || loading) return;

    channelRef.current = supabase.channel(`live_${streamId}`, {
      config: { presence: { key: user.id } }
    });

    channelRef.current.on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'live_messages',
      filter: `live_id=eq.${streamId}`
    }, payload => setMessages(prev => [...prev, payload.new]));

    // Usa ref per evitare stale closure: il listener chiama sempre
    // la versione più recente di handleSignal
    channelRef.current.on('broadcast', { event: 'signal' }, ({ payload }) => {
      handleSignalRef.current?.(payload);
    });

    channelRef.current.on('presence', { event: 'sync' }, () => {
      const count = Object.keys(channelRef.current.presenceState()).length;
      setViewerCount(count);
      supabase.from('live_streams').update({ viewer_count: count }).eq('id', streamId);
    });

    channelRef.current.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channelRef.current.track({ user_id: user.id, name: user.name });
        if (isArtist) startBroadcast();
        else requestStream();
      }
    });

    return () => supabase.removeChannel(channelRef.current);
  }, [streamId, user?.id, loading, isArtist]);

  // Scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── WebRTC: Artista avvia broadcast ──────────────────────
  const startBroadcast = async () => {
    try {
      const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = localStream;
      if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
      await supabase.from('artist_profiles').update({ is_live: true }).eq('user_id', user.id);
      toast.success('Sei in diretta! 🔴');

      // Notifica tutti gli spettatori già presenti che la camera è pronta,
      // così possono re-inviare viewer-join se lo avevano mandato prima
      channelRef.current?.send({
        type: 'broadcast', event: 'signal',
        payload: { type: 'artist-ready' }
      });
    } catch (e) {
      toast.error('Impossibile accedere a webcam/microfono');
      console.error(e);
    }
  };

  // ── WebRTC: Spettatore richiede stream ───────────────────
  const requestStream = useCallback(() => {
    if (!channelRef.current) return;
    // Chiudi eventuale PC precedente prima di richiedere un nuovo stream
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    channelRef.current.send({
      type: 'broadcast', event: 'signal',
      payload: { type: 'viewer-join', viewerId: user?.id }
    });
  }, [user?.id]);

  // ── WebRTC: Gestisce segnali ──────────────────────────────
  const handleSignal = useCallback(async (payload) => {
    if (!payload) return;

    if (isArtist) {
      // ── Lato Artista ──────────────────────────────────────

      if (payload.type === 'viewer-join') {
        const viewerId = payload.viewerId;
        // Se la camera non è ancora pronta, ignora. Lo spettatore riceverà
        // artist-ready e ri-invierà viewer-join
        if (!localStreamRef.current) return;

        // Chiudi eventuale PC precedente per questo viewer (reconnect)
        peerConnectionsRef.current[viewerId]?.close();

        const pc = new RTCPeerConnection(ICE_SERVERS);
        peerConnectionsRef.current[viewerId] = pc;

        localStreamRef.current.getTracks().forEach(track => {
          pc.addTrack(track, localStreamRef.current);
        });

        pc.onicecandidate = ({ candidate }) => {
          if (candidate) channelRef.current?.send({
            type: 'broadcast', event: 'signal',
            payload: { type: 'ice-candidate', candidate, target: viewerId, from: 'artist' }
          });
        };

        pc.onconnectionstatechange = () => {
          if (pc.connectionState === 'failed') {
            pc.close();
            delete peerConnectionsRef.current[viewerId];
          }
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        channelRef.current?.send({
          type: 'broadcast', event: 'signal',
          payload: { type: 'offer', offer, target: viewerId }
        });
      }

      if (payload.type === 'answer' && payload.target === 'artist') {
        const pc = peerConnectionsRef.current[payload.viewerId];
        if (pc && pc.signalingState !== 'stable') {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
        }
      }

      if (payload.type === 'ice-candidate' && payload.from !== 'artist') {
        const pc = peerConnectionsRef.current[payload.viewerId];
        if (pc && pc.remoteDescription && payload.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(payload.candidate)).catch(console.warn);
        }
      }

    } else {
      // ── Lato Spettatore ───────────────────────────────────

      // L'artista ha avviato la camera: ri-chiedi lo stream se non connesso
      if (payload.type === 'artist-ready') {
        if (!videoConnectedRef.current) requestStream();
        return;
      }

      if (payload.type === 'offer' && payload.target === user?.id) {
        // Chiudi eventuale PC precedente
        peerConnectionRef.current?.close();

        const pc = new RTCPeerConnection(ICE_SERVERS);
        peerConnectionRef.current = pc;

        pc.ontrack = (event) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
            setVideoConnected(true);
            videoConnectedRef.current = true;
          }
        };

        pc.onicecandidate = ({ candidate }) => {
          if (candidate) channelRef.current?.send({
            type: 'broadcast', event: 'signal',
            payload: { type: 'ice-candidate', candidate, target: 'artist', viewerId: user.id, from: 'viewer' }
          });
        };

        pc.onconnectionstatechange = () => {
          if (pc.connectionState === 'connected') {
            setVideoConnected(true);
            videoConnectedRef.current = true;
          }
          if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
            setVideoConnected(false);
            videoConnectedRef.current = false;
            // Tenta riconnessione automatica
            setTimeout(() => {
              if (!videoConnectedRef.current) requestStream();
            }, 2000);
          }
        };

        await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        channelRef.current?.send({
          type: 'broadcast', event: 'signal',
          payload: { type: 'answer', answer, target: 'artist', viewerId: user.id }
        });
      }

      if (payload.type === 'ice-candidate' && payload.from === 'artist' && payload.target === user?.id) {
        if (peerConnectionRef.current?.remoteDescription && payload.candidate) {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate)).catch(console.warn);
        }
      }
    }
  }, [isArtist, user?.id, requestStream]);

  // Aggiorna sempre il ref con la versione corrente di handleSignal
  handleSignalRef.current = handleSignal;

  // ── Retry automatico per lo spettatore ───────────────────
  // Se dopo 6 secondi non c'è video, ri-invia viewer-join
  useEffect(() => {
    if (isArtist || loading) return;
    const retry = setInterval(() => {
      if (!videoConnectedRef.current) requestStream();
    }, 6000);
    return () => clearInterval(retry);
  }, [isArtist, loading, requestStream]);

  // ── Controlli artista ─────────────────────────────────────
  const toggleMic = () => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setMicOn(prev => !prev);
  };

  const toggleCam = () => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    setCamOn(prev => !prev);
  };

  const endLive = async () => {
    if (!window.confirm('Vuoi terminare la live?')) return;
    try {
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      Object.values(peerConnectionsRef.current).forEach(pc => pc.close());

      await Promise.all([
        supabase.from('live_streams').update({ is_active: false, ended_at: new Date().toISOString() }).eq('id', streamId),
        supabase.from('artist_profiles').update({ is_live: false }).eq('user_id', user.id)
      ]);

      toast.success('Live terminata');
      navigate('/dashboard');
    } catch (e) {
      toast.error('Errore nella chiusura della live');
    }
  };

  // ── Chat ──────────────────────────────────────────────────
  const sendMessage = async (e) => {
    e?.preventDefault();
    if (!newMessage.trim() || !user || sendingMsg) return;
    setSendingMsg(true);
    try {
      await supabase.from('live_messages').insert({
        live_id: streamId,
        user_id: user.id,
        user_name: user.name,
        user_image: user.profile_image,
        content: newMessage.trim()
      });
      setNewMessage('');
    } catch (e) { console.error(e); }
    finally { setSendingMsg(false); }
  };

  const sendLike = async () => {
    const newLikes = likes + 1;
    setLikes(newLikes);
    setShowLikeAnim(true);
    setTimeout(() => setShowLikeAnim(false), 1000);
    await supabase.from('live_streams').update({ likes_count: newLikes }).eq('id', streamId);
  };

  // ── Saldo monete ─────────────────────────────────────────
  useEffect(() => {
    if (!user?.id || isArtist) return;
    supabase
      .from('coin_balances')
      .select('balance')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => setCoinBalance(data?.balance ?? 0));
  }, [user?.id, isArtist]);

  // ── Invia monete ──────────────────────────────────────────
  const sendCoins = async (amount) => {
    const n = parseInt(amount, 10);
    if (!n || n < 1) return;
    if (coinBalance === null) return;
    if (n > coinBalance) {
      setCoinError('Saldo insufficiente');
      return;
    }
    setSendingCoins(true);
    setCoinError('');
    try {
      const { error: txError } = await supabase.from('coin_transactions').insert({
        user_id: user.id,
        recipient_id: stream?.artist?.user_id,
        amount: n,
        type: 'tip',
        live_id: streamId,
      });
      if (txError) throw txError;

      const { error: balError } = await supabase
        .from('coin_balances')
        .update({ balance: coinBalance - n })
        .eq('user_id', user.id);
      if (balError) throw balError;

      setCoinBalance(prev => prev - n);
      setCoinAmount('');
      toast.success(`🪙 ${n} monete inviate!`);
    } catch (e) {
      console.error(e);
      setCoinError('Errore nell\'invio. Riprova.');
    } finally {
      setSendingCoins(false);
    }
  };

  // ── Chiusura live d'emergenza (tab chiuso / refresh) ─────
  useEffect(() => {
    // Caching della sessione per uso nelle callback non-async
    supabase.auth.getSession().then(({ data }) => {
      sessionRef.current = data.session;
    });
  }, []);

  useEffect(() => {
    if (!isArtist || !streamId) return;

    const endLiveEmergency = () => {
      if (!sessionRef.current) return;
      const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
      const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;
      const token = sessionRef.current.access_token;
      const now = new Date().toISOString();

      fetch(`${SUPABASE_URL}/rest/v1/live_streams?id=eq.${streamId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ is_active: false, ended_at: now }),
        keepalive: true,
      });

      if (user?.id) {
        fetch(`${SUPABASE_URL}/rest/v1/artist_profiles?user_id=eq.${user.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ is_live: false }),
          keepalive: true,
        });
      }
    };

    // pagehide è più affidabile di beforeunload (funziona anche su iOS Safari)
    window.addEventListener('pagehide', endLiveEmergency);
    window.addEventListener('beforeunload', endLiveEmergency);

    return () => {
      window.removeEventListener('pagehide', endLiveEmergency);
      window.removeEventListener('beforeunload', endLiveEmergency);
    };
  }, [isArtist, streamId, user?.id]);

  // ── Cleanup ───────────────────────────────────────────────
  useEffect(() => {
    return () => {
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
      peerConnectionRef.current?.close();
    };
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-[#09090B]">
      <Navbar />
      <div className="pt-24 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-[#FF007A] border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#09090B] flex flex-col">
      <Navbar />

      <main className="flex-1 pt-16 flex flex-col lg:flex-row overflow-hidden" style={{ height: 'calc(100vh - 64px)' }}>

        {/* Video */}
        <div className="flex-1 relative bg-black flex items-center justify-center">
          {isArtist ? (
            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          ) : (
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
          )}

          {/* Placeholder spettatore in attesa — nascosto quando il video è connesso */}
          {!isArtist && !videoConnected && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center text-zinc-500">
                <Broadcast size={64} className="mx-auto mb-4 animate-pulse" />
                <p className="text-sm">Connessione in corso...</p>
                <p className="text-xs text-zinc-600 mt-1">Potrebbe richiedere qualche secondo</p>
              </div>
            </div>
          )}

          {/* Badge LIVE + viewers */}
          <div className="absolute top-4 left-4 flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500 text-white text-sm font-bold">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />LIVE
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 text-white text-sm">
              <Users size={14} />{viewerCount}
            </div>
          </div>

          {/* Artista badge */}
          {stream?.artist && (
            <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60">
              {stream.artist.profile_image_url && (
                <img src={stream.artist.profile_image_url} alt="" className="w-6 h-6 rounded-full object-cover" />
              )}
              <span className="text-white text-sm font-medium">{stream.artist.stage_name}</span>
            </div>
          )}

          {/* Titolo */}
          <div className="absolute bottom-24 left-4">
            <p className="text-white font-bold text-lg drop-shadow">{stream?.title}</p>
          </div>

          {/* Controlli artista */}
          {isArtist && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4">
              <button onClick={toggleMic}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${micOn ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-red-500'}`}>
                {micOn ? <Microphone size={20} className="text-white" /> : <MicrophoneSlash size={20} className="text-white" />}
              </button>
              <button onClick={endLive}
                className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center">
                <PhoneDisconnect size={24} className="text-white" />
              </button>
              <button onClick={toggleCam}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${camOn ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-red-500'}`}>
                {camOn ? <VideoCamera size={20} className="text-white" /> : <VideoCameraSlash size={20} className="text-white" />}
              </button>
            </div>
          )}

          {/* Like animation */}
          {showLikeAnim && (
            <div className="absolute bottom-32 right-8 animate-bounce pointer-events-none">
              <Heart size={40} weight="fill" className="text-[#FF007A]" />
            </div>
          )}
        </div>

        {/* Chat */}
        <div className="w-full lg:w-80 flex flex-col border-l border-zinc-800 bg-[#09090B]" style={{ maxHeight: 'calc(100vh - 64px)' }}>
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
            <h2 className="font-bold text-white">Chat live</h2>
            <div className="flex items-center gap-2 text-zinc-400 text-sm">
              <Heart size={14} className="text-[#FF007A]" />{likes}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <p className="text-center text-zinc-500 text-sm py-8">Sii il primo a scrivere!</p>
            ) : (
              messages.map(msg => (
                <div key={msg.id} className="flex items-start gap-2">
                  {msg.user_image ? (
                    <img src={msg.user_image} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0 mt-0.5" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-[#FF007A]/20 text-[#FF007A] flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      {msg.user_name?.charAt(0)?.toUpperCase()}
                    </div>
                  )}
                  <div>
                    <span className="text-xs font-medium text-[#00F0FF]">{msg.user_name} </span>
                    <span className="text-sm text-white">{msg.content}</span>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-zinc-800">
            {user ? (
              <>
                <form onSubmit={sendMessage} className="flex gap-2 mb-3">
                  <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)}
                    className="input-dark flex-1 text-sm" placeholder="Scrivi un messaggio..." maxLength={200} />
                  <button type="submit" disabled={!newMessage.trim() || sendingMsg} className="btn-primary px-3">
                    <PaperPlaneTilt size={18} weight="fill" />
                  </button>
                </form>
                <button onClick={sendLike}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-zinc-700 text-zinc-400 hover:border-[#FF007A] hover:text-[#FF007A] transition-colors">
                  <Heart size={18} />Metti like
                </button>

                {/* Pannello monete — solo per spettatori */}
                {!isArtist && (
                  <div className="mt-3 p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-zinc-400">Invia monete</span>
                      <span className="text-xs text-yellow-400 font-medium">
                        🪙 {coinBalance ?? '…'}
                      </span>
                    </div>

                    {/* Bottone rapido 1 moneta + input personalizzato */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => sendCoins(1)}
                        disabled={sendingCoins || coinBalance === 0}
                        className="flex-shrink-0 px-3 py-2 rounded-lg bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed text-black text-xs font-bold transition-colors"
                      >
                        🪙 Invia 1
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={coinAmount}
                        onChange={e => { setCoinAmount(e.target.value); setCoinError(''); }}
                        placeholder="Quantità"
                        className="flex-1 min-w-0 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-2 text-white text-xs focus:outline-none focus:border-yellow-500"
                      />
                      <button
                        onClick={() => sendCoins(coinAmount)}
                        disabled={sendingCoins || !coinAmount || coinAmount < 1}
                        className="flex-shrink-0 px-3 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold transition-colors"
                      >
                        Invia
                      </button>
                    </div>

                    {coinError && (
                      <p className="mt-1.5 text-xs text-red-400">{coinError}</p>
                    )}
                  </div>
                )}
              </>
            ) : (
              <p className="text-center text-zinc-500 text-sm">
                <a href="/login" className="text-[#FF007A] hover:underline">Accedi</a> per partecipare alla chat
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}