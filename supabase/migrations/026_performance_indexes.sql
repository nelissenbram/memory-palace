-- ═══ PERFORMANCE INDEXES ═══
-- Add indexes for common query patterns.
-- Uses IF NOT EXISTS so safe to re-run; some may already exist.

-- Composite index for "my memories, newest first" queries
CREATE INDEX IF NOT EXISTS idx_memories_user_created ON public.memories(user_id, created_at DESC);

-- Already exists from 002_wings_rooms.sql but included for completeness
CREATE INDEX IF NOT EXISTS idx_rooms_user ON public.rooms(user_id);

-- Already exists from 017_wing_shares.sql but included for completeness
CREATE INDEX IF NOT EXISTS idx_wing_shares_owner ON public.wing_shares(owner_id);

-- New: fast lookup of room shares by owner
CREATE INDEX IF NOT EXISTS idx_room_shares_owner ON public.room_shares(owner_id);
