CREATE TABLE IF NOT EXISTS family_tree_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  share_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE family_tree_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own shares" ON family_tree_shares
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
-- Public read for active shares (used by the public route)
CREATE POLICY "Anyone can read active shares" ON family_tree_shares
  FOR SELECT USING (is_active = true);
