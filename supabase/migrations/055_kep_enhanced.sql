-- 055: Kep Enhanced PoC — virtual rooms, invite codes, stop mechanism

-- Virtual room metadata on rooms
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS is_virtual boolean DEFAULT false;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS virtual_title text;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS source_kep_id uuid REFERENCES keps(id) ON DELETE SET NULL;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS allocated_at timestamptz;

-- Extend whatsapp_links for room targeting + stop
ALTER TABLE whatsapp_links ADD COLUMN IF NOT EXISTS target_room_id uuid REFERENCES rooms(id) ON DELETE SET NULL;
ALTER TABLE whatsapp_links ADD COLUMN IF NOT EXISTS palace_room_created boolean DEFAULT false;
ALTER TABLE whatsapp_links ADD COLUMN IF NOT EXISTS invite_code text UNIQUE;
ALTER TABLE whatsapp_links ADD COLUMN IF NOT EXISTS stopped boolean DEFAULT false;
ALTER TABLE whatsapp_links ADD COLUMN IF NOT EXISTS stopped_by text;
ALTER TABLE whatsapp_links ADD COLUMN IF NOT EXISTS stopped_at timestamptz;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rooms_virtual ON rooms(is_virtual) WHERE is_virtual = true;
CREATE INDEX IF NOT EXISTS idx_rooms_source_kep ON rooms(source_kep_id) WHERE source_kep_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_whatsapp_links_invite ON whatsapp_links(invite_code) WHERE invite_code IS NOT NULL;
