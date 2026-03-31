-- Add preferred_locale to profiles for email i18n
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_locale text DEFAULT 'en';
