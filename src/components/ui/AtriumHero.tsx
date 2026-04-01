"use client";

import React, { useMemo, useEffect } from "react";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { T } from "@/lib/theme";

interface AtriumHeroProps {
  userName: string | null;
  totalMemories: number;
  totalWings: number;
  totalRooms: number;
  lifeCompleteness: number;
  onNavigateLibrary: () => void;
  onNavigatePalace: () => void;
  isMobile: boolean;
}

function getGreetingKey(): string {
  const h = new Date().getHours();
  if (h < 12) return "goodMorning";
  if (h < 18) return "goodAfternoon";
  return "goodEvening";
}

function formatDate(t: (k: string) => string): string {
  const now = new Date();
  const dayNames = [
    t("sunday"), t("monday"), t("tuesday"), t("wednesday"),
    t("thursday"), t("friday"), t("saturday"),
  ];
  const monthNames = [
    t("january"), t("february"), t("march"), t("april"),
    t("may"), t("june"), t("july"), t("august"),
    t("september"), t("october"), t("november"), t("december"),
  ];
  const day = now.getDate();
  const suffix =
    day === 1 || day === 21 || day === 31 ? "st" :
    day === 2 || day === 22 ? "nd" :
    day === 3 || day === 23 ? "rd" : "th";
  return `${dayNames[now.getDay()]}, ${monthNames[now.getMonth()]} ${day}${suffix}`;
}

/* ── Mini Palace SVG silhouette with ambient glow ── */
function PalaceSilhouette({ hover }: { hover: boolean }) {
  return (
    <svg
      viewBox="0 0 200 100"
      style={{
        width: "100%",
        maxWidth: "12rem",
        height: "auto",
        opacity: hover ? 0.95 : 0.7,
        transition: "opacity 0.5s ease",
        filter: hover ? `drop-shadow(0 0 0.75rem rgba(212,175,55,0.4))` : `drop-shadow(0 0 0.375rem rgba(212,175,55,0.15))`,
      }}
      aria-hidden="true"
    >
      {/* Ground line */}
      <line x1="10" y1="88" x2="190" y2="88" stroke={T.color.gold} strokeWidth="0.5" opacity="0.4" />
      {/* Main temple body */}
      <rect x="40" y="45" width="120" height="43" fill="none" stroke={T.color.gold} strokeWidth="0.8" opacity="0.5" rx="1" />
      {/* Pediment (triangle) */}
      <polygon points="35,45 100,15 165,45" fill="none" stroke={T.color.gold} strokeWidth="0.8" opacity="0.6" />
      {/* Columns */}
      {[50, 72, 94, 106, 128, 150].map((x) => (
        <line key={x} x1={x} y1="45" x2={x} y2="88" stroke={T.color.gold} strokeWidth="1" opacity="0.35" />
      ))}
      {/* Column capitals */}
      {[50, 72, 94, 106, 128, 150].map((x) => (
        <rect key={`cap-${x}`} x={x - 3} y="43" width="6" height="3" fill={T.color.gold} opacity="0.3" rx="0.5" />
      ))}
      {/* Door */}
      <rect x="88" y="58" width="24" height="30" fill="none" stroke={T.color.gold} strokeWidth="0.8" opacity="0.5" rx="12 12 0 0" />
      {/* Steps */}
      <rect x="30" y="88" width="140" height="3" fill="none" stroke={T.color.gold} strokeWidth="0.5" opacity="0.3" />
      <rect x="25" y="91" width="150" height="3" fill="none" stroke={T.color.gold} strokeWidth="0.5" opacity="0.2" />
      {/* Ambient glow circle behind pediment */}
      <circle cx="100" cy="35" r="30" fill={`url(#palaceGlow)`} opacity={hover ? 0.5 : 0.2}>
        <animate attributeName="opacity" values={hover ? "0.5;0.7;0.5" : "0.2;0.35;0.2"} dur="3s" repeatCount="indefinite" />
      </circle>
      <defs>
        <radialGradient id="palaceGlow">
          <stop offset="0%" stopColor={T.color.gold} stopOpacity="0.4" />
          <stop offset="100%" stopColor={T.color.gold} stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
}

/* ── Floating particles for palace card ── */
function FloatingParticles() {
  const particles = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => ({
      id: i,
      left: `${12 + Math.random() * 76}%`,
      delay: `${Math.random() * 4}s`,
      duration: `${3 + Math.random() * 3}s`,
      size: `${0.125 + Math.random() * 0.125}rem`,
    }));
  }, []);

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }} aria-hidden="true">
      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            bottom: "10%",
            left: p.left,
            width: p.size,
            height: p.size,
            borderRadius: "50%",
            background: T.color.gold,
            opacity: 0.3,
            animation: `atriumParticleFloat ${p.duration} ease-in-out ${p.delay} infinite`,
          }}
        />
      ))}
    </div>
  );
}

/* ── Life Completeness Arc ── */
function LifeArc({ completeness, isMobile }: { completeness: number; isMobile: boolean }) {
  const clampedVal = Math.max(0, Math.min(100, completeness));
  const arcWidth = isMobile ? 220 : 320;
  const arcHeight = 24;
  const strokeW = 2;
  const radius = (arcWidth * arcWidth) / (8 * arcHeight) + arcHeight / 2;
  const angle = Math.asin(arcWidth / (2 * radius));
  const startAngle = Math.PI / 2 + angle;
  const endAngle = Math.PI / 2 - angle;
  const cx = arcWidth / 2;
  const cy = radius;

  function polarToCartesian(a: number) {
    return { x: cx + radius * Math.cos(a), y: cy - radius * Math.sin(a) };
  }

  const start = polarToCartesian(startAngle);
  const end = polarToCartesian(endAngle);
  const progressAngle = startAngle - (startAngle - endAngle) * (clampedVal / 100);
  const progressEnd = polarToCartesian(progressAngle);

  const bgPath = `M ${start.x} ${start.y} A ${radius} ${radius} 0 0 1 ${end.x} ${end.y}`;
  const fillPath = `M ${start.x} ${start.y} A ${radius} ${radius} 0 0 1 ${progressEnd.x} ${progressEnd.y}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: isMobile ? "0.5rem" : "0.75rem" }}>
      <svg
        width={arcWidth}
        height={arcHeight + strokeW * 2}
        viewBox={`0 0 ${arcWidth} ${arcHeight + strokeW * 2}`}
        style={{ overflow: "visible" }}
        aria-hidden="true"
      >
        <path d={bgPath} fill="none" stroke={T.color.sandstone} strokeWidth={strokeW} strokeLinecap="round" opacity="0.4" />
        {clampedVal > 0 && (
          <path
            d={fillPath}
            fill="none"
            stroke={`url(#arcGradient)`}
            strokeWidth={strokeW}
            strokeLinecap="round"
            style={{ animation: "atriumArcDraw 1.5s ease-out both 0.6s" }}
          />
        )}
        <defs>
          <linearGradient id="arcGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={T.color.gold} stopOpacity="0.6" />
            <stop offset="50%" stopColor={T.color.gold} stopOpacity="1" />
            <stop offset="100%" stopColor={T.color.terracotta} stopOpacity="0.8" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

export default function AtriumHero({
  userName,
  totalMemories,
  totalWings,
  totalRooms,
  lifeCompleteness,
  onNavigateLibrary,
  onNavigatePalace,
  isMobile,
}: AtriumHeroProps) {
  const { t } = useTranslation("atrium");

  const greetingKey = useMemo(getGreetingKey, []);
  const dateStr = useMemo(() => formatDate(t), [t]);

  const greeting = userName
    ? `${t(greetingKey)}, ${userName}`
    : t("welcomeToYourPalace");

  const [libHover, setLibHover] = React.useState(false);
  const [palHover, setPalHover] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <>
      <style>{`
        @keyframes atriumFadeIn {
          from { opacity: 0; transform: translateY(1.25rem); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes atriumFadeInUp {
          from { opacity: 0; transform: translateY(1.5rem) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes atriumGoldShimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes atriumGlow {
          0%, 100% { box-shadow: 0 0 1.5rem 0.5rem rgba(212,175,55,0.08); }
          50%      { box-shadow: 0 0 2.5rem 1rem rgba(212,175,55,0.18); }
        }
        @keyframes atriumParticleFloat {
          0%   { transform: translateY(0) scale(1); opacity: 0; }
          15%  { opacity: 0.4; }
          50%  { transform: translateY(-3rem) scale(0.8); opacity: 0.25; }
          85%  { opacity: 0.1; }
          100% { transform: translateY(-5.5rem) scale(0.5); opacity: 0; }
        }
        @keyframes atriumArcDraw {
          from { stroke-dashoffset: 400; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes atriumPulseGlow {
          0%, 100% { opacity: 0.15; }
          50%      { opacity: 0.3; }
        }
        @keyframes atriumFloat {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-0.25rem); }
        }
        @keyframes atriumShimmerBorder {
          0%   { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
      `}</style>

      <section
        style={{
          width: "100%",
          maxWidth: "60rem",
          margin: "0 auto",
          padding: isMobile ? "1.5rem 1rem 2rem" : "3rem 2rem 2.5rem",
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(1rem)",
          transition: "opacity 0.7s ease, transform 0.7s ease",
        }}
        aria-label={t("heroSection")}
      >
        {/* ─── Life Completeness Arc ─── */}
        <LifeArc completeness={lifeCompleteness} isMobile={isMobile} />

        {/* ─── Greeting Section ─── */}
        <div
          style={{
            textAlign: "center",
            marginBottom: isMobile ? "2.5rem" : "3rem",
            animation: "atriumFadeIn 0.8s ease both 0.1s",
          }}
        >
          {/* Date — small, above greeting */}
          <p
            style={{
              fontFamily: T.font.body,
              fontSize: "0.75rem",
              fontWeight: 400,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: T.color.muted,
              margin: "0 0 0.75rem",
              opacity: 0.7,
            }}
          >
            {dateStr}
          </p>

          {/* Greeting with gold shimmer */}
          <h1
            style={{
              fontFamily: T.font.display,
              fontSize: isMobile ? "2rem" : "3rem",
              fontWeight: 300,
              letterSpacing: "0.02em",
              lineHeight: 1.2,
              margin: 0,
              color: T.color.charcoal,
              background: `linear-gradient(90deg, ${T.color.charcoal} 30%, ${T.color.gold} 50%, ${T.color.charcoal} 70%)`,
              backgroundSize: "200% auto",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              animation: "atriumGoldShimmer 6s ease-in-out infinite",
            }}
          >
            {greeting}
          </h1>

          {/* Tagline — legacy / testimony of life */}
          <p
            style={{
              fontFamily: T.font.display,
              fontSize: isMobile ? "0.9375rem" : "1.125rem",
              fontStyle: "italic",
              fontWeight: 300,
              color: T.color.walnut,
              margin: "0.75rem 0 0",
              opacity: 0.8,
              lineHeight: 1.6,
              maxWidth: "28rem",
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            {t("legacyTagline")}
          </p>

          {/* Gold ornamental divider */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.75rem",
              margin: "1.5rem auto 0",
              maxWidth: isMobile ? "10rem" : "14rem",
            }}
            aria-hidden="true"
          >
            <div style={{
              flex: 1,
              height: "0.0625rem",
              background: `linear-gradient(90deg, transparent, ${T.color.gold})`,
              opacity: 0.4,
            }} />
            <div style={{
              width: "0.25rem",
              height: "0.25rem",
              borderRadius: "50%",
              background: T.color.gold,
              opacity: 0.5,
            }} />
            <div style={{
              flex: 1,
              height: "0.0625rem",
              background: `linear-gradient(90deg, ${T.color.gold}, transparent)`,
              opacity: 0.4,
            }} />
          </div>
        </div>

        {/* ─── Navigation Cards ─── */}
        <div
          style={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            gap: isMobile ? "1.25rem" : "1.5rem",
            perspective: "75rem",
          }}
        >
          {/* ── Library Card ── */}
          <button
            type="button"
            onClick={onNavigateLibrary}
            onMouseEnter={() => setLibHover(true)}
            onMouseLeave={() => setLibHover(false)}
            onFocus={() => setLibHover(true)}
            onBlur={() => setLibHover(false)}
            style={{
              flex: 1,
              minHeight: isMobile ? "14rem" : "18rem",
              borderRadius: "1.25rem",
              border: "0.0625rem solid transparent",
              borderColor: libHover ? T.color.terracotta : "rgba(212,197,178,0.4)",
              padding: isMobile ? "1.75rem" : "2.25rem",
              cursor: "pointer",
              textAlign: "left",
              position: "relative",
              overflow: "hidden",
              background: `linear-gradient(155deg, ${T.color.linen} 0%, ${T.color.warmStone} 60%, ${T.color.cream} 100%)`,
              boxShadow: libHover
                ? `0 1.5rem 3rem rgba(139,115,85,0.15), 0 0.5rem 1rem rgba(139,115,85,0.08), inset 0 0.0625rem 0 rgba(255,255,255,0.6)`
                : `0 0.25rem 1.25rem rgba(139,115,85,0.08), inset 0 0.0625rem 0 rgba(255,255,255,0.6)`,
              transform: libHover
                ? "translateY(-0.375rem) translateZ(0.5rem) rotateX(1deg)"
                : "translateY(0) translateZ(0) rotateX(0)",
              transition: "all 0.4s cubic-bezier(0.23, 1, 0.32, 1)",
              animation: "atriumFadeInUp 0.7s ease both 0.25s",
              transformStyle: "preserve-3d",
            }}
            aria-label={t("openLibrary")}
          >
            {/* Warm decorative corner accent */}
            <div
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                width: "6rem",
                height: "6rem",
                background: `radial-gradient(circle at 100% 0%, ${T.color.terracotta}15 0%, transparent 70%)`,
                pointerEvents: "none",
              }}
              aria-hidden="true"
            />

            {/* Subtle book pattern overlay */}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: "40%",
                height: "40%",
                opacity: libHover ? 0.08 : 0.04,
                transition: "opacity 0.4s ease",
                pointerEvents: "none",
                background: `repeating-linear-gradient(
                  0deg,
                  ${T.color.walnut} 0,
                  ${T.color.walnut} 0.125rem,
                  transparent 0.125rem,
                  transparent 0.75rem
                )`,
                borderRadius: "0 0 1.25rem 0",
                maskImage: "linear-gradient(135deg, transparent 30%, black 100%)",
                WebkitMaskImage: "linear-gradient(135deg, transparent 30%, black 100%)",
              }}
              aria-hidden="true"
            />

            {/* Section label */}
            <p
              style={{
                fontFamily: T.font.body,
                fontSize: "0.6875rem",
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: T.color.terracotta,
                margin: "0 0 1.25rem",
                opacity: 0.8,
              }}
            >
              {t("libraryLabel")}
            </p>

            {/* Title */}
            <h2
              style={{
                fontFamily: T.font.display,
                fontSize: isMobile ? "1.5rem" : "1.75rem",
                fontWeight: 600,
                color: T.color.charcoal,
                margin: "0 0 0.5rem",
                lineHeight: 1.2,
              }}
            >
              {t("yourLibrary")}
            </h2>

            {/* Description */}
            <p
              style={{
                fontFamily: T.font.body,
                fontSize: "0.875rem",
                color: T.color.muted,
                margin: "0 0 1.5rem",
                lineHeight: 1.6,
                maxWidth: "20rem",
              }}
            >
              {t("librarySubtitle")}
            </p>

            {/* Stats row */}
            <div
              style={{
                display: "flex",
                gap: "1.5rem",
                marginBottom: "1.5rem",
              }}
            >
              <div>
                <span
                  style={{
                    fontFamily: T.font.display,
                    fontSize: "1.75rem",
                    fontWeight: 600,
                    color: T.color.charcoal,
                    lineHeight: 1,
                  }}
                >
                  {totalMemories}
                </span>
                <p
                  style={{
                    fontFamily: T.font.body,
                    fontSize: "0.6875rem",
                    color: T.color.muted,
                    margin: "0.25rem 0 0",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  {t("memories")}
                </p>
              </div>
              <div style={{ width: "0.0625rem", background: T.color.sandstone, opacity: 0.5 }} />
              <div>
                <span
                  style={{
                    fontFamily: T.font.display,
                    fontSize: "1.75rem",
                    fontWeight: 600,
                    color: T.color.charcoal,
                    lineHeight: 1,
                  }}
                >
                  {totalWings}
                </span>
                <p
                  style={{
                    fontFamily: T.font.body,
                    fontSize: "0.6875rem",
                    color: T.color.muted,
                    margin: "0.25rem 0 0",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  {t("wings")}
                </p>
              </div>
            </div>

            {/* CTA */}
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                fontFamily: T.font.body,
                fontSize: "0.875rem",
                fontWeight: 600,
                color: T.color.linen,
                background: libHover
                  ? `linear-gradient(135deg, ${T.color.terracotta}, #D4936A)`
                  : T.color.terracotta,
                padding: "0.625rem 1.5rem",
                borderRadius: "0.625rem",
                transition: "all 0.35s cubic-bezier(0.23, 1, 0.32, 1)",
                boxShadow: libHover
                  ? `0 0.5rem 1.25rem rgba(193,127,89,0.3)`
                  : `0 0.25rem 0.75rem rgba(193,127,89,0.15)`,
                transform: libHover ? "translateX(0.125rem)" : "translateX(0)",
              }}
            >
              {t("openLibrary")}
              <span style={{
                display: "inline-block",
                transition: "transform 0.3s ease",
                transform: libHover ? "translateX(0.25rem)" : "translateX(0)",
              }}>
                {"\u2192"}
              </span>
            </span>
          </button>

          {/* ── Palace Card ── */}
          <button
            type="button"
            onClick={onNavigatePalace}
            onMouseEnter={() => setPalHover(true)}
            onMouseLeave={() => setPalHover(false)}
            onFocus={() => setPalHover(true)}
            onBlur={() => setPalHover(false)}
            style={{
              flex: 1,
              minHeight: isMobile ? "14rem" : "18rem",
              borderRadius: "1.25rem",
              border: "0.0625rem solid",
              borderColor: palHover ? T.color.gold : "rgba(212,175,55,0.2)",
              padding: isMobile ? "1.75rem" : "2.25rem",
              cursor: "pointer",
              textAlign: "left",
              position: "relative",
              overflow: "hidden",
              background: `linear-gradient(155deg, #2E2D2B 0%, ${T.color.charcoal} 40%, #33302C 100%)`,
              boxShadow: palHover
                ? `0 1.5rem 3rem rgba(0,0,0,0.3), 0 0.5rem 1rem rgba(0,0,0,0.15), 0 0 2rem rgba(212,175,55,0.1), inset 0 0.0625rem 0 rgba(255,255,255,0.05)`
                : `0 0.25rem 1.25rem rgba(0,0,0,0.15), inset 0 0.0625rem 0 rgba(255,255,255,0.05)`,
              transform: palHover
                ? "translateY(-0.375rem) translateZ(0.5rem) rotateX(1deg)"
                : "translateY(0) translateZ(0) rotateX(0)",
              transition: "all 0.4s cubic-bezier(0.23, 1, 0.32, 1)",
              animation: "atriumFadeInUp 0.7s ease both 0.4s",
              transformStyle: "preserve-3d",
            }}
            aria-label={t("enterPalace")}
          >
            {/* Ambient glow top-left */}
            <div
              style={{
                position: "absolute",
                top: "-2rem",
                left: "-2rem",
                width: "10rem",
                height: "10rem",
                borderRadius: "50%",
                background: `radial-gradient(circle, rgba(212,175,55,${palHover ? 0.12 : 0.06}) 0%, transparent 70%)`,
                animation: "atriumPulseGlow 4s ease-in-out infinite",
                pointerEvents: "none",
              }}
              aria-hidden="true"
            />

            {/* Floating particles */}
            <FloatingParticles />

            {/* Section label */}
            <p
              style={{
                fontFamily: T.font.body,
                fontSize: "0.6875rem",
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: T.color.gold,
                margin: "0 0 1.25rem",
                opacity: 0.7,
              }}
            >
              {t("palaceLabel")}
            </p>

            {/* Title */}
            <h2
              style={{
                fontFamily: T.font.display,
                fontSize: isMobile ? "1.5rem" : "1.75rem",
                fontWeight: 600,
                color: T.color.linen,
                margin: "0 0 0.5rem",
                lineHeight: 1.2,
              }}
            >
              {t("threeDPalace")}
            </h2>

            {/* Description */}
            <p
              style={{
                fontFamily: T.font.body,
                fontSize: "0.875rem",
                color: "rgba(250,250,247,0.5)",
                margin: "0 0 1.25rem",
                lineHeight: 1.6,
                maxWidth: "20rem",
              }}
            >
              {t("palaceSubtitle")}
            </p>

            {/* Palace illustration */}
            <div
              style={{
                margin: "0 0 1.25rem",
                display: "flex",
                justifyContent: "center",
                animation: "atriumFloat 5s ease-in-out infinite",
              }}
            >
              <PalaceSilhouette hover={palHover} />
            </div>

            {/* Stats row */}
            <div
              style={{
                display: "flex",
                gap: "1.5rem",
                marginBottom: "1.5rem",
              }}
            >
              <div>
                <span
                  style={{
                    fontFamily: T.font.display,
                    fontSize: "1.75rem",
                    fontWeight: 600,
                    color: T.color.gold,
                    lineHeight: 1,
                  }}
                >
                  {totalWings}
                </span>
                <p
                  style={{
                    fontFamily: T.font.body,
                    fontSize: "0.6875rem",
                    color: "rgba(250,250,247,0.45)",
                    margin: "0.25rem 0 0",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  {t("wings")}
                </p>
              </div>
              <div style={{ width: "0.0625rem", background: "rgba(212,175,55,0.2)" }} />
              <div>
                <span
                  style={{
                    fontFamily: T.font.display,
                    fontSize: "1.75rem",
                    fontWeight: 600,
                    color: T.color.gold,
                    lineHeight: 1,
                  }}
                >
                  {totalRooms}
                </span>
                <p
                  style={{
                    fontFamily: T.font.body,
                    fontSize: "0.6875rem",
                    color: "rgba(250,250,247,0.45)",
                    margin: "0.25rem 0 0",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  {t("rooms")}
                </p>
              </div>
            </div>

            {/* CTA */}
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                fontFamily: T.font.body,
                fontSize: "0.875rem",
                fontWeight: 600,
                color: T.color.gold,
                background: "transparent",
                border: `0.0625rem solid ${T.color.gold}`,
                padding: "0.625rem 1.5rem",
                borderRadius: "0.625rem",
                transition: "all 0.35s cubic-bezier(0.23, 1, 0.32, 1)",
                boxShadow: palHover
                  ? `0 0 1.25rem rgba(212,175,55,0.2), inset 0 0 0.75rem rgba(212,175,55,0.08)`
                  : "none",
                ...(palHover
                  ? {
                      background: `linear-gradient(90deg, rgba(212,175,55,0.08), rgba(212,175,55,0.15), rgba(212,175,55,0.08))`,
                      backgroundSize: "200% 100%",
                      animation: "atriumShimmerBorder 2s linear infinite",
                    }
                  : {}),
              }}
            >
              {t("enterPalace")}
              <span style={{
                display: "inline-block",
                transition: "transform 0.3s ease",
                transform: palHover ? "translateX(0.25rem)" : "translateX(0)",
              }}>
                {"\u2192"}
              </span>
            </span>
          </button>
        </div>
      </section>
    </>
  );
}
