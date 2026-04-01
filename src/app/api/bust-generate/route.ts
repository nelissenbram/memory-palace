import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkAiConsent } from "@/lib/ai/check-consent";
import Anthropic from "@anthropic-ai/sdk";

// TODO: Add a first-use consent dialog in the client UI to improve UX
// instead of relying solely on the settings page toggles.

/**
 * POST /api/bust-generate
 *
 * Accepts a base64-encoded face photo, extracts facial proportions
 * using Claude Vision, sends them to the Blender microservice,
 * and stores the resulting .glb bust model in Supabase Storage.
 *
 * Body: { image: string (base64 data URL), style?: "roman" | "renaissance" }
 * Returns: { url: string, proportions: object }
 */

const BLENDER_SERVICE_URL = process.env.BLENDER_SERVICE_URL; // e.g. https://bust-generator.fly.dev/generate

export async function POST(req: NextRequest) {
  // ── Auth ──
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // ── AI Consent check (requires both general + biometric) ──
  const consent = await checkAiConsent(supabase, user.id, { requireBiometric: true });
  if (!consent.ok) {
    return NextResponse.json({ error: consent.error }, { status: 403 });
  }

  // ── Parse body ──
  const body = await req.json();
  const { image, style = "roman" } = body as {
    image: string;
    style?: "roman" | "renaissance";
  };

  if (!image) {
    return NextResponse.json({ error: "No image provided" }, { status: 400 });
  }

  // Strip data URL prefix if present
  const base64 = image.replace(/^data:image\/\w+;base64,/, "");
  const mediaType = image.startsWith("data:image/png") ? "image/png" : "image/jpeg";

  // ── Step 1: Extract facial proportions via Claude Vision ──
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 }
    );
  }

  const anthropic = new Anthropic({ apiKey });

  let proportions: Record<string, number>;
  try {
    const visionResponse = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType as "image/png" | "image/jpeg" | "image/gif" | "image/webp",
                data: base64,
              },
            },
            {
              type: "text",
              text: `Analyze this face photo and estimate the following facial proportions as ratios compared to an average face (1.0 = average). Be precise based on what you see.

Return ONLY a JSON object with these keys:
- jaw_width: how wide the jaw is (0.8 = narrow, 1.0 = average, 1.2 = wide)
- forehead_height: forehead height relative to face (0.8 = short, 1.2 = tall)
- nose_length: nose length (0.8 = short, 1.2 = long)
- nose_width: nose width (0.8 = narrow, 1.2 = wide)
- chin_length: chin length (0.8 = short, 1.2 = prominent)
- eye_spacing: distance between eyes (0.9 = close-set, 1.1 = wide-set)
- face_height: overall face elongation (0.9 = round, 1.1 = elongated)
- lip_width: lip width (0.8 = thin, 1.2 = full)
- cheek_width: cheekbone prominence (0.9 = narrow, 1.1 = prominent)

Return ONLY the JSON, no explanation.`,
            },
          ],
        },
      ],
    });

    const text =
      visionResponse.content[0].type === "text"
        ? visionResponse.content[0].text
        : "";

    // Parse JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Could not parse facial proportions" },
        { status: 422 }
      );
    }
    proportions = JSON.parse(jsonMatch[0]);

    // Validate all values are reasonable numbers
    for (const [key, val] of Object.entries(proportions)) {
      if (typeof val !== "number" || val < 0.5 || val > 1.5) {
        proportions[key] = 1.0; // clamp to default
      }
    }
  } catch (err) {
    console.error("[bust-generate] Vision analysis failed:", err);
    return NextResponse.json(
      { error: "Face analysis failed" },
      { status: 422 }
    );
  }

  // ── Step 2: Call Blender microservice ──
  if (!BLENDER_SERVICE_URL) {
    // No Blender service configured — return proportions only
    // The client can store these for when the service is available
    return NextResponse.json({
      proportions,
      status: "proportions_only",
      message:
        "Facial proportions extracted. Blender service not yet configured (set BLENDER_SERVICE_URL).",
    }, {
      headers: { "Cache-Control": "no-store" },
    });
  }

  let glbBuffer: ArrayBuffer;
  try {
    const blenderResponse = await fetch(BLENDER_SERVICE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proportions, style }),
    });

    if (!blenderResponse.ok) {
      const errText = await blenderResponse.text();
      console.error("[bust-generate] Blender service error:", errText);
      return NextResponse.json(
        { error: "Bust generation failed", detail: errText },
        { status: 502 }
      );
    }

    glbBuffer = await blenderResponse.arrayBuffer();
  } catch (err) {
    console.error("[bust-generate] Blender service unreachable:", err);
    return NextResponse.json(
      {
        proportions,
        status: "proportions_only",
        message: "Blender service unreachable. Proportions saved.",
      },
      { status: 200 }
    );
  }

  // ── Step 3: Store .glb in Supabase Storage ──
  const path = `${user.id}/bust_${Date.now()}.glb`;
  const { error: uploadError } = await supabase.storage
    .from("busts")
    .upload(path, Buffer.from(glbBuffer), {
      contentType: "model/gltf-binary",
      upsert: true,
    });

  if (uploadError) {
    console.error("[bust-generate] Storage upload failed:", uploadError);
    return NextResponse.json(
      { error: uploadError.message },
      { status: 500 }
    );
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("busts")
    .getPublicUrl(path);

  const bustUrl = urlData?.publicUrl;

  // ── Step 4: Update profile ──
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ bust_model_url: bustUrl })
    .eq("id", user.id);

  if (profileError) {
    console.error("[bust-generate] Profile update failed:", profileError);
  }

  return NextResponse.json({
    url: bustUrl,
    proportions,
    status: "complete",
  }, {
    headers: { "Cache-Control": "no-store" },
  });
}
