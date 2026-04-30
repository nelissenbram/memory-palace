import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkAiConsent } from "@/lib/ai/check-consent";
import { rateLimitStrict, rateLimitHeaders } from "@/lib/rate-limit";

// TODO: Add a first-use consent dialog in the client UI to improve UX
// instead of relying solely on the settings page toggles.

interface TagRequest {
  items: Array<{
    fileName: string;
    fileType: string;
    thumbnailBase64?: string | null;
    exif?: {
      dateTaken?: string;
      lat?: number;
      lng?: number;
      cameraMake?: string;
      cameraModel?: string;
    } | null;
  }>;
  wings: Array<{ id: string; name: string; desc: string; rooms: Array<{ id: string; name: string }> }>;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const rl = await rateLimitStrict(`ai:${user.id}`, 20, 60_000);
    if (!rl.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: rateLimitHeaders(rl) });
    }

    const consent = await checkAiConsent(supabase, user.id);
    if (!consent.ok) {
      return NextResponse.json({ error: consent.error }, { status: 403 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "AI tagging is not configured. Add ANTHROPIC_API_KEY to .env.local." }, { status: 503 });
    }

    const body: TagRequest = await req.json();
    const { items, wings } = body;

    // Batch size limit
    if (!items || items.length > 50) {
      return NextResponse.json({ error: "Too many items (max 50)" }, { status: 400 });
    }

    // Total payload size limit (~7.5 MB decoded)
    const totalBase64Size = items.reduce(
      (sum, item) => sum + (item.thumbnailBase64?.length ?? 0), 0
    );
    if (totalBase64Size > 10_000_000) {
      return NextResponse.json({ error: "Total thumbnail payload too large (max ~7.5 MB)" }, { status: 400 });
    }

    // Input size limits
    for (const item of items ?? []) {
      if (item.fileName && item.fileName.length > 500) {
        return NextResponse.json({ error: "File name exceeds 500 characters" }, { status: 400 });
      }
    }
    for (const w of wings ?? []) {
      if (w.name && w.name.length > 500) {
        return NextResponse.json({ error: "Wing name exceeds 500 characters" }, { status: 400 });
      }
      if (w.desc && w.desc.length > 5_000) {
        return NextResponse.json({ error: "Wing description exceeds 5,000 characters" }, { status: 400 });
      }
    }

    // Build the prompt
    const wingList = wings
      .map((w) => `- Wing "${w.name}" (id: ${w.id}): ${w.desc}. Rooms: ${w.rooms.map((r) => `"${r.name}" (${r.id})`).join(", ")}`)
      .join("\n");

    const itemDescs = items
      .map((item, i) => {
        let desc = `Item ${i + 1}: file="${item.fileName}", type=${item.fileType}`;
        if (item.exif?.dateTaken) desc += `, taken=${item.exif.dateTaken}`;
        if (item.exif?.lat && item.exif?.lng) desc += `, GPS=${item.exif.lat.toFixed(4)},${item.exif.lng.toFixed(4)}`;
        if (item.exif?.cameraMake) desc += `, camera=${item.exif.cameraMake} ${item.exif.cameraModel || ""}`;
        return desc;
      })
      .join("\n");

    // Build messages - include thumbnails as images if available
    const userContent: any[] = [];

    // Add text part
    userContent.push({
      type: "text",
      text: `You are a memory curator for a "Memory Palace" app. Analyze these files and suggest metadata for each.

Available wings and rooms:
${wingList}

Memory display types: photo, video, album, orb, case, voice, document, audio
Note: Use "photo" for all photographs and images. Never use "painting" — that is a manual display option only.

Files to tag:
${itemDescs}

For each item, return a JSON array with objects containing:
- title: A warm, evocative title (not just the filename)
- desc: A short poetic description (1-2 sentences)
- type: Best display type from the list above
- wingId: Most appropriate wing ID
- roomId: Most appropriate room ID within that wing
- locationName: Location name if GPS data available, otherwise empty string
- confidence: 0.0-1.0 how confident you are in the placement

Respond ONLY with a JSON array, no other text.`,
    });

    // Add thumbnail images
    for (let i = 0; i < items.length; i++) {
      const thumb = items[i].thumbnailBase64;
      if (thumb && thumb.startsWith("data:image")) {
        const mediaType = thumb.match(/data:(image\/\w+)/)?.[1] || "image/jpeg";
        const base64Data = thumb.split(",")[1];
        if (base64Data) {
          userContent.push({
            type: "image",
            source: { type: "base64", media_type: mediaType, data: base64Data },
          });
        }
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25_000);
    let response: Response;
    try {
      response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 4096,
          messages: [{ role: "user", content: userContent }],
        }),
        signal: controller.signal,
      });
    } catch (err: any) {
      clearTimeout(timeout);
      if (err?.name === "AbortError") {
        return NextResponse.json({ error: "AI request timed out" }, { status: 504 });
      }
      throw err;
    }
    clearTimeout(timeout);

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[ai-tag] API error ${response.status}:`, errText);
      return NextResponse.json({ error: "AI processing failed" }, { status: 502 });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "[]";

    // Extract JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Could not parse AI response" }, { status: 500 });
    }

    const suggestions = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ suggestions }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err: unknown) {
    console.error("[ai-tag] Unexpected error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
