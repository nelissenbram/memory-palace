-- Deliverability hardening (SUCCESS_PLAYBOOK 1.4): suppression list for
-- hard-bounced and complaining addresses, fed by the Resend webhook at
-- /api/email/resend-webhook and consulted by sendEmail() before every send.
--
-- SAFETY: FILE ONLY — apply manually via the Supabase dashboard / CLI.
-- The app fails open until this table exists (sendEmail skips the check
-- silently), so shipping the code before the migration is harmless.
--
-- Service-role only (the webhook + senders use the service key, which
-- bypasses RLS) — no RLS policy is intentional, matching email_send_log.
-- Emails are stored lowercased; readers must lowercase before lookup.
create table if not exists public.email_suppressions (
  email      text primary key,
  reason     text,               -- 'bounce' | 'complaint'
  created_at timestamptz default now()
);
