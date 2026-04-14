-- ArtistStage — security policies synced from live DB
-- Generated to version critical admin / cashout / balances / purchases rules

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cashout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coin_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coin_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read own admin row" ON public.admin_users;
CREATE POLICY "read own admin row"
ON public.admin_users
FOR SELECT
TO public
USING ((auth.uid() = user_id));


DROP POLICY IF EXISTS "admin_read_all_cashouts" ON public.cashout_requests;
CREATE POLICY "admin_read_all_cashouts"
ON public.cashout_requests
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM admin_users
    WHERE (admin_users.user_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "admin_update_cashouts" ON public.cashout_requests;
CREATE POLICY "admin_update_cashouts"
ON public.cashout_requests
FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM admin_users
    WHERE (admin_users.user_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "cashout proprio" ON public.cashout_requests;
CREATE POLICY "cashout proprio"
ON public.cashout_requests
FOR ALL
TO public
USING ((auth.uid() = artist_id));

DROP POLICY IF EXISTS "insert own cashout" ON public.cashout_requests;
CREATE POLICY "insert own cashout"
ON public.cashout_requests
FOR INSERT
TO public
WITH CHECK ((auth.uid() = artist_id));

DROP POLICY IF EXISTS "saldo proprio" ON public.coin_balances;
CREATE POLICY "saldo proprio"
ON public.coin_balances
FOR ALL
TO public
USING ((auth.uid() = user_id));

DROP POLICY IF EXISTS "acquisti propri" ON public.coin_purchases;
CREATE POLICY "acquisti propri"
ON public.coin_purchases
FOR ALL
TO public
USING ((auth.uid() = user_id));


DROP POLICY IF EXISTS "insert own purchase" ON public.coin_purchases;
CREATE POLICY "insert own purchase"
ON public.coin_purchases
FOR INSERT
TO public
WITH CHECK ((auth.uid() = user_id));
