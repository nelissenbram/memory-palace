-- Migration: Create whatsapp_links and kep_exclusions tables

CREATE TABLE IF NOT EXISTS whatsapp_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kep_id uuid NOT NULL REFERENCES keps(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  wa_group_id text NOT NULL,
  wa_group_name text,
  phone_number_id text,
  verified boolean DEFAULT false,
  verified_at timestamptz,
  disclosure_sent boolean DEFAULT false,
  disclosure_sent_at timestamptz,
  last_message_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- One kep per WhatsApp group
CREATE UNIQUE INDEX idx_whatsapp_links_group ON whatsapp_links(wa_group_id);
CREATE INDEX idx_whatsapp_links_kep_id ON whatsapp_links(kep_id);

-- RLS
ALTER TABLE whatsapp_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own whatsapp_links"
  ON whatsapp_links FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own whatsapp_links"
  ON whatsapp_links FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own whatsapp_links"
  ON whatsapp_links FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own whatsapp_links"
  ON whatsapp_links FOR DELETE
  USING (auth.uid() = user_id);

-- Kep exclusions (STOP list)
CREATE TABLE IF NOT EXISTS kep_exclusions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kep_id uuid NOT NULL REFERENCES keps(id) ON DELETE CASCADE,
  phone_number text NOT NULL,
  reason text DEFAULT 'stop_command',
  excluded_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX idx_kep_exclusions_unique ON kep_exclusions(kep_id, phone_number);
CREATE INDEX idx_kep_exclusions_kep_id ON kep_exclusions(kep_id);

ALTER TABLE kep_exclusions ENABLE ROW LEVEL SECURITY;

-- Exclusions are managed by webhook (admin) but viewable by kep owner
CREATE POLICY "Users can view exclusions for own keps"
  ON kep_exclusions FOR SELECT
  USING (EXISTS (SELECT 1 FROM keps WHERE keps.id = kep_exclusions.kep_id AND keps.user_id = auth.uid()));
