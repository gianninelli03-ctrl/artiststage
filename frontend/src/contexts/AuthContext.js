import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // onAuthStateChange in supabase-js v2 spara immediatamente INITIAL_SESSION
    // con la sessione letta da localStorage — non serve getSession() separato.
    // Gestiamo ogni evento esplicitamente per evitare logout involontari.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        setUser(session?.user ?? null);
        setLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setLoading(false);
      }
      // PASSWORD_RECOVERY e altri eventi: non toccare lo stato
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    return data.user;
  };

  const register = async (email, password, name, userType = 'visitor') => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, user_type: userType }
      }
    });
    if (error) throw new Error(error.message);

    if (data.user) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        name,
        user_type: userType
      });
    }

    return data.user;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const loginWithGoogle = async (userType = 'visitor') => {
    // Salva userType prima del redirect per usarlo nella callback (nuovo utente)
    localStorage.setItem('google_oauth_user_type', userType);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      }
    });
    if (error) throw new Error(error.message);
    // Il browser viene reindirizzato a Google — nessun valore di ritorno
  };

  const handleGoogleCallback = async () => {
    // Supabase JS v2 legge automaticamente access_token dall'hash URL
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw new Error(error.message);
    if (!session) throw new Error('Sessione non trovata dopo il login con Google');

    const oauthUser = session.user;

    // Crea profilo solo se è un nuovo utente (primo accesso con Google)
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', oauthUser.id)
      .maybeSingle();

    if (!existing) {
      const userType = localStorage.getItem('google_oauth_user_type') || 'visitor';
      const name =
        oauthUser.user_metadata?.full_name ||
        oauthUser.user_metadata?.name ||
        oauthUser.email;
      await supabase.from('profiles').insert({
        id: oauthUser.id,
        name,
        user_type: userType,
      });
      localStorage.removeItem('google_oauth_user_type');
    }

    return oauthUser;
  };

  const [onlineUserIds, setOnlineUserIds] = useState(new Set());
  const presenceChannelRef = useRef(null);

  useEffect(() => {
    if (presenceChannelRef.current) {
      supabase.removeChannel(presenceChannelRef.current);
    }

    const channel = supabase.channel('app-presence');
    presenceChannelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const ids = new Set();
        Object.values(state).forEach(presences => {
          presences.forEach(p => ids.add(p.user_id));
        });
        setOnlineUserIds(ids);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && user?.id) {
          await channel.track({ user_id: user.id });
        }
      });

    return () => {
      supabase.removeChannel(channel);
      presenceChannelRef.current = null;
    };
  }, [user?.id]);

  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    if (!user) { setUserProfile(null); return; }

    const loadProfile = async () => {
      const { data: profile } = await supabase
        .from('profiles').select('*').eq('id', user.id).single();

      if (!profile) { setUserProfile(null); return; }

      // Carica foto profilo da artist_profiles o visitor_profiles
      let profileImage = null;
      if (profile.user_type === 'artist') {
        const { data: ap } = await supabase
          .from('artist_profiles')
          .select('profile_image_url')
          .eq('user_id', user.id)
          .maybeSingle();
        profileImage = ap?.profile_image_url || null;
      } else {
        const { data: vp } = await supabase
          .from('visitor_profiles')
          .select('profile_image_url')
          .eq('user_id', user.id)
          .maybeSingle();
        profileImage = vp?.profile_image_url || null;
      }

      setUserProfile({ ...profile, profile_image_url: profileImage });
    };

    loadProfile();
  }, [user?.id]);

  const normalizedUser = user ? {
    ...user,
    id: user.id,
    name: userProfile?.name || user.user_metadata?.name || user.email,
    email: user.email,
    user_type: userProfile?.user_type || user.user_metadata?.user_type || 'visitor',
    profile_image: userProfile?.profile_image_url || null
  } : null;

  const value = {
    user: normalizedUser,
    loading,
    login,
    register,
    logout,
    loginWithGoogle,
    handleGoogleCallback,
    setUser,
    onlineUserIds
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}