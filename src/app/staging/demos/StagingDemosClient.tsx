"use client";

import { useEffect, useMemo, useState } from "react";

/**
 * The seeded demo palaces, as linked from /explore. They are PUBLIC routes, so
 * this viewer — and the capture run behind it — needs no session at all, which
 * is the point: the review account is wrapped in a walkthrough that intercepts
 * /atrium and /library, and every screenshot taken through it came back as an
 * onboarding card. A logged-out demo palace has no onboarding to get past.
 */
const HANDLES = [
  "giovanni-del-mare", "james-goes-long", "david-tel-aviv", "sofia-and-bruno",
  "meera-patel", "astrid-andersen", "sol-alvarez", "luana-santos",
  "nadia-writes", "emma-and-the-baby", "hiroshi-builds", "margit-garden",
  "chidi-okafor",
];

/**
 * ⚠️ /u/[username] is the ONLY public profile route — there is no /u/x/palace or
 * /u/x/library, and a first pass here invented both. The rooms live behind
 * /visit/<PROFILE-ID>/<wing-slug>, keyed by uuid rather than by handle, which is
 * also why /visit/sol-alvarez 404s. So the profile is the entry point and its
 * wing cards are what lead inward.
 */
const VIEWS: { key: string; label: string; path: (h: string) => string }[] = [
  { key: "profile", label: "Profile", path: (h) => `/u/${h}` },
];

export default function StagingDemosClient() {
  const [view, setView] = useState("profile");
  const [zoom, setZoom] = useState<string | null>(null);
  const [only, setOnly] = useState("");

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("view")) setView(q.get("view")!);
    if (q.get("u")) setOnly(q.get("u")!);
  }, []);

  const handles = useMemo(
    () => (only ? only.split(",").map((s) => s.trim()).filter(Boolean) : HANDLES),
    [only],
  );
  const v = VIEWS.find((x) => x.key === view) || VIEWS[0];

  return (
    <div style={{
      minHeight: "100vh", background: "#0B0A08", color: "#EAE2D4",
      fontFamily: "system-ui, sans-serif", padding: "22px 26px 60px",
    }}>
      <h1 style={{ fontSize: 19, margin: 0, color: "#C8A868", letterSpacing: .4 }}>
        DEMO PALACES · dev
      </h1>
      <p style={{ fontSize: 13, color: "#9A9184", maxWidth: 780, margin: "8px 0 0", lineHeight: 1.6 }}>
        The seeded public palaces behind /explore, at phone size. These are public
        routes — no session, so no onboarding wizard sits over them. Click a frame
        to open it full size in a new tab.
      </p>

      <div style={{ display: "flex", gap: 8, margin: "16px 0 20px", flexWrap: "wrap" }}>
        {VIEWS.map((x) => (
          <button
            key={x.key}
            onClick={() => setView(x.key)}
            style={{
              padding: "7px 14px", borderRadius: 9, cursor: "pointer", fontSize: 13,
              background: x.key === view ? "rgba(200,168,104,.30)" : "rgba(200,168,104,.10)",
              color: "#EAE2D4", border: "1px solid rgba(200,168,104,.4)",
            }}
          >
            {x.label}
          </button>
        ))}
        <span style={{ fontSize: 13, color: "#7B7367", alignSelf: "center" }}>
          {handles.length} palaces · {v.path("<handle>")}
        </span>
      </div>

      <div style={{
        display: "grid", gap: 18,
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
      }}>
        {handles.map((h) => (
          <div key={h} style={{
            background: "#17140F", borderRadius: 14, overflow: "hidden",
            border: "1px solid rgba(200,168,104,.28)",
          }}>
            <div style={{
              height: 470, overflow: "hidden", background: "#0C0A08",
              position: "relative", cursor: "pointer",
            }}
              onClick={() => window.open(v.path(h), "_blank")}
              onMouseEnter={() => setZoom(h)}
              onMouseLeave={() => setZoom(null)}
            >
              {/* 540x960 rendered, then scaled to fit the card: keeps the mobile
                  breakpoint the capture run uses, rather than a desktop layout. */}
              <iframe
                src={v.path(h)}
                title={h}
                style={{
                  width: 540, height: 960, border: 0,
                  transform: "scale(0.49)", transformOrigin: "top left",
                  pointerEvents: "none",
                }}
              />
              {zoom === h && (
                <div style={{
                  position: "absolute", inset: 0, display: "flex", alignItems: "flex-end",
                  justifyContent: "center", paddingBottom: 14,
                  background: "linear-gradient(transparent 60%, rgba(6,5,4,.85))",
                  fontSize: 12, color: "#C8A868",
                }}>open in new tab ↗</div>
              )}
            </div>
            <div style={{ padding: "9px 12px", fontSize: 12 }}>
              <span style={{ color: "#EAE2D4" }}>@{h}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
