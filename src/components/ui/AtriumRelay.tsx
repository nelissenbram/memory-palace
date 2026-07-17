"use client";

/**
 * AtriumRelay — "The Maggiordomo" concierge relay board (round-10).
 *
 * The Atrium as a world-class navigation hub: a Steward strip (greeting + real
 * datum + ONE state-aware Suggested-Next card + quick chips) above a complete,
 * verb-zoned board of every destination as a Living Tile (crafted glyph +
 * Fraunces title + descriptor + optional live datum), in tonal lanes
 * (Step inside / Add a memory / Share) plus a quiet You utility row.
 *
 * Phase 1 = the full board skeleton (static, wired, reduced-motion safe). Live
 * data (Phase 3), the single gliding gold focus ring (Phase 4) and the palace
 * doorway accent (Phase 5) layer on top without changing this contract.
 */

import React, { useEffect, useState } from "react";
import { T } from "@/lib/theme";
import RelayIcons from "./RelayIcons";

export type RelayTile = {
  key: string;              // RelayIcons glyph key
  title: string;
  desc: string;
  onClick: () => void;
  span?: boolean;           // 2-column anchor tile
  datum?: React.ReactNode;  // live datum (Phase 3); optional
  hidden?: boolean;
};
export type RelayLane = {
  id: string;
  overline: string;
  tone: "cream" | "parchment" | "sage";
  tiles: RelayTile[];
};
export type RelaySuggestion = { key: string; title: string; reason: string; onClick: () => void };
export type RelayChip = { key: string; label: string; onClick: () => void };
export type RelayPill = { key: string; label: string; onClick: () => void };

interface AtriumRelayProps {
  greeting: string;
  userName: string | null;
  datumLine: string;
  suggestion: RelaySuggestion;
  chips: RelayChip[];
  lanes: RelayLane[];
  you: RelayPill[];
  isMobile: boolean;
}

const TONE: Record<RelayLane["tone"], { band: string; medallion: string; glyph: string }> = {
  cream: { band: "transparent", medallion: "rgba(184,92,56,0.12)", glyph: T.color.terracotta },
  parchment: { band: "rgba(239,230,212,0.5)", medallion: "rgba(212,175,55,0.16)", glyph: "#9A6A1E" },
  sage: { band: "rgba(122,138,110,0.12)", medallion: "rgba(106,124,92,0.18)", glyph: "#5C6B4C" },
};

function Glyph({ k, size = "1.5rem" }: { k: string; size?: string }) {
  const Ico = RelayIcons[k] ?? RelayIcons.palace;
  return <span style={{ width: size, height: size, display: "inline-flex" }}><Ico /></span>;
}

function Tile({ tile, tone, index }: { tile: RelayTile; tone: RelayLane["tone"]; index: number }) {
  if (tile.hidden) return null;
  const tn = TONE[tone];
  return (
    <button
      type="button"
      onClick={tile.onClick}
      className="relay-tile"
      style={{
        gridColumn: tile.span ? "span 2" : "auto",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: "0.625rem",
        textAlign: "left",
        minHeight: tile.span ? "8.5rem" : "7rem",
        padding: "1.125rem",
        borderRadius: "1rem",
        border: `0.0625rem solid ${T.color.warmStone}`,
        background: T.color.cream,
        boxShadow: "0 0.25rem 1rem rgba(36,28,21,0.07)",
        cursor: "pointer",
        // subtle once-in staggered arrival, reduced-motion safe (see <style>)
        animationDelay: `${Math.min(index, 8) * 45}ms`,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "2.75rem",
          height: "2.75rem",
          borderRadius: "0.75rem",
          background: tn.medallion,
          color: tn.glyph,
        }}
      >
        <Glyph k={tile.key} />
      </span>
      <span style={{ display: "flex", flexDirection: "column", gap: "0.15rem", minWidth: 0 }}>
        <span style={{ fontFamily: T.font.display, fontWeight: 600, fontSize: tile.span ? "1.375rem" : "1.1875rem", lineHeight: 1.15, color: T.color.charcoal }}>
          {tile.title}
        </span>
        <span style={{ fontFamily: T.font.body, fontWeight: 400, fontSize: "0.9375rem", lineHeight: 1.35, color: T.color.muted }}>
          {tile.desc}
        </span>
        {tile.datum ? (
          <span style={{ fontFamily: T.font.body, fontWeight: 600, fontSize: "0.875rem", color: T.color.walnut, marginTop: "0.25rem" }}>
            {tile.datum}
          </span>
        ) : null}
      </span>
    </button>
  );
}

export default function AtriumRelay({
  greeting,
  userName,
  datumLine,
  suggestion,
  chips,
  lanes,
  you,
  isMobile,
}: AtriumRelayProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const id = requestAnimationFrame(() => setMounted(true)); return () => cancelAnimationFrame(id); }, []);

  const SugIco = RelayIcons[suggestion.key] ?? RelayIcons.palace;

  return (
    <div style={{ width: "100%", opacity: mounted ? 1 : 0, transition: "opacity 0.5s ease" }}>
      {/* ── STEWARD STRIP ── */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.6fr 1fr", gap: "1.25rem", alignItems: "stretch", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontFamily: T.font.display, fontWeight: 600, fontSize: isMobile ? "1.75rem" : "2.25rem", lineHeight: 1.12, margin: 0, color: T.color.charcoal }}>
            {greeting}
            {userName ? <>, <span style={{ color: T.color.terracotta }}>{userName}</span></> : null}
          </h1>
          <p style={{ fontFamily: T.font.body, fontSize: "1rem", fontWeight: 500, color: T.color.muted, margin: "0.5rem 0 1rem", fontVariantNumeric: "tabular-nums" }}>
            {datumLine}
          </p>

          {/* Suggested-Next card */}
          <button
            type="button"
            onClick={suggestion.onClick}
            className="relay-suggest"
            style={{
              position: "relative",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              width: "100%",
              textAlign: "left",
              padding: "1.125rem 1.25rem",
              borderRadius: "1rem",
              border: "none",
              cursor: "pointer",
              color: T.color.linen,
              background: `linear-gradient(135deg, ${T.color.terracotta}, #A24B28)`,
              boxShadow: "0 0.75rem 1.75rem rgba(154,79,42,0.35)",
            }}
          >
            <span aria-hidden="true" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "3rem", height: "3rem", borderRadius: "0.75rem", background: "rgba(255,255,255,0.16)", color: T.color.linen, flexShrink: 0 }}>
              <span style={{ width: "1.6rem", height: "1.6rem", display: "inline-flex" }}><SugIco /></span>
            </span>
            <span style={{ display: "flex", flexDirection: "column", gap: "0.1rem", minWidth: 0, position: "relative", zIndex: 1 }}>
              <span style={{ fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: T.color.goldLight ?? "#E8C87A" }}>
                {suggestion.reason ? "Suggested for you" : ""}
              </span>
              <span style={{ fontFamily: T.font.display, fontWeight: 600, fontSize: "1.25rem", lineHeight: 1.15 }}>{suggestion.title}</span>
              <span style={{ fontFamily: T.font.body, fontSize: "0.9375rem", color: "rgba(250,247,240,0.86)" }}>{suggestion.reason}</span>
            </span>
            <span aria-hidden="true" className="relay-suggest-sheen" />
          </button>
        </div>

        {/* chips tray */}
        <div style={{ display: "flex", flexDirection: isMobile ? "row" : "column", flexWrap: "wrap", gap: "0.625rem", justifyContent: "flex-start" }}>
          {chips.map((c) => {
            const Ico = RelayIcons[c.key] ?? RelayIcons.continue;
            return (
              <button key={c.key} type="button" onClick={c.onClick} className="relay-chip" style={{
                display: "inline-flex", alignItems: "center", gap: "0.625rem", flex: isMobile ? "1 1 auto" : "0 0 auto",
                minHeight: "3rem", padding: "0 1.125rem", borderRadius: "0.75rem",
                border: `0.0625rem solid ${T.color.warmStone}`, background: T.color.cream, cursor: "pointer",
                fontFamily: T.font.body, fontSize: "0.9375rem", fontWeight: 600, color: T.color.charcoal,
              }}>
                <span aria-hidden="true" style={{ width: "1.25rem", height: "1.25rem", display: "inline-flex", color: T.color.terracotta }}><Ico /></span>
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── RELAY BOARD (verb-zoned lanes) ── */}
      {lanes.map((lane) => {
        const visible = lane.tiles.filter((t) => !t.hidden);
        if (visible.length === 0) return null;
        return (
          <section key={lane.id} aria-label={lane.overline} style={{ background: TONE[lane.tone].band, borderRadius: "1.25rem", padding: TONE[lane.tone].band === "transparent" ? "0 0 1.75rem" : "1.25rem 1.25rem 1.5rem", margin: "0 0 1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", margin: "0 0 1rem" }}>
              <span style={{ fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: T.color.walnut }}>{lane.overline}</span>
              <span aria-hidden="true" style={{ flex: 1, height: "0.0625rem", background: `linear-gradient(90deg, ${T.color.gold}66, transparent)` }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(${isMobile ? "8.5rem" : "11rem"}, 1fr))`, gap: "0.875rem" }}>
              {visible.map((t, i) => <Tile key={t.key} tile={t} tone={lane.tone} index={i} />)}
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
              <button key={p.key} type="button" onClick={p.onClick} className="relay-pill" style={{
                display: "inline-flex", alignItems: "center", gap: "0.5rem", minHeight: "2.75rem", padding: "0 1rem",
                borderRadius: "2rem", border: `0.0625rem solid ${T.color.warmStone}`, background: "transparent", cursor: "pointer",
                fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: 600, color: T.color.walnut,
              }}>
                <span aria-hidden="true" style={{ width: "1.125rem", height: "1.125rem", display: "inline-flex" }}><Ico /></span>
                {p.label}
              </button>
            );
          })}
        </div>
      ) : null}

      <style>{`
        .relay-tile { transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease; animation: relay-rise 0.5s ease both; }
        .relay-tile:hover { transform: translateY(-0.1875rem); box-shadow: 0 0.75rem 1.75rem rgba(36,28,21,0.14); border-color: ${T.color.terracotta}; }
        .relay-tile:active { transform: translateY(0); }
        .relay-chip, .relay-pill { transition: background 0.2s ease, border-color 0.2s ease, transform 0.15s ease; }
        .relay-chip:hover, .relay-pill:hover { background: ${T.color.warmStone}55; border-color: ${T.color.terracotta}; }
        .relay-suggest { transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease; }
        .relay-suggest:hover { transform: translateY(-0.1875rem); box-shadow: 0 1rem 2.25rem rgba(154,79,42,0.45); filter: brightness(1.04); }
        .relay-suggest-sheen { position: absolute; top: 0; bottom: 0; left: -40%; width: 40%; background: linear-gradient(105deg, transparent, rgba(255,240,200,0.4), transparent); transform: skewX(-18deg); animation: relay-sheen 6s ease-in-out infinite; }
        .relay-tile:focus-visible, .relay-chip:focus-visible, .relay-pill:focus-visible, .relay-suggest:focus-visible { outline: 0.1875rem solid ${T.color.gold}; outline-offset: 0.1875rem; }
        @keyframes relay-rise { from { opacity: 0; transform: translateY(0.6rem); } to { opacity: 1; transform: none; } }
        @keyframes relay-sheen { 0%,14% { left: -45%; } 60%,100% { left: 135%; } }
        @media (prefers-reduced-motion: reduce) {
          .relay-tile, .relay-chip, .relay-pill, .relay-suggest { animation: none !important; transition: none !important; }
          .relay-tile:hover, .relay-suggest:hover { transform: none !important; }
          .relay-suggest-sheen { display: none; }
        }
      `}</style>
    </div>
  );
}
