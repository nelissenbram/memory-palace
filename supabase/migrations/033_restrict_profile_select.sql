-- ═══ RESTRICT PROFILE SELECT TO OWN ROW ═══
-- The "Authenticated can read public profile fields" policy from
-- 020_restrict_profile_emails.sql still exposes ALL columns to any
-- authenticated user.  Replace it with own-row-only full access.
-- Cross-user lookups should go through the public_profiles view
-- (id, display_name, avatar_url) which already exists.

DROP POLICY IF EXISTS "Authenticated can read public profile fields" ON profiles;

-- Full column access only for own row
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT
  USING (id = auth.uid());
