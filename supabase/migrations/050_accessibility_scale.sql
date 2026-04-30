-- Convert accessibility_mode from boolean to text with 3 graduated levels
-- Backward compat: true → 'large', false → 'standard'

ALTER TABLE profiles
  ALTER COLUMN accessibility_mode TYPE text
  USING CASE WHEN accessibility_mode = true THEN 'large' ELSE 'standard' END;

ALTER TABLE profiles
  ALTER COLUMN accessibility_mode SET DEFAULT 'standard';

ALTER TABLE profiles
  ADD CONSTRAINT chk_accessibility_mode
  CHECK (accessibility_mode IN ('standard', 'comfortable', 'large'));
