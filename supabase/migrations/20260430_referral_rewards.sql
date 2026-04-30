-- Add referral_rewards JSONB column to store earned promo codes
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_rewards JSONB DEFAULT '[]';
