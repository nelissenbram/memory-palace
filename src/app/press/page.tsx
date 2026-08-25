import type { Metadata } from "next";
import Link from "next/link";

/**
 * /press — canonical press & asset kit (SUCCESS_PLAYBOOK Pillar 4 §1).
 * Deliberately English-only: this page is an outbound asset for journalists
 * and directory submissions, not an in-app surface. All downloadable files
 * live in /public/press so they are plain static URLs.
 */

export const metadata: Metadata = {
  title: "Press Kit | The Memory Palace",
  description:
    "Press kit for The Memory Palace — where memories become a place your loved ones can visit. Logos, screenshots, blurbs, founder story and contact.",
  alternates: { canonical: "https://thememorypalace.ai/press" },
  openGraph: {
    title: "The Memory Palace — Press Kit",
    description: "Memories become a place your loved ones can visit. Logos, imagery, blurbs and founder contact.",
    url: "https://thememorypalace.ai/press",
    images: [{ url: "/api/og?title=Press%20Kit&subtitle=Logos%2C%20imagery%2C%20blurbs%20and%20founder%20contact", width: 1200, height: 630 }],
  },
};

const cream = "#FCFAF5";
const charcoal = "#1F1B1A";
const walnut = "#8B7355";
const gold = "#D4AF37";

const ASSETS: { file: string; label: string }[] = [
  { file: "logo-palace-gold.png", label: "Temple logo mark — gold" },
  { file: "logo-palace-ember.png", label: "Temple logo mark — ember" },
  { file: "app-icon-512.png", label: "App icon (512 px)" },
  { file: "app-icon-1024.png", label: "App icon (1024 px)" },
  { file: "still-garden-atelier.jpg", label: "Palace imagery — garden atelier" },
  { file: "still-blossom-gate.jpg", label: "Palace imagery — blossom gate" },
  { file: "still-coastal-camper.jpg", label: "Palace imagery — coastal camper" },
  { file: "still-wood-workshop.jpg", label: "Palace imagery — wood workshop" },
  { file: "press.md", label: "This kit as a one-pager (Markdown)" },
];

const sectionTitle: React.CSSProperties = {
  fontFamily: "Georgia, serif",
  fontSize: "1.375rem",
  color: charcoal,
  margin: "2.5rem 0 0.75rem",
};

const body: React.CSSProperties = {
  fontSize: "1rem",
  lineHeight: 1.65,
  color: "#3d3733",
  margin: "0 0 1rem",
};

export default function PressPage() {
  return (
    <main style={{ background: cream, minHeight: "100vh" }}>
      <div style={{ maxWidth: "46rem", margin: "0 auto", padding: "3rem 1.25rem 5rem" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/press/logo-palace-gold.png" alt="The Memory Palace logo" style={{ width: "3.5rem", height: "auto" }} />
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: "2.25rem", color: charcoal, margin: "1rem 0 0.5rem" }}>
          The Memory Palace — Press Kit
        </h1>
        <p style={{ ...body, color: walnut, fontSize: "1.125rem" }}>
          A 3D memory palace for your family&rsquo;s photos, voices and stories — a Tuscan villa you
          actually walk through, where every memory hangs on a wall.
        </p>
        <div style={{ width: "5rem", height: "0.1875rem", background: `linear-gradient(90deg, ${gold}, transparent)`, borderRadius: "0.125rem" }} />

        <h2 style={sectionTitle}>What it is</h2>
        <p style={body}>
          The Memory Palace turns a family&rsquo;s scattered photos, voice notes and stories into rooms
          of a 3D villa you walk through in the browser or the app. Send a photo or a 20-second voice
          note to Kep on WhatsApp and it&rsquo;s hanging on your wall the same day. Guided voice
          interviews turn spoken answers into a written life story, AI restoration revives damaged old
          photos, and relatives can be invited to add a second voice to the same room. Built in the EU
          (Antwerp), GDPR-first, in five languages.
        </p>
        <p style={body}>
          Walk a real palace, no signup: <Link href="/explore" style={{ color: walnut }}>thememorypalace.ai/explore</Link>{" "}
          — example palaces there are built with our demo tooling and free to screenshot for coverage.
        </p>

        <h2 style={sectionTitle}>The story hook: eight Apple rejections</h2>
        <p style={body}>
          The Memory Palace was rejected by Apple&rsquo;s App Review eight times before approval in July
          2026 — a months-long saga spanning in-app purchases, sign-in flows, iPad layouts and
          anti-steering rules, all navigated by a solo founder. The app that finally shipped is the same
          3D villa that was there on day one.
        </p>

        <h2 style={sectionTitle}>Founder</h2>
        <p style={body}>
          <strong>Bram</strong> — solo founder, Antwerp, Belgium. Built The Memory Palace end-to-end:
          the 3D engine work, the WhatsApp capture bot, the AI restoration pipeline and the
          family-sharing layer. &ldquo;If it breaks, email me — I answer.&rdquo;
        </p>

        <h2 style={sectionTitle}>Blurbs</h2>
        <p style={body}><strong>50 chars:</strong> A 3D palace for your family&rsquo;s memories.</p>
        <p style={body}>
          <strong>150 chars:</strong> The Memory Palace turns your family&rsquo;s photos and stories
          into a 3D villa you walk through. WhatsApp a photo to Kep — it&rsquo;s on the wall tonight.
        </p>

        <h2 style={sectionTitle}>Assets</h2>
        <ul style={{ ...body, paddingLeft: "1.25rem" }}>
          {ASSETS.map((a) => (
            <li key={a.file} style={{ marginBottom: "0.375rem" }}>
              <a href={`/press/${a.file}`} download style={{ color: walnut }}>
                {a.label}
              </a>{" "}
              <span style={{ color: "#9b9188", fontSize: "0.875rem" }}>({a.file})</span>
            </li>
          ))}
        </ul>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(10rem, 1fr))", gap: "0.75rem", margin: "1rem 0" }}>
          {ASSETS.filter((a) => a.file.endsWith(".jpg")).map((a) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={a.file}
              src={`/press/${a.file}`}
              alt={a.label}
              loading="lazy"
              style={{ width: "100%", height: "8rem", objectFit: "cover", borderRadius: "0.5rem", border: `1px solid ${gold}40` }}
            />
          ))}
        </div>

        <h2 style={sectionTitle}>Contact</h2>
        <p style={body}>
          <a href="mailto:bram@elyphont.com" style={{ color: walnut }}>bram@elyphont.com</a> — direct
          line to the founder. Interviews, demo walkthroughs and review accounts on request.
        </p>
        <p style={{ ...body, fontSize: "0.875rem", color: "#9b9188" }}>
          <Link href="/" style={{ color: walnut }}>Home</Link>
          {" · "}
          <Link href="/explore" style={{ color: walnut }}>Explore</Link>
          {" · "}
          <a href="https://play.google.com/store/apps/details?id=ai.thememorypalace.app" style={{ color: walnut }}>Google Play</a>
          {" · "}
          <Link href="/pricing" style={{ color: walnut }}>Pricing</Link>
        </p>
      </div>
    </main>
  );
}
