-- ═══ SHARING OVERHAUL ═══
-- Replace coarse permission TEXT with granular boolean flags,
-- add invite flow to wing_shares, add placed_in_wing_id to room_shares,
-- and add RLS policies for shared wing content.

-- ────────────────────────────────────────────────────────────────────────────
-- 1. GRANULAR PERMISSION FLAGS
-- ────────────────────────────────────────────────────────────────────────────

-- room_shares: add boolean flags
ALTER TABLE public.room_shares ADD COLUMN IF NOT EXISTS can_add    BOOLEAN DEFAULT false;
ALTER TABLE public.room_shares ADD COLUMN IF NOT EXISTS can_edit   BOOLEAN DEFAULT false;
ALTER TABLE public.room_shares ADD COLUMN IF NOT EXISTS can_delete BOOLEAN DEFAULT false;

-- wing_shares: add boolean flags
ALTER TABLE public.wing_shares ADD COLUMN IF NOT EXISTS can_add    BOOLEAN DEFAULT false;
ALTER TABLE public.wing_shares ADD COLUMN IF NOT EXISTS can_edit   BOOLEAN DEFAULT false;
ALTER TABLE public.wing_shares ADD COLUMN IF NOT EXISTS can_delete BOOLEAN DEFAULT false;

-- Migrate existing data: 'contribute' → can_add=true, 'view' stays all false
UPDATE public.room_shares SET can_add = true WHERE permission = 'contribute' AND can_add = false;
UPDATE public.wing_shares SET can_add = true WHERE permission = 'contribute' AND can_add = false;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. WING_SHARES INVITE FLOW COLUMNS
-- ────────────────────────────────────────────────────────────────────────────
-- Migration 021 already added: status, shared_with_email, invite_message,
-- accepted_at, declined_at. These are idempotent IF NOT EXISTS just in case.

ALTER TABLE public.wing_shares ADD COLUMN IF NOT EXISTS status           TEXT DEFAULT 'pending';
ALTER TABLE public.wing_shares ADD COLUMN IF NOT EXISTS shared_with_email TEXT;
ALTER TABLE public.wing_shares ADD COLUMN IF NOT EXISTS invite_message   TEXT;
ALTER TABLE public.wing_shares ADD COLUMN IF NOT EXISTS accepted_at      TIMESTAMPTZ;
ALTER TABLE public.wing_shares ADD COLUMN IF NOT EXISTS declined_at      TIMESTAMPTZ;

-- Make shared_with_id nullable (invite by email before account exists)
ALTER TABLE public.wing_shares ALTER COLUMN shared_with_id DROP NOT NULL;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. PLACED_IN_WING_ID ON ROOM_SHARES
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.room_shares ADD COLUMN IF NOT EXISTS placed_in_wing_id UUID REFERENCES public.wings(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_room_shares_placed_wing ON public.room_shares(placed_in_wing_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 4. RLS: SHARED WING CONTENT
-- ────────────────────────────────────────────────────────────────────────────
-- Recipients of accepted wing_shares can access rooms + memories in the
-- owner's wing. wing_shares.wing_id is a TEXT slug; join via
-- wings.slug = wing_shares.wing_id AND wings.user_id = wing_shares.owner_id.

-- Helper: rooms in a wing shared with the current user (accepted)
-- SELECT rooms
DROP POLICY IF EXISTS "shared_wing_rooms_read" ON public.rooms;
CREATE POLICY "shared_wing_rooms_read" ON public.rooms
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.wing_shares ws
      JOIN public.wings w ON w.slug = ws.wing_id AND w.user_id = ws.owner_id
      WHERE w.id = rooms.wing_id
        AND (ws.shared_with_id = auth.uid() OR ws.shared_with_email = (auth.jwt() ->> 'email'))
        AND ws.status = 'accepted'
    )
  );

-- SELECT memories in shared wing rooms
DROP POLICY IF EXISTS "shared_wing_memories_read" ON public.memories;
CREATE POLICY "shared_wing_memories_read" ON public.memories
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.rooms r
      JOIN public.wing_shares ws ON TRUE
      JOIN public.wings w ON w.slug = ws.wing_id AND w.user_id = ws.owner_id AND w.id = r.wing_id
      WHERE r.id = memories.room_id
        AND (ws.shared_with_id = auth.uid() OR ws.shared_with_email = (auth.jwt() ->> 'email'))
        AND ws.status = 'accepted'
    )
  );

-- INSERT memories (can_add)
DROP POLICY IF EXISTS "shared_wing_memories_add" ON public.memories;
CREATE POLICY "shared_wing_memories_add" ON public.memories
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rooms r
      JOIN public.wing_shares ws ON TRUE
      JOIN public.wings w ON w.slug = ws.wing_id AND w.user_id = ws.owner_id AND w.id = r.wing_id
      WHERE r.id = memories.room_id
        AND (ws.shared_with_id = auth.uid() OR ws.shared_with_email = (auth.jwt() ->> 'email'))
        AND ws.status = 'accepted'
        AND ws.can_add = true
    )
  );

-- UPDATE memories (can_edit)
DROP POLICY IF EXISTS "shared_wing_memories_edit" ON public.memories;
CREATE POLICY "shared_wing_memories_edit" ON public.memories
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.rooms r
      JOIN public.wing_shares ws ON TRUE
      JOIN public.wings w ON w.slug = ws.wing_id AND w.user_id = ws.owner_id AND w.id = r.wing_id
      WHERE r.id = memories.room_id
        AND (ws.shared_with_id = auth.uid() OR ws.shared_with_email = (auth.jwt() ->> 'email'))
        AND ws.status = 'accepted'
        AND ws.can_edit = true
    )
  );

-- DELETE memories (can_delete)
DROP POLICY IF EXISTS "shared_wing_memories_delete" ON public.memories;
CREATE POLICY "shared_wing_memories_delete" ON public.memories
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.rooms r
      JOIN public.wing_shares ws ON TRUE
      JOIN public.wings w ON w.slug = ws.wing_id AND w.user_id = ws.owner_id AND w.id = r.wing_id
      WHERE r.id = memories.room_id
        AND (ws.shared_with_id = auth.uid() OR ws.shared_with_email = (auth.jwt() ->> 'email'))
        AND ws.status = 'accepted'
        AND ws.can_delete = true
    )
  );

-- SELECT storage objects for media in shared wing rooms
DROP POLICY IF EXISTS "Users can view media in shared wing rooms" ON storage.objects;
CREATE POLICY "Users can view media in shared wing rooms" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'memories'
    AND EXISTS (
      SELECT 1 FROM public.memories m
      JOIN public.rooms r ON r.id = m.room_id
      JOIN public.wing_shares ws ON TRUE
      JOIN public.wings w ON w.slug = ws.wing_id AND w.user_id = ws.owner_id AND w.id = r.wing_id
      WHERE m.file_path = name
        AND (ws.shared_with_id = auth.uid() OR ws.shared_with_email = (auth.jwt() ->> 'email'))
        AND ws.status = 'accepted'
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- 5. RLS: LEAVE FUNCTIONALITY
-- ────────────────────────────────────────────────────────────────────────────
-- Recipients can delete their own share records to "leave" a share.

DROP POLICY IF EXISTS "Recipients can leave wing shares" ON public.wing_shares;
CREATE POLICY "Recipients can leave wing shares" ON public.wing_shares
  FOR DELETE USING (
    auth.uid() = shared_with_id
  );

DROP POLICY IF EXISTS "Recipients can leave room shares" ON public.room_shares;
CREATE POLICY "Recipients can leave room shares" ON public.room_shares
  FOR DELETE USING (
    auth.uid() = shared_with_id
  );

-- ────────────────────────────────────────────────────────────────────────────
-- 6. WING_SHARES SELECT → PUBLIC (for invite page)
-- ────────────────────────────────────────────────────────────────────────────
-- Migration 021 already did this, but ensure idempotency.

DROP POLICY IF EXISTS "Users can view shares they own or received" ON public.wing_shares;
DROP POLICY IF EXISTS "Anyone can view wing share for invite page" ON public.wing_shares;
CREATE POLICY "Anyone can view wing share for invite page" ON public.wing_shares
  FOR SELECT USING (true);

-- ────────────────────────────────────────────────────────────────────────────
-- 7. INDEX on placed_in_wing_id (already created above in section 3)
-- ────────────────────────────────────────────────────────────────────────────
-- idx_room_shares_placed_wing created above for fast corridor queries.
