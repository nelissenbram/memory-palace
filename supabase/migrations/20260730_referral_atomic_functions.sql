-- The referral POST fix replaces two lost-update read-modify-write patterns (referral_count increment and referral_rewards jsonb append) with atomic server-side SQL. These SECURITY DEFINER RPCs perform the increment/append in a single statement so concurrent referrals cannot lose updates. Called via admin.rpc('increment_referral_count') and admin.rpc('append_referral_reward') in route.ts.

-- Atomic increment of a referrer's referral_count
create or replace function public.increment_referral_count(p_referrer_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles
     set referral_count = coalesce(referral_count, 0) + 1
   where id = p_referrer_id;
$$;

-- Atomic append of a reward object to a referrer's referral_rewards jsonb array
create or replace function public.append_referral_reward(p_referrer_id uuid, p_reward jsonb)
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles
     set referral_rewards = coalesce(referral_rewards, '[]'::jsonb) || jsonb_build_array(p_reward)
   where id = p_referrer_id;
$$;

-- Only the service role should call these (route.ts uses the admin/service-role client).
revoke all on function public.increment_referral_count(uuid) from public, anon, authenticated;
revoke all on function public.append_referral_reward(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.increment_referral_count(uuid) to service_role;
grant execute on function public.append_referral_reward(uuid, jsonb) to service_role;
