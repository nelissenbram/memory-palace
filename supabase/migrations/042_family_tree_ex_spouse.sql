-- Add ex-spouse relationship type and is_self flag
ALTER TABLE family_tree_persons ADD COLUMN IF NOT EXISTS is_self boolean DEFAULT false;

-- Drop and recreate the check constraint to include ex-spouse
ALTER TABLE family_tree_relationships DROP CONSTRAINT IF EXISTS family_tree_relationships_relationship_type_check;
ALTER TABLE family_tree_relationships ADD CONSTRAINT family_tree_relationships_relationship_type_check
  CHECK (relationship_type IN ('parent', 'child', 'spouse', 'sibling', 'ex-spouse'));

-- Ensure only one person per user can be marked as self
CREATE UNIQUE INDEX IF NOT EXISTS idx_family_tree_one_self_per_user
  ON family_tree_persons (user_id) WHERE is_self = true;
