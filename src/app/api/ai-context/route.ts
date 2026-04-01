import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkAiConsent } from "@/lib/ai/check-consent";
import { checkRateLimit } from "@/lib/integrations/helpers";

// TODO: Add a first-use consent dialog in the client UI to improve UX
// instead of relying solely on the settings page toggles.

interface ContextRequest {
  title: string;
  description?: string;
  date?: string; // ISO date string or year
  location?: string;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (!checkRateLimit(`ai:${user.id}`, 20, 60_000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const consent = await checkAiConsent(supabase, user.id);
    if (!consent.ok) {
      return NextResponse.json({ error: consent.error }, { status: 403 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI context is not configured. Add ANTHROPIC_API_KEY to .env.local." },
        { status: 503 }
      );
    }

    const body: ContextRequest = await req.json();
    const { title, description, date, location } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: "Memory title is required" }, { status: 400 });
    }

    // Input size limits
    if (title.length > 500) {
      return NextResponse.json({ error: "Title exceeds 500 characters" }, { status: 400 });
    }
    if (description && description.length > 5_000) {
      return NextResponse.json({ error: "Description exceeds 5,000 characters" }, { status: 400 });
    }
    if (location && location.length > 500) {
      return NextResponse.json({ error: "Location exceeds 500 characters" }, { status: 400 });
    }

    // Extract year from date
    let year: string | null = null;
    if (date) {
      const parsed = new Date(date);
      if (!isNaN(parsed.getTime())) {
        year = parsed.getFullYear().toString();
      } else if (/^\d{4}$/.test(date)) {
        year = date;
      }
    }

    const systemPrompt = `You are a warm, nostalgic storyteller who helps people understand what the world was like when their memories were made. You paint a vivid picture of the era — not a dry history lesson, but a warm, personal snapshot of the times.

Your tone:
- Warm and conversational, like a friend reminiscing
- Specific and vivid — mention real songs, movies, prices, events
- Keep it personal: "Back in [year]..." or "In [year], the world was..."
- Mix the big (world events) with the small (what things cost, what was on TV)
- If a location is given, include something specific to that place

IMPORTANT: Keep your response to 2-3 short paragraphs, maximum 300 words total. No headers or bullet points — just flowing, warm prose.`;

    const datePart = year ? `The memory is from ${year}.` : "No specific date is known for this memory.";
    const locationPart = location ? `It took place in or near ${location}.` : "";
    const descPart = description ? `Additional context: "${description}"` : "";

    const userPrompt = `Generate historical context for this memory:

Title: "${title}"
${datePart}
${locationPart}
${descPart}

Write 2-3 short paragraphs about what the world was like around that time. Include things like:
- Major world events or cultural moments
- Popular music, movies, or TV shows
- What everyday things cost (gas, movie tickets, etc.)
- Technology of the era
- If a location is mentioned, something specific to that place

Keep it warm, personal, and under 300 words. No markdown formatting.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[ai-context] API error ${response.status}:`, errText);
      return NextResponse.json(
        { error: "AI processing failed" },
        { status: 502 }
      );
    }

    const data = await response.json();
    const context = data.content?.[0]?.text || "";

    if (!context.trim()) {
      return NextResponse.json({ error: "AI returned empty response" }, { status: 500 });
    }

    return NextResponse.json({ context: context.trim() }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err: unknown) {
    console.error("[ai-context] Unexpected error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
