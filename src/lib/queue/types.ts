/**
 * Job queue type definitions.
 *
 * Each job type has a corresponding payload interface.
 * When adding a new job type, extend both the union and the payload map.
 */

// ── Job types ──────────────────────────────────────────────

export type JobType =
  | "legacy_delivery"
  | "digest_email"
  | "export_zip"
  | "notification";

// ── Payload shapes per job type ────────────────────────────

export interface LegacyDeliveryPayload {
  userId: string;
  messageIds?: string[];
}

export interface DigestEmailPayload {
  userId: string;
  email: string;
}

export interface ExportZipPayload {
  userId: string;
  roomIds?: string[];
}

export interface NotificationPayload {
  userId: string;
  title: string;
  body: string;
  url?: string;
}

/** Maps each job type to its payload shape. */
export interface JobPayloadMap {
  legacy_delivery: LegacyDeliveryPayload;
  digest_email: DigestEmailPayload;
  export_zip: ExportZipPayload;
  notification: NotificationPayload;
}

// ── Job row (what comes back from the DB) ──────────────────

export type JobStatus = "pending" | "processing" | "completed" | "failed" | "dead";

export interface Job<T extends JobType = JobType> {
  id: string;
  type: T;
  payload: JobPayloadMap[T];
  status: JobStatus;
  priority: number;
  attempts: number;
  max_attempts: number;
  scheduled_for: string;
  started_at: string | null;
  completed_at: string | null;
  failed_at: string | null;
  error: string | null;
  created_at: string;
  created_by: string | null;
}

// ── Enqueue options ────────────────────────────────────────

export interface EnqueueOptions {
  /** Higher = more important. Default 0. */
  priority?: number;
  /** Max retry attempts before marking dead. Default 3. */
  maxAttempts?: number;
  /** Schedule for the future (ISO string or Date). Default now(). */
  scheduledFor?: string | Date;
  /** User who created the job. */
  createdBy?: string;
}
