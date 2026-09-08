"use client";

import { useEffect, useRef, useState } from "react";

type Clip = {
  file: string; code: string; family: string; slug: string; mb: number; built: string;
  tests: string | null; carousel: string | null;
};

/**
 * The brief now travels WITH the clip: build-clips writes it into
 * clips-v2/manifest.json and the API serves it. This file used to hold its own
 * copy, which drifted twice — it kept warning about a problem WONDER-04 had
 * already had fixed, and the entire LEGACY family showed up blank because the
 * second place went unedited.
 */

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
          const warn = !!c.tests?.includes("⚠");
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
                {c.tests && (
                  <div style={{ color: warn ? "#E3B85C" : "#9A9184", marginTop: 6 }}>{c.tests}</div>
                )}
                <div style={{ color: "#6B6459", marginTop: 6, fontSize: 11 }}>
                  {c.mb} MB{c.carousel ? ` · carousel: ${c.carousel}` : ""}
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
