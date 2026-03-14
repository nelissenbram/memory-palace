-- ═══ SHARING ═══
create table public.room_shares (
  id                  uuid primary key default gen_random_uuid(),
  room_id             uuid references public.rooms(id) on delete cascade,
  owner_id            uuid references public.profiles(id) on delete cascade,
  shared_with_email   text not null,
  shared_with_id      uuid references public.profiles(id), -- null until they accept
  permission          text default 'view',  -- view | contribute | admin
  accepted            boolean default false,
  created_at          timestamptz default now()
);

create index idx_room_shares_room on public.room_shares(room_id);
create index idx_room_shares_email on public.room_shares(shared_with_email);
create index idx_room_shares_shared_user on public.room_shares(shared_with_id);
