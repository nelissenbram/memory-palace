"use client";

import React, { useState, useRef, useTransition } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import TuscanCard, { TuscanSectionHeader } from "@/components/ui/TuscanCard";
import { useRouter } from "next/navigation";
import { searchPalaces } from "@/lib/social/directory-actions";
import type { DirectoryPalace } from "@/lib/social/directory-actions";
import NavigationBar from "@/components/ui/NavigationBar";
import { useIsMobile, useIsCompact } from "@/lib/hooks/useIsMobile";
// Note: do NOT import usePalaceStore — Explore is outside the (app) layout group
import { EASE } from "@/components/ui/TuscanStyles";
import NudgeProvider from "@/components/ui/NudgeTooltip";

/* ── Types ─────────────────────────────────────────── */

interface FollowingPalace extends DirectoryPalace {
  latest_published_at: string | null;
}

interface ExplorePageClientProps {
  featured: DirectoryPalace[];
  trending: DirectoryPalace[];
  newest: DirectoryPalace[];
  following?: FollowingPalace[];
  isAuthenticated?: boolean;
}

/* ── Helpers ───────────────────────────────────────── */

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/* ── Main Component ────────────────────────────────── */

export default function ExplorePageClient({
  featured,
  trending,
  newest,
  following = [],
  isAuthenticated = false,
}: ExplorePageClientProps) {
  const { t } = useTranslation("social");
  const router = useRouter();
  const isMobile = useIsMobile();
  // iPad portrait (768–1024px) gets the desktop 3-up value-prop grid, which is
  // tight at the low end; stack to single column on compact like phones do.
  const isCompact = useIsCompact();
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<DirectoryPalace[] | null>(null);
  const [activeTab, setActiveTab] = useState<"discover" | "following">("discover");
  const [, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [searchFocused, setSearchFocused] = useState(false);

  const handleSearch = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 2) { setSearchResults(null); return; }
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const results = await searchPalaces(value.trim());
        setSearchResults(results);
      });
    }, 300);
  };

  const navigateToProfile = (palace: DirectoryPalace) => {
    router.push(`/visit/${palace.user_id}`);
  };

  // Navigate to app modes via full page navigation (not soft nav)
  // to avoid conflicts with MemoryPalace's history management
  const handleModeChange = (mode: "atrium" | "library" | "3d") => {
    window.location.replace(mode === "3d" ? "/palace" : `/${mode}`);
  };

  const hasContent = featured.length > 0 || trending.length > 0 || newest.length > 0;

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: `linear-gradient(165deg, ${T.color.linen} 0%, ${T.color.warmStone} 50%, ${T.color.sandstone}40 100%)`,
        // On iPad portrait (compact) the nav drops to the bottom bar like mobile, so reserve
        // bottom space (not top) — otherwise the top nav's 3.5rem becomes dead whitespace.
        paddingTop: isAuthenticated && !isMobile && !isCompact
          ? "3.5rem"
          : "env(safe-area-inset-top, 0px)",
        paddingBottom: isAuthenticated && (isMobile || isCompact)
          ? "calc(3.5rem + env(safe-area-inset-bottom, 0px))"
          : "max(2rem, env(safe-area-inset-bottom, 0px))",
      }}
    >
      {isAuthenticated && !isMobile && (
        <NavigationBar
          currentMode={"atrium"}
          onModeChange={handleModeChange}
          onNotifications={() => router.push("/palace?notifications=1")}
          isMobile={false}
          activeTab="explore"
        />
      )}

      <div style={{ maxWidth: "60rem", margin: "0 auto", padding: "0 1rem" }}>

        {/* ── Hero: one line of ink, content directly below ── */}
        <div
          style={{
            padding: isMobile ? "1.25rem 0 0.75rem" : "1.5rem 0 1rem",
            textAlign: "center",
          }}
        >
          <h1 style={{
            fontFamily: T.font.display, fontSize: isMobile ? "1.75rem" : "2.25rem",
            fontWeight: 600, color: "#403B36", margin: "0 0 0.5rem",
            letterSpacing: "0.01em",
          }}>
            {t("exploreTitle")}
          </h1>
          <p style={{
            fontFamily: T.font.body, fontSize: "1rem",
            color: "#716A5E", margin: "0 auto", maxWidth: "28rem",
            lineHeight: 1.5,
          }}>
            {t("exploreSubtitle")}
          </p>
        </div>

        {/* ── Search Bar ──────────────────────────────────── */}
        <div data-nudge="explore_search" style={{
          maxWidth: "32rem", margin: "0 auto 1.75rem",
        }}>
          <div style={{
            position: "relative",
            borderRadius: "0.875rem",
            border: `1.5px solid ${searchFocused ? T.color.gold : T.color.sandstone}`,
            background: T.color.cream,
            boxShadow: searchFocused
              ? `0 0 0 3px ${T.color.gold}15, 0 2px 8px rgba(0,0,0,0.06)`
              : "0 1px 4px rgba(0,0,0,0.04)",
            transition: `border-color 0.3s ${EASE}, box-shadow 0.3s ${EASE}`,
            display: "flex", alignItems: "center", gap: "0.75rem",
            padding: "0 1rem",
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={searchFocused ? T.color.gold : T.color.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transition: "stroke 0.3s" }}>
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder={t("searchPalaces")}
              aria-label={t("searchPalaces")}
              style={{
                flex: 1, fontFamily: T.font.body, fontSize: "0.9375rem",
                padding: "0.75rem 0", border: "none", background: "transparent",
                color: T.color.charcoal, outline: "none",
              }}
            />
            {query && (
              <button
                onClick={() => { setQuery(""); setSearchResults(null); }}
                aria-label="Clear"
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: T.color.muted, padding: "0.25rem", flexShrink: 0,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            )}
          </div>
        </div>

        {/* ── Quiet utility door: publishing lives on /settings/sharing ── */}
        {isAuthenticated && searchResults === null && (
          <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
            <button
              onClick={() => router.push("/settings/sharing")}
              style={{
                display: "inline-flex", alignItems: "center", gap: "0.5rem",
                fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: 600,
                minHeight: "2.75rem", padding: "0 1.25rem", borderRadius: "2rem",
                border: `0.0625rem solid ${T.color.warmStone}`,
                background: "transparent",
                color: "#716A5E", cursor: "pointer",
                transition: "border-color 0.2s ease, color 0.2s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#B85C38"; e.currentTarget.style.color = "#B85C38"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.color.warmStone; e.currentTarget.style.color = "#716A5E"; }}
            >
              {t("publishYourPalace")} {"→"}
            </button>
          </div>
        )}

        {/* ── Search Results ──────────────────────────────── */}
        {searchResults !== null ? (
          <section style={{}}>
            <TuscanSectionHeader
              badge={<span style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.muted }}>{searchResults.length}</span>}
            >
              {t("searchResults")}
            </TuscanSectionHeader>
            {searchResults.length === 0 ? (
              <EmptyState text={t("noResults")} />
            ) : (
              <PalaceGrid palaces={searchResults} onPalaceClick={navigateToProfile} />
            )}
          </section>
        ) : (
          <>
            {/* ── Tabs: Discover / Following ──────────────── */}
            {isAuthenticated && (
              <div data-nudge="explore_tabs" style={{
                display: "flex", gap: "0.25rem", marginBottom: "1.75rem",
                background: `${T.color.sandstone}40`, borderRadius: "0.75rem",
                padding: "0.25rem", maxWidth: "20rem", margin: "0 auto 1.75rem",
              }}>
                {(["discover", "following"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      flex: 1, fontFamily: T.font.body, fontSize: "0.875rem",
                      fontWeight: activeTab === tab ? 600 : 400,
                      padding: "0.625rem 1rem", borderRadius: "0.5rem",
                      border: "none", cursor: "pointer",
                      background: activeTab === tab ? T.color.cream : "transparent",
                      color: activeTab === tab ? T.color.charcoal : T.color.walnut,
                      boxShadow: activeTab === tab ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                      transition: `all 0.25s ${EASE}`,
                    }}
                  >
                    {tab === "discover" ? t("exploreDiscover") : t("exploreFollowing")}
                    {tab === "following" && (
                      <span style={{
                        marginLeft: "0.375rem", fontSize: "0.75rem",
                        background: `${T.color.gold}20`, color: T.color.goldDark,
                        padding: "0.0625rem 0.375rem", borderRadius: "0.75rem",
                      }}>
                        {following.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* ── Following Tab ──────────────────────────── */}
            {activeTab === "following" ? (
              <section style={{}}>
                <TuscanSectionHeader>{t("exploreFollowingTitle")}</TuscanSectionHeader>
                {following.length > 0 ? (
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? "100%" : "18rem"}, 1fr))`,
                    gap: "0.875rem",
                  }}>
                    {following.map((p) => (
                      <FollowingCard key={p.user_id} palace={p} onClick={() => navigateToProfile(p)} />
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
                    <div style={{
                      width: "3rem", height: "3rem", margin: "0 auto 1rem",
                      borderRadius: "50%",
                      background: `${T.color.gold}15`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={T.color.gold} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                    </div>
                    <p style={{ fontFamily: T.font.display, fontSize: "1.125rem", color: T.color.charcoal, margin: "0 0 0.5rem" }}>
                      {t("exploreFollowEmpty")}
                    </p>
                    <button
                      onClick={() => setActiveTab("discover")}
                      style={{
                        fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: 600,
                        color: T.color.goldDark, background: `${T.color.gold}15`,
                        border: "none", borderRadius: "1rem", padding: "0.5rem 1.25rem",
                        cursor: "pointer", transition: `background 0.2s ${EASE}`,
                      }}
                    >
                      {t("exploreDiscover")} →
                    </button>
                  </div>
                )}
              </section>
            ) : activeTab === "discover" || !isAuthenticated ? (
              <>
                {/* ── Featured ──────────────────────────────── */}
                {featured.length > 0 && (
                  <section data-nudge="explore_cards" style={{ marginBottom: "2.5rem" }}>
                    <TuscanSectionHeader
                      badge={<span style={{ fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 600, padding: "0.1875rem 0.5rem", borderRadius: "1rem", background: `${T.color.gold}15`, color: T.color.goldDark }}>★</span>}
                    >
                      {t("featured")}
                    </TuscanSectionHeader>
                    <PalaceGrid palaces={featured} onPalaceClick={navigateToProfile} variant="featured" />
                  </section>
                )}

                {/* ── Trending ──────────────────────────────── */}
                {trending.length > 0 && (
                  <section style={{ marginBottom: "2.5rem" }}>
                    <TuscanSectionHeader
                      badge={<span style={{ fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 600, padding: "0.1875rem 0.5rem", borderRadius: "1rem", background: `${T.color.terracotta}12`, color: T.color.terracotta }}>🔥</span>}
                    >
                      {t("trending")}
                    </TuscanSectionHeader>
                    <PalaceGrid palaces={trending} onPalaceClick={navigateToProfile} />
                  </section>
                )}

                {/* ── Newest ────────────────────────────────── */}
                {newest.length > 0 && (
                  <section style={{ marginBottom: "2.5rem" }}>
                    <TuscanSectionHeader>{t("newest")}</TuscanSectionHeader>
                    <PalaceGrid palaces={newest} onPalaceClick={navigateToProfile} />
                  </section>
                )}

                {/* ── Enhanced Empty state ──────────────────── */}
                {!hasContent && (
                  <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
                    <EmptyState text={t("exploreEmpty")} hint={t("exploreEmptyHint")} />
                    {isAuthenticated && (
                      <button
                        onClick={() => router.push("/settings/sharing")}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: "0.5rem",
                          fontFamily: T.font.body, fontSize: "1rem", fontWeight: 600,
                          minHeight: "2.75rem", padding: "0 2rem", borderRadius: "2rem",
                          border: "none", marginTop: "1rem",
                          background: "#B85C38",
                          color: "#FCFAF5", cursor: "pointer",
                          boxShadow: "0 0.25rem 1rem rgba(64,59,54,0.14)",
                        }}
                      >
                        {t("publishYourPalace")}
                      </button>
                    )}
                  </div>
                )}
              </>
            ) : null}
          </>
        )}
      </div>

      {/* Mobile NavigationBar */}
      {isAuthenticated && isMobile && (
        <NavigationBar
          currentMode={"atrium"}
          onModeChange={handleModeChange}
          onNotifications={() => router.push("/palace?notifications=1")}
          isMobile={true}
          activeTab="explore"
        />
      )}


      {/* Tutorial nudges */}
      <NudgeProvider page="explore" />
    </div>
  );
}

/* ── Palace Grid ───────────────────────────────────── */

function PalaceGrid({
  palaces,
  onPalaceClick,
  variant,
}: {
  palaces: DirectoryPalace[];
  onPalaceClick: (p: DirectoryPalace) => void;
  variant?: "featured";
}) {
  const isMobile = useIsMobile();
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? "100%" : variant === "featured" ? "20rem" : "17rem"}, 1fr))`,
        gap: "0.875rem",
      }}
    >
      {palaces.map((p) => (
        <EnhancedPalaceCard
          key={p.user_id}
          palace={p}
          onClick={() => onPalaceClick(p)}
          featured={variant === "featured"}
        />
      ))}
    </div>
  );
}

/* ── Enhanced Palace Card ──────────────────────────── */

function EnhancedPalaceCard({
  palace,
  onClick,
  featured = false,
}: {
  palace: DirectoryPalace;
  onClick: () => void;
  featured?: boolean;
}) {
  const { t } = useTranslation("social");

  return (
    <TuscanCard
      variant={featured ? "elevated" : "glass"}
      padding="0"
      style={{ cursor: "pointer", overflow: "hidden" }}
    >
      <div
        onClick={onClick}
        role="button"
        tabIndex={0}
        aria-label={palace.display_name || t("anonymous")}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}
      >
        {/* Tuscan villa illustration header */}
        <div style={{
          width: "100%", height: "5rem", overflow: "hidden",
          background: `linear-gradient(135deg, ${T.color.gold}18, ${T.color.terracotta}12)`,
          display: "flex", alignItems: "flex-end", justifyContent: "center",
        }}>
          <svg
            width="100%" height="100%"
            viewBox="0 0 320 80"
            preserveAspectRatio="xMidYMax meet"
            style={{ display: "block" }}
          >
            {/* Ground line */}
            <rect x="0" y="72" width="320" height="8" fill={T.color.terracotta} opacity="0.12" />

            {/* Left cypress tree */}
            <ellipse cx="60" cy="44" rx="7" ry="26" fill={T.color.charcoal} opacity="0.18" />
            <rect x="58" y="68" width="4" height="6" fill={T.color.walnut} opacity="0.25" />

            {/* Right cypress tree */}
            <ellipse cx="260" cy="44" rx="7" ry="26" fill={T.color.charcoal} opacity="0.18" />
            <rect x="258" y="68" width="4" height="6" fill={T.color.walnut} opacity="0.25" />

            {/* Main building body */}
            <rect x="110" y="34" width="100" height="38" fill={T.color.cream} opacity="0.5" stroke={T.color.terracotta} strokeWidth="0.5" strokeOpacity="0.3" />

            {/* Terracotta roof / pediment */}
            <polygon points="105,34 160,12 215,34" fill={T.color.terracotta} opacity="0.4" />
            <line x1="105" y1="34" x2="215" y2="34" stroke={T.color.terracotta} strokeWidth="1" strokeOpacity="0.35" />

            {/* Roof ridge detail */}
            <line x1="160" y1="12" x2="160" y2="34" stroke={T.color.terracotta} strokeWidth="0.5" strokeOpacity="0.2" />

            {/* Left wing */}
            <rect x="80" y="44" width="30" height="28" fill={T.color.cream} opacity="0.4" stroke={T.color.terracotta} strokeWidth="0.5" strokeOpacity="0.25" />
            <rect x="80" y="40" width="30" height="4" fill={T.color.terracotta} opacity="0.35" rx="0.5" />

            {/* Right wing */}
            <rect x="210" y="44" width="30" height="28" fill={T.color.cream} opacity="0.4" stroke={T.color.terracotta} strokeWidth="0.5" strokeOpacity="0.25" />
            <rect x="210" y="40" width="30" height="4" fill={T.color.terracotta} opacity="0.35" rx="0.5" />

            {/* Arched doorway */}
            <rect x="150" y="50" width="20" height="22" fill={T.color.walnut} opacity="0.3" rx="1" />
            <path d="M150,54 A10,10 0 0,1 170,54" fill={T.color.walnut} opacity="0.25" />
            {/* Door step */}
            <rect x="148" y="70" width="24" height="2" fill={T.color.sandstone} opacity="0.4" rx="0.5" />

            {/* Left window with shutters */}
            <rect x="120" y="44" width="14" height="16" fill={T.color.gold} opacity="0.15" rx="1" stroke={T.color.walnut} strokeWidth="0.6" strokeOpacity="0.25" />
            <rect x="116" y="43" width="4" height="18" fill={T.color.terracotta} opacity="0.3" rx="0.5" />
            <rect x="134" y="43" width="4" height="18" fill={T.color.terracotta} opacity="0.3" rx="0.5" />
            {/* Window cross */}
            <line x1="127" y1="44" x2="127" y2="60" stroke={T.color.walnut} strokeWidth="0.4" strokeOpacity="0.25" />
            <line x1="120" y1="52" x2="134" y2="52" stroke={T.color.walnut} strokeWidth="0.4" strokeOpacity="0.25" />

            {/* Right window with shutters */}
            <rect x="186" y="44" width="14" height="16" fill={T.color.gold} opacity="0.15" rx="1" stroke={T.color.walnut} strokeWidth="0.6" strokeOpacity="0.25" />
            <rect x="182" y="43" width="4" height="18" fill={T.color.terracotta} opacity="0.3" rx="0.5" />
            <rect x="200" y="43" width="4" height="18" fill={T.color.terracotta} opacity="0.3" rx="0.5" />
            {/* Window cross */}
            <line x1="193" y1="44" x2="193" y2="60" stroke={T.color.walnut} strokeWidth="0.4" strokeOpacity="0.25" />
            <line x1="186" y1="52" x2="200" y2="52" stroke={T.color.walnut} strokeWidth="0.4" strokeOpacity="0.25" />

            {/* Left wing window */}
            <rect x="88" y="52" width="10" height="12" fill={T.color.gold} opacity="0.12" rx="0.5" stroke={T.color.walnut} strokeWidth="0.4" strokeOpacity="0.2" />

            {/* Right wing window */}
            <rect x="222" y="52" width="10" height="12" fill={T.color.gold} opacity="0.12" rx="0.5" stroke={T.color.walnut} strokeWidth="0.4" strokeOpacity="0.2" />

            {/* Columns / pilasters at entrance */}
            <rect x="146" y="38" width="3" height="34" fill={T.color.sandstone} opacity="0.35" rx="0.5" />
            <rect x="171" y="38" width="3" height="34" fill={T.color.sandstone} opacity="0.35" rx="0.5" />
            {/* Column capitals */}
            <rect x="145" y="36" width="5" height="3" fill={T.color.sandstone} opacity="0.4" rx="0.5" />
            <rect x="170" y="36" width="5" height="3" fill={T.color.sandstone} opacity="0.4" rx="0.5" />

            {/* Balustrade */}
            <line x1="80" y1="72" x2="110" y2="72" stroke={T.color.sandstone} strokeWidth="0.8" strokeOpacity="0.3" />
            <line x1="210" y1="72" x2="240" y2="72" stroke={T.color.sandstone} strokeWidth="0.8" strokeOpacity="0.3" />
          </svg>
        </div>

        {/* Card content */}
        <div style={{ padding: "1rem 1.25rem 1.25rem" }}>
          {/* Top row: avatar + info */}
          <div style={{ display: "flex", gap: "0.875rem", alignItems: "flex-start" }}>
            {/* Avatar */}
            <div style={{
              width: featured ? "3.5rem" : "3rem", height: featured ? "3.5rem" : "3rem",
              borderRadius: "50%", flexShrink: 0,
              background: palace.avatar_url
                ? `url(${palace.avatar_url}) center/cover`
                : `linear-gradient(135deg, ${T.color.gold}, ${T.color.terracotta})`,
              border: `2px solid ${featured ? T.color.gold : T.color.sandstone}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: T.color.cream, fontFamily: T.font.display,
              fontSize: featured ? "1.375rem" : "1.125rem", fontWeight: 600,
              marginTop: "-1.5rem", boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
            }}>
              {!palace.avatar_url && (palace.display_name?.[0]?.toUpperCase() || "?")}
            </div>

            {/* Name + username */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: T.font.display, fontSize: featured ? "1.1875rem" : "1.0625rem",
                fontWeight: 600, color: T.color.charcoal,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>
                {palace.display_name || t("anonymous")}
              </div>
              {palace.username && (
                <div style={{
                  fontFamily: T.font.body, fontSize: "0.8125rem",
                  color: T.color.muted, marginTop: "0.0625rem",
                }}>
                  @{palace.username}
                </div>
              )}
            </div>

            {/* Category badge or visit count */}
            {palace.category ? (
              <span style={{
                fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 500,
                padding: "0.1875rem 0.5rem", borderRadius: "1rem",
                background: `${T.color.gold}12`, color: T.color.goldDark,
                whiteSpace: "nowrap", flexShrink: 0,
              }}>
                {palace.category}
              </span>
            ) : palace.total_visit_count > 0 ? (
              <span style={{
                fontFamily: T.font.body, fontSize: "0.6875rem",
                color: T.color.muted, flexShrink: 0,
              }}>
                {palace.total_visit_count} {t("visits")}
              </span>
            ) : null}
          </div>

          {/* Bio */}
          {palace.bio && (
            <p style={{
              fontFamily: T.font.body, fontSize: "0.8125rem",
              color: T.color.walnut, margin: "0.75rem 0 0",
              lineHeight: 1.5, display: "-webkit-box",
              WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
            }}>
              {palace.bio}
            </p>
          )}

          {/* Wing count bar + Visit */}
          <div style={{
            display: "flex", alignItems: "center", gap: "0.5rem",
            marginTop: "0.75rem", paddingTop: "0.625rem",
            borderTop: `1px solid ${T.color.lineFaint}`,
          }}>
            {palace.published_wing_count > 0 && (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.color.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                <span style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.muted }}>
                  {palace.published_wing_count} {palace.published_wing_count === 1 ? "wing" : "wings"}
                </span>
              </>
            )}
            {/* Profile link (follow from there) */}
            {palace.username && (
              <a
                href={`/u/${palace.username}`}
                onClick={(e) => e.stopPropagation()}
                aria-label={t("followUser")}
                style={{
                  marginLeft: palace.published_wing_count > 0 ? undefined : "auto",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: "1.75rem", height: "1.75rem", borderRadius: "50%",
                  border: `1px solid ${T.color.sandstone}`,
                  background: "transparent",
                  color: T.color.goldDark,
                  textDecoration: "none",
                  flexShrink: 0,
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = `linear-gradient(135deg, ${T.color.gold}, ${T.color.goldDark})`;
                  e.currentTarget.style.color = T.color.cream;
                  e.currentTarget.style.borderColor = "transparent";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = T.color.goldDark;
                  e.currentTarget.style.borderColor = T.color.sandstone;
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <line x1="19" y1="8" x2="19" y2="14" />
                  <line x1="22" y1="11" x2="16" y2="11" />
                </svg>
              </a>
            )}
            {palace.first_wing_slug && (
              <span style={{
                marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.25rem",
                fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 500, color: T.color.goldDark,
              }}>
                {t("exploreVisitPalace")} →
              </span>
            )}
          </div>
        </div>
      </div>
    </TuscanCard>
  );
}

/* ── Following Card ──────────────────────────────────── */

function FollowingCard({
  palace,
  onClick,
}: {
  palace: FollowingPalace;
  onClick: () => void;
}) {
  const { t } = useTranslation("social");

  return (
    <TuscanCard variant="elevated" padding="0" style={{ cursor: "pointer" }}>
      <div
        onClick={onClick}
        role="button"
        tabIndex={0}
        aria-label={palace.display_name || t("anonymous")}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}
      >
        {/* Tuscan villa illustration header */}
        <div style={{
          width: "100%", height: "5rem", overflow: "hidden",
          background: `linear-gradient(135deg, ${T.color.gold}18, ${T.color.terracotta}12)`,
          display: "flex", alignItems: "flex-end", justifyContent: "center",
        }}>
          <svg
            width="100%" height="100%"
            viewBox="0 0 320 80"
            preserveAspectRatio="xMidYMax meet"
            style={{ display: "block" }}
          >
            <rect x="0" y="72" width="320" height="8" fill={T.color.terracotta} opacity="0.12" />
            <ellipse cx="60" cy="44" rx="7" ry="26" fill={T.color.charcoal} opacity="0.18" />
            <rect x="58" y="68" width="4" height="6" fill={T.color.walnut} opacity="0.25" />
            <ellipse cx="260" cy="44" rx="7" ry="26" fill={T.color.charcoal} opacity="0.18" />
            <rect x="258" y="68" width="4" height="6" fill={T.color.walnut} opacity="0.25" />
            <rect x="110" y="34" width="100" height="38" fill={T.color.cream} opacity="0.5" stroke={T.color.terracotta} strokeWidth="0.5" strokeOpacity="0.3" />
            <polygon points="105,34 160,12 215,34" fill={T.color.terracotta} opacity="0.4" />
            <line x1="105" y1="34" x2="215" y2="34" stroke={T.color.terracotta} strokeWidth="1" strokeOpacity="0.35" />
            <line x1="160" y1="12" x2="160" y2="34" stroke={T.color.terracotta} strokeWidth="0.5" strokeOpacity="0.2" />
            <rect x="80" y="44" width="30" height="28" fill={T.color.cream} opacity="0.4" stroke={T.color.terracotta} strokeWidth="0.5" strokeOpacity="0.25" />
            <rect x="80" y="40" width="30" height="4" fill={T.color.terracotta} opacity="0.35" rx="0.5" />
            <rect x="210" y="44" width="30" height="28" fill={T.color.cream} opacity="0.4" stroke={T.color.terracotta} strokeWidth="0.5" strokeOpacity="0.25" />
            <rect x="210" y="40" width="30" height="4" fill={T.color.terracotta} opacity="0.35" rx="0.5" />
            <rect x="150" y="50" width="20" height="22" fill={T.color.walnut} opacity="0.3" rx="1" />
            <path d="M150,54 A10,10 0 0,1 170,54" fill={T.color.walnut} opacity="0.25" />
            <rect x="148" y="70" width="24" height="2" fill={T.color.sandstone} opacity="0.4" rx="0.5" />
            <rect x="120" y="44" width="14" height="16" fill={T.color.gold} opacity="0.15" rx="1" stroke={T.color.walnut} strokeWidth="0.6" strokeOpacity="0.25" />
            <rect x="116" y="43" width="4" height="18" fill={T.color.terracotta} opacity="0.3" rx="0.5" />
            <rect x="134" y="43" width="4" height="18" fill={T.color.terracotta} opacity="0.3" rx="0.5" />
            <line x1="127" y1="44" x2="127" y2="60" stroke={T.color.walnut} strokeWidth="0.4" strokeOpacity="0.25" />
            <line x1="120" y1="52" x2="134" y2="52" stroke={T.color.walnut} strokeWidth="0.4" strokeOpacity="0.25" />
            <rect x="186" y="44" width="14" height="16" fill={T.color.gold} opacity="0.15" rx="1" stroke={T.color.walnut} strokeWidth="0.6" strokeOpacity="0.25" />
            <rect x="182" y="43" width="4" height="18" fill={T.color.terracotta} opacity="0.3" rx="0.5" />
            <rect x="200" y="43" width="4" height="18" fill={T.color.terracotta} opacity="0.3" rx="0.5" />
            <line x1="193" y1="44" x2="193" y2="60" stroke={T.color.walnut} strokeWidth="0.4" strokeOpacity="0.25" />
            <line x1="186" y1="52" x2="200" y2="52" stroke={T.color.walnut} strokeWidth="0.4" strokeOpacity="0.25" />
            <rect x="88" y="52" width="10" height="12" fill={T.color.gold} opacity="0.12" rx="0.5" stroke={T.color.walnut} strokeWidth="0.4" strokeOpacity="0.2" />
            <rect x="222" y="52" width="10" height="12" fill={T.color.gold} opacity="0.12" rx="0.5" stroke={T.color.walnut} strokeWidth="0.4" strokeOpacity="0.2" />
            <rect x="146" y="38" width="3" height="34" fill={T.color.sandstone} opacity="0.35" rx="0.5" />
            <rect x="171" y="38" width="3" height="34" fill={T.color.sandstone} opacity="0.35" rx="0.5" />
            <rect x="145" y="36" width="5" height="3" fill={T.color.sandstone} opacity="0.4" rx="0.5" />
            <rect x="170" y="36" width="5" height="3" fill={T.color.sandstone} opacity="0.4" rx="0.5" />
            <line x1="80" y1="72" x2="110" y2="72" stroke={T.color.sandstone} strokeWidth="0.8" strokeOpacity="0.3" />
            <line x1="210" y1="72" x2="240" y2="72" stroke={T.color.sandstone} strokeWidth="0.8" strokeOpacity="0.3" />
          </svg>
        </div>

        {/* Card content */}
        <div style={{ padding: "1rem 1.25rem 1.25rem" }}>
          <div style={{ display: "flex", gap: "0.875rem", alignItems: "flex-start" }}>
            {/* Avatar */}
            <div style={{
              width: "3.25rem", height: "3.25rem", borderRadius: "50%", flexShrink: 0,
              background: palace.avatar_url
                ? `url(${palace.avatar_url}) center/cover`
                : `linear-gradient(135deg, ${T.color.gold}, ${T.color.terracotta})`,
              border: `2px solid ${T.color.gold}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: T.color.cream, fontFamily: T.font.display,
              fontSize: "1.25rem", fontWeight: 600,
              marginTop: "-1.5rem", boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
            }}>
              {!palace.avatar_url && (palace.display_name?.[0]?.toUpperCase() || "?")}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: T.font.display, fontSize: "1.0625rem", fontWeight: 600,
                color: T.color.charcoal,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>
                {palace.display_name || t("anonymous")}
              </div>
              {palace.username && (
                <div style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.muted, marginTop: "0.0625rem" }}>
                  @{palace.username}
                </div>
              )}
            </div>

            {/* Last update badge */}
            {palace.latest_published_at && (
              <span style={{
                fontFamily: T.font.body, fontSize: "0.6875rem",
                color: T.color.walnut, flexShrink: 0,
                background: `${T.color.sandstone}40`, padding: "0.1875rem 0.5rem",
                borderRadius: "0.5rem",
              }}>
                {timeAgo(palace.latest_published_at)}
              </span>
            )}
          </div>

          {/* Bio */}
          {palace.bio && (
            <p style={{
              fontFamily: T.font.body, fontSize: "0.8125rem",
              color: T.color.walnut, margin: "0.75rem 0 0",
              lineHeight: 1.5, display: "-webkit-box",
              WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
            }}>
              {palace.bio}
            </p>
          )}

          {/* Stats row + Visit */}
          <div style={{
            display: "flex", alignItems: "center", gap: "0.5rem",
            marginTop: "0.75rem", paddingTop: "0.625rem",
            borderTop: `1px solid ${T.color.lineFaint}`,
          }}>
            {palace.published_wing_count > 0 && (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.color.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                <span style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.muted }}>
                  {palace.published_wing_count} {palace.published_wing_count === 1 ? "wing" : "wings"}
                </span>
              </>
            )}
            {palace.first_wing_slug && (
              <span style={{
                marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.25rem",
                fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 500, color: T.color.goldDark,
              }}>
                {t("exploreVisitPalace")} →
              </span>
            )}
          </div>
        </div>
      </div>
    </TuscanCard>
  );
}

/* ── Empty State ──────────────────────────────────── */

function EmptyState({ text, hint }: { text: string; hint?: string }) {
  return (
    <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
      <div style={{
        width: "3rem", height: "3rem", margin: "0 auto 1rem",
        borderRadius: "50%",
        background: `${T.color.sandstone}30`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={T.color.muted} strokeWidth="1.5">
          <circle cx="12" cy="12" r="10" /><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
        </svg>
      </div>
      <p style={{ fontFamily: T.font.display, fontSize: "1.25rem", color: T.color.charcoal, margin: "0 0 0.375rem" }}>
        {text}
      </p>
      {hint && (
        <p style={{ fontFamily: T.font.body, fontSize: "0.875rem", color: T.color.muted, margin: 0 }}>
          {hint}
        </p>
      )}
    </div>
  );
}

