-- ═══ INVITE FLOW ENHANCEMENTS ═══

-- Add status and tracking columns to room_shares
ALTER TABLE room_shares ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending'; -- pending, accepted, declined, expired
ALTER TABLE room_shares ADD COLUMN IF NOT EXISTS invite_message TEXT; -- personal message from inviter
ALTER TABLE room_shares ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;
ALTER TABLE room_shares ADD COLUMN IF NOT EXISTS declined_at TIMESTAMPTZ;
ALTER TABLE room_shares ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT false;
ALTER TABLE room_shares ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ;
ALTER TABLE room_shares ADD COLUMN IF NOT EXISTS last_reminded_at TIMESTAMPTZ;

-- Index for quick lookup by email + status (for post-registration matching)
CREATE INDEX IF NOT EXISTS idx_room_shares_email_status ON room_shares(shared_with_email, status);

-- Allow unauthenticated users to read basic share info for the invite landing page.
-- The server action limits which columns are returned.
CREATE POLICY "Anyone can view basic share info for invite page" ON room_shares
  FOR SELECT USING (true);

-- Allow reading the inviter's profile name/avatar for the invite page
CREATE POLICY "Public can read display names" ON profiles
  FOR SELECT USING (true);
