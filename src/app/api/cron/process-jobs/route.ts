import { NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import {
  dequeueJobs,
  completeJob,
  failJob,
  retryJob,
} from "@/lib/queue";
import type { Job, JobType } from "@/lib/queue/types";

/**
 * GET /api/cron/process-jobs
 *
 * Cron-triggered worker that claims and processes queued jobs.
 * Runs every 5 minutes (or as configured in vercel.json).
 *
 * Secured via CRON_SECRET header (same pattern as legacy-check).
 */

export const maxDuration = 60;

const BATCH_SIZE = 10;
const RETRY_DELAY_MS = 60_000; // 1 minute backoff for failed jobs

// ── Job handlers ───────────────────────────────────────────
// Placeholder handlers — actual logic will be migrated here
// from dedicated endpoints over time.

type JobHandler = (job: Job) => Promise<void>;

const handlers: Record<JobType, JobHandler> = {
  legacy_delivery: async (job) => {
    console.log(`[JobQueue] Processing legacy_delivery ${job.id}`, job.payload);
    // TODO: migrate logic from /api/legacy/deliver
  },

  digest_email: async (job) => {
    console.log(`[JobQueue] Processing digest_email ${job.id}`, job.payload);
    // TODO: migrate logic from /api/email/digest
  },

  export_zip: async (job) => {
    console.log(`[JobQueue] Processing export_zip ${job.id}`, job.payload);
    // TODO: implement zip export
  },

  notification: async (job) => {
    console.log(`[JobQueue] Processing notification ${job.id}`, job.payload);
    // TODO: migrate logic from /api/notifications/send
  },
};

// ── Route handler ──────────────────────────────────────────

export async function GET(request: Request) {
  // Verify cron secret — fail-closed if not configured
  const CRON_SECRET = process.env.CRON_SECRET;
  if (!CRON_SECRET) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const supabase = createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  const startTime = Date.now();
  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  let timedOut = false;

  // Log execution start
  const { data: logRow } = await supabase
    .from("cron_execution_log")
    .insert({
      job_name: "process-jobs",
      status: "running",
    })
    .select("id")
    .single();

  const logId = logRow?.id;

  try {
    // Claim a batch of pending jobs (all types)
    const jobs = await dequeueJobs(supabase, null, BATCH_SIZE);

    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];

      // 50-second timeout safety (same pattern as other cron endpoints)
      if (Date.now() - startTime > 50_000) {
        timedOut = true;
        // Release this job and all remaining jobs back to pending
        for (let j = i; j < jobs.length; j++) {
          await retryJob(supabase, jobs[j].id, 0);
        }
        break;
      }

      const handler = handlers[job.type as JobType];
      if (!handler) {
        await failJob(supabase, job.id, `Unknown job type: ${job.type}`);
        failed++;
        processed++;
        continue;
      }

      try {
        await handler(job);
        await completeJob(supabase, job.id);
        succeeded++;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[JobQueue] Job ${job.id} (${job.type}) failed:`, message);
        const { isDead } = await failJob(supabase, job.id, message);

        // Schedule retry with exponential backoff if not dead
        if (!isDead) {
          const backoff = RETRY_DELAY_MS * Math.pow(2, job.attempts - 1);
          await retryJob(supabase, job.id, backoff);
        }

        failed++;
      }

      processed++;
    }

    // Update execution log
    if (logId) {
      await supabase
        .from("cron_execution_log")
        .update({
          completed_at: new Date().toISOString(),
          status: timedOut ? "timed_out" : "completed",
          metadata: { processed, succeeded, failed, timedOut },
        })
        .eq("id", logId);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[JobQueue] Worker error:", message);

    if (logId) {
      await supabase
        .from("cron_execution_log")
        .update({
          completed_at: new Date().toISOString(),
          status: "failed",
          errors: 1,
          error_details: { message },
        })
        .eq("id", logId);
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json(
    { processed, succeeded, failed, timedOut },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** Vercel Cron sends GET requests. POST delegates to GET for manual/testing use. */
export async function POST(request: Request) {
  return GET(request);
}
