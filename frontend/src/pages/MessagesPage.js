import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import {
  PaperPlaneTilt, ArrowLeft, MagnifyingGlass, Trash
} from '@phosphor-icons/react';

function MessageText({ content }) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = content.split(urlRegex);
  return (
    <p className="text-sm whitespace-pre-wrap break-words">
      {parts.map((part, i) =>
        urlRegex.test(part) ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer"
            className="underline opacity-90 hover:opacity-100 break-all"
            onClick={e => e.stopPropagation()}>
            {part}
          </a>
        ) : part
      )}
    </p>
  );
}

export default function MessagesPage() {
  const { userId } = useParams();
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCounts, setUnreadCounts] = useState({});
  const [deletingConv, setDeletingConv] = useState(false);
  const messagesEndRef = useRef(null);
  const channelRef = useRef(null);

  const loadConversations = useCallback(async () => {
  setLoadError("");
    if (!user?.id) return;
    try {
      setLoadError('');
      // Carica le conversazioni eliminate dall'utente
      const { data: deleted } = await supabase
        .from('deleted_conversations')
        .select('other_user_id')
        .eq('user_id', user.id);
      const deletedIds = new Set((deleted || []).map(d => d.other_user_id));

      const { data, error } = await supabase
        .from('messages')
        .select('sender_id, receiver_id, content, created_at, read')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const convMap = {};
      for (const msg of data || []) {
        const otherId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        // Salta le conversazioni eliminate
        if (deletedIds.has(otherId)) continue;
        if (!convMap[otherId]) {
          convMap[otherId] = { lastMessage: msg.content, lastDate: msg.created_at, unread: 0 };
        }
        if (msg.receiver_id === user.id && !msg.read) {
          convMap[otherId].unread++;
        }
      }

      const otherIds = Object.keys(convMap);
      if (otherIds.length === 0) { setConversations([]); return; }

      const [{ data: artists }, { data: visitors }] = await Promise.all([
        supabase.from('artist_profiles').select('user_id, stage_name, profile_image_url').in('user_id', otherIds),
        supabase.from('visitor_profiles').select('user_id, name, profile_image_url').in('user_id', otherIds)
      ]);

      const profileMap = {};
      for (const a of artists || []) profileMap[a.user_id] = { name: a.stage_name, image: a.profile_image_url };
      for (const v of visitors || []) profileMap[v.user_id] = { name: v.name, image: v.profile_image_url };

      const convList = otherIds.map(id => ({
        userId: id,
        name: profileMap[id]?.name || 'Utente',
        image: profileMap[id]?.image || null,
        lastMessage: convMap[id].lastMessage,
        unread: convMap[id].unread
      }));

      setConversations(convList);
      const counts = {};
      for (const c of convList) counts[c.userId] = c.unread;
      setUnreadCounts(counts);
    } catch (e) {
      console.error(e); setLoadError(e.message || "Errore caricamento messaggi");
      setLoadError('Errore nel caricamento chat');
    }
  }, [user?.id]);

  const loadUserProfile = useCallback(async (uid) => {
    const [{ data: artist }, { data: visitor }] = await Promise.all([
      supabase.from('artist_profiles').select('user_id, stage_name, profile_image_url').eq('user_id', uid).maybeSingle(),
      supabase.from('visitor_profiles').select('user_id, name, profile_image_url').eq('user_id', uid).maybeSingle()
    ]);
    if (artist) return { userId: uid, name: artist.stage_name, image: artist.profile_image_url };
    if (visitor) return { userId: uid, name: visitor.name, image: visitor.profile_image_url };
    return { userId: uid, name: 'Utente', image: null };
  }, []);

  const loadMessages = useCallback(async (otherId) => {
    if (!user?.id || !otherId) return;
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);

      await supabase.from('messages')
        .update({ read: true })
        .eq('sender_id', otherId)
        .eq('receiver_id', user.id)
        .eq('read', false);

      // Segna come lette le notifiche di questa conversazione
      await supabase.from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('type', 'message')
        .eq('link', `/messages/${otherId}`)
        .eq('read', false);

      setUnreadCounts(prev => ({ ...prev, [otherId]: 0 }));
      setConversations(prev =>
        prev.map(c => c.userId === otherId ? { ...c, unread: 0 } : c)
      );
    } catch (e) { console.error(e); setLoadError(e.message || "Errore caricamento messaggi"); }
  }, [user?.id]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadConversations();
      if (userId) {
        const profile = await loadUserProfile(userId);
        setSelectedUser(profile);
        await loadMessages(userId);
      }
      setLoading(false);
    };
    init();
  }, [userId, loadConversations, loadUserProfile, loadMessages]);

  useEffect(() => {
    if (!user?.id || !selectedUser?.userId) return;
    if (channelRef.current) supabase.removeChannel(channelRef.current);

    channelRef.current = supabase
      .channel(`messages_${user.id}_${selectedUser.userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${user.id}`
      }, async (payload) => {
        if (payload.new.sender_id === selectedUser.userId) {
          setMessages(prev => [...prev, payload.new]);
          await supabase.from('messages').update({ read: true }).eq('id', payload.new.id);
        } else {
          setUnreadCounts(prev => ({
            ...prev,
            [payload.new.sender_id]: (prev[payload.new.sender_id] || 0) + 1
          }));
          setConversations(prev =>
            prev.map(c => c.userId === payload.new.sender_id
              ? { ...c, unread: (c.unread || 0) + 1, lastMessage: payload.new.content }
              : c
            )
          );
        }
      })
      .subscribe();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [user?.id, selectedUser?.userId, loadConversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelectConversation = async (conv) => {
    setSelectedUser(conv);
    await loadMessages(conv.userId);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser || sending) return;
    setSending(true);
    const content = newMessage.trim();
    try {
      const { data, error } = await supabase.from('messages').insert({
        sender_id: user.id,
        receiver_id: selectedUser.userId,
        content
      }).select().single();

      if (error) throw error;
      setMessages(prev => [...prev, data]);
      setNewMessage('');

      // Se manda un nuovo msg dopo aver eliminato la conv, rimuovi il flag deleted
      await supabase.from('deleted_conversations')
        .delete()
        .eq('user_id', user.id)
        .eq('other_user_id', selectedUser.userId);

      // Crea notifica per il destinatario (una sola per conversazione — sostituisce la precedente)
      const notifLink = `/messages/${user.id}`;
      await supabase.from('notifications')
        .delete()
        .eq('user_id', selectedUser.userId)
        .eq('type', 'message')
        .eq('link', notifLink)
        .eq('read', false);

      await supabase.from('notifications').insert({
        user_id: selectedUser.userId,
        type: 'message',
        title: `Messaggio da ${user.name}`,
        message: content.slice(0, 80),
        read: false,
        link: notifLink
      });

      loadConversations();
    } catch (e) { console.error(e); setLoadError(e.message || "Errore caricamento messaggi"); }
    finally { setSending(false); }
  };

  const handleDeleteConversation = async () => {
    if (!selectedUser || !window.confirm(`Eliminare la chat con ${selectedUser.name}? Non la vedrai più, ma l'altro utente la conserverà.`)) return;
    setDeletingConv(true);
    try {
      // Inserisce nella tabella deleted_conversations — solo per questo utente
      await supabase.from('deleted_conversations')
        .upsert({ user_id: user.id, other_user_id: selectedUser.userId }, { onConflict: 'user_id,other_user_id' });

      setMessages([]);
      setConversations(prev => prev.filter(c => c.userId !== selectedUser.userId));
      setUnreadCounts(prev => {
        const next = { ...prev };
        delete next[selectedUser.userId];
        return next;
      });
      setSelectedUser(null);
    } catch (e) { console.error(e); setLoadError(e.message || "Errore caricamento messaggi"); }
    finally { setDeletingConv(false); }
  };

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);
  const filtered = conversations.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const Avatar = ({ name, image, size = 'md' }) => {
    const s = size === 'lg' ? 'w-12 h-12 text-lg' : 'w-10 h-10 text-sm';
    return image ? (
      <img src={image} alt={name} className={`${s} rounded-full object-cover flex-shrink-0`} />
    ) : (
      <div className={`${s} rounded-full bg-[#FF007A]/20 text-[#FF007A] flex items-center justify-center font-bold flex-shrink-0`}>
        {name?.charAt(0)?.toUpperCase()}
      </div>
    );
  };

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
      <Navbar unreadCount={totalUnread} />

      <main className="flex pt-16 overflow-hidden" style={{ height: 'calc(100vh - 64px)' }}>
        <div className="w-full max-w-7xl mx-auto flex h-full">

          {/* Lista conversazioni */}
          <div className={`w-full md:w-80 lg:w-96 border-r border-zinc-800 flex flex-col ${selectedUser ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-4 border-b border-zinc-800">
              <h1 className="text-xl font-bold font-['Unbounded'] mb-4">
                Messaggi {totalUnread > 0 && (
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-[#FF007A] text-white text-xs">{totalUnread}</span>
                )}
              </h1>
              <div className="relative">
                <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input type="text" value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="input-dark w-full pl-10 py-2 text-sm"
                  placeholder="Cerca conversazioni..." />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loadError ? (
                <div className="p-8 text-center text-zinc-500">
                  <p>{loadError}</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-zinc-500">
                  <p>Nessuna conversazione</p>
                  <Link to="/discover" className="text-[#FF007A] text-sm mt-2 inline-block">
                    Trova artisti da contattare
                  </Link>
                </div>
              ) : (
                filtered.map(conv => (
                  <button key={conv.userId} onClick={() => handleSelectConversation(conv)}
                    className={`w-full p-4 flex items-center gap-3 hover:bg-zinc-900 transition-colors border-b border-zinc-800/50 ${selectedUser?.userId === conv.userId ? 'bg-zinc-900' : ''}`}>
                    <Avatar name={conv.name} image={conv.image} size="lg" />
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium truncate">{conv.name}</p>
                        {conv.unread > 0 && (
                          <span className="w-5 h-5 rounded-full bg-[#FF007A] text-xs flex items-center justify-center text-white flex-shrink-0">{conv.unread}</span>
                        )}
                      </div>
                      <p className="text-sm text-zinc-400 truncate">{conv.lastMessage}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Area chat */}
          <div className={`flex-1 flex flex-col ${selectedUser ? 'flex' : 'hidden md:flex'}`}>
            {selectedUser ? (
              <>
                <div className="p-4 border-b border-zinc-800 flex items-center gap-3">
                  <button onClick={() => setSelectedUser(null)} className="md:hidden p-2 hover:bg-zinc-800 rounded-lg">
                    <ArrowLeft size={20} />
                  </button>
                  <Avatar name={selectedUser.name} image={selectedUser.image} />
                  <div className="flex-1">
                    <p className="font-medium">{selectedUser.name}</p>
                  </div>
                  <button onClick={handleDeleteConversation} disabled={deletingConv}
                    title="Elimina chat"
                    className="p-2 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                    {deletingConv
                      ? <div className="w-4 h-4 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" />
                      : <Trash size={18} />
                    }
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.length === 0 ? (
                    <div className="text-center text-zinc-500 py-12">
                      <p>Inizia la conversazione!</p>
                    </div>
                  ) : (
                    messages.map(msg => {
                      const isOwn = msg.sender_id === user?.id;
                      return (
                        <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${isOwn ? 'bg-[#FF007A] text-white rounded-br-md' : 'bg-zinc-800 text-white rounded-bl-md'}`}>
                            <MessageText content={msg.content} />
                            <p className="text-xs opacity-60 mt-1">
                              {new Date(msg.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSend} className="p-4 border-t border-zinc-800">
                  <div className="flex gap-3">
                    <input type="text" value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); } }}
                      className="input-dark flex-1"
                      placeholder="Scrivi un messaggio..." />
                    <button type="submit" disabled={!newMessage.trim() || sending} className="btn-primary px-4">
                      {sending
                        ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        : <PaperPlaneTilt size={20} weight="fill" />
                      }
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-zinc-500">
                <div className="text-center">
                  <PaperPlaneTilt size={48} className="mx-auto mb-4 opacity-50" />
                  <p>Seleziona una conversazione per iniziare</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
