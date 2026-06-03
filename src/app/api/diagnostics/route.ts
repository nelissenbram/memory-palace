import { NextRequest, NextResponse } from "next/server";

/**
 * Diagnostic endpoint for debugging native app loading issues.
 * Receives client-side diagnostics from the inline boot script.
 * Temporary — remove after Apple approval.
 */

const logs: Array<{ ts: string; data: Record<string, unknown> }> = [];

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const entry = { ts: new Date().toISOString(), data };
    logs.push(entry);
    // Keep only last 50 entries in memory
    if (logs.length > 50) logs.shift();
    console.log("[DIAG]", JSON.stringify(entry));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json(logs);
}
