/**
 * AI-powered routing for Kep captures.
 * Uses Claude Haiku to classify captures into palace rooms.
 */

import type { AiRoutingSuggestion } from "@/types/kep";

interface RoomContext {
  wing_id: string;
  wing_name: string;
  room_id: string;
  room_name: string;
  room_description?: string;
}

interface CaptureContext {
  media_type: string | null;
  transcription?: string | null;
  caption?: string | null;
  sender?: string | null;
  timestamp?: string | null;
  payload_preview?: Record<string, unknown> | null;
}

/**
 * Ask Claude Haiku to suggest the best room for a capture.
 */
export async function suggestRouting(
  capture: CaptureContext,
  rooms: RoomContext[],
  routingRules?: unknown[],
): Promise<AiRoutingSuggestion | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("[Kep AI] ANTHROPIC_API_KEY not configured");
    return null;
  }

  if (rooms.length === 0) return null;

  const roomList = rooms
    .map((r) => `- ${r.wing_name} > ${r.room_name}${r.room_description ? ` (${r.room_description})` : ""} [wing:${r.wing_id}, room:${r.room_id}]`)
    .join("\n");

  const captureDesc = buildCaptureDescription(capture);

  const systemPrompt = `You are a memory classification assistant for a Memory Palace app. Users store memories in themed rooms within wings. Your job is to suggest the best room for a new captured memory.

Available rooms:
${roomList}

${routingRules && routingRules.length > 0 ? `User-defined routing preferences:\n${JSON.stringify(routingRules)}\n` : ""}

Respond with ONLY a JSON object (no markdown, no explanation):
{
  "wing_id": "<wing uuid>",
  "wing_name": "<wing name>",
  "room_id": "<room uuid>",
  "room_name": "<room name>",
  "confidence": <0.0 to 1.0>,
  "reasoning": "<brief reason>"
}

If you cannot determine a good match (nothing fits), set confidence to 0.0.`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 256,
        messages: [
          {
            role: "user",
            content: `Classify this captured memory:\n\n${captureDesc}`,
          },
        ],
        system: systemPrompt,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      console.error(`[Kep AI] API error: ${res.status}`);
      return null;
    }

    const data = await res.json();
    const text = data.content?.[0]?.text;
    if (!text) return null;

    // Parse JSON response
    const suggestion = JSON.parse(text) as AiRoutingSuggestion;

    // Validate the suggested room exists
    const validRoom = rooms.find(
      (r) => r.room_id === suggestion.room_id || r.wing_id === suggestion.wing_id,
    );
    if (!validRoom) {
      console.warn("[Kep AI] Suggested room not in available rooms");
      return null;
    }

    return suggestion;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      console.error("[Kep AI] Request timed out");
    } else {
      console.error("[Kep AI] Error:", err);
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Batch-suggest routing for multiple captures.
 * More efficient than individual calls.
 */
export async function suggestRoutingBatch(
  captures: CaptureContext[],
  rooms: RoomContext[],
  routingRules?: unknown[],
): Promise<(AiRoutingSuggestion | null)[]> {
  // For batches of 5 or fewer, make individual calls
  // (Claude handles these well and individual results are more reliable)
  const results = await Promise.all(
    captures.map((c) => suggestRouting(c, rooms, routingRules)),
  );
  return results;
}

function buildCaptureDescription(capture: CaptureContext): string {
  const parts: string[] = [];

  if (capture.media_type) parts.push(`Type: ${capture.media_type}`);
  if (capture.sender) parts.push(`From: ${capture.sender}`);
  if (capture.timestamp) parts.push(`Time: ${capture.timestamp}`);
  if (capture.transcription) parts.push(`Transcription: "${capture.transcription}"`);
  if (capture.caption) parts.push(`Caption: "${capture.caption}"`);
  if (capture.payload_preview) {
    const preview = capture.payload_preview;
    if (preview.text) parts.push(`Text: "${preview.text}"`);
    if (preview.filename) parts.push(`Filename: ${preview.filename}`);
    if (preview.labels) parts.push(`Labels: ${JSON.stringify(preview.labels)}`);
  }

  return parts.join("\n") || "No description available";
}
