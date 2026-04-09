-- artist_subscriptions table already exists in the remote DB.
-- This migration adds service role access so the webhook can write to it.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'artist_subscriptions'
    AND policyname = 'Service role full access subscriptions'
  ) THEN
    EXECUTE 'CREATE POLICY "Service role full access subscriptions"
      ON artist_subscriptions FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true)';
  END IF;
END$$;
