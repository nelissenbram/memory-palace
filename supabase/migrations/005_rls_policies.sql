-- ═══ ROW LEVEL SECURITY ═══

alter table public.profiles enable row level security;
alter table public.wings enable row level security;
alter table public.rooms enable row level security;
alter table public.memories enable row level security;
alter table public.room_shares enable row level security;

-- Users see only their own data
create policy "own_profile" on public.profiles
  for all using (id = auth.uid());

create policy "own_wings" on public.wings
  for all using (user_id = auth.uid());

create policy "own_rooms" on public.rooms
  for all using (user_id = auth.uid());

create policy "own_memories" on public.memories
  for all using (user_id = auth.uid());

-- Room shares: owners manage their shares
create policy "own_shares" on public.room_shares
  for all using (owner_id = auth.uid());

-- Shared rooms: viewers can read rooms + memories shared with them
create policy "shared_rooms_read" on public.rooms
  for select using (
    id in (
      select room_id from public.room_shares
      where shared_with_id = auth.uid() and accepted = true
    )
  );

create policy "shared_memories_read" on public.memories
  for select using (
    room_id in (
      select room_id from public.room_shares
      where shared_with_id = auth.uid() and accepted = true
    )
  );

-- Contributors can insert memories into shared rooms
create policy "shared_memories_contribute" on public.memories
  for insert with check (
    room_id in (
      select room_id from public.room_shares
      where shared_with_id = auth.uid()
        and accepted = true
        and permission in ('contribute', 'admin')
    )
  );

-- Invitees can view and accept their own share invitations
create policy "invitee_can_view_shares" on public.room_shares
  for select using (
    shared_with_email = (auth.jwt() ->> 'email')
    or shared_with_id = auth.uid()
  );

create policy "invitee_can_accept_share" on public.room_shares
  for update using (
    shared_with_email = (auth.jwt() ->> 'email')
  ) with check (
    shared_with_email = (auth.jwt() ->> 'email')
  );

-- ═══ STORAGE ═══

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'memories',
  'memories',
  false,
  5368709120, -- 5 GB per architecture doc
  array[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/webm', 'video/quicktime',
    'audio/mpeg', 'audio/wav', 'audio/ogg',
    'application/pdf'
  ]
);

-- Storage policies: users can manage files in their own folder (user_id/*)
create policy "Users can upload their own media"
  on storage.objects for insert
  with check (
    bucket_id = 'memories'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can view their own media"
  on storage.objects for select
  using (
    bucket_id = 'memories'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their own media"
  on storage.objects for delete
  using (
    bucket_id = 'memories'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Shared access: users can view media in rooms shared with them
create policy "Users can view media in shared rooms"
  on storage.objects for select
  using (
    bucket_id = 'memories'
    and exists (
      select 1 from public.memories m
      join public.room_shares rs on rs.room_id = m.room_id
      where m.file_path = name
        and rs.shared_with_id = auth.uid()
        and rs.accepted = true
    )
  );
