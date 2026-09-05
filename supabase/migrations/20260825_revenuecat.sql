-- RevenueCat foundation (additive, safe). Lets the RevenueCat webhook write a
-- normalised entitlement row into the EXISTING subscriptions table without losing
-- store context. getUserPlan() is unchanged — it keeps reading plan/status/
-- current_period_end; RC simply becomes another writer of those columns.
--
-- Apply this BEFORE enabling RC_WEBHOOK_ENABLED. Additive columns + a widened
-- check constraint only; no data rewrite.

alter table public.subscriptions
  add column if not exists rc_app_user_id text,          -- = Supabase auth uid
  add column if not exists store text,                   -- app_store | play_store | stripe | promotional
  add column if not exists rc_entitlement text,          -- keeper | guardian
  add column if not exists rc_product_id text,
  add column if not exists rc_period_type text,          -- trial | intro | normal
  add column if not exists will_renew boolean;

-- widen the source enum so RC-managed rows are distinguishable during migration
alter table public.subscriptions
  drop constraint if exists subscriptions_subscription_source_check;
alter table public.subscriptions
  add constraint subscriptions_subscription_source_check
  check (subscription_source in ('stripe', 'apple', 'revenuecat'));

-- optional store sanity (nullable; only checked when present)
alter table public.subscriptions
  drop constraint if exists subscriptions_store_check;
alter table public.subscriptions
  add constraint subscriptions_store_check
  check (store is null or store in ('app_store', 'play_store', 'stripe', 'promotional'));

create index if not exists idx_subscriptions_rc_user
  on public.subscriptions(rc_app_user_id) where rc_app_user_id is not null;
