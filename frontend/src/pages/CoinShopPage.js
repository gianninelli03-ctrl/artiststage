import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function CoinShopPage() {
  const navigate = useNavigate();
  const [packages, setPackages] = useState([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(null);

  const EMOJIS = ['🪙', '💰', '🎯', '👑'];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: pkgs } = await supabase
      .from('coin_packages')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: bal } = await supabase
        .from('coin_balances')
        .select('balance')
        .eq('user_id', user.id)
        .single();
      setBalance(bal?.balance || 0);
    }

    setPackages(pkgs || []);
    setLoading(false);
  };

  const handleBuy = async (pkg) => {
    if (buying) return;
    try {
      setBuying(pkg.id);

      // getSession() auto-refreshes il token se scaduto e aggiorna il client
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData?.session) { window.location.href = '/login'; return; }
      const { session } = sessionData;

      const { data, error } = await supabase.functions.invoke('stripe-checkout', {
        body: {
          type: 'coins',
          price_id: pkg.stripe_price_id,
          package_id: pkg.id,
          user_id: session.user.id,
          coins: pkg.coins,
          package_name: pkg.name,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw new Error(error.message || 'Errore dalla funzione');
      if (!data?.url) throw new Error('URL di pagamento non ricevuto');
      window.location.href = data.url;
    } catch (err) {
      console.error('handleBuy error:', err);
      alert('Errore durante il pagamento: ' + err.message);
    } finally {
      setBuying(null);
    }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#fff' }}>Caricamento...</div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', padding: '40px 20px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>

        <button onClick={() => navigate(-1)} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'none', border: '1px solid #333', color: '#aaa',
          padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
          fontSize: 14, marginBottom: 32,
        }}>
          ← Indietro
        </button>

        <h1 style={{ textAlign: 'center', fontSize: 32, fontWeight: 700, marginBottom: 8 }}>
          🪙 Shop Monete
        </h1>
        <p style={{ textAlign: 'center', color: '#888', marginBottom: 16 }}>
          Acquista monete e supporta i tuoi artisti preferiti durante le live
        </p>

        <div style={{
          background: '#111', border: '1px solid #222',
          borderRadius: 12, padding: '16px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 40,
        }}>
          <span style={{ color: '#888' }}>Il tuo saldo</span>
          <span style={{ fontSize: 24, fontWeight: 700 }}>🪙 {balance} monete</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
          {packages.map((pkg, i) => (
            <div key={pkg.id} style={{
              background: '#111',
              border: i === 1 ? '1px solid #6C63FF' : '1px solid #222',
              borderRadius: 16, padding: 24, textAlign: 'center',
              position: 'relative',
            }}>
              {i === 1 && (
                <div style={{
                  position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                  background: '#6C63FF', color: '#fff', padding: '3px 12px',
                  borderRadius: 20, fontSize: 11, fontWeight: 700,
                }}>POPOLARE</div>
              )}
              <div style={{ fontSize: 32, marginBottom: 8 }}>{EMOJIS[i]}</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{pkg.name}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#FFD700', marginBottom: 4 }}>
                🪙 {pkg.coins}
              </div>
              <div style={{ color: '#888', fontSize: 13, marginBottom: 16 }}>monete</div>
              <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>
                €{(pkg.price_cents / 100).toFixed(2)}
              </div>
              <button
                onClick={() => handleBuy(pkg)}
                disabled={buying !== null}
                style={{
                  width: '100%', padding: '10px', borderRadius: 8,
                  background: i === 1 ? '#6C63FF' : '#1a1a1a',
                  color: '#fff', fontWeight: 600,
                  cursor: buying !== null ? 'not-allowed' : 'pointer',
                  border: i === 1 ? 'none' : '1px solid #333',
                  opacity: buying !== null ? 0.7 : 1,
                }}
              >
                {buying === pkg.id ? 'Caricamento...' : 'Acquista'}
              </button>
            </div>
          ))}
        </div>

        <p style={{ textAlign: 'center', color: '#555', fontSize: 12, marginTop: 32 }}>
          Le monete non hanno valore monetario reale e non sono rimborsabili.
          Vengono usate esclusivamente per supportare gli artisti su ArtistStage.
        </p>

      </div>
    </div>
  );
}