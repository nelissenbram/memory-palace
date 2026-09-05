-- Idempotent welcome-email marker.
--
-- The welcome email was gated on `!profile.onboarded`, which re-sent on every
-- login where onboarding wasn't complete (and on a profile READ failure, since
-- `!undefined` is true). Decouple it onto a dedicated timestamp so each account
-- gets exactly one welcome email, independent of onboarding-completion timing.
alter table public.profiles
  add column if not exists welcome_email_sent_at timestamptz;
