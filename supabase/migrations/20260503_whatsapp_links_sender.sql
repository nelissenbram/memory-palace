-- Add sender phone column for 1:1 DM conversation uniqueness
ALTER TABLE whatsapp_links ADD COLUMN IF NOT EXISTS wa_sender_phone text;

-- Index for 1:1 lookups
CREATE INDEX IF NOT EXISTS idx_whatsapp_links_dm_sender
  ON whatsapp_links(phone_number_id, wa_sender_phone)
  WHERE wa_group_id IS NULL;
