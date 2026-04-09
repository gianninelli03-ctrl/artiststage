import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { toast } from 'sonner';

export default function PricingPage() {
  const [billing, setBilling] = useState('monthly');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('canceled') === 'true') {
      toast.error('Pagamento annullato');
      const backTo = sessionStorage.getItem('stripe_back_to') || '/dashboard';
      sessionStorage.removeItem('stripe_back_to');
      navigate(backTo, { replace: true });
    }
    if (params.get('pro') === 'success') {
      toast.success('Abbonamento Pro attivato!');
      navigate('/dashboard', { replace: true });
    }
  }, []);

  const plans = {
    free: {
      name: 'Free',
      price: 0,
      features: [
        'Max 3 foto nel portfolio',
        'Max 5 richieste prenotazione/mese',
        'Ricevi monete dalle live',
        'Ricevi richieste da venue',
      ],
      limits: true,
    },
    pro: {
      name: 'Pro',
      monthly: 9.99,
      yearly: 7.99,
      yearlyTotal: 94.99,
      features: [
        'Portfolio illimitato',
        'Prenotazioni illimitate',
        'Badge verificato',
        'Analytics avanzati',
        'Ricevi monete dalle live',
        'Ricevi richieste da venue',
      ],
      limits: false,
    },
  };

  const handleSelectFree = async () => {
    navigate('/dashboard');
  };

  const PRICE_IDS = {
    monthly: 'price_1TK0cy1xRYLOYkOCTdrzhjFJ',
    yearly:  'price_1TK0hf1xRYLOYkOC1B0ylhQa',
  };

  const handleSelectPro = async () => {
    setLoading(true);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData?.session) { navigate('/login'); return; }
      const { session } = sessionData;

      const { data, error } = await supabase.functions.invoke('stripe-checkout', {
        body: {
          type: 'subscription',
          price_id: PRICE_IDS[billing],
          user_id: session.user.id,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw new Error(error.message || 'Errore dalla funzione');
      if (!data?.url) throw new Error('URL di pagamento non ricevuto');
      window.history.replaceState(null, '', '/dashboard');
      window.location.replace(data.url);
    } catch (err) {
      console.error('handleSelectPro error:', err);
      alert('Errore durante il pagamento: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const price = billing === 'monthly' ? plans.pro.monthly : plans.pro.yearly;

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', padding: '40px 20px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        <button onClick={() => navigate(-1)} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'none', border: '1px solid #333', color: '#aaa',
          padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
          fontSize: 14, marginBottom: 32,
        }}>
          ← Indietro
        </button>

        <h1 style={{ textAlign: 'center', fontSize: 36, fontWeight: 700, marginBottom: 8 }}>
          Scegli il tuo piano
        </h1>
        <p style={{ textAlign: 'center', color: '#888', marginBottom: 32 }}>
          In entrambi i piani puoi ricevere monete e richieste da venue.
        </p>

        {/* Toggle mensile/annuale */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 40 }}>
          {['monthly', 'yearly'].map(b => (
            <button key={b} onClick={() => setBilling(b)} style={{
              padding: '8px 24px', borderRadius: 20, border: 'none', cursor: 'pointer',
              background: billing === b ? '#6C63FF' : '#1a1a1a',
              color: billing === b ? '#fff' : '#888',
              fontWeight: 600, fontSize: 14,
            }}>
              {b === 'monthly' ? 'Mensile' : 'Annuale'}{b === 'yearly' ? ' (-20%)' : ''}
            </button>
          ))}
        </div>

        {/* Cards */}
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>

          {/* FREE */}
          <div style={{
            flex: 1, minWidth: 280, maxWidth: 380,
            background: '#111', border: '1px solid #222',
            borderRadius: 16, padding: 32,
          }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Free</h2>
            <div style={{ fontSize: 40, fontWeight: 800, marginBottom: 24 }}>€0</div>
            <ul style={{ listStyle: 'none', padding: 0, marginBottom: 32 }}>
              {plans.free.features.map((f, i) => (
                <li key={i} style={{ padding: '8px 0', borderBottom: '1px solid #1a1a1a', color: '#bbb', fontSize: 14 }}>
                  ✓ {f}
                </li>
              ))}
              <li style={{ padding: '8px 0', color: '#555', fontSize: 14 }}>✗ Badge verificato</li>
              <li style={{ padding: '8px 0', color: '#555', fontSize: 14 }}>✗ Analytics</li>
            </ul>
            <button onClick={handleSelectFree} style={{
              width: '100%', padding: '14px', borderRadius: 10, border: '1px solid #333',
              background: 'transparent', color: '#fff', fontWeight: 600, fontSize: 16, cursor: 'pointer',
            }}>
              Inizia gratis
            </button>
          </div>

          {/* PRO */}
          <div style={{
            flex: 1, minWidth: 280, maxWidth: 380,
            background: 'linear-gradient(135deg, #1a1040, #0f0f2a)',
            border: '1px solid #6C63FF',
            borderRadius: 16, padding: 32, position: 'relative',
          }}>
            <div style={{
              position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
              background: '#6C63FF', color: '#fff', padding: '4px 16px',
              borderRadius: 20, fontSize: 12, fontWeight: 700,
            }}>PIÙ SCELTO</div>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Pro</h2>
            <div style={{ fontSize: 40, fontWeight: 800, marginBottom: 4 }}>
              €{price.toFixed(2)}
              <span style={{ fontSize: 16, color: '#888' }}>/{billing === 'monthly' ? 'mese' : 'mese'}</span>
            </div>
            {billing === 'yearly' && (
              <div style={{ color: '#6C63FF', fontSize: 13, marginBottom: 20 }}>
                Fatturato €{plans.pro.yearlyTotal.toFixed(2)}/anno
              </div>
            )}
            <ul style={{ listStyle: 'none', padding: 0, marginBottom: 32, marginTop: 16 }}>
              {plans.pro.features.map((f, i) => (
                <li key={i} style={{ padding: '8px 0', borderBottom: '1px solid #1a1040', color: '#ddd', fontSize: 14 }}>
                  ✓ {f}
                </li>
              ))}
            </ul>
            <button onClick={handleSelectPro} disabled={loading} style={{
              width: '100%', padding: '14px', borderRadius: 10, border: 'none',
              background: '#6C63FF', color: '#fff', fontWeight: 700, fontSize: 16,
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
            }}>
              {loading ? 'Caricamento...' : 'Passa a Pro'}
            </button>
          </div>

        </div>

        {/* Nota monete */}
        <div style={{
          marginTop: 48, padding: 24, background: '#111',
          border: '1px solid #222', borderRadius: 12, textAlign: 'center',
        }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>🪙</div>
          <h3 style={{ marginBottom: 8 }}>Monete e prenotazioni venue</h3>
          <p style={{ color: '#888', fontSize: 14, maxWidth: 500, margin: '0 auto' }}>
            In entrambi i piani puoi ricevere monete dagli spettatori durante le live
            e accettare richieste di prenotazione dai venue. Su ogni transazione
            ArtistStage trattiene una piccola commissione.
          </p>
        </div>

      </div>
    </div>
  );
}
