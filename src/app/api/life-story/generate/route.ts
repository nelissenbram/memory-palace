import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimitStrict, rateLimitHeaders } from "@/lib/rate-limit";
import { checkAiConsent } from "@/lib/ai/check-consent";

// Life Story: weave a chapter's prose from the user's OWN memories + interview
// material via the Anthropic API.
// Security posture (mirrors /api/ai-enhance):
//  - Ownership: chapter, memories, and interview sessions are all fetched with
//    .eq("user_id", user.id) — the client-supplied chapterId is never trusted.
//  - Cost control: strict per-user rate limit (fails closed in prod without Redis).
//  - Stable error CODES only ({ error: "rate_limited" | "not_found" |
//    "not_configured" | "generation_failed" }) — the client maps them to
//    localized copy; no locale-specific strings leak from the server.

const MODEL = "claude-sonnet-4-6";
const MAX_MEMORIES = 40;
const MAX_INTERVIEW_CHARS = 8_000;
// Chapter-specific interviews (template id `lifestory-${chapterId}`) are always
// included in full; this hard ceiling only guards against pathological prompt
// sizes when a user has recorded many long interviews for one chapter.
const MAX_INTERVIEW_CHARS_HARD = 24_000;

const LOCALE_LANGUAGES: Record<string, string> = {
  en: "English",
  nl: "Dutch",
  de: "German",
  es: "Spanish",
  fr: "French",
};

interface ChapterRow {
  id: string;
  title: string;
  period_label: string | null;
  memory_ids: string[] | null;
}

interface MemoryRow {
  title: string | null;
  description: string | null;
  type: string | null;
  created_at: string | null;
}

interface InterviewResponse {
  questionId?: string;
  transcript?: string;
}

interface InterviewSessionRow {
  id: string;
  interview_template_id: string | null;
  narrative_summary: string | null;
  responses: InterviewResponse[] | null;
  completed_at: string | null;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Auth — same server Supabase client pattern as ai-enhance.
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // AI processing is opt-in (settings promise) — gate the AI weave too.
    const consent = await checkAiConsent(supabase, user.id);
    if (!consent.ok) {
      return NextResponse.json({ error: "ai_consent_required" }, { status: 403 });
    }

    // 2. Rate limit: cost-sensitive AI route → strict limiter, 5 req/min per user.
    const rl = await rateLimitStrict(`life-story:${user.id}`, 5, 60_000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "rate_limited" },
        { status: 429, headers: rateLimitHeaders(rl) },
      );
    }

    let body: { chapterId?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    const chapterId = typeof body.chapterId === "string" ? body.chapterId : "";
    if (!chapterId) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    // 3. Ownership-scoped chapter fetch — never trust client ownership.
    const { data: chapter } = await supabase
      .from("life_story_chapters")
      .select("id, title, period_label, memory_ids")
      .eq("id", chapterId)
      .eq("user_id", user.id)
      .maybeSingle<ChapterRow>();
    if (!chapter) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    // 4. Attached memories — owner-scoped, capped.
    const memoryIds = (chapter.memory_ids ?? []).slice(0, MAX_MEMORIES);
    let memories: MemoryRow[] = [];
    if (memoryIds.length > 0) {
      const { data } = await supabase
        .from("memories")
        .select("title, description, type, created_at")
        .in("id", memoryIds)
        .eq("user_id", user.id)
        .limit(MAX_MEMORIES);
      memories = (data as MemoryRow[] | null) ?? [];
    }

    // 5. Interview material — completed sessions only, capped to a safe prompt size.
    // Chapter-specific interviews (recorded from this chapter's card, template
    // id `lifestory-${chapterId}`) are fetched separately so they are never
    // pushed out of the newest-20 window, included FIRST and IN FULL; the
    // remaining char budget is then filled with the newest other sessions.
    const chapterTemplateId = `lifestory-${chapter.id}`;
    const SESSION_COLUMNS = "id, interview_template_id, narrative_summary, responses, completed_at";
    const [{ data: chapterSessionsData }, { data: sessionsData }] = await Promise.all([
      supabase
        .from("interview_sessions")
        .select(SESSION_COLUMNS)
        .eq("user_id", user.id)
        .eq("status", "completed")
        .eq("interview_template_id", chapterTemplateId)
        .order("completed_at", { ascending: false })
        .limit(10),
      supabase
        .from("interview_sessions")
        .select(SESSION_COLUMNS)
        .eq("user_id", user.id)
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(20),
    ]);
    const chapterSessions = (chapterSessionsData as InterviewSessionRow[] | null) ?? [];
    const chapterSessionIds = new Set(chapterSessions.map((s) => s.id));
    const otherSessions = ((sessionsData as InterviewSessionRow[] | null) ?? [])
      .filter((s) => !chapterSessionIds.has(s.id) && s.interview_template_id !== chapterTemplateId);

    const sessionBlock = (session: InterviewSessionRow): string | null => {
      const parts: string[] = [];
      if (session.narrative_summary) {
        parts.push(`Summary: ${session.narrative_summary}`);
      }
      for (const r of session.responses ?? []) {
        if (r?.transcript) parts.push(`They said: "${r.transcript}"`);
      }
      if (parts.length === 0) return null;
      const label = session.interview_template_id === chapterTemplateId
        ? "Interview recorded specifically for THIS chapter"
        : `Interview (${session.interview_template_id ?? "session"})`;
      return `--- ${label} ---\n${parts.join("\n")}\n`;
    };

    let interviewExcerpts = "";
    for (const session of chapterSessions) {
      const block = sessionBlock(session);
      if (block) interviewExcerpts += block; // always in full — no budget break
    }
    for (const session of otherSessions) {
      if (interviewExcerpts.length >= MAX_INTERVIEW_CHARS) break;
      const block = sessionBlock(session);
      if (block) interviewExcerpts += block;
    }
    interviewExcerpts = interviewExcerpts.slice(0, MAX_INTERVIEW_CHARS_HARD);

    // 6. Locale for the output language.
    const { data: profile } = await supabase
      .from("profiles")
      .select("preferred_locale")
      .eq("id", user.id)
      .maybeSingle<{ preferred_locale: string | null }>();
    const locale = profile?.preferred_locale || "en";
    const languageName = LOCALE_LANGUAGES[locale] || "English";

    // 7. Configuration gate.
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "not_configured" }, { status: 503 });
    }

    // 8. Weave the chapter (same direct-fetch pattern as /api/ai-interview).
    const systemPrompt = `You are a warm, skilled biographer weaving a chapter of someone's life story from the material they have gathered.

LANGUAGE REQUIREMENT: Write the ENTIRE chapter in ${languageName}. This is non-negotiable, even if some of the provided material is in another language.

Your task and constraints:
- Write in the FIRST PERSON, as the user telling their own story.
- Flowing prose — warm, dignified, and easy to read for a 60+ heritage audience.
- Use ONLY the provided material (the chapter title, the period, the attached memories, and the interview excerpts). Do NOT invent facts, names, dates, places, or events that are not in the material.
- If the material is sparse, write a shorter, honest chapter rather than embellishing.
- Length: 300-600 words.
- No headings, no lists, no meta-commentary — just the chapter prose itself.`;

    const memoryLines = memories
      .map((m) => {
        const date = m.created_at ? m.created_at.slice(0, 10) : "unknown date";
        const desc = m.description ? ` — ${m.description}` : "";
        return `- [${m.type ?? "memory"}, ${date}] ${m.title ?? "Untitled"}${desc}`;
      })
      .join("\n");

    const userPrompt = `Chapter title: "${chapter.title}"
Period of life: ${chapter.period_label || "not specified"}

Attached memories (${memories.length}):
${memoryLines || "(none attached)"}

Interview excerpts:
${interviewExcerpts || "(no interview material)"}

Please write this chapter of my life story now.`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
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
          model: MODEL,
          max_tokens: 2000,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        }),
        signal: controller.signal,
      });
    } catch {
      clearTimeout(timeout);
      return NextResponse.json({ error: "generation_failed" }, { status: 502 });
    }
    clearTimeout(timeout);

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[life-story] API error ${response.status}:`, errText);
      return NextResponse.json({ error: "generation_failed" }, { status: 502 });
    }

    const data: { content?: Array<{ type?: string; text?: string }> } = await response.json();
    const content = (data.content ?? [])
      .filter((block) => block.type === "text" && typeof block.text === "string")
      .map((block) => block.text)
      .join("")
      .trim();
    if (!content) {
      return NextResponse.json({ error: "generation_failed" }, { status: 502 });
    }

    // 9. Persist — owner-scoped update, then return the woven chapter.
    const { error: updateError } = await supabase
      .from("life_story_chapters")
      .update({ content, updated_at: new Date().toISOString() })
      .eq("id", chapter.id)
      .eq("user_id", user.id);
    if (updateError) {
      console.error("[life-story] Failed to save chapter content:", updateError.message);
      return NextResponse.json({ error: "generation_failed" }, { status: 502 });
    }

    return NextResponse.json({ content }, { headers: { "Cache-Control": "no-store" } });
  } catch (err: unknown) {
    console.error("[life-story] Unexpected error:", err);
    return NextResponse.json({ error: "generation_failed" }, { status: 502 });
  }
}
