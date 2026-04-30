-- Sources/citations for genealogical evidence
CREATE TABLE IF NOT EXISTS family_tree_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  url text,
  citation text,
  notes text,
  file_path text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Link sources to specific facts on persons
CREATE TABLE IF NOT EXISTS family_tree_source_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES family_tree_sources(id) ON DELETE CASCADE,
  person_id uuid NOT NULL REFERENCES family_tree_persons(id) ON DELETE CASCADE,
  fact_type text NOT NULL CHECK (fact_type IN (
    'name', 'birth', 'death', 'gender', 'photo', 'notes',
    'birth_place', 'death_place', 'event', 'relationship', 'general'
  )),
  event_id uuid REFERENCES family_tree_events(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE family_tree_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own sources" ON family_tree_sources
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE family_tree_source_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own source links" ON family_tree_source_links
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_family_sources_user ON family_tree_sources(user_id);
CREATE INDEX idx_family_source_links_person ON family_tree_source_links(person_id);
CREATE INDEX idx_family_source_links_source ON family_tree_source_links(source_id);
