-- Add referral code to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referred_by TEXT REFERENCES profiles(referral_code);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_count INTEGER DEFAULT 0;

-- Generate referral codes for existing users
UPDATE profiles SET referral_code = UPPER(SUBSTRING(id::text, 1, 8)) WHERE referral_code IS NULL;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON profiles(referral_code);
