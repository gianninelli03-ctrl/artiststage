-- ================================================================
-- ArtistStage — RLS Policies
-- ================================================================

-- Abilita RLS su tutte le tabelle
ALTER TABLE profiles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE artist_profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitor_profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages               ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications          ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE followers              ENABLE ROW LEVEL SECURITY;
ALTER TABLE artist_availability    ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_requests       ENABLE ROW LEVEL SECURITY;
ALTER TABLE deleted_conversations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_streams           ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_messages          ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- PROFILES
-- ================================================================
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;

CREATE POLICY "profiles_select"   ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert"   ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update"   ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- ================================================================
-- ARTIST_PROFILES
-- ================================================================
DROP POLICY IF EXISTS "artist_profiles_select" ON artist_profiles;
DROP POLICY IF EXISTS "artist_profiles_write"  ON artist_profiles;

CREATE POLICY "artist_profiles_select" ON artist_profiles FOR SELECT USING (true);
CREATE POLICY "artist_profiles_write"  ON artist_profiles FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ================================================================
-- VISITOR_PROFILES
-- ================================================================
DROP POLICY IF EXISTS "visitor_profiles_select" ON visitor_profiles;
DROP POLICY IF EXISTS "visitor_profiles_write"  ON visitor_profiles;

CREATE POLICY "visitor_profiles_select" ON visitor_profiles FOR SELECT USING (true);
CREATE POLICY "visitor_profiles_write"  ON visitor_profiles FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ================================================================
-- MESSAGES
-- ================================================================
DROP POLICY IF EXISTS "messages_select" ON messages;
DROP POLICY IF EXISTS "messages_insert" ON messages;
DROP POLICY IF EXISTS "messages_update" ON messages;
DROP POLICY IF EXISTS "messages_delete" ON messages;

CREATE POLICY "messages_select" ON messages FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "messages_insert" ON messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "messages_update" ON messages FOR UPDATE TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "messages_delete" ON messages FOR DELETE TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- ================================================================
-- NOTIFICATIONS
-- INSERT permissivo: un utente crea notifiche per altri utenti
-- ================================================================
DROP POLICY IF EXISTS "notifications_select" ON notifications;
DROP POLICY IF EXISTS "notifications_insert" ON notifications;
DROP POLICY IF EXISTS "notifications_update" ON notifications;
DROP POLICY IF EXISTS "notifications_delete" ON notifications;

CREATE POLICY "notifications_select" ON notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "notifications_insert" ON notifications FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY "notifications_update" ON notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "notifications_delete" ON notifications FOR DELETE TO authenticated
  USING (true);

-- ================================================================
-- LIKES
-- ================================================================
DROP POLICY IF EXISTS "likes_select" ON likes;
DROP POLICY IF EXISTS "likes_insert" ON likes;
DROP POLICY IF EXISTS "likes_delete" ON likes;

CREATE POLICY "likes_select" ON likes FOR SELECT USING (true);
CREATE POLICY "likes_insert" ON likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "likes_delete" ON likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ================================================================
-- FOLLOWERS
-- ================================================================
DROP POLICY IF EXISTS "followers_select" ON followers;
DROP POLICY IF EXISTS "followers_insert" ON followers;
DROP POLICY IF EXISTS "followers_delete" ON followers;

CREATE POLICY "followers_select" ON followers FOR SELECT USING (true);
CREATE POLICY "followers_insert" ON followers FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "followers_delete" ON followers FOR DELETE TO authenticated USING (auth.uid() = follower_id);

-- ================================================================
-- ARTIST_AVAILABILITY
-- ================================================================
DROP POLICY IF EXISTS "availability_select" ON artist_availability;
DROP POLICY IF EXISTS "availability_write"  ON artist_availability;

CREATE POLICY "availability_select" ON artist_availability FOR SELECT USING (true);
CREATE POLICY "availability_write"  ON artist_availability FOR ALL TO authenticated
  USING (auth.uid() = (SELECT user_id FROM artist_profiles WHERE id = artist_id))
  WITH CHECK (auth.uid() = (SELECT user_id FROM artist_profiles WHERE id = artist_id));

-- ================================================================
-- BOOKING_REQUESTS
-- ================================================================
DROP POLICY IF EXISTS "booking_select" ON booking_requests;
DROP POLICY IF EXISTS "booking_insert" ON booking_requests;
DROP POLICY IF EXISTS "booking_update" ON booking_requests;

CREATE POLICY "booking_select" ON booking_requests FOR SELECT TO authenticated
  USING (
    auth.uid() = visitor_id OR
    auth.uid() = (SELECT user_id FROM artist_profiles WHERE id = artist_id)
  );
CREATE POLICY "booking_insert" ON booking_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = visitor_id);
CREATE POLICY "booking_update" ON booking_requests FOR UPDATE TO authenticated
  USING (auth.uid() = (SELECT user_id FROM artist_profiles WHERE id = artist_id));

-- ================================================================
-- DELETED_CONVERSATIONS
-- ================================================================
DROP POLICY IF EXISTS "deleted_conv_all" ON deleted_conversations;

CREATE POLICY "deleted_conv_all" ON deleted_conversations FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ================================================================
-- LIVE_STREAMS
-- ================================================================
DROP POLICY IF EXISTS "streams_select" ON live_streams;
DROP POLICY IF EXISTS "streams_insert" ON live_streams;
DROP POLICY IF EXISTS "streams_update" ON live_streams;

CREATE POLICY "streams_select" ON live_streams FOR SELECT USING (true);
CREATE POLICY "streams_insert" ON live_streams FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = artist_user_id);
CREATE POLICY "streams_update" ON live_streams FOR UPDATE TO authenticated
  USING (true);

-- ================================================================
-- LIVE_MESSAGES
-- ================================================================
DROP POLICY IF EXISTS "live_messages_select" ON live_messages;
DROP POLICY IF EXISTS "live_messages_insert" ON live_messages;

CREATE POLICY "live_messages_select" ON live_messages FOR SELECT USING (true);
CREATE POLICY "live_messages_insert" ON live_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
