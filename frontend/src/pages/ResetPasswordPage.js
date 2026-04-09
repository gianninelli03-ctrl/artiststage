import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MicrophoneStage, Lock, Eye, EyeSlash } from '@phosphor-icons/react';
import { supabase } from '../supabaseClient';
import { toast } from 'sonner';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Supabase processa automaticamente il token nel hash e imposta la sessione.
    // Ascoltiamo l'evento PASSWORD_RECOVERY per sapere quando siamo pronti.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
        // Puliamo l'hash dall'URL per non esporre il token
        window.history.replaceState(null, '', window.location.pathname);
      }
    });

    // Fallback: se il token è già stato processato (pagina ricaricata),
    // verifica se c'è una sessione attiva con tipo recovery
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('La password deve essere di almeno 6 caratteri');
      return;
    }
    if (password !== confirm) {
      setError('Le password non coincidono');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success('Password aggiornata con successo!');
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err.message || 'Errore nell\'aggiornamento della password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090B] flex">
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center gap-2 mb-12">
            <MicrophoneStage size={40} weight="duotone" className="text-[#FF007A]" />
            <span className="font-['Unbounded'] font-bold text-2xl text-white">ArtistStage</span>
          </Link>

          {!ready ? (
            <div>
              <h1 className="text-3xl font-bold mb-2 font-['Unbounded'] text-white">Verifica in corso…</h1>
              <p className="text-zinc-400 mb-8">
                Stiamo verificando il link di reset. Se questa pagina non si aggiorna,{' '}
                <Link to="/forgot-password" className="text-[#FF007A] hover:underline">
                  richiedi un nuovo link
                </Link>.
              </p>
              <div className="flex justify-center">
                <div className="w-8 h-8 border-2 border-[#FF007A] border-t-transparent rounded-full animate-spin" />
              </div>
            </div>
          ) : (
            <div>
              <h1 className="text-3xl font-bold mb-2 font-['Unbounded'] text-white">Nuova password</h1>
              <p className="text-zinc-400 mb-8">Scegli una nuova password per il tuo account.</p>

              {error && (
                <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Nuova password</label>
                  <div className="relative">
                    <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input-dark w-full pl-12 pr-12"
                      placeholder="Minimo 6 caratteri"
                      required
                      autoFocus
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
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Conferma password</label>
                  <div className="relative">
                    <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      className="input-dark w-full pl-12"
                      placeholder="Ripeti la password"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !password || !confirm}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Aggiorna password'
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Right panel */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(https://images.unsplash.com/photo-1583244532610-2a234e7c3eca?crop=entropy&cs=srgb&fm=jpg&w=1200)` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#09090B] via-[#09090B]/50 to-transparent" />
        <div className="absolute inset-0 bg-[#FF007A]/10" />
      </div>
    </div>
  );
}
