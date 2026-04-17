-- Trigger server-side per il limite di 3 foto sul piano Free.
-- Blocca UPDATE di portfolio_media se l'utente supera 3 elementi
-- senza un abbonamento attivo in artist_subscriptions.

CREATE OR REPLACE FUNCTION public.check_photo_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_pro BOOLEAN;
  photo_count INT;
BEGIN
  photo_count := jsonb_array_length(COALESCE(NEW.portfolio_media, '[]'::jsonb));

  IF photo_count > 3 THEN
    SELECT EXISTS (
      SELECT 1 FROM artist_subscriptions
      WHERE artist_id = NEW.user_id
        AND status IN ('active', 'trialing')
    ) INTO is_pro;

    IF NOT is_pro THEN
      RAISE EXCEPTION 'Piano Free: massimo 3 foto. Passa a Pro per foto illimitate.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_photo_limit ON public.artist_profiles;
CREATE TRIGGER enforce_photo_limit
  BEFORE UPDATE OF portfolio_media ON public.artist_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_photo_limit();
