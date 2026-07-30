"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useIsMobile, useIsCompact } from "@/lib/hooks/useIsMobile";
import { useKepStore } from "@/lib/stores/kepStore";
import TuscanCard from "@/components/ui/TuscanCard";
import NavigationBar from "@/components/ui/NavigationBar";
import { T } from "@/lib/theme";
import type { PendingCaptureWithSuggestion } from "@/types/kep";

/* Canon media-type iconography — replaces emoji glyphs (route-helpers.getMediaTypeIcon)
   with warm-ink stroke SVGs from the app's icon vocabulary. Stroke = walnut,
   the same non-text ink used across capture chrome. */
function MediaTypeIcon({ mediaType, size = 20 }: { mediaType: string | null; size?: number }) {
  const stroke = T.color.walnut;
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke,
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (mediaType) {
    case "image":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <circle cx="8.5" cy="9.5" r="1.5" />
          <path d="M21 16l-5-5-9 9" />
        </svg>
      );
    case "video":
      return (
        <svg {...common}>
          <rect x="2" y="5" width="14" height="14" rx="2" />
          <path d="M16 9l6-3v12l-6-3z" />
        </svg>
      );
    case "audio":
      return (
        <svg {...common}>
          <rect x="9" y="2" width="6" height="12" rx="3" />
          <path d="M5 11a7 7 0 0 0 14 0" />
          <path d="M12 18v3" />
        </svg>
      );
    case "text":
      return (
        <svg {...common}>
          <path d="M4 7V5h16v2" />
          <path d="M9 20h6" />
          <path d="M12 5v15" />
        </svg>
      );
    case "document":
      return (
        <svg {...common}>
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
          <path d="M14 3v5h5" />
          <path d="M9 13h6M9 17h6" />
        </svg>
      );
    default:
      // paperclip — generic attachment fallback (was 📎)
      return (
        <svg {...common}>
          <path d="M21 8.5l-9.19 9.19a4 4 0 0 1-5.66-5.66l9.19-9.19a2.5 2.5 0 0 1 3.54 3.54l-9.2 9.19a1 1 0 0 1-1.41-1.41l8.49-8.49" />
        </svg>
      );
  }
}

/* Small canon "tag" mark for the kep-source badge — replaces the raw DB emoji
   glyph (capture.kep_icon) with a consistent warm-ink label icon. */
function KepTagIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={T.color.muted} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V4a2 2 0 0 1 2-2h8l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <circle cx="7" cy="7" r="1.2" fill={T.color.muted} stroke="none" />
    </svg>
  );
}

export default function PendingCapturesPage() {
  const { t } = useTranslation("kep");
  const isMobile = useIsMobile();
  const isCompact = useIsCompact();
  const router = useRouter();
  const { pendingCaptures, isLoading, error, fetchPendingCaptures, routeCaptures, rejectCaptures, clearError } = useKepStore();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [routeRoomId, setRouteRoomId] = useState("");

  const handleModeChange = (mode: string) => {
    if (mode === "atrium") router.push("/atrium");
    else if (mode === "3d") router.push("/palace");
    else if (mode === "library") router.push("/library");
  };

  // Localized noun for a capture's media type, reusing the MediaTypeIcon vocabulary.
  const mediaLabel = (mediaType: string | null): string => {
    const key = mediaType && ["image", "video", "audio", "text", "document"].includes(mediaType)
      ? `mediaType_${mediaType}`
      : "mediaType_attachment";
    return t(key);
  };

  // Preview label for a capture: real text/transcription, else a localized fallback.
  const capturePreview = (capture: PendingCaptureWithSuggestion): string => {
    const text = (capture.payload_preview as Record<string, unknown>)?.text as string | undefined;
    if (text) return text;
    if (capture.transcription) return capture.transcription.slice(0, 60);
    return t("capturePreviewFallback", {
      type: mediaLabel(capture.media_type),
      sender: capture.source_sender || t("unknownSender"),
    });
  };

  useEffect(() => {
    fetchPendingCaptures();
  }, [fetchPendingCaptures]);

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const selectAll = () => {
    if (selected.size === pendingCaptures.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pendingCaptures.map((c) => c.id)));
    }
  };

  const handleRoute = async () => {
    if (!routeRoomId || selected.size === 0) return;
    await routeCaptures(Array.from(selected), routeRoomId);
    setSelected(new Set());
  };

  const handleReject = async () => {
    if (selected.size === 0) return;
    await rejectCaptures(Array.from(selected));
    setSelected(new Set());
  };

  const handleAcceptSuggestion = async (capture: PendingCaptureWithSuggestion) => {
    if (!capture.ai_suggestion) return;
    await routeCaptures([capture.id], capture.ai_suggestion.room_id, capture.ai_suggestion.wing_id);
  };

  return (
    <div style={{
      padding: isCompact ? "1rem" : "1.5rem",
      paddingBottom: isMobile
        ? "calc(4.5rem + env(safe-area-inset-bottom, 0px))"
        : "calc(1.5rem + env(safe-area-inset-bottom, 0px))",
      maxWidth: isMobile ? "36rem" : "64rem",
      margin: "0 auto",
      background: T.color.cream,
      minHeight: "100dvh",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
        <button onClick={() => router.push("/palace/keps")} aria-label={t("back") !== "back" ? t("back") : "Back"} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.25rem", minHeight: "2.75rem", minWidth: "2.75rem", color: T.color.inkSoft, fontFamily: T.font.body }}>
          {"\u2190"}
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: isMobile ? "1.25rem" : "1.5rem", fontFamily: T.font.display, color: T.color.inkSoft }}>{t("pendingCaptures")}</h1>
          <p style={{ margin: "0.25rem 0 0", color: T.color.muted, fontSize: "0.875rem", fontFamily: T.font.body }}>{t("pendingDesc")}</p>
        </div>
      </div>

      {/* Error banner (distinct from empty state, with retry) */}
      {error && (
        <div role="alert" style={{
          padding: "0.875rem 1rem",
          marginBottom: "1rem",
          borderRadius: "0.5rem",
          background: `${T.color.error}12`,
          border: `1px solid ${T.color.error}55`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.75rem",
          flexWrap: "wrap",
          fontFamily: T.font.body,
        }}>
          <span style={{ fontSize: "0.875rem", color: T.color.inkSoft }}>
            {error === "routePartial" ? t("routePartialError") : t("loadError")}
          </span>
          <button
            onClick={() => { clearError(); fetchPendingCaptures(); }}
            style={{
              padding: "0.5rem 0.875rem",
              minHeight: "2.75rem",
              borderRadius: "0.5rem",
              background: T.color.ember,
              color: T.color.cream,
              border: "none",
              cursor: "pointer",
              fontSize: "0.8125rem",
              fontWeight: 600,
              fontFamily: T.font.body,
            }}
          >
            {t("retry")}
          </button>
        </div>
      )}

      {isLoading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: T.color.muted, fontFamily: T.font.body }}>{t("loading")}</div>
      ) : pendingCaptures.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem" }}>
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke={T.color.sage} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", margin: "0 auto 1rem" }} aria-hidden="true">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <polyline points="9 12 11 14 15 10" />
          </svg>
          <h2 style={{ marginTop: "1rem", fontFamily: T.font.display, color: T.color.inkSoft }}>{t("noPending")}</h2>
          <p style={{ color: T.color.muted, fontFamily: T.font.body }}>{t("noPendingDesc")}</p>
        </div>
      ) : (
        <>
          {/* Batch actions */}
          {selected.size > 0 && (
            <div style={{
              padding: "0.75rem 1rem",
              marginBottom: "1rem",
              borderRadius: "0.5rem",
              background: T.color.warmStone,
              border: `1px solid ${T.color.cream}`,
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              flexWrap: "wrap",
            }}>
              <span style={{ fontSize: "0.875rem", fontWeight: 500, fontFamily: T.font.body, color: T.color.inkSoft }}>{t("selectedCount", { count: String(selected.size) })}</span>
              <input
                placeholder={t("routeRoomPlaceholder")}
                aria-label={t("routeRoomPlaceholder")}
                value={routeRoomId}
                onChange={(e) => setRouteRoomId(e.target.value)}
                style={{ flex: 1, minWidth: "12rem", padding: "0.5rem 0.625rem", minHeight: "2.75rem", borderRadius: "0.5rem", border: `1px solid ${T.color.sandstone}`, fontSize: "1rem", fontFamily: T.font.body, color: T.color.inkSoft, background: T.color.cream }}
              />
              <button onClick={handleRoute} disabled={!routeRoomId} style={{ padding: "0.5rem 0.875rem", minHeight: "2.75rem", borderRadius: "0.5rem", background: T.color.ember, color: T.color.cream, border: "none", cursor: routeRoomId ? "pointer" : "not-allowed", opacity: routeRoomId ? 1 : 0.55, fontSize: "0.8125rem", fontWeight: 600, fontFamily: T.font.body }}>
                {t("routeTo")}
              </button>
              <button onClick={handleReject} style={{ padding: "0.5rem 0.875rem", minHeight: "2.75rem", borderRadius: "0.5rem", background: T.color.error, color: T.color.cream, border: "none", cursor: "pointer", fontSize: "0.8125rem", fontWeight: 600, fontFamily: T.font.body }}>
                {t("reject")}
              </button>
            </div>
          )}

          {/* Select all */}
          <div style={{ marginBottom: "0.75rem" }}>
            <label style={{ fontSize: "0.8125rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem", fontFamily: T.font.body, color: T.color.inkSoft }}>
              <input type="checkbox" checked={selected.size === pendingCaptures.length} onChange={selectAll} />
              {t("selectAll", { count: String(pendingCaptures.length) })}
            </label>
          </div>

          {/* Captures list */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
            {pendingCaptures.map((capture) => (
              <TuscanCard key={capture.id}>
                <div style={{ padding: "1rem", display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                  <input
                    type="checkbox"
                    checked={selected.has(capture.id)}
                    onChange={() => toggleSelect(capture.id)}
                    style={{ marginTop: "0.25rem" }}
                  />
                  <span style={{ display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "0.125rem" }}>
                    <MediaTypeIcon mediaType={capture.media_type} size={22} />
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontWeight: 500, fontSize: "0.875rem", fontFamily: T.font.body, color: T.color.inkSoft }}>
                        {capturePreview(capture)}
                      </span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", fontSize: "0.6875rem", color: T.color.muted, background: T.color.warmStone, padding: "0.125rem 0.375rem", borderRadius: "0.25rem" }}>
                        <KepTagIcon size={11} />
                        {capture.kep_name}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.75rem", color: T.color.muted, marginTop: "0.25rem" }}>
                      {capture.source_sender && `${capture.source_sender} \u00B7 `}
                      {new Date(capture.created_at).toLocaleString()}
                    </div>

                    {/* AI suggestion */}
                    {capture.ai_suggestion && (
                      <div style={{
                        marginTop: "0.5rem",
                        padding: "0.5rem 0.75rem",
                        borderRadius: "0.5rem",
                        background: `${T.color.gold}0D`,
                        border: `1px solid ${T.color.gold}35`,
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        fontSize: "0.8125rem",
                        fontFamily: T.font.body,
                        color: T.color.inkSoft,
                      }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.color.gold} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }} aria-hidden="true">
                          <path d="M12 3l1.9 3.9L18 8l-3.1 1.1L14 13l-2-3.9L8 8l3.1-1.1z" />
                          <circle cx="6" cy="17" r="1.5" />
                          <circle cx="18" cy="16" r="1.5" />
                        </svg>
                        <span style={{ flex: 1 }}>
                          {t("aiSuggestion", { room: capture.ai_suggestion.room_name })}
                          {" "}({t("confidence", { pct: String(Math.round(capture.ai_suggestion.confidence * 100)) })})
                        </span>
                        <button
                          onClick={() => handleAcceptSuggestion(capture)}
                          style={{ padding: "0.375rem 0.75rem", minHeight: "2.75rem", borderRadius: "0.5rem", background: T.color.ember, color: T.color.cream, border: "none", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600, fontFamily: T.font.body }}
                        >
                          {t("acceptSuggestion")}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </TuscanCard>
            ))}
          </div>
        </>
      )}

      {/* Mobile NavigationBar — parity with keps/page.tsx */}
      {isMobile && (
        <NavigationBar
          currentMode="atrium"
          onModeChange={handleModeChange}
          onNotifications={() => router.push("/palace?notifications=1")}
          isMobile={true}
          activeTab={null}
        />
      )}
    </div>
  );
}
