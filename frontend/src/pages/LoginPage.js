import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { MicrophoneStage, Envelope, Lock, Eye, EyeSlash } from '@phosphor-icons/react';
import { toast } from 'sonner';

function formatApiErrorDetail(detail) {
  if (detail == null) return "Email o password non validi.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
      .filter(Boolean)
      .join(" ");
  }
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Inserisci email e password.');
      return;
    }

    setLoading(true);

    try {
      await login(email.trim(), password);
      toast.success('Accesso effettuato con successo!');
      navigate('/dashboard');
    } catch (err) {
      const errorMessage =
        formatApiErrorDetail(err?.response?.data?.detail) ||
        err?.message ||
        'Errore durante l’accesso.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090B] flex">
      {/* Left Panel - Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 mb-12">
            <MicrophoneStage size={40} weight="duotone" className="text-[#FF007A]" />
            <span className="font-['Unbounded'] font-bold text-2xl text-white">ArtistStage</span>
          </Link>

          <h1 className="text-3xl font-bold mb-2 font-['Unbounded'] text-white">Bentornato</h1>
          <p className="text-zinc-400 mb-8">Accedi al tuo account per continuare</p>

          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
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
                  autoComplete="email"
                  data-testid="login-email"
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
                  autoComplete="current-password"
                  data-testid="login-password"
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

            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-sm text-zinc-400 hover:text-[#FF007A] transition-colors">
                Password dimenticata?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
              data-testid="login-submit"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Accedi'
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-zinc-400">
            Non hai un account?{' '}
            <Link to="/register" className="text-[#FF007A] hover:text-[#E6006E] font-medium">
              Registrati
            </Link>
          </p>
        </div>
      </div>

      {/* Right Panel - Image */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(https://images.unsplash.com/photo-1583244532610-2a234e7c3eca?crop=entropy&cs=srgb&fm=jpg&w=1200)`
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#09090B] via-[#09090B]/50 to-transparent" />
        <div className="absolute inset-0 bg-[#FF007A]/10" />
      </div>
    </div>
  );
}