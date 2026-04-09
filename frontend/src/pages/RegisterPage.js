import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import { MicrophoneStage, GoogleLogo, Envelope, Lock, User, Eye, EyeSlash } from '@phosphor-icons/react';
import { toast } from 'sonner';

function formatApiErrorDetail(detail) {
  if (detail == null) return "Si è verificato un errore. Riprova.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).filter(Boolean).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState('visitor');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (password.length < 6) {
      setError('La password deve contenere almeno 6 caratteri');
      return;
    }
    
    setLoading(true);
    
    try {
      await register(email, password, name, userType);
      toast.success('Registrazione completata!');

      // Welcome email (fire & forget)
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session) {
        supabase.functions.invoke('send-email', {
          body: { type: 'welcome', payload: { email, name } },
          headers: { Authorization: `Bearer ${sessionData.session.access_token}` }
        }).catch(() => {});
      }

      navigate('/dashboard');
    } catch (err) {
      const errorMessage = formatApiErrorDetail(err.response?.data?.detail) || err.message;
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    loginWithGoogle(userType);
  };

  return (
    <div className="min-h-screen bg-[#09090B] flex">
      {/* Left Panel - Image */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(https://images.unsplash.com/photo-1638317875669-719f70b4c27c?crop=entropy&cs=srgb&fm=jpg&w=1200)`
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-l from-[#09090B] via-[#09090B]/50 to-transparent" />
        <div className="absolute inset-0 bg-[#00F0FF]/10" />
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 mb-12">
            <MicrophoneStage size={40} weight="duotone" className="text-[#FF007A]" />
            <span className="font-['Unbounded'] font-bold text-2xl text-white">ArtistStage</span>
          </Link>

          <h1 className="text-3xl font-bold mb-2 font-['Unbounded']">Crea un account</h1>
          <p className="text-zinc-400 mb-8">Inizia il tuo percorso artistico oggi</p>

          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Nome completo</label>
              <div className="relative">
                <User size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-dark w-full pl-12"
                  placeholder="Mario Rossi"
                  required
                  data-testid="register-name"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Email</label>
              <div className="relative">
                <Envelope size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-dark w-full pl-12"
                  placeholder="nome@email.com"
                  required
                  data-testid="register-email"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Password</label>
              <div className="relative">
                <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-dark w-full pl-12 pr-12"
                  placeholder="••••••••"
                  required
                  minLength={6}
                  data-testid="register-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                >
                  {showPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-3">Tipo di account</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setUserType('visitor')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    userType === 'visitor'
                      ? 'border-[#FF007A] bg-[#FF007A]/10'
                      : 'border-zinc-800 hover:border-zinc-700'
                  }`}
                  data-testid="register-type-visitor"
                >
                  <p className="font-medium text-white">Visitatore</p>
                  <p className="text-xs text-zinc-400 mt-1">Cerco artisti</p>
                </button>
                <button
                  type="button"
                  onClick={() => setUserType('artist')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    userType === 'artist'
                      ? 'border-[#FF007A] bg-[#FF007A]/10'
                      : 'border-zinc-800 hover:border-zinc-700'
                  }`}
                  data-testid="register-type-artist"
                >
                  <p className="font-medium text-white">Artista</p>
                  <p className="text-xs text-zinc-400 mt-1">Voglio esibirmi</p>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
              data-testid="register-submit"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Registrati'
              )}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-800" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-[#09090B] text-zinc-500">oppure continua con</span>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            className="btn-outline w-full flex items-center justify-center gap-3"
            data-testid="google-register"
          >
            <GoogleLogo size={20} weight="bold" />
            Google
          </button>

          <p className="mt-8 text-center text-zinc-400">
            Hai già un account?{' '}
            <Link to="/login" className="text-[#FF007A] hover:text-[#E6006E] font-medium">
              Accedi
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
