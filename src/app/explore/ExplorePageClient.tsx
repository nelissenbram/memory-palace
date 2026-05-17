"use client";

import React, { useState, useRef, useTransition } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import PalaceCard from "@/components/social/PalaceCard";
import { TuscanSectionHeader } from "@/components/ui/TuscanCard";
import { useRouter } from "next/navigation";
import { searchPalaces } from "@/lib/social/directory-actions";
import type { DirectoryPalace } from "@/lib/social/directory-actions";

interface ExplorePageClientProps {
  featured: DirectoryPalace[];
  trending: DirectoryPalace[];
  newest: DirectoryPalace[];
}

export default function ExplorePageClient({
  featured,
  trending,
  newest,
}: ExplorePageClientProps) {
  const { t } = useTranslation("social");
  const { t: tc } = useTranslation("common");
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<DirectoryPalace[] | null>(
    null
  );
  const [isPending, startTransition] = useTransition();
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
    }
  };

  return (
    <div
      style={{
        maxWidth: "56rem",
        margin: "0 auto",
        padding: "2rem 1rem calc(5rem + env(safe-area-inset-bottom, 0px))",
        minHeight: "100vh",
        background: T.color.linen,
      }}
    >
      {/* Back button */}
      <button
        onClick={() => router.back()}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.375rem",
          fontFamily: T.font.body,
          fontSize: "0.875rem",
          fontWeight: 500,
          color: T.color.walnut,
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "0.5rem 0",
          marginBottom: "0.75rem",
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M19 12H5" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        {tc("back")}
      </button>

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
