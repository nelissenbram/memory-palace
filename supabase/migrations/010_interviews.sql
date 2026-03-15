-- Interview Sessions: AI-led life interviews
CREATE TABLE interview_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  interview_template_id TEXT NOT NULL,
  status TEXT DEFAULT 'in_progress', -- in_progress, completed, abandoned
  responses JSONB DEFAULT '[]', -- array of { questionId, audioUrl, transcript, aiFollowUp, answeredAt }
  narrative_summary TEXT,
  generated_memory_id UUID REFERENCES memories(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}', -- people_mentioned, dates, locations, etc.
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  total_duration_seconds INT DEFAULT 0
);

ALTER TABLE interview_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own interviews" ON interview_sessions
  FOR ALL USING (user_id = auth.uid());

-- Index for fast lookup by user
CREATE INDEX idx_interview_sessions_user ON interview_sessions(user_id);
CREATE INDEX idx_interview_sessions_status ON interview_sessions(user_id, status);
