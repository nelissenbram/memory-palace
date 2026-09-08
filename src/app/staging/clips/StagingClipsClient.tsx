"use client";

import { useEffect, useRef, useState } from "react";

type Clip = {
  file: string; code: string; family: string; slug: string; mb: number; built: string;
};

/**
 * What each clip is testing, from docs/CLIP_CATALOG.md. Shown next to the video
 * because "does the message land?" is not answerable without knowing what the
 * message was meant to be — the catalogue's hypothesis is the acceptance
 * criterion, not the prettiness of the footage.
 */
const NOTES: Record<string, { tests: string; carousel: string }> = {
  "WONDER-01a": { tests: "Baseline: a plain question hook + exterior-to-interior arc.", carousel: "upload" },
  "WONDER-02": { tests: "Two words, one shot. Crane up the facade from the approach road: the scale is the subject.", carousel: "scroll: atrium" },
  "WONDER-03": { tests: "Architecture as metaphor: doors = chapters. Opens on two readable plaquettes rather than naming rooms you cannot read.", carousel: "family tree · legacy · milestones" },
  "WONDER-04": { tests: "A stat hook inside a wonder clip. Walks ALONG the salon hang, then into a room, so the photographs are visible before 'zero folders' is claimed.", carousel: "organise" },
  "WONDER-05": { tests: "The growth mechanic as the wonder — transformation, not a tour. Four match cuts from one camera pose.", carousel: "scroll: library" },
  "WONDER-06": { tests: "Confession hook + reverse reveal: photo first, palace second.", carousel: "memory" },
  "WONDER-07": { tests: "Process vs finished-space footage. The corridor lengthens as rooms are added, and closes on a hung photograph.", carousel: "capture" },
  "WONDER-08": { tests: "Hushed sanctuary vs spectacle — can low stimulation hold attention?", carousel: "scroll: keps" },
  "WONDER-09": { tests: "Tech-flex: one unbroken palace take, 'no signup'. The hook no longer claims 'no cuts' — the clip now has one.", carousel: "discover" },
  "WONDER-10": { tests: "One specific image as the whole clip — a plaquette: every photo carries a title and a year. Replaced the bronze nest, which was specific but said nothing.", carousel: "memory" },
};

export default function StagingClipsClient() {
  const [clips, setClips] = useState<Clip[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [solo, setSolo] = useState<string | null>(null);
  const vids = useRef<Record<string, HTMLVideoElement | null>>({});

  const load = () => {
    setClips(null);
    fetch("/api/staging/clips", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => (j.error ? setErr(`${j.error} (${j.dir})`) : setClips(j.clips)))
      .catch((e) => setErr(String(e)));
  };
  useEffect(load, []);

  /** Only one plays at a time — ten autoplaying 9:16 videos is unreviewable. */
  const playOnly = (code: string) => {
    for (const [c, v] of Object.entries(vids.current)) {
      if (!v) continue;
      if (c === code) { v.play().catch(() => {}); } else { v.pause(); }
    }
    setSolo(code);
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#0B0A08", color: "#EAE2D4",
      fontFamily: "system-ui, sans-serif", padding: "22px 26px 60px",
    }}>
      <h1 style={{ fontSize: 19, margin: 0, color: "#C8A868", letterSpacing: .4 }}>
        CLIP LIBRARY · dev
      </h1>
      <p style={{ fontSize: 13, color: "#9A9184", maxWidth: 820, margin: "8px 0 0", lineHeight: 1.6 }}>
        Everything in socials-kit/clips-v2, in catalogue order. Click a clip to play
        it — only one plays at a time. Each card carries the hypothesis that clip is
        supposed to test, so you are judging it against its brief rather than on
        looks alone.
      </p>

      <div style={{ display: "flex", gap: 10, alignItems: "center", margin: "16px 0 22px" }}>
        <button onClick={load} style={btn}>Reload</button>
        {clips && (
          <span style={{ fontSize: 13, color: "#7B7367" }}>
            {clips.length} clips · {clips.reduce((s, c) => s + c.mb, 0).toFixed(0)} MB total
          </span>
        )}
      </div>

      {err && <p style={{ color: "#F0876A" }}>{err}</p>}
      {!clips && !err && <p style={{ color: "#9A9184" }}>Loading…</p>}

      <div style={{
        display: "grid", gap: 18,
        gridTemplateColumns: "repeat(auto-fill, minmax(268px, 1fr))",
      }}>
        {(clips || []).map((c) => {
          const n = NOTES[c.code];
          const warn = n?.tests.startsWith("⚠") || n?.tests.includes("⚠");
          return (
            <div key={c.file} style={{
              background: "#17140F", borderRadius: 14, overflow: "hidden",
              border: `1px solid ${solo === c.code ? "#C8A868" : warn ? "#B08A3C" : "rgba(200,168,104,.26)"}`,
            }}>
              <video
                ref={(el) => { vids.current[c.code] = el; }}
                src={`/api/staging/clips?file=${encodeURIComponent(c.file)}`}
                controls
                preload="metadata"
                playsInline
                onPlay={() => playOnly(c.code)}
                style={{ width: "100%", display: "block", background: "#000", aspectRatio: "9/16" }}
              />
              <div style={{ padding: "10px 12px", fontSize: 12, lineHeight: 1.5 }}>
                <div style={{ color: "#EAE2D4", fontWeight: 600 }}>
                  {c.code} <span style={{ color: "#8C8477", fontWeight: 400 }}>· {c.slug}</span>
                </div>
                {n && (
                  <div style={{ color: warn ? "#E3B85C" : "#9A9184", marginTop: 6 }}>{n.tests}</div>
                )}
                <div style={{ color: "#6B6459", marginTop: 6, fontSize: 11 }}>
                  {c.mb} MB{n ? ` · carousel: ${n.carousel}` : ""}
                </div>
                {/* Build time, shown because this whole project lost days to
                    assets that looked current and were not. If a clip did not
                    rebuild when you expected it to, this is where you see it. */}
                <div style={{ color: "#585349", marginTop: 3, fontSize: 11 }}>
                  built {new Date(c.built).toLocaleString(undefined, {
                    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const btn: React.CSSProperties = {
  padding: "7px 14px", borderRadius: 9, cursor: "pointer", fontSize: 13,
  background: "rgba(200,168,104,.14)", color: "#EAE2D4",
  border: "1px solid rgba(200,168,104,.4)",
};
