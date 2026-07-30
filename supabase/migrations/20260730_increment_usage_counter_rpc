-- Finding 3 (auto-tag quota TOCTOU): the app used a non-atomic read-then-upsert that let concurrent free-tier requests each read used=0, pass the 5/day gate, and each pay for a 50-image Vision call. This RPC does the increment + limit-check + floor in one locked statement so the quota is enforced atomically. reserveAutoTagQuota() calls it BEFORE the paid call (fails closed on RPC error); refundAutoTagCount() calls it with a negative delta on failure. Server-side guard already added in code; the RPC is required for true atomicity. NOTE: the ADD CONSTRAINT line is only needed if the unique constraint does not already exist — if it does, remove that statement (it will error as a duplicate).

-- Atomic upsert-increment for usage_counters. Single statement inside a
-- plpgsql function => no read-then-write TOCTOU. Enforces a per-day limit when
-- p_limit is provided (only applies the increment if it would not exceed the
-- limit), and floors the counter at 0 (so refunds with a negative delta can
-- never drive it below zero). Returns the current/new counter total and whether
-- the increment was applied.
--
-- Assumes usage_counters has columns (user_id uuid, counter_key text,
-- counter_date date, counter_value int) with a UNIQUE constraint on
-- (user_id, counter_key, counter_date). If that unique constraint is missing,
-- add it first (see the ADD CONSTRAINT below) or ON CONFLICT will error.

ALTER TABLE public.usage_counters
  ADD CONSTRAINT usage_counters_user_key_date_uniq
  UNIQUE (user_id, counter_key, counter_date);

CREATE OR REPLACE FUNCTION public.increment_usage_counter(
  p_user_id uuid,
  p_counter_key text,
  p_counter_date date,
  p_delta int,
  p_limit int DEFAULT NULL
)
RETURNS TABLE (new_value int, allowed boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current int;
  v_new int;
BEGIN
  -- Lock/read the existing row for this (user, key, date) if present.
  SELECT counter_value INTO v_current
  FROM public.usage_counters
  WHERE user_id = p_user_id
    AND counter_key = p_counter_key
    AND counter_date = p_counter_date
  FOR UPDATE;

  IF v_current IS NULL THEN
    v_current := 0;
  END IF;

  v_new := v_current + p_delta;
  IF v_new < 0 THEN
    v_new := 0;
  END IF;

  -- Enforce the limit only for positive increments (reservations). Refunds
  -- (negative delta) always apply.
  IF p_limit IS NOT NULL AND p_delta > 0 AND v_new > p_limit THEN
    RETURN QUERY SELECT v_current, false;
    RETURN;
  END IF;

  INSERT INTO public.usage_counters (user_id, counter_key, counter_date, counter_value)
  VALUES (p_user_id, p_counter_key, p_counter_date, v_new)
  ON CONFLICT (user_id, counter_key, counter_date)
  DO UPDATE SET counter_value = EXCLUDED.counter_value;

  RETURN QUERY SELECT v_new, true;
END;
$$;

-- Allow authenticated users (the session client) to call the RPC.
GRANT EXECUTE ON FUNCTION public.increment_usage_counter(uuid, text, date, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_usage_counter(uuid, text, date, int, int) TO service_role;
