-- ═══ FAMILY GROUPS & PRIVACY CONTROLS ═══

-- Family groups table
CREATE TABLE public.family_groups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  created_by  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_family_groups_creator ON public.family_groups(created_by);

-- Family members table
CREATE TABLE public.family_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    UUID NOT NULL REFERENCES public.family_groups(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  status      TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active')),
  joined_at   TIMESTAMPTZ
);

CREATE INDEX idx_family_members_group ON public.family_members(group_id);
CREATE INDEX idx_family_members_user ON public.family_members(user_id);
CREATE INDEX idx_family_members_email ON public.family_members(email);

-- RLS policies for family_groups
ALTER TABLE public.family_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view family groups they belong to" ON public.family_groups
  FOR SELECT USING (
    id IN (SELECT group_id FROM public.family_members WHERE user_id = auth.uid())
    OR created_by = auth.uid()
  );

CREATE POLICY "Users can create family groups" ON public.family_groups
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Owners can update family groups" ON public.family_groups
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Owners can delete family groups" ON public.family_groups
  FOR DELETE USING (created_by = auth.uid());

-- RLS policies for family_members
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their group members" ON public.family_members
  FOR SELECT USING (
    group_id IN (SELECT group_id FROM public.family_members fm WHERE fm.user_id = auth.uid())
    OR group_id IN (SELECT id FROM public.family_groups fg WHERE fg.created_by = auth.uid())
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "Owners/admins can insert members" ON public.family_members
  FOR INSERT WITH CHECK (
    -- Group creator can always insert members (bootstrapping: first member)
    group_id IN (
      SELECT id FROM public.family_groups fg
      WHERE fg.created_by = auth.uid()
    )
    OR
    -- Existing owners/admins can insert members
    group_id IN (
      SELECT group_id FROM public.family_members fm
      WHERE fm.user_id = auth.uid() AND fm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners/admins can delete members" ON public.family_members
  FOR DELETE USING (
    group_id IN (
      SELECT group_id FROM public.family_members fm
      WHERE fm.user_id = auth.uid() AND fm.role IN ('owner', 'admin')
    )
    OR user_id = auth.uid()  -- members can leave
  );

CREATE POLICY "Invited users can update their own membership to accept" ON public.family_members
  FOR UPDATE USING (
    user_id = auth.uid()
    OR group_id IN (
      SELECT group_id FROM public.family_members fm
      WHERE fm.user_id = auth.uid() AND fm.role IN ('owner', 'admin')
    )
  );

-- Add allow_download to room_shares for privacy control
ALTER TABLE public.room_shares ADD COLUMN IF NOT EXISTS allow_download BOOLEAN DEFAULT true;

-- Add show_public flag to rooms for future public profiles
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS show_public BOOLEAN DEFAULT false;
