-- ============================================================
-- Social Foundation: profiles extension, follows, activity feed,
-- comments, reactions, publishing, visits, directory
-- ============================================================

-- ── 1. Extend profiles with social fields ──
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles (username) WHERE username IS NOT NULL;

-- ── 2. Follows ──
CREATE TABLE IF NOT EXISTS follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT follows_unique UNIQUE (follower_id, following_id),
  CONSTRAINT follows_no_self CHECK (follower_id <> following_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows (follower_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows (following_id, created_at DESC);

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read all follows" ON follows
  FOR SELECT USING (true);
CREATE POLICY "Users can insert own follows" ON follows
  FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can delete own follows" ON follows
  FOR DELETE USING (auth.uid() = follower_id);

-- ── 3. Activity feed ──
CREATE TABLE IF NOT EXISTS activity_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_feed_target_user ON activity_feed (target_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_feed_actor ON activity_feed (actor_id, created_at DESC);

ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own feed" ON activity_feed
  FOR SELECT USING (
    auth.uid() = target_user_id
    OR auth.uid() = actor_id
  );
CREATE POLICY "Service role can insert" ON activity_feed
  FOR INSERT WITH CHECK (true);

-- ── 4. Comments ──
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  body TEXT NOT NULL,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comments_target ON comments (target_type, target_id, created_at);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments (parent_id) WHERE parent_id IS NOT NULL;

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read comments on public content" ON comments
  FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert comments" ON comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON comments
  FOR DELETE USING (auth.uid() = user_id);

-- ── 5. Reactions ──
CREATE TABLE IF NOT EXISTS reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT reactions_unique UNIQUE (user_id, target_type, target_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_reactions_target ON reactions (target_type, target_id);

ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read reactions" ON reactions
  FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert reactions" ON reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own reactions" ON reactions
  FOR DELETE USING (auth.uid() = user_id);

-- ── 6. Publishing support (extend wings and rooms) ──
ALTER TABLE wings
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS publish_description TEXT,
  ADD COLUMN IF NOT EXISTS publish_visibility TEXT DEFAULT 'private';

ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS publish_description TEXT,
  ADD COLUMN IF NOT EXISTS publish_visibility TEXT DEFAULT 'private';

CREATE INDEX IF NOT EXISTS idx_wings_published ON wings (published_at DESC) WHERE published_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rooms_published ON rooms (published_at DESC) WHERE published_at IS NOT NULL;

-- ── 7. Palace visits ──
CREATE TABLE IF NOT EXISTS palace_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  wing_id UUID REFERENCES wings(id) ON DELETE SET NULL,
  room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  visited_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_palace_visits_owner ON palace_visits (owner_id, visited_at DESC);
CREATE INDEX IF NOT EXISTS idx_palace_visits_wing ON palace_visits (wing_id, visited_at DESC) WHERE wing_id IS NOT NULL;

ALTER TABLE palace_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read visits to own content" ON palace_visits
  FOR SELECT USING (auth.uid() = owner_id OR auth.uid() = visitor_id);
CREATE POLICY "Authenticated users can insert visits" ON palace_visits
  FOR INSERT WITH CHECK (auth.uid() = visitor_id);

-- ── 8. Featured palaces (admin-curated directory) ──
CREATE TABLE IF NOT EXISTS featured_palaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category TEXT,
  featured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE featured_palaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read featured" ON featured_palaces
  FOR SELECT USING (true);
CREATE POLICY "Service role manages featured" ON featured_palaces
  FOR ALL USING (auth.role() = 'service_role');

-- ── 9. Room collaborators ──
CREATE TABLE IF NOT EXISTS room_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer',
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  CONSTRAINT room_collaborators_unique UNIQUE (room_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_room_collaborators_room ON room_collaborators (room_id);
CREATE INDEX IF NOT EXISTS idx_room_collaborators_user ON room_collaborators (user_id);

ALTER TABLE room_collaborators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Room owner and collaborator can read" ON room_collaborators
  FOR SELECT USING (
    auth.uid() = user_id
    OR auth.uid() IN (SELECT user_id FROM rooms WHERE id = room_id)
  );
CREATE POLICY "Room owner can manage collaborators" ON room_collaborators
  FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM rooms WHERE id = room_id)
  );

-- ── 10. Extend public_shares with expiry and scope ──
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'public_shares') THEN
    ALTER TABLE public_shares ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
    ALTER TABLE public_shares ADD COLUMN IF NOT EXISTS scope TEXT DEFAULT 'view';
  END IF;
END $$;

-- ── 11. Visibility on rooms/wings/memories ──
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'private';
ALTER TABLE wings ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'private';
ALTER TABLE memories ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'private';
