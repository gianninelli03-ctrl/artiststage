-- Permette a qualsiasi utente autenticato di disattivare live stantie (> 4 ore)
-- Usato dal cleanup automatico in LivePage.js
CREATE POLICY "cleanup_stale_lives" ON live_streams
  FOR UPDATE TO authenticated
  USING (is_active = true AND created_at < now() - interval '4 hours')
  WITH CHECK (is_active = false);

-- Permette all'artista di aggiornare la propria live (end live button)
DROP POLICY IF EXISTS "artist_update_own_live" ON live_streams;
CREATE POLICY "artist_update_own_live" ON live_streams
  FOR UPDATE TO authenticated
  USING (
    artist_id IN (
      SELECT id FROM artist_profiles WHERE user_id = auth.uid()
    )
  );

-- Permette a tutti di leggere le live attive
DROP POLICY IF EXISTS "live_streams_select" ON live_streams;
CREATE POLICY "live_streams_select" ON live_streams
  FOR SELECT USING (true);

-- Permette all'artista di inserire una nuova live
DROP POLICY IF EXISTS "live_streams_insert" ON live_streams;
CREATE POLICY "live_streams_insert" ON live_streams
  FOR INSERT TO authenticated
  WITH CHECK (
    artist_id IN (
      SELECT id FROM artist_profiles WHERE user_id = auth.uid()
    )
  );
