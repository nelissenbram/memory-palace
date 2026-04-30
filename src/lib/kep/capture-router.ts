/**
 * Capture routing job handler.
 * Processes kep_capture jobs: loads capture, runs AI routing, creates memory.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Job } from "@/lib/queue/types";
import { suggestRouting } from "./ai-route";
import { transcribeFromUrl } from "./transcribe";

const CONFIDENCE_THRESHOLD = 0.8;

/**
 * Process a kep_capture job.
 * Called by the process-jobs cron worker.
 */
export async function handleKepCaptureJob(
  supabase: SupabaseClient,
  job: Job,
): Promise<void> {
  const { captureId, kepId, userId } = job.payload as {
    captureId: string;
    kepId: string;
    userId: string;
  };

  // Load the capture
  const { data: capture, error: captureError } = await supabase
    .from("kep_captures")
    .select("*")
    .eq("id", captureId)
    .single();

  if (captureError || !capture) {
    throw new Error(`Capture not found: ${captureId}`);
  }

  if (capture.status !== "pending") {
    // Already processed, skip
    return;
  }

  // Load the kep config
  const { data: kep, error: kepError } = await supabase
    .from("keps")
    .select("*")
    .eq("id", kepId)
    .single();

  if (kepError || !kep) {
    throw new Error(`Kep not found: ${kepId}`);
  }

  // Transcribe audio if needed
  if (capture.media_type === "audio" && capture.media_url && !capture.transcription) {
    try {
      const result = await transcribeFromUrl(capture.media_url, "audio/ogg");
      await supabase
        .from("kep_captures")
        .update({ transcription: result.text })
        .eq("id", captureId);
      capture.transcription = result.text;
    } catch (err) {
      console.error(`[Kep] Transcription failed for ${captureId}:`, err);
      // Continue without transcription
    }
  }

  // If auto-routing is disabled, mark as processed (awaiting manual routing)
  if (!kep.auto_route_enabled) {
    await supabase
      .from("kep_captures")
      .update({ status: "processed" })
      .eq("id", captureId);
    return;
  }

  // Get user's rooms for routing context
  const { data: rooms } = await supabase
    .from("rooms")
    .select("id, name, wing_id, wings(id, name)")
    .eq("user_id", userId);

  if (!rooms || rooms.length === 0) {
    // No rooms to route to — leave as pending
    await supabase
      .from("kep_captures")
      .update({ status: "processed" })
      .eq("id", captureId);
    return;
  }

  // Build room context for AI
  const roomContext = rooms.map((r: Record<string, unknown>) => ({
    wing_id: (r.wings as Record<string, unknown>)?.id as string || r.wing_id as string,
    wing_name: (r.wings as Record<string, unknown>)?.name as string || "Unknown",
    room_id: r.id as string,
    room_name: r.name as string,
  }));

  // Get AI suggestion
  const suggestion = await suggestRouting(
    {
      media_type: capture.media_type,
      transcription: capture.transcription,
      caption: (capture.payload_preview as Record<string, unknown>)?.caption as string || null,
      sender: capture.source_sender,
      timestamp: capture.source_timestamp,
      payload_preview: capture.payload_preview,
    },
    roomContext,
    kep.routing_rules,
  );

  if (suggestion && suggestion.confidence >= CONFIDENCE_THRESHOLD) {
    // High confidence — auto-route to room
    const targetRoomId = suggestion.room_id || kep.default_room_id;
    const targetWingId = suggestion.wing_id || kep.default_wing_id;

    if (targetRoomId) {
      // Create memory in the suggested room
      const { data: memory, error: memError } = await supabase
        .from("memories")
        .insert({
          user_id: userId,
          room_id: targetRoomId,
          title: buildMemoryTitle(capture),
          type: mapMediaTypeToMemoryType(capture.media_type),
          file_url: capture.media_url,
          description: capture.transcription || (capture.payload_preview as Record<string, unknown>)?.text as string || null,
          source_kep_id: kepId,
          source_type: kep.source_type,
          source_sender: capture.source_sender,
        })
        .select("id")
        .single();

      if (memError) {
        throw new Error(`Failed to create memory: ${memError.message}`);
      }

      // Update capture as routed
      await supabase
        .from("kep_captures")
        .update({
          status: "routed",
          memory_id: memory.id,
          ai_suggestion: suggestion,
        })
        .eq("id", captureId);

      // Increment kep counter
      await supabase.rpc("increment_kep_captures", { kep_id: kepId });

      return;
    }
  }

  // Low confidence or no suggestion — store suggestion and mark as processed for review
  await supabase
    .from("kep_captures")
    .update({
      status: "processed",
      ai_suggestion: suggestion,
    })
    .eq("id", captureId);
}

function buildMemoryTitle(capture: Record<string, unknown>): string {
  const preview = capture.payload_preview as Record<string, unknown> | null;
  if (preview?.text) return (preview.text as string).slice(0, 100);
  if (capture.transcription) return (capture.transcription as string).slice(0, 100);
  if (preview?.filename) return preview.filename as string;
  const type = capture.media_type as string || "memory";
  return `${type.charAt(0).toUpperCase() + type.slice(1)} capture`;
}

function mapMediaTypeToMemoryType(mediaType: string | null): string {
  switch (mediaType) {
    case "image": return "photo";
    case "video": return "video";
    case "audio": return "audio";
    case "document": return "document";
    case "text": return "note";
    default: return "note";
  }
}
