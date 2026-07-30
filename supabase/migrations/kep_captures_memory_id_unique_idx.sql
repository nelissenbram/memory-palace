-- Hard, race-proof backstop for the non-idempotent capture handler (P1). App-level atomic claim already prevents duplicates; this makes duplicate memory linkage impossible at the storage layer without risking legitimate flows (partial index ignores the many NULL memory_id rows).

-- Defense-in-depth idempotency backstop for kep capture -> memory linkage.
-- The app now atomically claims each capture (status pending -> processing), so at
-- most one job creates a memory per capture. This unique index guarantees the DB
-- rejects a second memory linkage for the same capture even if the app guard is
-- ever bypassed or two memories somehow get linked to one capture.
CREATE UNIQUE INDEX IF NOT EXISTS kep_captures_memory_id_unique_idx
  ON public.kep_captures (memory_id)
  WHERE memory_id IS NOT NULL;
