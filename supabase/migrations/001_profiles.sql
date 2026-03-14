-- ═══ PROFILES ═══
-- Extends auth.users with app-specific data
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text,
  goal          text,                 -- preserve | legacy | share | organize
  first_wing    text,                 -- chosen during onboarding
  onboarded     boolean default false,
  avatar_url    text,
  created_at    timestamptz default now()
);

-- Auto-create a profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
