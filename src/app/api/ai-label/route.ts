import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkAiConsent } from "@/lib/ai/check-consent";
import { rateLimitStrict, rateLimitHeaders } from "@/lib/rate-limit";

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
    } else {
      // URL-based image
      if (imageUrl.length > 2048) {
        return NextResponse.json({ error: "Image URL too long" }, { status: 400 });
      }
      userContent.push({
        type: "image",
        source: { type: "url", url: imageUrl },
      });
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

    const response = await fetch("https://api.anthropic.com/v1/messages", {
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
    });

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
