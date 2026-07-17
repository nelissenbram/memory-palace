"use client";

/**
 * AtriumRelay — "The Maggiordomo" concierge relay board (round-10, iter 2).
 *
 * Steward strip (greeting + real datum + a score/badge total + ONE state-aware
 * Suggested-Next card + quick chips) → two Palace/Library anchor tiles kept on
 * top → the destinations grouped by the LANDING triptych (Capture / Bring to
 * life / Share & pass on), each verb-zone carrying its own key colour → a quiet
 * You utility row.
 *
 * Icons live in crafted medallions that gently breathe with a de-synced gold
 * glow (aligned with the landing's USP medallions), reduced-motion gated.
 */

import React, { useEffect, useState } from "react";
import { T } from "@/lib/theme";
import RelayIcons from "./RelayIcons";

export type RelayTile = {
  key: string;
  title: string;
  desc: string;
  onClick: () => void;
  span?: boolean;
  anchor?: boolean;
  datum?: React.ReactNode;
  hidden?: boolean;
};
export type RelayAccent = "terracotta" | "gold" | "sage" | "anchor";
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
  anchors: RelayTile[];
  lanes: RelayLane[];
  you: RelayPill[];
  isMobile: boolean;
}

// Key colours per verb-zone (drawn from the original Atrium warm palette).
const ACCENT: Record<RelayAccent, { glyph: string; medallion: string; glow: string; band: string; rule: string; tileBg: string; border: string }> = {
  terracotta: { glyph: "#A24B28", medallion: "rgba(184,92,56,0.14)", glow: "rgba(184,92,56,0.55)", band: "rgba(184,92,56,0.05)", rule: "rgba(184,92,56,0.4)", tileBg: "#FDF7F3", border: "rgba(184,92,56,0.18)" },
  gold: { glyph: "#9A6A1E", medallion: "rgba(212,175,55,0.20)", glow: "rgba(212,175,55,0.6)", band: "rgba(212,175,55,0.06)", rule: "rgba(212,175,55,0.45)", tileBg: "#FCF8EC", border: "rgba(176,135,23,0.2)" },
  sage: { glyph: "#556348", medallion: "rgba(106,124,92,0.20)", glow: "rgba(106,124,92,0.5)", band: "rgba(106,124,92,0.06)", rule: "rgba(106,124,92,0.4)", tileBg: "#F7F9F2", border: "rgba(92,107,76,0.2)" },
  anchor: { glyph: "#B85C38", medallion: "rgba(212,175,55,0.18)", glow: "rgba(212,175,55,0.7)", band: "transparent", rule: "rgba(212,175,55,0.5)", tileBg: "#FCFAF5", border: "rgba(184,92,56,0.28)" },
};

function Glyph({ k, size }: { k: string; size: string }) {
  const Ico = RelayIcons[k] ?? RelayIcons.palace;
  return <span style={{ width: size, height: size, display: "inline-flex" }}><Ico /></span>;
}

function Tile({ tile, accent, index }: { tile: RelayTile; accent: RelayAccent; index: number }) {
  if (tile.hidden) return null;
  const a = ACCENT[accent];
  const big = tile.span || tile.anchor;
  return (
    <button
      type="button"
      onClick={tile.onClick}
      className="relay-tile"
      style={{
        gridColumn: big ? "span 2" : "auto",
        display: "flex",
        flexDirection: tile.anchor ? "row" : "column",
        alignItems: tile.anchor ? "center" : "flex-start",
        gap: tile.anchor ? "1rem" : "0.625rem",
        textAlign: "left",
        minHeight: tile.anchor ? "6rem" : big ? "8rem" : "7rem",
        padding: tile.anchor ? "1.25rem 1.375rem" : "1.125rem",
        borderRadius: "1rem",
        border: `0.0625rem solid ${a.border}`,
        background: tile.anchor ? `linear-gradient(150deg, ${T.color.linen} 0%, ${a.tileBg} 60%, ${T.color.cream} 100%)` : a.tileBg,
        boxShadow: tile.anchor ? "0 0.5rem 1.5rem rgba(36,28,21,0.10)" : "0 0.25rem 1rem rgba(36,28,21,0.07)",
        cursor: "pointer",
      }}
    >
      <span
        aria-hidden="true"
        className="relay-medallion"
        style={{
          position: "relative",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: tile.anchor ? "3.25rem" : "2.75rem",
          height: tile.anchor ? "3.25rem" : "2.75rem",
          borderRadius: "0.85rem",
          background: a.medallion,
          color: a.glyph,
          flexShrink: 0,
          animationDelay: `${(index % 6) * 0.5}s`,
        }}
      >
        <span aria-hidden="true" className="relay-medallion-glow" style={{ position: "absolute", inset: 0, borderRadius: "inherit", background: `radial-gradient(closest-side, ${a.glow}, transparent 72%)`, animationDelay: `${(index % 6) * 0.5}s` }} />
        <span style={{ position: "relative" }}><Glyph k={tile.key} size={tile.anchor ? "1.85rem" : "1.5rem"} /></span>
      </span>
      <span style={{ display: "flex", flexDirection: "column", gap: "0.15rem", minWidth: 0 }}>
        <span style={{ fontFamily: T.font.display, fontWeight: 600, fontSize: tile.anchor ? "1.5rem" : big ? "1.375rem" : "1.1875rem", lineHeight: 1.15, color: T.color.charcoal }}>{tile.title}</span>
        <span style={{ fontFamily: T.font.body, fontWeight: 400, fontSize: "0.9375rem", lineHeight: 1.35, color: T.color.muted }}>{tile.desc}</span>
        {tile.datum ? <span style={{ fontFamily: T.font.body, fontWeight: 600, fontSize: "0.875rem", color: a.glyph, marginTop: "0.25rem" }}>{tile.datum}</span> : null}
      </span>
    </button>
  );
}

export default function AtriumRelay({ greeting, userName, datumLine, score, suggestion, chips, anchors, lanes, you, isMobile }: AtriumRelayProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const id = requestAnimationFrame(() => setMounted(true)); return () => cancelAnimationFrame(id); }, []);
  const SugIco = RelayIcons[suggestion.key] ?? RelayIcons.palace;

  return (
    <div style={{ width: "100%", opacity: mounted ? 1 : 0, transition: "opacity 0.5s ease" }}>
      {/* ── STEWARD STRIP ── */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.6fr 1fr", gap: "1.25rem", alignItems: "start", marginBottom: "1.75rem" }}>
        <div>
          <h1 style={{ fontFamily: T.font.display, fontWeight: 600, fontSize: isMobile ? "1.75rem" : "2.25rem", lineHeight: 1.12, margin: 0, color: T.color.charcoal }}>
            {greeting}{userName ? <>, <span style={{ color: T.color.terracotta }}>{userName}</span></> : null}
          </h1>
          <p style={{ fontFamily: T.font.body, fontSize: "1rem", fontWeight: 500, color: T.color.muted, margin: "0.5rem 0 1rem", fontVariantNumeric: "tabular-nums" }}>{datumLine}</p>

          <button type="button" onClick={suggestion.onClick} className="relay-suggest" style={{ position: "relative", overflow: "hidden", display: "flex", alignItems: "center", gap: "1rem", width: "100%", textAlign: "left", padding: "1.125rem 1.25rem", borderRadius: "1rem", border: "none", cursor: "pointer", color: T.color.linen, background: `linear-gradient(135deg, ${T.color.terracotta}, #A24B28)`, boxShadow: "0 0.75rem 1.75rem rgba(154,79,42,0.35)" }}>
            <span aria-hidden="true" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "3rem", height: "3rem", borderRadius: "0.75rem", background: "rgba(255,255,255,0.16)", color: T.color.linen, flexShrink: 0 }}><span style={{ width: "1.6rem", height: "1.6rem", display: "inline-flex" }}><SugIco /></span></span>
            <span style={{ display: "flex", flexDirection: "column", gap: "0.1rem", minWidth: 0, position: "relative", zIndex: 1 }}>
              <span style={{ fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: T.color.goldLight ?? "#E8C87A" }}>Suggested for you</span>
              <span style={{ fontFamily: T.font.display, fontWeight: 600, fontSize: "1.25rem", lineHeight: 1.15 }}>{suggestion.title}</span>
              <span style={{ fontFamily: T.font.body, fontSize: "0.9375rem", color: "rgba(250,247,240,0.86)" }}>{suggestion.reason}</span>
            </span>
            <span aria-hidden="true" className="relay-suggest-sheen" />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
          {/* score & badges — for those who like keeping count */}
          {score ? (
            <button type="button" onClick={score.onClick} className="relay-chip" style={{ display: "flex", alignItems: "center", gap: "0.75rem", minHeight: "3rem", padding: "0 1rem", borderRadius: "0.75rem", border: `0.0625rem solid ${T.color.warmStone}`, background: `linear-gradient(135deg, rgba(212,175,55,0.10), rgba(212,175,55,0.03))`, cursor: "pointer" }}>
              <span aria-hidden="true" style={{ width: "1.375rem", height: "1.375rem", display: "inline-flex", color: "#B08717" }}><RelayIcons.milestones /></span>
              <span style={{ fontFamily: T.font.body, fontWeight: 700, fontSize: "0.9375rem", color: T.color.charcoal, fontVariantNumeric: "tabular-nums" }}>{score.points.toLocaleString()}</span>
              <span style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.muted }}>pts</span>
              <span aria-hidden="true" style={{ width: "0.0625rem", height: "1.25rem", background: T.color.warmStone }} />
              <span style={{ fontFamily: T.font.body, fontWeight: 700, fontSize: "0.9375rem", color: T.color.charcoal, fontVariantNumeric: "tabular-nums" }}>{score.badgesEarned}/{score.badgesTotal}</span>
              <span style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.muted }}>badges</span>
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

      {/* ── ANCHORS (Palace / Library on top) ── */}
      {anchors.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "0.875rem", marginBottom: "1.5rem" }}>
          {anchors.map((t, i) => <Tile key={t.key} tile={{ ...t, anchor: true }} accent="anchor" index={i} />)}
        </div>
      ) : null}

      {/* ── VERB-ZONED LANES (landing triptych) ── */}
      {lanes.map((lane) => {
        const visible = lane.tiles.filter((t) => !t.hidden);
        if (visible.length === 0) return null;
        const a = ACCENT[lane.accent];
        return (
          <section key={lane.id} aria-label={lane.overline} style={{ background: a.band, borderRadius: "1.25rem", padding: "1.1rem 1.1rem 1.35rem", margin: "0 0 1.1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", margin: "0 0 0.9rem" }}>
              <span style={{ width: "0.5rem", height: "0.5rem", borderRadius: "50%", background: a.glyph }} aria-hidden="true" />
              <span style={{ fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: a.glyph }}>{lane.overline}</span>
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
              <button key={p.key} type="button" onClick={p.onClick} className="relay-pill" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", minHeight: "2.75rem", padding: "0 1rem", borderRadius: "2rem", border: `0.0625rem solid ${T.color.warmStone}`, background: "transparent", cursor: "pointer", fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: 600, color: T.color.walnut }}>
                <span aria-hidden="true" style={{ width: "1.125rem", height: "1.125rem", display: "inline-flex" }}><Ico /></span>{p.label}
              </button>
            );
          })}
        </div>
      ) : null}

      <style>{`
        .relay-tile { transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease; animation: relay-rise 0.5s ease both; }
        .relay-tile:hover { transform: translateY(-0.1875rem); box-shadow: 0 0.75rem 1.75rem rgba(36,28,21,0.15); }
        .relay-tile:active { transform: translateY(0); }
        .relay-medallion-glow { opacity: 0.28; }
        .relay-chip, .relay-pill { transition: background 0.2s ease, border-color 0.2s ease; }
        .relay-chip:hover, .relay-pill:hover { background: ${T.color.warmStone}55; border-color: ${T.color.terracotta}; }
        .relay-suggest { transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease; }
        .relay-suggest:hover { transform: translateY(-0.1875rem); box-shadow: 0 1rem 2.25rem rgba(154,79,42,0.45); filter: brightness(1.04); }
        .relay-suggest-sheen { position: absolute; top: 0; bottom: 0; left: -40%; width: 40%; background: linear-gradient(105deg, transparent, rgba(255,240,200,0.4), transparent); transform: skewX(-18deg); animation: relay-sheen 6s ease-in-out infinite; }
        .relay-tile:focus-visible, .relay-chip:focus-visible, .relay-pill:focus-visible, .relay-suggest:focus-visible { outline: 0.1875rem solid ${T.color.gold}; outline-offset: 0.1875rem; }
        @keyframes relay-rise { from { opacity: 0; transform: translateY(0.6rem); } to { opacity: 1; transform: none; } }
        @keyframes relay-sheen { 0%,14% { left: -45%; } 60%,100% { left: 135%; } }
        @keyframes relay-breathe { 0%,100% { transform: scale(1); } 50% { transform: scale(1.06); } }
        @keyframes relay-glow { 0%,100% { opacity: 0.2; } 50% { opacity: 0.6; } }
        @media (prefers-reduced-motion: no-preference) {
          .relay-medallion { animation: relay-breathe 4s ease-in-out infinite; }
          .relay-medallion-glow { animation: relay-glow 4s ease-in-out infinite; }
        }
        .relay-tile:hover .relay-medallion-glow { opacity: 0.72; }
        @media (prefers-reduced-motion: reduce) {
          .relay-tile, .relay-chip, .relay-pill, .relay-suggest, .relay-medallion, .relay-medallion-glow { animation: none !important; transition: none !important; }
          .relay-tile:hover, .relay-suggest:hover { transform: none !important; }
          .relay-suggest-sheen { display: none; }
        }
      `}</style>
    </div>
  );
}
