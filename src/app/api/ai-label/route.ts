import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkAiConsent } from "@/lib/ai/check-consent";
import { rateLimitStrict, rateLimitHeaders } from "@/lib/rate-limit";
import { isR2Configured, r2Download } from "@/lib/storage/r2";

interface LabelRequest {
  imageUrl: string;
  memoryTitle?: string;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const rl = await rateLimitStrict(`ai-label:${user.id}`, 30, 60_000);
    if (!rl.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: rateLimitHeaders(rl) });
    }

    const consent = await checkAiConsent(supabase, user.id);
    if (!consent.ok) {
      return NextResponse.json({ error: consent.error }, { status: 403 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "AI labeling is not configured. Add ANTHROPIC_API_KEY to .env.local." }, { status: 503 });
    }

    const body: LabelRequest = await req.json();
    const { imageUrl, memoryTitle } = body;

    if (!imageUrl) {
      return NextResponse.json({ error: "imageUrl is required" }, { status: 400 });
    }

    // Build the user content with the image
    const userContent: any[] = [];

    // Add the image
    if (imageUrl.startsWith("data:image")) {
      const mediaType = imageUrl.match(/data:(image\/\w+)/)?.[1] || "image/jpeg";
      const base64Data = imageUrl.split(",")[1];
      if (base64Data) {
        // Limit base64 payload to ~7.5 MB
        if (base64Data.length > 10_000_000) {
          return NextResponse.json({ error: "Image too large (max ~7.5 MB)" }, { status: 400 });
        }
        userContent.push({
          type: "image",
          source: { type: "base64", media_type: mediaType, data: base64Data },
        });
      }
    } else if (imageUrl.startsWith("/api/media/")) {
      // Read directly from storage — avoids self-fetch auth issues
      const segments = imageUrl.replace(/^\/api\/media\//, "").split("/");
      if (segments.length < 2) {
        return NextResponse.json({ error: "Invalid media URL" }, { status: 400 });
      }
      const bucket = segments[0] as "memories" | "busts";
      const filePath = segments.slice(1).join("/");
      try {
        let buf: Buffer;
        let contentType: string;
        if (isR2Configured()) {
          const result = await r2Download(bucket, filePath);
          // Consume the stream (may be Node.js Readable or Web ReadableStream)
          const chunks: Uint8Array[] = [];
          const reader = (result.data as any);
          if (typeof reader[Symbol.asyncIterator] === "function") {
            for await (const chunk of reader) {
              chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
            }
          } else if (reader.getReader) {
            const r = reader.getReader();
            while (true) {
              const { done, value } = await r.read();
              if (done) break;
              chunks.push(value);
            }
          }
          buf = Buffer.concat(chunks);
          contentType = result.contentType || "image/jpeg";
        } else {
          const { data, error } = await supabase.storage.from(bucket).download(filePath);
          if (error || !data) {
            console.error("[ai-label] Storage download error:", error);
            return NextResponse.json({ error: "Could not fetch image from storage" }, { status: 400 });
          }
          buf = Buffer.from(await data.arrayBuffer());
          contentType = data.type || "image/jpeg";
        }
        if (buf.length === 0) {
          return NextResponse.json({ error: "Empty image file" }, { status: 400 });
        }
        const b64 = buf.toString("base64");
        if (b64.length > 10_000_000) {
          return NextResponse.json({ error: "Image too large (max ~7.5 MB)" }, { status: 400 });
        }
        userContent.push({
          type: "image",
          source: { type: "base64", media_type: contentType, data: b64 },
        });
      } catch (storageErr) {
        console.error("[ai-label] Storage read error:", storageErr);
        return NextResponse.json({ error: "Could not fetch image from storage" }, { status: 400 });
      }
    } else {
      if (imageUrl.length > 2048) {
        return NextResponse.json({ error: "Image URL too long" }, { status: 400 });
      }
      try {
        const imgRes = await fetch(imageUrl);
        if (!imgRes.ok) {
          console.error("[ai-label] Image fetch failed:", imageUrl, imgRes.status);
          return NextResponse.json({ error: "Could not fetch image" }, { status: 400 });
        }
        const contentType = imgRes.headers.get("content-type") || "image/jpeg";
        const buf = await imgRes.arrayBuffer();
        const b64 = Buffer.from(buf).toString("base64");
        if (b64.length > 10_000_000) {
          return NextResponse.json({ error: "Image too large (max ~7.5 MB)" }, { status: 400 });
        }
        userContent.push({
          type: "image",
          source: { type: "base64", media_type: contentType, data: b64 },
        });
      } catch {
        return NextResponse.json({ error: "Could not fetch image from URL" }, { status: 400 });
      }
    }

    // Add the prompt
    const titleHint = memoryTitle ? `The memory is titled "${memoryTitle}".` : "";
    userContent.push({
      type: "text",
      text: `You are a memory curator for a "Memory Palace" app. Analyze this photo and generate:
1. A brief, evocative description (1-2 sentences) that captures the mood, content, and significance of the image.
2. A list of 3-6 relevant tags/labels for the image.

${titleHint}

Respond ONLY with a JSON object (no other text) in this exact format:
{"description": "Your evocative description here", "labels": ["label1", "label2", "label3"]}`,
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);
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
          max_tokens: 1024,
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
      console.error(`[ai-label] API error ${response.status}:`, errText);
      return NextResponse.json({ error: "AI processing failed" }, { status: 502 });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "{}";

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Could not parse AI response" }, { status: 500 });
    }

    const result = JSON.parse(jsonMatch[0]);
    return NextResponse.json({
      description: result.description || "",
      labels: Array.isArray(result.labels) ? result.labels : [],
    }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err: unknown) {
    console.error("[ai-label] Unexpected error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
