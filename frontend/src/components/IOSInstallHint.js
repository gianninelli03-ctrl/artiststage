import { useState, useEffect } from 'react';

// The exact Safari share icon (box + arrow up)
function SafariShare() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="#FF007A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="8 6 12 2 16 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
      <path d="M4 13v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
    </svg>
  );
}

export default function IOSInstallHint() {
  const [visible, setVisible] = useState(false);
  const [hiding, setHiding] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    const isIPhone = /iphone/i.test(ua);
    const isSafari = /safari/i.test(ua) && !/chrome|crios|fxios|opios|gsa/i.test(ua);
    const isStandalone = window.navigator.standalone === true;

    if (!isIPhone || !isSafari || isStandalone) return;
    // sessionStorage: riappare ad ogni sessione, non persiste per sempre
    if (sessionStorage.getItem('ios-hint-dismissed')) return;

    const t = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(t);
  }, []);

  const dismiss = () => {
    setHiding(true);
    setTimeout(() => {
      setVisible(false);
      sessionStorage.setItem('ios-hint-dismissed', '1');
    }, 350);
  };

  if (!visible) return null;

  return (
    <>
      <style>{`
        @keyframes ios-in {
          from { opacity: 0; transform: translateX(-50%) translateY(16px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes ios-out {
          from { opacity: 1; transform: translateX(-50%) translateY(0); }
          to   { opacity: 0; transform: translateX(-50%) translateY(16px); }
        }
        @keyframes arr-bounce {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(8px); }
        }
        .ios-hint {
          position: fixed;
          /* sits just above Safari's bottom toolbar */
          bottom: calc(80px + env(safe-area-inset-bottom, 0px));
          left: 50%;
          transform: translateX(-50%);
          z-index: 9999;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          animation: ios-in 0.4s cubic-bezier(0.34,1.4,0.64,1) both;
          -webkit-tap-highlight-color: transparent;
          cursor: pointer;
        }
        .ios-hint.hiding {
          animation: ios-out 0.35s ease forwards;
        }
        .ios-hint-card {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(20, 20, 22, 0.94);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255,255,255,0.13);
          border-radius: 22px;
          padding: 10px 16px 10px 10px;
          box-shadow:
            0 8px 32px rgba(0,0,0,0.55),
            0 0 0 1px rgba(255,0,122,0.15);
          white-space: nowrap;
        }
        .ios-hint-appicon {
          width: 36px;
          height: 36px;
          border-radius: 9px;
          flex-shrink: 0;
        }
        .ios-hint-label {
          font-size: 14px;
          font-weight: 700;
          color: #fff;
          letter-spacing: -0.2px;
          margin-right: 4px;
        }
        .ios-hint-arrow {
          animation: arr-bounce 0.9s ease-in-out infinite;
        }
      `}</style>

      <div className={`ios-hint${hiding ? ' hiding' : ''}`} onClick={dismiss}>
        {/* Card: app icon + label + Safari share icon */}
        <div className="ios-hint-card">
          <img src="/icon-192.png" alt="" className="ios-hint-appicon" />
          <span className="ios-hint-label">Installa ArtistStage</span>
          <SafariShare />
        </div>

        {/* Arrow bouncing down toward Safari's share button */}
        <div className="ios-hint-arrow">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 3v14M5 11l7 8 7-8"
              stroke="#FF007A" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </>
  );
}
