-- ═══ MEMORIES ═══
create table public.memories (
  id              uuid primary key default gen_random_uuid(),
  room_id         uuid references public.rooms(id) on delete cascade,
  user_id         uuid references public.profiles(id) on delete cascade,
  title           text not null,
  description     text,
  type            text not null,      -- photo | video | album | orb | journal | case
  file_path       text,               -- Supabase Storage path
  file_url        text,               -- Public or signed URL
  thumbnail_url   text,
  metadata        jsonb default '{}', -- EXIF, duration, dimensions
  hue             int default 30,
  saturation      int default 45,
  lightness       int default 60,
  sort_order      int default 0,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index idx_memories_room on public.memories(room_id);
create index idx_memories_user on public.memories(user_id);

-- Auto-update updated_at on row changes
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_memories_updated_at
  before update on public.memories
  for each row execute function public.set_updated_at();
