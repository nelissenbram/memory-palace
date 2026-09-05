-- The unsubscribe route + the lifecycle-email eligibility gates read/write
-- profiles.email_digest (kill-all opt-out; null/true = subscribed). The column
-- was referenced in code but never created here — add it. Without it, every
-- default-scope unsubscribe throws and the weekly/win-back crons error.
alter table public.profiles
  add column if not exists email_digest boolean default true;
