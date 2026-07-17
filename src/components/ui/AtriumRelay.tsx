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
  personaSlot?: React.ReactNode;
  anchors: RelayTile[];
  lanes: RelayLane[];
  you: RelayPill[];
  isMobile: boolean;
}

const ACCENT: Record<RelayAccent, { glyph: string; medallion: string; glow: string; band: string; rule: string; tileTop: string; tileBg: string; border: string }> = {
  terracotta: { glyph: "#A24B28", medallion: "rgba(184,92,56,0.16)", glow: "rgba(184,92,56,0.6)", band: "rgba(184,92,56,0.05)", rule: "rgba(184,92,56,0.4)", tileTop: "#B85C38", tileBg: "linear-gradient(160deg, #FDF3EE 0%, #FCFAF5 70%)", border: "rgba(184,92,56,0.20)" },
  gold: { glyph: "#9A6A1E", medallion: "rgba(212,175,55,0.22)", glow: "rgba(212,175,55,0.7)", band: "rgba(212,175,55,0.06)", rule: "rgba(212,175,55,0.45)", tileTop: "#D4AF37", tileBg: "linear-gradient(160deg, #FCF6E6 0%, #FCFAF5 70%)", border: "rgba(176,135,23,0.22)" },
  sage: { glyph: "#556348", medallion: "rgba(106,124,92,0.22)", glow: "rgba(106,124,92,0.55)", band: "rgba(106,124,92,0.06)", rule: "rgba(106,124,92,0.4)", tileTop: "#6A7C5C", tileBg: "linear-gradient(160deg, #F3F7EC 0%, #FCFAF5 70%)", border: "rgba(92,107,76,0.22)" },
  anchor: { glyph: "#B85C38", medallion: "rgba(212,175,55,0.20)", glow: "rgba(212,175,55,0.75)", band: "transparent", rule: "rgba(212,175,55,0.5)", tileTop: "#D4AF37", tileBg: "linear-gradient(150deg, #F5EEE2 0%, #FCF6E9 55%, #FCFAF5 100%)", border: "rgba(184,92,56,0.30)" },
};

function Glyph({ k, size }: { k: string; size: string }) {
  const Ico = RelayIcons[k] ?? RelayIcons.palace;
  return <span style={{ width: size, height: size, display: "inline-flex" }}><Ico /></span>;
}

function Medallion({ k, accent, index, big }: { k: string; accent: RelayAccent; index: number; big?: boolean }) {
  const a = ACCENT[accent];
  const delay = `${((index % 6) * 0.7).toFixed(2)}s`;
  return (
    <span
      aria-hidden="true"
      className="relay-med"
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
      }}
    >
      <span aria-hidden="true" className="relay-med-glow" style={{ position: "absolute", inset: 0, background: `radial-gradient(closest-side, ${a.glow}, transparent 72%)`, animationDelay: delay }} />
      <span aria-hidden="true" className="relay-med-glyph" style={{ position: "relative", display: "inline-flex", animationDelay: delay }}>
        <Glyph k={k} size={big ? "1.85rem" : "1.55rem"} />
      </span>
      <span aria-hidden="true" className="relay-med-sheen" style={{ animationDelay: `${(index % 5) * 1.1}s` }} />
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
        boxShadow: tile.anchor ? "0 0.5rem 1.75rem rgba(36,28,21,0.12)" : "0 0.25rem 1rem rgba(36,28,21,0.07)",
        cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", width: "100%" }}>
        <Medallion k={tile.key} accent={accent} index={index} big={tile.anchor} />
        {tile.anchor && tile.thumbs && tile.thumbs.length > 0 ? (
          <span style={{ marginLeft: "auto" }}><ThumbFan thumbs={tile.thumbs} /></span>
        ) : null}
      </div>
      <span style={{ display: "flex", flexDirection: "column", gap: "0.15rem", minWidth: 0 }}>
        <span style={{ fontFamily: T.font.display, fontWeight: 600, fontSize: tile.anchor ? "1.5rem" : "1.1875rem", lineHeight: 1.15, color: T.color.charcoal }}>{tile.title}</span>
        <span style={{ fontFamily: T.font.body, fontWeight: 400, fontSize: "0.9375rem", lineHeight: 1.35, color: T.color.muted }}>{tile.desc}</span>
        {tile.datum ? <span style={{ fontFamily: T.font.body, fontWeight: 700, fontSize: "0.875rem", color: a.glyph, marginTop: "0.25rem" }}>{tile.datum}</span> : null}
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
          {score ? (
            <button type="button" onClick={score.onClick} className="relay-chip" style={{ display: "flex", alignItems: "center", gap: "0.6rem", minHeight: "3rem", padding: "0 1rem", borderRadius: "0.75rem", border: `0.0625rem solid ${T.color.warmStone}`, background: "linear-gradient(135deg, rgba(212,175,55,0.12), rgba(212,175,55,0.03))", cursor: "pointer" }}>
              <span aria-hidden="true" style={{ width: "1.375rem", height: "1.375rem", display: "inline-flex", color: "#B08717" }}><RelayIcons.points /></span>
              <span style={{ fontFamily: T.font.display, fontWeight: 700, fontSize: "1.0625rem", color: T.color.charcoal, fontVariantNumeric: "tabular-nums" }}>{score.points.toLocaleString()}</span>
              <span style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.muted, marginRight: "0.25rem" }}>pts</span>
              <span aria-hidden="true" style={{ width: "0.0625rem", height: "1.25rem", background: T.color.warmStone }} />
              <span aria-hidden="true" style={{ width: "1.375rem", height: "1.375rem", display: "inline-flex", color: T.color.terracotta }}><RelayIcons.badge /></span>
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
              <button key={p.key} type="button" onClick={p.onClick} className="relay-pill" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", minHeight: "2.75rem", padding: "0 1rem", borderRadius: "2rem", border: `0.0625rem solid ${T.color.warmStone}`, background: "transparent", cursor: "pointer", fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: 600, color: T.color.walnut }}>
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
        /* dynamic medallions: glow pulse + glyph breathe + a periodic sheen sweep */
        .relay-med-glow { opacity: 0.3; }
        .relay-med-sheen { position: absolute; top: -30%; bottom: -30%; left: -60%; width: 45%; background: linear-gradient(105deg, transparent, rgba(255,248,224,0.85), transparent); transform: skewX(-20deg); }
        @media (prefers-reduced-motion: no-preference) {
          .relay-med-glow { animation: relay-glow 3.4s ease-in-out infinite; }
          .relay-med-glyph { animation: relay-breathe 3.4s ease-in-out infinite; transform-origin: center; }
          .relay-med-sheen { animation: relay-medsheen 5s ease-in-out infinite; }
        }
        .relay-tile:hover .relay-med-glow { opacity: 0.85; }
        .relay-tile:hover .relay-med-glyph { transform: scale(1.12); }
        .relay-tile:focus-visible, .relay-chip:focus-visible, .relay-pill:focus-visible, .relay-suggest:focus-visible { outline: 0.1875rem solid ${T.color.gold}; outline-offset: 0.1875rem; }
        @keyframes relay-rise { from { opacity: 0; transform: translateY(0.6rem); } to { opacity: 1; transform: none; } }
        @keyframes relay-sheen { 0%,14% { left: -45%; } 60%,100% { left: 135%; } }
        @keyframes relay-medsheen { 0%,55% { left: -60%; } 78%,100% { left: 150%; } }
        @keyframes relay-breathe { 0%,100% { transform: scale(1); } 50% { transform: scale(1.09); } }
        @keyframes relay-glow { 0%,100% { opacity: 0.22; } 50% { opacity: 0.7; } }
        @media (prefers-reduced-motion: reduce) {
          .relay-tile, .relay-chip, .relay-pill, .relay-suggest, .relay-med-glow, .relay-med-glyph, .relay-med-sheen { animation: none !important; transition: none !important; }
          .relay-tile:hover, .relay-suggest:hover { transform: none !important; }
          .relay-suggest-sheen, .relay-med-sheen { display: none; }
        }
      `}</style>
    </div>
  );
}
