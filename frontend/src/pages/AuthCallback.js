import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { MicrophoneStage } from '@phosphor-icons/react';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { handleGoogleCallback } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevent double processing in StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processCallback = async () => {
      try {
        await handleGoogleCallback();
        // Rimuove i token dall'URL e naviga alla dashboard
        window.history.replaceState(null, '', window.location.pathname);
        navigate('/dashboard', { replace: true });
      } catch (error) {
        console.error('Auth callback error:', error);
        navigate('/login');
      }
    };

    processCallback();
  }, [handleGoogleCallback, navigate]);

  return (
    <div className="min-h-screen bg-[#09090B] flex items-center justify-center">
      <div className="text-center">
        <MicrophoneStage size={64} weight="duotone" className="text-[#FF007A] mx-auto mb-6 animate-pulse" />
        <p className="text-zinc-400">Autenticazione in corso...</p>
      </div>
    </div>
  );
}
