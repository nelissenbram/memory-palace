-- Add expiry tracking to virtual rooms
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS expires_at timestamptz;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS grounded_at timestamptz;

-- Index for expiry queries
CREATE INDEX IF NOT EXISTS idx_rooms_expires ON rooms(expires_at) WHERE is_virtual = true AND expires_at IS NOT NULL;
