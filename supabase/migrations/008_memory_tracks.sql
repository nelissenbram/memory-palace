-- ═══ MEMORY BUILDING TRACKS ═══

-- Track progress per user
CREATE TABLE public.track_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  track_id TEXT NOT NULL, -- 'preserve', 'visualize', 'enhance', 'resolutions', 'legacy', 'cocreate'
  steps_completed JSONB DEFAULT '[]', -- array of step IDs completed
  percentage INT DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, track_id)
);

CREATE INDEX idx_track_progress_user ON public.track_progress(user_id);

ALTER TABLE public.track_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own tracks" ON public.track_progress
  FOR ALL USING (user_id = auth.uid());

-- Memory Points ledger
CREATE TABLE public.memory_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  points INT NOT NULL,
  reason TEXT NOT NULL, -- 'track_step', 'track_complete', 'daily_visit', 'achievement'
  reference_id TEXT, -- track_id or achievement_id
  step_id TEXT, -- specific step that earned these points
  earned_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_memory_points_user ON public.memory_points(user_id);

ALTER TABLE public.memory_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own points" ON public.memory_points
  FOR ALL USING (user_id = auth.uid());

-- Legacy contacts for Track 5
CREATE TABLE public.legacy_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  relationship TEXT, -- 'spouse', 'child', 'sibling', 'friend', 'lawyer', 'other'
  access_level TEXT DEFAULT 'full', -- 'full', 'selected_wings', 'selected_rooms'
  accessible_wings TEXT[] DEFAULT '{}',
  accessible_rooms UUID[] DEFAULT '{}',
  final_message_id UUID REFERENCES public.memories(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, contact_email)
);

CREATE INDEX idx_legacy_contacts_user ON public.legacy_contacts(user_id);

ALTER TABLE public.legacy_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own legacy contacts" ON public.legacy_contacts
  FOR ALL USING (user_id = auth.uid());

-- Auto-update updated_at triggers
CREATE TRIGGER set_track_progress_updated_at
  BEFORE UPDATE ON public.track_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_legacy_contacts_updated_at
  BEFORE UPDATE ON public.legacy_contacts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
