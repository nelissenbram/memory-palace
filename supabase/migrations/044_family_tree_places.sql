-- Add place fields to family_tree_persons
ALTER TABLE family_tree_persons ADD COLUMN IF NOT EXISTS birth_place text;
ALTER TABLE family_tree_persons ADD COLUMN IF NOT EXISTS death_place text;
