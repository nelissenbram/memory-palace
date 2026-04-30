import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkAiConsent } from "@/lib/ai/check-consent";
import { rateLimitStrict, rateLimitHeaders } from "@/lib/rate-limit";

// TODO: Add a first-use consent dialog in the client UI to improve UX
// instead of relying solely on the settings page toggles.

const LOCALE_LANGUAGES: Record<string, string> = {
  en: "English",
  nl: "Dutch",
  de: "German",
  es: "Spanish",
  fr: "French",
};

interface SummarizeRequest {
  interviewTitle: string;
  responses: Array<{ questionText: string; answer: string }>;
  userName: string;
  writingStyle?: "literary" | "balanced" | "factual";
  locale?: string;
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
      return NextResponse.json({ error: "Interview AI is not configured. Add ANTHROPIC_API_KEY to .env.local." }, { status: 503 });
    }

    const body: SummarizeRequest = await req.json();
    const { interviewTitle, responses, userName, writingStyle = "balanced", locale } = body;
    const languageName = LOCALE_LANGUAGES[locale ?? "en"] || "English";

    if (!responses.length) {
      return NextResponse.json({ error: "No responses to summarize" }, { status: 400 });
    }

    // Input size limits
    if (interviewTitle && interviewTitle.length > 500) {
      return NextResponse.json({ error: "Interview title exceeds 500 characters" }, { status: 400 });
    }
    if (userName && userName.length > 500) {
      return NextResponse.json({ error: "User name exceeds 500 characters" }, { status: 400 });
    }
    const totalTranscriptLength = responses.reduce(
      (sum, r) => sum + (r.questionText?.length ?? 0) + (r.answer?.length ?? 0), 0
    );
    if (totalTranscriptLength > 50_000) {
      return NextResponse.json({ error: "Transcript exceeds 50,000 characters" }, { status: 400 });
    }

    const transcript = responses
      .map((r, i) => `Question ${i + 1}: "${r.questionText}"\n${userName || "They"} said: "${r.answer}"`)
      .join("\n\n---\n\n");

    const styleInstructions = writingStyle === "literary"
      ? `Your writing should feel like the opening pages of a beloved memoir — vivid, evocative, and deeply literary.

Style:
- Write in third person ("${userName}" or "they")
- 4-6 paragraphs, roughly 300-500 words
- Use rich, sensory language — paint scenes with color, sound, and feeling
- Weave the answers into a flowing narrative with literary transitions
- Start with an evocative scene-setting moment
- Use metaphor and imagery where it feels natural
- End with something poetic — a reflection that lingers
- The tone should be warm and reverent — like a beautifully crafted memoir
- Feel free to expand on emotional moments with descriptive prose`
      : writingStyle === "factual"
      ? `Your writing should be clear, warm, and grounded — staying close to their actual words and experiences.

Style:
- Write in third person ("${userName}" or "they")
- 2-4 paragraphs, roughly 150-300 words
- Stay close to what they actually said — use their own words and phrases where possible
- Present events and details in a clear, chronological way
- Keep descriptions simple and direct — no embellishment
- Include specific names, dates, and places they mentioned
- The tone should be warm but understated — like a well-written family chronicle
- Do not add imagery or scenes they didn't describe themselves`
      : `Your writing should feel like the opening pages of a beloved memoir — warm, vivid, and deeply personal.

Style:
- Write in third person ("${userName}" or "they")
- 3-5 paragraphs, roughly 200-400 words
- Use specific details and quotes from what they shared
- Weave the answers together into a cohesive narrative — don't just summarize each answer separately
- Start with something evocative — a scene, a feeling, a moment
- End with something meaningful — a reflection, a hope, a connection to the future
- The tone should be reverent but not stiff — like a beautifully written family history
- If they shared emotions, honor them in the writing`;

    const systemPrompt = `You are a gifted writer creating a narrative from someone's life interview.

LANGUAGE REQUIREMENT: You MUST write the entire narrative in ${languageName}. Every single word of your output MUST be in ${languageName}. This is non-negotiable. Even if the interview transcript contains text in other languages, your narrative MUST be written entirely in ${languageName}.

${styleInstructions}

You must return ONLY the narrative text. No JSON, no headers, no formatting instructions. Remember: the ENTIRE output must be in ${languageName}.`;

    const userPrompt = `Interview: "${interviewTitle}"
Person: ${userName || "The narrator"}

Here is the full interview transcript:

${transcript}

Please write a beautiful narrative summary that weaves these stories together.`;

    // For non-English locales, add a prefill hint to ensure the narrative starts in the right language
    const LOCALE_STARTERS: Record<string, string> = {
      nl: "Het verhaal van ",
      de: "Die Geschichte von ",
      es: "La historia de ",
      fr: "L'histoire de ",
    };
    const messages: Array<{ role: string; content: string }> = [
      { role: "user", content: userPrompt },
    ];
    const starter = locale ? LOCALE_STARTERS[locale] : undefined;
    if (starter) {
      messages.push({ role: "assistant", content: starter });
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
          max_tokens: 2048,
          temperature: writingStyle === "literary" ? 1.0 : writingStyle === "factual" ? 0.3 : 0.7,
          system: systemPrompt,
          messages,
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
      console.error(`[ai-interview/summarize] API error ${response.status}:`, errText);
      return NextResponse.json({ error: "AI processing failed" }, { status: 502 });
    }

    const data = await response.json();
    let narrative = data.content?.[0]?.text || "";

    // Prepend the prefill starter if used
    if (starter) {
      narrative = starter + narrative;
    }

    if (!narrative.trim()) {
      return NextResponse.json({ error: "AI returned empty response" }, { status: 500 });
    }

    return NextResponse.json({ narrative: narrative.trim() }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err: unknown) {
    console.error("[ai-interview/summarize] Unexpected error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
