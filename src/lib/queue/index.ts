/**
 * Lightweight Supabase-backed job queue.
 *
 * All functions accept a Supabase admin client (service role) so they work
 * in both cron workers and one-off server actions.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Job,
  JobType,
  JobPayloadMap,
  EnqueueOptions,
} from "./types";

// ── Enqueue ────────────────────────────────────────────────

/**
 * Add a job to the queue.
 *
 * @example
 *   await enqueueJob(supabase, "legacy_delivery", { userId: "abc" });
 *   await enqueueJob(supabase, "notification", payload, { priority: 10 });
 */
export async function enqueueJob<T extends JobType>(
  supabase: SupabaseClient,
  type: T,
  payload: JobPayloadMap[T],
  options: EnqueueOptions = {},
): Promise<Job<T>> {
  const scheduledFor =
    options.scheduledFor instanceof Date
      ? options.scheduledFor.toISOString()
      : options.scheduledFor ?? new Date().toISOString();

  const { data, error } = await supabase
    .from("job_queue")
    .insert({
      type,
      payload,
      priority: options.priority ?? 0,
      max_attempts: options.maxAttempts ?? 3,
      scheduled_for: scheduledFor,
      created_by: options.createdBy ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(`enqueueJob failed: ${error.message}`);
  return data as Job<T>;
}

// ── Dequeue ────────────────────────────────────────────────

/**
 * Atomically claim up to `limit` pending jobs of a given type (or all types).
 *
 * Uses the `dequeue_jobs` RPC which performs a SELECT ... FOR UPDATE SKIP LOCKED
 * followed by an UPDATE in a single transaction, preventing concurrent workers
 * from claiming the same job. The RPC also atomically increments `attempts`.
 */
export async function dequeueJobs(
  supabase: SupabaseClient,
  type: JobType | null,
  limit: number = 10,
): Promise<Job[]> {
  const { data, error } = await supabase.rpc("dequeue_jobs", {
    job_type: type,
    batch_size: limit,
  });

  if (error) throw new Error(`dequeueJobs failed: ${error.message}`);
  return (data ?? []) as Job[];
}

// ── Complete ───────────────────────────────────────────────

/** Mark a job as completed. */
export async function completeJob(
  supabase: SupabaseClient,
  jobId: string,
): Promise<void> {
  const { error } = await supabase
    .from("job_queue")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  if (error) throw new Error(`completeJob failed: ${error.message}`);
}

// ── Fail ───────────────────────────────────────────────────

/**
 * Mark a job as failed. If max_attempts is reached, marks as "dead" instead.
 * Returns whether the job is dead (no more retries).
 */
export async function failJob(
  supabase: SupabaseClient,
  jobId: string,
  errorMessage: string,
): Promise<{ isDead: boolean }> {
  // Fetch current state
  const { data: job, error: fetchError } = await supabase
    .from("job_queue")
    .select("attempts, max_attempts")
    .eq("id", jobId)
    .single();

  if (fetchError) throw new Error(`failJob fetch failed: ${fetchError.message}`);

  const isDead = (job.attempts ?? 0) >= (job.max_attempts ?? 3);

  const { error } = await supabase
    .from("job_queue")
    .update({
      status: isDead ? "dead" : "failed",
      failed_at: new Date().toISOString(),
      error: errorMessage,
    })
    .eq("id", jobId);

  if (error) throw new Error(`failJob update failed: ${error.message}`);
  return { isDead };
}

// ── Retry ──────────────────────────────────────────────────

/**
 * Reset a failed job to pending with an optional delay.
 */
export async function retryJob(
  supabase: SupabaseClient,
  jobId: string,
  delayMs: number = 0,
): Promise<void> {
  const scheduledFor = new Date(Date.now() + delayMs).toISOString();

  const { error } = await supabase
    .from("job_queue")
    .update({
      status: "pending",
      scheduled_for: scheduledFor,
      started_at: null,
      failed_at: null,
      error: null,
    })
    .eq("id", jobId);

  if (error) throw new Error(`retryJob failed: ${error.message}`);
}

// ── Cleanup ────────────────────────────────────────────────

/**
 * Delete completed and dead jobs older than `olderThanDays` days.
 * Returns the count of deleted rows.
 */
export async function cleanupOldJobs(
  supabase: SupabaseClient,
  olderThanDays: number = 30,
): Promise<number> {
  if (olderThanDays <= 0) {
    throw new Error("cleanupOldJobs: olderThanDays must be positive");
  }

  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString();

  const { count, error } = await supabase
    .from("job_queue")
    .delete({ count: "exact" })
    .in("status", ["completed", "dead"])
    .lt("created_at", cutoff);

  if (error) throw new Error(`cleanupOldJobs failed: ${error.message}`);
  return count ?? 0;
}
