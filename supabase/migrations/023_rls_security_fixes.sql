-- ═══ RLS SECURITY FIXES ═══
-- Addresses critical and medium severity findings from security audit.

-- ────────────────────────────────────────────────────────────────────────────
-- FIX 1 (CRITICAL): Remove public SELECT on room_shares
-- Migration 009 added "Anyone can view basic share info for invite page"
-- with USING (true), exposing all share data to unauthenticated users.
-- The invite pages use admin client (service role) so this policy is unnecessary.
-- ────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Anyone can view basic share info for invite page" ON public.room_shares;

-- ────────────────────────────────────────────────────────────────────────────
-- FIX 2 (CRITICAL): Restrict public SELECT on wing_shares
-- Migrations 021/022 added "Anyone can view wing share for invite page"
-- with USING (true). Same issue as room_shares — invite pages use admin client.
-- Replace with scoped policy: owners + recipients only.
-- ────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Anyone can view wing share for invite page" ON public.wing_shares;

CREATE POLICY "Wing share owners and recipients can view" ON public.wing_shares
  FOR SELECT USING (
    owner_id = auth.uid()
    OR shared_with_id = auth.uid()
    OR shared_with_email = (auth.jwt() ->> 'email')
  );

-- ────────────────────────────────────────────────────────────────────────────
-- FIX 3 (MEDIUM): Enforce user_id = auth.uid() on shared_memories_contribute
-- The original INSERT policy didn't check user_id, allowing contributors
-- to impersonate other users when inserting memories.
-- ────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "shared_memories_contribute" ON public.memories;

CREATE POLICY "shared_memories_contribute" ON public.memories
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND room_id IN (
      SELECT room_id FROM public.room_shares
      WHERE shared_with_id = auth.uid()
        AND accepted = true
        AND permission IN ('contribute', 'admin')
    )
  );

-- Also fix wing-level INSERT policy (from 022_sharing_overhaul)
DROP POLICY IF EXISTS "shared_wing_memories_add" ON public.memories;

CREATE POLICY "shared_wing_memories_add" ON public.memories
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.rooms r
      JOIN public.wing_shares ws ON TRUE
      JOIN public.wings w ON w.slug = ws.wing_id AND w.user_id = ws.owner_id AND w.id = r.wing_id
      WHERE r.id = memories.room_id
        AND (ws.shared_with_id = auth.uid() OR ws.shared_with_email = (auth.jwt() ->> 'email'))
        AND ws.status = 'accepted'
        AND ws.can_add = true
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- FIX 4 (LOW): Add shared_wings_read policy
-- Shared users couldn't read wing metadata for rooms shared with them.
-- ────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "shared_wings_read" ON public.wings;

CREATE POLICY "shared_wings_read" ON public.wings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.wing_shares ws
      WHERE ws.wing_id = wings.slug
        AND ws.owner_id = wings.user_id
        AND (ws.shared_with_id = auth.uid() OR ws.shared_with_email = (auth.jwt() ->> 'email'))
        AND ws.status = 'accepted'
    )
  );
