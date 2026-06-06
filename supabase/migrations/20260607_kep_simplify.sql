-- Kep Simplification: Remove group/virtual room concepts, add active_room_id
-- This migration supports the 1:1-only Kep model.

-- Add active_room_id (replaces target_room_id)
ALTER TABLE whatsapp_links ADD COLUMN IF NOT EXISTS active_room_id uuid REFERENCES rooms(id) ON DELETE SET NULL;
UPDATE whatsapp_links SET active_room_id = target_room_id WHERE target_room_id IS NOT NULL;

-- Drop RLS policies that depend on invite_code / target_room_id
DROP POLICY IF EXISTS "Authenticated users can lookup link by invite code" ON whatsapp_links;
DROP POLICY IF EXISTS "Authenticated users can view keps via invite link" ON keps;
DROP POLICY IF EXISTS "Authenticated users can update target_room on invite links" ON whatsapp_links;

-- Drop group/virtual columns from whatsapp_links
ALTER TABLE whatsapp_links
  DROP COLUMN IF EXISTS wa_group_id,
  DROP COLUMN IF EXISTS wa_group_name,
  DROP COLUMN IF EXISTS invite_code,
  DROP COLUMN IF EXISTS palace_room_created,
  DROP COLUMN IF EXISTS disclosure_sent,
  DROP COLUMN IF EXISTS disclosure_sent_at,
  DROP COLUMN IF EXISTS stopped_by,
  DROP COLUMN IF EXISTS target_room_id;

-- Drop virtual room columns from rooms
ALTER TABLE rooms
  DROP COLUMN IF EXISTS is_virtual,
  DROP COLUMN IF EXISTS virtual_title,
  DROP COLUMN IF EXISTS expires_at,
  DROP COLUMN IF EXISTS grounded_at;

-- Drop kep_exclusions table
DROP TABLE IF EXISTS kep_exclusions;

-- Drop obsolete indexes
DROP INDEX IF EXISTS idx_whatsapp_links_group;
DROP INDEX IF EXISTS idx_rooms_virtual;
DROP INDEX IF EXISTS idx_whatsapp_links_invite;

-- New indexes
CREATE INDEX IF NOT EXISTS idx_whatsapp_links_active_room ON whatsapp_links(active_room_id) WHERE active_room_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_links_dm_unique ON whatsapp_links(phone_number_id, wa_sender_phone);
