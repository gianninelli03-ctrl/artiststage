import { useState, useEffect } from 'react';

export default function IOSInstallHint() {
  const [visible, setVisible] = useState(false);
  const [hiding, setHiding] = useState(false);

  useEffect(() => {
    // Only on iPhone Safari (not iPad, not Chrome/Firefox on iOS)
    const ua = navigator.userAgent;
    const isIPhone = /iphone/i.test(ua);
    const isSafari = /safari/i.test(ua) && !/chrome|crios|fxios|opios|gsa/i.test(ua);
    const isStandalone = window.navigator.standalone === true;

    if (!isIPhone || !isSafari || isStandalone) return;
    if (localStorage.getItem('ios-hint-dismissed')) return;

    const t = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(t);
  }, []);

  const dismiss = () => {
    setHiding(true);
    setTimeout(() => {
      setVisible(false);
      localStorage.setItem('ios-hint-dismissed', '1');
    }, 300);
  };

  if (!visible) return null;

  return (
    <>
      <style>{`
        @keyframes ios-slide-up {
          from { transform: translateY(20px); opacity: 0; }
          to   { transform: translateY(0);   opacity: 1; }
        }
        @keyframes ios-slide-down {
          from { transform: translateY(0);   opacity: 1; }
          to   { transform: translateY(20px); opacity: 0; }
        }
        @keyframes arrow-bounce {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(7px); }
        }
        .ios-hint {
          position: fixed;
          bottom: calc(76px + env(safe-area-inset-bottom));
          left: 50%;
          transform: translateX(-50%);
          z-index: 9999;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          animation: ios-slide-up 0.35s cubic-bezier(0.34,1.4,0.64,1) both;
          pointer-events: auto;
          cursor: pointer;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
        }
        .ios-hint.hiding {
          animation: ios-slide-down 0.3s ease forwards;
        }
        .ios-hint-card {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(18, 18, 20, 0.92);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 20px;
          padding: 11px 18px 11px 12px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 0 0.5px rgba(255,0,122,0.2);
          white-space: nowrap;
        }
        .ios-hint-icon {
          width: 34px;
          height: 34px;
          border-radius: 8px;
          flex-shrink: 0;
        }
        .ios-hint-label {
          font-size: 14px;
          font-weight: 700;
          color: #fff;
          letter-spacing: -0.2px;
        }
        .ios-hint-arrow {
          animation: arrow-bounce 1s ease-in-out infinite;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      `}</style>

      <div className={`ios-hint${hiding ? ' hiding' : ''}`} onClick={dismiss}>
        <div className="ios-hint-card">
          <img src="/icon-192.png" alt="" className="ios-hint-icon" />
          <span className="ios-hint-label">Installa ArtistStage</span>
        </div>

        {/* Arrow pointing down toward Safari's share button */}
        <div className="ios-hint-arrow">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 4v13M6 12l6 7 6-7"
              stroke="#FF007A"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </>
  );
}
