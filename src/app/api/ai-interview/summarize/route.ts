import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface SummarizeRequest {
  interviewTitle: string;
  responses: Array<{ questionText: string; answer: string }>;
  userName: string;
  writingStyle?: "literary" | "balanced" | "factual";
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

    const body: SummarizeRequest = await req.json();
    const { interviewTitle, responses, userName, writingStyle = "balanced" } = body;

    if (!responses.length) {
      return NextResponse.json({ error: "No responses to summarize" }, { status: 400 });
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

${styleInstructions}

You must return ONLY the narrative text. No JSON, no headers, no formatting instructions.`;

    const userPrompt = `Interview: "${interviewTitle}"
Person: ${userName || "The narrator"}

Here is the full interview transcript:

${transcript}

Please write a beautiful narrative summary that weaves these stories together.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
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
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json({ error: `AI API error: ${response.status} ${errText}` }, { status: response.status });
    }

    const data = await response.json();
    const narrative = data.content?.[0]?.text || "";

    if (!narrative.trim()) {
      return NextResponse.json({ error: "AI returned empty response" }, { status: 500 });
    }

    return NextResponse.json({ narrative: narrative.trim() });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
