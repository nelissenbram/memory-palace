-- Add bio field to profiles for the settings page
alter table public.profiles add column if not exists bio text;
