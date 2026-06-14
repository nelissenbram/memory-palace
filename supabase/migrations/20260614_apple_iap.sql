-- Add Apple IAP fields to subscriptions table
alter table public.subscriptions
  add column if not exists subscription_source text not null default 'stripe'
    check (subscription_source in ('stripe', 'apple')),
  add column if not exists apple_original_transaction_id text;

-- Index for Apple webhook lookups
create index if not exists idx_subscriptions_apple_tx
  on public.subscriptions(apple_original_transaction_id)
  where apple_original_transaction_id is not null;
