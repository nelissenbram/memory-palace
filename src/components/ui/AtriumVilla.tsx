"use client";

/**
 * AtriumVilla — "Het paleis doet de deur open" (drastic hub redesign, iter 1).
 *
 * The Atrium is no longer a dashboard ABOUT the palace: you stand before your
 * villa at the hour of day it actually is, and the Maggiordomo receives you
 * with exactly what matters today.
 *
 *   1. THE SCENE — full-bleed living villa: sky follows the clock, stars and
 *      fireflies at night, windows glow with palace warmth, the garden fills
 *      out with consistent weeks. The villa itself is the button (tap = enter).
 *   2. THE STEWARD'S TRAY — overlapping card at the scene's foot: greeting,
 *      ledger line, and the ONE sealed suggestion.
 *   3. FAMILY EMBERS — cameo medallions of loved-one presence.
 *   4. THREE DOORS instead of three lanes — Capture / Bring to life / Share
 *      as tall door panels; a door opens as a bottom-sheet with its tiles.
 *   5. Quiet nameplates (Palace / Library) + the You row at the foot.
 *
 * Design refs: docs/ACTIVATING_MENU_RESEARCH.md (recs 3, 4-lite, 5, 8);
 * INK & EMBER palette; Fraunces display; warmth model in src/lib/warmth.ts.
 */

import React, { useEffect, useMemo, useState } from "react";
import { T } from "@/lib/theme";
import RelayIcons from "./RelayIcons";
import { PalaceIllustration } from "./AnchorArt";
import { Sheet } from "./Sheet";
import { EmbersRow } from "./AtriumRelay";
import type { RelayLane, RelayTile, RelaySuggestion, RelayPill, RelayScore, RelayLedger, RelayEmbers } from "./AtriumRelay";
import type { TimeOfDay, WarmthLevel } from "@/lib/warmth";

/* ── Sky by hour (the page stays cream; the scene lives) ── */
const SKY: Record<TimeOfDay, { bg: string; ink: string; horizon: string }> = {
  morning: { bg: "linear-gradient(180deg, #EDF0E1 0%, #F5EFDB 55%, #FBF5E7 100%)", ink: "#403B36", horizon: "rgba(122,140,100,0.16)" },
  day: { bg: "linear-gradient(180deg, #F2EFDE 0%, #F8F2E3 60%, #FCF8ED 100%)", ink: "#403B36", horizon: "rgba(201,154,46,0.12)" },
  golden: { bg: "linear-gradient(180deg, #F2E2C6 0%, #F5DDBB 45%, #F0D2AC 100%)", ink: "#403B36", horizon: "rgba(184,92,56,0.22)" },
  night: { bg: "linear-gradient(180deg, #2C2925 0%, #3A372F 55%, #4A453B 100%)", ink: "#F4EBD8", horizon: "rgba(212,175,55,0.14)" },
};

const DOOR_TINT: Record<string, { arch: string; fill: string; ink: string; sliver: string }> = {
  terracotta: { arch: "#9A4F2A", fill: "linear-gradient(175deg, #FBF2EC 0%, #F6E7DC 100%)", ink: "#9A4F2A", sliver: "rgba(232,194,85,0.55)" },
  gold: { arch: "#8A6410", fill: "linear-gradient(175deg, #FCF6E5 0%, #F6ECD2 100%)", ink: "#8A6410", sliver: "rgba(232,194,85,0.6)" },
  sage: { arch: "#56683C", fill: "linear-gradient(175deg, #F2F5EA 0%, #E9EEDD 100%)", ink: "#56683C", sliver: "rgba(232,194,85,0.5)" },
};

interface AtriumVillaProps {
  greeting: string;
  userName: string | null;
  datumLine: string;
  ledger?: RelayLedger | null;
  embers?: RelayEmbers | null;
  timeOfDay: TimeOfDay;
  warmth: WarmthLevel;
  warmWeeks: number;
  suggestion: RelaySuggestion;
  onEnterPalace: () => void;
  onEnterLibrary: () => void;
  enterPalaceLabel: string;
  libraryLabel: string;
  suggestedOverline: string;
  palaceDatum?: string;
  libraryDatum?: string;
  lanes: RelayLane[];
  you: RelayPill[];
  score?: RelayScore | null;
  memoriesStrip?: React.ReactNode;
  personaLabel?: string | null;
  personaQuiz?: React.ReactNode;
  onAddName?: () => void;
  isMobile: boolean;
}

/* Deterministic star field (no Math.random in render → stable SSR/CSR). */
const STARS = Array.from({ length: 26 }, (_, i) => ({
  left: ((i * 37) % 100),
  top: ((i * 23) % 52),
  size: 0.09 + (i % 3) * 0.045,
  delay: (i % 7) * 0.6,
}));
const FIREFLIES = Array.from({ length: 7 }, (_, i) => ({
  left: 12 + ((i * 31) % 76),
  bottom: 6 + ((i * 17) % 22),
  delay: i * 1.1,
}));

function Glyph({ k, size, color }: { k: string; size: string; color: string }) {
  const Ico = RelayIcons[k] ?? RelayIcons.palace;
  return <span style={{ width: size, height: size, display: "inline-flex", color }}><Ico /></span>;
}

/* ── One tall door panel; opens its lane as a sheet ── */
function Door({ lane, count, onOpen, isMobile }: { lane: RelayLane; count: number; onOpen: () => void; isMobile: boolean }) {
  const tint = DOOR_TINT[lane.accent] ?? DOOR_TINT.gold;
  return (
    <button type="button" onClick={onOpen} className="villa-door" style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.65rem", padding: isMobile ? "1rem 0.4rem 0.9rem" : "1.25rem 0.75rem 1.1rem", borderRadius: "1rem", border: "0.0625rem solid #E3D6BC", background: T.color.cream, cursor: "pointer", boxShadow: "0 0.25rem 1rem rgba(64,59,54,0.07)" }}>
      {/* Arched door */}
      <span aria-hidden="true" style={{ position: "relative", width: isMobile ? "3.6rem" : "4.5rem", height: isMobile ? "5rem" : "6.25rem", display: "block" }}>
        <svg viewBox="0 0 72 100" style={{ width: "100%", height: "100%", display: "block" }}>
          {/* light sliver behind the ajar edge — widens on hover */}
          <rect className="villa-door-sliver" x="34" y="10" width="4" height="88" fill={tint.sliver} rx="2" />
          {/* frame */}
          <path d="M 6,98 L 6,38 Q 6,6 36,6 Q 66,6 66,38 L 66,98" fill="none" stroke={tint.arch} strokeWidth="3" opacity="0.65" />
          {/* door leaf (slightly ajar to the left) */}
          <g className="villa-door-leaf">
            <path d="M 12,96 L 12,38 Q 12,13 36,12 L 36,96 Z" fill={tint.fill.includes("gradient") ? "#F8F0E2" : tint.fill} stroke={tint.arch} strokeWidth="1.4" opacity="0.9" />
            {/* panels */}
            <rect x="17" y="34" width="14" height="20" rx="2" fill="none" stroke={tint.arch} strokeWidth="0.9" opacity="0.45" />
            <rect x="17" y="60" width="14" height="24" rx="2" fill="none" stroke={tint.arch} strokeWidth="0.9" opacity="0.45" />
            {/* knob */}
            <circle cx="31" cy="57" r="1.9" fill="#C99A2E" opacity="0.9" />
          </g>
          {/* fixed right leaf */}
          <path d="M 60,96 L 60,38 Q 60,13 36,12 L 36,96 Z" fill="#F4EADA" stroke={tint.arch} strokeWidth="1.4" opacity="0.85" />
          <rect x="41" y="34" width="14" height="20" rx="2" fill="none" stroke={tint.arch} strokeWidth="0.9" opacity="0.4" />
          <rect x="41" y="60" width="14" height="24" rx="2" fill="none" stroke={tint.arch} strokeWidth="0.9" opacity="0.4" />
          {/* threshold */}
          <line x1="2" y1="98" x2="70" y2="98" stroke={tint.arch} strokeWidth="2" opacity="0.5" />
        </svg>
      </span>
      <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.15rem" }}>
        <span style={{ fontFamily: T.font.body, fontSize: isMobile ? "0.6875rem" : "0.75rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: tint.ink, textAlign: "center" }}>{lane.overline}</span>
        <span style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.muted, fontVariantNumeric: "tabular-nums" }}>{count}</span>
      </span>
    </button>
  );
}

/* ── Lane tiles inside the opened door (sheet content) ── */
function DoorSheetContent({ lane, onNavigate }: { lane: RelayLane; onNavigate: (fn: () => void) => void }) {
  const tint = DOOR_TINT[lane.accent] ?? DOOR_TINT.gold;
  const visible = lane.tiles.filter((tl) => !tl.hidden);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", padding: "0.25rem 0 0.75rem" }}>
      {visible.map((tl: RelayTile) => (
        <button key={tl.key} type="button" disabled={tl.soon} onClick={() => { if (!tl.soon) onNavigate(tl.onClick); }} className="villa-sheet-row" style={{ display: "flex", alignItems: "center", gap: "0.85rem", textAlign: "left", padding: "0.75rem 0.85rem", borderRadius: "0.85rem", border: "0.0625rem solid #E3D6BC", background: T.color.cream, cursor: tl.soon ? "default" : "pointer", opacity: tl.soon ? 0.6 : 1 }}>
          <span aria-hidden="true" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "2.5rem", height: "2.5rem", borderRadius: "0.7rem", background: `${tint.ink}14`, flexShrink: 0 }}>
            <Glyph k={tl.key} size="1.4rem" color={tint.ink} />
          </span>
          <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <span style={{ fontFamily: T.font.display, fontWeight: 600, fontSize: "1.0625rem", color: "#403B36" }}>{tl.title}{tl.soon ? <span style={{ fontFamily: T.font.body, fontSize: "0.625rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9A4F2A", marginLeft: "0.5rem" }}>Soon</span> : null}</span>
            <span style={{ fontFamily: T.font.body, fontSize: "0.875rem", color: T.color.muted }}>{tl.desc}</span>
            {tl.datum ? <span style={{ fontFamily: T.font.body, fontWeight: 700, fontSize: "0.8125rem", color: tint.ink, marginTop: "0.1rem" }}>{tl.datum}</span> : null}
          </span>
        </button>
      ))}
    </div>
  );
}

export default function AtriumVilla(props: AtriumVillaProps) {
  const { greeting, userName, datumLine, ledger, embers, timeOfDay, warmth, warmWeeks, suggestion, onEnterPalace, onEnterLibrary, enterPalaceLabel, libraryLabel, suggestedOverline, palaceDatum, libraryDatum, lanes, you, score, memoriesStrip, personaLabel, personaQuiz, onAddName, isMobile } = props;
  const [mounted, setMounted] = useState(false);
  const [openLane, setOpenLane] = useState<string | null>(null);
  useEffect(() => { const id = requestAnimationFrame(() => setMounted(true)); return () => cancelAnimationFrame(id); }, []);

  const sky = SKY[timeOfDay];
  const night = timeOfDay === "night";
  const gardenTier = warmWeeks >= 5 ? 2 : warmWeeks >= 2 ? 1 : 0;
  const activeLane = useMemo(() => lanes.find((l) => l.id === openLane) || null, [lanes, openLane]);
  const SugIco = RelayIcons[suggestion.key] ?? RelayIcons.palace;

  return (
    <div style={{ width: "100%", opacity: mounted ? 1 : 0, transition: "opacity 0.5s ease" }}>

      {/* ═══ 1. THE SCENE — the living villa IS the entrance ═══ */}
      <button
        type="button"
        onClick={onEnterPalace}
        aria-label={enterPalaceLabel}
        className="villa-scene"
        style={{ position: "relative", display: "block", width: "100%", height: isMobile ? "clamp(17rem, 46vh, 24rem)" : "23rem", borderRadius: "1.5rem", overflow: "hidden", border: "0.0625rem solid #E3D6BC", background: sky.bg, cursor: "pointer", padding: 0, boxShadow: night ? "0 1rem 3rem rgba(36,28,21,0.35)" : "0 0.75rem 2.25rem rgba(64,59,54,0.14)" }}
      >
        {/* stars (night) */}
        {night ? STARS.map((s, i) => (
          <span key={`st-${i}`} aria-hidden="true" className="villa-star" style={{ position: "absolute", left: `${s.left}%`, top: `${s.top}%`, width: `${s.size}rem`, height: `${s.size}rem`, borderRadius: "50%", background: "#E8C255", opacity: 0.7, ["--vs-delay" as unknown as string]: `${s.delay}s` }} />
        )) : null}
        {/* sun / moon */}
        {timeOfDay === "golden" ? (
          <span aria-hidden="true" style={{ position: "absolute", right: "12%", top: "22%", width: "3.5rem", height: "3.5rem", borderRadius: "50%", background: "radial-gradient(circle at 40% 35%, #F3D9A4, #DE9E52 70%)", boxShadow: "0 0 3.5rem 1.5rem rgba(222,158,82,0.35)" }} />
        ) : timeOfDay === "morning" ? (
          <span aria-hidden="true" style={{ position: "absolute", left: "14%", top: "18%", width: "2.5rem", height: "2.5rem", borderRadius: "50%", background: "radial-gradient(circle at 40% 35%, #FBF0CE, #E8C255 75%)", boxShadow: "0 0 2.5rem 1rem rgba(232,194,85,0.28)", opacity: 0.85 }} />
        ) : night ? (
          <span aria-hidden="true" style={{ position: "absolute", right: "16%", top: "14%", width: "2.25rem", height: "2.25rem", borderRadius: "50%", background: "#F1E4BF", opacity: 0.9, boxShadow: "inset -0.55rem 0.25rem 0 0.1rem #3A372F, 0 0 2rem 0.5rem rgba(241,228,191,0.22)" }} />
        ) : null}

        {/* horizon wash */}
        <span aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "42%", background: `linear-gradient(180deg, transparent, ${sky.horizon})` }} />

        {/* the villa (existing warmth-aware line art, scaled into the scene) */}
        <span aria-hidden="true" className="villa-art" style={{ position: "absolute", left: "50%", bottom: "-4%", transform: "translateX(-50%)", width: isMobile ? "150%" : "115%", maxWidth: "56rem", pointerEvents: "none" }}>
          <PalaceIllustration hover={false} warmth={warmth} timeOfDay={timeOfDay} />
        </span>

        {/* garden foreground — fills out with warm weeks */}
        <svg aria-hidden="true" viewBox="0 0 400 26" preserveAspectRatio="none" style={{ position: "absolute", left: 0, right: 0, bottom: 0, width: "100%", height: "1.8rem", display: "block", opacity: night ? 0.55 : 0.8 }}>
          <line x1="0" y1="24" x2="400" y2="24" stroke={night ? "#C99A2E" : "#9A4F2A"} strokeWidth="0.6" opacity="0.35" />
          {Array.from({ length: gardenTier === 2 ? 22 : gardenTier === 1 ? 12 : 5 }, (_, i) => {
            const x = 8 + i * (384 / (gardenTier === 2 ? 22 : gardenTier === 1 ? 12 : 5));
            const h = 4 + ((i * 13) % 7);
            return (
              <g key={i} opacity={0.5 + ((i * 7) % 10) / 25}>
                <line x1={x} y1={24} x2={x} y2={24 - h} stroke={night ? "#8C9A6E" : "#56683C"} strokeWidth="0.8" />
                <circle cx={x} cy={24 - h - 1} r={1.3} fill={gardenTier > 0 ? "#B07BA5" : "#8C9A6E"} opacity={gardenTier > 0 ? 0.7 : 0.45} />
              </g>
            );
          })}
        </svg>

        {/* fireflies: night + a tended palace */}
        {night && warmth >= 1 ? FIREFLIES.map((f, i) => (
          <span key={`ff-${i}`} aria-hidden="true" className="villa-firefly" style={{ position: "absolute", left: `${f.left}%`, bottom: `${f.bottom}%`, width: "0.2rem", height: "0.2rem", borderRadius: "50%", background: "#E8C255", boxShadow: "0 0 0.4rem 0.1rem rgba(232,194,85,0.7)", ["--vf-delay" as unknown as string]: `${f.delay}s` }} />
        )) : null}

        {/* enter affordance */}
        <span className="villa-enter-pill" style={{ position: "absolute", right: "1rem", bottom: "1rem", display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.45rem 0.9rem", borderRadius: "2rem", background: night ? "rgba(44,41,37,0.72)" : "rgba(252,250,245,0.82)", border: `0.0625rem solid ${night ? "rgba(212,175,55,0.5)" : "#E3D6BC"}`, backdropFilter: "blur(4px)", fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 700, color: night ? "#F4EBD8" : "#9A4F2A" }}>
          {enterPalaceLabel} →
        </span>
        {palaceDatum ? (
          <span style={{ position: "absolute", left: "1.1rem", top: "1rem", fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.06em", color: night ? "rgba(244,235,216,0.75)" : "rgba(64,59,54,0.55)", fontVariantNumeric: "tabular-nums" }}>{palaceDatum}</span>
        ) : null}
      </button>

      {/* ═══ 2. THE STEWARD'S TRAY — overlapping the scene's foot ═══ */}
      <div style={{ position: "relative", margin: isMobile ? "-2.25rem 0.6rem 1.25rem" : "-2.5rem auto 1.5rem", maxWidth: isMobile ? "none" : "44rem", borderRadius: "1.1rem", border: "0.0625rem solid #E3D6BC", background: T.color.cream, boxShadow: "0 0.75rem 2rem rgba(64,59,54,0.14)", padding: isMobile ? "1rem 1.1rem" : "1.15rem 1.5rem" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <h1 style={{ fontFamily: T.font.display, fontWeight: 600, fontSize: isMobile ? "1.5rem" : "1.8125rem", lineHeight: 1.12, margin: 0, color: "#403B36" }}>
            {greeting}
            {userName ? (
              <>,{" "}<span className="relay-name" style={{ fontStyle: "italic", fontWeight: 700, whiteSpace: "nowrap", background: "linear-gradient(100deg, #8A3F1E 0%, #B85C38 30%, #E8C255 50%, #B85C38 70%, #8A3F1E 100%)", backgroundSize: "220% auto", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "#9A4F2A" }}>{userName}</span></>
            ) : onAddName ? (
              <>{" "}<button type="button" onClick={(e) => { e.stopPropagation(); onAddName(); }} style={{ fontFamily: "inherit", fontStyle: "italic", fontSize: "0.62em", fontWeight: 600, color: "#9A4F2A", background: "none", border: "none", borderBottom: "0.125rem solid rgba(212,175,55,0.6)", padding: "0 0.15rem", cursor: "pointer", verticalAlign: "baseline" }}>add your name</button></>
            ) : null}
          </h1>
          <span style={{ fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 500, color: "#716A5E", fontVariantNumeric: "tabular-nums" }}>{datumLine}</span>
        </div>
        {ledger ? (
          <p style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem", fontFamily: T.font.display, fontStyle: "italic", fontWeight: 500, fontSize: "0.9375rem", color: ledger.warm ? "#8A6410" : "#716A5E", margin: "0.4rem 0 0", fontVariantNumeric: "tabular-nums" }}>
            <span aria-hidden="true" className={ledger.warm ? "relay-ember-flicker" : undefined} style={{ width: "0.5rem", height: "0.5rem", borderRadius: "50%", background: ledger.warm ? "radial-gradient(circle at 40% 35%, #E8C255, #B85C38)" : "#C9BFAE", flexShrink: 0 }} />
            {ledger.text}
          </p>
        ) : null}

        {/* the ONE sealed suggestion */}
        <button type="button" onClick={suggestion.onClick} className="villa-seal-card" style={{ display: "flex", alignItems: "center", gap: "0.85rem", width: "100%", textAlign: "left", marginTop: "0.85rem", padding: "0.8rem 0.9rem", borderRadius: "0.9rem", border: "0.0625rem dashed rgba(154,79,42,0.4)", background: "linear-gradient(160deg, rgba(212,175,55,0.07), rgba(252,250,245,0))", cursor: "pointer" }}>
          <span aria-hidden="true" style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", width: "2.75rem", height: "2.75rem", borderRadius: "50%", background: "radial-gradient(circle at 38% 32%, #C26A42, #8A3F1E 78%)", boxShadow: "0 0.2rem 0.6rem rgba(138,63,30,0.4)", flexShrink: 0 }}>
            <span style={{ width: "1.35rem", height: "1.35rem", display: "inline-flex", color: "#F4EBD8" }}><SugIco /></span>
          </span>
          <span style={{ display: "flex", flexDirection: "column", gap: "0.05rem", minWidth: 0 }}>
            <span style={{ fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#9A4F2A" }}>{suggestedOverline}</span>
            <span style={{ fontFamily: T.font.display, fontWeight: 600, fontSize: "1.125rem", lineHeight: 1.15, color: "#403B36" }}>{suggestion.title}</span>
            <span style={{ fontFamily: T.font.body, fontSize: "0.875rem", color: T.color.muted }}>{suggestion.reason}</span>
            {suggestion.progress ? (
              <span aria-hidden="true" style={{ display: "block", marginTop: "0.4rem", height: "0.3rem", borderRadius: "1rem", background: "rgba(154,79,42,0.14)", overflow: "hidden", maxWidth: "14rem" }}>
                <span style={{ display: "block", height: "100%", width: `${Math.round((100 * suggestion.progress.done) / Math.max(1, suggestion.progress.total))}%`, background: "#B85C38", borderRadius: "1rem" }} />
              </span>
            ) : null}
          </span>
        </button>
      </div>

      {/* persona quiz (until taken) */}
      {(!personaLabel && personaQuiz) ? <div style={{ marginBottom: "1.5rem" }}>{personaQuiz}</div> : null}

      {/* ═══ 3. FAMILY EMBERS ═══ */}
      {embers && embers.people.length > 0 ? <EmbersRow embers={embers} /> : null}

      {/* ═══ 4. THREE DOORS ═══ */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: isMobile ? "0.6rem" : "1rem", marginBottom: "1rem" }}>
        {lanes.map((lane) => (
          <Door key={lane.id} lane={lane} count={lane.tiles.filter((tl) => !tl.hidden).length} onOpen={() => setOpenLane(lane.id)} isMobile={isMobile} />
        ))}
      </div>

      {/* ═══ 5. NAMEPLATES + YOU ROW ═══ */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.625rem", marginBottom: memoriesStrip ? "1.25rem" : 0 }}>
        <button type="button" onClick={onEnterLibrary} className="villa-plate" style={{ display: "inline-flex", alignItems: "center", gap: "0.55rem", minHeight: "2.9rem", padding: "0 1.15rem", borderRadius: "0.7rem", border: "0.0625rem solid rgba(212,175,55,0.45)", background: "linear-gradient(170deg, #F7EFDF, #FCF7EA)", cursor: "pointer", fontFamily: T.font.display, fontSize: "0.9375rem", fontWeight: 600, color: "#8A6410", boxShadow: "inset 0 0 0 0.0625rem rgba(255,255,255,0.6)" }}>
          <span aria-hidden="true" style={{ width: "1.2rem", height: "1.2rem", display: "inline-flex" }}><RelayIcons.library /></span>
          {libraryLabel}{libraryDatum ? <span style={{ fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 600, color: T.color.muted, fontVariantNumeric: "tabular-nums" }}>{libraryDatum}</span> : null}
        </button>
        {score ? (
          <button type="button" onClick={score.onClick} className="villa-plate" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", minHeight: "2.9rem", padding: "0 1rem", borderRadius: "0.7rem", border: "0.0625rem solid #E3D6BC", background: T.color.cream, cursor: "pointer", fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600, color: "#716A5E", fontVariantNumeric: "tabular-nums" }}>
            <span aria-hidden="true" style={{ width: "1.1rem", height: "1.1rem", display: "inline-flex", color: "#B08717" }}><RelayIcons.points /></span>
            {score.points.toLocaleString()}
            <span aria-hidden="true" style={{ width: "0.0625rem", height: "1.1rem", background: "#E3D6BC" }} />
            <span aria-hidden="true" style={{ width: "1.1rem", height: "1.1rem", display: "inline-flex", color: "#9A4F2A" }}><RelayIcons.badge /></span>
            {score.badgesEarned}/{score.badgesTotal}
          </button>
        ) : null}
        {you.map((p) => {
          const Ico = RelayIcons[p.key] ?? RelayIcons.settings;
          return (
            <button key={p.key} type="button" onClick={p.onClick} className="villa-plate" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", minHeight: "2.9rem", padding: "0 1rem", borderRadius: "0.7rem", border: "0.0625rem solid #E3D6BC", background: "transparent", cursor: "pointer", fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600, color: "#716A5E" }}>
              <span aria-hidden="true" style={{ width: "1.05rem", height: "1.05rem", display: "inline-flex" }}><Ico /></span>{p.label}
            </button>
          );
        })}
      </div>

      {/* memories strip stays (the emotional shelf) */}
      {memoriesStrip ? <div>{memoriesStrip}</div> : null}

      {/* ═══ DOOR SHEET ═══ */}
      <Sheet open={!!activeLane} onClose={() => setOpenLane(null)} title={activeLane?.overline} background={T.color.cream}>
        {activeLane ? <DoorSheetContent lane={activeLane} onNavigate={(fn) => { setOpenLane(null); fn(); }} /> : null}
      </Sheet>

      <style>{`
        .villa-scene { transition: transform 0.25s ease, box-shadow 0.25s ease; }
        .villa-scene:hover { transform: translateY(-0.2rem); }
        .villa-art { transition: filter 0.4s ease; }
        .villa-scene:hover .villa-art { filter: brightness(1.07) saturate(1.05); }
        .villa-enter-pill { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .villa-scene:hover .villa-enter-pill { transform: translateX(0.2rem); box-shadow: 0 0.25rem 0.9rem rgba(212,175,55,0.35); }
        .villa-door { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .villa-door:hover { transform: translateY(-0.1875rem); box-shadow: 0 0.75rem 1.75rem rgba(36,28,21,0.15); }
        .villa-door-sliver { transition: width 0.25s ease, x 0.25s ease; }
        .villa-door:hover .villa-door-sliver { width: 10px; x: 30px; }
        .villa-door-leaf { transition: transform 0.25s ease; transform-origin: 12px 55px; }
        .villa-door:hover .villa-door-leaf { transform: skewY(-1.5deg) translateX(-1px); }
        .villa-seal-card { transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease; }
        .villa-seal-card:hover { transform: translateY(-0.125rem); border-color: rgba(154,79,42,0.7); box-shadow: 0 0.5rem 1.5rem rgba(154,79,42,0.14); }
        .villa-plate { transition: background 0.2s ease, border-color 0.2s ease; }
        .villa-plate:hover { background: ${T.color.warmStone}55; border-color: ${T.color.terracotta}; }
        .villa-sheet-row { transition: transform 0.15s ease, box-shadow 0.15s ease; }
        .villa-sheet-row:hover { transform: translateY(-0.125rem); box-shadow: 0 0.4rem 1.1rem rgba(36,28,21,0.12); }
        @media (prefers-reduced-motion: no-preference) {
          .villa-star { animation: villa-twinkle 3.4s ease-in-out infinite; animation-delay: var(--vs-delay, 0s); }
          .villa-firefly { animation: villa-drift 7s ease-in-out infinite; animation-delay: var(--vf-delay, 0s); }
          .relay-name { animation: relay-name-shimmer 5s linear infinite; }
          .relay-ember-flicker { animation: relay-ember-flicker 2.4s ease-in-out infinite; }
        }
        @keyframes villa-twinkle { 0%,100% { opacity: 0.35; transform: scale(0.85); } 50% { opacity: 0.9; transform: scale(1.15); } }
        @keyframes villa-drift { 0%,100% { transform: translate(0,0); opacity: 0.35; } 30% { transform: translate(0.55rem,-0.8rem); opacity: 1; } 65% { transform: translate(-0.35rem,-1.3rem); opacity: 0.55; } }
        @keyframes relay-name-shimmer { to { background-position: 220% center; } }
        @keyframes relay-ember-flicker { 0%,100% { opacity: 0.75; transform: scale(0.92); } 50% { opacity: 1; transform: scale(1.08); } }
        .villa-scene:focus-visible, .villa-door:focus-visible, .villa-plate:focus-visible, .villa-seal-card:focus-visible, .villa-sheet-row:focus-visible { outline: 0.1875rem solid ${T.color.gold}; outline-offset: 0.1875rem; }
        @media (prefers-reduced-motion: reduce) {
          .villa-scene, .villa-door, .villa-seal-card, .villa-plate, .villa-sheet-row, .villa-star, .villa-firefly, .relay-name, .relay-ember-flicker { animation: none !important; transition: none !important; }
          .villa-scene:hover, .villa-door:hover, .villa-seal-card:hover { transform: none !important; }
        }
      `}</style>
    </div>
  );
}
