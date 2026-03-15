-- Add layout variant to rooms (nullable = use hash-based default)
-- Valid values: den, study, gallery, salon, nook
alter table public.rooms add column layout text;
