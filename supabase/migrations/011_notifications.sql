-- Notifications table for in-app contribution alerts
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'new_contribution',
  message TEXT NOT NULL,
  room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  room_name TEXT,
  wing_id UUID REFERENCES wings(id) ON DELETE SET NULL,
  from_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  from_user_name TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookup by user + recency
CREATE INDEX idx_notifications_user_created ON notifications (user_id, created_at DESC);
CREATE INDEX idx_notifications_user_unread ON notifications (user_id) WHERE read = false;

-- RLS: users can only see their own notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Allow server-side inserts (the contributor creates a notification for the owner)
-- This uses service role or a permissive insert policy
CREATE POLICY "Authenticated users can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Auto-cleanup: delete notifications older than 90 days (optional, can be run as cron)
-- SELECT cron.schedule('cleanup-old-notifications', '0 3 * * 0', $$
--   DELETE FROM notifications WHERE created_at < now() - interval '90 days';
-- $$);
