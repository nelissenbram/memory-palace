import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";
import { checkPhotoRestoreQuota, incrementPhotoRestore } from "@/lib/auth/plan-limits";
import { captureServer } from "@/lib/analytics-server";

// Restore/enhance an OLD photo via Replicate (GFPGAN face+photo restoration).
// Security posture (learned from the v2 audit):
//  - Ownership: the memory must belong to the caller (.eq user_id) — no IDOR read.
//  - No SSRF: the image URL is taken from the user's OWN memory row, never from the
//    request body, so we never fetch an attacker-supplied host.
//  - Quota: free = 10 lifetime, keeper = 50/mo, guardian = 200/mo (checkPhotoRestoreQuota),
//    incremented only after a successful restore.

const MODEL = "tencentarc/gfpgan"; // model-scoped endpoint runs the latest version

async function getQuota() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return { user, quota: await checkPhotoRestoreQuota(user.id) };
}

export async function GET(request: NextRequest) {
  const ctx = await getQuota();
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  return NextResponse.json({ quota: ctx.quota });
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = await rateLimit(`ai-enhance:${ip}`, 20, 60_000);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: rateLimitHeaders(rl) });
  }

  if (!process.env.REPLICATE_API_TOKEN) {
    return NextResponse.json({ error: "Photo restore is not configured yet." }, { status: 503 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let body: { memoryId?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }
  const memoryId = typeof body.memoryId === "string" ? body.memoryId : "";
  if (!memoryId) return NextResponse.json({ error: "memoryId required" }, { status: 400 });

  // Ownership-scoped fetch: only the caller's own photo.
  const { data: memory } = await supabase
    .from("memories")
    .select("id, file_url, type, user_id")
    .eq("id", memoryId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!memory) return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  const imageUrl = (memory as { file_url?: string }).file_url || "";
  if ((memory as { type?: string }).type !== "photo" || !/^https?:\/\//.test(imageUrl)) {
    return NextResponse.json({ error: "Only stored photos can be restored." }, { status: 422 });
  }

  // Quota gate (does not increment yet).
  const quota = await checkPhotoRestoreQuota(user.id);
  if (!quota.allowed) {
    return NextResponse.json({ error: "quota_exceeded", quota }, { status: 429 });
  }

  // Call Replicate. Prefer:wait returns synchronously (up to ~60s); poll as a fallback.
  const token = process.env.REPLICATE_API_TOKEN;
  let prediction: { status?: string; output?: unknown; error?: unknown; urls?: { get?: string } };
  try {
    const res = await fetch(`https://api.replicate.com/v1/models/${MODEL}/predictions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "wait" },
      body: JSON.stringify({ input: { img: imageUrl, version: "v1.4", scale: 2 } }),
    });
    prediction = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: "Restore service error", detail: prediction?.error || null }, { status: 502 });
    }
    // Fallback polling if not finished within the wait window.
    let tries = 0;
    while (prediction.status && ["starting", "processing"].includes(prediction.status) && prediction.urls?.get && tries < 30) {
      await new Promise((r) => setTimeout(r, 2000));
      const poll = await fetch(prediction.urls.get, { headers: { Authorization: `Bearer ${token}` } });
      prediction = await poll.json();
      tries++;
    }
  } catch {
    return NextResponse.json({ error: "Restore service unreachable" }, { status: 502 });
  }

  if (prediction.status !== "succeeded" || !prediction.output) {
    return NextResponse.json({ error: "Restore failed", detail: prediction?.error || null }, { status: 502 });
  }
  const restoredUrl = Array.isArray(prediction.output) ? String(prediction.output[0]) : String(prediction.output);

  // Count it only on success.
  await incrementPhotoRestore(user.id);
  const after = await checkPhotoRestoreQuota(user.id);

  // Milestone: a paid-feature usage signal (photo restore drives upgrades). The
  // used/limit let us see quota-pressure → upgrade in one PostHog funnel.
  void captureServer(user.id, "photo_restore_used", { used: after.used, limit: after.limit, period: after.period });

  // NOTE: restoredUrl is a Replicate-hosted URL valid for ~1h. The client shows the
  // before/after and, on Save, persists it through the normal upload flow.
  return NextResponse.json({ ok: true, originalUrl: imageUrl, restoredUrl, quota: after });
}
