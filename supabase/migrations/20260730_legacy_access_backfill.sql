-- Legacy-contact data-model reconciliation (2026-07-30)
--
-- Two divergent models coexisted on public.legacy_contacts:
--   • LegacyPanel (track-actions): accessible_wings / accessible_rooms = wing SLUGS + room local ids
--   • settings/legacy page (legacy-actions) + the ACCESS reader (/legacy/[token]): wing_access /
--     room_access = DB uuids  ← the canonical columns actually enforced at delivery.
-- LegacyPanel grants therefore never took effect. The app now writes the canonical uuid
-- columns for NEW/edited contacts; this migration backfills EXISTING contacts so their
-- previously-saved LegacyPanel grants start being honored, without touching working rows.
--
-- Idempotent + non-destructive: only fills wing_access/room_access where they are still
-- empty but the divergent slug columns hold data. Safe to run more than once.

-- Ensure the canonical columns exist (uuid arrays, matching the .in("id", …) reader).
alter table public.legacy_contacts add column if not exists wing_access uuid[] default '{}';
alter table public.legacy_contacts add column if not exists room_access uuid[] default '{}';

-- Backfill wing_access (uuids) from accessible_wings (slugs), per owner.
update public.legacy_contacts lc
set wing_access = coalesce((
  select array_agg(w.id)
  from public.wings w
  where w.user_id = lc.user_id
    and w.slug = any(lc.accessible_wings)
), '{}')
where (lc.wing_access is null or array_length(lc.wing_access, 1) is null)
  and lc.accessible_wings is not null
  and array_length(lc.accessible_wings, 1) is not null;

-- Backfill room_access (uuids) from accessible_rooms (room local ids stored in rooms.name).
update public.legacy_contacts lc
set room_access = coalesce((
  select array_agg(r.id)
  from public.rooms r
  where r.user_id = lc.user_id
    and r.name = any(lc.accessible_rooms)
), '{}')
where (lc.room_access is null or array_length(lc.room_access, 1) is null)
  and lc.accessible_rooms is not null
  and array_length(lc.accessible_rooms, 1) is not null;
