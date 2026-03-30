import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface InterviewRequest {
  interviewId: string;
  questionId: string;
  questionText: string;
  userResponse: string;
  previousResponses: Array<{ questionText: string; response: string }>;
  userName: string;
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
      return NextResponse.json({ error: "Interview AI is not configured. Add ANTHROPIC_API_KEY to .env.local." }, { status: 503 });
    }

    const body: InterviewRequest = await req.json();
    const { interviewId, questionText, userResponse, previousResponses, userName } = body;

    if (!userResponse.trim()) {
      return NextResponse.json({ error: "No response provided" }, { status: 400 });
    }

    const prevContext = previousResponses
      .map((r, i) => `Q${i + 1}: "${r.questionText}"\nTheir answer: "${r.response}"`)
      .join("\n\n");

    const systemPrompt = `You are a warm, gentle interviewer — like a kind friend sitting down for a heartfelt conversation about someone's life. You are helping ${userName || "someone special"} record their life stories for their family.

Your tone:
- Warm and genuinely curious, like a favorite grandparent or a beloved podcast host
- Never rush — acknowledge what was shared before moving on
- Be emotionally present — if they share something moving, honor it
- Use their name occasionally (but not every response)
- Speak naturally, not formally — contractions are fine
- Be specific in your follow-ups — reference details they mentioned
- If they mention a year, person, or place, note it — it matters

IMPORTANT: You must respond with valid JSON only. No other text.`;

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
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json({ error: `AI API error: ${response.status} ${errText}` }, { status: response.status });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "{}";

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Could not parse AI response" }, { status: 500 });
    }

    const result = JSON.parse(jsonMatch[0]);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
