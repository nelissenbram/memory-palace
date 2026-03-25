-- ═══ LEGACY DELIVERY: inactivity detection, verification & delivery tracking ═══

-- ── Add verification columns to legacy_settings ──
ALTER TABLE public.legacy_settings
  ADD COLUMN IF NOT EXISTS verification_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_token TEXT;

-- ── Legacy Deliveries table ──
CREATE TABLE IF NOT EXISTS public.legacy_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.legacy_contacts(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.legacy_messages(id) ON DELETE SET NULL,
  access_token TEXT NOT NULL UNIQUE,
  delivered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '90 days'),
  accessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_legacy_deliveries_user ON public.legacy_deliveries(user_id);
CREATE INDEX IF NOT EXISTS idx_legacy_deliveries_token ON public.legacy_deliveries(access_token);
CREATE INDEX IF NOT EXISTS idx_legacy_deliveries_contact ON public.legacy_deliveries(contact_id);

ALTER TABLE public.legacy_deliveries ENABLE ROW LEVEL SECURITY;

-- Service-role only — no user-facing RLS policy needed (cron writes, public token reads)
-- Allow users to view their own deliveries in settings
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users view own legacy deliveries' AND tablename = 'legacy_deliveries'
  ) THEN
    CREATE POLICY "Users view own legacy deliveries" ON public.legacy_deliveries
      FOR SELECT USING (user_id = auth.uid());
  END IF;
END $$;
