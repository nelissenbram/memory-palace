-- Add AI feature consent columns to profiles table (GDPR compliance)
-- Both default to false: users must explicitly opt in to AI processing.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS ai_consent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_biometric_consent BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN profiles.ai_consent IS 'User has consented to general AI features (tagging, context, interviews)';
COMMENT ON COLUMN profiles.ai_biometric_consent IS 'User has consented to biometric AI processing (bust generator with facial data)';
