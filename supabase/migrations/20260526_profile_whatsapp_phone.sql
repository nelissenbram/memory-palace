-- Add WhatsApp phone number to profiles for Kep phone-to-account linking
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS whatsapp_phone text;

-- Index for fast lookup by phone number (used by Kep webhook)
CREATE INDEX IF NOT EXISTS idx_profiles_whatsapp_phone
  ON profiles (whatsapp_phone)
  WHERE whatsapp_phone IS NOT NULL;

-- Ensure uniqueness — one phone per account
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_whatsapp_phone_unique
  ON profiles (whatsapp_phone)
  WHERE whatsapp_phone IS NOT NULL;
