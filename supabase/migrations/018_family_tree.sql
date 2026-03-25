CREATE TABLE IF NOT EXISTS family_tree_persons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  first_name text NOT NULL,
  last_name text,
  birth_date date,
  death_date date,
  gender text CHECK (gender IN ('male', 'female', 'other')),
  photo_path text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS family_tree_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  person_id uuid REFERENCES family_tree_persons(id) ON DELETE CASCADE NOT NULL,
  related_person_id uuid REFERENCES family_tree_persons(id) ON DELETE CASCADE NOT NULL,
  relationship_type text NOT NULL CHECK (relationship_type IN ('parent', 'child', 'spouse', 'sibling')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(person_id, related_person_id, relationship_type)
);

ALTER TABLE family_tree_persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_tree_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own persons" ON family_tree_persons
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own relationships" ON family_tree_relationships
  FOR ALL USING (auth.uid() = user_id);
