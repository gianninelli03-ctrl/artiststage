import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MicrophoneStage, Envelope } from '@phosphor-icons/react';
import { supabase } from '../supabaseClient';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (err) {
      toast.error(err.message || 'Errore nell\'invio dell\'email');
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

          {sent ? (
            <div>
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-6">
                <Envelope size={32} className="text-green-400" />
              </div>
              <h1 className="text-3xl font-bold mb-2 font-['Unbounded'] text-white">Email inviata</h1>
              <p className="text-zinc-400 mb-8">
                Controlla la casella di posta di <span className="text-white">{email}</span>.
                Troverai un link per reimpostare la password.
              </p>
              <p className="text-zinc-500 text-sm mb-8">
                Non hai ricevuto nulla? Controlla la cartella spam o{' '}
                <button
                  onClick={() => setSent(false)}
                  className="text-[#FF007A] hover:underline"
                >
                  riprova con un'altra email
                </button>.
              </p>
              <Link to="/login" className="btn-outline w-full flex items-center justify-center">
                Torna al login
              </Link>
            </div>
          ) : (
            <div>
              <h1 className="text-3xl font-bold mb-2 font-['Unbounded'] text-white">Password dimenticata?</h1>
              <p className="text-zinc-400 mb-8">
                Inserisci la tua email e ti mandiamo un link per reimpostare la password.
              </p>

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
                      autoFocus
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Invia link di reset'
                  )}
                </button>
              </form>

              <p className="mt-8 text-center text-zinc-400">
                Ricordi la password?{' '}
                <Link to="/login" className="text-[#FF007A] hover:text-[#E6006E] font-medium">
                  Accedi
                </Link>
              </p>
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
