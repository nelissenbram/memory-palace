import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface SummarizeRequest {
  interviewTitle: string;
  responses: Array<{ questionText: string; answer: string }>;
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

    const body: SummarizeRequest = await req.json();
    const { interviewTitle, responses, userName } = body;

    if (!responses.length) {
      return NextResponse.json({ error: "No responses to summarize" }, { status: 400 });
    }

    const transcript = responses
      .map((r, i) => `Question ${i + 1}: "${r.questionText}"\n${userName || "They"} said: "${r.answer}"`)
      .join("\n\n---\n\n");

    const systemPrompt = `You are a gifted writer creating a beautiful, intimate narrative from someone's life interview. Your writing should feel like the opening pages of a beloved memoir — warm, vivid, and deeply personal.

Style:
- Write in third person ("${userName}" or "they")
- 3-5 paragraphs, roughly 200-400 words
- Use specific details and quotes from what they shared
- Weave the answers together into a cohesive narrative — don't just summarize each answer separately
- Start with something evocative — a scene, a feeling, a moment
- End with something meaningful — a reflection, a hope, a connection to the future
- The tone should be reverent but not stiff — like a beautifully written family history
- If they shared emotions, honor them in the writing

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
