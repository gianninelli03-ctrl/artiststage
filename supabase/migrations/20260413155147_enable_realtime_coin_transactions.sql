-- Abilita Realtime sulla tabella coin_transactions
-- Necessario per postgres_changes nel client Supabase JS (live coin notifications)
ALTER PUBLICATION supabase_realtime ADD TABLE coin_transactions;
