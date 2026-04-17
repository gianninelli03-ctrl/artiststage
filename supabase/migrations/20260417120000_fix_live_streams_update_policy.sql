-- Rimuove la policy permissiva che consentiva a qualsiasi utente autenticato
-- di aggiornare qualsiasi riga in live_streams.
-- Le policy restrittive corrette (cleanup_stale_lives, artist_update_own_live)
-- sono già presenti dalla migration 20260409120000.
DROP POLICY IF EXISTS "streams_update" ON public.live_streams;
