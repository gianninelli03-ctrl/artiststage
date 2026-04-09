-- Abilita Realtime sulla tabella live_messages
-- Necessario per postgres_changes nel client Supabase JS
ALTER PUBLICATION supabase_realtime ADD TABLE live_messages;
