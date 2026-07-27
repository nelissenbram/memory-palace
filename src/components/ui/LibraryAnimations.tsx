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
        box-shadow: 0 0.5rem 1.5rem rgba(64,59,54, 0.1);
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
  /** memory count in the current scope — shown inline in the title bar */
  count?: number;
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
  count,
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
              color: "#716A5E",
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
                color: "#403B36",
                margin: 0,
                letterSpacing: "0.01em",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                animation: "libSlideRight 0.4s cubic-bezier(0.22, 1, 0.36, 1) 0.05s both",
              }}
            >
              {roomName ? <><span style={{ fontWeight: 500, color: "#716A5E", fontSize: "0.875rem", marginRight: "0.25rem" }}>{t("room")}</span>{roomName}</> : wingName}
              {count !== undefined && count > 0 && <span style={{ fontFamily: T.font.body, fontWeight: 600, fontSize: "0.8125rem", color: "#716A5E", marginLeft: "0.5rem", fontVariantNumeric: "tabular-nums" }}>· {count}</span>}
            </h2>

            {/* Breadcrumb or description */}
            <p
              style={{
                fontFamily: T.font.body,
                fontSize: "0.75rem",
                color: "#716A5E",
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


function EngravedScene({ type }: { type: "wing" | "room" | "search" }) {
  const INK = "#C9BCA0";
  const GILT = "#D4AF37";
  return (
    <svg width="88" height="72" viewBox="0 0 88 72" fill="none" aria-hidden="true" style={{ display: "block" }}>
      <path d="M6 60h76M10 66h68" stroke={INK} strokeWidth="0.75" opacity="0.5" />
      {type === "search" ? (
        <>
          <circle cx="38" cy="30" r="16" fill="#FCFAF5" stroke={INK} strokeWidth="1.6" />
          <path d="M50 42l12 12" stroke={INK} strokeWidth="2" strokeLinecap="round" />
          <path d="M30 26h16M30 32h11" stroke={INK} strokeWidth="1" opacity="0.6" />
          <path d="M60 6l1.4 3.6L65 11l-3.6 1.4L60 16l-1.4-3.6L55 11l3.6-1.4z" fill={GILT} opacity="0.85" />
        </>
      ) : (
        <>
          <rect x="10" y="16" width="20" height="26" rx="1" fill="#FCFAF5" stroke={INK} strokeWidth="1.2" transform="rotate(-4 20 29)" />
          <rect x="58" y="16" width="20" height="26" rx="1" fill="#FCFAF5" stroke={INK} strokeWidth="1.2" transform="rotate(4 68 29)" />
          <rect x="32" y="12" width="24" height="30" rx="1.5" fill="#FCFAF5" stroke={GILT} strokeWidth="1.6" />
          <path d="M37 30l4-4 3 2.5 4-4.5" stroke={INK} strokeWidth="1" opacity="0.55" fill="none" />
          <circle cx="40" cy="21" r="2" fill={INK} opacity="0.4" />
          <path d="M44 8l1.2 3L48 12l-2.8 1L44 16l-1.2-3L40 12l2.8-1z" fill={GILT} opacity="0.9" />
        </>
      )}
    </svg>
  );
}

export function LibraryEmptyState({ type, accent, onAdd, query }: LibraryEmptyStateProps) {
  const isMobile = useIsMobile();
  const { t } = useTranslation("library");
  void accent;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: isMobile ? "2.5rem 1.25rem" : "4rem 1rem", gap: "0.85rem", position: "relative", animation: "libFadeIn 0.4s ease both" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 38%, rgba(212,175,55,0.07) 0%, transparent 68%)", pointerEvents: "none" }} />
      <div style={{ position: "relative", zIndex: 1, marginBottom: "0.35rem" }}>
        <EngravedScene type={type} />
      </div>
      <span style={{ fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#716A5E", position: "relative", zIndex: 1 }}>
        {type === "wing" ? t("emptyWingOverline") : type === "room" ? t("emptyRoomOverline") : t("emptySearchOverline")}
      </span>
      <p style={{ fontFamily: T.font.display, fontSize: "1.1875rem", fontWeight: 600, lineHeight: 1.15, color: "#403B36", textAlign: "center", margin: 0, position: "relative", zIndex: 1, animation: "libSlideUp 0.5s ease 0.1s both" }}>
        {type === "wing" ? t("emptyWingTitle") : type === "room" ? t("emptyRoomAnimatedTitle") : t("emptySearchTitle", { query: query || "" })}
      </p>
      <p style={{ fontFamily: T.font.body, fontSize: "0.9375rem", color: "#716A5E", textAlign: "center", margin: 0, maxWidth: "24rem", lineHeight: 1.4, position: "relative", zIndex: 1, animation: "libSlideUp 0.5s ease 0.2s both" }}>
        {type === "wing" ? t("emptyWingSubtitle") : type === "room" ? t("emptyRoomSubtitle") : t("emptySearchSubtitle")}
      </p>
      {type !== "search" && onAdd && (
        <button
          onClick={onAdd}
          className="lib-empty-cta"
          style={{ marginTop: "0.35rem", padding: "0.7rem 1.6rem", borderRadius: "0.75rem", background: "#B85C38", color: "#FCFAF5", border: "none", cursor: "pointer", fontFamily: T.font.display, fontSize: "0.9375rem", fontWeight: 600, position: "relative", zIndex: 1, transition: "transform 0.2s ease, box-shadow 0.2s ease", boxShadow: "0 0.25rem 1rem rgba(64,59,54,0.07)", animation: "libSlideUp 0.5s ease 0.3s both" }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-0.1875rem)"; e.currentTarget.style.boxShadow = "0 0.5rem 1.5rem rgba(64,59,54,0.14)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 0.25rem 1rem rgba(64,59,54,0.07)"; }}
        >
          {type === "room" ? t("emptyRoomAnimatedCta") : t("addFirst")}
        </button>
      )}
      <style>{`
        .lib-empty-cta:focus-visible { outline: 0.1875rem solid #D4AF37; outline-offset: 0.1875rem; }
        @media (prefers-reduced-motion: reduce) { .lib-empty-cta { transition: none !important; } }
      `}</style>
    </div>
  );
}
