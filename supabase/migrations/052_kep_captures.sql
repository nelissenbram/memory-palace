-- Migration: Create kep_captures table
-- Stores individual captured items before they are routed to rooms as memories.

CREATE TABLE IF NOT EXISTS kep_captures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kep_id uuid NOT NULL REFERENCES keps(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  source_message_id text,
  source_sender text,
  source_timestamp timestamptz,
  media_type text CHECK (media_type IN ('image', 'video', 'audio', 'text', 'document')),
  media_url text,
  media_size integer,
  transcription text,
  ai_suggestion jsonb,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'routed', 'rejected', 'failed')),
  rejection_reason text,
  memory_id uuid REFERENCES memories(id) ON DELETE SET NULL,
  payload_hash text,
  payload_preview jsonb,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_kep_captures_kep_id ON kep_captures(kep_id);
CREATE INDEX idx_kep_captures_user_id ON kep_captures(user_id);
CREATE INDEX idx_kep_captures_status ON kep_captures(status);
CREATE INDEX idx_kep_captures_payload_hash ON kep_captures(payload_hash);

-- Unique constraint: no duplicate messages per kep
CREATE UNIQUE INDEX idx_kep_captures_unique_message
  ON kep_captures(kep_id, source_message_id)
  WHERE source_message_id IS NOT NULL;

-- RLS
ALTER TABLE kep_captures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own captures"
  ON kep_captures FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own captures"
  ON kep_captures FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own captures"
  ON kep_captures FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own captures"
  ON kep_captures FOR DELETE
  USING (auth.uid() = user_id);
