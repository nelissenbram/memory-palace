-- ═══ DIGITAL WILLS & POSTHUMOUS ACCESS ═══
-- Extends the legacy system with messages and settings tables.
-- Note: legacy_contacts already exists from 008_memory_tracks.sql — this migration
-- adds the columns requested in the spec (relationship enum, granular access).

-- ── Alter legacy_contacts: add richer relationship + access columns ──
-- The 008 migration created legacy_contacts with relationship TEXT and access_level TEXT.
-- We add the new enum-style values via a CHECK constraint and ensure wing/room access arrays.

DO $$ BEGIN
  -- Add relationship check if not already present
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'legacy_contacts_relationship_check'
  ) THEN
    ALTER TABLE public.legacy_contacts
      ADD CONSTRAINT legacy_contacts_relationship_check
      CHECK (relationship IS NULL OR relationship IN ('partner','child','grandchild','sibling','friend','other'));
  END IF;
END $$;

-- Update access_level values to match new spec
-- (existing: 'full', 'selected_wings', 'selected_rooms' → new: 'full', 'wings_only', 'specific_rooms')
UPDATE public.legacy_contacts SET access_level = 'wings_only' WHERE access_level = 'selected_wings';
UPDATE public.legacy_contacts SET access_level = 'specific_rooms' WHERE access_level = 'selected_rooms';

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'legacy_contacts_access_level_check'
  ) THEN
    ALTER TABLE public.legacy_contacts
      ADD CONSTRAINT legacy_contacts_access_level_check
      CHECK (access_level IN ('full','wings_only','specific_rooms'));
  END IF;
END $$;

-- Rename columns for clarity (only if old names still exist)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'legacy_contacts' AND column_name = 'accessible_wings') THEN
    ALTER TABLE public.legacy_contacts RENAME COLUMN accessible_wings TO wing_access;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'legacy_contacts' AND column_name = 'accessible_rooms') THEN
    ALTER TABLE public.legacy_contacts RENAME COLUMN accessible_rooms TO room_access;
  END IF;
END $$;

-- ── Legacy Messages ──
CREATE TABLE IF NOT EXISTS public.legacy_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  message_body TEXT NOT NULL DEFAULT '',
  deliver_on TEXT NOT NULL DEFAULT 'death'
    CHECK (deliver_on IN ('death','specific_date','immediately')),
  deliver_date DATE, -- used when deliver_on = 'specific_date'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_legacy_messages_user ON public.legacy_messages(user_id);

ALTER TABLE public.legacy_messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users manage own legacy messages' AND tablename = 'legacy_messages'
  ) THEN
    CREATE POLICY "Users manage own legacy messages" ON public.legacy_messages
      FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

CREATE OR REPLACE TRIGGER set_legacy_messages_updated_at
  BEFORE UPDATE ON public.legacy_messages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Legacy Settings (one row per user) ──
CREATE TABLE IF NOT EXISTS public.legacy_settings (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  inactivity_trigger_months INT NOT NULL DEFAULT 12,
  trusted_verifier_email TEXT,
  trusted_verifier_name TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','triggered','transferred')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.legacy_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users manage own legacy settings' AND tablename = 'legacy_settings'
  ) THEN
    CREATE POLICY "Users manage own legacy settings" ON public.legacy_settings
      FOR ALL USING (id = auth.uid());
  END IF;
END $$;

CREATE OR REPLACE TRIGGER set_legacy_settings_updated_at
  BEFORE UPDATE ON public.legacy_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
