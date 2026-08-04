"use client";

import React, { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useRouter } from "next/navigation";
import { searchPalaces } from "@/lib/social/directory-actions";
import type { DirectoryPalace, FollowingPalace } from "@/lib/social/directory-actions";
import { createClient } from "@/lib/supabase/client";
import NavigationBar from "@/components/ui/NavigationBar";
import { useIsMobile, useIsCompact } from "@/lib/hooks/useIsMobile";
// Note: do NOT import usePalaceStore — Explore is outside the (app) layout group
import NudgeProvider from "@/components/ui/NudgeTooltip";
import PalaceLogo from "@/components/landing/PalaceLogo";
import {
  INK,
  MUTED,
  EMBER,
  EMBER_GLYPH,
  HAIRLINE,
  CREAM,
  GOLD,
  SAGE,
  TRAY,
  SHADOW,
  HOVER_SHADOW,
  TOP_HIGHLIGHT,
  CARD_BORDER,
  INK_DEEP,
  INPUT_SHADOW,
  INPUT_SHADOW_FOCUS,
} from "@/lib/libraryTokens";

/* ── Types ─────────────────────────────────────────── */

/** Any palace a card can render — following rows carry latest_published_at. */
type CardPalace = DirectoryPalace & { latest_published_at?: string | null };

interface ExplorePageClientProps {
  /** Deduped (featured > trending > newest), default-ordered by 7-day visits. */
  palaces: DirectoryPalace[];
  /** Ordered user_ids of the "New" rail (membership within `palaces`). */
  newestIds: string[];
  following?: FollowingPalace[];
  isAuthenticated?: boolean;
}

type RailFilter = "featured" | "new" | "following" | null;

/* ── Constants ─────────────────────────────────────── */

const EASE = "cubic-bezier(0.4, 0, 0.2, 1)";
const EMBER_WASH = "rgba(154,79,42,0.07)";
const MOBILE_CARD_CAP = 8;

/* ── Atrium tray grammar (AtriumRelay canon): recessed tinted panels the
   sections sit in, so Explore reads as an Atrium sibling board. TRAY_GOLD is
   the Atrium gold-lane tray hex — reserved for the curated/featured zone. ── */
const TRAY_GOLD = "#FAF3E0";
const TRAY_INSET = "inset 0 0.0625rem 0.1875rem rgba(64,59,54,0.06)";
function trayPanel(tint: string = TRAY): React.CSSProperties {
  return {
    background: tint,
    borderRadius: "1rem",
    border: `0.0625rem solid ${HAIRLINE}`,
    boxShadow: TRAY_INSET,
  };
}
/* Cream tile surface that lifts from the recessed tray (Atrium tile grammar,
   rebased on cream/white so cards read a step above the tray tint). */
const CARD_ON_TRAY = `linear-gradient(160deg, #FFFFFF 0%, ${CREAM} 78%)`;

const srOnly: React.CSSProperties = {
  position: "absolute",
  width: "1px",
  height: "1px",
  margin: "-1px",
  padding: 0,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
  border: 0,
};

/* ── Helpers ───────────────────────────────────────── */

/** Humanise an untranslated DB slug: underscores→spaces, title-case each word. */
function formatSlug(slug: string): string {
  return slug
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function timeAgo(dateStr: string | null | undefined, locale: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  try {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
    if (mins < 1) return rtf.format(0, "minute");
    if (mins < 60) return rtf.format(-mins, "minute");
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return rtf.format(-hrs, "hour");
    const days = Math.floor(hrs / 24);
    if (days < 7) return rtf.format(-days, "day");
  } catch {
    // Intl unavailable — fall through to the localized date below
  }
  return date.toLocaleDateString(locale, { month: "short", day: "numeric" });
}

/* ── Main Component ────────────────────────────────── */

export default function ExplorePageClient({
  palaces,
  newestIds,
  following = [],
  isAuthenticated = false,
}: ExplorePageClientProps) {
  const { t, locale } = useTranslation("social");
  // Stable translation slice threaded to every card so they don't each mount
  // their own useTranslation() (only re-created when t/locale actually change).
  const cardI18n = useMemo<CardI18n>(() => ({ t, locale }), [t, locale]);
  const router = useRouter();
  const isMobile = useIsMobile();
  // NavigationBar internally switches to the bottom-bar treatment on compact
  // viewports (iPad portrait 768–1024px) even when mounted with isMobile={false}
  // (see NavigationBar useMobileLayout), so we reserve BOTTOM space for compact
  // and top space only for true desktop.
  const isCompact = useIsCompact();
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<DirectoryPalace[] | null>(null);
  const [searchError, setSearchError] = useState(false);
  const [rail, setRail] = useState<RailFilter>(null);
  const [showAll, setShowAll] = useState(false);
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  // Request-sequence guard so only the latest search response lands.
  const searchSeq = useRef(0);
  const [searchFocused, setSearchFocused] = useState(false);
  // null = unknown (render the unchanged CTA to avoid flicker); true = the
  // keeper's palace is already listed in this directory (profiles.is_public —
  // the exact gate directory-actions filters on), so the publish CTA becomes
  // a modest "live" chip instead.
  const [isPublished, setIsPublished] = useState<boolean | null>(null);

  // On mount (authenticated only): ask whether the keeper's palace is already
  // published. Own-row read on profiles is RLS-safe from the browser client
  // (same query the profile settings page performs).
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        const { data } = await supabase
          .from("profiles")
          .select("is_public")
          .eq("id", user.id)
          .single();
        if (!cancelled) setIsPublished(!!data?.is_public);
      } catch {
        // Fail open to the existing CTA — publishing is idempotent to revisit.
        if (!cancelled) setIsPublished(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  // Cancel any pending debounce + in-flight search response on unmount.
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      searchSeq.current++;
    };
  }, []);

  const handleSearch = (value: string) => {
    setQuery(value);
    setSearchError(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 2) {
      searchSeq.current++;
      setSearchResults(null);
      return;
    }
    debounceRef.current = setTimeout(() => {
      const seq = ++searchSeq.current;
      startTransition(async () => {
        try {
          const results = await searchPalaces(value.trim());
          if (seq === searchSeq.current) setSearchResults(results);
        } catch {
          if (seq === searchSeq.current) {
            setSearchResults(null);
            setSearchError(true);
          }
        }
      });
    }, 300);
  };

  const clearSearch = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    searchSeq.current++;
    setQuery("");
    setSearchResults(null);
    setSearchError(false);
    setShowAll(false);
  };

  // Navigate to app modes via full page navigation (not soft nav)
  // to avoid conflicts with MemoryPalace's history management
  const handleModeChange = (mode: "atrium" | "library" | "3d") => {
    window.location.replace(mode === "3d" ? "/palace" : `/${mode}`);
  };

  /* ── Derived rails ── */
  const featuredAll = useMemo(
    () =>
      palaces
        .filter((p) => p.featured_at)
        .sort((a, b) => (b.featured_at || "").localeCompare(a.featured_at || "")),
    [palaces]
  );
  const newestList = useMemo(() => {
    const byId = new Map(palaces.map((p) => [p.user_id, p]));
    return newestIds
      .map((id) => byId.get(id))
      .filter(Boolean) as DirectoryPalace[];
  }, [palaces, newestIds]);

  // Short featured rail above the grid (default view only, max 5, curated).
  // Memoized so its array identity is stable across keystroke re-renders,
  // letting React.memo skip the featured PalaceGrid while typing.
  const featuredRail = useMemo(() => featuredAll.slice(0, 5), [featuredAll]);
  const railIds = useMemo(
    () => new Set(featuredRail.map((p) => p.user_id)),
    [featuredRail]
  );

  // Memoized so the default-view filtered array keeps a stable identity across
  // keystroke re-renders (searchResults === null), letting React.memo skip the grid.
  const gridPalaces: CardPalace[] = useMemo(
    () =>
      rail === "featured"
        ? featuredAll
        : rail === "new"
          ? newestList
          : rail === "following"
            ? following
            : palaces.filter((p) => !railIds.has(p.user_id)),
    [rail, featuredAll, newestList, following, palaces, railIds]
  );

  // Mobile: cap the initial render, expand on demand.
  const capped = isMobile && !showAll && gridPalaces.length > MOBILE_CARD_CAP;
  const visiblePalaces = useMemo(
    () => (capped ? gridPalaces.slice(0, MOBILE_CARD_CAP) : gridPalaces),
    [capped, gridPalaces]
  );

  const gridLabel =
    rail === "featured"
      ? t("featured")
      : rail === "new"
        ? t("newest")
        : rail === "following"
          ? t("exploreFollowingTitle")
          : t("exploreWarmlyVisited");

  const hasContent = palaces.length > 0;
  const helperVisible = query.length > 0 && query.trim().length < 2;

  const pills: { id: Exclude<RailFilter, null>; label: string }[] = [
    { id: "featured", label: t("featured") },
    { id: "new", label: t("newest") },
    ...(isAuthenticated
      ? [{ id: "following" as const, label: t("exploreFollowing") }]
      : []),
  ];

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: CREAM,
        paddingTop:
          isAuthenticated && !isMobile && !isCompact
            ? "3.5rem"
            : "env(safe-area-inset-top, 0px)",
        paddingBottom:
          isAuthenticated && (isMobile || isCompact)
            ? "calc(3.5rem + env(safe-area-inset-bottom, 0px))"
            : "max(2rem, env(safe-area-inset-bottom, 0px))",
      }}
    >
      {isAuthenticated && !isMobile && (
        <NavigationBar
          currentMode={"atrium"}
          onModeChange={handleModeChange}
          onNotifications={() => router.push("/atrium?notifications=1")}
          isMobile={false}
          activeTab="explore"
        />
      )}

      {/* ── Unauth acquisition header: wordmark + sign in + one ink keystone.
             Free-tier-neutral on iOS: no pricing surfaces, ever. ── */}
      {!isAuthenticated && (
        <header
          style={{
            maxWidth: "60rem",
            margin: "0 auto",
            padding: "0.75rem 1rem 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.75rem",
          }}
        >
          <Link
            href="/"
            aria-label={t("exploreHomeLink")}
            className="explore-link"
            style={{ textDecoration: "none", display: "flex", alignItems: "center", minHeight: "2.75rem" }}
          >
            <PalaceLogo variant={isMobile ? "mark" : "full"} color="dark" size="sm" />
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Link
              href="/login"
              className="explore-link"
              style={{
                display: "inline-flex",
                alignItems: "center",
                minHeight: "2.75rem",
                padding: "0 0.75rem",
                fontFamily: T.font.body,
                fontSize: "0.9375rem",
                fontWeight: 600,
                color: MUTED,
                textDecoration: "none",
              }}
            >
              {t("exploreSignIn")}
            </Link>
            <Link
              href="/register"
              className="explore-keystone"
              style={{
                display: "inline-flex",
                alignItems: "center",
                minHeight: "2.75rem",
                padding: "0 1.25rem",
                borderRadius: "2rem",
                background: `linear-gradient(165deg, ${INK}, ${INK_DEEP})`,
                border: `0.0625rem solid ${HAIRLINE}`,
                color: CREAM,
                fontFamily: T.font.body,
                fontSize: "0.9375rem",
                fontWeight: 600,
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              {t("exploreCreatePalace")}
            </Link>
          </div>
        </header>
      )}

      <div className="explore-board" style={{ maxWidth: "60rem", margin: "0 auto", padding: "0 1rem" }}>

        {/* ── Hero: one line of ink, content directly below ── */}
        <div
          style={{
            padding: isMobile ? "1.25rem 0 0.75rem" : "1.5rem 0 1rem",
            textAlign: "center",
          }}
        >
          <h1 style={{
            fontFamily: T.font.display, fontSize: isMobile ? "1.75rem" : "2.25rem",
            fontWeight: 600, color: INK, margin: "0 0 0.5rem",
            letterSpacing: "0.01em",
          }}>
            {t("exploreTitle")}
          </h1>
          <p style={{
            fontFamily: T.font.body, fontSize: "1rem",
            color: MUTED, margin: "0 auto", maxWidth: "28rem",
            lineHeight: 1.5,
          }}>
            {t("exploreSubtitle")}
          </p>
        </div>

        {/* ── Search + pills band: recessed Atrium tray ─── */}
        <section
          aria-label={t("searchPalaces")}
          style={{
            ...trayPanel(),
            padding: isMobile ? "1rem 0.875rem 1.25rem" : "1.25rem 1.5rem 1.5rem",
            marginBottom: "1.5rem",
          }}
        >
          <LaneHeader>{t("searchPalaces")}</LaneHeader>
          <div role="search" data-nudge="explore_search" style={{ maxWidth: "32rem", margin: "0 auto" }}>
          <div className="explore-search-field" style={{
            position: "relative",
            borderRadius: "0.875rem",
            border: `0.0625rem solid ${searchFocused ? EMBER : HAIRLINE}`,
            background: CREAM,
            boxShadow: searchFocused ? INPUT_SHADOW_FOCUS : INPUT_SHADOW,
            transition: `border-color 0.3s ${EASE}, box-shadow 0.3s ${EASE}`,
            display: "flex", alignItems: "center", gap: "0.75rem",
            padding: "0 0.5rem 0 1rem",
          }}>
            {isPending ? (
              <svg className="explore-spin" width="1.125rem" height="1.125rem" viewBox="0 0 24 24" fill="none" stroke={EMBER} strokeWidth="2" strokeLinecap="round" aria-hidden="true" style={{ flexShrink: 0 }}>
                <path d="M21 12a9 9 0 1 1-6.22-8.56" />
              </svg>
            ) : (
              <svg width="1.125rem" height="1.125rem" viewBox="0 0 24 24" fill="none" stroke={searchFocused ? EMBER : MUTED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, transition: "stroke 0.3s" }}>
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
            )}
            <input
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder={t("searchPalaces")}
              aria-label={t("searchPalaces")}
              className="explore-search-input"
              style={{
                // 1rem = WebKit's no-auto-zoom threshold on iOS Safari
                flex: 1, fontFamily: T.font.body, fontSize: "1rem",
                padding: "0.75rem 0", border: "none", background: "transparent",
                color: INK, outline: "none", minWidth: 0,
              }}
            />
            {query && (
              <button
                onClick={clearSearch}
                aria-label={t("clearSearch")}
                className="explore-icon-btn"
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: MUTED, flexShrink: 0,
                  minWidth: "2.75rem", minHeight: "2.75rem",
                  margin: "-0.25rem 0",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <svg width="1rem" height="1rem" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            )}
          </div>
          {helperVisible && (
            <p style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: MUTED, margin: "0.5rem 0 0", textAlign: "center" }}>
              {t("searchMinChars")}
            </p>
          )}
          {searchError && (
            <p role="alert" style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.error, margin: "0.5rem 0 0", textAlign: "center" }}>
              {t("searchError")}
            </p>
          )}
        </div>

          {/* Screen-reader search status */}
          <span aria-live="polite" style={srOnly}>
            {searchResults !== null
              ? t("searchStatus", { count: String(searchResults.length), query })
              : ""}
          </span>

          {/* ── Quiet utility door: publishing lives on /settings/sharing.
                 Once the palace is live, the door becomes a modest chip. ── */}
          {isAuthenticated && searchResults === null && (
            isPublished === true ? (
              <PalaceLiveChip t={t} />
            ) : (
              <div style={{ textAlign: "center", marginTop: "1.25rem" }}>
                <button
                  onClick={() => router.push("/settings/sharing")}
                  data-nudge="explore_publish"
                  className="explore-quiet"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: "0.5rem",
                    fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: 600,
                    minHeight: "2.75rem", padding: "0 1.25rem", borderRadius: "2rem",
                    border: `0.0625rem solid ${HAIRLINE}`,
                    background: "transparent",
                    color: MUTED, cursor: "pointer",
                  }}
                >
                  {t("publishYourPalace")} {"→"}
                </button>
              </div>
            )
          )}

          {/* ── Pill rail: Featured / New / Following ──── */}
          {searchResults === null && (
            <div
              data-nudge="explore_tabs"
              role="group"
              aria-label={t("exploreTitle")}
              style={{
                display: "flex", gap: "0.5rem", flexWrap: "wrap",
                justifyContent: "center", marginTop: "1.25rem",
              }}
            >
              {pills.map((p) => {
                const active = rail === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => { setRail(active ? null : p.id); setShowAll(false); }}
                    aria-pressed={active}
                    className="explore-pill"
                    style={{
                      fontFamily: T.font.body, fontSize: "0.875rem",
                      fontWeight: active ? 600 : 500,
                      minHeight: "2.75rem", padding: "0 1.25rem",
                      borderRadius: "2rem", cursor: "pointer",
                      background: active ? CREAM : "transparent",
                      border: `0.0625rem solid ${active ? EMBER : HAIRLINE}`,
                      color: active ? EMBER : MUTED,
                    }}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {searchResults !== null ? (
          /* ── Search Results ────────────────────────────── */
          <section
            aria-busy={isPending}
            style={{
              ...trayPanel(),
              padding: isMobile ? "1rem 0.875rem 1.25rem" : "1.25rem 1.5rem 1.5rem",
              marginBottom: "2.5rem",
            }}
          >
            <LaneHeader
              badge={
                <span aria-hidden="true" style={{
                  fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 600,
                  fontVariantNumeric: "tabular-nums", color: EMBER_GLYPH,
                  background: EMBER_WASH, padding: "0.125rem 0.5rem", borderRadius: "1rem",
                }}>
                  {searchResults.length}
                </span>
              }
            >
              {t("searchResults")}
            </LaneHeader>
            {searchResults.length === 0 ? (
              <EmptyState text={t("noResults")} />
            ) : (
              <PalaceGrid palaces={searchResults} i18n={cardI18n} />
            )}
          </section>
        ) : (
          <>
            {/* ── Featured rail (default view, curated only): gold-zone tray ── */}
            {rail === null && featuredRail.length > 0 && (
              <section
                style={{
                  ...trayPanel(TRAY_GOLD),
                  padding: isMobile ? "1rem 0.875rem 1.25rem" : "1.25rem 1.5rem 1.5rem",
                  marginBottom: "1.5rem",
                }}
              >
                <LaneHeader>{t("featured")}</LaneHeader>
                <PalaceGrid palaces={featuredRail} i18n={cardI18n} featured />
              </section>
            )}

            {/* ── The one grid ───────────────────────────── */}
            <section
              data-nudge="explore_cards"
              style={{
                ...trayPanel(),
                padding: isMobile ? "1rem 0.875rem 1.25rem" : "1.25rem 1.5rem 1.5rem",
                marginBottom: "2.5rem",
              }}
            >
              <LaneHeader>{gridLabel}</LaneHeader>

              {visiblePalaces.length > 0 ? (
                <>
                  <PalaceGrid palaces={visiblePalaces} i18n={cardI18n} featured={rail === "featured"} />
                  {capped && (
                    <div style={{ textAlign: "center", marginTop: "1.25rem" }}>
                      <button
                        onClick={() => setShowAll(true)}
                        className="explore-quiet"
                        style={{
                          fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: 600,
                          minHeight: "2.75rem", padding: "0 1.5rem", borderRadius: "2rem",
                          border: `0.0625rem solid ${HAIRLINE}`,
                          background: "transparent", color: MUTED, cursor: "pointer",
                        }}
                      >
                        {t("exploreShowMore")}
                      </button>
                    </div>
                  )}
                </>
              ) : rail === "following" ? (
                <EmptyState text={t("exploreFollowEmpty")} />
              ) : rail === "featured" ? (
                <EmptyState text={t("exploreFeaturedEmpty")} />
              ) : rail === "new" ? (
                <EmptyState text={t("exploreNewEmpty")} />
              ) : (
                <div style={{ textAlign: "center" }}>
                  <EmptyState
                    text={t("exploreEmpty")}
                    hint={hasContent ? undefined : t("exploreEmptyHint")}
                  />
                  {isAuthenticated && !hasContent && isPublished !== true && (
                    <button
                      onClick={() => router.push("/settings/sharing")}
                      className="explore-cta"
                      style={{
                        display: "inline-flex", alignItems: "center", gap: "0.5rem",
                        fontFamily: T.font.body, fontSize: "1rem", fontWeight: 600,
                        minHeight: "2.75rem", padding: "0 2rem", borderRadius: "2rem",
                        border: "none", marginTop: "1rem",
                        background: EMBER,
                        color: CREAM, cursor: "pointer",
                        boxShadow: "0 0.25rem 1rem rgba(64,59,54,0.14)",
                      }}
                    >
                      {t("publishYourPalace")}
                    </button>
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {/* Mobile NavigationBar */}
      {isAuthenticated && isMobile && (
        <NavigationBar
          currentMode={"atrium"}
          onModeChange={handleModeChange}
          onNotifications={() => router.push("/atrium?notifications=1")}
          isMobile={true}
          activeTab="explore"
        />
      )}

      {/* Tutorial nudges */}
      <NudgeProvider page="explore" />

      {/* One motion voice: board entrance + CSS-only hover, all guarded. */}
      <style>{`
        .explore-card { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .explore-card:active { transform: none; }
        .explore-quiet, .explore-pill, .explore-icon-btn, .explore-keystone, .explore-cta { transition: border-color 0.2s ease, color 0.2s ease, opacity 0.2s ease; }
        .explore-quiet:active, .explore-pill:active, .explore-cta:active, .explore-keystone:active { opacity: 0.8; }
        @media (hover: hover) {
          .explore-card:hover { transform: translateY(-0.1875rem); box-shadow: ${HOVER_SHADOW}, ${TOP_HIGHLIGHT}; }
          .explore-quiet:hover { border-color: ${EMBER}; color: ${EMBER}; }
          .explore-pill:hover { border-color: ${EMBER}; color: ${EMBER}; }
          .explore-icon-btn:hover { color: ${INK}; }
          .explore-cta:hover { box-shadow: ${HOVER_SHADOW}; }
          .explore-keystone:hover { opacity: 0.92; }
        }
        .explore-card:focus-visible, .explore-pill:focus-visible, .explore-quiet:focus-visible,
        .explore-icon-btn:focus-visible, .explore-keystone:focus-visible, .explore-link:focus-visible,
        .explore-cta:focus-visible { outline: 0.1875rem solid ${GOLD}; outline-offset: 0.1875rem; }
        .explore-search-field:focus-within { outline: 0.1875rem solid ${GOLD}; outline-offset: 0.1875rem; }
        @media (prefers-reduced-motion: no-preference) {
          .explore-board { animation: explore-rise 0.5s ease both; }
          .explore-spin { animation: explore-spin 0.8s linear infinite; }
        }
        @keyframes explore-rise { from { opacity: 0; transform: translateY(0.6rem); } to { opacity: 1; transform: none; } }
        @keyframes explore-spin { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) {
          .explore-board, .explore-card, .explore-spin, .explore-pill, .explore-quiet,
          .explore-icon-btn, .explore-keystone, .explore-cta { animation: none !important; transition: none !important; }
          .explore-card:hover { transform: none !important; }
        }
      `}</style>
    </div>
  );
}

/* ── "Palace is live" chip — replaces the publish door once published ── */

function PalaceLiveChip({ t }: { t: (key: string, params?: Record<string, string>) => string }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", marginTop: "1.25rem" }}>
      <div
        style={{
          display: "inline-flex", alignItems: "center", flexWrap: "wrap",
          justifyContent: "center", gap: "0.375rem 0.625rem",
          minHeight: "2.75rem", padding: "0.5rem 1.25rem",
          borderRadius: "2rem",
          background: CREAM,
          border: `0.0625rem solid ${HAIRLINE}`,
          boxShadow: SHADOW[1],
          maxWidth: "100%",
        }}
      >
        <span aria-hidden="true" style={{
          width: "0.5rem", height: "0.5rem", borderRadius: "50%",
          background: SAGE, flexShrink: 0,
        }} />
        <span style={{ fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: 600, color: INK, whiteSpace: "nowrap" }}>
          {t("palaceLiveTitle")}
        </span>
        <span style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: MUTED }}>
          {t("palaceLiveHint")}
        </span>
        <Link
          href="/settings/sharing"
          className="explore-link"
          style={{
            display: "inline-flex", alignItems: "center", gap: "0.25rem",
            fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600,
            color: EMBER, textDecoration: "none", whiteSpace: "nowrap",
          }}
        >
          {t("palaceLiveManage")} {"→"}
        </Link>
      </div>
    </div>
  );
}

/* ── Lane header (Atrium canon): dot + overline + fading rule ── */

function LaneHeader({ children, badge }: { children: React.ReactNode; badge?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
      <span aria-hidden="true" style={{
        width: "0.6rem", height: "0.6rem", borderRadius: "50%",
        background: EMBER_GLYPH, flexShrink: 0,
      }} />
      <span style={{
        fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 700,
        letterSpacing: "0.12em", textTransform: "uppercase",
        color: EMBER_GLYPH, whiteSpace: "nowrap",
      }}>
        {children}
      </span>
      {badge}
      <span aria-hidden="true" style={{
        flex: 1, height: "0.0625rem",
        background: `linear-gradient(90deg, ${HAIRLINE}, transparent)`,
      }} />
    </div>
  );
}

/* ── Palace Grid ───────────────────────────────────── */

/**
 * Translation slice threaded down from the parent so cards don't each mount
 * their own useTranslation() instance (~36 duplicate locale subscriptions).
 */
type CardI18n = {
  t: (key: string, params?: Record<string, string>) => string;
  locale: string;
};

const PalaceGrid = React.memo(function PalaceGrid({
  palaces,
  i18n,
  featured = false,
}: {
  palaces: CardPalace[];
  i18n: CardI18n;
  featured?: boolean;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(16rem, 1fr))",
        gap: "0.875rem",
      }}
    >
      {palaces.map((p) => (
        <PalaceCard key={p.user_id} palace={p} i18n={i18n} featured={featured} />
      ))}
    </div>
  );
});

/* ── Palace Card (Atrium secondary-tile anatomy) ───── */

const PalaceCard = React.memo(function PalaceCard({
  palace,
  i18n,
  featured = false,
}: {
  palace: CardPalace;
  i18n: CardI18n;
  featured?: boolean;
}) {
  const { t, locale } = i18n;
  const [imgFailed, setImgFailed] = useState(false);

  // One destination per card: the public profile (SafetyMenu / follow live there).
  const href = palace.username ? `/u/${palace.username}` : `/visit/${palace.user_id}`;
  const showImg = !!palace.avatar_url && !imgFailed;

  const categoryKey = palace.category ? `category_${palace.category}` : null;
  const categoryLabel = categoryKey
    ? (t(categoryKey) === categoryKey ? formatSlug(palace.category as string) : t(categoryKey))
    : null;
  const meta = categoryLabel
    ? categoryLabel
    : palace.latest_published_at
      ? timeAgo(palace.latest_published_at, locale)
      : null;

  const wings = palace.published_wing_count;
  const visits = palace.total_visit_count;
  const statLine = [
    wings > 0
      ? t(wings === 1 ? "wingCount_one" : "wingCount_other", { count: String(wings) })
      : null,
    visits > 0
      ? t(visits === 1 ? "visitCount_one" : "visitCount_other", {
          count: new Intl.NumberFormat(locale).format(visits),
        })
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      href={href}
      className="explore-card"
      style={{
        display: "block",
        position: "relative",
        // Cream tile on the recessed tray — a step lighter than CARD_BG so the
        // card lifts from the tray tint (Atrium tile-on-tray grammar).
        background: CARD_ON_TRAY,
        border: `0.0625rem solid ${CARD_BORDER}`,
        borderTop: `0.1875rem solid ${EMBER}`,
        borderRadius: "1rem",
        boxShadow: `${featured ? SHADOW[2] : SHADOW[1]}, ${TOP_HIGHLIGHT}`,
        padding: "1rem 1.25rem 1.125rem",
        textDecoration: "none",
      }}
    >
      {/* The one legitimate ceremonial gold: the featured seal */}
      {featured && (
        <span
          role="img"
          aria-label={t("featured")}
          title={t("featured")}
          style={{ position: "absolute", top: "0.75rem", right: "0.875rem", display: "inline-flex" }}
        >
          <svg width="1rem" height="1rem" viewBox="0 0 24 24" fill={GOLD} stroke={GOLD} strokeWidth="1" strokeLinejoin="round" aria-hidden="true">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </span>
      )}

      <div style={{ display: "flex", gap: "0.875rem", alignItems: "flex-start" }}>
        {/* Avatar — real <img> so it lazy-loads; initial-letter fallback */}
        {showImg ? (
          <img
            src={palace.avatar_url as string}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setImgFailed(true)}
            style={{
              width: "3.25rem", height: "3.25rem", borderRadius: "50%",
              objectFit: "cover", flexShrink: 0,
              border: `0.0625rem solid ${HAIRLINE}`,
            }}
          />
        ) : (
          <div
            aria-hidden="true"
            style={{
              width: "3.25rem", height: "3.25rem", borderRadius: "50%", flexShrink: 0,
              background: TRAY,
              border: `0.0625rem solid ${HAIRLINE}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: EMBER_GLYPH, fontFamily: T.font.display,
              fontSize: "1.25rem", fontWeight: 600,
            }}
          >
            {palace.display_name?.[0]?.toUpperCase() || "?"}
          </div>
        )}

        {/* Name + username */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: T.font.display, fontSize: "1.0625rem",
            fontWeight: 600, color: INK,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            paddingRight: featured ? "1.25rem" : 0,
          }}>
            {palace.display_name || t("anonymous")}
          </div>
          {palace.username && (
            <div style={{
              fontFamily: T.font.body, fontSize: "0.8125rem",
              color: MUTED, marginTop: "0.0625rem",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              @{palace.username}
            </div>
          )}
          {meta && (
            <div style={{
              fontFamily: T.font.body, fontSize: "0.6875rem",
              color: MUTED, marginTop: "0.125rem",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {meta}
            </div>
          )}
        </div>
      </div>

      {/* Bio */}
      {palace.bio && (
        <p style={{
          fontFamily: T.font.body, fontSize: "0.8125rem",
          color: MUTED, margin: "0.75rem 0 0",
          lineHeight: 1.5, display: "-webkit-box",
          WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {palace.bio}
        </p>
      )}

      {/* Footer: one stat line + the card's single affordance */}
      <div style={{
        display: "flex", alignItems: "center", gap: "0.5rem",
        marginTop: "0.75rem", paddingTop: "0.625rem",
        borderTop: `0.0625rem solid ${HAIRLINE}`,
      }}>
        {statLine && (
          <span style={{
            fontFamily: T.font.body, fontSize: "0.75rem",
            fontVariantNumeric: "tabular-nums", color: EMBER_GLYPH,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {statLine}
          </span>
        )}
        <span style={{
          marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.25rem",
          fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 600, color: EMBER,
          whiteSpace: "nowrap",
        }}>
          {t("exploreVisitPalace")} →
        </span>
      </div>
    </Link>
  );
});

/* ── Empty State ──────────────────────────────────── */

function EmptyState({ text, hint }: { text: string; hint?: string }) {
  return (
    <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
      <div style={{
        width: "3rem", height: "3rem", margin: "0 auto 1rem",
        borderRadius: "50%",
        background: CREAM,
        border: `0.0625rem solid ${HAIRLINE}`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <svg width="1.25rem" height="1.25rem" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="1.5" aria-hidden="true">
          <circle cx="12" cy="12" r="10" /><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
        </svg>
      </div>
      <p style={{ fontFamily: T.font.display, fontSize: "1.25rem", color: INK, margin: "0 0 0.375rem" }}>
        {text}
      </p>
      {hint && (
        <p style={{ fontFamily: T.font.body, fontSize: "0.875rem", color: MUTED, margin: 0 }}>
          {hint}
        </p>
      )}
    </div>
  );
}
