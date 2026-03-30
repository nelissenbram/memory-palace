-- ═══ LEGACY SECURITY: verifier tokens, expiry, indexes & partial delivery ═══

-- ── Add verifier confirmation columns to legacy_settings ──
ALTER TABLE public.legacy_settings
  ADD COLUMN IF NOT EXISTS verifier_confirmation_token TEXT,
  ADD COLUMN IF NOT EXISTS verifier_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_expires_at TIMESTAMPTZ;

-- ── Update status CHECK to include 'partially_delivered' ──
-- Drop old constraint and recreate with new value
ALTER TABLE public.legacy_settings DROP CONSTRAINT IF EXISTS legacy_settings_status_check;
ALTER TABLE public.legacy_settings
  ADD CONSTRAINT legacy_settings_status_check
  CHECK (status IN ('active','triggered','transferred','partially_delivered'));

-- ── UNIQUE index on legacy_deliveries to prevent duplicates ──
-- Use a unique index with COALESCE because a plain UNIQUE constraint treats
-- NULLs as distinct, so (user_id, contact_id, NULL) could appear multiple
-- times. With COALESCE we map NULL message_id to the nil UUID.
DROP INDEX IF EXISTS idx_legacy_deliveries_user_contact_message_unique;
CREATE UNIQUE INDEX idx_legacy_deliveries_user_contact_message_unique
  ON public.legacy_deliveries(user_id, contact_id, COALESCE(message_id, '00000000-0000-0000-0000-000000000000'));

-- ── Indexes for common query patterns ──
CREATE INDEX IF NOT EXISTS idx_legacy_deliveries_message
  ON public.legacy_deliveries(message_id);

CREATE INDEX IF NOT EXISTS idx_legacy_contacts_active_user
  ON public.legacy_contacts(is_active, user_id);

CREATE INDEX IF NOT EXISTS idx_legacy_messages_delivery_schedule
  ON public.legacy_messages(deliver_on, deliver_date);
