-- The finding's recommendation asks for RLS defense-in-depth so that even a leaked/scripted AAL1 session cannot read/write sensitive rows at the database layer. A naive `aal = 'aal2'` policy would lock out every user who never enrolled MFA, so the helper allows AAL1 only when the user has NO verified factor. The exact set of sensitive tables and their existing owner predicates must be chosen/verified by the owner before applying; the app-level middleware guard already blocks these sessions before the DB is reached, so this migration is hardening, not the sole defense.

-- Defense-in-depth: require AAL2 on sensitive tables for users who have MFA
-- enrolled, while NOT locking out users who never enrolled a second factor.
-- Supabase pattern: allow when the JWT is aal2, OR when the user has no
-- VERIFIED MFA factor (so aal1 is their maximum). Apply per sensitive table.
--
-- Helper: true when the current session satisfies the app's step-up policy.
create or replace function public.session_meets_aal()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    coalesce(auth.jwt()->>'aal', 'aal1') = 'aal2'
    or not exists (
      select 1 from auth.mfa_factors f
      where f.user_id = auth.uid()
        and f.status = 'verified'
    );
$$;

revoke all on function public.session_meets_aal() from public;
grant execute on function public.session_meets_aal() to authenticated;

-- EXAMPLE application on one sensitive table (repeat the pattern, adjusting the
-- table name and the existing owner predicate, for every sensitive table such
-- as profiles, rooms, memories, family_members, subscriptions, etc.). This
-- ANDs the AAL gate onto the existing owner check; keep the owner predicate.
--
-- drop policy if exists "owner_select" on public.memories;
-- create policy "owner_select" on public.memories
--   for select using (
--     user_id = auth.uid() and public.session_meets_aal()
--   );
-- (repeat for insert/update/delete with the appropriate using/with check)

