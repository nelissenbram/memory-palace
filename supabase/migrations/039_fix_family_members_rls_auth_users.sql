-- ═══ FIX: "permission denied for table users" in family_members RLS ═══
--
-- Problem: The SELECT policy on family_members contains:
--   email = (SELECT email FROM auth.users WHERE id = auth.uid())
-- Regular users do NOT have SELECT permission on auth.users, so this
-- sub-query fails with "permission denied for table users" any time
-- a row would be evaluated against this branch of the OR.
--
-- Solution: Replace the auth.users sub-query with auth.jwt() ->> 'email',
-- which extracts the email directly from the JWT token — no table access
-- required.

-- Drop the existing SELECT policy (created in 013_fix_family_rls.sql)
DROP POLICY IF EXISTS "Members can view their group members" ON public.family_members;

-- Recreate with the fix: use auth.jwt() instead of auth.users
CREATE POLICY "Members can view their group members" ON public.family_members
  FOR SELECT USING (
    -- Direct match: this row belongs to the current user
    user_id = auth.uid()
    -- Group creator can see all members (join to family_groups only)
    OR group_id IN (
      SELECT id FROM public.family_groups WHERE created_by = auth.uid()
    )
    -- Pending invite visible by email (fixed: use JWT instead of auth.users)
    OR email = (auth.jwt() ->> 'email')
    -- Fellow group members can see each other (via SECURITY DEFINER function)
    OR public.is_family_member(group_id, auth.uid())
  );
