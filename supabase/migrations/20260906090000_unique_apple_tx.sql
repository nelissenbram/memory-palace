-- OPS-013: make the Apple original-transaction-id index UNIQUE.
--
-- Why: the Apple webhook looks a subscription up by apple_original_transaction_id
-- with .maybeSingle(). With the old NON-unique partial index (20260614_apple_iap.sql)
-- one Apple transaction could end up attached to two users (Family Sharing /
-- account re-binding edge cases), which makes .maybeSingle() fail with PGRST116
-- or lets the wrong user's entitlement be updated (cross-user entitlement leak).
-- A unique partial index makes that state unrepresentable at the DB level.
--
-- NOTE — this migration FAILS ON PURPOSE if duplicates already exist.
-- That is the desired behavior: duplicates mean two users share one Apple
-- transaction and need a manual owner decision (which row is the rightful
-- holder). Do NOT auto-delete rows here.
--
-- Owner: run this first to find any duplicates that would block the migration:
--
--   select apple_original_transaction_id, count(*) as rows,
--          array_agg(user_id) as user_ids
--   from public.subscriptions
--   where apple_original_transaction_id is not null
--   group by apple_original_transaction_id
--   having count(*) > 1;
--
-- If it returns rows, resolve them manually (keep the rightful owner's row,
-- null out or remove the stale one), then re-run this migration.

-- Drop the old non-unique index and recreate it as UNIQUE with the same
-- partial WHERE clause (same name, so webhook query plans keep working).
drop index if exists public.idx_subscriptions_apple_tx;

create unique index if not exists idx_subscriptions_apple_tx
  on public.subscriptions(apple_original_transaction_id)
  where apple_original_transaction_id is not null;
