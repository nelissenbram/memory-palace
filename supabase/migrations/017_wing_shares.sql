-- ═══ WING-LEVEL FAMILY SHARING ═══

CREATE TABLE IF NOT EXISTS public.wing_shares (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wing_id         TEXT NOT NULL,
  permission      TEXT NOT NULL DEFAULT 'view' CHECK (permission IN ('view', 'contribute')),
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(owner_id, shared_with_id, wing_id)
);

CREATE INDEX idx_wing_shares_owner ON public.wing_shares(owner_id);
CREATE INDEX idx_wing_shares_shared_with ON public.wing_shares(shared_with_id);

ALTER TABLE public.wing_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view shares they own or received" ON public.wing_shares
  FOR SELECT USING (auth.uid() = owner_id OR auth.uid() = shared_with_id);

CREATE POLICY "Users can insert their own shares" ON public.wing_shares
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own shares" ON public.wing_shares
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own shares" ON public.wing_shares
  FOR DELETE USING (auth.uid() = owner_id);
