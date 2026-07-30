-- Exact per-user storage total (misc-routes security fix):
-- Summing memories.file_size in JS after an unpaginated PostgREST select caps
-- at max-rows (default 1000), so users with >1000 memories get an UNDER-reported
-- total — which the quota enforcement path (checkLimit/getEffectiveStorageLimit)
-- also used, letting heavy users write past their real storage limit.
--
-- This SQL aggregate returns the exact sum regardless of row count and transfers
-- a single number instead of every row. The app (src/lib/auth/plan-limits.ts and
-- src/app/api/storage/limit/route.ts via getUserStorageBytes) calls it with
-- supabase.rpc() and falls back to a bounded, paginated scan until it is applied.

create or replace function public.user_storage_bytes(p_user_id uuid)
returns bigint
language sql
stable
as $$
  select coalesce(sum(m.file_size), 0)::bigint
  from public.memories m
  where m.user_id = p_user_id;
$$;

-- Supporting index for the per-user aggregate.
create index if not exists idx_memories_user_id_file_size
  on public.memories (user_id) include (file_size);
