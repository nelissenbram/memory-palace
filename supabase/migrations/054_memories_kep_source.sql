-- Migration: Add kep source columns to memories table

ALTER TABLE memories ADD COLUMN IF NOT EXISTS source_kep_id uuid REFERENCES keps(id) ON DELETE SET NULL;
ALTER TABLE memories ADD COLUMN IF NOT EXISTS source_type text;
ALTER TABLE memories ADD COLUMN IF NOT EXISTS source_sender text;

CREATE INDEX idx_memories_source_kep_id ON memories(source_kep_id) WHERE source_kep_id IS NOT NULL;
