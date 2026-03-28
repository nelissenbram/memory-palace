"use client";
import { useState, useEffect } from "react";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { getAcceptedShares } from "@/lib/auth/invite-actions";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";

interface AcceptedShare {
  id: string;
  roomId: string;
  permission: string;
  acceptedAt: string;
  ownerName: string;
  ownerAvatar: string | null;
  roomName: string;
  wingName: string;
  wingIcon: string;
  memoryCount: number;
}

interface SharedWithMePanelProps {
  onClose: () => void;
  onNavigateToRoom?: (roomId: string) => void;
}

export default function SharedWithMePanel({ onClose, onNavigateToRoom }: SharedWithMePanelProps) {
  const { t } = useTranslation("sharedWithMe");
  const isMobile = useIsMobile();
  const { containerRef, handleKeyDown } = useFocusTrap(true);
  const [shares, setShares] = useState<AcceptedShare[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAcceptedShares().then(result => {
      setShares(result.shares || []);
      setLoading(false);
    });
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
    <div onClick={onClose} style={{
      position: "absolute", inset: 0, background: "rgba(42,34,24,.4)",
      backdropFilter: "blur(8px)", zIndex: 55, animation: "fadeIn .2s ease",
    }}>
      <div ref={containerRef} role="dialog" aria-modal="true" aria-label={t("title")} onKeyDown={(e) => { if (e.key === "Escape") onClose(); handleKeyDown(e); }} onClick={e => e.stopPropagation()} style={{
        position: "absolute", right: 0, top: 0, bottom: 0,
        width: isMobile ? "100%" : "min(25rem, 92vw)",
        background: `${T.color.linen}f8`, backdropFilter: "blur(20px)",
        borderLeft: isMobile ? "none" : `1px solid ${T.color.cream}`,
        padding: isMobile ? "1.25rem 1rem" : "1.75rem 1.5rem",
        overflowY: "auto", animation: "slideInRight .3s cubic-bezier(.23,1,.32,1)",
      }}>
        <style>{`@keyframes slideInRight{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}`}</style>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div>
            <h3 style={{ fontFamily: T.font.display, fontSize: "1.375rem", fontWeight: 500, color: T.color.charcoal, margin: 0 }}>
              {t("title")}
            </h3>
            <p style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.muted, margin: "0.25rem 0 0" }}>
              {shares.length > 0 ? t("roomCount", { count: String(shares.length) }) : t("noRooms")}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" style={{
            width: "2rem", height: "2rem", borderRadius: "1rem",
            border: `1px solid ${T.color.cream}`, background: T.color.warmStone,
            color: T.color.muted, fontSize: "0.875rem", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>&#x2715;</button>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "2.5rem", color: T.color.muted, fontFamily: T.font.body, fontSize: "0.8125rem" }}>
            {t("loading")}
          </div>
        ) : shares.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2.5rem" }}>
            <div style={{ fontSize: "2.25rem", marginBottom: "0.75rem" }}>&#x1F3DB;&#xFE0F;</div>
            <p style={{ fontFamily: T.font.display, fontSize: "1.125rem", color: T.color.charcoal, margin: "0 0 0.5rem" }}>
              {t("noRooms")}
            </p>
            <p style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.muted, margin: 0, lineHeight: 1.6 }}>
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
                      background: `linear-gradient(135deg, ${T.color.terracotta}25, ${T.color.walnut}15)`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: T.font.display, fontSize: "0.875rem", fontWeight: 600,
                      color: T.color.terracotta, flexShrink: 0,
                    }}>
                      {initial}
                    </div>
                    <div>
                      <div style={{ fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600, color: T.color.charcoal }}>
                        {group.ownerName}{t("palace")}
                      </div>
                      <div style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.muted }}>
                        {t("roomsShared", { count: String(group.rooms.length) })}
                      </div>
                    </div>
                  </div>

                  {/* Room cards */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", paddingLeft: "2.625rem" }}>
                    {group.rooms.map(share => (
                      <button
                        key={share.id}
                        onClick={() => onNavigateToRoom?.(share.roomId)}
                        style={{
                          padding: "0.875rem 1rem", background: T.color.white, borderRadius: "0.75rem",
                          border: `1px solid ${T.color.cream}`, cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          textAlign: "left", transition: "all .15s",
                          boxShadow: "0 1px 4px rgba(44,44,42,.04)",
                        }}
                      >
                        <div>
                          <div style={{ fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600, color: T.color.charcoal }}>
                            {share.roomName}
                          </div>
                          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem", alignItems: "center" }}>
                            {share.wingName && (
                              <span style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.muted }}>
                                {share.wingIcon} {share.wingName}
                              </span>
                            )}
                            <span style={{
                              padding: "1px 0.375rem", borderRadius: "0.5rem",
                              background: share.permission === "contribute" ? `${T.color.sage}12` : `${T.color.walnut}10`,
                              fontFamily: T.font.body, fontSize: "0.625rem",
                              color: share.permission === "contribute" ? T.color.sage : T.color.walnut,
                            }}>
                              {share.permission === "contribute" ? t("permContribute") : t("permView")}
                            </span>
                            <span style={{ fontFamily: T.font.body, fontSize: "0.625rem", color: T.color.sandstone }}>
                              {t("memories", { count: String(share.memoryCount) })}
                            </span>
                          </div>
                        </div>
                        <span style={{ fontSize: "0.875rem", color: T.color.sandstone }}>&#x2192;</span>
                      </button>
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
