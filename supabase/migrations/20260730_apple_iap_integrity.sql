-- Apple IAP data-integrity hardening (security cluster: apple-iap)
--
-- 1) Enforce one Apple original_transaction_id per account at the DB level so a
--    leaked/family-shared receipt cannot entitle two accounts (IDOR / entitlement
--    theft). The app also guards this in verify-receipt, but the DB is the backstop.
--
--    NOTE: if duplicate rows already exist in production this CREATE will fail.
--    De-duplicate first (keep the earliest-created row per transaction), e.g.:
--      delete from public.subscriptions s using public.subscriptions d
--      where s.apple_original_transaction_id = d.apple_original_transaction_id
--        and s.apple_original_transaction_id is not null
--        and s.ctid > d.ctid;
create unique index if not exists uniq_subscriptions_apple_tx
  on public.subscriptions(apple_original_transaction_id)
  where apple_original_transaction_id is not null;

-- 2) Durable store for verified Apple S2S notifications whose transaction is not
--    yet linked to a user (verify-receipt hasn't run / link row lost). Lets the
--    webhook record REVOKE/REFUND/EXPIRED so a churned user cannot keep a paid
--    entitlement, and verify-receipt replays it when it links the user.
create table if not exists public.apple_pending_notifications (
  apple_original_transaction_id text primary key,
  product_id text,
  plan text,
  terminated boolean not null default false,
  notification_type text,
  notification_subtype text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Service-role only: written by the Apple webhook, read by verify-receipt, both
-- of which use the service-role key. Enable RLS with no policies so no end user
-- (anon/authenticated) can read or write it.
alter table public.apple_pending_notifications enable row level security;
