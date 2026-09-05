-- Explore data layer (EXPLORE_ME_REVISION_SPEC change 8):
-- SQL-aggregate trending + per-owner 7-day visit counts, replacing the
-- 2000-row palace_visits scan + JS Map count per request.
--
-- The app code in src/lib/social/directory-actions.ts calls these via
-- supabase.rpc() and gracefully falls back to the bounded scan when the
-- functions do not exist yet, so this migration can ship independently.

-- Top visited palace owners in the last `days_back` days.
create or replace function public.explore_trending_owners(
  days_back int default 7,
  max_rows int default 12
)
returns table(owner_id uuid, visit_count bigint)
language sql
stable
as $$
  select pv.owner_id, count(*) as visit_count
  from public.palace_visits pv
  where pv.visited_at > now() - make_interval(days => days_back)
  group by pv.owner_id
  order by count(*) desc
  limit max_rows;
$$;

-- Recent visit counts for a bounded set of owners (uniform card stats).
create or replace function public.explore_visit_counts(
  owner_ids uuid[],
  days_back int default 7
)
returns table(owner_id uuid, visit_count bigint)
language sql
stable
as $$
  select pv.owner_id, count(*) as visit_count
  from public.palace_visits pv
  where pv.owner_id = any(owner_ids)
    and pv.visited_at > now() - make_interval(days => days_back)
  group by pv.owner_id;
$$;

-- Supporting index so the 7-day aggregate stays fast as visits grow.
create index if not exists idx_palace_visits_visited_at_owner
  on public.palace_visits (visited_at desc, owner_id);
