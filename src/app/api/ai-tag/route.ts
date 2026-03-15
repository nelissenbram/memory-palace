import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "AI tagging is not configured. Add ANTHROPIC_API_KEY to .env.local." }, { status: 503 });
    }

    const body: TagRequest = await req.json();
    const { items, wings } = body;

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

Memory display types: photo, video, album, orb, case, voice, document, painting, audio

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

    const response = await fetch("https://api.anthropic.com/v1/messages", {
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
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json({ error: `Claude API error: ${response.status} ${errText}` }, { status: response.status });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "[]";

    // Extract JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Could not parse AI response" }, { status: 500 });
    }

    const suggestions = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ suggestions });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
