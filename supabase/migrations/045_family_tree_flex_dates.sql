-- Change birth_date and death_date from date to text to support flexible formats (YYYY, YYYY-MM, YYYY-MM-DD)
ALTER TABLE family_tree_persons ALTER COLUMN birth_date TYPE text USING birth_date::text;
ALTER TABLE family_tree_persons ALTER COLUMN death_date TYPE text USING death_date::text;
