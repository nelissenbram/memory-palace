-- ============================================================
-- SECURITY: harden passcode-protected public shares
--   1. Stop exposing the (previously plaintext) `passcode` column — and every
--      slug — to anonymous clients via RLS. The broad
--      "Anyone can read active public shares" SELECT policy let any anon-key
--      client read `select passcode, slug from public_shares where is_active`,
--      fully defeating the passcode gate.
--   2. Migrate any existing plaintext passcodes to a one-way sha256 hash so a
--      future leak can never reveal usable cleartext. The app now stores/reads
--      the hash (see src/lib/social/passcode-actions.ts).
--
-- After this migration:
--   * All PUBLIC/passcode reads go through the server using the service-role
--     client (createAdminOrAnonClient), which selects only non-secret columns
--     and enforces scope/passcode-token checks in code.
--   * OWNERS still read/manage their own rows via the existing
--     "Owners can manage their public shares" policy (auth.uid() = created_by).
-- ============================================================

-- pgcrypto provides digest() for the one-way hash below.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Drop the over-broad anonymous SELECT policy. RLS then denies anon SELECT by
--    default; the app reads these rows with the service-role client instead.
DROP POLICY IF EXISTS "Anyone can read active public shares" ON public.public_shares;

-- 2. One-way hash any existing plaintext passcodes.
--    A sha256 hex digest is always 64 lowercase hex chars, so only rows whose
--    passcode is NOT already a 64-char hex string are treated as plaintext.
--    This is idempotent and safe to re-run.
UPDATE public.public_shares
SET passcode = encode(digest(lower(passcode), 'sha256'), 'hex')
WHERE passcode IS NOT NULL
  AND passcode !~ '^[0-9a-f]{64}$';

-- Note: the passcode index from 012 (idx_public_shares_passcode on
-- lower(passcode)) still works — hashes are already lowercase hex.
