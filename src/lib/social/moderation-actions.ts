"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { ADMIN_EMAILS } from "@/lib/auth/is-admin";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email || !ADMIN_EMAILS.includes(user.email.toLowerCase())) {
    throw new Error("Not authorized");
  }
}

export interface PendingReport {
  id: string;
  target_type: string;
  target_id: string;
  target_user_id: string | null;
  reason: string;
  details: string | null;
  created_at: string;
}

/** List pending content reports, oldest first (act within 24h — Apple 1.2). */
export async function listPendingReports(): Promise<PendingReport[]> {
  await requireAdmin();
  const admin = createAdminClient();
  const { data } = await admin
    .from("content_reports")
    .select("id, target_type, target_id, target_user_id, reason, details, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(200);
  return (data || []) as PendingReport[];
}

/** Direct table for hard-deletable target types. */
const DELETABLE_TABLE: Record<string, string> = {
  comment: "comments",
  memory: "memories",
  wing: "wings",
  room: "rooms",
};

/**
 * Single moderation action driven by a form. op:
 *  - "dismiss": close the report as not-actionable
 *  - "delete": hard-delete the reported content (where it maps to a table)
 *  - "hideOwner": un-publish the offender's palace (eject from public surfaces)
 */
export async function moderateReport(formData: FormData) {
  await requireAdmin();
  const admin = createAdminClient();
  const op = String(formData.get("op") || "");
  const reportId = String(formData.get("reportId") || "");
  const targetType = String(formData.get("targetType") || "");
  const targetId = String(formData.get("targetId") || "");
  const targetUserId = String(formData.get("targetUserId") || "");
  const now = new Date().toISOString();

  if (op === "dismiss") {
    await admin.from("content_reports").update({ status: "dismissed", reviewed_at: now }).eq("id", reportId);
  } else if (op === "delete") {
    const table = DELETABLE_TABLE[targetType];
    if (table && targetId) await admin.from(table).delete().eq("id", targetId);
    await admin.from("content_reports").update({ status: "actioned", reviewed_at: now }).eq("id", reportId);
  } else if (op === "hideOwner") {
    if (targetUserId) await admin.from("profiles").update({ is_public: false }).eq("id", targetUserId);
    await admin.from("content_reports").update({ status: "actioned", reviewed_at: now }).eq("id", reportId);
  }

  revalidatePath("/admin/reports");
}
