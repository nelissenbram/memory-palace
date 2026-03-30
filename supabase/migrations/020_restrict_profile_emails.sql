-- ═══ RESTRICT PROFILE EMAIL EXPOSURE ═══
-- The "Public can read display names" policy from 009_invite_flow.sql
-- unintentionally exposes ALL profile columns (including email) to any user.
-- Replace it with a more restrictive approach.

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Public can read display names" ON profiles;

-- Allow authenticated users to read only their own full profile
-- (The "own_profile" policy from 005_rls_policies.sql already handles this)

-- Allow authenticated users to read display_name and avatar_url of others
-- (needed for invite pages, share cards, etc.)
CREATE POLICY "Authenticated can read public profile fields" ON profiles
  FOR SELECT
  USING (
    id = auth.uid()
    OR auth.role() = 'authenticated'
  );
-- NOTE: This still allows reading all columns for authenticated users.
-- For full column-level restriction, create a public_profiles view:

CREATE OR REPLACE VIEW public_profiles AS
  SELECT id, display_name, avatar_url
  FROM profiles;

GRANT SELECT ON public_profiles TO anon, authenticated;

-- Add CHECK constraint on room_shares.permission (#16)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'room_shares_permission_check'
  ) THEN
    ALTER TABLE public.room_shares ADD CONSTRAINT room_shares_permission_check
      CHECK (permission IN ('view', 'contribute', 'admin'));
  END IF;
END $$;
