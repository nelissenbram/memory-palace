-- ============================================================
-- Social Fixes: RLS policies, indexes, constraints, view
-- ============================================================

-- ── 1. Extend public_profiles view with social fields ──
-- Migration 033 restricted profiles SELECT to own row only.
-- Social features need cross-user lookups for username, bio, is_public.
CREATE OR REPLACE VIEW public_profiles AS
  SELECT id, display_name, avatar_url, username, bio, is_public, created_at
  FROM profiles;

GRANT SELECT ON public_profiles TO anon, authenticated;

-- ── 2. Add UPDATE policy on profiles for own row ──
-- Without this, updateProfile() silently fails (0 rows updated).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own profile' AND tablename = 'profiles'
  ) THEN
    CREATE POLICY "Users can update own profile" ON profiles
      FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());
  END IF;
END $$;

-- ── 3. Fix activity_feed INSERT policy ──
-- Old policy used WITH CHECK (true), allowing any user to impersonate any actor_id.
DROP POLICY IF EXISTS "Service role can insert" ON activity_feed;
CREATE POLICY "Users can insert own activities" ON activity_feed
  FOR INSERT WITH CHECK (auth.uid() = actor_id);

-- ── 4. Fix activity_feed SELECT policy ──
-- Feed queries need to read activities from followed users, not just own.
DROP POLICY IF EXISTS "Users can read own feed" ON activity_feed;
CREATE POLICY "Authenticated users can read activity feed" ON activity_feed
  FOR SELECT USING (auth.role() = 'authenticated');

-- ── 5. Add UPDATE policy on comments ──
CREATE POLICY "Users can update own comments" ON comments
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── 6. Fix featured_palaces policy — add WITH CHECK for INSERT ──
DROP POLICY IF EXISTS "Service role manages featured" ON featured_palaces;
CREATE POLICY "Service role manages featured" ON featured_palaces
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- ── 7. Add UNIQUE on featured_palaces ──
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'featured_palaces_user_unique'
  ) THEN
    ALTER TABLE featured_palaces ADD CONSTRAINT featured_palaces_user_unique UNIQUE (user_id);
  END IF;
END $$;

-- ── 8. Missing indexes ──
CREATE INDEX IF NOT EXISTS idx_palace_visits_visitor ON palace_visits (visitor_id, visited_at DESC);
CREATE INDEX IF NOT EXISTS idx_palace_visits_room ON palace_visits (room_id, visited_at DESC) WHERE room_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments (user_id);

-- ── 9. CHECK constraints on visibility columns ──
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wings_publish_visibility_check') THEN
    ALTER TABLE wings ADD CONSTRAINT wings_publish_visibility_check
      CHECK (publish_visibility IN ('private', 'public', 'followers'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rooms_publish_visibility_check') THEN
    ALTER TABLE rooms ADD CONSTRAINT rooms_publish_visibility_check
      CHECK (publish_visibility IN ('private', 'public', 'followers'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'room_collaborators_role_check') THEN
    ALTER TABLE room_collaborators ADD CONSTRAINT room_collaborators_role_check
      CHECK (role IN ('viewer', 'editor', 'admin'));
  END IF;
END $$;

-- ── 10. Fix room_collaborators policies ──
DROP POLICY IF EXISTS "Room owner can manage collaborators" ON room_collaborators;
CREATE POLICY "Room owner can manage collaborators" ON room_collaborators
  FOR ALL
  USING (auth.uid() IN (SELECT user_id FROM rooms WHERE id = room_id))
  WITH CHECK (auth.uid() IN (SELECT user_id FROM rooms WHERE id = room_id));
