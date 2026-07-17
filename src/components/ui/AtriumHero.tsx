"use client";

/**
 * Atrium hero — "Calm Sanctuary" (round-10 overhaul).
 *
 * A quiet, dignified threshold instead of a flashy dashboard: a solid Fraunces
 * greeting (name in warm rust, no gold-shimmer clip), the palace mark, a real
 * stat line built from the previously-dead totalMemories / totalRooms /
 * totalWings props (with a first-run swap), then ONE terracotta primary action
 * (enter the palace) and one quiet library chip. No SVG illustration cards, no
 * floating particles, no 3D hover. Motion is a single gentle fade, disabled
 * under prefers-reduced-motion.
 */

import React, { useEffect, useState } from "react";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { T } from "@/lib/theme";
import PalaceLogo from "@/components/landing/PalaceLogo";

interface AtriumHeroProps {
  userName: string | null;
  totalMemories: number;
  totalWings: number;
  totalRooms: number;
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

function formatDate(t: (k: string) => string, locale: string): string {
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
  if (locale === "nl") {
    return `${dayNames[now.getDay()]}, ${day} ${monthNames[now.getMonth()].toLowerCase()}`;
  }
  const suffix =
    day === 1 || day === 21 || day === 31 ? "st" :
    day === 2 || day === 22 ? "nd" :
    day === 3 || day === 23 ? "rd" : "th";
  return `${dayNames[now.getDay()]}, ${monthNames[now.getMonth()]} ${day}${suffix}`;
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function AtriumHero({
  userName,
  totalMemories,
  totalWings,
  totalRooms,
  onNavigateLibrary,
  onNavigatePalace,
  isMobile,
}: AtriumHeroProps) {
  const { t, locale } = useTranslation("atrium");

  const [mounted, setMounted] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [greetingKey, setGreetingKey] = useState("welcomeToYourPalace");
  const [dateStr, setDateStr] = useState("");

  useEffect(() => {
    setReduced(prefersReducedMotion());
    setGreetingKey(getGreetingKey());
    setDateStr(formatDate(t, locale));
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, [t, locale]);

  const greeting = userName ? t(greetingKey) : t("welcomeToYourPalace");
  const isFirstRun = totalMemories <= 0;

  // "47 memories · 6 rooms · 3 wings" — the once-dead stat props, finally shown.
  const statParts = [
    `${totalMemories} ${t("memories")}`,
    `${totalRooms} ${t("rooms")}`,
    `${totalWings} ${t("wings")}`,
  ];

  const enter: React.CSSProperties = reduced
    ? { opacity: mounted ? 1 : 0, transition: "opacity 0.5s ease" }
    : {
        opacity: mounted ? 1 : 0,
        transform: mounted ? "none" : "translateY(0.75rem)",
        transition: "opacity 0.7s ease, transform 0.7s ease",
      };

  return (
    <section
      style={{
        width: "100%",
        maxWidth: "60rem",
        margin: "0 auto",
        padding: isMobile ? "0.5rem 0 0" : "1rem 0 0",
        ...enter,
      }}
      aria-label={t("heroSection")}
    >
      {/* mark + date */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
        <PalaceLogo variant="mark" color="dark" size="sm" />
        <span
          style={{
            fontFamily: T.font.body,
            fontSize: "0.8125rem",
            fontWeight: 600,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: T.color.walnut,
          }}
        >
          {dateStr}
        </span>
      </div>

      {/* greeting — solid, dignified, name in warm rust */}
      <h1
        style={{
          fontFamily: T.font.display,
          fontSize: isMobile ? "2rem" : "2.875rem",
          fontWeight: 600,
          letterSpacing: "-0.005em",
          lineHeight: 1.12,
          margin: 0,
          color: T.color.charcoal,
          textWrap: "balance",
        }}
      >
        {greeting}
        {userName ? (
          <>
            ,{" "}
            <span style={{ color: T.color.terracotta }}>{userName}</span>
          </>
        ) : null}
      </h1>

      {/* real stat line, or a warm first-run invitation */}
      <p
        style={{
          fontFamily: T.font.body,
          fontSize: isMobile ? "1.0625rem" : "1.1875rem",
          fontWeight: 400,
          color: T.color.muted,
          margin: "0.875rem 0 0",
          lineHeight: 1.5,
        }}
      >
        {isFirstRun ? (
          t("firstMemoryPrompt")
        ) : (
          statParts.map((part, i) => (
            <React.Fragment key={i}>
              {i > 0 ? <span aria-hidden="true" style={{ margin: "0 0.6rem", color: T.color.gold }}>·</span> : null}
              {part}
            </React.Fragment>
          ))
        )}
      </p>

      {/* one primary action + one quiet chip */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.875rem", marginTop: isMobile ? "1.5rem" : "1.75rem" }}>
        <button
          type="button"
          onClick={onNavigatePalace}
          className="atrium-hero-cta"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            minHeight: "3rem",
            padding: "0 1.75rem",
            borderRadius: "0.75rem",
            border: "none",
            cursor: "pointer",
            fontFamily: T.font.body,
            fontSize: "1rem",
            fontWeight: 600,
            color: T.color.linen,
            background: T.color.terracotta,
            boxShadow: `0 0.5rem 1.25rem ${T.color.terracotta}2E`,
            transition: "transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease",
          }}
          aria-label={t("enterPalace")}
        >
          {t("enterPalace")}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <button
          type="button"
          onClick={onNavigateLibrary}
          className="atrium-hero-chip"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            minHeight: "3rem",
            padding: "0 1.375rem",
            borderRadius: "0.75rem",
            border: `0.0625rem solid ${T.color.warmStone}`,
            cursor: "pointer",
            fontFamily: T.font.body,
            fontSize: "1rem",
            fontWeight: 600,
            color: T.color.charcoal,
            background: "transparent",
            transition: "background 0.2s ease, border-color 0.2s ease",
          }}
          aria-label={t("openLibrary")}
        >
          {t("yourLibrary")}
        </button>
      </div>

      <style>{`
        .atrium-hero-cta:hover { filter: brightness(1.05); transform: translateY(-0.0625rem); box-shadow: 0 0.75rem 1.5rem ${T.color.terracotta}3A; }
        .atrium-hero-cta:active { transform: translateY(0); }
        .atrium-hero-chip:hover { background: ${T.color.warmStone}55; border-color: ${T.color.terracotta}; }
        .atrium-hero-cta:focus-visible, .atrium-hero-chip:focus-visible { outline: 0.1875rem solid ${T.color.terracotta}; outline-offset: 0.1875rem; }
        @media (prefers-reduced-motion: reduce) {
          .atrium-hero-cta, .atrium-hero-chip { transition: none !important; }
          .atrium-hero-cta:hover, .atrium-hero-cta:active { transform: none !important; }
        }
      `}</style>
    </section>
  );
}
