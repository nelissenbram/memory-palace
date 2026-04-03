-- Add location columns to memories table for Memory Map feature
alter table public.memories add column if not exists location_name text;
alter table public.memories add column if not exists lat double precision;
alter table public.memories add column if not exists lng double precision;

-- Index for quickly finding memories that have location data (used by Memory Map)
create index if not exists idx_memories_location on public.memories(user_id)
  where lat is not null and lng is not null;
