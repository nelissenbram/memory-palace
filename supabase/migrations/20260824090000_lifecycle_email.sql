-- Lifecycle-email redesign: preference columns, win-back idempotency marker,
-- and a send-ledger for the "≤1 lifecycle email per user per rolling window" cap.
--
-- SAFETY: everything the app writes here stays inert until the env flag
-- LIFECYCLE_EMAILS_ENABLED=true is set (see src/lib/email/lifecycle-flag.ts).
-- This migration is intentionally NOT applied by the redesign task — file only.
--
-- Columns:
--   monthly_highlights   — per-user opt-out for the monthly report (scoped
--                          unsubscribe flips only this; read by the settings UI).
--   family_updates_email — forward-declared preference for a future family-updates
--                          email type. No consumer yet; kept for the settings UI to
--                          bind a toggle without a second migration. Safe to drop if
--                          YAGNI wins.
--   winback_sent_at      — idempotency marker for the single 30-day win-back
--                          ("then stop"); cleared on return by heartbeat-action.ts.
alter table public.profiles
  add column if not exists monthly_highlights   boolean default true,
  add column if not exists family_updates_email boolean default true,
  add column if not exists winback_sent_at      timestamptz;

-- Append-only ledger of lifecycle emails actually sent. Read over a rolling
-- window by fetchRecentlyEmailed(); written by logLifecycleSend() on success.
-- Service-role only (crons use the service key, which bypasses RLS) — no RLS
-- policy is intentional. No user_id FK is declared to avoid coupling ledger
-- writes to auth.users lifecycle; the ledger is disposable de-dupe state.
create table if not exists public.email_send_log (
  user_id    uuid        not null,
  email_type text        not null,   -- 'weekly' | 'monthly' | 'winback'
  sent_at    timestamptz not null default now()
);

create index if not exists idx_email_send_log_user
  on public.email_send_log (user_id, sent_at desc);
