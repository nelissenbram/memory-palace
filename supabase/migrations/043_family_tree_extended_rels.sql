-- Add stepparent, stepchild, half-sibling to relationship type constraint
ALTER TABLE family_tree_relationships DROP CONSTRAINT IF EXISTS family_tree_relationships_relationship_type_check;
ALTER TABLE family_tree_relationships ADD CONSTRAINT family_tree_relationships_relationship_type_check
  CHECK (relationship_type IN ('parent', 'child', 'spouse', 'sibling', 'ex-spouse', 'stepparent', 'stepchild', 'half-sibling'));
