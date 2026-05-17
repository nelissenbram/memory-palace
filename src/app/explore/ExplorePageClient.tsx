"use client";

import React, { useState, useRef, useTransition, Suspense } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import PalaceCard from "@/components/social/PalaceCard";
import { TuscanSectionHeader } from "@/components/ui/TuscanCard";
import { useRouter } from "next/navigation";
import { searchPalaces } from "@/lib/social/directory-actions";
import type { DirectoryPalace } from "@/lib/social/directory-actions";
import NavigationBar from "@/components/ui/NavigationBar";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { usePalaceStore } from "@/lib/stores/palaceStore";

interface ExplorePageClientProps {
  featured: DirectoryPalace[];
  trending: DirectoryPalace[];
  newest: DirectoryPalace[];
  isAuthenticated?: boolean;
}

export default function ExplorePageClient({
  featured,
  trending,
  newest,
  isAuthenticated = false,
}: ExplorePageClientProps) {
  const { t } = useTranslation("social");
  const router = useRouter();
  const isMobile = useIsMobile();
  const navMode = usePalaceStore((s) => s.navMode);
  const setNavMode = usePalaceStore((s) => s.setNavMode);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<DirectoryPalace[] | null>(
    null
  );
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleSearch = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 2) {
      setSearchResults(null);
      return;
    }
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const results = await searchPalaces(value.trim());
        setSearchResults(results);
      });
    }, 300);
  };

  const navigateToProfile = (palace: DirectoryPalace) => {
    if (palace.username) {
      router.push(`/u/${palace.username}`);
    } else {
      router.push(`/visit/${palace.user_id}/`);
    }
  };

  const handleModeChange = (mode: "atrium" | "library" | "3d") => {
    setNavMode(mode);
    router.push(mode === "3d" ? "/palace" : `/${mode}`);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
        background: `linear-gradient(165deg, ${T.color.linen} 0%, ${T.color.warmStone} 50%, ${T.color.sandstone}40 100%)`,
        paddingTop: isAuthenticated && !isMobile ? "3.5rem" : undefined,
        paddingBottom: isAuthenticated && isMobile
          ? "calc(3.5rem + env(safe-area-inset-bottom, 0px))"
          : "2rem",
        zIndex: 1,
      }}
    >
      {/* Desktop NavigationBar — Explore tab active via pathname */}
      {isAuthenticated && !isMobile && (
        <NavigationBar
          currentMode={navMode}
          onModeChange={handleModeChange}
          onNotifications={() => router.push("/atrium?notifications=1")}
          isMobile={false}
        />
      )}

      {/* Scrollable content */}
      <div
        style={{
          maxWidth: "56rem",
          margin: "0 auto",
          padding: "2rem 1rem",
        }}
      >

      {/* Header */}
      <h1
        style={{
          fontFamily: T.font.display,
          fontSize: "2rem",
          fontWeight: 600,
          color: T.color.charcoal,
          margin: "0 0 0.5rem",
        }}
      >
        {t("exploreTitle")}
      </h1>
      <p
        style={{
          fontFamily: T.font.body,
          fontSize: "1rem",
          color: T.color.walnut,
          margin: "0 0 1.5rem",
        }}
      >
        {t("exploreSubtitle")}
      </p>

      {/* Publish CTA — for authenticated users only */}
      {isAuthenticated && (
        <div style={{ marginBottom: "1.75rem" }}>
          <button
            onClick={() => setShowPublishModal(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              fontFamily: T.font.body,
              fontSize: "0.9375rem",
              fontWeight: 600,
              padding: "0.75rem 1.5rem",
              borderRadius: "0.75rem",
              border: "none",
              background: `linear-gradient(135deg, ${T.color.gold}, ${T.color.goldDark})`,
              color: T.color.cream,
              cursor: "pointer",
              boxShadow: `0 2px 8px ${T.color.gold}40`,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            {t("publishYourPalace")}
          </button>
        </div>
      )}

      {/* Search */}
      <div style={{ marginBottom: "2rem" }}>
        <input
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder={t("searchPalaces")}
          aria-label={t("searchPalaces")}
          style={{
            width: "100%",
            fontFamily: T.font.body,
            fontSize: "1rem",
            padding: "0.75rem 1.25rem",
            borderRadius: "0.75rem",
            border: `1px solid ${T.color.sandstone}`,
            background: T.color.cream,
            color: T.color.charcoal,
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Search results */}
      {searchResults !== null ? (
        <section>
          <TuscanSectionHeader>
            {t("searchResults")} ({searchResults.length})
          </TuscanSectionHeader>
          {searchResults.length === 0 ? (
            <p
              style={{
                fontFamily: T.font.body,
                fontSize: "0.9375rem",
                color: T.color.muted,
                textAlign: "center",
                padding: "2rem 0",
              }}
            >
              {t("noResults")}
            </p>
          ) : (
            <PalaceGrid
              palaces={searchResults}
              onPalaceClick={navigateToProfile}
            />
          )}
        </section>
      ) : (
        <>
          {/* Featured */}
          {featured.length > 0 && (
            <section style={{ marginBottom: "2.5rem" }}>
              <TuscanSectionHeader>{t("featured")}</TuscanSectionHeader>
              <PalaceGrid
                palaces={featured}
                onPalaceClick={navigateToProfile}
              />
            </section>
          )}

          {/* Trending */}
          {trending.length > 0 && (
            <section style={{ marginBottom: "2.5rem" }}>
              <TuscanSectionHeader>{t("trending")}</TuscanSectionHeader>
              <PalaceGrid
                palaces={trending}
                onPalaceClick={navigateToProfile}
              />
            </section>
          )}

          {/* Newest */}
          {newest.length > 0 && (
            <section style={{ marginBottom: "2.5rem" }}>
              <TuscanSectionHeader>{t("newest")}</TuscanSectionHeader>
              <PalaceGrid
                palaces={newest}
                onPalaceClick={navigateToProfile}
              />
            </section>
          )}

          {/* Empty state when nothing published yet */}
          {featured.length === 0 &&
            trending.length === 0 &&
            newest.length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  padding: "4rem 1rem",
                }}
              >
                <p
                  style={{
                    fontFamily: T.font.display,
                    fontSize: "1.375rem",
                    color: T.color.charcoal,
                    marginBottom: "0.5rem",
                  }}
                >
                  {t("exploreEmpty")}
                </p>
                <p
                  style={{
                    fontFamily: T.font.body,
                    fontSize: "0.9375rem",
                    color: T.color.muted,
                  }}
                >
                  {t("exploreEmptyHint")}
                </p>
              </div>
            )}
        </>
      )}
      </div>

      {/* Mobile bottom NavigationBar — Explore tab active via pathname */}
      {isAuthenticated && isMobile && (
        <NavigationBar
          currentMode={navMode}
          onModeChange={handleModeChange}
          onNotifications={() => router.push("/atrium?notifications=1")}
          isMobile={true}
        />
      )}

      {/* Publish-all-wings modal triggered from the CTA */}
      {showPublishModal && (
        <Suspense fallback={null}>
          <PublishAllModal
            onClose={() => setShowPublishModal(false)}
            onPublished={() => setShowPublishModal(false)}
          />
        </Suspense>
      )}
    </div>
  );
}

function PalaceGrid({
  palaces,
  onPalaceClick,
}: {
  palaces: DirectoryPalace[];
  onPalaceClick: (p: DirectoryPalace) => void;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(16rem, 1fr))",
        gap: "0.75rem",
      }}
    >
      {palaces.map((p) => (
        <PalaceCard
          key={p.user_id}
          palace={p}
          onClick={() => onPalaceClick(p)}
        />
      ))}
    </div>
  );
}

/** Modal that publishes ALL user wings at once (Issue 4) */
function PublishAllModal({
  onClose,
  onPublished,
}: {
  onClose: () => void;
  onPublished?: () => void;
}) {
  const { t } = useTranslation("social");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"public" | "followers">("public");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<number | null>(null);

  const handlePublishAll = () => {
    startTransition(async () => {
      setError(null);
      const { publishAllWings } = await import("@/lib/social/share-actions");
      const result = await publishAllWings({
        description: description.trim() || undefined,
        visibility,
      });
      if (!result.ok) {
        setError(result.error || t("publishError"));
        return;
      }
      setDone(result.count);
      setTimeout(() => {
        onPublished?.();
        onClose();
      }, 1500);
    });
  };

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isPending) onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isPending, onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="publish-all-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(0.25rem)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isPending) onClose();
      }}
    >
      <div
        style={{
          width: "min(28rem, 90vw)",
          maxHeight: "80vh",
          overflow: "auto",
          background: T.color.cream,
          borderRadius: "1rem",
          padding: "2rem",
          boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
        }}
      >
        <h2
          id="publish-all-title"
          style={{
            fontFamily: T.font.display,
            fontSize: "1.5rem",
            fontWeight: 600,
            color: T.color.charcoal,
            margin: "0 0 0.25rem",
          }}
        >
          {t("publishAllTitle")}
        </h2>
        <p
          style={{
            fontFamily: T.font.body,
            fontSize: "0.875rem",
            color: T.color.muted,
            margin: "0 0 1.5rem",
          }}
        >
          {t("publishAllSubtitle")}
        </p>

        {done !== null ? (
          <p
            style={{
              fontFamily: T.font.body,
              fontSize: "1rem",
              color: T.color.charcoal,
              textAlign: "center",
              padding: "1rem 0",
            }}
          >
            {t("publishAllDone", { count: String(done) })}
          </p>
        ) : (
          <>
            {/* Description */}
            <label
              htmlFor="pub-all-desc"
              style={{
                fontFamily: T.font.body,
                fontSize: "0.8125rem",
                fontWeight: 600,
                color: T.color.charcoal,
                display: "block",
                marginBottom: "0.375rem",
              }}
            >
              {t("description")}
            </label>
            <textarea
              id="pub-all-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder={t("publishDescPlaceholder")}
              style={{
                width: "100%",
                fontFamily: T.font.body,
                fontSize: "0.875rem",
                padding: "0.625rem 0.875rem",
                borderRadius: "0.625rem",
                border: `1px solid ${T.color.sandstone}`,
                background: T.color.linen,
                color: T.color.charcoal,
                resize: "vertical",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <div
              style={{
                fontFamily: T.font.body,
                fontSize: "0.75rem",
                color: T.color.muted,
                textAlign: "right",
                marginTop: "0.25rem",
              }}
            >
              {description.length}/500
            </div>

            {/* Visibility */}
            <label
              style={{
                fontFamily: T.font.body,
                fontSize: "0.8125rem",
                fontWeight: 600,
                color: T.color.charcoal,
                display: "block",
                margin: "1.25rem 0 0.5rem",
              }}
            >
              {t("visibility")}
            </label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {(["public", "followers"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setVisibility(v)}
                  style={{
                    flex: 1,
                    fontFamily: T.font.body,
                    fontSize: "0.8125rem",
                    fontWeight: visibility === v ? 600 : 400,
                    padding: "0.625rem",
                    borderRadius: "0.5rem",
                    border: `1px solid ${visibility === v ? T.color.gold : T.color.sandstone}`,
                    background: visibility === v ? `${T.color.gold}15` : "transparent",
                    color: visibility === v ? T.color.goldDark : T.color.walnut,
                    cursor: "pointer",
                  }}
                >
                  {t(`visibility_${v}`)}
                </button>
              ))}
            </div>

            {error && (
              <p
                style={{
                  fontFamily: T.font.body,
                  fontSize: "0.8125rem",
                  color: T.color.error,
                  margin: "1rem 0 0",
                }}
              >
                {error}
              </p>
            )}

            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                justifyContent: "flex-end",
                marginTop: "1.5rem",
              }}
            >
              <button
                onClick={onClose}
                disabled={isPending}
                style={{
                  fontFamily: T.font.body,
                  fontSize: "0.875rem",
                  padding: "0.625rem 1.25rem",
                  borderRadius: "0.625rem",
                  border: `1px solid ${T.color.sandstone}`,
                  background: "transparent",
                  color: T.color.walnut,
                  cursor: "pointer",
                }}
              >
                {t("cancel")}
              </button>
              <button
                onClick={handlePublishAll}
                disabled={isPending}
                style={{
                  fontFamily: T.font.body,
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  padding: "0.625rem 1.5rem",
                  borderRadius: "0.625rem",
                  border: "none",
                  background: `linear-gradient(135deg, ${T.color.gold}, ${T.color.goldDark})`,
                  color: T.color.cream,
                  cursor: isPending ? "wait" : "pointer",
                  opacity: isPending ? 0.6 : 1,
                }}
              >
                {isPending ? t("publishing") : t("publishAll")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
