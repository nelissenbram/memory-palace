-- Add bust name and gender columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bust_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bust_gender TEXT DEFAULT 'male';
