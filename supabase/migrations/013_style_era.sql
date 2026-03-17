-- Add style_era column to profiles
-- Valid values: 'roman' | 'renaissance'
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS style_era TEXT DEFAULT NULL;

-- Add bust_texture_url for the bust builder feature
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bust_texture_url TEXT DEFAULT NULL;
