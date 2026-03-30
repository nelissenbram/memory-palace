-- ═══ JOB QUEUE ═══
-- Lightweight PostgreSQL-backed job queue for async work (legacy delivery,
-- digest emails, export zips, notifications, etc.).
-- Polled by a Vercel cron endpoint; accessed by service role only.

CREATE TABLE IF NOT EXISTS public.job_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'dead')),
  priority INTEGER NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Primary polling index: find pending jobs ready to run, highest priority first
CREATE INDEX IF NOT EXISTS idx_job_queue_poll
  ON public.job_queue (status, scheduled_for, priority DESC);

-- Type-specific lookups (e.g. "show me all failed legacy_delivery jobs")
CREATE INDEX IF NOT EXISTS idx_job_queue_type_status
  ON public.job_queue (type, status);

ALTER TABLE public.job_queue ENABLE ROW LEVEL SECURITY;
-- No user-facing policies — service role only (same as cron_execution_log)

-- ── Atomic dequeue RPC ──────────────────────────────────────
-- Claims up to `batch_size` pending jobs using FOR UPDATE SKIP LOCKED,
-- preventing concurrent workers from claiming the same job.
CREATE OR REPLACE FUNCTION public.dequeue_jobs(
  job_type TEXT DEFAULT NULL,
  batch_size INTEGER DEFAULT 10
)
RETURNS SETOF public.job_queue
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT id
    FROM public.job_queue
    WHERE status = 'pending'
      AND scheduled_for <= now()
      AND (job_type IS NULL OR type = job_type)
    ORDER BY priority DESC, created_at ASC
    LIMIT batch_size
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.job_queue q
  SET
    status = 'processing',
    started_at = now(),
    attempts = attempts + 1
  FROM candidates c
  WHERE q.id = c.id
  RETURNING q.*;
END;
$$;

NOTIFY pgrst, 'reload schema';
