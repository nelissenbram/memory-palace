CREATE TABLE IF NOT EXISTS family_tree_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  person_id uuid NOT NULL REFERENCES family_tree_persons(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN (
    'marriage', 'divorce', 'burial', 'baptism', 'christening',
    'immigration', 'emigration', 'naturalization',
    'occupation', 'education', 'military', 'residence',
    'retirement', 'census', 'other'
  )),
  event_date text, -- flexible: YYYY, YYYY-MM, YYYY-MM-DD
  event_place text,
  description text,
  related_person_id uuid REFERENCES family_tree_persons(id) ON DELETE SET NULL, -- e.g., spouse for marriage
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE family_tree_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own events" ON family_tree_events
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_family_events_person ON family_tree_events(person_id);
CREATE INDEX idx_family_events_user ON family_tree_events(user_id);
