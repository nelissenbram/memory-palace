-- ═══ WINGS ═══
-- Wings are fixed (5 per palace) but user can customize names/colors
create table public.wings (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references public.profiles(id) on delete cascade,
  slug          text not null,        -- family | travel | childhood | career | creativity
  custom_name   text,                 -- user can rename
  accent_color  text,
  sort_order    int default 0,
  created_at    timestamptz default now(),

  unique (user_id, slug)
);

create index idx_wings_user on public.wings(user_id);

-- ═══ ROOMS ═══
create table public.rooms (
  id            uuid primary key default gen_random_uuid(),
  wing_id       uuid references public.wings(id) on delete cascade,
  user_id       uuid references public.profiles(id) on delete cascade,
  name          text not null,
  icon          text default '📁',
  cover_hue     int default 30,
  sort_order    int default 0,
  is_shared     boolean default false,
  created_at    timestamptz default now()
);

create index idx_rooms_wing on public.rooms(wing_id);
create index idx_rooms_user on public.rooms(user_id);
