"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useKepStore } from "@/lib/stores/kepStore";
import TuscanCard from "@/components/ui/TuscanCard";
import { getMediaTypeIcon, formatConfidence, canRoute } from "@/lib/kep/route-helpers";
import type { PendingCaptureWithSuggestion } from "@/types/kep";

export default function PendingCapturesPage() {
  const { t } = useTranslation("kep");
  const router = useRouter();
  const { pendingCaptures, isLoading, fetchPendingCaptures, routeCaptures, rejectCaptures } = useKepStore();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [routeRoomId, setRouteRoomId] = useState("");

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
    <div style={{ padding: "1.5rem", maxWidth: "64rem", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
        <button onClick={() => router.push("/palace/keps")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.25rem" }}>
          \u2190
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.5rem" }}>{t("pendingCaptures")}</h1>
          <p style={{ margin: "0.25rem 0 0", color: "#6b7280", fontSize: "0.875rem" }}>{t("pendingDesc")}</p>
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#6b7280" }}>{t("loading")}</div>
      ) : pendingCaptures.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem" }}>
          <span style={{ fontSize: "3rem" }}>\u2705</span>
          <h2 style={{ marginTop: "1rem" }}>{t("noPending")}</h2>
          <p style={{ color: "#6b7280" }}>{t("noPendingDesc")}</p>
        </div>
      ) : (
        <>
          {/* Batch actions */}
          {selected.size > 0 && (
            <div style={{
              padding: "0.75rem 1rem",
              marginBottom: "1rem",
              borderRadius: "0.5rem",
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              flexWrap: "wrap",
            }}>
              <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>{t("selectedCount", { count: String(selected.size) })}</span>
              <input
                placeholder={t("routeRoomPlaceholder")}
                value={routeRoomId}
                onChange={(e) => setRouteRoomId(e.target.value)}
                style={{ flex: 1, minWidth: "12rem", padding: "0.375rem 0.625rem", borderRadius: "0.25rem", border: "1px solid #d1d5db", fontSize: "0.8125rem" }}
              />
              <button onClick={handleRoute} disabled={!routeRoomId} style={{ padding: "0.375rem 0.75rem", borderRadius: "0.25rem", background: "#10b981", color: "#fff", border: "none", cursor: "pointer", fontSize: "0.8125rem", fontWeight: 500 }}>
                {t("routeTo")}
              </button>
              <button onClick={handleReject} style={{ padding: "0.375rem 0.75rem", borderRadius: "0.25rem", background: "#ef4444", color: "#fff", border: "none", cursor: "pointer", fontSize: "0.8125rem", fontWeight: 500 }}>
                {t("reject")}
              </button>
            </div>
          )}

          {/* Select all */}
          <div style={{ marginBottom: "0.75rem" }}>
            <label style={{ fontSize: "0.8125rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <input type="checkbox" checked={selected.size === pendingCaptures.length} onChange={selectAll} />
              Select all ({pendingCaptures.length})
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
                  <span style={{ fontSize: "1.5rem" }}>{getMediaTypeIcon(capture.media_type)}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontWeight: 500, fontSize: "0.875rem" }}>
                        {(capture.payload_preview as Record<string, unknown>)?.text as string || capture.transcription?.slice(0, 60) || `${capture.media_type} from ${capture.source_sender || "unknown"}`}
                      </span>
                      <span style={{ fontSize: "0.6875rem", color: "#9ca3af", background: "#f3f4f6", padding: "0.0625rem 0.375rem", borderRadius: "0.25rem" }}>
                        {capture.kep_icon} {capture.kep_name}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "0.25rem" }}>
                      {capture.source_sender && `${capture.source_sender} \u00B7 `}
                      {new Date(capture.created_at).toLocaleString()}
                    </div>

                    {/* AI suggestion */}
                    {capture.ai_suggestion && (
                      <div style={{
                        marginTop: "0.5rem",
                        padding: "0.5rem 0.75rem",
                        borderRadius: "0.375rem",
                        background: "#eff6ff",
                        border: "1px solid #bfdbfe",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        fontSize: "0.8125rem",
                      }}>
                        <span>{"\u{1F916}"}</span>
                        <span style={{ flex: 1 }}>
                          {t("aiSuggestion", { room: capture.ai_suggestion.room_name })}
                          {" "}({t("confidence", { pct: formatConfidence(capture.ai_suggestion) })})
                        </span>
                        <button
                          onClick={() => handleAcceptSuggestion(capture)}
                          style={{ padding: "0.25rem 0.625rem", borderRadius: "0.25rem", background: "#10b981", color: "#fff", border: "none", cursor: "pointer", fontSize: "0.75rem", fontWeight: 500 }}
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
    </div>
  );
}
