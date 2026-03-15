-- ═══ PUBLIC SHARES ═══
-- Allows rooms/wings to be shared publicly via a unique slug URL.
-- No authentication required to view — read-only access.

create table public.public_shares (
  id          uuid primary key default gen_random_uuid(),
  room_id     uuid references public.rooms(id) on delete cascade,
  wing_id     uuid references public.wings(id) on delete set null,
  slug        text unique not null,
  created_by  uuid references public.profiles(id) on delete cascade,
  is_active   boolean default true,
  created_at  timestamptz default now()
);

create unique index idx_public_shares_slug on public.public_shares(slug);
create index idx_public_shares_room on public.public_shares(room_id);
create index idx_public_shares_creator on public.public_shares(created_by);

-- RLS: owners can manage their own public shares
alter table public.public_shares enable row level security;

-- Owners can do everything with their own shares
create policy "Owners can manage their public shares"
  on public.public_shares
  for all
  using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

-- Anyone can read active public shares (for the public view page)
create policy "Anyone can read active public shares"
  on public.public_shares
  for select
  using (is_active = true);
