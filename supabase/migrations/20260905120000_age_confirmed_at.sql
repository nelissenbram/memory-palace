-- ═══ LEG-015: server-side age attestation (16+) ═══
-- Adds profiles.age_confirmed_at, the authoritative timestamp of the user's
-- self-declared 16+ attestation (fixed 16 floor = strictest member-state
-- threshold; owner decision 2026-09-05).
--
-- How it is populated:
--   * Email sign-ups: signUp() (src/lib/auth/actions.ts) rejects registration
--     without the attestation and passes `age_confirmed_at` in the signup
--     metadata; the handle_new_user trigger below copies it into the profile.
--   * OAuth sign-ups (Google/Apple): no attestation exists at account creation.
--     The auth callback gates accounts created on/after 2026-09-05 that lack
--     the timestamp to /auth/confirm-age, where confirmAge() stamps it.
--   * Existing users: intentionally NOT backfilled and NOT gated — the column
--     stays NULL for accounts created before 2026-09-05 (we cannot fabricate
--     an attestation that was never explicitly recorded server-side).
-- Idempotent: safe to re-run.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS age_confirmed_at timestamptz;

-- Extend the profile-creation trigger (latest definition: 040_fix_profile_trigger.sql)
-- to copy the attestation timestamp from the signup metadata. The value is set
-- server-side by signUp(); OAuth providers never send it, so it stays NULL there.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, age_confirmed_at)
  VALUES (
    new.id,
    COALESCE(
      new.raw_user_meta_data ->> 'display_name',
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      ''
    ),
    -- Defensive cast: never let a malformed metadata value break user creation.
    (
      SELECT CASE
        WHEN (new.raw_user_meta_data ->> 'age_confirmed_at') ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}'
        THEN (new.raw_user_meta_data ->> 'age_confirmed_at')::timestamptz
        ELSE NULL
      END
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;
