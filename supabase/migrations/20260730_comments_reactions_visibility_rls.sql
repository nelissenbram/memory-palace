-- The finding notes RLS is currently 'Anyone can read comments/reactions' USING(true), so anyone who guesses a private room/wing/memory UUID can enumerate comment bodies (personal/family PII) and reactor identities directly against the DB. The app-level canViewTarget guard now blocks this via the server actions, but the RLS policy should also be tightened so the DB is safe independent of app code. Verify the exact existing policy names before dropping (adjust the DROP names if they differ), and confirm target_id is a uuid column.

-- Defense-in-depth: replace the blanket USING(true) read policies on comments
-- and reactions with visibility-scoped policies. The authoritative check is now
-- the server-side canViewTarget() guard; this RLS makes the DB safe even if a
-- path is ever missed. A SECURITY DEFINER helper resolves per-target visibility.

create or replace function public.can_view_target(
  p_target_type text,
  p_target_id   uuid,
  p_viewer      uuid
) returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_owner   uuid;
  v_pub     timestamptz;
  v_vis     text;
  v_room    uuid;
begin
  if p_target_type in ('palace','user') then
    return exists (select 1 from profiles pr where pr.id = p_target_id and (pr.is_public or pr.id = p_viewer));
  elsif p_target_type = 'room' then
    select r.user_id, r.published_at, r.publish_visibility, r.id
      into v_owner, v_pub, v_vis, v_room from rooms r where r.id = p_target_id;
  elsif p_target_type = 'wing' then
    select w.user_id, w.published_at, w.publish_visibility, null::uuid
      into v_owner, v_pub, v_vis, v_room from wings w where w.id = p_target_id;
  elsif p_target_type = 'memory' then
    select r.user_id, r.published_at, r.publish_visibility, r.id
      into v_owner, v_pub, v_vis, v_room
      from memories m join rooms r on r.id = m.room_id where m.id = p_target_id;
  else
    return false;
  end if;

  if v_owner is null then return false; end if;
  if p_viewer is not null and p_viewer = v_owner then return true; end if;

  if v_pub is not null then
    if coalesce(v_vis,'public') = 'public' then return true; end if;
    if v_vis = 'followers' and p_viewer is not null
       and exists (select 1 from follows f where f.follower_id = p_viewer and f.following_id = v_owner)
    then return true; end if;
  end if;

  if p_viewer is not null and v_room is not null
     and exists (select 1 from room_collaborators c
                 where c.room_id = v_room and c.user_id = p_viewer and c.accepted_at is not null)
  then return true; end if;

  return false;
end;
$$;

drop policy if exists "Anyone can read comments" on public.comments;
create policy "Read comments on visible targets" on public.comments
  for select using (public.can_view_target(target_type, target_id, auth.uid()));

drop policy if exists "Anyone can read reactions" on public.reactions;
create policy "Read reactions on visible targets" on public.reactions
  for select using (public.can_view_target(target_type, target_id, auth.uid()));
