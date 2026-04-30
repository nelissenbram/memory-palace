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

interface InterviewRequest {
  interviewId: string;
  questionId: string;
  questionText: string;
  userResponse: string;
  previousResponses: Array<{ questionText: string; response: string }>;
  userName: string;
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

    const body: InterviewRequest = await req.json();
    const { interviewId, questionText, userResponse, previousResponses, userName, locale } = body;
    const languageName = LOCALE_LANGUAGES[locale ?? "en"] || "English";

    if (!userResponse.trim()) {
      return NextResponse.json({ error: "No response provided" }, { status: 400 });
    }

    if (previousResponses && previousResponses.length > 50) {
      return NextResponse.json({ error: "Too many previous responses (max 50)" }, { status: 400 });
    }

    // Input size limits
    if (userResponse.length > 10_000) {
      return NextResponse.json({ error: "Response exceeds 10,000 characters" }, { status: 400 });
    }
    if (questionText && questionText.length > 500) {
      return NextResponse.json({ error: "Question text exceeds 500 characters" }, { status: 400 });
    }
    if (userName && userName.length > 500) {
      return NextResponse.json({ error: "User name exceeds 500 characters" }, { status: 400 });
    }
    for (const r of previousResponses ?? []) {
      if (r.response && r.response.length > 10_000) {
        return NextResponse.json({ error: "A previous response exceeds 10,000 characters" }, { status: 400 });
      }
    }

    const prevContext = previousResponses
      .map((r, i) => `Q${i + 1}: "${r.questionText}"\nTheir answer: "${r.response}"`)
      .join("\n\n");

    const systemPrompt = `You are a warm, gentle interviewer — like a kind friend sitting down for a heartfelt conversation about someone's life. You are helping ${userName || "someone special"} record their life stories for their family.

LANGUAGE REQUIREMENT: You MUST conduct this entire interview in ${languageName}. ALL of your output — the acknowledgment, the follow-up question, the suggested title — MUST be written in ${languageName}. This is non-negotiable. Even if the user's answer or the question text is in a different language, you MUST always respond in ${languageName}.

Your tone:
- Warm and genuinely curious, like a favorite grandparent or a beloved podcast host
- Never rush — acknowledge what was shared before moving on
- Be emotionally present — if they share something moving, honor it
- Use their name occasionally (but not every response)
- Speak naturally, not formally — contractions are fine
- Be specific in your follow-ups — reference details they mentioned
- If they mention a year, person, or place, note it — it matters

IMPORTANT: You must respond with valid JSON only. No other text. Remember: ALL text values in the JSON MUST be in ${languageName}.`;

    const userPrompt = `The interview topic is "${interviewId}".

${prevContext ? `Here's what ${userName || "they"} have shared so far:\n\n${prevContext}\n\n` : ""}The current question was: "${questionText}"

Their answer: "${userResponse}"

Respond with a JSON object containing:
{
  "acknowledgment": "A warm, empathetic 1-2 sentence response acknowledging what they shared. Reference specific details from their answer.",
  "followUp": "A natural, personalized follow-up question based on what they just said. Not from the template — something that flows naturally from their story. Make it open-ended and inviting.",
  "suggestedTitle": "A warm, evocative title (3-6 words) for the memory/story they shared.",
  "peopleMentioned": ["list of people's names or roles mentioned"],
  "datesMentioned": ["any dates or time periods mentioned"],
  "locationsMentioned": ["any places or locations mentioned"],
  "historicalContext": "If they mentioned a specific year or era, provide a brief, interesting historical note (1 sentence). Otherwise, null."
}`;

    // Use assistant prefill to enforce language compliance for non-English locales
    const messages: Array<{ role: string; content: string }> = [
      { role: "user", content: userPrompt },
    ];
    if (locale && locale !== "en") {
      messages.push({ role: "assistant", content: `{"acknowledgment": "` });
    }

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
      console.error(`[ai-interview] API error ${response.status}:`, errText);
      return NextResponse.json({ error: "AI processing failed" }, { status: 502 });
    }

    const data = await response.json();
    let text = data.content?.[0]?.text || "{}";

    // If we used prefill, prepend the partial JSON start
    if (locale && locale !== "en") {
      text = `{"acknowledgment": "` + text;
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Could not parse AI response" }, { status: 500 });
    }

    const result = JSON.parse(jsonMatch[0]);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err: unknown) {
    console.error("[ai-interview] Unexpected error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
