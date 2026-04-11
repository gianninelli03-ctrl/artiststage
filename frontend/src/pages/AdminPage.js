import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import { toast } from 'sonner';

export default function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState({ users: 0, revenue: 0, pendingCashouts: 0 });
  const [users, setUsers] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [cashouts, setCashouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('stats');

  useEffect(() => {
    if (user === undefined) return;
    if (!user) { navigate('/'); return; }

    const checkAdminAccess = async () => {
      const { data, error } = await supabase
        .from('admin_users')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error || !data) {
        navigate('/');
        return;
      }

      loadAll();
    };

    checkAdminAccess();
  }, [user]);

  const loadAll = async () => {
    const [
      { data: profilesData, count: usersCount },
      { data: purchasesData },
      { data: cashoutsData },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact' }).order('created_at', { ascending: false }).limit(50),
      supabase.from('coin_purchases').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('cashout_requests').select('*'),
    ]);

    const totalRevenue = (purchasesData || [])
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + (p.amount_cents || 0), 0);

    const pendingCashouts = (cashoutsData || []).filter(c => c.status === 'pending').length;

    setUsers(profilesData || []);
    setPurchases(purchasesData || []);
    setCashouts(cashoutsData || []);
    setStats({ users: usersCount || 0, revenue: totalRevenue, pendingCashouts });
    setLoading(false);
  };

  const handleCashout = async (id, action) => {
    const newStatus = action === 'approve' ? 'completed' : 'rejected';
    const cashout = cashouts.find(c => c.id === id);

    const { error } = await supabase
      .from('cashout_requests')
      .update({ status: newStatus })
      .eq('id', id);
    if (error) { toast.error('Errore aggiornamento'); return; }
    toast.success(action === 'approve' ? 'Approvato' : 'Rifiutato');
    setCashouts(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
    setStats(prev => ({ ...prev, pendingCashouts: prev.pendingCashouts - 1 }));

    if (cashout) {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session) {
        supabase.functions.invoke('send-email', {
          body: {
            type: 'cashout_update',
            payload: {
              artist_profile_id: cashout.artist_id,
              amount_eur: cashout.net_euros != null ? Number(cashout.net_euros).toFixed(2) : '—',
              status: newStatus,
            }
          },
          headers: { Authorization: `Bearer ${sessionData.session.access_token}` }
        }).catch(() => {});
      }
    }
  };

  if (loading || !user) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#fff' }}>Caricamento...</div>
    </div>
  );

  const TABS = ['stats', 'users', 'purchases', 'cashouts'];
  const TAB_LABELS = { stats: 'Statistiche', users: 'Utenti', purchases: 'Transazioni', cashouts: `Cashout${stats.pendingCashouts > 0 ? ` (${stats.pendingCashouts})` : ''}` };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', padding: '32px 20px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>Admin Panel</h1>
            <p style={{ color: '#555', fontSize: 13, marginTop: 4 }}>{user.email}</p>
          </div>
          <button onClick={() => navigate('/dashboard')} style={btnOutline}>← Dashboard</button>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '8px 20px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
              background: tab === t ? '#6C63FF' : '#1a1a1a',
              color: tab === t ? '#fff' : '#888',
            }}>
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>

        {/* STATISTICHE */}
        {tab === 'stats' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            {[
              { label: 'Utenti totali', value: stats.users, color: '#6C63FF' },
              { label: 'Incasso totale (€)', value: `€${(stats.revenue / 100).toFixed(2)}`, color: '#00C896' },
              { label: 'Cashout pendenti', value: stats.pendingCashouts, color: '#FF9500' },
              { label: 'Transazioni', value: purchases.length, color: '#00F0FF' },
            ].map(s => (
              <div key={s.label} style={{ background: '#111', border: '1px solid #222', borderRadius: 16, padding: 24 }}>
                <p style={{ color: '#666', fontSize: 12, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</p>
                <p style={{ fontSize: 36, fontWeight: 800, color: s.color, margin: 0 }}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* UTENTI */}
        {tab === 'users' && (
          <div style={{ background: '#111', border: '1px solid #222', borderRadius: 16, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#1a1a1a' }}>
                  {['Nome', 'Email', 'Tipo', 'Registrato'].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                    <td style={tdStyle}>{u.name || '—'}</td>
                    <td style={tdStyle}>{u.email || '—'}</td>
                    <td style={tdStyle}>
                      <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                        background: u.user_type === 'artist' ? '#6C63FF22' : '#ffffff11',
                        color: u.user_type === 'artist' ? '#6C63FF' : '#888' }}>
                        {u.user_type || 'visitor'}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, color: '#555' }}>
                      {new Date(u.created_at).toLocaleDateString('it-IT')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TRANSAZIONI */}
        {tab === 'purchases' && (
          <div style={{ background: '#111', border: '1px solid #222', borderRadius: 16, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#1a1a1a' }}>
                  {['User ID', 'Monete', 'Importo', 'Status', 'Data'].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {purchases.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                    <td style={{ ...tdStyle, color: '#555', fontSize: 11 }}>{p.user_id?.slice(0, 12)}…</td>
                    <td style={tdStyle}>🪙 {p.coins_received}</td>
                    <td style={tdStyle}>€{((p.amount_cents || 0) / 100).toFixed(2)}</td>
                    <td style={tdStyle}>
                      <span style={statusBadge(p.status)}>{p.status}</span>
                    </td>
                    <td style={{ ...tdStyle, color: '#555' }}>
                      {new Date(p.created_at).toLocaleDateString('it-IT')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* CASHOUT */}
        {tab === 'cashouts' && (
          <div style={{ background: '#111', border: '1px solid #222', borderRadius: 16, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#1a1a1a' }}>
                  {['Utente', 'Monete', 'Importo', 'Status', 'Data', 'Azioni'].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cashouts.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 600 }}>{c.artist_id?.slice(0, 8) || '—'}</div>
                    </td>
                    <td style={tdStyle}>🪙 {c.coins_redeemed}</td>
                    <td style={tdStyle}>€{c.net_euros?.toFixed(2)}</td>
                    <td style={tdStyle}>
                      <span style={statusBadge(c.status)}>{c.status}</span>
                    </td>
                    <td style={{ ...tdStyle, color: '#555' }}>
                      {c.created_at ? new Date(c.created_at).toLocaleDateString('it-IT') : '—'}
                    </td>
                    <td style={tdStyle}>
                      {c.status === 'pending' && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => handleCashout(c.id, 'approve')} style={btnApprove}>
                            ✓ Approva
                          </button>
                          <button onClick={() => handleCashout(c.id, 'reject')} style={btnReject}>
                            ✗ Rifiuta
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {cashouts.length === 0 && (
                  <tr><td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: '#444', padding: 32 }}>Nessuna richiesta</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────
const thStyle = { padding: '12px 16px', textAlign: 'left', color: '#555', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8 };
const tdStyle = { padding: '12px 16px', color: '#ccc', verticalAlign: 'middle' };
const btnOutline = { background: 'none', border: '1px solid #333', color: '#aaa', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13 };
const btnApprove = { background: '#00C89622', border: '1px solid #00C896', color: '#00C896', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700 };
const btnReject = { background: '#FF3B3022', border: '1px solid #FF3B30', color: '#FF3B30', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700 };

const statusBadge = (status) => ({
  padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
  background: status === 'completed' ? '#00C89622' : status === 'pending' ? '#FF950022' : '#FF3B3022',
  color: status === 'completed' ? '#00C896' : status === 'pending' ? '#FF9500' : '#FF3B30',
});
