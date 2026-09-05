-- ═══ LEG-003: AI provenance flag (EU AI Act art. 50 transparency) ═══
-- Adds a `source` column ('user' | 'ai') to memories and life_story_chapters
-- so AI-generated/AI-edited content can carry an "AI" badge in the UI.
--
-- Writers that set source='ai' after this migration:
--   * /api/life-story/generate      — AI-woven chapter prose
--   * kep capture-router            — AI-routed WhatsApp captures (AI routing +
--                                     Whisper transcription, consent-gated)
--   * kep auto-route                — only when a Whisper transcription is present
--   * RestorePhotoModal save        — AI-restored photo saved as a new memory
--   * InterviewPanel create-memory  — AI interview narrative summaries
--   * MemoryDetail / LibraryView    — AI label/description results merged into desc
--   * MassImportPanel               — imports whose title/desc came from /api/ai-tag
-- Not covered (documented): bust_model_url on profiles (busts are inherently
-- presented as AI-generated; no per-row provenance column added there) and
-- historicalContext (client-side only, never persisted to the database).
-- Idempotent: safe to re-run.

ALTER TABLE public.memories
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'user';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'memories_source_check'
  ) THEN
    ALTER TABLE public.memories
      ADD CONSTRAINT memories_source_check CHECK (source IN ('user', 'ai'));
  END IF;
END $$;

ALTER TABLE public.life_story_chapters
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'user';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'life_story_chapters_source_check'
  ) THEN
    ALTER TABLE public.life_story_chapters
      ADD CONSTRAINT life_story_chapters_source_check CHECK (source IN ('user', 'ai'));
  END IF;
END $$;

-- ── Backfill where AI origin is derivable with certainty ──
-- Chapter prose is only ever written by /api/life-story/generate (AI weave);
-- users can edit it afterwards, but its origin is AI.
UPDATE public.life_story_chapters
  SET source = 'ai'
  WHERE content IS NOT NULL AND length(content) > 0 AND source = 'user';

-- Memories of type 'interview' are created exclusively by the interview flow,
-- whose description is the AI-generated narrative summary.
UPDATE public.memories
  SET source = 'ai'
  WHERE type = 'interview' AND source = 'user';

-- All other existing memories stay 'user': there is no reliable marker for
-- past AI involvement (restored-photo titles are locale-dependent, AI labels
-- were merged into description without a flag, kep transcripts are not
-- distinguishable from typed text after the fact). Only content created after
-- this migration is labeled.
