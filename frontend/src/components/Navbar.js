import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import { Rows } from '@phosphor-icons/react';
import {
  MicrophoneStage,
  MagnifyingGlass,
  ChatCircleDots,
  Broadcast,
  User,
  SignOut,
  List,
  X,
  House,
  Buildings,
  Bell
} from '@phosphor-icons/react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);

  // ── Messaggi non letti ────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;

    const loadUnread = async () => {
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('read', false);
      setUnreadCount(count || 0);
    };

    loadUnread();

    const channel = supabase
      .channel(`navbar_unread_${user.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'messages',
        filter: `receiver_id=eq.${user.id}`
      }, () => loadUnread())
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user?.id]);

  // ── Notifiche (live etc.) ─────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;

    const loadNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('read', false)
        .order('created_at', { ascending: false })
        .limit(10);
      setNotifications(data || []);
    };

    loadNotifications();

    const channel = supabase
      .channel(`navbar_notifs_${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, () => loadNotifications())
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user?.id]);

  // Chiudi notifiche cliccando fuori
  useEffect(() => {
    const handleClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const markOneRead = async (notifId) => {
    await supabase.from('notifications').update({ read: true }).eq('id', notifId);
    setNotifications(prev => prev.filter(n => n.id !== notifId));
  };

  const markAllRead = async () => {
    if (!notifications.length) return;
    await supabase.from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);
    setNotifications([]);
  };

  const handleNotifClick = async (notif) => {
    await markOneRead(notif.id);
    setNotifOpen(false);
    if (['booking', 'calendar', 'booking_request'].includes(notif.type)) {
      navigate('/dashboard#calendar');
    } else if (notif.link) {
      navigate(notif.link);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  const navLinks = [
    { path: '/discover', label: 'Artists', icon: MagnifyingGlass },
    { path: '/stage', label: 'Stage', icon: Buildings },
    { path: '/live', label: 'Live', icon: Broadcast },
    { path: '/feed', label: 'Feed', icon: Rows },
  ];

  const authNavLinks = [
    { path: '/messages', label: 'Messaggi', icon: ChatCircleDots },
    { path: '/dashboard', label: 'Dashboard', icon: House },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 text-white font-bold text-xl">
            <MicrophoneStage size={32} weight="duotone" className="text-[#FF007A]" />
            <span className="font-['Unbounded'] hidden sm:block">ArtistStage</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ path, label, icon: Icon }) => (
              <Link key={path} to={path}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                  isActive(path) ? 'bg-[#FF007A]/20 text-[#FF007A]' : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}>
                <Icon size={20} weight={isActive(path) ? 'fill' : 'regular'} />
                <span className="text-sm font-medium">{label}</span>
              </Link>
            ))}

            {user && authNavLinks.map(({ path, label, icon: Icon }) => (
              <Link key={path} to={path}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                  isActive(path) ? 'bg-[#FF007A]/20 text-[#FF007A]' : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}>
                <div className="relative">
                  <Icon size={20} weight={isActive(path) ? 'fill' : 'regular'} />
                  {path === '/messages' && unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#FF007A] text-white text-[10px] flex items-center justify-center font-bold">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </div>
                <span className="text-sm font-medium">{label}</span>
              </Link>
            ))}
          </div>

          {/* Auth Section */}
          <div className="flex items-center gap-2">
            {user && (
              /* ── Campanellino notifiche ── */
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => setNotifOpen(prev => !prev)}
                  className="relative p-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">
                  <Bell size={20} weight={notifications.length > 0 ? 'fill' : 'regular'} />
                  {notifications.length > 0 && (
                    <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold animate-pulse">
                      {notifications.length > 9 ? '9+' : notifications.length}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 top-12 w-80 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-50">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
                      <h3 className="font-bold text-white text-sm">Notifiche</h3>
                      {notifications.length > 0 && (
                        <button onClick={markAllRead} className="text-xs text-zinc-400 hover:text-white">
                          Segna tutte come lette
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-8 text-center text-zinc-500 text-sm">
                          Nessuna notifica
                        </div>
                      ) : (
                        notifications.map(notif => (
                          <div key={notif.id}
                            className="flex items-start gap-3 px-4 py-3 hover:bg-zinc-800 transition-colors border-b border-zinc-800/50 last:border-0 group">
                            {/* Area cliccabile per navigare */}
                            <button onClick={() => handleNotifClick(notif)}
                              className="flex items-start gap-3 flex-1 min-w-0 text-left">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                notif.type === 'live' ? 'bg-red-500/20' : 'bg-[#FF007A]/20'
                              }`}>
                                {notif.type === 'live'
                                  ? <Broadcast size={16} className="text-red-400" />
                                  : <Bell size={16} className="text-[#FF007A]" />
                                }
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{notif.title}</p>
                                {notif.message && <p className="text-xs text-zinc-400 mt-0.5 truncate">{notif.message}</p>}
                                <p className="text-xs text-zinc-600 mt-1">
                                  {new Date(notif.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                              {notif.type === 'live' && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-red-500 text-white font-bold flex-shrink-0">LIVE</span>
                              )}
                            </button>
                            {/* Bottone "×" per segnare come letta senza navigare */}
                            <button
                              onClick={() => markOneRead(notif.id)}
                              className="flex-shrink-0 p-1 rounded text-zinc-600 hover:text-white hover:bg-zinc-700 transition-colors opacity-0 group-hover:opacity-100"
                              title="Segna come letta"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 focus:outline-none">
                    <Avatar className="h-9 w-9 border-2 border-[#FF007A]/50">
                      <AvatarImage src={user.profile_image} />
                      <AvatarFallback className="bg-[#FF007A]/20 text-[#FF007A]">
                        {user.name?.charAt(0)?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-zinc-900 border-zinc-800">
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium text-white">{user.name}</p>
                    <p className="text-xs text-zinc-400">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator className="bg-zinc-800" />
                  <DropdownMenuItem onClick={() => navigate('/dashboard')} className="cursor-pointer hover:bg-zinc-800">
                    <User className="mr-2 h-4 w-4" />Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/messages')} className="cursor-pointer hover:bg-zinc-800">
                    <div className="flex items-center w-full">
                      <ChatCircleDots className="mr-2 h-4 w-4" />
                      Messaggi
                      {unreadCount > 0 && (
                        <span className="ml-auto px-1.5 py-0.5 rounded-full bg-[#FF007A] text-white text-xs">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/pricing')} className="cursor-pointer hover:bg-zinc-800">
  Piano & Pricing
</DropdownMenuItem>
<DropdownMenuItem onClick={() => navigate('/coins')} className="cursor-pointer hover:bg-zinc-800">
  🪙 Shop Monete
</DropdownMenuItem>
<DropdownMenuItem onClick={() => navigate('/cashout')} className="cursor-pointer hover:bg-zinc-800">
  💸 Cashout
</DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-zinc-800" />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer hover:bg-zinc-800 text-red-400">
                    <SignOut className="mr-2 h-4 w-4" />Esci
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="hidden sm:flex items-center gap-3">
                <Link to="/login" className="btn-outline text-sm">Accedi</Link>
                <Link to="/register" className="btn-primary text-sm">Registrati</Link>
              </div>
            )}

            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-zinc-400 hover:text-white">
              {mobileMenuOpen ? <X size={24} /> : <List size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-zinc-800">
            <div className="flex flex-col gap-2">
              {navLinks.map(({ path, label, icon: Icon }) => (
                <Link key={path} to={path} onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isActive(path) ? 'bg-[#FF007A]/20 text-[#FF007A]' : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}>
                  <Icon size={20} /><span>{label}</span>
                </Link>
              ))}

              {user && authNavLinks.map(({ path, label, icon: Icon }) => (
                <Link key={path} to={path} onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isActive(path) ? 'bg-[#FF007A]/20 text-[#FF007A]' : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}>
                  <div className="relative">
                    <Icon size={20} />
                    {path === '/messages' && unreadCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#FF007A] text-white text-[10px] flex items-center justify-center font-bold">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </div>
                  <span>{label}</span>
                </Link>
              ))}

              {!user && (
                <div className="flex flex-col gap-2 pt-4 border-t border-zinc-800 mt-2">
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="btn-outline text-center">Accedi</Link>
                  <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="btn-primary text-center">Registrati</Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}