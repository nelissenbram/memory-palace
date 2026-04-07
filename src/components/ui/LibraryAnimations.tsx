"use client";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { WingIcon } from "./WingRoomIcons";

/* ═══════════════════════════════════════════════════════════════════════
   LibraryStyles — CSS keyframes + utility classes injected via <style>
   ═══════════════════════════════════════════════════════════════════════ */

export function LibraryStyles() {
  return (
    <style>{`
      /* ── Keyframe Animations ── */

      @keyframes libFadeIn {
        from { opacity: 0; }
        to   { opacity: 1; }
      }

      @keyframes libSlideUp {
        from { opacity: 0; transform: translateY(1.25rem); }
        to   { opacity: 1; transform: translateY(0); }
      }

      @keyframes libSlideRight {
        from { opacity: 0; transform: translateX(-1.25rem); }
        to   { opacity: 1; transform: translateX(0); }
      }

      @keyframes libSlideDown {
        from { opacity: 0; transform: translateY(-0.625rem); }
        to   { opacity: 1; transform: translateY(0); }
      }

      @keyframes libScaleIn {
        from { opacity: 0; transform: scale(0.95); }
        to   { opacity: 1; transform: scale(1); }
      }

      @keyframes libCardEnter {
        from { opacity: 0; transform: scale(0.97) translateY(0.5rem); }
        to   { opacity: 1; transform: scale(1) translateY(0); }
      }

      @keyframes libPulseGlow {
        0%, 100% { box-shadow: 0 0 0 0 rgba(212, 175, 55, 0); }
        50%      { box-shadow: 0 0 1rem 0.125rem rgba(212, 175, 55, 0.15); }
      }

      @keyframes libShimmer {
        0%   { background-position: -30rem 0; }
        100% { background-position: 30rem 0; }
      }

      @keyframes libFloat {
        0%, 100% { transform: translateY(0); }
        50%      { transform: translateY(-0.5rem); }
      }

      @keyframes libBorderGlow {
        0%   { border-color: rgba(212, 175, 55, 0.2); }
        33%  { border-color: rgba(193, 127, 89, 0.25); }
        66%  { border-color: rgba(74, 103, 65, 0.2); }
        100% { border-color: rgba(212, 175, 55, 0.2); }
      }

      @keyframes libCountUp {
        from { opacity: 0; transform: translateY(100%); }
        to   { opacity: 1; transform: translateY(0); }
      }

      @keyframes libWingSwitch {
        0%   { opacity: 1; transform: translateX(0); }
        40%  { opacity: 0; transform: translateX(-1.5rem); }
        60%  { opacity: 0; transform: translateX(1.5rem); }
        100% { opacity: 1; transform: translateX(0); }
      }

      /* ── Utility Classes ── */

      .lib-card-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
        gap: 0.75rem;
      }

      .lib-card-grid-mobile {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 0.75rem;
      }

      .lib-stagger-1 { animation-delay: 0.05s; }
      .lib-stagger-2 { animation-delay: 0.1s;  }
      .lib-stagger-3 { animation-delay: 0.15s; }
      .lib-stagger-4 { animation-delay: 0.2s;  }
      .lib-stagger-5 { animation-delay: 0.25s; }
      .lib-stagger-6 { animation-delay: 0.3s;  }
      .lib-stagger-7 { animation-delay: 0.35s; }
      .lib-stagger-8 { animation-delay: 0.4s;  }

      .lib-hover-lift {
        transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1),
                    box-shadow 0.25s cubic-bezier(0.22, 1, 0.36, 1);
      }
      .lib-hover-lift:hover {
        transform: translateY(-0.25rem);
        box-shadow: 0 0.5rem 1.5rem rgba(44, 44, 42, 0.1);
      }

      .lib-scrollbar-hide {
        scrollbar-width: none;
        -ms-overflow-style: none;
      }
      .lib-scrollbar-hide::-webkit-scrollbar {
        display: none;
      }

      /* P2 #13: Accessibility — focus styles for all interactive elements */
      button:focus-visible,
      a:focus-visible,
      input:focus-visible,
      select:focus-visible,
      [role="button"]:focus-visible {
        outline: 0.125rem solid #D4AF37;
        outline-offset: 0.0625rem;
        box-shadow: 0 0 0 0.1875rem rgba(212, 175, 55, 0.2);
      }
    `}</style>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   LibraryHeader — elegant animated header for the Library content area
   ═══════════════════════════════════════════════════════════════════════ */

export interface LibraryHeaderProps {
  wingIcon: string;
  wingId?: string;
  wingName: string;
  wingDesc?: string;
  roomName?: string;
  accent: string;
  onBack?: () => void;
  onAdd?: () => void;
  isMobile: boolean;
}

export function LibraryHeader({
  wingIcon,
  wingId,
  wingName,
  wingDesc,
  roomName,
  accent,
  onBack,
  onAdd,
  isMobile,
}: LibraryHeaderProps) {
  const { t } = useTranslation("library");

  return (
    <header
      style={{
        padding: isMobile ? "0.5rem 0.75rem" : "1rem 1.5rem",
        display: "flex",
        flexDirection: "column",
        gap: 0,
        background: "rgba(255, 255, 255, 0.85)",
        backdropFilter: "blur(0.75rem)",
        WebkitBackdropFilter: "blur(0.75rem)",
        flexShrink: 0,
        position: "relative",
        overflow: "hidden",
        animation: "libFadeIn 0.3s ease both",
      }}
    >
      {/* Main row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          minHeight: isMobile ? "2rem" : "2.5rem",
        }}
      >
        {/* Back button */}
        {roomName && onBack && (
          <button
            onClick={onBack}
            style={{
              width: "2rem",
              height: "2rem",
              borderRadius: "50%",
              border: `1px solid ${T.color.cream}`,
              background: T.color.white,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.875rem",
              color: T.color.walnut,
              flexShrink: 0,
              transition: "all 0.2s cubic-bezier(0.22, 1, 0.36, 1)",
              animation: "libSlideRight 0.3s ease both",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = T.color.warmStone;
              e.currentTarget.style.borderColor = T.color.sandstone;
              e.currentTarget.style.transform = "scale(1.05)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = T.color.white;
              e.currentTarget.style.borderColor = T.color.cream;
              e.currentTarget.style.transform = "scale(1)";
            }}
            aria-label={t("headerBack")}
          >
            {"\u2190"}
          </button>
        )}

        {/* Icon + Name block */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            flex: 1,
            minWidth: 0,
            animation: "libSlideRight 0.35s cubic-bezier(0.22, 1, 0.36, 1) both",
          }}
        >
          <span
            style={{
              lineHeight: 1,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              animation: "libScaleIn 0.4s cubic-bezier(0.22, 1, 0.36, 1) 0.1s both",
            }}
          >
            {wingId ? <WingIcon wingId={wingId} size={24} color={accent} /> : wingIcon}
          </span>

          <div style={{ minWidth: 0, overflow: "hidden" }}>
            <h2
              style={{
                fontFamily: T.font.display,
                fontSize: isMobile ? "1rem" : "1.25rem",
                fontWeight: 600,
                color: T.color.charcoal,
                margin: 0,
                letterSpacing: "0.01em",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                animation: "libSlideRight 0.4s cubic-bezier(0.22, 1, 0.36, 1) 0.05s both",
              }}
            >
              {roomName ? <><span style={{ fontWeight: 400, color: T.color.muted, fontSize: "0.875rem", marginRight: "0.25rem" }}>{t("room")}</span>{roomName}</> : wingName}
            </h2>

            {/* Breadcrumb or description */}
            <p
              style={{
                fontFamily: T.font.body,
                fontSize: "0.75rem",
                color: T.color.muted,
                margin: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                animation: "libFadeIn 0.5s ease 0.15s both",
              }}
            >
              {roomName
                ? (
                  <>
                    {wingId ? <WingIcon wingId={wingId} size={12} color={accent} /> : wingIcon}
                    {" "}{wingName} {"\u203A"} {roomName}
                  </>
                )
                : wingDesc || ""}
            </p>
          </div>
        </div>

      </div>

      {/* Decorative gradient border */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "0.125rem",
          background: `linear-gradient(to right, ${accent}, ${accent}40, transparent)`,
          animation: "libFadeIn 0.6s ease 0.2s both",
        }}
      />
    </header>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   LibraryEmptyState — beautiful animated empty states
   ═══════════════════════════════════════════════════════════════════════ */

export interface LibraryEmptyStateProps {
  type: "wing" | "room" | "search";
  accent: string;
  onAdd?: () => void;
  query?: string;
}

const WING_ICONS = ["\uD83D\uDDBC\uFE0F", "\uD83C\uDFAC", "\uD83C\uDF99\uFE0F", "\uD83D\uDCDC"];
const ROOM_ICONS = ["\uD83D\uDCF7", "\uD83C\uDFB5", "\uD83D\uDD2E"];

export function LibraryEmptyState({ type, accent, onAdd, query }: LibraryEmptyStateProps) {
  const isMobile = useIsMobile();
  const { t } = useTranslation("library");

  const icons = type === "wing" ? WING_ICONS : type === "room" ? ROOM_ICONS : [];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: isMobile ? "2rem 1rem" : "4rem 1rem",
        gap: "1rem",
        position: "relative",
        animation: "libFadeIn 0.4s ease both",
      }}
    >
      {/* Subtle radial glow behind empty state */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at 50% 40%, ${accent}08 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      {/* P2 #7: Animated SVG illustration for room empty state */}
      {type === "room" && (
        <div
          style={{
            position: "relative",
            zIndex: 1,
            marginBottom: "0.5rem",
          }}
        >
          <svg width="5rem" height="5rem" viewBox="0 0 80 80" fill="none" style={{ animation: "libFloat 4s ease-in-out infinite" }}>
            <rect x="15" y="20" width="50" height="40" rx="4" stroke={accent} strokeWidth="1.5" strokeDasharray="4 3" opacity="0.4" />
            <path d="M30 40 L40 32 L50 40" stroke={accent} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
            <circle cx="35" cy="35" r="3" fill={accent} opacity="0.3" />
            <line x1="25" y1="50" x2="55" y2="50" stroke={accent} strokeWidth="1" opacity="0.2" />
            <line x1="28" y1="54" x2="52" y2="54" stroke={accent} strokeWidth="1" opacity="0.15" />
          </svg>
        </div>
      )}

      {/* Floating icons (wing / room — only for wing type now) */}
      {type === "wing" && (
        <div
          style={{
            display: "flex",
            gap: "1.5rem",
            marginBottom: "0.5rem",
            position: "relative",
            zIndex: 1,
          }}
        >
          {icons.map((icon, i) => (
            <span
              key={i}
              style={{
                fontSize: "2rem",
                opacity: 0.35,
                animation: `libFloat 3s ease-in-out ${i * 0.4}s infinite, libFadeIn 0.5s ease ${i * 0.1}s both`,
              }}
            >
              {icon}
            </span>
          ))}
        </div>
      )}

      {/* Search icon for search variant */}
      {type === "search" && (
        <span
          style={{
            fontSize: "2.5rem",
            opacity: 0.3,
            animation: "libScaleIn 0.4s cubic-bezier(0.22, 1, 0.36, 1) both",
            position: "relative",
            zIndex: 1,
          }}
        >
          {"\uD83D\uDD0D"}
        </span>
      )}

      {/* Main text */}
      <p
        style={{
          fontFamily: T.font.display,
          fontSize: "1.125rem",
          fontWeight: 500,
          color: T.color.charcoal,
          textAlign: "center",
          margin: 0,
          position: "relative",
          zIndex: 1,
          animation: "libSlideUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.1s both",
        }}
      >
        {type === "wing"
          ? t("emptyWingTitle")
          : type === "room"
            ? t("emptyRoomAnimatedTitle")
            : t("emptySearchTitle", { query: query || "" })}
      </p>

      {/* Subtitle */}
      <p
        style={{
          fontFamily: T.font.body,
          fontSize: "0.875rem",
          color: T.color.muted,
          textAlign: "center",
          margin: 0,
          maxWidth: "22rem",
          lineHeight: 1.5,
          position: "relative",
          zIndex: 1,
          animation: "libSlideUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.2s both",
        }}
      >
        {type === "wing"
          ? t("emptyWingSubtitle")
          : type === "room"
            ? t("emptyRoomSubtitle")
            : t("emptySearchSubtitle")}
      </p>

      {/* CTA button — enhanced for room with animation */}
      {type !== "search" && onAdd && (
        <button
          onClick={onAdd}
          style={{
            padding: "0.625rem 1.5rem",
            borderRadius: "0.5rem",
            background: accent,
            color: T.color.white,
            border: "none",
            cursor: "pointer",
            fontFamily: T.font.display,
            fontSize: "0.9375rem",
            fontWeight: 500,
            letterSpacing: "0.02em",
            position: "relative",
            zIndex: 1,
            transition: "all 0.25s cubic-bezier(0.22, 1, 0.36, 1)",
            boxShadow: `0 0.25rem 1rem ${accent}30`,
            animation: "libSlideUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.3s both",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-0.125rem)";
            e.currentTarget.style.boxShadow = `0 0.375rem 1.25rem ${accent}45`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = `0 0.25rem 1rem ${accent}30`;
          }}
        >
          {type === "room" ? t("emptyRoomAnimatedCta") : t("addFirst")}
        </button>
      )}
    </div>
  );
}
