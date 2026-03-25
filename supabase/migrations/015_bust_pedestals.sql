-- Add bust_pedestals JSONB column for per-pedestal bust configuration
-- Each key is a pedestal index (0-9), value is {faceUrl, name, gender}
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bust_pedestals jsonb DEFAULT '{}';
