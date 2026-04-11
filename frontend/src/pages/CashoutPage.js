import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import { toast } from 'sonner';

const COIN_TO_EUR = 0.014;
const PLATFORM_FEE = 0.30;
const NET_MULTIPLIER = COIN_TO_EUR * (1 - PLATFORM_FEE); // 0.0098 €/moneta
const MIN_PAYOUT_EUR = 20;
const MIN_CASHOUT_COINS = 1000;

export default function CashoutPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [balance, setBalance] = useState(null);
  const [isArtist, setIsArtist] = useState(false);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [redeemCoins, setRedeemCoins] = useState(0);

  const coinsToRedeem = Math.min(Math.max(Number(redeemCoins) || 0, 0), balance ?? 0);
  const netValue = coinsToRedeem * NET_MULTIPLIER;
  const canCashout = coinsToRedeem >= MIN_CASHOUT_COINS && netValue >= MIN_PAYOUT_EUR;

  useEffect(() => {
    if (!user?.id) return;
    const load = async () => {
      const [{ data: artist }, { data: bal }, { data: pending }] = await Promise.all([
        supabase.from('artist_profiles').select('id').eq('user_id', user.id).maybeSingle(),
        supabase.from('coin_balances').select('balance').eq('user_id', user.id).single(),
        supabase.from('cashout_requests')
          .select('*')
          .eq('artist_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      if (!artist) { navigate('/dashboard'); return; }
      setIsArtist(true);
      setBalance(bal?.balance ?? 0);
      setRedeemCoins(bal?.balance ?? 0);
      setPendingRequests(pending || []);
      setLoading(false);
    };
    load();
  }, [user?.id, navigate]);

  const handleCashout = async () => {
    if (!canCashout || requesting) return;
    setRequesting(true);
    try {
      console.log('CALLING RPC with:', coinsToRedeem);
      const { error: rpcError } = await supabase.rpc('create_cashout_request', {
        coins_amount: coinsToRedeem,
      });
      console.log('RPC ERROR FULL:', rpcError);
      console.log('RPC RESPONSE:', { rpcError });
      if (rpcError) {
        console.error('RPC FAILED:', rpcError.message, rpcError.details, rpcError.hint);
      }
      if (rpcError) throw rpcError;

      setBalance(0);
      setPendingRequests(prev => [{
        coins: coinsToRedeem,
        amount_eur: parseFloat(netValue.toFixed(2)),
        status: 'pending',
        created_at: new Date().toISOString(),
      }, ...prev]);
      toast.success('Richiesta inviata! Ti contatteremo entro 5 giorni lavorativi.');
    } catch (e) {
      console.error(e);
      toast.error('Errore nell\'invio della richiesta. Riprova.');
    } finally {
      setRequesting(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#09090B]">
        <Navbar />
        <div className="pt-24 flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-[#FF007A] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090B] text-white">
      <Navbar />
      <main className="max-w-xl mx-auto px-4 pt-28 pb-16">

        <h1 className="text-3xl font-bold mb-2">Cashout</h1>
        <p className="text-zinc-400 text-sm mb-8">
          Converti le tue monete in euro.
        </p>

        {/* Saldo e valore */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Saldo monete</p>
              <p className="text-4xl font-bold">🪙 {balance ?? '…'}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Valore netto</p>
              <p className="text-4xl font-bold text-green-400">€{netValue.toFixed(2)}</p>
            </div>
          </div>

          {/* Requisito minimo */}
          {!canCashout && (
            <div className="mb-4 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm">
              {coinsToRedeem < MIN_CASHOUT_COINS ? (
                <>Minimo 1000 monete per il cashout.</>
              ) : (
                <>
                  Minimo €{MIN_PAYOUT_EUR} netti per richiedere il cashout.
                  Mancano ancora €{(MIN_PAYOUT_EUR - netValue).toFixed(2)}.
                </>
              )}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-2">
              Monete da riscattare
            </label>
            <input
              type="number"
              min="0"
              max={balance ?? 0}
              step="1"
              value={redeemCoins}
              onChange={(e) => {
                const value = Number(e.target.value);
                if (Number.isNaN(value)) {
                  setRedeemCoins(0);
                  return;
                }
                setRedeemCoins(Math.min(Math.max(value, 0), balance ?? 0));
              }}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-zinc-700"
            />
            <p className="mt-2 text-sm text-zinc-400">Riceverai: €{netValue.toFixed(2)}</p>
          </div>

          <button
            onClick={handleCashout}
            disabled={!canCashout || requesting}
            className={`w-full py-4 rounded-xl font-bold text-base transition-all ${
              canCashout && !requesting
                ? 'bg-green-500 hover:bg-green-400 text-black'
                : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
            }`}
          >
            {requesting ? 'Invio in corso…' : 'Richiedi cashout'}
          </button>
        </div>

        {/* Storico richieste */}
        {pendingRequests.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h2 className="font-semibold text-white mb-4">Ultime richieste</h2>
            <div className="space-y-3">
              {pendingRequests.map((req, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
                  <div>
                    <p className="text-sm text-white">🪙 {req.coins} monete → €{req.amount_eur?.toFixed(2)}</p>
                    <p className="text-xs text-zinc-500">
                      {new Date(req.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                    req.status === 'pending' ? 'bg-yellow-500/15 text-yellow-400' :
                    req.status === 'completed' ? 'bg-green-500/15 text-green-400' :
                    'bg-red-500/15 text-red-400'
                  }`}>
                    {req.status === 'pending' ? 'In attesa' :
                     req.status === 'completed' ? 'Completato' : 'Rifiutato'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-zinc-600 text-xs mt-8">
          I pagamenti vengono processati entro 5 giorni lavorativi tramite bonifico bancario.
        </p>
      </main>
    </div>
  );
}
