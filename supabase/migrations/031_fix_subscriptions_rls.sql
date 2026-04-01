-- Fix critical RLS vulnerability on subscriptions table
-- The "Service role can manage subscriptions" policy used FOR ALL with
-- USING (true) / WITH CHECK (true), which grants every authenticated user
-- full read/write access to ALL subscription rows.
-- The service role already bypasses RLS, so that policy was unnecessary.

-- Drop the dangerous blanket policy
drop policy if exists "Service role can manage subscriptions" on public.subscriptions;

-- The existing "Users can read own subscription" SELECT policy (from 012)
-- is already correct and remains in place. No INSERT/UPDATE/DELETE policies
-- are added for authenticated users — only the service role (which bypasses
-- RLS) and security-definer functions should mutate subscriptions.
