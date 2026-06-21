-- ============================================================
-- UGC Safety (Apple Guideline 1.2): content reports + user blocks
-- ============================================================

-- ── 1. Content reports ──
-- A user flags objectionable content or an abusive user. Reviewed by
-- moderators (service role) who can remove content / eject the offender.
CREATE TABLE IF NOT EXISTS content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Nullable: reports from public/unauthenticated viewers (e.g. public gallery,
  -- shared family tree) are filed server-side via the service role.
  reporter_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  -- What is being reported: 'user' | 'comment' | 'wing' | 'room' | 'memory' | 'palace'
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  -- The owner of the reported content (so moderators can act on the account)
  target_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  details TEXT,
  -- 'pending' | 'reviewed' | 'actioned' | 'dismissed'
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_content_reports_status ON content_reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_reports_target ON content_reports (target_type, target_id);
-- One pending report per reporter+target (avoid spam / duplicate reports)
CREATE UNIQUE INDEX IF NOT EXISTS idx_content_reports_dedupe
  ON content_reports (reporter_id, target_type, target_id)
  WHERE status = 'pending';

ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own reports" ON content_reports
  FOR SELECT USING (auth.uid() = reporter_id);
CREATE POLICY "Authenticated users can file reports" ON content_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Service role manages reports" ON content_reports
  FOR ALL USING (auth.role() = 'service_role');

-- ── 2. Blocked users ──
-- A user blocks another user; blocked users' content is filtered out of
-- feeds, the directory, comments and palace visits.
CREATE TABLE IF NOT EXISTS blocked_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT blocked_users_unique UNIQUE (blocker_id, blocked_id),
  CONSTRAINT blocked_users_no_self CHECK (blocker_id <> blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker ON blocked_users (blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked ON blocked_users (blocked_id);

ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own block list" ON blocked_users
  FOR SELECT USING (auth.uid() = blocker_id);
CREATE POLICY "Users can block others" ON blocked_users
  FOR INSERT WITH CHECK (auth.uid() = blocker_id);
CREATE POLICY "Users can unblock" ON blocked_users
  FOR DELETE USING (auth.uid() = blocker_id);
