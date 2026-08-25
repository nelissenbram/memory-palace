import { NextRequest, NextResponse } from "next/server";
import { captureServer } from "@/lib/analytics-server";

export const dynamic = "force-dynamic";

/**
 * /go/<slug> redirect rail (SUCCESS_PLAYBOOK 1.3).
 *
 * Short, memorable outbound links for social bios / posts / newsletters that
 * 302 into the site with clean UTM tags appended, plus a server-side
 * "go_link_hit" event so raw link traffic is measurable even for visitors who
 * never consent to client analytics. Keyed to a synthetic distinct_id
 * ("go-<slug>") — these are pre-identity hits by design.
 *
 * Public route: /go is on the middleware PUBLIC fast-path (no auth).
 */
const SLUGS: Record<string, { to: string; campaign: string }> = {
  reddit: { to: "/", campaign: "reddit" },
  x: { to: "/", campaign: "x" },
  tiktok: { to: "/", campaign: "tiktok" },
  ig: { to: "/", campaign: "instagram" },
  yt: { to: "/", campaign: "youtube" },
  newsletter: { to: "/", campaign: "newsletter" },
  ph: { to: "/", campaign: "producthunt" },
  hn: { to: "/", campaign: "hackernews" },
  gift: { to: "/pricing", campaign: "gift" },
  bio: { to: "/", campaign: "bio" },
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug: rawSlug } = await params;
  const slug = (rawSlug || "").toLowerCase();
  const entry = SLUGS[slug];

  // Unknown slug: land on the homepage untagged rather than 404 a shared link.
  if (!entry) return NextResponse.redirect(new URL("/", req.url), 302);

  const target = entry.to.startsWith("http")
    ? new URL(entry.to)
    : new URL(entry.to, req.url);
  target.searchParams.set("utm_source", slug);
  target.searchParams.set("utm_medium", "social");
  target.searchParams.set("utm_campaign", entry.campaign);

  const ua = req.headers.get("user-agent") || "";
  const device = /Mobi|Android|iPhone|iPad|iPod/i.test(ua) ? "mobile" : "desktop";

  // Awaited (captureServer never throws, 2.5s hard timeout): a fire-and-forget
  // here can be dropped when the serverless invocation ends at the redirect,
  // and lost hits defeat the whole point of the rail.
  await captureServer(`go-${slug}`, "go_link_hit", { slug, ua: device });

  return NextResponse.redirect(target, 302);
}
