-- ============================================================
-- Passcode-protected temporary sharing for wings/rooms
-- Adds passcode column to public_shares table
-- ============================================================

-- Add passcode column (case-insensitive, stored lowercase)
ALTER TABLE public_shares
  ADD COLUMN IF NOT EXISTS passcode TEXT;

-- Add expires_at if not yet present (may already exist from social migration)
ALTER TABLE public_shares
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Add scope if not yet present
ALTER TABLE public_shares
  ADD COLUMN IF NOT EXISTS scope TEXT DEFAULT 'view';

-- Index for fast passcode lookups (lowercase)
CREATE INDEX IF NOT EXISTS idx_public_shares_passcode
  ON public_shares (lower(passcode))
  WHERE passcode IS NOT NULL AND is_active = true;

-- Policy: anyone can read active passcode shares (for validation)
-- This extends the existing "Anyone can read active public shares" policy
-- which already covers is_active = true records.
