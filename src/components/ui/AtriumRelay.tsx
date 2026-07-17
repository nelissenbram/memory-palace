"use client";

/**
 * AtriumRelay — "The Maggiordomo" concierge relay board (round-10, iter 3).
 *
 * Steward strip (greeting + real datum + score/badge total + ONE smart
 * Suggested-Next card) → an optional personalization band → two side-by-side
 * "Enter Your Palace" / "Enter Your Library" anchors (with a live thumbnail
 * fan) → the destinations grouped by the LANDING triptych (Capture / Bring to
 * life / Share & pass on), each verb-zone in its own key colour with coloured,
 * visibly-alive icon medallions → a quiet You utility row.
 */

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { T } from "@/lib/theme";
import RelayIcons from "./RelayIcons";

export type RelayTile = {
  key: string;
  title: string;
  desc: string;
  onClick: () => void;
  anchor?: boolean;
  datum?: React.ReactNode;
  thumbs?: string[];
  hidden?: boolean;
  soon?: boolean;
};
export type RelayAccent = "terracotta" | "gold" | "sage" | "anchor" | "anchorLibrary";
export type RelayLane = { id: string; overline: string; accent: RelayAccent; tiles: RelayTile[] };
export type RelaySuggestion = { key: string; title: string; reason: string; onClick: () => void };
export type RelayChip = { key: string; label: string; onClick: () => void };
export type RelayPill = { key: string; label: string; onClick: () => void };
export type RelayScore = { points: number; badgesEarned: number; badgesTotal: number; onClick: () => void };

interface AtriumRelayProps {
  greeting: string;
  userName: string | null;
  datumLine: string;
  score?: RelayScore | null;
  suggestion: RelaySuggestion;
  chips: RelayChip[];
  personaSlot?: React.ReactNode;
  anchors: RelayTile[];
  lanes: RelayLane[];
  you: RelayPill[];
  isMobile: boolean;
}

// "INK & EMBER" palette (colour workflow winner, 45.3/50, AA-verified on the
// darker gradient stop). Three edge-to-edge earth washes that never fade to
// cream; the two anchors invert to dark gilt-edged keystone cards. Per-zone
// text colours are mandatory (a single global ink would fail on dark anchors).
const ACCENT: Record<RelayAccent, { glyph: string; medallion: string; glow: string; band: string; rule: string; tileTop: string; tileBg: string; border: string; titleColor: string; descColor: string; datumColor: string }> = {
  terracotta: { glyph: "#7C3016", medallion: "rgba(168,71,31,0.18)", glow: "rgba(168,71,31,0.5)", band: "rgba(168,71,31,0.06)", rule: "rgba(168,71,31,0.4)", tileTop: "#A8471F", tileBg: "linear-gradient(155deg, #FBE4D6 0%, #F3C9B2 100%)", border: "rgba(168,71,31,0.22)", titleColor: "#2A1A12", descColor: "#5A3A2A", datumColor: "#7C3016" },
  gold: { glyph: "#6E4A0F", medallion: "rgba(158,111,20,0.20)", glow: "rgba(158,111,20,0.5)", band: "rgba(158,111,20,0.06)", rule: "rgba(158,111,20,0.4)", tileTop: "#B47A1A", tileBg: "linear-gradient(155deg, #FBEAC6 0%, #F0D48C 100%)", border: "rgba(158,111,20,0.24)", titleColor: "#2A2010", descColor: "#5E4718", datumColor: "#6E4A0F" },
  sage: { glyph: "#38481F", medallion: "rgba(78,97,56,0.20)", glow: "rgba(78,97,56,0.45)", band: "rgba(78,97,56,0.06)", rule: "rgba(78,97,56,0.4)", tileTop: "#55682E", tileBg: "linear-gradient(155deg, #E9EFD5 0%, #D2DEAE 100%)", border: "rgba(78,97,56,0.24)", titleColor: "#232C15", descColor: "#45532E", datumColor: "#38481F" },
  anchor: { glyph: "#E8C766", medallion: "rgba(232,199,102,0.18)", glow: "rgba(232,199,102,0.4)", band: "transparent", rule: "rgba(232,199,102,0.5)", tileTop: "#E8C766", tileBg: "linear-gradient(150deg, #2E2118 0%, #1C130C 100%)", border: "rgba(232,199,102,0.30)", titleColor: "#F7EFE0", descColor: "#E4D6BE", datumColor: "#E8C766" },
  anchorLibrary: { glyph: "#E8C766", medallion: "rgba(232,199,102,0.18)", glow: "rgba(232,199,102,0.4)", band: "transparent", rule: "rgba(232,199,102,0.5)", tileTop: "#E8C766", tileBg: "linear-gradient(150deg, #2A2027 0%, #191218 100%)", border: "rgba(232,199,102,0.30)", titleColor: "#F5EFE2", descColor: "#D8CBB6", datumColor: "#E8C766" },
};

function Glyph({ k, size }: { k: string; size: string }) {
  const Ico = RelayIcons[k] ?? RelayIcons.palace;
  return <span style={{ width: size, height: size, display: "inline-flex" }}><Ico /></span>;
}

function Medallion({ k, accent, index, big }: { k: string; accent: RelayAccent; index: number; big?: boolean }) {
  const a = ACCENT[accent];
  // The medallion is calm now (a soft static tint); the motion lives inside the
  // glyph's animated sub-part. --ri-delay de-syncs those across the board.
  return (
    <span
      aria-hidden="true"
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: big ? "3.25rem" : "2.75rem",
        height: big ? "3.25rem" : "2.75rem",
        borderRadius: "0.85rem",
        overflow: "hidden",
        background: a.medallion,
        color: a.glyph,
        flexShrink: 0,
        boxShadow: (accent === "anchor" || accent === "anchorLibrary") ? "inset 0 0 0 0.0625rem rgba(232,199,102,0.42)" : "none",
        ["--ri-delay" as unknown as string]: `${((index % 6) * 0.6).toFixed(2)}s`,
      }}
    >
      <span aria-hidden="true" style={{ position: "absolute", inset: 0, background: `radial-gradient(closest-side, ${a.glow}, transparent 82%)`, opacity: 0.14 }} />
      <span style={{ position: "relative", display: "inline-flex" }}>
        <Glyph k={k} size={big ? "1.85rem" : "1.55rem"} />
      </span>
    </span>
  );
}

function ThumbFan({ thumbs }: { thumbs: string[] }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center" }} aria-hidden="true">
      {thumbs.slice(0, 3).map((src, i) => (
        <span key={i} style={{ position: "relative", width: "2.25rem", height: "2.25rem", borderRadius: "0.5rem", overflow: "hidden", border: `0.125rem solid ${T.color.cream}`, boxShadow: "0 0.125rem 0.375rem rgba(36,28,21,0.18)", marginLeft: i === 0 ? 0 : "-0.75rem", transform: `rotate(${(i - 1) * 4}deg)` }}>
          <Image src={src} alt="" fill sizes="36px" style={{ objectFit: "cover" }} />
        </span>
      ))}
    </span>
  );
}

function Tile({ tile, accent, index }: { tile: RelayTile; accent: RelayAccent; index: number }) {
  if (tile.hidden) return null;
  const a = ACCENT[accent];
  return (
    <button
      type="button"
      onClick={tile.onClick}
      className="relay-tile"
      style={{
        gridColumn: tile.anchor ? "auto" : "auto",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: "0.6rem",
        textAlign: "left",
        minHeight: tile.anchor ? "9rem" : "7.25rem",
        padding: "1.125rem",
        paddingTop: "1.25rem",
        borderRadius: "1rem",
        borderTop: `0.1875rem solid ${a.tileTop}`,
        border: `0.0625rem solid ${a.border}`,
        borderTopWidth: "0.1875rem",
        borderTopColor: a.tileTop,
        background: a.tileBg,
        boxShadow: tile.anchor ? "0 0.625rem 2rem rgba(28,19,12,0.34)" : "0 0.25rem 1rem rgba(36,28,21,0.08)",
        cursor: "pointer",
        opacity: tile.soon ? 0.72 : 1,
      }}
    >
      {tile.soon ? (
        <span style={{ position: "absolute", top: "0.7rem", right: "0.7rem", fontFamily: T.font.body, fontSize: "0.625rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: a.descColor, background: "rgba(255,255,255,0.35)", borderRadius: "1rem", padding: "0.15rem 0.5rem" }}>Soon</span>
      ) : null}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", width: "100%" }}>
        <Medallion k={tile.key} accent={accent} index={index} big={tile.anchor} />
        {tile.anchor && tile.thumbs && tile.thumbs.length > 0 ? (
          <span style={{ marginLeft: "auto" }}><ThumbFan thumbs={tile.thumbs} /></span>
        ) : null}
      </div>
      <span style={{ display: "flex", flexDirection: "column", gap: "0.15rem", minWidth: 0 }}>
        <span style={{ fontFamily: T.font.display, fontWeight: 600, fontSize: tile.anchor ? "1.5rem" : "1.1875rem", lineHeight: 1.15, color: a.titleColor }}>{tile.title}</span>
        <span style={{ fontFamily: T.font.body, fontWeight: 400, fontSize: "0.9375rem", lineHeight: 1.35, color: a.descColor }}>{tile.desc}</span>
        {tile.datum ? <span style={{ fontFamily: T.font.body, fontWeight: 700, fontSize: "0.875rem", color: a.datumColor, marginTop: "0.25rem" }}>{tile.datum}</span> : null}
      </span>
    </button>
  );
}

export default function AtriumRelay({ greeting, userName, datumLine, score, suggestion, chips, personaSlot, anchors, lanes, you, isMobile }: AtriumRelayProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const id = requestAnimationFrame(() => setMounted(true)); return () => cancelAnimationFrame(id); }, []);
  const SugIco = RelayIcons[suggestion.key] ?? RelayIcons.palace;

  return (
    <div style={{ width: "100%", opacity: mounted ? 1 : 0, transition: "opacity 0.5s ease" }}>
      {/* ── STEWARD STRIP ── */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.7fr 1fr", gap: "1.25rem", alignItems: "start", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontFamily: T.font.display, fontWeight: 600, fontSize: isMobile ? "1.75rem" : "2.25rem", lineHeight: 1.12, margin: 0, color: T.color.charcoal }}>
            {greeting}{userName ? <>, <span style={{ color: "#A8471F" }}>{userName}</span></> : null}
          </h1>
          <p style={{ fontFamily: T.font.body, fontSize: "1rem", fontWeight: 500, color: "#6B6459", margin: "0.5rem 0 1rem", fontVariantNumeric: "tabular-nums" }}>{datumLine}</p>

          <button type="button" onClick={suggestion.onClick} className="relay-suggest" style={{ position: "relative", overflow: "hidden", display: "flex", alignItems: "center", gap: "1rem", width: "100%", textAlign: "left", padding: "1.125rem 1.25rem", borderRadius: "1rem", border: "none", cursor: "pointer", color: T.color.linen, background: "linear-gradient(135deg, #A24B28, #7C3016)", boxShadow: "0 0.75rem 1.75rem rgba(124,48,22,0.4)" }}>
            <span aria-hidden="true" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "3rem", height: "3rem", borderRadius: "0.75rem", background: "rgba(255,255,255,0.16)", color: T.color.linen, flexShrink: 0 }}><span style={{ width: "1.6rem", height: "1.6rem", display: "inline-flex" }}><SugIco /></span></span>
            <span style={{ display: "flex", flexDirection: "column", gap: "0.1rem", minWidth: 0, position: "relative", zIndex: 1 }}>
              <span style={{ fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#F2C75A" }}>Suggested for you</span>
              <span style={{ fontFamily: T.font.display, fontWeight: 600, fontSize: "1.25rem", lineHeight: 1.15 }}>{suggestion.title}</span>
              <span style={{ fontFamily: T.font.body, fontSize: "0.9375rem", color: "rgba(250,247,240,0.86)" }}>{suggestion.reason}</span>
            </span>
            <span aria-hidden="true" className="relay-suggest-sheen" />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
          {score ? (
            <button type="button" onClick={score.onClick} className="relay-chip" style={{ display: "flex", alignItems: "center", gap: "0.6rem", minHeight: "3rem", padding: "0 1rem", borderRadius: "0.75rem", border: `0.0625rem solid ${T.color.warmStone}`, background: "linear-gradient(135deg, rgba(212,175,55,0.12), rgba(212,175,55,0.03))", cursor: "pointer" }}>
              <span aria-hidden="true" style={{ width: "1.375rem", height: "1.375rem", display: "inline-flex", color: "#8A6410" }}><RelayIcons.points /></span>
              <span style={{ fontFamily: T.font.display, fontWeight: 700, fontSize: "1.0625rem", color: T.color.charcoal, fontVariantNumeric: "tabular-nums" }}>{score.points.toLocaleString()}</span>
              <span style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.muted, marginRight: "0.25rem" }}>pts</span>
              <span aria-hidden="true" style={{ width: "0.0625rem", height: "1.25rem", background: T.color.warmStone }} />
              <span aria-hidden="true" style={{ width: "1.375rem", height: "1.375rem", display: "inline-flex", color: "#A8471F" }}><RelayIcons.badge /></span>
              <span style={{ fontFamily: T.font.display, fontWeight: 700, fontSize: "1.0625rem", color: T.color.charcoal, fontVariantNumeric: "tabular-nums" }}>{score.badgesEarned}/{score.badgesTotal}</span>
            </button>
          ) : null}
          {chips.map((c) => {
            const Ico = RelayIcons[c.key] ?? RelayIcons.continue;
            return (
              <button key={c.key} type="button" onClick={c.onClick} className="relay-chip" style={{ display: "inline-flex", alignItems: "center", gap: "0.625rem", minHeight: "3rem", padding: "0 1.125rem", borderRadius: "0.75rem", border: `0.0625rem solid ${T.color.warmStone}`, background: T.color.cream, cursor: "pointer", fontFamily: T.font.body, fontSize: "0.9375rem", fontWeight: 600, color: T.color.charcoal }}>
                <span aria-hidden="true" style={{ width: "1.25rem", height: "1.25rem", display: "inline-flex", color: T.color.terracotta }}><Ico /></span>{c.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── PERSONALIZATION BAND ── */}
      {personaSlot ? <div style={{ marginBottom: "1.5rem" }}>{personaSlot}</div> : null}

      {/* ── ANCHORS (Enter Your Palace / Library, side by side) ── */}
      {anchors.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: isMobile ? "0.625rem" : "0.875rem", marginBottom: "1.5rem" }}>
          {anchors.map((t, i) => <Tile key={t.key} tile={{ ...t, anchor: true }} accent={t.key === "library" ? "anchorLibrary" : "anchor"} index={i} />)}
        </div>
      ) : null}

      {/* ── VERB-ZONED LANES (landing triptych) ── */}
      {lanes.map((lane) => {
        const visible = lane.tiles.filter((t) => !t.hidden);
        if (visible.length === 0) return null;
        const a = ACCENT[lane.accent];
        return (
          <section key={lane.id} aria-label={lane.overline} style={{ background: a.band, borderRadius: "1.25rem", padding: "1.1rem 1.1rem 1.35rem", margin: "0 0 1.1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", margin: "0 0 0.9rem" }}>
              <span style={{ width: "0.55rem", height: "0.55rem", borderRadius: "50%", background: a.tileTop }} aria-hidden="true" />
              <span style={{ fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: a.glyph }}>{lane.overline}</span>
              <span aria-hidden="true" style={{ flex: 1, height: "0.0625rem", background: `linear-gradient(90deg, ${a.rule}, transparent)` }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(${isMobile ? "8.5rem" : "11rem"}, 1fr))`, gap: "0.875rem" }}>
              {visible.map((t, i) => <Tile key={t.key} tile={t} accent={lane.accent} index={i} />)}
            </div>
          </section>
        );
      })}

      {/* ── YOU utility row ── */}
      {you.length > 0 ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.625rem", marginTop: "0.5rem" }}>
          {you.map((p) => {
            const Ico = RelayIcons[p.key] ?? RelayIcons.settings;
            return (
              <button key={p.key} type="button" onClick={p.onClick} className="relay-pill" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", minHeight: "2.75rem", padding: "0 1rem", borderRadius: "2rem", border: `0.0625rem solid ${T.color.warmStone}`, background: "transparent", cursor: "pointer", fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: 600, color: "#5E4636" }}>
                <span aria-hidden="true" style={{ width: "1.125rem", height: "1.125rem", display: "inline-flex" }}><Ico /></span>{p.label}
              </button>
            );
          })}
        </div>
      ) : null}

      <style>{`
        .relay-tile { transition: transform 0.2s ease, box-shadow 0.2s ease; animation: relay-rise 0.5s ease both; }
        .relay-tile:hover { transform: translateY(-0.1875rem); box-shadow: 0 0.75rem 1.75rem rgba(36,28,21,0.16); }
        .relay-tile:active { transform: translateY(0); }
        .relay-chip, .relay-pill { transition: background 0.2s ease, border-color 0.2s ease; }
        .relay-chip:hover, .relay-pill:hover { background: ${T.color.warmStone}55; border-color: ${T.color.terracotta}; }
        .relay-suggest { transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease; }
        .relay-suggest:hover { transform: translateY(-0.1875rem); box-shadow: 0 1rem 2.25rem rgba(154,79,42,0.45); filter: brightness(1.04); }
        .relay-suggest-sheen { position: absolute; top: 0; bottom: 0; left: -40%; width: 40%; background: linear-gradient(105deg, transparent, rgba(255,240,200,0.4), transparent); transform: skewX(-18deg); animation: relay-sheen 6s ease-in-out infinite; }
        /* animated icon SUB-PARTS — the life is inside each glyph, not the medallion */
        .ri-pulse, .ri-pulse-op, .ri-spin, .ri-spin-slow, .ri-wave, .ri-bob, .ri-blink { transform-box: fill-box; transform-origin: center; }
        .ri-wave { transform-origin: bottom; }
        @media (prefers-reduced-motion: no-preference) {
          .ri-pulse { animation: ri-pulse 2.8s ease-in-out infinite; animation-delay: var(--ri-delay, 0s); }
          .ri-pulse-op { animation: ri-pulseop 2.8s ease-in-out infinite; animation-delay: var(--ri-delay, 0s); }
          .ri-blink { animation: ri-blink 2.4s ease-in-out infinite; animation-delay: var(--ri-delay, 0s); }
          .ri-spin { animation: ri-spin 8s linear infinite; }
          .ri-spin-slow { animation: ri-spin 16s linear infinite; }
          .ri-wave { animation: ri-wave 1.3s ease-in-out infinite; }
          .ri-wave.d2 { animation-delay: 0.18s; }
          .ri-wave.d3 { animation-delay: 0.36s; }
          .ri-bob { animation: ri-bob 3s ease-in-out infinite; animation-delay: var(--ri-delay, 0s); }
        }
        .relay-tile:focus-visible, .relay-chip:focus-visible, .relay-pill:focus-visible, .relay-suggest:focus-visible { outline: 0.1875rem solid ${T.color.gold}; outline-offset: 0.1875rem; }
        @keyframes relay-rise { from { opacity: 0; transform: translateY(0.6rem); } to { opacity: 1; transform: none; } }
        @keyframes relay-sheen { 0%,14% { left: -45%; } 60%,100% { left: 135%; } }
        @keyframes ri-pulse { 0%,100% { opacity: 0.5; transform: scale(0.82); } 50% { opacity: 1; transform: scale(1.18); } }
        @keyframes ri-pulseop { 0%,100% { opacity: 0.35; } 50% { opacity: 1; } }
        @keyframes ri-blink { 0%,100% { opacity: 0.25; } 50% { opacity: 1; } }
        @keyframes ri-spin { to { transform: rotate(360deg); } }
        @keyframes ri-wave { 0%,100% { transform: scaleY(0.5); } 50% { transform: scaleY(1); } }
        @keyframes ri-bob { 0%,100% { transform: translateY(0.6px); } 50% { transform: translateY(-1.4px); } }
        @media (prefers-reduced-motion: reduce) {
          .relay-tile, .relay-chip, .relay-pill, .relay-suggest, .ri-pulse, .ri-pulse-op, .ri-blink, .ri-spin, .ri-spin-slow, .ri-wave, .ri-bob { animation: none !important; transition: none !important; }
          .relay-tile:hover, .relay-suggest:hover { transform: none !important; }
          .relay-suggest-sheen { display: none; }
        }
      `}</style>
    </div>
  );
}
