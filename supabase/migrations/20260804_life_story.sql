-- Life Story: user-curated chapters that weave attached memories + interview
-- material into AI-generated first-person prose (see /api/life-story/generate).
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS public.life_story_chapters (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  period_label  TEXT,                    -- e.g. "Childhood", "1960-1975"
  content       TEXT,                    -- AI-woven chapter prose
  memory_ids    UUID[] NOT NULL DEFAULT '{}',
  position      INT NOT NULL DEFAULT 0, -- ordering within the user's life story
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_life_story_chapters_user_position
  ON public.life_story_chapters(user_id, position);

ALTER TABLE public.life_story_chapters ENABLE ROW LEVEL SECURITY;

-- Owner-only policies (select/insert/update/delete where auth.uid() = user_id).
DROP POLICY IF EXISTS "Users read own life story chapters" ON public.life_story_chapters;
CREATE POLICY "Users read own life story chapters" ON public.life_story_chapters
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own life story chapters" ON public.life_story_chapters;
CREATE POLICY "Users insert own life story chapters" ON public.life_story_chapters
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own life story chapters" ON public.life_story_chapters;
CREATE POLICY "Users update own life story chapters" ON public.life_story_chapters
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own life story chapters" ON public.life_story_chapters;
CREATE POLICY "Users delete own life story chapters" ON public.life_story_chapters
  FOR DELETE USING (auth.uid() = user_id);

-- Keep updated_at fresh on row changes (set_updated_at() exists since 003_memories.sql).
CREATE OR REPLACE TRIGGER set_life_story_chapters_updated_at
  BEFORE UPDATE ON public.life_story_chapters
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
