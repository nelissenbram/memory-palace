-- ═══ FIX: Infinite recursion in family_members RLS policies ═══
--
-- Problem: RLS policies on family_members contained subqueries back to
-- family_members, triggering the same SELECT policy and causing infinite
-- recursion. The SELECT policy on family_groups also queried family_members,
-- which cascaded into the same loop.
--
-- Solution: Use SECURITY DEFINER helper functions that bypass RLS to check
-- membership and roles, then reference those functions in the policies.

-- ─── Step 1: Create SECURITY DEFINER helper functions ───

-- Check if a user is a member of a given group (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_family_member(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.family_members
    WHERE group_id = p_group_id AND user_id = p_user_id
  );
$$;

-- Check if a user has owner or admin role in a given group (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_family_admin(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.family_members
    WHERE group_id = p_group_id
      AND user_id = p_user_id
      AND role IN ('owner', 'admin')
  );
$$;

-- Get all group_ids a user belongs to (bypasses RLS)
CREATE OR REPLACE FUNCTION public.user_family_group_ids(p_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT group_id FROM public.family_members WHERE user_id = p_user_id;
$$;

-- ─── Step 2: Drop all existing policies on family_members ───

DROP POLICY IF EXISTS "Members can view their group members" ON public.family_members;
DROP POLICY IF EXISTS "Owners/admins can insert members" ON public.family_members;
DROP POLICY IF EXISTS "Owners/admins can delete members" ON public.family_members;
DROP POLICY IF EXISTS "Invited users can update their own membership to accept" ON public.family_members;

-- ─── Step 3: Drop and recreate the family_groups SELECT policy ───
-- (It also referenced family_members, causing the cascade)

DROP POLICY IF EXISTS "Users can view family groups they belong to" ON public.family_groups;

CREATE POLICY "Users can view family groups they belong to" ON public.family_groups
  FOR SELECT USING (
    created_by = auth.uid()
    OR id IN (SELECT public.user_family_group_ids(auth.uid()))
  );

-- ─── Step 4: Create corrected family_members policies ───

-- SELECT: user can see rows where they are a direct member, OR they are
-- the group creator, OR the row matches their email (for pending invites).
-- No self-referencing subquery on family_members.
CREATE POLICY "Members can view their group members" ON public.family_members
  FOR SELECT USING (
    -- Direct match: this row belongs to the current user
    user_id = auth.uid()
    -- Group creator can see all members (join to family_groups only)
    OR group_id IN (
      SELECT id FROM public.family_groups WHERE created_by = auth.uid()
    )
    -- Pending invite visible by email
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
    -- Fellow group members can see each other (via SECURITY DEFINER function)
    OR public.is_family_member(group_id, auth.uid())
  );

-- INSERT: group creator (from family_groups) or existing owner/admin
-- (checked via SECURITY DEFINER function, not a subquery on family_members).
CREATE POLICY "Owners/admins can insert members" ON public.family_members
  FOR INSERT WITH CHECK (
    -- Group creator can always add members
    group_id IN (
      SELECT id FROM public.family_groups WHERE created_by = auth.uid()
    )
    -- Existing owners/admins can add members (bypasses RLS via function)
    OR public.is_family_admin(group_id, auth.uid())
  );

-- UPDATE: user can update their own row, or owner/admin can update any row
-- in their group (checked via SECURITY DEFINER function).
CREATE POLICY "Owners/admins or self can update membership" ON public.family_members
  FOR UPDATE USING (
    user_id = auth.uid()
    OR public.is_family_admin(group_id, auth.uid())
  );

-- DELETE: owner/admin can delete members (via function), or user can remove
-- themselves.
CREATE POLICY "Owners/admins can delete members or self-leave" ON public.family_members
  FOR DELETE USING (
    user_id = auth.uid()
    OR public.is_family_admin(group_id, auth.uid())
  );
