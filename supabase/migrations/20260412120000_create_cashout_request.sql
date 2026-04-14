CREATE OR REPLACE FUNCTION public.create_cashout_request(coins_amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  current_balance integer;
BEGIN
  -- Legge il saldo attuale
  SELECT balance INTO current_balance
  FROM coin_balances
  WHERE user_id = auth.uid()
  LIMIT 1;

  -- Controllo saldo sufficiente
  IF current_balance IS NULL OR current_balance < coins_amount THEN
    RAISE EXCEPTION 'Saldo insufficiente';
  END IF;

  -- Inserisce la richiesta cashout
  INSERT INTO cashout_requests (
    artist_id,
    coins_redeemed,
    gross_euros,
    commission_pct,
    net_euros,
    status
  )
  VALUES (
    auth.uid(),
    coins_amount,
    coins_amount * 0.03,
    30,
    coins_amount * 0.0098,
    'pending'
  );

  -- Aggiorna saldo (sottrae solo le monete richieste)
  UPDATE coin_balances
  SET balance = balance - coins_amount
  WHERE user_id = auth.uid();
END;
$function$;
