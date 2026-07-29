"use client";
import { useState, useEffect } from "react";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { getAcceptedShares } from "@/lib/auth/invite-actions";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";

interface WingSubRoom {
  id: string;
  name: string;
  icon: string;
  memoryCount: number;
}

interface AcceptedShare {
  id: string;
  type: "wing" | "room";
  roomId?: string;
  wingId?: string;
  permission: string;
  acceptedAt: string;
  ownerName: string;
  ownerAvatar: string | null;
  roomName?: string;
  wingName: string;
  wingIcon: string;
  memoryCount?: number;
  canAdd?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  placedInWingId?: string;
  rooms?: WingSubRoom[];
}

interface SharedWithMePanelProps {
  onClose: () => void;
  onNavigateToRoom?: (roomId: string, wingId?: string) => void;
}

export default function SharedWithMePanel({ onClose, onNavigateToRoom }: SharedWithMePanelProps) {
  const { t } = useTranslation("sharedWithMe");
  const { t: tc } = useTranslation("common");
  const isMobile = useIsMobile();
  const { containerRef, handleKeyDown } = useFocusTrap(true);
  const [shares, setShares] = useState<AcceptedShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    getAcceptedShares()
      .then(result => {
        if (cancelled) return;
        setShares((result.shares as AcceptedShare[]) || []);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  // Group by owner
  const grouped = shares.reduce<Record<string, { ownerName: string; ownerAvatar: string | null; rooms: AcceptedShare[] }>>((acc, share) => {
    if (!acc[share.ownerName]) {
      acc[share.ownerName] = { ownerName: share.ownerName, ownerAvatar: share.ownerAvatar, rooms: [] };
    }
    acc[share.ownerName].rooms.push(share);
    return acc;
  }, {});

  return (
    <div className="swm-overlay" onClick={onClose} style={{
      position: "absolute", inset: 0, background: "rgba(42,34,24,.4)",
      backdropFilter: "blur(8px)", zIndex: 55, animation: "fadeIn .2s ease",
    }}>
      <div ref={containerRef} className="swm-panel" role="dialog" aria-modal="true" aria-label={t("title")} onKeyDown={(e) => { if (e.key === "Escape") onClose(); handleKeyDown(e); }} onClick={e => e.stopPropagation()} style={{
        position: "absolute", right: 0, top: 0, bottom: 0,
        width: isMobile ? "100%" : "min(25rem, 92vw)",
        background: `${T.color.cream}f8`, backdropFilter: "blur(20px)",
        borderLeft: isMobile ? "none" : "0.0625rem solid #E3D6BC", // Atrium token: hairline
        boxShadow: "0 0.5rem 1.5rem rgba(64,59,54,0.14)", // Atrium token: S2 overlay shadow
        padding: isMobile ? "1.25rem 1rem" : "1.75rem 1.5rem",
        overflowY: "auto", animation: "slideInRight .3s ease",
      }}>
        <style>{`@keyframes slideInRight{from{opacity:0;transform:translateX(2.5rem)}to{opacity:1;transform:translateX(0)}}
.swm-panel button:focus-visible{outline:0.1875rem solid #D4AF37;outline-offset:0.1875rem}
@media (prefers-reduced-motion: reduce){.swm-overlay,.swm-panel{animation:none !important}}`}</style>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div>
            <h3 style={{ fontFamily: T.font.display, fontSize: "1.375rem", fontWeight: 600, color: "#403B36" /* Atrium token: ink */, margin: 0 }}>
              {t("title")}
            </h3>
            <p style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E" /* Atrium token: muted */, margin: "0.25rem 0 0" }}>
              {shares.length > 0 ? t("roomCount", { count: String(shares.length) }) : t("noRooms")}
            </p>
          </div>
          <button onClick={onClose} aria-label={tc("close")} style={{
            width: "2rem", height: "2rem", borderRadius: "1rem",
            border: "0.0625rem solid #E3D6BC" /* Atrium token: hairline */, background: T.color.warmStone,
            color: "#716A5E" /* Atrium token: muted */, fontSize: "0.8125rem", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            minWidth: "2.75rem", minHeight: "2.75rem",
          }}>&#x2715;</button>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "2.5rem", color: "#716A5E" /* Atrium token: muted */, fontFamily: T.font.body, fontSize: "0.8125rem" }}>
            {t("loading")}
          </div>
        ) : error ? (
          <div style={{ textAlign: "center", padding: "2.5rem" }}>
            <div style={{ fontSize: "2.25rem", marginBottom: "0.75rem" }}>&#x26A0;&#xFE0F;</div>
            <p style={{ fontFamily: T.font.body, fontSize: "0.9375rem", color: "#403B36" /* Atrium token: ink */, margin: "0 0 1rem", lineHeight: 1.4 }}>
              {t("loadError")}
            </p>
            <button
              onClick={() => {
                setLoading(true);
                setError(false);
                getAcceptedShares()
                  .then(result => setShares((result.shares as AcceptedShare[]) || []))
                  .catch(() => setError(true))
                  .finally(() => setLoading(false));
              }}
              style={{
                padding: "0.625rem 1.25rem", borderRadius: "0.75rem", border: "none",
                background: "#B85C38" /* Atrium token: ember */, color: T.color.white,
                fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600, cursor: "pointer",
                minHeight: "2.75rem",
              }}
            >
              {t("retry")}
            </button>
          </div>
        ) : shares.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2.5rem" }}>
            <div style={{ fontSize: "2.25rem", marginBottom: "0.75rem" }}>&#x1F3DB;&#xFE0F;</div>
            <p style={{ fontFamily: T.font.display, fontSize: "1.1875rem", fontWeight: 600, color: "#403B36" /* Atrium token: ink */, margin: "0 0 0.5rem" }}>
              {t("noRooms")}
            </p>
            <p style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E" /* Atrium token: muted */, margin: 0, lineHeight: 1.4 }}>
              {t("emptyDesc")}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {Object.values(grouped).map(group => {
              const initial = group.ownerName.charAt(0).toUpperCase();

              return (
                <div key={group.ownerName}>
                  {/* Owner header */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.625rem" }}>
                    <div style={{
                      width: "2rem", height: "2rem", borderRadius: "1rem",
                      background: "rgba(154,79,42,0.11)" /* Atrium token: terracotta medallion */,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: T.font.display, fontSize: "0.8125rem", fontWeight: 600,
                      color: "#9A4F2A" /* Atrium token: terracotta glyph */, flexShrink: 0,
                    }}>
                      {initial}
                    </div>
                    <div>
                      <div style={{ fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600, color: "#403B36" /* Atrium token: ink */ }}>
                        {t("roomsShared", { count: String(group.rooms.length) })}
                      </div>
                      <div style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E" /* Atrium token: muted */ }}>
                        {t("sharedBy", { name: group.ownerName })}
                      </div>
                    </div>
                  </div>

                  {/* Share cards */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", paddingLeft: "2.625rem" }}>
                    {group.rooms.map(share => (
                      share.type === "wing" ? (
                        <div
                          key={share.id}
                          style={{
                            padding: "0.875rem 1rem", background: T.color.white, borderRadius: "0.75rem",
                            border: "0.0625rem solid #E3D6BC" /* Atrium token: hairline */,
                            boxShadow: "0 0.25rem 1rem rgba(64,59,54,0.07)" /* Atrium token: S1 */,
                          }}
                        >
                          {/* Wing header */}
                          <div style={{ display: "flex", gap: "0.5rem", marginBottom: (share.rooms && share.rooms.length > 0) ? "0.625rem" : 0, alignItems: "center" }}>
                            <div style={{ fontFamily: T.font.body, fontSize: "0.9375rem", fontWeight: 600, color: "#403B36" /* Atrium token: ink */ }}>
                              {share.wingIcon} {share.wingName}
                            </div>
                            <span style={{
                              padding: "0.0625rem 0.375rem", borderRadius: "2rem",
                              background: share.permission === "contribute" ? "rgba(86,104,60,0.16)" /* Atrium token: sage medallion */ : "rgba(113,106,94,0.12)",
                              fontFamily: T.font.body, fontSize: "0.8125rem",
                              color: share.permission === "contribute" ? "#56683C" /* Atrium token: sage */ : "#716A5E" /* Atrium token: muted */,
                            }}>
                              {share.permission === "contribute" ? t("permContribute") : t("permView")}
                            </span>
                          </div>
                          {/* Sub-rooms */}
                          {share.rooms && share.rooms.length > 0 ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                              {share.rooms.map(room => (
                                <button
                                  key={room.id}
                                  onClick={() => onNavigateToRoom?.(room.id, share.wingId)}
                                  style={{
                                    padding: "0.5rem 0.75rem", background: T.color.cream, borderRadius: "0.5rem",
                                    border: "0.0625rem solid #E3D6BC" /* Atrium token: hairline */, cursor: "pointer",
                                    display: "flex", alignItems: "center", justifyContent: "space-between",
                                    textAlign: "left", transition: "background 0.2s ease", minHeight: "2.75rem",
                                  }}
                                >
                                  <span style={{ fontFamily: T.font.body, fontSize: "0.9375rem", color: "#403B36" /* Atrium token: ink */ }}>
                                    {room.icon} {room.name}
                                  </span>
                                  <span style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                                    <span style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E" /* Atrium token: muted */ }}>
                                      {t("memories", { count: String(room.memoryCount ?? 0) })}
                                    </span>
                                    <span style={{ fontSize: "0.9375rem", color: "#716A5E" /* Atrium token: muted */ }}>&#x2192;</span>
                                  </span>
                                </button>
                              ))}
                            </div>
                          ) : (
                            <div style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E" /* Atrium token: muted */ }}>
                              {t("emptyWing")}
                            </div>
                          )}
                        </div>
                      ) : (
                        <button
                          key={share.id}
                          onClick={() => share.roomId && onNavigateToRoom?.(share.roomId, share.placedInWingId ?? share.wingId)}
                          style={{
                            padding: "0.875rem 1rem", background: T.color.white, borderRadius: "0.75rem",
                            border: "0.0625rem solid #E3D6BC" /* Atrium token: hairline */, cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            textAlign: "left", transition: "all 0.2s ease", minHeight: "2.75rem",
                            boxShadow: "0 0.25rem 1rem rgba(64,59,54,0.07)" /* Atrium token: S1 */,
                          }}
                        >
                          <div>
                            <div style={{ fontFamily: T.font.body, fontSize: "0.9375rem", fontWeight: 600, color: "#403B36" /* Atrium token: ink */ }}>
                              {share.roomName}
                            </div>
                            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem", alignItems: "center" }}>
                              {share.wingName && (
                                <span style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E" /* Atrium token: muted */ }}>
                                  {share.wingIcon} {share.wingName}
                                </span>
                              )}
                              <span style={{
                                padding: "0.0625rem 0.375rem", borderRadius: "2rem",
                                background: share.permission === "contribute" ? "rgba(86,104,60,0.16)" /* Atrium token: sage medallion */ : "rgba(113,106,94,0.12)",
                                fontFamily: T.font.body, fontSize: "0.8125rem",
                                color: share.permission === "contribute" ? "#56683C" /* Atrium token: sage */ : "#716A5E" /* Atrium token: muted */,
                              }}>
                                {share.permission === "contribute" ? t("permContribute") : t("permView")}
                              </span>
                              <span style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E" /* Atrium token: muted */ }}>
                                {t("memories", { count: String(share.memoryCount ?? 0) })}
                              </span>
                            </div>
                          </div>
                          <span style={{ fontSize: "0.9375rem", color: "#716A5E" /* Atrium token: muted */ }}>&#x2192;</span>
                        </button>
                      )
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
