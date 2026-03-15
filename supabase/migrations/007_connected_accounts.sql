-- Connected accounts for cloud storage / photo service integrations
CREATE TABLE connected_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'google_photos', 'dropbox', 'onedrive', 'box'
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  provider_user_id TEXT,
  provider_email TEXT,
  metadata JSONB DEFAULT '{}',
  connected_at TIMESTAMPTZ DEFAULT now(),
  last_sync_at TIMESTAMPTZ,
  UNIQUE(user_id, provider)
);

-- RLS: users can only see/manage their own connections
ALTER TABLE connected_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own connections" ON connected_accounts
  FOR ALL USING (user_id = auth.uid());

-- Index for fast lookups
CREATE INDEX idx_connected_accounts_user ON connected_accounts(user_id);
