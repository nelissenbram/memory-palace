-- ═══ CRON EXECUTION LOG ═══
-- Tracks scheduled job runs (email digests, cleanup, etc.)
-- Accessed by service role only — no user-facing RLS policies.

CREATE TABLE IF NOT EXISTS public.cron_execution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'timed_out')),
  users_processed INTEGER DEFAULT 0,
  emails_sent INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,
  error_details JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cron_log_job_started ON public.cron_execution_log(job_name, started_at DESC);

ALTER TABLE public.cron_execution_log ENABLE ROW LEVEL SECURITY;
-- No user-facing policies needed — service role only

NOTIFY pgrst, 'reload schema';
