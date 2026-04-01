"use client";

import React, { useMemo } from "react";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { T } from "@/lib/theme";

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

export default function AtriumHero({
  userName,
  totalMemories,
  totalWings,
  totalRooms,
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

  return (
    <>
      <style>{`
        @keyframes atriumFadeIn {
          from { opacity: 0; transform: translateY(0.625rem); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes atriumFloat {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-0.375rem); }
        }
        @keyframes atriumGlow {
          0%, 100% { box-shadow: 0 0 1.5rem 0.5rem rgba(212,175,55,0.12); }
          50%      { box-shadow: 0 0 2.5rem 1rem rgba(212,175,55,0.22); }
        }
        @keyframes atriumShimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
      `}</style>

      <section
        style={{
          animation: "atriumFadeIn 0.6s ease both",
          width: "100%",
          maxWidth: "56rem",
          margin: "0 auto",
          padding: isMobile ? "1.5rem 1rem" : "2.5rem 2rem",
        }}
        aria-label={t("heroSection")}
      >
        {/* ─── Greeting & Date ─── */}
        <div style={{ textAlign: "center", marginBottom: isMobile ? "2rem" : "2.5rem" }}>
          <h1
            style={{
              fontFamily: T.font.display,
              fontSize: isMobile ? "1.75rem" : "2.5rem",
              fontWeight: 300,
              letterSpacing: "0.04em",
              color: T.color.charcoal,
              margin: 0,
              lineHeight: 1.25,
            }}
          >
            {greeting}
          </h1>

          <p
            style={{
              fontFamily: T.font.body,
              fontSize: "0.875rem",
              color: T.color.muted,
              margin: "0.5rem 0 0",
            }}
          >
            {dateStr}
          </p>

          <p
            style={{
              fontFamily: T.font.display,
              fontSize: "0.8125rem",
              fontStyle: "italic",
              color: T.color.muted,
              margin: "0.375rem 0 0",
              opacity: 0.85,
            }}
          >
            {t("tagline")}
          </p>

          {/* Gold gradient line */}
          <div
            style={{
              margin: "1.25rem auto 0",
              width: isMobile ? "6rem" : "8rem",
              height: "0.0625rem",
              background: `linear-gradient(90deg, transparent, ${T.color.gold}, transparent)`,
            }}
            aria-hidden="true"
          />
        </div>

        {/* ─── Navigation Cards ─── */}
        <div
          style={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            gap: "1.5rem",
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
              minHeight: isMobile ? "12rem" : "16rem",
              borderRadius: "1rem",
              border: "none",
              padding: "2rem",
              cursor: "pointer",
              textAlign: "left",
              position: "relative",
              overflow: "hidden",
              background: `linear-gradient(145deg, ${T.color.linen}, ${T.color.warmStone})`,
              borderLeft: libHover ? `0.25rem solid ${T.color.terracotta}` : "0.25rem solid transparent",
              boxShadow: libHover
                ? `0 1rem 2.5rem rgba(0,0,0,0.12), 0 0.25rem 0.75rem rgba(0,0,0,0.06)`
                : `0 0.25rem 1rem rgba(0,0,0,0.06)`,
              transform: libHover ? "translateY(-0.25rem)" : "translateY(0)",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              animation: "atriumFadeIn 0.6s ease both 0.15s",
            }}
            aria-label={t("openLibrary")}
          >
            {/* Icon composition */}
            <div style={{ marginBottom: "1rem", position: "relative", height: "3.5rem" }}>
              <span
                style={{ fontSize: "3rem", lineHeight: 1 }}
                role="img"
                aria-hidden="true"
              >
                📚
              </span>
              <span
                style={{
                  position: "absolute",
                  top: "-0.25rem",
                  left: "3.25rem",
                  fontSize: "1.25rem",
                  animation: "atriumFloat 3s ease infinite",
                }}
                aria-hidden="true"
              >
                🖼️
              </span>
              <span
                style={{
                  position: "absolute",
                  top: "1.5rem",
                  left: "4rem",
                  fontSize: "1rem",
                  animation: "atriumFloat 3s ease infinite 0.5s",
                }}
                aria-hidden="true"
              >
                🎬
              </span>
              <span
                style={{
                  position: "absolute",
                  top: "0.5rem",
                  left: "5rem",
                  fontSize: "1.125rem",
                  animation: "atriumFloat 3s ease infinite 1s",
                }}
                aria-hidden="true"
              >
                📖
              </span>
            </div>

            <h2
              style={{
                fontFamily: T.font.display,
                fontSize: "1.5rem",
                fontWeight: 600,
                color: T.color.charcoal,
                margin: "0 0 0.375rem",
              }}
            >
              {t("yourLibrary")}
            </h2>

            <p
              style={{
                fontFamily: T.font.body,
                fontSize: "0.875rem",
                color: T.color.muted,
                margin: "0 0 1rem",
                lineHeight: 1.5,
              }}
            >
              {t("librarySubtitle")}
            </p>

            <p
              style={{
                fontFamily: T.font.body,
                fontSize: "0.8125rem",
                color: T.color.charcoal,
                margin: "0 0 1.25rem",
              }}
            >
              <span style={{ color: T.color.gold, fontWeight: 600 }}>{totalMemories}</span>
              {" "}{t("memoriesAcross")}{" "}
              <span style={{ color: T.color.gold, fontWeight: 600 }}>{totalWings}</span>
              {" "}{t("wings")}
            </p>

            <span
              style={{
                display: "inline-block",
                fontFamily: T.font.body,
                fontSize: "0.875rem",
                fontWeight: 600,
                color: T.color.linen,
                background: T.color.terracotta,
                padding: "0.5rem 1.25rem",
                borderRadius: "0.5rem",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                opacity: libHover ? 1 : 0.9,
              }}
            >
              {t("openLibrary")} →
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
              minHeight: isMobile ? "12rem" : "16rem",
              borderRadius: "1rem",
              border: palHover
                ? `0.125rem solid ${T.color.gold}`
                : `0.125rem solid rgba(212,175,55,0.25)`,
              padding: "2rem",
              cursor: "pointer",
              textAlign: "left",
              position: "relative",
              overflow: "hidden",
              background: `linear-gradient(145deg, ${T.color.charcoal}, #3D362E)`,
              boxShadow: palHover
                ? `0 1rem 2.5rem rgba(0,0,0,0.25), 0 0.25rem 0.75rem rgba(0,0,0,0.12)`
                : `0 0.25rem 1rem rgba(0,0,0,0.1)`,
              transform: palHover ? "translateY(-0.25rem)" : "translateY(0)",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              animation: "atriumFadeIn 0.6s ease both 0.3s",
              ...(palHover
                ? {
                    backgroundImage: `linear-gradient(145deg, ${T.color.charcoal}, #3D362E), linear-gradient(90deg, transparent, ${T.color.gold}, transparent)`,
                    backgroundSize: "100% 100%, 200% 100%",
                    backgroundClip: "padding-box, border-box",
                  }
                : {}),
            }}
            aria-label={t("enterPalace")}
          >
            {/* Radial glow behind icon */}
            <div
              style={{
                position: "absolute",
                top: "1.25rem",
                left: "1.25rem",
                width: "5rem",
                height: "5rem",
                borderRadius: "50%",
                background: `radial-gradient(circle, rgba(212,175,55,${palHover ? 0.2 : 0.1}) 0%, transparent 70%)`,
                animation: "atriumGlow 2s ease infinite",
                pointerEvents: "none",
              }}
              aria-hidden="true"
            />

            {/* Icon */}
            <div style={{ marginBottom: "1rem", position: "relative", height: "3.5rem" }}>
              <span
                style={{ fontSize: "3rem", lineHeight: 1, position: "relative", zIndex: 1 }}
                role="img"
                aria-hidden="true"
              >
                🏛️
              </span>
            </div>

            <h2
              style={{
                fontFamily: T.font.display,
                fontSize: "1.5rem",
                fontWeight: 600,
                color: T.color.linen,
                margin: "0 0 0.375rem",
              }}
            >
              {t("threeDPalace")}
            </h2>

            <p
              style={{
                fontFamily: T.font.body,
                fontSize: "0.875rem",
                color: "rgba(250,250,247,0.55)",
                margin: "0 0 1rem",
                lineHeight: 1.5,
              }}
            >
              {t("palaceSubtitle")}
            </p>

            <p
              style={{
                fontFamily: T.font.body,
                fontSize: "0.8125rem",
                color: "rgba(250,250,247,0.7)",
                margin: "0 0 1.25rem",
              }}
            >
              <span style={{ color: T.color.gold, fontWeight: 600 }}>{totalWings}</span>
              {" "}{t("wings")} · {" "}
              <span style={{ color: T.color.gold, fontWeight: 600 }}>{totalRooms}</span>
              {" "}{t("roomsToExplore")}
            </p>

            <span
              style={{
                display: "inline-block",
                fontFamily: T.font.body,
                fontSize: "0.875rem",
                fontWeight: 600,
                color: T.color.gold,
                background: "transparent",
                border: `0.125rem solid ${T.color.gold}`,
                padding: "0.5rem 1.25rem",
                borderRadius: "0.5rem",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                ...(palHover
                  ? {
                      backgroundImage: `linear-gradient(90deg, transparent, rgba(212,175,55,0.15), transparent)`,
                      backgroundSize: "200% 100%",
                      animation: "atriumShimmer 1.5s ease infinite",
                    }
                  : {}),
              }}
            >
              {t("enterPalace")} →
            </span>
          </button>
        </div>
      </section>
    </>
  );
}
