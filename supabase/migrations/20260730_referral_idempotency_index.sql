-- Hardens idempotency at the DB layer for the referred_by atomic gate. Ensures a given user can only ever be counted as referred once (defense-in-depth alongside the conditional UPDATE ... IS NULL gate in route.ts). The partial unique index on referred_by is NOT correct here (many users can share the same referrer code); instead we rely on the atomic gate plus the existing single-row-per-user profile PK. This migration only documents that no schema change is strictly required for the gate — but if the referral_rewards column does not yet exist, add it.

-- Ensure referral columns exist (no-op if already present). The atomic gate in
-- route.ts uses referred_by; GET/POST use referral_count and referral_rewards.
alter table public.profiles add column if not exists referred_by text;
alter table public.profiles add column if not exists referral_count integer not null default 0;
alter table public.profiles add column if not exists referral_rewards jsonb not null default '[]'::jsonb;
