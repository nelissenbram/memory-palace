-- ═══ Add 'delivering' status for idempotency lock ═══
-- Prevents duplicate deliveries from overlapping cron runs.

ALTER TABLE public.legacy_settings DROP CONSTRAINT IF EXISTS legacy_settings_status_check;
ALTER TABLE public.legacy_settings
  ADD CONSTRAINT legacy_settings_status_check
  CHECK (status IN ('active','triggered','delivering','transferred','partially_delivered'));
