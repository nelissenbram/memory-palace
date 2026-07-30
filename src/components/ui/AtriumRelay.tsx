"use client";

/**
 * AtriumRelay — "The Maggiordomo" concierge relay board (elevation pass, r1).
 *
 * The steward's desk at dusk: a candlelit ledger the Maggiordomo keeps for
 * you. Two dark gilt-edged KEYSTONE anchors are the only ink-dark and only
 * true-gold objects on the board; below them three quietly recessed earth
 * trays (terracotta / ochre / sage) carry zone colour AT REST, each led by
 * one hero tile. Terracotta display type is reserved for the greeting; titles
 * are ink; gold means "the palace itself". Motion collapses to one shared
 * 4-second breath that only warmth-bearing elements may join.
 *
 * Spec: docs/RELAY_ELEVATION_SPEC.json (180-agent elevation plan).
 * Warmth model: src/lib/warmth.ts — one state, many surfaces.
 */

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { T } from "@/lib/theme";
import { RT, SHADOW, HOVER_SHADOW, TOP_HIGHLIGHT, HAIRLINE } from "@/lib/libraryTokens";
import RelayIcons from "./RelayIcons";
import RelayVignettes from "./RelayVignettes";
import { WingIcon } from "./WingRoomIcons";
import type { WarmthLevel } from "@/lib/warmth";

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
  /** One hero per lane: full-width tile with big medallion; the rest render compact. */
  hero?: boolean;
  /** Anchor extra: wing seals for the Palace card — one per wing, engraved SVG. */
  chips?: { id: string; label: string; empty?: boolean }[];
};
export type RelayAccent = "terracotta" | "gold" | "sage" | "anchor";
export type RelayLane = { id: string; overline: string; accent: RelayAccent; tiles: RelayTile[] };
export type RelaySuggestion = { key: string; title: string; reason: string; onClick: () => void; progress?: { done: number; total: number } };
export type RelayPill = { key: string; label: string; onClick: () => void };
export type RelayScore = { points: number; badgesEarned: number; badgesTotal: number; onClick: () => void };
/** Keeper's Ledger — the forgiving weekly "kept warm" line (never a scolding streak). */
export type RelayLedger = { text: string; warm: boolean };
/** Family Embers — one loved one's recent presence on the palace. */
export type EmberPerson = { key: string; name: string; unseen: number; latest?: string };
export type RelayEmbers = { title: string; people: EmberPerson[]; onOpen: () => void; scrollHint?: string };

interface AtriumRelayProps {
  greeting: string;
  userName: string | null;
  datumLine?: string;
  ledger?: RelayLedger | null;
  embers?: RelayEmbers | null;
  /** Subtle time-of-day wash laid over the board top (TIME_WASH from lib/warmth). */
  topWash?: string;
  /** Palace warmth (lib/warmth.ts): 0 quiet · 1 embers · 2 candlelit. Drives glow across all surfaces. */
  warmth?: WarmthLevel;
  score?: RelayScore | null;
  suggestion: RelaySuggestion;
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
  /** Last 12 weeks warm/quiet (lib/warmth computeWeekHistory) — ledger tap opens the strip. */
  weekHistory?: boolean[];
  /** i18n labels for the board's own strings. */
  labels?: { suggested?: string; addYourName?: string; soon?: string; otherJourneys?: string; weeksWarm?: string; quietKept?: string; open?: string };
}

/* ── Type ramp, elevation grammar and hairline now live in libraryTokens
   (RT / SHADOW / HOVER_SHADOW / TOP_HIGHLIGHT / HAIRLINE), imported above so
   the board can never drift from the Library. The ACCENT / TRAY maps below
   are the only board-specific additions. ── */

/* ── The board's gold-ink family, consolidated (changes 1/17).
   CREAM cannot carry #D4AF37 (ceremonial GOLD) as body ink — it fails text
   contrast — so the ledger, gold-lane and ember overlines use a graded
   ochre→gilt ramp. These four are the ONLY gold hexes on the board; every
   surface references the named token so the family can never drift:
     LEDGER_OCHRE  darkest, text-safe on cream (ledger line, gold datum/glyph)
     GOLD_GRAPHIC  softer graphic gold (gold-lane tileTop, story-quote flourish)
     GOLD          #D4AF37 ceremonial gilt — anchors only (from theme.gold)
     FLAME_GOLD    lightest, warmth/flame accents (gilt datum on the dark keystone)
   RGBA washes derive from the two ochres so tints stay in the same family. */
const LEDGER_OCHRE = "#8A6410";        // text-safe on cream
const GOLD_GRAPHIC = "#C99A2E";        // softer graphic gold
const FLAME_GOLD = "#E8C255";          // lightest, flame/warmth accents
const OCHRE_RGB = "169,116,27";        // graphic-gold rgb, for washes
const OCHRE_WASH = `rgba(${OCHRE_RGB},0.35)`; // rules / hairline fades

/* ── INK & EMBER, elevation pass (changes 1/8/17): the anchors go dark gilt
   keystone; lanes get pre-mixed opaque trays; gold-lane browns a step so it
   stops competing with gilt; sage rebased on canonical #56683C/#7A8C64. ── */
const ACCENT: Record<RelayAccent, { glyph: string; medallion: string; glow: string; rule: string; tileTop: string; tileBg: string; border: string; titleColor: string; descColor: string; datumColor: string }> = {
  terracotta: { glyph: "#9A4F2A", medallion: "rgba(154,79,42,0.11)", glow: "rgba(154,79,42,0.45)", rule: "rgba(154,79,42,0.35)", tileTop: "#B85C38", tileBg: "linear-gradient(160deg, #FBF2EC 0%, #FCFAF5 78%)", border: "#E7D9C4", titleColor: "#403B36", descColor: "#716A5E", datumColor: "#9A4F2A" },
  gold: { glyph: LEDGER_OCHRE, medallion: `rgba(${OCHRE_RGB},0.14)`, glow: `rgba(${OCHRE_RGB},0.45)`, rule: OCHRE_WASH, tileTop: GOLD_GRAPHIC, tileBg: "linear-gradient(160deg, #FCF6E5 0%, #FCFAF5 78%)", border: "#E9DCBE", titleColor: "#403B36", descColor: "#716A5E", datumColor: LEDGER_OCHRE },
  sage: { glyph: "#56683C", medallion: "rgba(86,104,60,0.16)", glow: "rgba(122,140,100,0.45)", rule: "rgba(86,104,60,0.35)", tileTop: "#7A8C64", tileBg: "linear-gradient(160deg, #F2F5EA 0%, #FCFAF5 78%)", border: "#DFE3D2", titleColor: "#403B36", descColor: "#716A5E", datumColor: "#56683C" },
  // Dark gilt keystone (change 1): the only ink-dark, only true-gold register.
  anchor: { glyph: T.color.gold, medallion: "rgba(212,175,55,0.16)", glow: "rgba(212,175,55,0.5)", rule: "rgba(212,175,55,0.55)", tileTop: T.color.gold, tileBg: "linear-gradient(165deg, #403B36 0%, #2E2A26 100%)", border: "rgba(212,175,55,0.5)", titleColor: "#FCFAF5", descColor: "rgba(252,250,245,0.72)", datumColor: FLAME_GOLD },
};

/* Recessed lane trays (change 8): pre-mixed opaque hexes, no alpha bands. */
const TRAY: Record<RelayAccent, string> = {
  terracotta: "#F6EBE3",
  gold: "#FAF3E0",
  sage: "#EFF2E8",
  anchor: "transparent",
};

/* Ember cameo tints (change 17: hoisted as named tokens, sage canonical). */
const EMBER_TINTS = [
  { bg: "rgba(154,79,42,0.10)", ink: "#9A4F2A" },
  { bg: `rgba(${OCHRE_RGB},0.14)`, ink: LEDGER_OCHRE },
  { bg: "rgba(86,104,60,0.16)", ink: "#56683C" },
];

/* ── One small-caps voice (change 21) ── */
export function Overline({ children, color, style }: { children: React.ReactNode; color: string; style?: React.CSSProperties }) {
  return (
    <span style={{ fontFamily: T.font.body, fontSize: RT.overline, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color, ...style }}>
      {children}
    </span>
  );
}

function Glyph({ k, size }: { k: string; size: string }) {
  const Ico = RelayIcons[k] ?? RelayIcons.palace;
  return <span style={{ width: size, height: size, display: "inline-flex" }}><Ico /></span>;
}

function Medallion({ k, accent, index, big, animated }: { k: string; accent: RelayAccent; index: number; big?: boolean; animated?: boolean }) {
  const a = ACCENT[accent];
  // Motion lives inside the glyph's sub-parts, and ONLY the steward-suggested
  // tile may animate (change 12) — one breathing glyph as a wayfinding cue.
  return (
    <span
      aria-hidden="true"
      className={animated ? "relay-anim" : undefined}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: big ? "3.25rem" : "2.25rem",
        height: big ? "3.25rem" : "2.25rem",
        borderRadius: big ? "0.85rem" : "0.65rem",
        overflow: "hidden",
        background: a.medallion,
        color: a.glyph,
        flexShrink: 0,
        ["--ri-delay" as unknown as string]: `${((index % 6) * 0.6).toFixed(2)}s`,
      }}
    >
      <span aria-hidden="true" style={{ position: "absolute", inset: 0, background: `radial-gradient(closest-side, ${a.glow}, transparent 82%)`, opacity: 0.14 }} />
      <span style={{ position: "relative", display: "inline-flex" }}>
        <Glyph k={k} size={big ? "1.85rem" : "1.3rem"} />
      </span>
    </span>
  );
}

/* Wing seals fan — the Palace anchor's counterpart to the Library's photo
   fan: the complete set of wings as gilt-rimmed medallions using the SAME
   WingIcon set the Library renders, so the crests match everywhere. Lived-in
   wings carry a count, untouched wings rest as quiet empty frames. */
function WingFan({ chips }: { chips: { id: string; label: string; empty?: boolean }[] }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center" }} aria-hidden="true">
      {chips.slice(0, 6).map((ch, i) => (
        <span key={ch.id} style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", width: "2.1rem", height: "2.1rem", borderRadius: "50%", background: ch.empty ? "rgba(252,250,245,0.16)" : "#FCFAF5", border: ch.empty ? "0.0625rem solid rgba(212,175,55,0.3)" : "0.125rem solid rgba(212,175,55,0.75)", boxShadow: ch.empty ? "none" : "0 0.125rem 0.375rem rgba(46,42,38,0.4)", marginLeft: i === 0 ? 0 : "-0.45rem", transform: `rotate(${(i % 3 - 1) * 5}deg)`, zIndex: ch.empty ? 0 : 1 }}>
          <WingIcon wingId={ch.id} size={20} color={ch.empty ? "rgba(212,175,55,0.45)" : "#9A4F2A"} />
          {!ch.empty ? (
            <span style={{ position: "absolute", right: "-0.2rem", bottom: "-0.2rem", minWidth: "1rem", height: "1rem", padding: "0 0.2rem", borderRadius: "1rem", background: "#D4AF37", color: "#2E2A26", fontFamily: T.font.body, fontSize: "0.5625rem", fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", fontVariantNumeric: "tabular-nums" }}>{ch.label}</span>
          ) : null}
        </span>
      ))}
    </span>
  );
}

function ThumbFan({ thumbs }: { thumbs: string[] }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center" }} aria-hidden="true">
      {thumbs.slice(0, 3).map((src, i) => (
        <span key={i} style={{ position: "relative", width: "2.25rem", height: "2.25rem", borderRadius: "0.5rem", overflow: "hidden", border: `0.125rem solid ${T.color.cream}`, boxShadow: "0 0.125rem 0.375rem rgba(64,59,54,0.18)", marginLeft: i === 0 ? 0 : "-0.75rem", transform: `rotate(${(i - 1) * 4}deg)` }}>
          <Image src={src} alt="" fill sizes="36px" style={{ objectFit: "cover" }} />
        </span>
      ))}
    </span>
  );
}

function Tile({ tile, accent, index, isMobile, suggestionKey, warmth, soonLabel }: { tile: RelayTile; accent: RelayAccent; index: number; isMobile: boolean; suggestionKey?: string; warmth: WarmthLevel; soonLabel: string }) {
  if (tile.hidden) return null;
  const a = ACCENT[accent];

  // ANCHOR (change 1): dark gilt keystone card — the board's top register.
  if (tile.anchor) {
    return (
      <button
        type="button"
        onClick={tile.onClick}
        className="relay-tile"
        style={{
          position: "relative", display: "flex", flexDirection: "column", alignItems: "stretch", textAlign: "left",
          borderRadius: "1rem", overflow: "hidden", minHeight: "12rem", cursor: "pointer",
          background: a.tileBg,
          border: `0.0625rem solid ${a.border}`,
          boxShadow: SHADOW[2],
          filter: warmth === 0 ? "saturate(0.82)" : "none", // quiet: a step toward stone, never grey-dead
        }}
      >
        <div style={{ position: "relative", height: "8rem", overflow: "hidden", background: "linear-gradient(180deg, #4A443E, #403B36)", borderBottom: `0.125rem solid ${a.rule}` }}>
          {/* warmth glow behind the illustration — breathes only when candlelit */}
          <span aria-hidden="true" className={warmth === 2 ? "relay-anchor-glow" : undefined} style={{ position: "absolute", inset: 0, background: "radial-gradient(120% 100% at 50% 100%, rgba(212,175,55,0.55), transparent 70%)", opacity: "var(--warmth-glow, 0.14)" as unknown as number }} />
          {tile.art ? <div className="relay-art" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "0.75rem 1.25rem" }}>{tile.art}</div> : null}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem", padding: "0.85rem 1rem 1rem" }}>
          <span style={{ fontFamily: T.font.display, fontWeight: 600, fontSize: RT.titleL, lineHeight: RT.lhDisplay, color: a.titleColor }}>{tile.title}</span>
          <span style={{ fontFamily: T.font.body, fontSize: RT.body, lineHeight: RT.lhBody, color: a.descColor, overflowWrap: "break-word" }}>{tile.desc}</span>
          {tile.thumbs && tile.thumbs.length > 0 ? <span style={{ marginTop: "0.5rem" }}><ThumbFan thumbs={tile.thumbs} /></span> : tile.chips && tile.chips.length > 0 ? <span style={{ marginTop: "0.5rem" }}><WingFan chips={tile.chips} /></span> : null}
          {tile.datum ? <span style={{ fontFamily: T.font.body, fontWeight: 700, fontSize: RT.meta, color: a.datumColor, marginTop: "0.35rem", fontVariantNumeric: "tabular-nums" }}>{tile.datum}</span> : null}
        </div>
        <span aria-hidden="true" className="relay-invite-arrow" style={{ position: "absolute", right: "0.9rem", bottom: "0.85rem", fontFamily: T.font.body, fontWeight: 700, fontSize: RT.titleS, color: a.tileTop }}>→</span>
      </button>
    );
  }

  const animated = !!suggestionKey && tile.key === suggestionKey;

  // SOON (change 22): shape, not transparency — transparent over the tray,
  // solid border, dimmed glyph, full-opacity ink title.
  if (tile.soon) {
    return (
      <div className="relay-tile-soon" style={{ position: "relative", display: "flex", alignItems: "center", gap: "0.65rem", minHeight: "3.5rem", padding: "0.75rem 1rem", borderRadius: "1rem", border: `0.0625rem solid ${a.border}`, background: "transparent" }}>
        <span aria-hidden="true" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "2.25rem", height: "2.25rem", borderRadius: "0.65rem", background: "rgba(64,59,54,0.05)", color: "#716A5E", flexShrink: 0 }}>
          <Glyph k={tile.key} size="1.3rem" />
        </span>
        <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <span style={{ fontFamily: T.font.display, fontWeight: 600, fontSize: RT.titleS, lineHeight: RT.lhDisplay, color: a.titleColor }}>{tile.title}</span>
          <Overline color="#716A5E">{soonLabel}</Overline>
        </span>
      </div>
    );
  }

  const Vignette = RelayVignettes[tile.key];
  const vigPalette = { ink: a.glyph, soft: a.medallion, gold: GOLD_GRAPHIC };

  // HERO (change 5): one full-width lead per lane — big medallion, desc +
  // datum, and the USP-style scene vignette resting on the right (visible at
  // rest, so mobile gets the visual invitation too).
  if (tile.hero) {
    return (
      <button type="button" onClick={tile.onClick} className="relay-tile" style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "stretch", textAlign: "left", gridColumn: isMobile ? "1 / -1" : "span 2", borderRadius: "1rem", overflow: "hidden", border: `0.0625rem solid ${a.border}`, background: a.tileBg, cursor: "pointer", minHeight: "8rem", padding: "1.1rem 1.15rem", boxShadow: `${SHADOW[1]}, ${TOP_HIGHLIGHT}` }}>
        <span aria-hidden="true" className="relay-tile-wash" style={{ position: "absolute", inset: 0, background: `radial-gradient(130% 90% at 15% 0%, ${a.medallion}, transparent 62%)`, opacity: 0, pointerEvents: "none" }} />
        {Vignette ? (
          <span aria-hidden="true" className="relay-hero-vig" style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: "58%", opacity: 0.85, pointerEvents: "none", maskImage: "linear-gradient(90deg, transparent, black 42%)", WebkitMaskImage: "linear-gradient(90deg, transparent, black 42%)" }}>
            <Vignette c={vigPalette} />
          </span>
        ) : null}
        <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <Medallion k={tile.key} accent={accent} index={index} big animated={animated} />
            <span style={{ fontFamily: T.font.display, fontWeight: 600, fontSize: RT.titleM, lineHeight: RT.lhDisplay, color: a.titleColor, minWidth: 0, overflowWrap: "break-word" }}>{tile.title}</span>
          </div>
          <span style={{ fontFamily: T.font.body, fontWeight: 400, fontSize: RT.body, lineHeight: RT.lhBody, color: a.descColor, maxWidth: "80%", overflowWrap: "break-word" }}>{tile.desc}</span>
          {tile.datum ? <span style={{ fontFamily: T.font.body, fontWeight: 700, fontSize: RT.meta, color: a.datumColor, fontVariantNumeric: "tabular-nums" }}>{tile.datum}</span> : null}
        </div>
        <span aria-hidden="true" className="relay-invite-arrow" style={{ position: "absolute", right: "0.9rem", bottom: "0.85rem", fontFamily: T.font.body, fontWeight: 700, fontSize: RT.titleS, color: a.tileTop }}>→</span>
      </button>
    );
  }

  // SECONDARY (redesign): compact card that ALWAYS shows the full description
  // inline (no hover-flip back-card that structurally clamped the text). The card
  // grows to fit its title + full desc + datum, so copy never truncates — in any
  // language, on mobile included. A soft scene whisper rests behind on the right.
  return (
    <button type="button" onClick={tile.onClick} className="relay-tile relay-tile-sec" style={{ position: "relative", display: "flex", alignItems: "flex-start", gap: "0.65rem", textAlign: "left", borderRadius: "1rem", overflow: "hidden", border: `0.0625rem solid ${a.border}`, background: a.tileBg, cursor: "pointer", minHeight: "3.5rem", padding: "0.8rem 2.4rem 0.8rem 1rem", boxShadow: `${SHADOW[1]}, ${TOP_HIGHLIGHT}` }}>
      {/* Soft scene whisper on the right — kept low-opacity so the always-on inline
          description stays legible over its faded edge. */}
      {Vignette ? (
        <span aria-hidden="true" className="relay-sec-vig" style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: "42%", opacity: 0.28, pointerEvents: "none", maskImage: "linear-gradient(90deg, transparent, black 70%)", WebkitMaskImage: "linear-gradient(90deg, transparent, black 70%)" }}>
          <Vignette c={vigPalette} />
        </span>
      ) : null}
      <Medallion k={tile.key} accent={accent} index={index} animated={animated} />
      <span style={{ position: "relative", display: "flex", flexDirection: "column", minWidth: 0, maxWidth: "100%", gap: "0.15rem" }}>
        <span style={{ fontFamily: T.font.display, fontWeight: 600, fontSize: RT.titleS, lineHeight: RT.lhDisplay, color: a.titleColor, overflowWrap: "break-word" }}>{tile.title}</span>
        {tile.desc ? <span style={{ fontFamily: T.font.body, fontSize: RT.overline, color: a.descColor, lineHeight: 1.3, overflowWrap: "break-word" }}>{tile.desc}</span> : null}
        {tile.datum ? <span style={{ fontFamily: T.font.body, fontWeight: 700, fontSize: RT.meta, color: a.datumColor, fontVariantNumeric: "tabular-nums", marginTop: "0.05rem" }}>{tile.datum}</span> : null}
      </span>
      {/* Persistent open affordance (nudges on hover; never disappears). */}
      <span aria-hidden="true" className="relay-sec-openarrow" style={{ position: "absolute", right: "0.85rem", top: "50%", transform: "translateY(-50%)", fontFamily: T.font.body, fontWeight: 700, fontSize: RT.titleS, color: a.tileTop, opacity: 0.5, pointerEvents: "none" }}>→</span>
    </button>
  );
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "·";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/* ── Family Embers (change 11): the gesture, not a count; cameos breathe
   independently on the shared 4s tempo via per-person delays. ── */
export function EmbersRow({ embers }: { embers: RelayEmbers }) {
  return (
    <section aria-label={embers.title} style={{ marginBottom: "1rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.6rem" }}>
        <Overline color={LEDGER_OCHRE}>{embers.title}</Overline>
        <span aria-hidden="true" style={{ flex: 1, height: "0.0625rem", background: `linear-gradient(90deg, ${OCHRE_WASH}, transparent)` }} />
      </div>
      {/* scroll hint: named for screen readers, softened at the edge for sight */}
      <span id="relay-embers-scrollhint" style={{ position: "absolute", width: "0.0625rem", height: "0.0625rem", padding: 0, margin: "-0.0625rem", overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap", border: 0 }}>{embers.scrollHint ?? "Scroll sideways for more family"}</span>
      <div style={{ position: "relative" }}>
        <div aria-describedby={embers.people.length > 3 ? "relay-embers-scrollhint" : undefined} style={{ display: "flex", gap: "0.85rem", overflowX: "auto", paddingBottom: "0.25rem" }}>
        {embers.people.map((p, i) => {
          const tint = EMBER_TINTS[i % EMBER_TINTS.length];
          const hasUnseen = p.unseen > 0;
          return (
            <button
              key={p.key}
              type="button"
              onClick={embers.onOpen}
              title={p.latest || p.name}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem", flex: "0 0 auto", width: "4.75rem", minHeight: "2.75rem", background: "none", border: "none", cursor: "pointer", padding: "0.35rem 0" }}
            >
              <span style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", width: "3.25rem", height: "3.25rem", borderRadius: "50%", background: tint.bg, border: hasUnseen ? "0.125rem solid rgba(212,175,55,0.85)" : `0.0625rem solid ${HAIRLINE}` }}>
                {hasUnseen ? (
                  <span aria-hidden="true" className="relay-ember-breathe" style={{ position: "absolute", inset: "-20%", background: "radial-gradient(closest-side, rgba(212,175,55,0.55), transparent 70%)", animationDelay: `${(i * 0.7).toFixed(1)}s` }} />
                ) : null}
                <span style={{ position: "relative", fontFamily: T.font.display, fontWeight: 600, fontSize: RT.titleS, color: tint.ink }}>{initialsOf(p.name)}</span>
                {p.unseen >= 2 ? (
                  <span style={{ position: "absolute", top: "-0.2rem", right: "-0.2rem", minWidth: "1.125rem", height: "1.125rem", padding: "0 0.25rem", borderRadius: "1rem", background: "#B85C38", color: "#FCFAF5", fontFamily: T.font.body, fontSize: RT.overline, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", fontVariantNumeric: "tabular-nums" }}>{p.unseen}</span>
                ) : null}
              </span>
              <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.05rem", minWidth: 0 }}>
                <span style={{ fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 600, color: hasUnseen ? "#403B36" : "#716A5E", maxWidth: "4.75rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name.split(/\s+/)[0]}</span>
                {hasUnseen && p.latest ? (
                  <span style={{ fontFamily: T.font.body, fontSize: RT.overline, color: "#716A5E", maxWidth: "4.75rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.latest}</span>
                ) : null}
              </span>
            </button>
          );
        })}
        </div>
        {/* right-edge fade: a visual cue that the strip scrolls (change 11) */}
        {embers.people.length > 3 ? (
          <span aria-hidden="true" style={{ position: "absolute", top: 0, right: 0, bottom: "0.25rem", width: "2rem", pointerEvents: "none", background: `linear-gradient(90deg, transparent, ${T.color.cream})` }} />
        ) : null}
      </div>
    </section>
  );
}

export default function AtriumRelay({ greeting, userName, datumLine, ledger, embers, topWash, warmth = 1, score, suggestion, personaLabel, personaQuiz, onChangeStyle, onChooseJourney, onAddName, memoriesStrip, anchors, lanes, you, isMobile, weekHistory, labels }: AtriumRelayProps) {
  const [mounted, setMounted] = useState(false);
  const [ledgerOpen, setLedgerOpen] = useState(false);
  useEffect(() => { const id = requestAnimationFrame(() => setMounted(true)); return () => cancelAnimationFrame(id); }, []);
  const SugIco = RelayIcons[suggestion.key] ?? RelayIcons.palace;
  const suggestedLabel = labels?.suggested ?? "Suggested for you";
  const soonLabel = labels?.soon ?? "Soon";
  // The Evening Return card's icon well picks up the golden-hour tint.
  const sugWell = suggestion.key === "lantern"
    ? { background: "rgba(184,92,56,0.12)", color: LEDGER_OCHRE }
    : { background: "rgba(154,79,42,0.10)", color: "#9A4F2A" };

  return (
    <div
      style={{
        position: "relative", width: "100%", opacity: mounted ? 1 : 0, transition: "opacity 0.5s ease",
        // Warmth speaks through every surface (change 3).
        ["--warmth" as unknown as string]: String(warmth / 2),
        ["--warmth-glow" as unknown as string]: warmth === 2 ? "0.26" : warmth === 1 ? "0.14" : "0.08",
      }}
    >
      {/* Time-of-day: atmosphere, not a floating panel (change 19) */}
      {topWash ? <div aria-hidden="true" style={{ position: "absolute", inset: "-3rem -1.5rem auto", height: "26rem", background: topWash, pointerEvents: "none", maskImage: "linear-gradient(180deg, black 55%, transparent)", WebkitMaskImage: "linear-gradient(180deg, black 55%, transparent)" }} /> : null}

      {/* ── STEWARD STRIP: greeting → ledger → datum (change 13) ── */}
      <div style={{ position: "relative", display: "grid", gridTemplateColumns: "1fr", gap: "1.25rem", alignItems: "start", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontFamily: T.font.display, fontWeight: 600, fontSize: isMobile ? RT.h1m : RT.h1, lineHeight: 1.12, margin: 0, color: "#403B36" }}>
            {greeting}
            {userName ? (
              <>,{" "}<span className="relay-name" style={{ fontStyle: "italic", fontWeight: 700, whiteSpace: "nowrap", background: `linear-gradient(100deg, #3E5230 0%, #56683C 32%, ${FLAME_GOLD} 50%, #56683C 68%, #3E5230 100%)`, backgroundSize: "220% auto", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "#56683C" }}>{userName}</span></>
            ) : onAddName ? (
              <>{" "}<button type="button" onClick={(e) => { e.stopPropagation(); onAddName(); }} style={{ fontFamily: "inherit", fontStyle: "italic", fontSize: isMobile ? RT.titleS : RT.titleL, fontWeight: 600, color: "#9A4F2A", background: "none", border: "none", borderBottom: "0.125rem solid rgba(212,175,55,0.6)", padding: "0 0.15rem", cursor: "pointer", verticalAlign: "baseline" }}>{labels?.addYourName ?? "add your name"}</button></>
            ) : null}
          </h1>
          {ledger ? (
            <div style={{ margin: "0.5rem 0 0" }}>
              <button
                type="button"
                onClick={weekHistory && weekHistory.length > 0 ? () => setLedgerOpen((v) => !v) : undefined}
                aria-expanded={ledgerOpen}
                className="relay-ledger"
                style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem", fontFamily: T.font.display, fontStyle: "italic", fontWeight: 500, fontSize: RT.titleS, letterSpacing: "0.02em", color: ledger.warm ? LEDGER_OCHRE : "#716A5E", background: "none", border: "none", padding: 0, cursor: weekHistory && weekHistory.length > 0 ? "pointer" : "default", textAlign: "left" }}
              >
                <span aria-hidden="true" className={ledger.warm ? "relay-ember-flicker" : undefined} style={{ width: "0.5rem", height: "0.5rem", borderRadius: "50%", background: ledger.warm ? `radial-gradient(circle at 40% 35%, ${FLAME_GOLD}, #B85C38)` : "#C9BFAE", flexShrink: 0 }} />
                {ledger.text}
              </button>
              {/* 12-week warmth strip (change 16): dots, never numerals, no red */}
              {ledgerOpen && weekHistory && weekHistory.length > 0 ? (
                <div style={{ marginTop: "0.6rem", padding: "0.75rem 0.9rem", borderRadius: "0.85rem", border: `0.0625rem solid ${HAIRLINE}`, background: T.color.cream, boxShadow: SHADOW[1], maxWidth: "22rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                    {weekHistory.map((warm, i) => (
                      <span key={i} aria-hidden="true" style={{ width: "0.75rem", height: "0.75rem", borderRadius: "50%", flexShrink: 0, background: warm ? `radial-gradient(circle at 40% 35%, ${FLAME_GOLD}, #B85C38)` : "transparent", border: warm ? "none" : "0.0625rem solid #C9BFAE", opacity: warm ? 0.65 + (i / (weekHistory.length - 1 || 1)) * 0.35 : 0.8 }} />
                    ))}
                  </div>
                  <p style={{ fontFamily: T.font.display, fontStyle: "italic", fontSize: RT.meta, color: "#716A5E", margin: "0.55rem 0 0", lineHeight: RT.lhBody }}>
                    {ledger.warm ? (labels?.weeksWarm ?? "Kept warm, week after week") : (labels?.quietKept ?? "A quiet week — the palace kept your memories safe")}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
          {datumLine ? <p style={{ fontFamily: T.font.body, fontSize: RT.body, fontWeight: 500, color: "#716A5E", margin: "0.4rem 0 0", fontVariantNumeric: "tabular-nums" }}>{datumLine}</p> : null}
        </div>
      </div>

      {/* ── FAMILY EMBERS ── */}
      {embers && embers.people.length > 0 ? <EmbersRow embers={embers} /> : null}

      {/* ── THE STEWARD'S CARD (change 2): one invitation, canonical slot,
          gilt left rule, one-shot sheen — or the style quiz until taken ── */}
      {(!personaLabel && personaQuiz) ? (
        <div style={{ marginBottom: "1rem" }}>{personaQuiz}</div>
      ) : (
        <button type="button" onClick={suggestion.onClick} className="relay-suggest" style={{ position: "relative", overflow: "hidden", display: "flex", alignItems: "center", gap: "0.85rem", width: "100%", textAlign: "left", marginBottom: "1rem", padding: "0.9rem 1.1rem 0.9rem 1.35rem", borderRadius: "1rem", border: `0.0625rem solid ${HAIRLINE}`, background: T.color.cream, boxShadow: SHADOW[2], cursor: "pointer" }}>
          <span aria-hidden="true" style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "0.25rem", background: "linear-gradient(180deg, #D4AF37, #B85C38)" }} />
          <span aria-hidden="true" className="relay-suggest-sheen" />
          <span aria-hidden="true" className="relay-sug-blink" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "2.75rem", height: "2.75rem", borderRadius: "0.8rem", background: sugWell.background, color: sugWell.color, flexShrink: 0 }}>
            <span style={{ width: "1.5rem", height: "1.5rem", display: "inline-flex" }}><SugIco /></span>
          </span>
          <span style={{ display: "flex", flexDirection: "column", gap: "0.05rem", minWidth: 0 }}>
            <Overline color="#9A4F2A">{suggestedLabel}</Overline>
            <span style={{ fontFamily: T.font.display, fontWeight: 600, fontSize: RT.titleM, lineHeight: RT.lhDisplay, color: "#403B36", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{suggestion.title}</span>
            <span style={{ fontFamily: T.font.body, fontSize: RT.body, lineHeight: RT.lhBody, color: "#716A5E", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{suggestion.reason}</span>
            {suggestion.progress ? (
              <span aria-hidden="true" style={{ display: "block", marginTop: "0.4rem", height: "0.3rem", borderRadius: "1rem", background: "rgba(154,79,42,0.14)", overflow: "hidden", maxWidth: "16rem" }}>
                <span style={{ display: "block", height: "100%", width: `${Math.round((100 * suggestion.progress.done) / Math.max(1, suggestion.progress.total))}%`, background: "#B85C38", borderRadius: "1rem" }} />
              </span>
            ) : null}
          </span>
        </button>
      )}

      {/* ── ANCHORS: the dark gilt keystone pair ── */}
      {anchors.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? "0.625rem" : "0.875rem", marginBottom: "1.25rem" }}>
          {anchors.map((tl, i) => <Tile key={tl.key} tile={{ ...tl, anchor: true }} accent="anchor" index={i} isMobile={isMobile} warmth={warmth} soonLabel={soonLabel} />)}
        </div>
      ) : null}

      {/* ── YOUR MEMORIES strip ── */}
      {memoriesStrip ? <div style={{ marginBottom: "1.5rem" }}>{memoriesStrip}</div> : null}

      {/* ── VERB LANES: recessed earth trays, flattened headers, hero-led ── */}
      {lanes.map((lane) => {
        const visible = lane.tiles.filter((tl) => !tl.hidden);
        if (visible.length === 0) return null;
        const a = ACCENT[lane.accent];
        const ordered = [...visible.filter((tl) => tl.hero), ...visible.filter((tl) => !tl.hero)];
        return (
          <section key={lane.id} aria-label={lane.overline} style={{ background: TRAY[lane.accent], borderRadius: "1.25rem", borderLeft: `0.1875rem solid ${a.tileTop}`, boxShadow: "inset 0 0.0625rem 0.1875rem rgba(64,59,54,0.06)", padding: "1rem 1.1rem 1.35rem", margin: "0 0 1.1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", margin: "0 0 0.9rem" }}>
              <span style={{ width: "0.6rem", height: "0.6rem", borderRadius: "50%", background: a.tileTop, display: "inline-block", flexShrink: 0 }} aria-hidden="true" />
              <Overline color={a.glyph}>{lane.overline}</Overline>
              <span aria-hidden="true" style={{ flex: 1, height: "0.0625rem", background: `linear-gradient(90deg, ${a.rule}, transparent)` }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(${isMobile ? "8.5rem" : "11rem"}, 1fr))`, gap: "0.75rem" }}>
              {ordered.map((tl, i) => <Tile key={tl.key} tile={tl} accent={lane.accent} index={i} isMobile={isMobile} suggestionKey={suggestion.key} warmth={warmth} soonLabel={soonLabel} />)}
            </div>
          </section>
        );
      })}

      {/* ── YOU row: one quiet pill family (change 24) — utilities, score,
          persona, journeys ── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.625rem", marginTop: "0.5rem" }}>
        {you.map((p) => {
          const Ico = RelayIcons[p.key] ?? RelayIcons.settings;
          return (
            <button key={p.key} type="button" onClick={p.onClick} className="relay-pill" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", minHeight: "2.75rem", padding: "0 1rem", borderRadius: "2rem", border: `0.0625rem solid ${T.color.warmStone}`, background: "transparent", cursor: "pointer", fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: 600, color: "#716A5E" }}>
              <span aria-hidden="true" style={{ width: "1.125rem", height: "1.125rem", display: "inline-flex" }}><Ico /></span>{p.label}
            </button>
          );
        })}
        {score ? (
          <button type="button" onClick={score.onClick} className="relay-pill" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", minHeight: "2.75rem", padding: "0 1rem", borderRadius: "2rem", border: `0.0625rem solid ${T.color.warmStone}`, background: "transparent", cursor: "pointer", fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: 700, color: "#716A5E", fontVariantNumeric: "tabular-nums" }}>
            <span aria-hidden="true" style={{ width: "1.125rem", height: "1.125rem", display: "inline-flex" }}><RelayIcons.points /></span>
            {score.points.toLocaleString()}
            <span aria-hidden="true" style={{ width: "0.0625rem", height: "1.1rem", background: T.color.warmStone }} />
            <span aria-hidden="true" style={{ width: "1.125rem", height: "1.125rem", display: "inline-flex" }}><RelayIcons.badge /></span>
            {score.badgesEarned}/{score.badgesTotal}
          </button>
        ) : null}
        {personaLabel && onChangeStyle ? (
          <button type="button" onClick={onChangeStyle} className="relay-pill" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", minHeight: "2.75rem", padding: "0 1rem", borderRadius: "2rem", border: `0.0625rem solid ${T.color.warmStone}`, background: "transparent", cursor: "pointer", fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: 600, color: "#716A5E" }}>
            <span aria-hidden="true" style={{ width: "1.125rem", height: "1.125rem", display: "inline-flex" }}><RelayIcons.settings /></span>{personaLabel}
          </button>
        ) : null}
        {onChooseJourney ? (
          <button type="button" onClick={onChooseJourney} className="relay-pill" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", minHeight: "2.75rem", padding: "0 1rem", borderRadius: "2rem", border: `0.0625rem solid ${T.color.warmStone}`, background: "transparent", cursor: "pointer", fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: 600, color: "#716A5E" }}>
            <span aria-hidden="true" style={{ width: "1.125rem", height: "1.125rem", display: "inline-flex" }}><RelayIcons.journeys /></span>{labels?.otherJourneys ?? "Other journeys"}
          </button>
        ) : null}
      </div>

      <style>{`
        .relay-tile { transition: transform 0.2s ease, box-shadow 0.2s ease; animation: relay-rise 0.5s ease both; }
        .relay-tile:hover { transform: translateY(-0.1875rem); box-shadow: ${HOVER_SHADOW}; }
        .relay-tile:active { transform: translateY(0); }
        .relay-tile-wash { transition: opacity 0.28s ease; }
        .relay-tile:hover .relay-tile-wash { opacity: 1; }
        /* Anchor/hero invite arrow — hidden until hover on hover-capable devices. */
        .relay-invite-arrow { opacity: 0; transform: translateX(-0.3rem); }
        /* Secondary open-arrow is always visible; it just nudges on hover. */
        .relay-sec-openarrow { transition: transform 0.2s ease; }
        @media (hover: hover) {
          .relay-tile-sec:hover .relay-sec-openarrow, .relay-tile-sec:focus-visible .relay-sec-openarrow { transform: translateY(-50%) translateX(0.15rem); }
          .relay-invite-arrow { transition: opacity 0.25s ease, transform 0.25s ease; }
          .relay-tile:hover .relay-invite-arrow { opacity: 1; transform: translateX(0); }
        }
        /* Anchor illustration lights on hover AND on press, so the lit state is
           reachable on touch (no hover) via :active — item 3. */
        .relay-art { transition: filter 0.3s ease; }
        .relay-tile:hover .relay-art, .relay-tile:active .relay-art, .relay-tile:focus-visible .relay-art { filter: brightness(1.08) saturate(1.05); }
        .relay-pill { transition: background 0.2s ease, border-color 0.2s ease; }
        .relay-pill:hover { background: ${T.color.warmStone}55; border-color: ${T.color.terracotta}; }
        .relay-suggest { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .relay-suggest:hover { transform: translateY(-0.1875rem); box-shadow: ${HOVER_SHADOW}; }
        /* one-shot sheen on mount — an invitation, not a beacon */
        .relay-suggest-sheen { position: absolute; top: 0; bottom: 0; left: -40%; width: 40%; background: linear-gradient(105deg, transparent, rgba(255,240,200,0.4), transparent); transform: skewX(-18deg); }
        /* animated icon SUB-PARTS — only the steward-suggested tile's glyph lives */
        .ri-pulse, .ri-pulse-op, .ri-spin, .ri-spin-slow, .ri-wave, .ri-bob, .ri-blink { transform-box: fill-box; transform-origin: center; }
        .ri-wave { transform-origin: bottom; }
        @media (prefers-reduced-motion: no-preference) {
          .relay-suggest-sheen { animation: relay-sheen 1.8s ease-in-out 1.2s 1 both; }
          .relay-anim .ri-pulse { animation: ri-pulse 4s ease-in-out infinite; animation-delay: var(--ri-delay, 0s); }
          .relay-anim .ri-pulse-op { animation: ri-pulseop 4s ease-in-out infinite; animation-delay: var(--ri-delay, 0s); }
          .relay-anim .ri-blink { animation: ri-blink 4s ease-in-out infinite; animation-delay: var(--ri-delay, 0s); }
          .relay-anim .ri-spin { animation: ri-spin 8s linear infinite; }
          .relay-anim .ri-spin-slow { animation: ri-spin 16s linear infinite; }
          .relay-anim .ri-wave { animation: ri-wave 1.3s ease-in-out infinite; }
          .relay-anim .ri-wave.d2 { animation-delay: 0.18s; }
          .relay-anim .ri-wave.d3 { animation-delay: 0.36s; }
          .relay-anim .ri-bob { animation: ri-bob 4s ease-in-out infinite; animation-delay: var(--ri-delay, 0s); }
          /* greeting sweep with a long dwell, not a hum (change 6b) */
          .relay-name { animation: relay-name-shimmer 12s ease-in-out infinite; }
          /* dwell-and-breathe (change 6c), warmth-gated */
          .relay-sug-blink { animation: relay-sug-dwell 6s ease-in-out infinite; }
          /* the shared 4s breath (change 14) */
          .relay-ember-breathe { animation: relay-ember-breathe 4s ease-in-out infinite; }
          .relay-ember-flicker { animation: relay-ember-flicker 4s ease-in-out infinite; animation-delay: -1s; }
          .relay-anchor-glow { animation: relay-anchor-breathe 8s ease-in-out infinite; animation-delay: -2s; }
        }
        @keyframes relay-name-shimmer { 0% { background-position: 0 center; } 15%, 100% { background-position: 220% center; } }
        @keyframes relay-sug-dwell { 0%, 70%, 100% { opacity: 1; } 85% { opacity: 0.85; } }
        @keyframes relay-ember-breathe { 0%, 100% { opacity: calc(0.55 * var(--warmth, 0.5) + 0.25); } 50% { opacity: calc(0.9 * var(--warmth, 0.5) + 0.1); } }
        @keyframes relay-ember-flicker { 0%, 100% { opacity: 0.75; transform: scale(0.92); } 50% { opacity: 1; transform: scale(1.08); } }
        @keyframes relay-anchor-breathe { 0%, 100% { opacity: 0.18; } 50% { opacity: 0.26; } }
        .relay-tile:focus-visible, .relay-pill:focus-visible, .relay-suggest:focus-visible { outline: 0.1875rem solid ${T.color.gold}; outline-offset: 0.1875rem; }
        @keyframes relay-rise { from { opacity: 0; transform: translateY(0.6rem); } to { opacity: 1; transform: none; } }
        @keyframes relay-sheen { 0% { left: -45%; } 100% { left: 135%; } }
        @keyframes ri-pulse { 0%,100% { opacity: 0.5; transform: scale(0.82); } 50% { opacity: 1; transform: scale(1.18); } }
        @keyframes ri-pulseop { 0%,100% { opacity: 0.35; } 50% { opacity: 1; } }
        @keyframes ri-blink { 0%,100% { opacity: 0.25; } 50% { opacity: 1; } }
        @keyframes ri-spin { to { transform: rotate(360deg); } }
        @keyframes ri-wave { 0%,100% { transform: scaleY(0.5); } 50% { transform: scaleY(1); } }
        @keyframes ri-bob { 0%,100% { transform: translateY(0.04rem); } 50% { transform: translateY(-0.09rem); } }
        @media (prefers-reduced-motion: reduce) {
          .relay-tile, .relay-pill, .relay-suggest, .relay-suggest-sheen, .ri-pulse, .ri-pulse-op, .ri-blink, .ri-spin, .ri-spin-slow, .ri-wave, .ri-bob, .relay-name, .relay-sug-blink, .relay-ember-breathe, .relay-ember-flicker, .relay-anchor-glow, .relay-backcard, .relay-backcard-arrow, .relay-invite-arrow, .relay-sec-openarrow { animation: none !important; transition: none !important; }
          .relay-tile:hover, .relay-suggest:hover { transform: none !important; }
          .relay-suggest-sheen { display: none; }
        }
      `}</style>
    </div>
  );
}
