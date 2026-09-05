-- Week-4 (pulled forward) — SUCCESS_PLAYBOOK Pillar 1 §8 / calendar 4.1.
-- "On This Day" currently matches on upload date (created_at); users import OLD
-- photos, so anniversaries are structurally zero. event_date holds the real
-- taken-date (EXIF DateTimeOriginal, cloud-provider creationTime, or user-set).
-- All resurface consumers read coalesce(event_date, created_at).
--
-- Apply manually (NOT auto-applied). After applying, run:
--   node scripts/week4/backfill-event-dates.mjs          (dry-run report)
--   node scripts/week4/backfill-event-dates.mjs --apply  (writes event_date)

alter table memories add column if not exists event_date date;

create index if not exists idx_memories_event_date
  on memories(user_id, event_date)
  where event_date is not null;

comment on column memories.event_date is
  'Date the memory actually happened (EXIF DateTimeOriginal / provider creationTime / user-set). NULL = unknown; consumers fall back to created_at.';
