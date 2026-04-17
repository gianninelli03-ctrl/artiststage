import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import {
  Broadcast, MicrophoneSlash, Microphone,
  VideoCamera, VideoCameraSlash, PhoneDisconnect,
  PaperPlaneTilt, Heart, Users, UserPlus, Check, X,
  CaretDown
} from '@phosphor-icons/react';
import { toast } from 'sonner';

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
  const { streamId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  // ── Stato base ────────────────────────────────────────────
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
  const [coHostUser, setCoHostUser] = useState(null);      // { user_id, name, image } del co-host attivo
  const [participantsOpen, setParticipantsOpen] = useState(true);
  const [coinBalance, setCoinBalance] = useState(null);
  const [coinAmount, setCoinAmount] = useState('');
  const [sendingCoins, setSendingCoins] = useState(false);
  const [coinError, setCoinError] = useState('');
  const [videoConnected, setVideoConnected] = useState(false);

  // ── Stato co-host ─────────────────────────────────────────
  const [coHostRequests, setCoHostRequests] = useState([]); // richieste in attesa (lato artista)
  const [coHostStatus, setCoHostStatus] = useState(null);   // null | 'pending' | 'accepted' (lato viewer)
  const [isCoHost, setIsCoHost] = useState(false);          // viewer diventato co-host
  const [coHostConnected, setCoHostConnected] = useState(false); // artista vede il video co-host
  const [presenceList, setPresenceList] = useState([]);      // lista spettatori da presence
  const [showEndLiveModal, setShowEndLiveModal] = useState(false);

  // ── Refs WebRTC base ──────────────────────────────────────
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const peerConnectionRef = useRef(null);
  const messagesEndRef = useRef(null);
  const channelRef = useRef(null);
  const sessionRef = useRef(null);
  const videoConnectedRef = useRef(false);
  const handleSignalRef = useRef(null);

  // ── Refs WebRTC co-host ───────────────────────────────────
  const coHostPCRef = useRef(null);           // PC del co-host (artist riceve / viewer invia)
  const coHostLocalStreamRef = useRef(null);  // stream locale del co-host
  const coHostLocalVideoRef = useRef(null);   // self-view del co-host (PiP)
  const coHostRemoteVideoRef = useRef(null);  // video co-host visto dall'artista (PiP)
  const startCoHostRef = useRef(null);        // ref a startCoHost per evitare stale closure
  const streamRef = useRef(null);             // ref a stream per usarlo in handleSignal
  const presenceListRef = useRef([]);         // ref a presenceList per accesso nelle closure

  // Tieni streamRef aggiornato
  useEffect(() => { streamRef.current = stream; }, [stream]);

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

    channelRef.current.on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'live_streams',
      filter: `id=eq.${streamId}`
    }, payload => {
      setLikes(payload.new?.likes_count ?? 0);
    });

    channelRef.current.on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'coin_transactions',
      filter: `live_id=eq.${streamId}`
    }, async (payload) => {
      const senderId = payload.new?.from_user;
      const coins = payload.new?.coins;

      let senderName = 'Un utente';
      if (senderId) {
        const [{ data: artist }, { data: visitor }] = await Promise.all([
          supabase
            .from('artist_profiles')
            .select('stage_name')
            .eq('user_id', senderId)
            .maybeSingle(),
          supabase
            .from('visitor_profiles')
            .select('name')
            .eq('user_id', senderId)
            .maybeSingle()
        ]);

        senderName = artist?.stage_name || visitor?.name || senderName;
      }

      setMessages(prev => [...prev, {
        id: `coin-${payload.new?.id ?? Date.now()}`,
        user_name: 'System',
        user_image: null,
        content: `💰 ${senderName} ha inviato ${coins} monete`
      }]);
    });

    channelRef.current.on('broadcast', { event: 'signal' }, ({ payload }) => {
      handleSignalRef.current?.(payload);
    });

    channelRef.current.on('presence', { event: 'sync' }, () => {
      const state = channelRef.current.presenceState();
      const viewers = Object.values(state).flat();
      setViewerCount(viewers.length);
      setPresenceList(viewers);
      presenceListRef.current = viewers;
      supabase.from('live_streams').update({ viewer_count: viewers.length }).eq('id', streamId);
    });

    channelRef.current.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channelRef.current.track({ user_id: user.id, name: user.name, image: user.profile_image });
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
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    channelRef.current.send({
      type: 'broadcast', event: 'signal',
      payload: { type: 'viewer-join', viewerId: user?.id }
    });
  }, [user?.id]);

  // ── Co-host: viewer avvia la propria camera e invia al artista ──
  const startCoHost = useCallback(async () => {
    try {
      const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      coHostLocalStreamRef.current = localStream;
      if (coHostLocalVideoRef.current) coHostLocalVideoRef.current.srcObject = localStream;

      const pc = new RTCPeerConnection(ICE_SERVERS);
      coHostPCRef.current = pc;
      localStream.getTracks().forEach(t => pc.addTrack(t, localStream));

      pc.onicecandidate = ({ candidate }) => {
        if (candidate) channelRef.current?.send({
          type: 'broadcast', event: 'signal',
          payload: { type: 'cohost-ice', candidate, viewerId: user?.id, from: 'cohost' }
        });
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      channelRef.current?.send({
        type: 'broadcast', event: 'signal',
        payload: { type: 'cohost-offer', offer, viewerId: user?.id }
      });
    } catch {
      toast.error('Impossibile accedere a webcam/microfono');
      setIsCoHost(false);
      setCoHostStatus(null);
    }
  }, [user?.id]);

  // Tieni startCoHostRef aggiornato
  useEffect(() => { startCoHostRef.current = startCoHost; }, [startCoHost]);

  // ── WebRTC: Gestisce tutti i segnali ─────────────────────
  const handleSignal = useCallback(async (payload) => {
    if (!payload) return;

    if (isArtist) {
      // ── Lato Artista ──────────────────────────────────────

      if (payload.type === 'viewer-join') {
        const viewerId = payload.viewerId;
        if (!localStreamRef.current) return;
        peerConnectionsRef.current[viewerId]?.close();
        const pc = new RTCPeerConnection(ICE_SERVERS);
        peerConnectionsRef.current[viewerId] = pc;
        localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current));
        pc.onicecandidate = ({ candidate }) => {
          if (candidate) channelRef.current?.send({
            type: 'broadcast', event: 'signal',
            payload: { type: 'ice-candidate', candidate, target: viewerId, from: 'artist' }
          });
        };
        pc.onconnectionstatechange = () => {
          if (pc.connectionState === 'failed') { pc.close(); delete peerConnectionsRef.current[viewerId]; }
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
        if (pc?.remoteDescription && payload.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(payload.candidate)).catch(console.warn);
        }
      }

      // ── Co-host: artista riceve richiesta ─────────────────
      if (payload.type === 'cohost-request') {
        const req = { viewerId: payload.viewerId, viewerName: payload.viewerName, viewerImage: payload.viewerImage };
        setCoHostRequests(prev => prev.find(r => r.viewerId === payload.viewerId) ? prev : [...prev, req]);
        toast(`🎤 ${payload.viewerName} vuole salire in live`);
      }

      // ── Co-host: artista riceve offer dal co-host ─────────
      if (payload.type === 'cohost-offer') {
        // Salva l'identità del co-host (per il flusso invito, dove acceptRequest non viene chiamato)
        if (!coHostUser) {
          const fromPresence = presenceListRef.current.find(v => v.user_id === payload.viewerId);
          if (fromPresence) {
            setCoHostUser({ user_id: payload.viewerId, name: fromPresence.name, image: fromPresence.image });
          }
        }

        coHostPCRef.current?.close();
        const pc = new RTCPeerConnection(ICE_SERVERS);
        coHostPCRef.current = pc;

        pc.ontrack = (e) => {
          if (coHostRemoteVideoRef.current) coHostRemoteVideoRef.current.srcObject = e.streams[0];
          setCoHostConnected(true);
        };
        pc.onconnectionstatechange = () => {
          if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
            setCoHostConnected(false);
            setCoHostUser(null);
          }
        };
        pc.onicecandidate = ({ candidate }) => {
          if (candidate) channelRef.current?.send({
            type: 'broadcast', event: 'signal',
            payload: { type: 'cohost-ice', candidate, viewerId: payload.viewerId, from: 'artist' }
          });
        };

        await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        channelRef.current?.send({
          type: 'broadcast', event: 'signal',
          payload: { type: 'cohost-answer', answer, viewerId: payload.viewerId }
        });
        setCoHostRequests(prev => prev.filter(r => r.viewerId !== payload.viewerId));
      }

      if (payload.type === 'cohost-ice' && payload.from === 'cohost') {
        if (coHostPCRef.current?.remoteDescription && payload.candidate) {
          await coHostPCRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate)).catch(console.warn);
        }
      }

      if (payload.type === 'cohost-leave') {
        coHostPCRef.current?.close();
        coHostPCRef.current = null;
        if (coHostRemoteVideoRef.current) coHostRemoteVideoRef.current.srcObject = null;
        setCoHostConnected(false);
        setCoHostUser(null);
        toast(`Il co-host ha lasciato la live`);
      }

      if (payload.type === 'cohost-reject-invite') {
        toast(`Lo spettatore ha rifiutato l'invito`);
      }

    } else {
      // ── Lato Spettatore / Co-host ─────────────────────────

      if (payload.type === 'artist-ready') {
        if (!videoConnectedRef.current) requestStream();
        return;
      }

      if (payload.type === 'offer' && payload.target === user?.id) {
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
          if (pc.connectionState === 'connected') { setVideoConnected(true); videoConnectedRef.current = true; }
          if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
            setVideoConnected(false);
            videoConnectedRef.current = false;
            setTimeout(() => { if (!videoConnectedRef.current) requestStream(); }, 2000);
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

      // ── Co-host: viewer riceve accettazione ───────────────
      if (payload.type === 'cohost-accept' && payload.viewerId === user?.id) {
        setIsCoHost(true);
        setCoHostStatus('accepted');
        toast.success('Sei salito in live! 🎤');
        startCoHostRef.current?.();
      }

      // ── Co-host: viewer riceve rifiuto ────────────────────
      if (payload.type === 'cohost-reject' && payload.viewerId === user?.id) {
        setCoHostStatus(null);
        toast.error('Richiesta rifiutata dal presentatore');
      }

      // ── Co-host: viewer riceve invito dall'artista ────────
      if (payload.type === 'cohost-invite' && payload.viewerId === user?.id) {
        const artistName = streamRef.current?.artist?.stage_name || 'Il presentatore';
        toast(`🎤 ${artistName} ti invita a salire in live!`, {
          duration: 15000,
          action: {
            label: 'Accetta',
            onClick: () => {
              setIsCoHost(true);
              setCoHostStatus('accepted');
              startCoHostRef.current?.();
            }
          },
          cancel: {
            label: 'Rifiuta',
            onClick: () => {
              channelRef.current?.send({
                type: 'broadcast', event: 'signal',
                payload: { type: 'cohost-reject-invite', viewerId: user?.id }
              });
            }
          }
        });
      }

      // ── Co-host: viewer riceve answer dall'artista ────────
      if (payload.type === 'cohost-answer' && payload.viewerId === user?.id) {
        if (coHostPCRef.current?.signalingState !== 'stable') {
          await coHostPCRef.current.setRemoteDescription(new RTCSessionDescription(payload.answer));
        }
      }

      if (payload.type === 'cohost-ice' && payload.from === 'artist' && payload.viewerId === user?.id) {
        if (coHostPCRef.current?.remoteDescription && payload.candidate) {
          await coHostPCRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate)).catch(console.warn);
        }
      }
    }
  }, [isArtist, user?.id, requestStream]);

  handleSignalRef.current = handleSignal;

  // ── Retry automatico per lo spettatore ───────────────────
  useEffect(() => {
    if (isArtist || loading) return;
    const retry = setInterval(() => {
      if (!videoConnectedRef.current) requestStream();
    }, 6000);
    return () => clearInterval(retry);
  }, [isArtist, loading, requestStream]);

  // ── Azioni co-host ────────────────────────────────────────

  // Viewer chiede di salire
  const requestCoHost = () => {
    if (!user || coHostStatus === 'pending') return;
    setCoHostStatus('pending');
    channelRef.current?.send({
      type: 'broadcast', event: 'signal',
      payload: { type: 'cohost-request', viewerId: user.id, viewerName: user.name, viewerImage: user.profile_image }
    });
    toast('Richiesta inviata, attendi l\'approvazione del presentatore');
  };

  // Artista accetta richiesta
  const acceptRequest = (viewerId) => {
    const req = coHostRequests.find(r => r.viewerId === viewerId);
    if (req) setCoHostUser({ user_id: viewerId, name: req.viewerName, image: req.viewerImage });
    channelRef.current?.send({
      type: 'broadcast', event: 'signal',
      payload: { type: 'cohost-accept', viewerId }
    });
    setCoHostRequests(prev => prev.filter(r => r.viewerId !== viewerId));
  };

  // Artista rifiuta richiesta
  const rejectRequest = (viewerId) => {
    channelRef.current?.send({
      type: 'broadcast', event: 'signal',
      payload: { type: 'cohost-reject', viewerId }
    });
    setCoHostRequests(prev => prev.filter(r => r.viewerId !== viewerId));
  };

  // Artista invita uno spettatore
  const inviteViewer = (viewerId) => {
    channelRef.current?.send({
      type: 'broadcast', event: 'signal',
      payload: { type: 'cohost-invite', viewerId }
    });
    toast('Invito inviato');
  };

  // Co-host lascia la live
  const leaveCoHost = () => {
    coHostLocalStreamRef.current?.getTracks().forEach(t => t.stop());
    coHostLocalStreamRef.current = null;
    coHostPCRef.current?.close();
    coHostPCRef.current = null;
    if (coHostLocalVideoRef.current) coHostLocalVideoRef.current.srcObject = null;
    setIsCoHost(false);
    setCoHostStatus(null);
    setCoHostConnected(false);
    setCoHostUser(null);
    channelRef.current?.send({
      type: 'broadcast', event: 'signal',
      payload: { type: 'cohost-leave', viewerId: user?.id }
    });
  };

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

  const endLive = () => {
    setShowEndLiveModal(true);
  };

  const confirmEndLive = async () => {
    setShowEndLiveModal(false);
    try {
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
      coHostPCRef.current?.close();
      setCoHostUser(null);
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
    await supabase.rpc('increment_likes', { stream_id: streamId });
  };

  // ── Saldo monete ──────────────────────────────────────────
  useEffect(() => {
    if (!user?.id || isArtist) return;
    supabase.from('coin_balances').select('balance').eq('user_id', user.id).single()
      .then(({ data }) => setCoinBalance(data?.balance ?? 0));
  }, [user?.id, isArtist]);

  const sendCoins = async (amount) => {
    const n = parseInt(amount, 10);
    if (!n || n < 1 || coinBalance === null) return;
    if (n > coinBalance) { setCoinError('Saldo insufficiente'); return; }
    setSendingCoins(true);
    setCoinError('');
    try {
      const { error } = await supabase.rpc('send_coins', {
        p_recipient_id: stream?.artist?.user_id,
        p_amount: n,
        p_live_id: streamId
      });
      if (error) throw error;
      setCoinBalance(prev => prev - n);
      setCoinAmount('');
      toast.success(`🪙 ${n} monete inviate!`);
    } catch (e) {
      setCoinError('Errore nell\'invio. Riprova.');
    } finally {
      setSendingCoins(false);
    }
  };

  // ── Chiusura emergenza ────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { sessionRef.current = data.session; });
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
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ is_active: false, ended_at: now }),
        keepalive: true,
      });
      if (user?.id) {
        fetch(`${SUPABASE_URL}/rest/v1/artist_profiles?user_id=eq.${user.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ is_live: false }),
          keepalive: true,
        });
      }
    };
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
      coHostLocalStreamRef.current?.getTracks().forEach(t => t.stop());
      Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
      peerConnectionRef.current?.close();
      coHostPCRef.current?.close();
    };
  }, []);

  // ── Render ────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-[#09090B]">
      <Navbar />
      <div className="pt-24 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-[#FF007A] border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );

  // Viewer della presence list: esclude l'artista e l'eventuale co-host già attivo
  const invitableViewers = presenceList.filter(v =>
    v.user_id !== user?.id &&
    !(coHostConnected && coHostUser?.user_id === v.user_id)
  );

  return (
    <div className="h-screen bg-[#09090B] flex flex-col overflow-hidden">
      <Navbar />

      <main className="flex-1 pt-16 flex flex-row overflow-hidden h-[calc(100dvh-64px)]">

        {/* ── Area Video ──────────────────────────────────── */}
        <div className="flex-1 relative bg-black flex items-center justify-center">

          {/* Video principale */}
          {isArtist ? (
            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          ) : (
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
          )}

          {/* Placeholder spettatore in attesa */}
          {!isArtist && !videoConnected && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center text-zinc-500">
                <Broadcast size={64} className="mx-auto mb-4 animate-pulse" />
                <p className="text-sm">Connessione in corso...</p>
                <p className="text-xs text-zinc-600 mt-1">Potrebbe richiedere qualche secondo</p>
              </div>
            </div>
          )}

          {/* PiP co-host: l'artista vede il video del co-host */}
          {isArtist && coHostConnected && (
            <div className="absolute bottom-24 left-4 w-32 h-24 rounded-xl overflow-hidden border-2 border-[#FF007A] shadow-lg shadow-[#FF007A]/30">
              <video ref={coHostRemoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <div className="absolute bottom-1 left-1 text-[10px] text-white bg-black/60 px-1 rounded">co-host</div>
            </div>
          )}

          {/* PiP self-view: il co-host vede se stesso */}
          {isCoHost && (
            <div className="absolute bottom-24 left-4 w-32 h-24 rounded-xl overflow-hidden border-2 border-[#00F0FF] shadow-lg shadow-[#00F0FF]/30">
              <video ref={coHostLocalVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              <div className="absolute bottom-1 left-1 text-[10px] text-white bg-black/60 px-1 rounded">Tu</div>
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
          <div className="absolute bottom-24 left-4" style={{ left: isArtist && coHostConnected ? '10rem' : '1rem' }}>
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

        {/* ── Chat + Partecipanti ─────────────────────────── */}
        <div className="w-80 max-w-[42vw] flex flex-col border-l border-zinc-800 bg-[#09090B] h-full">
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
            <h2 className="font-bold text-white">Chat live</h2>
            <div className="flex items-center gap-2 text-zinc-400 text-sm">
              <Heart size={14} className="text-[#FF007A]" />{likes}
            </div>
          </div>

          {/* ── Sezione Partecipanti (solo per l'artista) ─── */}
          {isArtist && (
            <div className="border-b border-zinc-800 flex-shrink-0">
              {/* Header collassabile */}
              <button
                onClick={() => setParticipantsOpen(p => !p)}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-zinc-800/40 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Users size={13} className="text-zinc-400 flex-shrink-0" />
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                    Partecipanti
                  </span>
                  <span className="text-[11px] text-zinc-600">
                    {coHostConnected ? '1 co-host · ' : ''}{invitableViewers.length} online
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {coHostRequests.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-[#FF007A] text-white text-[10px] font-bold leading-none">
                      {coHostRequests.length}
                    </span>
                  )}
                  <CaretDown
                    size={13}
                    className={`text-zinc-500 transition-transform duration-200 ${participantsOpen ? 'rotate-180' : ''}`}
                  />
                </div>
              </button>

              {participantsOpen && (
                <div className="max-h-48 overflow-y-auto px-3 pb-3 space-y-2">

                  {/* Co-host attivo */}
                  {coHostConnected && coHostUser && (
                    <div className="mt-2">
                      <p className="text-[10px] font-semibold text-[#00F0FF] uppercase tracking-wider mb-1.5">
                        Co-host attivo
                      </p>
                      <div className="flex items-center gap-2 px-2 py-2 rounded-xl bg-[#00F0FF]/5 border border-[#00F0FF]/20">
                        {coHostUser.image ? (
                          <img src={coHostUser.image} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-[#00F0FF]/20 flex items-center justify-center text-[#00F0FF] font-bold text-sm flex-shrink-0">
                            {coHostUser.name?.charAt(0)?.toUpperCase()}
                          </div>
                        )}
                        <span className="text-white text-sm flex-1 truncate">{coHostUser.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#00F0FF]/20 text-[#00F0FF] font-bold flex-shrink-0">LIVE</span>
                      </div>
                    </div>
                  )}

                  {/* Richieste co-host in attesa */}
                  {coHostRequests.length > 0 && (
                    <div className="mt-2">
                      <p className="text-[10px] font-semibold text-[#FF007A] uppercase tracking-wider mb-1.5">
                        Richieste ({coHostRequests.length})
                      </p>
                      <div className="space-y-1.5">
                        {coHostRequests.map(req => (
                          <div key={req.viewerId} className="flex items-center gap-2 px-2 py-2 rounded-xl bg-[#FF007A]/5 border border-[#FF007A]/20">
                            {req.viewerImage ? (
                              <img src={req.viewerImage} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-[#FF007A]/20 flex items-center justify-center text-[#FF007A] font-bold text-sm flex-shrink-0">
                                {req.viewerName?.charAt(0)?.toUpperCase()}
                              </div>
                            )}
                            <span className="text-white text-sm flex-1 truncate">{req.viewerName}</span>
                            <button
                              onClick={() => acceptRequest(req.viewerId)}
                              className="p-1.5 rounded-lg bg-green-500/20 hover:bg-green-500/40 text-green-400 transition-colors flex-shrink-0"
                              title="Accetta"
                            >
                              <Check size={14} weight="bold" />
                            </button>
                            <button
                              onClick={() => rejectRequest(req.viewerId)}
                              className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-400 transition-colors flex-shrink-0"
                              title="Rifiuta"
                            >
                              <X size={14} weight="bold" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Spettatori online invitabili */}
                  <div className="mt-2">
                    <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
                      Spettatori online ({invitableViewers.length})
                    </p>
                    {invitableViewers.length === 0 ? (
                      <p className="text-zinc-600 text-xs py-1 px-1">
                        Nessuno spettatore loggato online
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {invitableViewers.map(v => (
                          <div key={v.user_id} className="flex items-center gap-2 px-2 py-1.5 rounded-xl bg-zinc-800/40">
                            {v.image ? (
                              <img src={v.image} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center text-zinc-300 font-bold text-xs flex-shrink-0">
                                {v.name?.charAt(0)?.toUpperCase()}
                              </div>
                            )}
                            <span className="text-white text-xs flex-1 truncate">{v.name}</span>
                            <button
                              onClick={() => inviteViewer(v.user_id)}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#FF007A]/20 hover:bg-[#FF007A]/40 text-[#FF007A] text-[11px] font-semibold transition-colors flex-shrink-0"
                            >
                              <UserPlus size={11} />Invita
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              )}
            </div>
          )}

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

          <div className="p-4 border-t border-zinc-800 space-y-3">
            {user ? (
              <>
                <form onSubmit={sendMessage} className="flex gap-2">
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

                {/* ── Bottone co-host (solo spettatori) ─── */}
                {!isArtist && (
                  <div>
                    {isCoHost ? (
                      <button onClick={leaveCoHost}
                        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-[#FF007A]/10 border border-[#FF007A]/40 text-[#FF007A] hover:bg-[#FF007A]/20 transition-colors text-sm font-semibold">
                        <PhoneDisconnect size={16} />Lascia il co-host
                      </button>
                    ) : coHostStatus === 'pending' ? (
                      <div className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-400 text-sm">
                        <div className="w-3 h-3 border border-zinc-400 border-t-transparent rounded-full animate-spin" />
                        Richiesta inviata...
                      </div>
                    ) : (
                      <button onClick={requestCoHost}
                        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-zinc-700 text-zinc-400 hover:border-[#00F0FF] hover:text-[#00F0FF] transition-colors text-sm">
                        <Microphone size={16} />Chiedi di salire in live
                      </button>
                    )}
                  </div>
                )}

                {/* Pannello monete — solo per spettatori */}
                {!isArtist && (
                  <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-zinc-400">Invia monete</span>
                      <span className="text-xs text-yellow-400 font-medium">🪙 {coinBalance ?? '…'}</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => sendCoins(1)} disabled={sendingCoins || coinBalance === 0}
                        className="flex-shrink-0 px-3 py-2 rounded-lg bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed text-black text-xs font-bold transition-colors">
                        🪙 Invia 1
                      </button>
                      <input type="number" min="1" value={coinAmount}
                        onChange={e => { setCoinAmount(e.target.value); setCoinError(''); }}
                        placeholder="Quantità"
                        className="flex-1 min-w-0 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-2 text-white text-xs focus:outline-none focus:border-yellow-500"
                      />
                      <button onClick={() => sendCoins(coinAmount)} disabled={sendingCoins || !coinAmount || coinAmount < 1}
                        className="flex-shrink-0 px-3 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold transition-colors">
                        Invia
                      </button>
                    </div>
                    {coinError && <p className="mt-1.5 text-xs text-red-400">{coinError}</p>}
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

      {showEndLiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-white mb-2">Termina la live</h3>
            <p className="text-sm text-zinc-400 mb-6">
              Vuoi terminare la diretta? Gli spettatori collegati verranno disconnessi.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowEndLiveModal(false)} className="btn-outline flex-1">Continua</button>
              <button onClick={confirmEndLive}
                className="flex-1 py-2 rounded-xl bg-red-500 hover:bg-red-400 text-white font-bold transition-colors">
                Termina
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
