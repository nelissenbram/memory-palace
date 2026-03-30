-- ═══ WING SHARE INVITE FLOW ═══
-- Add accept/decline flow to wing_shares (similar to room_shares)

ALTER TABLE public.wing_shares ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.wing_shares ADD COLUMN IF NOT EXISTS shared_with_email TEXT;
ALTER TABLE public.wing_shares ADD COLUMN IF NOT EXISTS invite_message TEXT;
ALTER TABLE public.wing_shares ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;
ALTER TABLE public.wing_shares ADD COLUMN IF NOT EXISTS declined_at TIMESTAMPTZ;

-- Allow unauthenticated users to read basic share info for the invite landing page
-- Drop the old select policy first, then create a public one
DROP POLICY IF EXISTS "Users can view shares they own or received" ON public.wing_shares;
CREATE POLICY "Anyone can view wing share for invite page" ON public.wing_shares
  FOR SELECT USING (true);
