-- 056: Kep group chat support — make wa_group_id nullable, add lookup indexes

-- Make wa_group_id nullable (currently NOT NULL — blocks 1:1 chats)
ALTER TABLE whatsapp_links ALTER COLUMN wa_group_id DROP NOT NULL;

-- Drop existing unique index, recreate as partial (only for non-null group IDs)
DROP INDEX IF EXISTS idx_whatsapp_links_group;
CREATE UNIQUE INDEX idx_whatsapp_links_group ON whatsapp_links(wa_group_id) WHERE wa_group_id IS NOT NULL;

-- Index for 1:1 lookup path
CREATE INDEX IF NOT EXISTS idx_whatsapp_links_phone ON whatsapp_links(phone_number_id) WHERE wa_group_id IS NULL;

-- Allow webhook service role to insert/update whatsapp_links (for auto-create flow)
CREATE POLICY "Service role can manage whatsapp_links"
  ON whatsapp_links FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Allow webhook service role to insert keps (for auto-create flow)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Service role can manage keps' AND tablename = 'keps'
  ) THEN
    CREATE POLICY "Service role can manage keps"
      ON keps FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;
