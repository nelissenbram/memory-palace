import type { SupabaseClient } from "@supabase/supabase-js";

// "drip-day-N" entries (N = 1|3|7|14) close the drip double-send hole
// (SUCCESS_PLAYBOOK 1.4): the day is part of the type so a day-1 stamp never
// bars the legitimate day-3 send two days later.
export type LifecycleEmailType = "weekly" | "monthly" | "winback" | `drip-day-${number}`;

/** Rolling window (days) for the "≤1 lifecycle email per user" ceiling. */
export const LEDGER_WINDOW_DAYS = 6;

/**
 * Returns the Set of user IDs (from `candidateIds`) who have received ANY
 * lifecycle email (weekly | monthly | winback) within the last
 * `windowDays`. These users are barred from another lifecycle send this run —
 * the belt-and-suspenders on top of the disjoint active/silent cohorts.
 *
 * Fails CLOSED per-batch: if a read errors we cannot prove a user is clear, so
 * we bar the whole batch rather than risk a double-send / re-earning a pause.
 * The number of ids barred purely due to read errors is returned separately so
 * a caller can surface "0 sent because the ledger was down" instead of it
 * looking like a silent quiet week.
 */
export async function fetchRecentlyEmailed(
  supabase: SupabaseClient,
  candidateIds: string[],
  now: Date,
  windowDays = LEDGER_WINDOW_DAYS,
): Promise<{ barred: Set<string>; readFailures: number }> {
  const barred = new Set<string>();
  let readFailures = 0;
  if (candidateIds.length === 0) return { barred, readFailures };

  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - windowDays);
  const cutoffISO = cutoff.toISOString();

  const batchSize = 500;
  for (let i = 0; i < candidateIds.length; i += batchSize) {
    const batch = candidateIds.slice(i, i + batchSize);
    const { data, error } = await supabase
      .from("email_send_log")
      .select("user_id")
      .in("user_id", batch)
      // Scope to the lifecycle trio: drip-day-N stamps share this table but are
      // onboarding mail, not the "≤1 lifecycle email" ceiling — a day-3 drip
      // must not silently cancel a user's first weekly digest.
      .in("email_type", ["weekly", "monthly", "winback"])
      .gte("sent_at", cutoffISO);
    if (error) {
      console.error("[SendLedger] read failed, barring batch:", error.message);
      for (const id of batch) barred.add(id);
      readFailures += batch.length;
      continue;
    }
    for (const row of (data || []) as Array<{ user_id: string }>) {
      barred.add(row.user_id);
    }
  }
  return { barred, readFailures };
}

/**
 * Like fetchRecentlyEmailed(), but scoped to ONE email_type — used by the drip
 * cron so a redeploy/cron overlap can never re-send the SAME drip day to the
 * same user within the rolling window, while still allowing the next drip day
 * (1→3 is only 2 days apart) to go out on schedule.
 *
 * Fails CLOSED per-batch, mirroring fetchRecentlyEmailed: an unreadable ledger
 * bars the batch rather than risking a double-send.
 */
export async function fetchRecentSendsOfType(
  supabase: SupabaseClient,
  candidateIds: string[],
  emailType: LifecycleEmailType,
  now: Date,
  windowDays = LEDGER_WINDOW_DAYS,
): Promise<{ barred: Set<string>; readFailures: number }> {
  const barred = new Set<string>();
  let readFailures = 0;
  if (candidateIds.length === 0) return { barred, readFailures };

  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - windowDays);
  const cutoffISO = cutoff.toISOString();

  const batchSize = 500;
  for (let i = 0; i < candidateIds.length; i += batchSize) {
    const batch = candidateIds.slice(i, i + batchSize);
    const { data, error } = await supabase
      .from("email_send_log")
      .select("user_id")
      .in("user_id", batch)
      .eq("email_type", emailType)
      .gte("sent_at", cutoffISO);
    if (error) {
      console.error(`[SendLedger] read(${emailType}) failed, barring batch:`, error.message);
      for (const id of batch) barred.add(id);
      readFailures += batch.length;
      continue;
    }
    for (const row of (data || []) as Array<{ user_id: string }>) {
      barred.add(row.user_id);
    }
  }
  return { barred, readFailures };
}

/**
 * Stamp the ledger after a successful send. Best-effort: a failed insert logs
 * but does not fail the email (distinct cron minutes + the rolling window make
 * a missed stamp low-risk). Call ONLY on result.success.
 */
export async function logLifecycleSend(
  supabase: SupabaseClient,
  userId: string,
  emailType: LifecycleEmailType,
): Promise<void> {
  const { error } = await supabase
    .from("email_send_log")
    .insert({ user_id: userId, email_type: emailType });
  if (error) {
    console.error(`[SendLedger] insert(${emailType}) failed for ${userId}:`, error.message);
  }
}
