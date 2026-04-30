-- Migration: Create keps table
-- Keps are named conduits (WhatsApp groups, Google Photos filters) that auto-feed memories into Rooms.

CREATE TABLE IF NOT EXISTS keps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  icon text DEFAULT '📥',
  source_type text NOT NULL CHECK (source_type IN ('whatsapp', 'photos')),
  source_config jsonb DEFAULT '{}',
  default_wing_id uuid REFERENCES wings(id) ON DELETE SET NULL,
  default_room_id uuid REFERENCES rooms(id) ON DELETE SET NULL,
  routing_rules jsonb DEFAULT '[]',
  auto_route_enabled boolean DEFAULT true,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'closed')),
  starts_at timestamptz,
  ends_at timestamptz,
  end_condition text,
  memories_captured integer DEFAULT 0,
  last_capture_at timestamptz,
  is_private boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_keps_user_id ON keps(user_id);
CREATE INDEX idx_keps_status ON keps(status);
CREATE INDEX idx_keps_source_type ON keps(source_type);

-- RLS
ALTER TABLE keps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own keps"
  ON keps FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own keps"
  ON keps FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own keps"
  ON keps FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own keps"
  ON keps FOR DELETE
  USING (auth.uid() = user_id);

-- updated_at trigger function (idempotent)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER keps_updated_at
  BEFORE UPDATE ON keps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
