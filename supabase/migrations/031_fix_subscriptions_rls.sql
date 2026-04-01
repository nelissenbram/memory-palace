-- Fix critical RLS vulnerability on subscriptions table
-- The "Service role can manage subscriptions" policy used FOR ALL with
-- USING (true) / WITH CHECK (true), which grants every authenticated user
-- full read/write access to ALL subscription rows.
-- The service role already bypasses RLS, so that policy was unnecessary.

-- First ensure the table exists (012 may not have been applied yet)
create table if not exists public.subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null unique,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text not null default 'free' check (plan in ('free', 'keeper', 'guardian')),
  status text not null default 'active' check (status in ('active', 'canceled', 'past_due', 'trialing')),
  current_period_end timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists idx_subscriptions_user_id on public.subscriptions(user_id);
create index if not exists idx_subscriptions_stripe_customer_id on public.subscriptions(stripe_customer_id);

alter table public.subscriptions enable row level security;

-- Drop the dangerous blanket policy (if it exists)
drop policy if exists "Service role can manage subscriptions" on public.subscriptions;

-- Ensure the safe own-row SELECT policy exists
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'subscriptions' and policyname = 'Users can read own subscription'
  ) then
    create policy "Users can read own subscription"
      on public.subscriptions for select
      using (auth.uid() = user_id);
  end if;
end $$;

-- Auto-create free subscription for new users via trigger
create or replace function public.handle_new_user_subscription()
returns trigger as $$
begin
  insert into public.subscriptions (user_id, plan, status)
  values (new.id, 'free', 'active')
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- Create trigger only if not exists
do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'on_profile_created_subscription'
  ) then
    create trigger on_profile_created_subscription
      after insert on public.profiles
      for each row execute procedure public.handle_new_user_subscription();
  end if;
end $$;

-- Backfill existing users with free plan
insert into public.subscriptions (user_id, plan, status)
select id, 'free', 'active' from public.profiles
on conflict (user_id) do nothing;
