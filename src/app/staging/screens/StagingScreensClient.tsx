"use client";

import { useEffect, useRef, useState } from "react";

type Screen = {
  id: string; file: string; md5: string; bytes: number;
  captured: string; usp: string[]; dupeWith: string[];
};

/**
 * Two facts are worth showing next to every screenshot, because both failure
 * modes here were INVISIBLE in a file listing:
 *
 *  - dupeWith  an md5 match. Server-computed, so it is a fact, not a guess.
 *  - detail    measured in the browser: distinct quantised colours plus mean
 *              edge energy over a downsampled copy. A screen caught mid-load is
 *              a few flat placeholder blocks, so it scores far below a real one.
 *              This is a HEURISTIC and is labelled as such — it points your eye
 *              at a suspect, it does not decide.
 */
function useDetail(src: string) {
  const [d, setD] = useState<{ colors: number; edge: number } | null>(null);
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const W = 120, H = Math.max(1, Math.round((img.height / img.width) * W));
      const c = document.createElement("canvas");
      c.width = W; c.height = H;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, W, H);
      const px = ctx.getImageData(0, 0, W, H).data;
      const seen = new Set<number>();
      let edge = 0, n = 0;
      const lum = (i: number) => 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const i = (y * W + x) * 4;
          // quantise to 5 bits/channel: ignores compression noise, keeps hues
          seen.add(((px[i] >> 3) << 10) | ((px[i + 1] >> 3) << 5) | (px[i + 2] >> 3));
          if (x + 1 < W && y + 1 < H) {
            edge += Math.abs(lum(i) - lum(i + 4)) + Math.abs(lum(i) - lum(i + W * 4));
            n++;
          }
        }
      }
      setD({ colors: seen.size, edge: n ? edge / n : 0 });
    };
    img.src = src;
  }, [src]);
  return d;
}

function Card({ s, onOpen }: { s: Screen; onOpen: (s: Screen) => void }) {
  const src = `/api/staging/screens?file=${encodeURIComponent(s.file)}`;
  const d = useDetail(src);
  const thin = d !== null && (d.colors < 900 || d.edge < 3.2);
  const bad = s.dupeWith.length > 0;

  return (
    <div style={{
      background: "#17140F", borderRadius: 14, overflow: "hidden",
      border: `1px solid ${bad ? "#C0553A" : thin ? "#B08A3C" : "rgba(200,168,104,.28)"}`,
    }}>
      <button
        onClick={() => onOpen(s)}
        style={{
          display: "block", width: "100%", padding: 0, border: 0, cursor: "zoom-in",
          background: "#0C0A08", lineHeight: 0,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={s.id} style={{ width: "100%", display: "block" }} />
      </button>
      <div style={{ padding: "10px 12px", fontSize: 12, lineHeight: 1.55 }}>
        <div style={{ color: "#EAE2D4", fontWeight: 600 }}>{s.id}</div>
        <div style={{ color: "#8C8477" }}>
          {s.usp.length ? s.usp.join(" · ") : "— untagged —"}
        </div>
        {bad && (
          <div style={{ color: "#F0876A", marginTop: 6 }}>
            ⚠ identical to {s.dupeWith.join(", ")}
          </div>
        )}
        {!bad && thin && (
          <div style={{ color: "#E3B85C", marginTop: 6 }}>
            ⚠ looks thin — check for skeleton loaders
          </div>
        )}
        <div style={{ color: "#6B6459", marginTop: 6, fontSize: 11 }}>
          {(s.bytes / 1024).toFixed(0)} kB
          {d && <> · {d.colors} colours · edge {d.edge.toFixed(1)}</>}
        </div>
      </div>
    </div>
  );
}

export default function StagingScreensClient() {
  const [data, setData] = useState<Screen[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState<Screen | null>(null);
  const [onlyBad, setOnlyBad] = useState(false);
  const dlg = useRef<HTMLDivElement>(null);

  const load = () => {
    setData(null);
    fetch("/api/staging/screens", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => (j.error ? setErr(`${j.error} (${j.dir})`) : setData(j.screens)))
      .catch((e) => setErr(String(e)));
  };
  useEffect(load, []);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);

  const dupes = data ? data.filter((s) => s.dupeWith.length).length : 0;
  const shown = data ? (onlyBad ? data.filter((s) => s.dupeWith.length) : data) : [];

  return (
    <div style={{
      minHeight: "100vh", background: "#0B0A08", color: "#EAE2D4",
      fontFamily: "system-ui, sans-serif", padding: "22px 26px 60px",
    }}>
      <h1 style={{ fontSize: 19, margin: 0, color: "#C8A868", letterSpacing: .4 }}>
        SCREEN LIBRARY · dev
      </h1>
      <p style={{ fontSize: 13, color: "#9A9184", maxWidth: 760, margin: "8px 0 0", lineHeight: 1.6 }}>
        The app screenshots the clip phone-inlays draw from (socials-kit/screens),
        captured from the Apple Review demo account. Click any card to enlarge.
        Red = byte-identical to another screen. Amber = low detail, so possibly
        photographed while the page was still loading.
      </p>

      <div style={{ display: "flex", gap: 10, alignItems: "center", margin: "16px 0 20px", flexWrap: "wrap" }}>
        <button onClick={load} style={btn}>Reload</button>
        <button onClick={() => setOnlyBad((v) => !v)} style={btn}>
          {onlyBad ? "Show all" : "Only duplicates"}
        </button>
        {data && (
          <span style={{ fontSize: 13, color: dupes ? "#F0876A" : "#7FA86B" }}>
            {data.length} screens · {dupes ? `${dupes} duplicated` : "no duplicates"}
          </span>
        )}
      </div>

      {err && <p style={{ color: "#F0876A" }}>{err}</p>}
      {!data && !err && <p style={{ color: "#9A9184" }}>Loading…</p>}

      <div style={{
        display: "grid", gap: 16,
        gridTemplateColumns: "repeat(auto-fill, minmax(214px, 1fr))",
      }}>
        {shown.map((s) => <Card key={s.id} s={s} onOpen={setOpen} />)}
      </div>

      {open && (
        <div
          ref={dlg}
          onClick={() => setOpen(null)}
          style={{
            position: "fixed", inset: 0, background: "rgba(6,5,4,.92)", zIndex: 50,
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", gap: 12, cursor: "zoom-out", padding: 24,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/staging/screens?file=${encodeURIComponent(open.file)}`}
            alt={open.id}
            style={{ maxHeight: "86vh", borderRadius: 16, boxShadow: "0 30px 80px rgba(0,0,0,.7)" }}
          />
          <div style={{ fontSize: 13, color: "#C8A868" }}>
            {open.id} · {open.usp.join(" · ") || "untagged"} · Esc to close
          </div>
        </div>
      )}
    </div>
  );
}

const btn: React.CSSProperties = {
  padding: "7px 14px", borderRadius: 9, cursor: "pointer", fontSize: 13,
  background: "rgba(200,168,104,.14)", color: "#EAE2D4",
  border: "1px solid rgba(200,168,104,.4)",
};
