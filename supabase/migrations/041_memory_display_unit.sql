-- Add display assignment columns for furniture placement
alter table public.memories add column if not exists displayed boolean;
alter table public.memories add column if not exists display_unit text;
