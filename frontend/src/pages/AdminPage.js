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

    // Carica stage_name per ogni artist_id presente nei cashout
    let cashoutsWithName = cashoutsData || [];
    const artistIds = [...new Set((cashoutsData || []).map(c => c.artist_id).filter(Boolean))];
    if (artistIds.length > 0) {
      const { data: artistData } = await supabase
        .from('artist_profiles')
        .select('user_id, stage_name')
        .in('user_id', artistIds);
      const nameMap = {};
      for (const a of artistData || []) nameMap[a.user_id] = a.stage_name;
      cashoutsWithName = cashoutsWithName.map(c => ({ ...c, stage_name: nameMap[c.artist_id] || null }));
    }

    const totalRevenue = (purchasesData || [])
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + (p.amount_cents || 0), 0);

    const pendingCashouts = cashoutsWithName.filter(c => c.status === 'pending').length;

    setUsers(profilesData || []);
    setPurchases(purchasesData || []);
    setCashouts(cashoutsWithName);
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

  const TABS = ['stats', 'users', 'purchases', 'cashouts', 'storico'];
  const TAB_LABELS = { stats: 'Statistiche', users: 'Utenti', purchases: 'Transazioni', cashouts: `Cashout${stats.pendingCashouts > 0 ? ` (${stats.pendingCashouts})` : ''}`, storico: 'Storico' };

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
        {tab === 'purchases' && (() => {
          const settled = cashouts.filter(c => ['completed', 'rejected'].includes(c.status));
          const parseDay = s => { const [d,m,y] = s.split('/'); return new Date(`${y}-${m}-${d}`); };

          const byMonth = settled.reduce((acc, c) => {
            const key = c.created_at ? new Date(c.created_at).toISOString().slice(0, 7) : 'unknown';
            if (!acc[key]) acc[key] = [];
            acc[key].push(c);
            return acc;
          }, {});
          const months = Object.keys(byMonth).sort((a, b) => b.localeCompare(a));

          if (months.length === 0) return (
            <div style={{ background: '#111', border: '1px solid #222', borderRadius: 16, padding: 32, textAlign: 'center', color: '#444' }}>
              Nessuna transazione chiusa
            </div>
          );

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {months.map(monthKey => {
                const items = byMonth[monthKey];
                const completed = items.filter(c => c.status === 'completed');
                const rejected = items.filter(c => c.status === 'rejected');
                const totalCompleted = completed.reduce((s, c) => s + (Number(c.net_euros) || 0), 0);
                const totalRejected = rejected.reduce((s, c) => s + (Number(c.net_euros) || 0), 0);
                const monthLabel = monthKey === 'unknown' ? 'Data sconosciuta' :
                  new Date(`${monthKey}-01T00:00:00`).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });

                const byDay = (list) => list.reduce((acc, c) => {
                  const day = c.created_at ? new Date(c.created_at).toLocaleDateString('it-IT') : '—';
                  if (!acc[day]) acc[day] = { count: 0, total: 0 };
                  acc[day].count += 1;
                  acc[day].total += Number(c.net_euros) || 0;
                  return acc;
                }, {});

                return (
                  <div key={monthKey} style={{ background: '#111', border: '1px solid #222', borderRadius: 16, padding: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                      <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, textTransform: 'capitalize' }}>{monthLabel}</h2>
                      <div style={{ display: 'flex', gap: 16 }}>
                        <span style={{ color: '#00C896', fontWeight: 700, fontSize: 13 }}>✓ €{totalCompleted.toFixed(2)}</span>
                        <span style={{ color: '#FF3B30', fontWeight: 700, fontSize: 13 }}>✗ €{totalRejected.toFixed(2)}</span>
                      </div>
                    </div>

                    {completed.length > 0 && (
                      <div style={{ marginBottom: 20 }}>
                        <p style={{ color: '#00C896', fontSize: 12, fontWeight: 700, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: 1 }}>
                          Accettate — {completed.length} richieste — €{totalCompleted.toFixed(2)}
                        </p>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                          <thead>
                            <tr style={{ background: '#1a1a1a' }}>
                              <th style={thStyle}>Giorno</th>
                              <th style={thStyle}>N° richieste</th>
                              <th style={thStyle}>Totale pagato</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(byDay(completed))
                              .sort((a, b) => parseDay(b[0]) - parseDay(a[0]))
                              .map(([day, { count, total }]) => (
                                <tr key={day} style={{ borderBottom: '1px solid #1a1a1a' }}>
                                  <td style={tdStyle}>{day}</td>
                                  <td style={tdStyle}>{count}</td>
                                  <td style={{ ...tdStyle, color: '#00C896', fontWeight: 700 }}>€{total.toFixed(2)}</td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {rejected.length > 0 && (
                      <div>
                        <p style={{ color: '#FF3B30', fontSize: 12, fontWeight: 700, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: 1 }}>
                          Rifiutate — {rejected.length} richieste — €{totalRejected.toFixed(2)}
                        </p>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                          <thead>
                            <tr style={{ background: '#1a1a1a' }}>
                              <th style={thStyle}>Giorno</th>
                              <th style={thStyle}>N° richieste</th>
                              <th style={thStyle}>Totale rifiutato</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(byDay(rejected))
                              .sort((a, b) => parseDay(b[0]) - parseDay(a[0]))
                              .map(([day, { count, total }]) => (
                                <tr key={day} style={{ borderBottom: '1px solid #1a1a1a' }}>
                                  <td style={tdStyle}>{day}</td>
                                  <td style={tdStyle}>{count}</td>
                                  <td style={{ ...tdStyle, color: '#FF3B30', fontWeight: 700 }}>€{total.toFixed(2)}</td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* CASHOUT */}
        {tab === 'cashouts' && (
          <div style={{ background: '#111', border: '1px solid #222', borderRadius: 16, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#1a1a1a' }}>
                  {['Artist ID', 'Monete', 'Importo', 'Data richiesta', 'Azioni'].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cashouts.filter(c => c.status === 'pending').map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                    <td style={{ ...tdStyle, fontSize: 13, color: '#ccc' }}>{c.stage_name || c.artist_id?.slice(0, 10) + '…'}</td>
                    <td style={tdStyle}>🪙 {c.coins_redeemed}</td>
                    <td style={{ ...tdStyle, fontWeight: 700, color: '#00C896' }}>€{Number(c.net_euros || 0).toFixed(2)}</td>
                    <td style={{ ...tdStyle, color: '#555' }}>
                      {c.created_at ? new Date(c.created_at).toLocaleDateString('it-IT') : '—'}
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => handleCashout(c.id, 'approve')} style={btnApprove}>✓ Approva</button>
                        <button onClick={() => handleCashout(c.id, 'reject')} style={btnReject}>✗ Rifiuta</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {cashouts.filter(c => c.status === 'pending').length === 0 && (
                  <tr><td colSpan={5} style={{ ...tdStyle, textAlign: 'center', color: '#444', padding: 32 }}>Nessuna richiesta in attesa</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* STORICO */}
        {tab === 'storico' && (() => {
          const settled = cashouts.filter(c => ['completed', 'rejected'].includes(c.status));
          const parseDay = s => { const [d,m,y] = s.split('/'); return new Date(`${y}-${m}-${d}`); };

          // Raggruppa per giorno
          const byDay = settled.reduce((acc, c) => {
            const day = c.created_at ? new Date(c.created_at).toLocaleDateString('it-IT') : '—';
            if (!acc[day]) acc[day] = { completed: [], rejected: [] };
            if (c.status === 'completed') acc[day].completed.push(c);
            else acc[day].rejected.push(c);
            return acc;
          }, {});

          const days = Object.keys(byDay).filter(d => d !== '—').sort((a, b) => parseDay(b) - parseDay(a));
          if (byDay['—']) days.push('—');

          if (days.length === 0) return (
            <div style={{ background: '#111', border: '1px solid #222', borderRadius: 16, padding: 32, textAlign: 'center', color: '#444' }}>
              Nessuna richiesta chiusa
            </div>
          );

          const totalCompleted = settled.filter(c => c.status === 'completed');
          const totalRejected = settled.filter(c => c.status === 'rejected');
          const totalEurCompleted = totalCompleted.reduce((s, c) => s + (Number(c.net_euros) || 0), 0);
          const totalEurRejected = totalRejected.reduce((s, c) => s + (Number(c.net_euros) || 0), 0);

          const RowItem = ({ c }) => (
            <div style={{ padding: '10px 0', borderBottom: '1px solid #1e1e1e' }}>
              <div style={{ fontSize: 13, color: '#ccc', fontWeight: 600, marginBottom: 2 }}>{c.stage_name || c.artist_id?.slice(0, 10) + '…'}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: '#ccc' }}>🪙 {c.coins_redeemed}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: c.status === 'completed' ? '#00C896' : '#FF3B30' }}>
                  €{Number(c.net_euros || 0).toFixed(2)}
                </span>
              </div>
            </div>
          );

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Riepilogo totale */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ background: '#00C89611', border: '1px solid #00C89633', borderRadius: 12, padding: '16px 20px' }}>
                  <p style={{ color: '#00C896', fontSize: 11, fontWeight: 700, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: 1 }}>Totale accettate</p>
                  <p style={{ fontSize: 28, fontWeight: 800, color: '#00C896', margin: '0 0 4px' }}>€{totalEurCompleted.toFixed(2)}</p>
                  <p style={{ color: '#555', fontSize: 12, margin: 0 }}>{totalCompleted.length} richieste</p>
                </div>
                <div style={{ background: '#FF3B3011', border: '1px solid #FF3B3033', borderRadius: 12, padding: '16px 20px' }}>
                  <p style={{ color: '#FF3B30', fontSize: 11, fontWeight: 700, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: 1 }}>Totale rifiutate</p>
                  <p style={{ fontSize: 28, fontWeight: 800, color: '#FF3B30', margin: '0 0 4px' }}>€{totalEurRejected.toFixed(2)}</p>
                  <p style={{ color: '#555', fontSize: 12, margin: 0 }}>{totalRejected.length} richieste</p>
                </div>
              </div>

              {days.map(day => {
                const { completed, rejected } = byDay[day] || { completed: [], rejected: [] };
                return (
                  <div key={day} style={{ background: '#111', border: '1px solid #222', borderRadius: 16, overflow: 'hidden' }}>
                    {/* Header giorno */}
                    <div style={{ background: '#1a1a1a', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{day}</span>
                      <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
                        <span style={{ color: '#00C896' }}>✓ {completed.length} — €{completed.reduce((s,c) => s + (Number(c.net_euros)||0), 0).toFixed(2)}</span>
                        <span style={{ color: '#FF3B30' }}>✗ {rejected.length} — €{rejected.reduce((s,c) => s + (Number(c.net_euros)||0), 0).toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Due colonne */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                      {/* Accettate */}
                      <div style={{ padding: '12px 20px', borderRight: '1px solid #1e1e1e' }}>
                        <p style={{ color: '#00C896', fontSize: 11, fontWeight: 700, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 1 }}>Accettate</p>
                        {completed.length === 0
                          ? <p style={{ color: '#333', fontSize: 12 }}>—</p>
                          : completed.map(c => <RowItem key={c.id} c={c} />)
                        }
                      </div>
                      {/* Rifiutate */}
                      <div style={{ padding: '12px 20px' }}>
                        <p style={{ color: '#FF3B30', fontSize: 11, fontWeight: 700, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 1 }}>Rifiutate</p>
                        {rejected.length === 0
                          ? <p style={{ color: '#333', fontSize: 12 }}>—</p>
                          : rejected.map(c => <RowItem key={c.id} c={c} />)
                        }
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}

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
