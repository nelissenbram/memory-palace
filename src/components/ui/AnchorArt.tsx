"use client";
/* Original Atrium anchor illustrations (Palace temple + Library shelves),
   restored from AtriumHero @ b95ae58 for use as the anchor card headers. */
import React from "react";
import { T } from "@/lib/theme";

export function PalaceIllustration({ hover, warmth, timeOfDay }: {
  hover: boolean;
  /** Palace-warmth level (src/lib/warmth.ts): 0 quiet · 1 embers · 2 candlelit. Omit for legacy resting glow. */
  warmth?: 0 | 1 | 2;
  /** Ambient sky tint; omit for neutral. */
  timeOfDay?: "morning" | "day" | "golden" | "night";
}) {
  // Warmth sets the RESTING glow of the windows (the villa dims over quiet
  // weeks, one memory relights it); hover still brightens on top. Floors are
  // high enough that the window life stays clearly visible on the dark
  // anchor header even at quiet — dimmer, never dead.
  const resting = warmth === undefined ? 0.45 : [0.3, 0.55, 0.8][warmth];
  const windowGlow = hover ? Math.min(1, resting + 0.2) : resting;
  const ambientGlow = hover ? 0.5 : warmth === undefined ? 0.2 : [0.1, 0.2, 0.32][warmth];
  const starBoost = timeOfDay === "night" ? 2.4 : 1;
  const skyTint = timeOfDay === "morning"
    ? { from: "#7A8C64", fromOp: 0.05, to: "#C99A2E", toOp: 0.02 }
    : timeOfDay === "golden"
      ? { from: "#B85C38", fromOp: 0.07, to: "#C99A2E", toOp: 0.03 }
      : timeOfDay === "night"
        ? { from: "#403B36", fromOp: 0.1, to: "#56683C", toOp: 0.03 }
        : null;

  return (
    <svg
      viewBox="0 0 300 180"
      style={{
        width: "100%",
        height: "auto",
        transition: "filter 0.5s ease",
        filter: hover
          ? `drop-shadow(0 0 1rem rgba(212,175,55,0.35))`
          : `drop-shadow(0 0 0.5rem rgba(212,175,55,0.1))`,
      }}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="palaceAmbient" cx="50%" cy="40%" r="50%">
          <stop offset="0%" stopColor={T.color.gold} stopOpacity="0.35" />
          <stop offset="60%" stopColor={T.color.gold} stopOpacity="0.08" />
          <stop offset="100%" stopColor={T.color.gold} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="windowWarmth">
          <stop offset="0%" stopColor="#FFEEBB" stopOpacity="0.9" />
          <stop offset="100%" stopColor={T.color.gold} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="palaceColumnGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={T.color.gold} stopOpacity="0.6" />
          <stop offset="100%" stopColor={T.color.gold} stopOpacity="0.25" />
        </linearGradient>
        <linearGradient id="poolReflect" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={T.color.gold} stopOpacity="0.12" />
          <stop offset="50%" stopColor={T.color.gold} stopOpacity="0.06" />
          <stop offset="100%" stopColor={T.color.gold} stopOpacity="0.02" />
        </linearGradient>
        {skyTint ? (
          <linearGradient id="palaceSkyTint" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={skyTint.from} stopOpacity={skyTint.fromOp} />
            <stop offset="70%" stopColor={skyTint.to} stopOpacity={skyTint.toOp} />
            <stop offset="100%" stopColor={skyTint.to} stopOpacity="0" />
          </linearGradient>
        ) : null}
      </defs>

      {/* Time-of-day sky wash (behind everything) */}
      {skyTint ? <rect x="0" y="0" width="300" height="180" fill="url(#palaceSkyTint)" /> : null}

      {/* Stars / sky dots */}
      {[
        { cx: 30, cy: 12 }, { cx: 55, cy: 8 }, { cx: 80, cy: 15 },
        { cx: 120, cy: 6 }, { cx: 170, cy: 10 }, { cx: 200, cy: 5 },
        { cx: 235, cy: 14 }, { cx: 260, cy: 8 }, { cx: 280, cy: 16 },
        { cx: 45, cy: 20 }, { cx: 145, cy: 3 }, { cx: 190, cy: 18 },
      ].map((s, i) => (
        <circle key={`star-${i}`} cx={s.cx} cy={s.cy} r="0.6" fill={T.color.gold} opacity={(0.1 + (i % 3) * 0.025) * starBoost}>
          <animate attributeName="opacity" values={`${(0.1 + (i % 3) * 0.025) * starBoost};${0.15 * starBoost};${(0.1 + (i % 3) * 0.025) * starBoost}`} dur={`${3 + i * 0.5}s`} repeatCount="indefinite" />
        </circle>
      ))}

      {/* Ambient glow behind structure */}
      <ellipse cx="150" cy="80" rx="120" ry="70" fill="url(#palaceAmbient)" opacity={ambientGlow}>
        <animate attributeName="opacity" values={`${ambientGlow};${ambientGlow + 0.15};${ambientGlow}`} dur="4s" repeatCount="indefinite" />
      </ellipse>

      {/* Ground line */}
      <line x1="10" y1="155" x2="290" y2="155" stroke={T.color.gold} strokeWidth="0.5" opacity="0.35" />

      {/* ── Left wing ── */}
      <rect x="22" y="90" width="60" height="65" fill="none" stroke={T.color.gold} strokeWidth="0.7" opacity="0.35" rx="1" />
      {/* Left wing roof */}
      <line x1="18" y1="90" x2="86" y2="90" stroke={T.color.gold} strokeWidth="0.8" opacity="0.4" />
      <line x1="22" y1="87" x2="82" y2="87" stroke={T.color.gold} strokeWidth="0.5" opacity="0.25" />
      {/* Left wing dentil molding */}
      {Array.from({ length: 12 }, (_, i) => 24 + i * 5).map((dx) => (
        <rect key={`ld-${dx}`} x={dx} y="88" width="2.5" height="1.5" fill={T.color.gold} opacity="0.18" />
      ))}
      {/* Left wing windows with mullion crosses */}
      {[35, 55, 72].map((x) => (
        <React.Fragment key={`lw-${x}`}>
          <rect x={x - 4} y={100} width="8" height="12" fill="none" stroke={T.color.gold} strokeWidth="0.6" opacity="0.4" rx="4 4 0 0" />
          {/* Mullion cross */}
          <line x1={x} y1={100} x2={x} y2={112} stroke={T.color.gold} strokeWidth="0.3" opacity="0.25" />
          <line x1={x - 4} y1={106} x2={x + 4} y2={106} stroke={T.color.gold} strokeWidth="0.3" opacity="0.25" />
          {/* inhabited window: candle-flicker shimmer + an occasional
              light-out-and-relight on its own long cycle */}
          <ellipse cx={x} cy={106} rx="4.5" ry="6.5" fill="url(#windowWarmth)" opacity={windowGlow}>
            <animate attributeName="opacity" values={`${windowGlow};${windowGlow * 1.35};${windowGlow * 0.9};${windowGlow * 1.2};${windowGlow * 0.1};${windowGlow * 0.1};${windowGlow}`} keyTimes="0;0.2;0.38;0.55;0.68;0.86;1" dur={`${5 + (x % 4)}s`} begin={`${-(x % 5)}s`} repeatCount="indefinite" />
          </ellipse>
        </React.Fragment>
      ))}
      {/* Left wing door */}
      <rect x="44" y="125" width="14" height="30" fill="none" stroke={T.color.gold} strokeWidth="0.6" opacity="0.4" rx="7 7 0 0" />
      <ellipse cx="51" cy="135" rx="5" ry="10" fill="url(#windowWarmth)" opacity={windowGlow * 0.6}>
        <animate attributeName="opacity" values={`${windowGlow * 0.6};${windowGlow * 0.85};${windowGlow * 0.5};${windowGlow * 0.6}`} dur="4.6s" repeatCount="indefinite" />
      </ellipse>

      {/* ── Vines / ivy on left wing ── */}
      <path d="M 22,95 Q 18,105 20,115 Q 17,120 19,130 Q 16,135 18,142 Q 20,148 22,155" fill="none" stroke={T.color.gold} strokeWidth="0.5" opacity="0.15" />
      <path d="M 20,108 Q 15,106 13,110" fill="none" stroke={T.color.gold} strokeWidth="0.4" opacity="0.12" />
      <path d="M 19,120 Q 14,118 12,122" fill="none" stroke={T.color.gold} strokeWidth="0.4" opacity="0.12" />
      <path d="M 18,133 Q 13,131 11,135" fill="none" stroke={T.color.gold} strokeWidth="0.4" opacity="0.12" />
      <path d="M 19,143 Q 15,142 14,146" fill="none" stroke={T.color.gold} strokeWidth="0.4" opacity="0.1" />
      {/* Tiny leaf shapes */}
      <ellipse cx="13" cy="110" rx="1.5" ry="1" fill={T.color.gold} opacity="0.1" transform="rotate(-20,13,110)" />
      <ellipse cx="12" cy="122" rx="1.5" ry="1" fill={T.color.gold} opacity="0.1" transform="rotate(-30,12,122)" />
      <ellipse cx="11" cy="135" rx="1.5" ry="1" fill={T.color.gold} opacity="0.08" transform="rotate(-15,11,135)" />
      <ellipse cx="14" cy="146" rx="1.5" ry="1" fill={T.color.gold} opacity="0.08" transform="rotate(-25,14,146)" />

      {/* ── Right wing ── */}
      <rect x="218" y="90" width="60" height="65" fill="none" stroke={T.color.gold} strokeWidth="0.7" opacity="0.35" rx="1" />
      <line x1="214" y1="90" x2="282" y2="90" stroke={T.color.gold} strokeWidth="0.8" opacity="0.4" />
      <line x1="218" y1="87" x2="278" y2="87" stroke={T.color.gold} strokeWidth="0.5" opacity="0.25" />
      {/* Right wing dentil molding */}
      {Array.from({ length: 12 }, (_, i) => 220 + i * 5).map((dx) => (
        <rect key={`rd-${dx}`} x={dx} y="88" width="2.5" height="1.5" fill={T.color.gold} opacity="0.18" />
      ))}
      {/* Right wing windows with mullion crosses */}
      {[231, 248, 265].map((x) => (
        <React.Fragment key={`rw-${x}`}>
          <rect x={x - 4} y={100} width="8" height="12" fill="none" stroke={T.color.gold} strokeWidth="0.6" opacity="0.4" rx="4 4 0 0" />
          {/* Mullion cross */}
          <line x1={x} y1={100} x2={x} y2={112} stroke={T.color.gold} strokeWidth="0.3" opacity="0.25" />
          <line x1={x - 4} y1={106} x2={x + 4} y2={106} stroke={T.color.gold} strokeWidth="0.3" opacity="0.25" />
          <ellipse cx={x} cy={106} rx="4.5" ry="6.5" fill="url(#windowWarmth)" opacity={windowGlow}>
            <animate attributeName="opacity" values={`${windowGlow};${windowGlow * 0.12};${windowGlow * 0.12};${windowGlow * 1.3};${windowGlow};${windowGlow * 1.15};${windowGlow}`} keyTimes="0;0.12;0.3;0.45;0.62;0.8;1" dur={`${6 + (x % 4)}s`} begin={`${-(x % 7)}s`} repeatCount="indefinite" />
          </ellipse>
        </React.Fragment>
      ))}
      <rect x="242" y="125" width="14" height="30" fill="none" stroke={T.color.gold} strokeWidth="0.6" opacity="0.4" rx="7 7 0 0" />
      <ellipse cx="249" cy="135" rx="5" ry="10" fill="url(#windowWarmth)" opacity={windowGlow * 0.6}>
        <animate attributeName="opacity" values={`${windowGlow * 0.6};${windowGlow * 0.45};${windowGlow * 0.8};${windowGlow * 0.6}`} dur="5.3s" repeatCount="indefinite" />
      </ellipse>

      {/* ── Central temple ── */}
      <rect x="82" y="60" width="136" height="95" fill="none" stroke={T.color.gold} strokeWidth="0.9" opacity="0.45" rx="1" />

      {/* Frieze band between columns and pediment */}
      <rect x="82" y="56" width="136" height="4" fill="none" stroke={T.color.gold} strokeWidth="0.4" opacity="0.2" />
      {/* Frieze pattern — repeating triglyphs */}
      {Array.from({ length: 16 }, (_, i) => 88 + i * 8).map((fx) => (
        <React.Fragment key={`friz-${fx}`}>
          <line x1={fx} y1="56.5" x2={fx} y2="59.5" stroke={T.color.gold} strokeWidth="0.4" opacity="0.2" />
          <line x1={fx + 2} y1="56.5" x2={fx + 2} y2="59.5" stroke={T.color.gold} strokeWidth="0.4" opacity="0.2" />
        </React.Fragment>
      ))}

      {/* Dentil molding along main roofline */}
      {Array.from({ length: 28 }, (_, i) => 84 + i * 4.8).map((dx) => (
        <rect key={`dent-${dx}`} x={dx} y="54" width="2.5" height="2" fill={T.color.gold} opacity="0.15" />
      ))}

      {/* Pediment triangle */}
      <polygon points="75,60 150,22 225,60" fill="none" stroke={T.color.gold} strokeWidth="1" opacity="0.55" />
      {/* Inner pediment detail */}
      <polygon points="95,60 150,32 205,60" fill="none" stroke={T.color.gold} strokeWidth="0.4" opacity="0.2" />
      {/* Pediment dentil molding */}
      {Array.from({ length: 10 }, (_, i) => {
        const t = (i + 1) / 11;
        return { x: 75 + t * 75, y: 60 - t * 38 };
      }).map((d, i) => (
        <rect key={`pd-l-${i}`} x={d.x} y={d.y - 1} width="2" height="1.5" fill={T.color.gold} opacity="0.12" transform={`rotate(${-Math.atan2(38, 75) * 180 / Math.PI},${d.x},${d.y})`} />
      ))}
      {/* Pediment acroterion */}
      <circle cx="150" cy="20" r="3" fill="none" stroke={T.color.gold} strokeWidth="0.6" opacity="0.4" />
      <circle cx="75" cy="58" r="2" fill="none" stroke={T.color.gold} strokeWidth="0.5" opacity="0.3" />
      <circle cx="225" cy="58" r="2" fill="none" stroke={T.color.gold} strokeWidth="0.5" opacity="0.3" />

      {/* Columns — 8 columns with fluting */}
      {[92, 108, 124, 138, 162, 176, 192, 208].map((x) => (
        <React.Fragment key={`col-${x}`}>
          <line x1={x} y1="60" x2={x} y2="155" stroke="url(#palaceColumnGrad)" strokeWidth="2.5" />
          {/* Column fluting — vertical lines */}
          <line x1={x - 0.8} y1="62" x2={x - 0.8} y2="153" stroke={T.color.gold} strokeWidth="0.2" opacity="0.12" />
          <line x1={x + 0.8} y1="62" x2={x + 0.8} y2="153" stroke={T.color.gold} strokeWidth="0.2" opacity="0.12" />
          {/* Ornate capital — Ionic volutes */}
          <rect x={x - 4} y="57" width="8" height="4" fill={T.color.gold} opacity="0.3" rx="1" />
          <rect x={x - 5} y="55" width="10" height="3" fill={T.color.gold} opacity="0.2" rx="1" />
          <circle cx={x - 4.5} cy="56.5" r="1.2" fill="none" stroke={T.color.gold} strokeWidth="0.3" opacity="0.2" />
          <circle cx={x + 4.5} cy="56.5" r="1.2" fill="none" stroke={T.color.gold} strokeWidth="0.3" opacity="0.2" />
          {/* Column base */}
          <rect x={x - 4} y="153" width="8" height="3" fill={T.color.gold} opacity="0.25" rx="0.5" />
        </React.Fragment>
      ))}

      {/* Central arch doorway */}
      <rect x="135" y="105" width="30" height="50" fill="none" stroke={T.color.gold} strokeWidth="0.9" opacity="0.5" rx="15 15 0 0" />
      <rect x="138" y="108" width="24" height="47" fill="none" stroke={T.color.gold} strokeWidth="0.4" opacity="0.25" rx="12 12 0 0" />
      {/* Door warm glow — hearth-flicker, quicker and livelier than windows */}
      <ellipse cx="150" cy="125" rx="10" ry="18" fill="url(#windowWarmth)" opacity={windowGlow * 0.8}>
        <animate attributeName="opacity" values={`${windowGlow * 0.8};${windowGlow * 1.15};${windowGlow * 0.7};${windowGlow * 1.05};${windowGlow * 0.85};${windowGlow * 0.8}`} keyTimes="0;0.2;0.45;0.65;0.85;1" dur="3.2s" repeatCount="indefinite" />
        <animate attributeName="rx" values="10;10.8;9.6;10" dur="4.1s" repeatCount="indefinite" />
      </ellipse>

      {/* Human silhouette near entrance for scale */}
      <line x1="127" y1="145" x2="127" y2="155" stroke={T.color.gold} strokeWidth="0.6" opacity="0.2" />
      <circle cx="127" cy="143.5" r="1.3" fill="none" stroke={T.color.gold} strokeWidth="0.5" opacity="0.2" />
      {/* Arms */}
      <line x1="125.5" y1="148" x2="128.5" y2="148" stroke={T.color.gold} strokeWidth="0.4" opacity="0.15" />

      {/* Upper windows row with mullion crosses */}
      {[105, 125, 175, 195].map((x) => (
        <React.Fragment key={`uw-${x}`}>
          <rect x={x - 4} y={72} width="8" height="11" fill="none" stroke={T.color.gold} strokeWidth="0.5" opacity="0.35" rx="4 4 0 0" />
          {/* Mullion cross */}
          <line x1={x} y1={72} x2={x} y2={83} stroke={T.color.gold} strokeWidth="0.25" opacity="0.2" />
          <line x1={x - 4} y1={77.5} x2={x + 4} y2={77.5} stroke={T.color.gold} strokeWidth="0.25" opacity="0.2" />
          <ellipse cx={x} cy={77} rx="4" ry="5.5" fill="url(#windowWarmth)" opacity={windowGlow * 0.9}>
            <animate attributeName="opacity" values={`${windowGlow * 0.9};${windowGlow * 1.25};${windowGlow * 0.7};${windowGlow * 1.1};${windowGlow * 0.08};${windowGlow * 0.9}`} keyTimes="0;0.25;0.42;0.6;0.78;1" dur={`${5 + (x % 5)}s`} begin={`${-(x % 6)}s`} repeatCount="indefinite" />
          </ellipse>
        </React.Fragment>
      ))}

      {/* Steps — 3 levels */}
      <rect x="70" y="155" width="160" height="4" fill="none" stroke={T.color.gold} strokeWidth="0.5" opacity="0.3" rx="0.5" />
      <rect x="62" y="159" width="176" height="4" fill="none" stroke={T.color.gold} strokeWidth="0.5" opacity="0.25" rx="0.5" />
      <rect x="55" y="163" width="190" height="4" fill="none" stroke={T.color.gold} strokeWidth="0.4" opacity="0.2" rx="0.5" />

      {/* ── Reflecting pool / path in front of steps ── */}
      <rect x="90" y="168" width="120" height="8" fill="url(#poolReflect)" rx="1.5" />
      <rect x="90" y="168" width="120" height="8" fill="none" stroke={T.color.gold} strokeWidth="0.3" opacity="0.12" rx="1.5" />
      {/* Water shimmer lines */}
      <line x1="100" y1="171" x2="118" y2="171" stroke={T.color.gold} strokeWidth="0.3" opacity="0.1">
        <animate attributeName="opacity" values="0.1;0.18;0.1" dur="3s" repeatCount="indefinite" />
      </line>
      <line x1="130" y1="173" x2="155" y2="173" stroke={T.color.gold} strokeWidth="0.3" opacity="0.08">
        <animate attributeName="opacity" values="0.08;0.15;0.08" dur="4s" repeatCount="indefinite" />
      </line>
      <line x1="165" y1="170.5" x2="200" y2="170.5" stroke={T.color.gold} strokeWidth="0.3" opacity="0.1">
        <animate attributeName="opacity" values="0.1;0.16;0.1" dur="3.5s" repeatCount="indefinite" />
      </line>

      {/* ── Cypress trees — detailed with inner foliage ── */}
      {[14, 286].map((cx) => (
        <React.Fragment key={`tree-${cx}`}>
          <line x1={cx} y1="155" x2={cx} y2="75" stroke={T.color.gold} strokeWidth="0.6" opacity="0.2" />
          {/* Outer canopy */}
          <ellipse cx={cx} cy="100" rx="6" ry="45" fill="none" stroke={T.color.gold} strokeWidth="0.7" opacity="0.2" />
          {/* Middle foliage layer */}
          <ellipse cx={cx} cy="100" rx="4.5" ry="40" fill="none" stroke={T.color.gold} strokeWidth="0.4" opacity="0.14" />
          {/* Inner foliage layer */}
          <ellipse cx={cx} cy="100" rx="3" ry="35" fill="none" stroke={T.color.gold} strokeWidth="0.35" opacity="0.1" />
          {/* Central spine */}
          <ellipse cx={cx} cy="100" rx="1.5" ry="28" fill="none" stroke={T.color.gold} strokeWidth="0.25" opacity="0.08" />
          {/* Foliage texture — small arcs */}
          <path d={`M ${cx - 3},${85} Q ${cx},${82} ${cx + 3},${85}`} fill="none" stroke={T.color.gold} strokeWidth="0.3" opacity="0.1" />
          <path d={`M ${cx - 4},${100} Q ${cx},${97} ${cx + 4},${100}`} fill="none" stroke={T.color.gold} strokeWidth="0.3" opacity="0.1" />
          <path d={`M ${cx - 3.5},${115} Q ${cx},${112} ${cx + 3.5},${115}`} fill="none" stroke={T.color.gold} strokeWidth="0.3" opacity="0.1" />
          <path d={`M ${cx - 2.5},${130} Q ${cx},${127} ${cx + 2.5},${130}`} fill="none" stroke={T.color.gold} strokeWidth="0.3" opacity="0.08" />
        </React.Fragment>
      ))}

      {/* Small decorative trees near wings */}
      {[42, 258].map((cx) => (
        <React.Fragment key={`stree-${cx}`}>
          <ellipse cx={cx} cy="150" rx="4" ry="18" fill="none" stroke={T.color.gold} strokeWidth="0.5" opacity="0.15" />
          <ellipse cx={cx} cy="150" rx="2.5" ry="14" fill="none" stroke={T.color.gold} strokeWidth="0.3" opacity="0.1" />
        </React.Fragment>
      ))}
    </svg>
  );
}

/* ── Detailed Library SVG — bookshelves, open book, candle ── */
export function LibraryIllustration({ hover }: { hover: boolean }) {
  const candleGlow = hover ? 0.6 : 0.3;

  const bookColors = [
    { fill: T.color.terracotta, opacity: 0.5 },
    { fill: T.color.walnut, opacity: 0.45 },
    { fill: T.color.sage, opacity: 0.4 },
    { fill: T.color.gold, opacity: 0.35 },
    { fill: T.color.sandstone, opacity: 0.45 },
    { fill: T.color.terracotta, opacity: 0.4 },
    { fill: T.color.walnut, opacity: 0.5 },
    { fill: T.color.sage, opacity: 0.35 },
  ];

  return (
    <svg
      viewBox="0 0 300 180"
      style={{
        width: "100%",
        height: "auto",
        transition: "filter 0.5s ease",
        filter: hover
          ? `drop-shadow(0 0 0.75rem rgba(198,107,61,0.3))`
          : `drop-shadow(0 0 0.375rem rgba(198,107,61,0.08))`,
      }}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="candleWarmth" cx="50%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#FFEEBB" stopOpacity="0.6" />
          <stop offset="50%" stopColor={T.color.gold} stopOpacity="0.15" />
          <stop offset="100%" stopColor={T.color.gold} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="candleHaloOuter" cx="50%" cy="40%" r="70%">
          <stop offset="0%" stopColor="#FFD699" stopOpacity="0.4" />
          <stop offset="30%" stopColor="#FFEEBB" stopOpacity="0.2" />
          <stop offset="60%" stopColor={T.color.gold} stopOpacity="0.06" />
          <stop offset="100%" stopColor={T.color.gold} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="flameGrad">
          <stop offset="0%" stopColor="#FFF4CC" stopOpacity="1" />
          <stop offset="40%" stopColor="#FFD666" stopOpacity="0.9" />
          <stop offset="100%" stopColor={T.color.terracotta} stopOpacity="0.3" />
        </radialGradient>
        <linearGradient id="shelfGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={T.color.walnut} stopOpacity="0.25" />
          <stop offset="50%" stopColor={T.color.walnut} stopOpacity="0.4" />
          <stop offset="100%" stopColor={T.color.walnut} stopOpacity="0.25" />
        </linearGradient>
      </defs>

      {/* Candle warm ambient glow — larger outer halo */}
      <ellipse cx="245" cy="75" rx="90" ry="85" fill="url(#candleHaloOuter)" opacity={candleGlow * 0.7}>
        <animate attributeName="opacity" values={`${candleGlow * 0.7};${candleGlow * 0.95};${candleGlow * 0.7}`} dur="4s" repeatCount="indefinite" />
      </ellipse>
      {/* Inner candle warmth */}
      <ellipse cx="245" cy="80" rx="70" ry="70" fill="url(#candleWarmth)" opacity={candleGlow}>
        <animate attributeName="opacity" values={`${candleGlow};${candleGlow * 1.3};${candleGlow}`} dur="3s" repeatCount="indefinite" />
      </ellipse>

      {/* ── Bookshelf frame ── */}
      {/* Left upright */}
      <rect x="20" y="15" width="4" height="150" fill={T.color.walnut} opacity="0.3" rx="1" />
      {/* Right upright */}
      <rect x="200" y="15" width="4" height="150" fill={T.color.walnut} opacity="0.3" rx="1" />

      {/* Shelf planks — 3 shelves */}
      {[55, 100, 145].map((y) => (
        <rect key={`shelf-${y}`} x="18" y={y} width="190" height="3" fill="url(#shelfGrad)" rx="0.5" />
      ))}
      {/* Top decorative molding */}
      <rect x="16" y="13" width="194" height="3" fill={T.color.walnut} opacity="0.35" rx="1" />

      {/* ── Top shelf books ── */}
      {[
        { x: 28, w: 12, h: 36, color: bookColors[0], titleBar: true },
        { x: 42, w: 10, h: 32, color: bookColors[1], titleBar: false },
        { x: 54, w: 14, h: 38, color: bookColors[2], titleBar: true },
        { x: 70, w: 11, h: 30, color: bookColors[3], titleBar: false },
        { x: 83, w: 13, h: 36, color: bookColors[4], titleBar: true },
        { x: 98, w: 10, h: 33, color: bookColors[5], titleBar: false },
        { x: 110, w: 15, h: 37, color: bookColors[6], titleBar: true },
        { x: 127, w: 11, h: 31, color: bookColors[7], titleBar: false },
        { x: 140, w: 13, h: 35, color: bookColors[0], titleBar: false },
        { x: 155, w: 10, h: 33, color: bookColors[3], titleBar: true },
        { x: 167, w: 14, h: 37, color: bookColors[2], titleBar: false },
        { x: 183, w: 12, h: 34, color: bookColors[5], titleBar: true },
      ].map((book, i) => (
        <React.Fragment key={`top-${i}`}>
          <rect
            x={book.x}
            y={55 - book.h}
            width={book.w}
            height={book.h}
            fill={book.color.fill}
            opacity={book.color.opacity}
            rx="1"
            stroke={T.color.walnut}
            strokeWidth="0.3"
            strokeOpacity="0.2"
          />
          {/* Spine detail */}
          <line
            x1={book.x + book.w / 2}
            y1={55 - book.h + 4}
            x2={book.x + book.w / 2}
            y2={55 - book.h + 8}
            stroke={T.color.gold}
            strokeWidth="0.5"
            opacity="0.3"
          />
          {/* Gold title bar on some spines */}
          {book.titleBar && (
            <rect
              x={book.x + 2}
              y={55 - book.h + 12}
              width={book.w - 4}
              height="2"
              fill={T.color.gold}
              opacity="0.25"
              rx="0.5"
            />
          )}
        </React.Fragment>
      ))}

      {/* ── Middle shelf books — one tilted ── */}
      {[
        { x: 28, w: 14, h: 40, color: bookColors[6], titleBar: false },
        { x: 44, w: 11, h: 35, color: bookColors[3], titleBar: true },
        { x: 57, w: 13, h: 38, color: bookColors[0], titleBar: false },
        { x: 72, w: 10, h: 33, color: bookColors[5], titleBar: true },
        { x: 84, w: 15, h: 41, color: bookColors[2], titleBar: false },
        { x: 101, w: 12, h: 36, color: bookColors[7], titleBar: true },
        { x: 115, w: 11, h: 34, color: bookColors[4], titleBar: false },
        { x: 128, w: 14, h: 39, color: bookColors[1], titleBar: true },
        { x: 144, w: 10, h: 32, color: bookColors[6], titleBar: false },
        { x: 156, w: 13, h: 37, color: bookColors[0], titleBar: false },
        { x: 171, w: 11, h: 35, color: bookColors[3], titleBar: true },
        { x: 184, w: 12, h: 38, color: bookColors[2], titleBar: false },
      ].map((book, i) => (
        <React.Fragment key={`mid-${i}`}>
          <rect
            x={book.x}
            y={100 - book.h}
            width={book.w}
            height={book.h}
            fill={book.color.fill}
            opacity={book.color.opacity}
            rx="1"
            stroke={T.color.walnut}
            strokeWidth="0.3"
            strokeOpacity="0.2"
          />
          <line
            x1={book.x + book.w / 2}
            y1={100 - book.h + 4}
            x2={book.x + book.w / 2}
            y2={100 - book.h + 8}
            stroke={T.color.gold}
            strokeWidth="0.5"
            opacity="0.25"
          />
          {book.titleBar && (
            <rect
              x={book.x + 2}
              y={100 - book.h + 12}
              width={book.w - 4}
              height="2"
              fill={T.color.gold}
              opacity="0.2"
              rx="0.5"
            />
          )}
        </React.Fragment>
      ))}
      {/* Tilted book on middle shelf */}
      <rect
        x="170" y="67" width="10" height="33"
        fill={T.color.terracotta} opacity="0.35" rx="1"
        stroke={T.color.walnut} strokeWidth="0.3" strokeOpacity="0.2"
        transform="rotate(8, 175, 100)"
      />

      {/* ── Small globe on middle shelf (right side) ── */}
      <circle cx="196" cy="92" r="5" fill="none" stroke={T.color.gold} strokeWidth="0.5" opacity="0.25" />
      <ellipse cx="196" cy="92" rx="5" ry="1.5" fill="none" stroke={T.color.gold} strokeWidth="0.3" opacity="0.18" />
      <ellipse cx="196" cy="92" rx="1.5" ry="5" fill="none" stroke={T.color.gold} strokeWidth="0.3" opacity="0.15" />
      {/* Globe stand */}
      <line x1="196" y1="97" x2="196" y2="100" stroke={T.color.walnut} strokeWidth="0.5" opacity="0.25" />
      <line x1="193" y1="100" x2="199" y2="100" stroke={T.color.walnut} strokeWidth="0.5" opacity="0.25" />

      {/* ── Bottom shelf — fewer books, a leaning one ── */}
      {[
        { x: 28, w: 13, h: 38, color: bookColors[4] },
        { x: 43, w: 11, h: 34, color: bookColors[1] },
        { x: 56, w: 14, h: 40, color: bookColors[6] },
        { x: 72, w: 12, h: 36, color: bookColors[0] },
        { x: 86, w: 10, h: 32, color: bookColors[5] },
        { x: 98, w: 13, h: 37, color: bookColors[3] },
      ].map((book, i) => (
        <React.Fragment key={`bot-${i}`}>
          <rect
            x={book.x}
            y={145 - book.h}
            width={book.w}
            height={book.h}
            fill={book.color.fill}
            opacity={book.color.opacity}
            rx="1"
            stroke={T.color.walnut}
            strokeWidth="0.3"
            strokeOpacity="0.2"
          />
        </React.Fragment>
      ))}
      {/* Leaning book on bottom shelf */}
      <rect
        x="116" y="110" width="12" height="35"
        fill={T.color.terracotta} opacity="0.4" rx="1"
        stroke={T.color.walnut} strokeWidth="0.3" strokeOpacity="0.2"
        transform="rotate(-15, 122, 145)"
      />

      {/* ── Small cat curled up near bottom shelf ── */}
      {/* Body curve */}
      <path d="M 140,155 Q 144,148 150,149 Q 155,150 154,155" fill="none" stroke={T.color.walnut} strokeWidth="0.6" opacity="0.18" />
      {/* Head */}
      <ellipse cx="151" cy="151" rx="2.5" ry="2" fill="none" stroke={T.color.walnut} strokeWidth="0.5" opacity="0.18" />
      {/* Ears */}
      <path d="M 149.5,149.5 L 149,148 L 150,149" fill="none" stroke={T.color.walnut} strokeWidth="0.4" opacity="0.15" />
      <path d="M 152,149.5 L 152.5,148 L 153,149" fill="none" stroke={T.color.walnut} strokeWidth="0.4" opacity="0.15" />
      {/* Tail */}
      <path d="M 140,155 Q 136,153 135,150" fill="none" stroke={T.color.walnut} strokeWidth="0.5" opacity="0.15" />

      {/* ── Open book in foreground ── */}
      {/* Left page */}
      <path
        d="M 135,168 Q 135,140 160,138 L 160,168 Z"
        fill={T.color.cream}
        opacity="0.6"
        stroke={T.color.walnut}
        strokeWidth="0.5"
        strokeOpacity="0.3"
      />
      {/* Right page */}
      <path
        d="M 185,168 Q 185,140 160,138 L 160,168 Z"
        fill={T.color.linen}
        opacity="0.6"
        stroke={T.color.walnut}
        strokeWidth="0.5"
        strokeOpacity="0.3"
      />
      {/* Spine */}
      <line x1="160" y1="138" x2="160" y2="168" stroke={T.color.walnut} strokeWidth="0.6" opacity="0.4" />
      {/* Text lines on left page */}
      {[147, 150, 153, 156, 159, 162].map((y) => (
        <line key={`tl-${y}`} x1="140" y1={y} x2={152 + (y % 3) * 2} y2={y} stroke={T.color.muted} strokeWidth="0.4" opacity="0.3" />
      ))}
      {/* Text lines on right page */}
      {[147, 150, 153, 156, 159, 162].map((y) => (
        <line key={`tr-${y}`} x1="164" y1={y} x2={176 + (y % 3) * 2} y2={y} stroke={T.color.muted} strokeWidth="0.4" opacity="0.3" />
      ))}

      {/* ── Scattered papers / letters near the open book ── */}
      {/* Paper 1 — slightly rotated */}
      <rect x="120" y="162" width="10" height="7" fill={T.color.cream} opacity="0.35" rx="0.5" stroke={T.color.walnut} strokeWidth="0.2" strokeOpacity="0.15" transform="rotate(-8, 125, 165)" />
      <line x1="122" y1="164" x2="128" y2="164" stroke={T.color.muted} strokeWidth="0.25" opacity="0.15" />
      <line x1="122" y1="166" x2="127" y2="166" stroke={T.color.muted} strokeWidth="0.25" opacity="0.12" />
      {/* Paper 2 */}
      <rect x="188" y="163" width="9" height="6" fill={T.color.linen} opacity="0.3" rx="0.5" stroke={T.color.walnut} strokeWidth="0.2" strokeOpacity="0.12" transform="rotate(12, 192, 166)" />
      <line x1="190" y1="165" x2="195" y2="165" stroke={T.color.muted} strokeWidth="0.25" opacity="0.12" />
      {/* Paper 3 — folded letter */}
      <rect x="130" y="166" width="7" height="5" fill={T.color.cream} opacity="0.25" rx="0.3" stroke={T.color.walnut} strokeWidth="0.2" strokeOpacity="0.1" transform="rotate(5, 133, 168)" />

      {/* ── Reading figure silhouette ── */}
      {/* Chair back */}
      <path d="M 270,145 L 270,130 Q 272,128 275,128 L 278,128 Q 280,128 282,130 L 282,145" fill="none" stroke={T.color.walnut} strokeWidth="0.6" opacity="0.2" />
      {/* Chair seat */}
      <line x1="268" y1="145" x2="284" y2="145" stroke={T.color.walnut} strokeWidth="0.6" opacity="0.2" />
      {/* Chair legs */}
      <line x1="269" y1="145" x2="267" y2="155" stroke={T.color.walnut} strokeWidth="0.5" opacity="0.18" />
      <line x1="283" y1="145" x2="285" y2="155" stroke={T.color.walnut} strokeWidth="0.5" opacity="0.18" />
      {/* Person — torso */}
      <line x1="276" y1="135" x2="276" y2="145" stroke={T.color.walnut} strokeWidth="0.7" opacity="0.2" />
      {/* Head */}
      <circle cx="276" cy="132.5" r="2.5" fill="none" stroke={T.color.walnut} strokeWidth="0.6" opacity="0.2" />
      {/* Arms holding book */}
      <line x1="273" y1="138" x2="270" y2="142" stroke={T.color.walnut} strokeWidth="0.5" opacity="0.18" />
      <line x1="279" y1="138" x2="282" y2="142" stroke={T.color.walnut} strokeWidth="0.5" opacity="0.18" />
      {/* Small open book in hands */}
      <path d="M 270,142 L 276,140 L 282,142" fill="none" stroke={T.color.walnut} strokeWidth="0.4" opacity="0.18" />

      {/* ── Candle ── */}
      {/* Candlestick holder */}
      <rect x="241" y="110" width="8" height="40" fill={T.color.walnut} opacity="0.35" rx="1" />
      <rect x="238" y="148" width="14" height="4" fill={T.color.walnut} opacity="0.35" rx="1" />
      <rect x="236" y="152" width="18" height="3" fill={T.color.walnut} opacity="0.3" rx="1.5" />
      {/* Candle body */}
      <rect x="242" y="75" width="6" height="36" fill={T.color.cream} opacity="0.5" rx="1" />
      {/* Wick */}
      <line x1="245" y1="75" x2="245" y2="70" stroke={T.color.charcoal} strokeWidth="0.5" opacity="0.4" />
      {/* Warm halo effect — amber outer ring */}
      <ellipse cx="245" cy="62" rx="12" ry="14" fill="none" stroke="#FFD699" strokeWidth="0.5" opacity={candleGlow * 0.3}>
        <animate attributeName="opacity" values={`${candleGlow * 0.3};${candleGlow * 0.45};${candleGlow * 0.3}`} dur="2.5s" repeatCount="indefinite" />
      </ellipse>
      <ellipse cx="245" cy="63" rx="8" ry="10" fill="#FFEEBB" opacity={candleGlow * 0.12}>
        <animate attributeName="opacity" values={`${candleGlow * 0.12};${candleGlow * 0.2};${candleGlow * 0.12}`} dur="2s" repeatCount="indefinite" />
      </ellipse>
      {/* Flame — a real candle sway: the whole flame leans and rights itself,
          stretches on the draft, and its inner tongue dances offset from it */}
      <g>
        <animateTransform attributeName="transform" type="rotate" values="-5 245 71; 4 245 71; -2 245 71; 5 245 71; -5 245 71" dur="2.6s" repeatCount="indefinite" />
        <ellipse cx="245" cy="64" rx="4" ry="7" fill="url(#flameGrad)" opacity={hover ? 0.85 : 0.65}>
          <animate attributeName="ry" values="7;8.6;6.2;7.8;7" dur="1.5s" repeatCount="indefinite" />
          <animate attributeName="cy" values="64;62.8;64.6;63.4;64" dur="1.9s" repeatCount="indefinite" />
          <animate attributeName="opacity" values={`${hover ? 0.85 : 0.65};${hover ? 0.95 : 0.8};${hover ? 0.78 : 0.55};${hover ? 0.85 : 0.65}`} dur="1.1s" repeatCount="indefinite" />
        </ellipse>
        <ellipse cx="245" cy="65" rx="1.5" ry="3.5" fill="#FFF8E0" opacity="0.8">
          <animate attributeName="ry" values="3.5;4.4;2.9;3.9;3.5" dur="1.15s" repeatCount="indefinite" />
          <animate attributeName="cx" values="245;245.6;244.4;245.2;245" dur="1.4s" repeatCount="indefinite" />
        </ellipse>
      </g>
      {/* the occasional spark rising off the wick */}
      <circle cx="245" cy="60" r="0.6" fill="#FFD666" opacity="0">
        <animate attributeName="opacity" values="0;0;0.8;0;0" keyTimes="0;0.62;0.68;0.8;1" dur="7s" repeatCount="indefinite" />
        <animate attributeName="cy" values="60;60;52;46;46" keyTimes="0;0.62;0.72;0.8;1" dur="7s" repeatCount="indefinite" />
        <animate attributeName="cx" values="245;245;246.5;244.8;244.8" keyTimes="0;0.62;0.72;0.8;1" dur="7s" repeatCount="indefinite" />
      </circle>

      {/* ── A second, smaller candle on the desk (tealight by the scroll) ── */}
      <rect x="219.5" y="128" width="5" height="10" fill={T.color.cream} opacity="0.5" rx="1" />
      <ellipse cx="222" cy="138.5" rx="4" ry="1.4" fill={T.color.walnut} opacity="0.3" />
      <line x1="222" y1="128" x2="222" y2="125.5" stroke={T.color.charcoal} strokeWidth="0.4" opacity="0.4" />
      <ellipse cx="222" cy="124" rx="5" ry="6" fill="#FFEEBB" opacity={candleGlow * 0.15}>
        <animate attributeName="opacity" values={`${candleGlow * 0.15};${candleGlow * 0.26};${candleGlow * 0.15}`} dur="2.3s" repeatCount="indefinite" />
      </ellipse>
      <g>
        <animateTransform attributeName="transform" type="rotate" values="4 222 128; -5 222 128; 2 222 128; 4 222 128" dur="2.1s" repeatCount="indefinite" />
        <ellipse cx="222" cy="123.5" rx="2.2" ry="4" fill="url(#flameGrad)" opacity={hover ? 0.8 : 0.55}>
          <animate attributeName="ry" values="4;4.9;3.4;4" dur="1.3s" repeatCount="indefinite" />
        </ellipse>
        <ellipse cx="222" cy="124.5" rx="0.9" ry="2" fill="#FFF8E0" opacity="0.75">
          <animate attributeName="ry" values="2;2.5;1.6;2" dur="1s" repeatCount="indefinite" />
        </ellipse>
      </g>

      {/* ── Scroll accent near candle — with text lines ── */}
      <ellipse cx="228" cy="155" rx="12" ry="3" fill="none" stroke={T.color.gold} strokeWidth="0.5" opacity="0.25" />
      <line x1="216" y1="155" x2="216" y2="140" stroke={T.color.gold} strokeWidth="0.4" opacity="0.2" />
      <ellipse cx="216" cy="140" rx="2.5" ry="3" fill="none" stroke={T.color.gold} strokeWidth="0.5" opacity="0.25" />
      <line x1="240" y1="155" x2="240" y2="145" stroke={T.color.gold} strokeWidth="0.4" opacity="0.2" />
      {/* Text lines on unrolled scroll portion */}
      {[143, 146, 149, 152].map((y) => (
        <line key={`scroll-t-${y}`} x1="219" y1={y} x2={230 + (y % 2) * 3} y2={y} stroke={T.color.gold} strokeWidth="0.3" opacity="0.12" />
      ))}

      {/* Quill */}
      <line x1="265" y1="120" x2="255" y2="160" stroke={T.color.gold} strokeWidth="0.6" opacity="0.25" />
      <path d="M 265,120 Q 270,115 268,108 Q 266,112 265,120" fill={T.color.gold} opacity="0.2" />
    </svg>
  );
}

/* ── Floating particles — upgraded: 14 particles, varied sizes and colors ── */
