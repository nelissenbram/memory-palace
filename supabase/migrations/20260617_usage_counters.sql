-- Lightweight daily usage counters (persists across deploys)
create table if not exists usage_counters (
  user_id uuid not null references auth.users(id) on delete cascade,
  counter_key text not null,        -- e.g. 'ai_tag'
  counter_date date not null default current_date,
  counter_value int not null default 0,
  primary key (user_id, counter_key, counter_date)
);

-- RLS
alter table usage_counters enable row level security;

create policy "Users can read own counters"
  on usage_counters for select
  using (auth.uid() = user_id);

create policy "Users can insert own counters"
  on usage_counters for insert
  with check (auth.uid() = user_id);

create policy "Users can update own counters"
  on usage_counters for update
  using (auth.uid() = user_id);

-- Index for fast lookups
create index if not exists idx_usage_counters_lookup
  on usage_counters (user_id, counter_key, counter_date);

-- Auto-cleanup: remove rows older than 7 days (optional cron or manual)
-- For now we rely on the primary key keeping things small.
