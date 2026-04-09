import { useState, useEffect } from 'react';

// Safari share icon (↑ box)
function ShareIcon() {
  return (
    <svg
      width="17" height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#FF007A"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'inline-block', verticalAlign: 'middle', margin: '0 3px -2px' }}
    >
      <polyline points="8 6 12 2 16 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
      <path d="M4 12v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8" />
    </svg>
  );
}

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showAndroid, setShowAndroid] = useState(false);
  const [showIOS, setShowIOS] = useState(false);

  useEffect(() => {
    // Already installed as PWA → do nothing
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    if (isStandalone) return;

    // Already dismissed → do nothing
    if (localStorage.getItem('pwa-dismissed')) return;

    const ua = navigator.userAgent;
    const isIOS = /iphone|ipad|ipod/i.test(ua);
    const isSafari = /safari/i.test(ua) && !/chrome|crios|fxios|opios/i.test(ua);

    if (isIOS && isSafari) {
      const t = setTimeout(() => setShowIOS(true), 2500);
      return () => clearTimeout(t);
    }

    // Android / Chrome / Edge / desktop:
    // Check if the event was already captured before React mounted
    if (window.__pwaPrompt) {
      setDeferredPrompt(window.__pwaPrompt);
      const t = setTimeout(() => setShowAndroid(true), 2500);
      return () => clearTimeout(t);
    }

    // Otherwise listen for it normally
    const handler = (e) => {
      e.preventDefault();
      window.__pwaPrompt = e;
      setDeferredPrompt(e);
      setTimeout(() => setShowAndroid(true), 2500);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const dismiss = () => {
    setShowAndroid(false);
    setShowIOS(false);
    localStorage.setItem('pwa-dismissed', '1');
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') localStorage.setItem('pwa-dismissed', '1');
    setDeferredPrompt(null);
    setShowAndroid(false);
  };

  if (!showAndroid && !showIOS) return null;

  return (
    <>
      <style>{`
        @keyframes pwa-slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);   opacity: 1; }
        }
        .pwa-banner {
          position: fixed;
          bottom: 0; left: 0; right: 0;
          z-index: 9999;
          background: #18181B;
          border-top: 1px solid #27272A;
          padding: 14px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          animation: pwa-slide-up 0.35s cubic-bezier(0.34,1.56,0.64,1) both;
          box-shadow: 0 -8px 32px rgba(0,0,0,0.5);
        }
        .pwa-icon {
          width: 44px; height: 44px;
          border-radius: 10px;
          flex-shrink: 0;
          background: #09090B;
          border: 1px solid #27272A;
        }
        .pwa-text { flex: 1; min-width: 0; }
        .pwa-title {
          font-weight: 700; color: #fff; font-size: 14px;
          margin: 0 0 2px; line-height: 1.2;
        }
        .pwa-sub {
          color: #71717A; font-size: 12px; margin: 0;
        }
        .pwa-install-btn {
          background: #FF007A; color: #fff;
          border: none; border-radius: 8px;
          padding: 9px 18px; font-weight: 700;
          font-size: 13px; cursor: pointer;
          white-space: nowrap; flex-shrink: 0;
          transition: background 0.15s;
        }
        .pwa-install-btn:hover { background: #e6006e; }
        .pwa-close {
          background: none; border: none;
          color: #52525B; cursor: pointer;
          padding: 6px; font-size: 18px;
          line-height: 1; flex-shrink: 0;
          border-radius: 6px;
          transition: color 0.15s;
        }
        .pwa-close:hover { color: #a1a1aa; }
        /* iOS banner — more minimal */
        .pwa-ios-sub {
          color: #a1a1aa; font-size: 13px; margin: 0;
          line-height: 1.4;
        }
      `}</style>

      {showAndroid && (
        <div className="pwa-banner">
          <img src="/icon-192.svg" alt="ArtistStage" className="pwa-icon" />
          <div className="pwa-text">
            <p className="pwa-title">ArtistStage</p>
            <p className="pwa-sub">Installa l'app sul tuo dispositivo</p>
          </div>
          <button className="pwa-close" onClick={dismiss} aria-label="Chiudi">✕</button>
          <button className="pwa-install-btn" onClick={handleInstall}>Installa</button>
        </div>
      )}

      {showIOS && (
        <div className="pwa-banner" onClick={dismiss} style={{ cursor: 'pointer' }}>
          <img src="/icon-192.svg" alt="ArtistStage" className="pwa-icon" />
          <div className="pwa-text">
            <p className="pwa-ios-sub">
              Tocca <ShareIcon /> poi <strong style={{ color: '#fff' }}>Aggiungi alla home</strong>
            </p>
          </div>
        </div>
      )}
    </>
  );
}
