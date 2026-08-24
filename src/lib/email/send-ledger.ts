import type { SupabaseClient } from "@supabase/supabase-js";

export type LifecycleEmailType = "weekly" | "monthly" | "winback";

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
