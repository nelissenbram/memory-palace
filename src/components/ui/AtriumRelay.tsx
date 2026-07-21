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
  note?: string;
  art?: React.ReactNode;
};
export type RelayAccent = "terracotta" | "gold" | "sage" | "anchor" | "anchorLibrary";
export type RelayLane = { id: string; overline: string; accent: RelayAccent; tiles: RelayTile[] };
export type RelaySuggestion = { key: string; title: string; reason: string; onClick: () => void; progress?: { done: number; total: number } };
export type RelayChip = { key: string; label: string; onClick: () => void };
export type RelayPill = { key: string; label: string; onClick: () => void };
export type RelayScore = { points: number; badgesEarned: number; badgesTotal: number; onClick: () => void };
/** Keeper's Ledger — the forgiving weekly "kept warm" line (never a scolding streak). */
export type RelayLedger = { text: string; warm: boolean };
/** Family Embers — one loved one's recent presence on the palace. */
export type EmberPerson = { key: string; name: string; unseen: number; latest?: string };
export type RelayEmbers = { title: string; people: EmberPerson[]; onOpen: () => void };

interface AtriumRelayProps {
  greeting: string;
  userName: string | null;
  datumLine: string;
  ledger?: RelayLedger | null;
  embers?: RelayEmbers | null;
  /** Subtle time-of-day wash laid over the board top (TIME_WASH from lib/warmth). */
  topWash?: string;
  score?: RelayScore | null;
  suggestion: RelaySuggestion;
  chips: RelayChip[];
  personaLabel?: string | null;
  personaQuiz?: React.ReactNode;
  onChangeStyle?: () => void;
  onChooseJourney?: () => void;
  onAddName?: () => void;
  memoriesStrip?: React.ReactNode;
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
  terracotta: { glyph: "#9A4F2A", medallion: "rgba(154,79,42,0.11)", glow: "rgba(154,79,42,0.45)", band: "rgba(154,79,42,0.045)", rule: "rgba(154,79,42,0.35)", tileTop: "#B85C38", tileBg: "linear-gradient(160deg, #FBF2EC 0%, #FCFAF5 78%)", border: "#E7D9C4", titleColor: "#403B36", descColor: "#716A5E", datumColor: "#9A4F2A" },
  gold: { glyph: "#8A6410", medallion: "rgba(201,154,46,0.14)", glow: "rgba(212,175,55,0.5)", band: "rgba(201,154,46,0.05)", rule: "rgba(201,154,46,0.35)", tileTop: "#C99A2E", tileBg: "linear-gradient(160deg, #FCF6E5 0%, #FCFAF5 78%)", border: "#E9DCBE", titleColor: "#403B36", descColor: "#716A5E", datumColor: "#8A6410" },
  sage: { glyph: "#56683C", medallion: "rgba(106,124,92,0.14)", glow: "rgba(106,124,92,0.45)", band: "rgba(106,124,92,0.05)", rule: "rgba(106,124,92,0.35)", tileTop: "#7A8C64", tileBg: "linear-gradient(160deg, #F2F5EA 0%, #FCFAF5 78%)", border: "#DFE3D2", titleColor: "#403B36", descColor: "#716A5E", datumColor: "#56683C" },
  anchor: { glyph: "#9A4F2A", medallion: "rgba(212,175,55,0.16)", glow: "rgba(212,175,55,0.5)", band: "transparent", rule: "rgba(212,175,55,0.45)", tileTop: "#D4AF37", tileBg: "linear-gradient(150deg, #F7EFDF 0%, #FCF7EA 55%, #FCFAF5 100%)", border: "rgba(212,175,55,0.34)", titleColor: "#403B36", descColor: "#716A5E", datumColor: "#9A4F2A" },
  anchorLibrary: { glyph: "#9A4F2A", medallion: "rgba(212,175,55,0.16)", glow: "rgba(212,175,55,0.5)", band: "transparent", rule: "rgba(212,175,55,0.45)", tileTop: "#D4AF37", tileBg: "linear-gradient(150deg, #F5EFE2 0%, #FBF6EC 55%, #FCFAF5 100%)", border: "rgba(212,175,55,0.34)", titleColor: "#403B36", descColor: "#716A5E", datumColor: "#9A4F2A" },
};

// Light header-bar tint per zone (the "lichte bar aan top van de card", USP style).
const HEADER_BG: Record<RelayAccent, string> = {
  terracotta: "rgba(154,79,42,0.06)",
  gold: "rgba(201,154,46,0.07)",
  sage: "rgba(106,124,92,0.07)",
  anchor: "rgba(212,175,55,0.12)",
  anchorLibrary: "rgba(212,175,55,0.12)",
};
const HAIRLINE = "#E3D6BC";

function Glyph({ k, size }: { k: string; size: string }) {
  const Ico = RelayIcons[k] ?? RelayIcons.palace;
  return <span style={{ width: size, height: size, display: "inline-flex" }}><Ico /></span>;
}

function Medallion({ k, accent, index, big, animated }: { k: string; accent: RelayAccent; index: number; big?: boolean; animated?: boolean }) {
  const a = ACCENT[accent];
  // Motion lives inside the glyph's sub-part, but only when `animated` (the
  // anchors) — the individual lane tiles stay calm; the zones animate instead.
  return (
    <span
      aria-hidden="true"
      className={animated ? "relay-anim" : undefined}
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
  const common: React.CSSProperties = {
    position: "relative", display: "flex", flexDirection: "column", alignItems: "stretch", textAlign: "left",
    borderRadius: "1rem", overflow: "hidden", border: `0.0625rem solid ${HAIRLINE}`, background: T.color.cream,
    cursor: "pointer", opacity: tile.soon ? 0.72 : 1,
  };

  // ANCHOR (Enter Palace / Library): original illustration as the header, with
  // the polaroid thumbnail fan dropped below in the body.
  if (tile.anchor) {
    return (
      <button type="button" onClick={tile.onClick} className="relay-tile" style={{ ...common, minHeight: "12rem", boxShadow: "0 0.5rem 1.5rem rgba(64,59,54,0.13)" }}>
        <div style={{ position: "relative", height: "8rem", overflow: "hidden", background: a.tileBg, borderBottom: `0.0625rem solid ${HAIRLINE}` }}>
          {tile.art ? <div className="relay-art" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "0.75rem 1.25rem" }}>{tile.art}</div> : null}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem", padding: "0.85rem 1rem 1rem" }}>
          <span style={{ fontFamily: T.font.display, fontWeight: 600, fontSize: "1.375rem", lineHeight: 1.15, color: "#9A4F2A" }}>{tile.title}</span>
          <span style={{ fontFamily: T.font.body, fontSize: "0.9375rem", color: T.color.muted }}>{tile.desc}</span>
          {tile.thumbs && tile.thumbs.length > 0 ? <span style={{ marginTop: "0.5rem" }}><ThumbFan thumbs={tile.thumbs} /></span> : null}
          {tile.datum ? <span style={{ fontFamily: T.font.body, fontWeight: 700, fontSize: "0.875rem", color: a.datumColor, marginTop: "0.35rem" }}>{tile.datum}</span> : null}
        </div>
      </button>
    );
  }

  // LANE TILE: no header bar (that treatment moved to the zone); a soft
  // zone-tinted wash reveals on hover for a full-card visual expression.
  return (
    <button type="button" onClick={tile.onClick} className="relay-tile" style={{ ...common, minHeight: "6.5rem", padding: "1rem", boxShadow: "0 0.25rem 1rem rgba(64,59,54,0.07)" }}>
      {tile.soon ? (
        <span style={{ position: "absolute", top: "0.55rem", right: "0.6rem", zIndex: 2, fontFamily: T.font.body, fontSize: "0.625rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9A4F2A", background: "rgba(255,255,255,0.7)", borderRadius: "1rem", padding: "0.15rem 0.5rem" }}>Soon</span>
      ) : null}
      <span aria-hidden="true" className="relay-tile-wash" style={{ position: "absolute", inset: 0, background: `radial-gradient(130% 90% at 15% 0%, ${a.medallion}, transparent 62%)`, opacity: 0, pointerEvents: "none" }} />
      <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
          <Medallion k={tile.key} accent={accent} index={index} animated={false} />
          <span style={{ fontFamily: T.font.display, fontWeight: 600, fontSize: "1.0625rem", lineHeight: 1.2, color: "#9A4F2A", minWidth: 0, overflowWrap: "break-word" }}>{tile.title}</span>
        </div>
        <span style={{ fontFamily: T.font.body, fontWeight: 400, fontSize: "0.9375rem", lineHeight: 1.35, color: T.color.muted }}>{tile.desc}</span>
        {tile.datum ? <span style={{ fontFamily: T.font.body, fontWeight: 700, fontSize: "0.875rem", color: a.datumColor }}>{tile.datum}</span> : null}
      </div>
    </button>
  );
}

/* ── Family Embers: gilt-rimmed cameo medallions of loved-one presence.
   Reciprocity, never ranking — a warm glow marks unseen gestures; one tap
   opens the activity so the circle can be closed. ── */
const EMBER_TINTS = [
  { bg: "rgba(154,79,42,0.10)", ink: "#9A4F2A" },
  { bg: "rgba(201,154,46,0.12)", ink: "#8A6410" },
  { bg: "rgba(106,124,92,0.12)", ink: "#56683C" },
];

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "·";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function EmbersRow({ embers }: { embers: RelayEmbers }) {
  return (
    <section aria-label={embers.title} style={{ marginBottom: "1rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.6rem" }}>
        <span style={{ fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#8A6410" }}>{embers.title}</span>
        <span aria-hidden="true" style={{ flex: 1, height: "0.0625rem", background: "linear-gradient(90deg, rgba(201,154,46,0.35), transparent)" }} />
      </div>
      <div style={{ display: "flex", gap: "0.85rem", overflowX: "auto", paddingBottom: "0.25rem" }}>
        {embers.people.map((p, i) => {
          const tint = EMBER_TINTS[i % EMBER_TINTS.length];
          const hasUnseen = p.unseen > 0;
          return (
            <button
              key={p.key}
              type="button"
              onClick={embers.onOpen}
              title={p.latest || p.name}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem", flex: "0 0 auto", width: "4.25rem", background: "none", border: "none", cursor: "pointer", padding: 0 }}
            >
              <span className={hasUnseen ? "relay-ember-glow" : undefined} style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", width: "3.25rem", height: "3.25rem", borderRadius: "50%", background: tint.bg, border: hasUnseen ? "0.125rem solid rgba(212,175,55,0.85)" : `0.0625rem solid ${HAIRLINE}`, boxShadow: hasUnseen ? "0 0 0.75rem rgba(212,175,55,0.45)" : "none" }}>
                <span style={{ fontFamily: T.font.display, fontWeight: 600, fontSize: "1.0625rem", color: tint.ink }}>{initialsOf(p.name)}</span>
                {hasUnseen ? (
                  <span style={{ position: "absolute", top: "-0.2rem", right: "-0.2rem", minWidth: "1.125rem", height: "1.125rem", padding: "0 0.25rem", borderRadius: "1rem", background: "#B85C38", color: "#FCFAF5", fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", fontVariantNumeric: "tabular-nums" }}>{p.unseen}</span>
                ) : null}
              </span>
              <span style={{ fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 600, color: hasUnseen ? "#403B36" : "#716A5E", maxWidth: "4.25rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name.split(/\s+/)[0]}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default function AtriumRelay({ greeting, userName, datumLine, ledger, embers, topWash, score, suggestion, chips, personaLabel, personaQuiz, onChangeStyle, onChooseJourney, onAddName, memoriesStrip, anchors, lanes, you, isMobile }: AtriumRelayProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const id = requestAnimationFrame(() => setMounted(true)); return () => cancelAnimationFrame(id); }, []);
  const SugIco = RelayIcons[suggestion.key] ?? RelayIcons.palace;

  return (
    <div style={{ position: "relative", width: "100%", opacity: mounted ? 1 : 0, transition: "opacity 0.5s ease" }}>
      {/* Time-of-day wash: morning sage / golden-hour ember / night ink — the
          atrium breathes with the day without a single word of UI. */}
      {topWash ? <div aria-hidden="true" style={{ position: "absolute", inset: "-2rem -1rem auto", height: "22rem", background: topWash, pointerEvents: "none", borderRadius: "1.5rem" }} /> : null}
      {/* ── STEWARD STRIP ── */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.7fr 1fr", gap: "1.25rem", alignItems: "start", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontFamily: T.font.display, fontWeight: 600, fontSize: isMobile ? "1.75rem" : "2.25rem", lineHeight: 1.12, margin: 0, color: "#403B36" }}>
            {greeting}
            {userName ? (
              <>,{" "}<span className="relay-name" style={{ fontStyle: "italic", fontWeight: 700, whiteSpace: "nowrap", background: "linear-gradient(100deg, #8A3F1E 0%, #B85C38 30%, #E8C255 50%, #B85C38 70%, #8A3F1E 100%)", backgroundSize: "220% auto", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "#9A4F2A" }}>{userName}</span></>
            ) : onAddName ? (
              <>{" "}<button type="button" onClick={(e) => { e.stopPropagation(); onAddName(); }} style={{ fontFamily: "inherit", fontStyle: "italic", fontSize: "0.62em", fontWeight: 600, color: "#9A4F2A", background: "none", border: "none", borderBottom: "0.125rem solid rgba(212,175,55,0.6)", padding: "0 0.15rem", cursor: "pointer", verticalAlign: "baseline" }}>add your name</button></>
            ) : null}
          </h1>
          <p style={{ fontFamily: T.font.body, fontSize: "1rem", fontWeight: 500, color: "#716A5E", margin: "0.5rem 0 0", fontVariantNumeric: "tabular-nums" }}>{datumLine}</p>
          {ledger ? (
            <p style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem", fontFamily: T.font.display, fontStyle: "italic", fontWeight: 500, fontSize: "0.9375rem", color: ledger.warm ? "#8A6410" : "#716A5E", margin: "0.45rem 0 0", fontVariantNumeric: "tabular-nums" }}>
              <span aria-hidden="true" className={ledger.warm ? "relay-ember-flicker" : undefined} style={{ width: "0.5rem", height: "0.5rem", borderRadius: "50%", background: ledger.warm ? "radial-gradient(circle at 40% 35%, #E8C255, #B85C38)" : "#C9BFAE", flexShrink: 0 }} />
              {ledger.text}
            </p>
          ) : null}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
          {score ? (
            <button type="button" onClick={score.onClick} className="relay-chip" style={{ display: "flex", alignItems: "center", gap: "0.6rem", minHeight: "3rem", padding: "0 1rem", borderRadius: "0.75rem", border: `0.0625rem solid ${T.color.warmStone}`, background: "linear-gradient(135deg, rgba(212,175,55,0.12), rgba(212,175,55,0.03))", cursor: "pointer" }}>
              <span aria-hidden="true" style={{ width: "1.375rem", height: "1.375rem", display: "inline-flex", color: "#B08717" }}><RelayIcons.points /></span>
              <span style={{ fontFamily: T.font.display, fontWeight: 700, fontSize: "1.0625rem", color: "#403B36", fontVariantNumeric: "tabular-nums" }}>{score.points.toLocaleString()}</span>
              <span style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.muted, marginRight: "0.25rem" }}>pts</span>
              <span aria-hidden="true" style={{ width: "0.0625rem", height: "1.25rem", background: T.color.warmStone }} />
              <span aria-hidden="true" style={{ width: "1.375rem", height: "1.375rem", display: "inline-flex", color: "#9A4F2A" }}><RelayIcons.badge /></span>
              <span style={{ fontFamily: T.font.display, fontWeight: 700, fontSize: "1.0625rem", color: "#403B36", fontVariantNumeric: "tabular-nums" }}>{score.badgesEarned}/{score.badgesTotal}</span>
            </button>
          ) : null}
          {chips.map((c) => {
            const Ico = RelayIcons[c.key] ?? RelayIcons.continue;
            return (
              <button key={c.key} type="button" onClick={c.onClick} className="relay-chip" style={{ display: "inline-flex", alignItems: "center", gap: "0.625rem", minHeight: "3rem", padding: "0 1.125rem", borderRadius: "0.75rem", border: `0.0625rem solid ${T.color.warmStone}`, background: T.color.cream, cursor: "pointer", fontFamily: T.font.body, fontSize: "0.9375rem", fontWeight: 600, color: "#403B36" }}>
                <span aria-hidden="true" style={{ width: "1.25rem", height: "1.25rem", display: "inline-flex", color: T.color.terracotta }}><Ico /></span>{c.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── FAMILY EMBERS (loved-one presence — reciprocity, never ranking) ── */}
      {embers && embers.people.length > 0 ? <EmbersRow embers={embers} /> : null}

      {/* ── ANCHORS (Enter Your Palace / Library, side by side, on top) ── */}
      {anchors.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: isMobile ? "0.625rem" : "0.875rem", marginBottom: "1rem" }}>
          {anchors.map((t, i) => <Tile key={t.key} tile={{ ...t, anchor: true }} accent={t.key === "library" ? "anchorLibrary" : "anchor"} index={i} />)}
        </div>
      ) : null}

      {/* ── STYLE QUIZ (full, until taken) OR the subtle SUGGESTED BAR ── */}
      {(!personaLabel && personaQuiz) ? (
        <div style={{ marginBottom: "1.75rem" }}>{personaQuiz}</div>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.75rem 1.25rem", marginBottom: "1.75rem", padding: "0.9rem 1.1rem", borderRadius: "1rem", border: `0.0625rem solid ${HAIRLINE}`, background: T.color.cream, boxShadow: "0 0.25rem 1rem rgba(64,59,54,0.06)" }}>
          <button type="button" onClick={suggestion.onClick} style={{ display: "flex", alignItems: "center", gap: "0.85rem", flex: 1, minWidth: "15rem", textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            <span aria-hidden="true" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "2.75rem", height: "2.75rem", borderRadius: "0.8rem", background: "rgba(154,79,42,0.10)", color: "#9A4F2A", flexShrink: 0 }}>
              <span className="relay-sug-blink" style={{ width: "1.5rem", height: "1.5rem", display: "inline-flex" }}><SugIco /></span>
            </span>
            <span style={{ display: "flex", flexDirection: "column", gap: "0.05rem", minWidth: 0 }}>
              <span style={{ fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#9A4F2A" }}>Suggested for you</span>
              <span style={{ fontFamily: T.font.display, fontWeight: 600, fontSize: "1.1875rem", lineHeight: 1.15, color: "#403B36" }}>{suggestion.title}</span>
              <span style={{ fontFamily: T.font.body, fontSize: "0.9375rem", color: T.color.muted }}>{suggestion.reason}</span>
              {suggestion.progress ? (
                <span aria-hidden="true" style={{ display: "block", marginTop: "0.4rem", height: "0.3rem", borderRadius: "1rem", background: "rgba(154,79,42,0.14)", overflow: "hidden", maxWidth: "16rem" }}>
                  <span style={{ display: "block", height: "100%", width: `${Math.round((100 * suggestion.progress.done) / Math.max(1, suggestion.progress.total))}%`, background: "#B85C38", borderRadius: "1rem" }} />
                </span>
              ) : null}
            </span>
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "0.9rem", flexShrink: 0 }}>
            {personaLabel && onChangeStyle ? (
              <button type="button" onClick={onChangeStyle} title="Change your style" style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", background: "none", border: "none", cursor: "pointer", fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 500, color: T.color.muted }}>
                {personaLabel}<span aria-hidden="true" style={{ width: "0.9rem", height: "0.9rem", display: "inline-flex" }}><RelayIcons.settings /></span>
              </button>
            ) : null}
            {onChooseJourney ? (
              <button type="button" onClick={onChooseJourney} style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", background: "none", border: "none", cursor: "pointer", fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 500, color: T.color.muted }}>
                <span aria-hidden="true" style={{ width: "0.9rem", height: "0.9rem", display: "inline-flex" }}><RelayIcons.journeys /></span>Other journeys
              </button>
            ) : null}
          </div>
        </div>
      )}

      {/* ── YOUR MEMORIES strip (Recent + On This Day + portrait) ── */}
      {memoriesStrip ? <div style={{ marginBottom: "1.5rem" }}>{memoriesStrip}</div> : null}

      {/* ── VERB-ZONED LANES (landing triptych) ── */}
      {lanes.map((lane) => {
        const visible = lane.tiles.filter((t) => !t.hidden);
        if (visible.length === 0) return null;
        const a = ACCENT[lane.accent];
        return (
          <section key={lane.id} aria-label={lane.overline} style={{ background: a.band, borderRadius: "1.25rem", padding: "0.85rem 1.1rem 1.35rem", margin: "0 0 1.1rem" }}>
            {/* the header treatment lives at ZONE level now (off the tiles) */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", margin: "0 0 1rem", padding: "0.6rem 0.9rem", borderRadius: "0.75rem", background: HEADER_BG[lane.accent], border: `0.0625rem solid ${HAIRLINE}` }}>
              <span className="relay-zone-dot" style={{ width: "0.6rem", height: "0.6rem", borderRadius: "50%", background: a.tileTop, display: "inline-block" }} aria-hidden="true" />
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
              <button key={p.key} type="button" onClick={p.onClick} className="relay-pill" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", minHeight: "2.75rem", padding: "0 1rem", borderRadius: "2rem", border: `0.0625rem solid ${T.color.warmStone}`, background: "transparent", cursor: "pointer", fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: 600, color: "#716A5E" }}>
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
        /* hover reveal: a soft zone-tinted wash blooms over the whole lane tile */
        .relay-tile-wash { transition: opacity 0.28s ease; }
        .relay-tile:hover .relay-tile-wash { opacity: 1; }
        /* anchor illustration gently floats and brightens on hover */
        .relay-art { transition: filter 0.3s ease; }
        .relay-tile:hover .relay-art { filter: brightness(1.06) saturate(1.05); }
        @media (prefers-reduced-motion: no-preference) { .relay-art { animation: relay-float 6.5s ease-in-out infinite; } }
        @keyframes relay-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        .relay-chip, .relay-pill { transition: background 0.2s ease, border-color 0.2s ease; }
        .relay-chip:hover, .relay-pill:hover { background: ${T.color.warmStone}55; border-color: ${T.color.terracotta}; }
        .relay-suggest { transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease; }
        .relay-suggest:hover { transform: translateY(-0.1875rem); box-shadow: 0 1rem 2.25rem rgba(154,79,42,0.45); filter: brightness(1.04); }
        .relay-suggest-sheen { position: absolute; top: 0; bottom: 0; left: -40%; width: 40%; background: linear-gradient(105deg, transparent, rgba(255,240,200,0.4), transparent); transform: skewX(-18deg); animation: relay-sheen 6s ease-in-out infinite; }
        /* animated icon SUB-PARTS — the life is inside each glyph, not the medallion */
        .ri-pulse, .ri-pulse-op, .ri-spin, .ri-spin-slow, .ri-wave, .ri-bob, .ri-blink { transform-box: fill-box; transform-origin: center; }
        .ri-wave { transform-origin: bottom; }
        @media (prefers-reduced-motion: no-preference) {
          .relay-anim .ri-pulse { animation: ri-pulse 2.8s ease-in-out infinite; animation-delay: var(--ri-delay, 0s); }
          .relay-anim .ri-pulse-op { animation: ri-pulseop 2.8s ease-in-out infinite; animation-delay: var(--ri-delay, 0s); }
          .relay-anim .ri-blink { animation: ri-blink 2.4s ease-in-out infinite; animation-delay: var(--ri-delay, 0s); }
          .relay-anim .ri-spin { animation: ri-spin 8s linear infinite; }
          .relay-anim .ri-spin-slow { animation: ri-spin 16s linear infinite; }
          .relay-anim .ri-wave { animation: ri-wave 1.3s ease-in-out infinite; }
          .relay-anim .ri-wave.d2 { animation-delay: 0.18s; }
          .relay-anim .ri-wave.d3 { animation-delay: 0.36s; }
          .relay-anim .ri-bob { animation: ri-bob 3s ease-in-out infinite; animation-delay: var(--ri-delay, 0s); }
          .relay-sug-blink { animation: relay-sug-blink 2.6s ease-in-out infinite; }
          .relay-ember-glow { animation: relay-ember-glow 3.2s ease-in-out infinite; }
          .relay-ember-flicker { animation: relay-ember-flicker 2.4s ease-in-out infinite; }
          .relay-name { animation: relay-name-shimmer 5s linear infinite; }
          .relay-zone-dot { animation: relay-zone-pulse 2.8s ease-in-out infinite; transform-origin: center; }
        }
        @keyframes relay-zone-pulse { 0%,100% { transform: scale(0.85); opacity: 0.65; } 50% { transform: scale(1.25); opacity: 1; } }
        @keyframes relay-sug-blink { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
        @keyframes relay-ember-glow { 0%,100% { box-shadow: 0 0 0.75rem rgba(212,175,55,0.45); } 50% { box-shadow: 0 0 1.15rem rgba(212,175,55,0.7); } }
        @keyframes relay-ember-flicker { 0%,100% { opacity: 0.75; transform: scale(0.92); } 50% { opacity: 1; transform: scale(1.08); } }
        @keyframes relay-name-shimmer { to { background-position: 220% center; } }
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
          .relay-tile, .relay-chip, .relay-pill, .relay-suggest, .ri-pulse, .ri-pulse-op, .ri-blink, .ri-spin, .ri-spin-slow, .ri-wave, .ri-bob, .relay-ember-glow, .relay-ember-flicker { animation: none !important; transition: none !important; }
          .relay-tile:hover, .relay-suggest:hover { transform: none !important; }
          .relay-suggest-sheen { display: none; }
        }
      `}</style>
    </div>
  );
}
