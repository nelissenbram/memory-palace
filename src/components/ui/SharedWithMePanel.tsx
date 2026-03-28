"use client";
import { useState, useEffect } from "react";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { getAcceptedShares } from "@/lib/auth/invite-actions";
import { useTranslation } from "@/lib/hooks/useTranslation";

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
      <div onClick={e => e.stopPropagation()} style={{
        position: "absolute", right: 0, top: 0, bottom: 0,
        width: isMobile ? "100%" : "min(400px, 92vw)",
        background: `${T.color.linen}f8`, backdropFilter: "blur(20px)",
        borderLeft: isMobile ? "none" : `1px solid ${T.color.cream}`,
        padding: isMobile ? "20px 16px" : "28px 24px",
        overflowY: "auto", animation: "slideInRight .3s cubic-bezier(.23,1,.32,1)",
      }}>
        <style>{`@keyframes slideInRight{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}`}</style>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h3 style={{ fontFamily: T.font.display, fontSize: 22, fontWeight: 500, color: T.color.charcoal, margin: 0 }}>
              {t("title")}
            </h3>
            <p style={{ fontFamily: T.font.body, fontSize: 12, color: T.color.muted, margin: "4px 0 0" }}>
              {shares.length > 0 ? t("roomCount", { count: String(shares.length) }) : t("noRooms")}
            </p>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 16,
            border: `1px solid ${T.color.cream}`, background: T.color.warmStone,
            color: T.color.muted, fontSize: 14, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>&#x2715;</button>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: T.color.muted, fontFamily: T.font.body, fontSize: 13 }}>
            {t("loading")}
          </div>
        ) : shares.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>&#x1F3DB;&#xFE0F;</div>
            <p style={{ fontFamily: T.font.display, fontSize: 18, color: T.color.charcoal, margin: "0 0 8px" }}>
              {t("noRooms")}
            </p>
            <p style={{ fontFamily: T.font.body, fontSize: 13, color: T.color.muted, margin: 0, lineHeight: 1.6 }}>
              {t("emptyDesc")}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {Object.values(grouped).map(group => {
              const initial = group.ownerName.charAt(0).toUpperCase();

              return (
                <div key={group.ownerName}>
                  {/* Owner header */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 16,
                      background: `linear-gradient(135deg, ${T.color.terracotta}25, ${T.color.walnut}15)`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: T.font.display, fontSize: 14, fontWeight: 600,
                      color: T.color.terracotta, flexShrink: 0,
                    }}>
                      {initial}
                    </div>
                    <div>
                      <div style={{ fontFamily: T.font.body, fontSize: 13, fontWeight: 600, color: T.color.charcoal }}>
                        {group.ownerName}{t("palace")}
                      </div>
                      <div style={{ fontFamily: T.font.body, fontSize: 11, color: T.color.muted }}>
                        {t("roomsShared", { count: String(group.rooms.length) })}
                      </div>
                    </div>
                  </div>

                  {/* Room cards */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingLeft: 42 }}>
                    {group.rooms.map(share => (
                      <button
                        key={share.id}
                        onClick={() => onNavigateToRoom?.(share.roomId)}
                        style={{
                          padding: "14px 16px", background: T.color.white, borderRadius: 12,
                          border: `1px solid ${T.color.cream}`, cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          textAlign: "left", transition: "all .15s",
                          boxShadow: "0 1px 4px rgba(44,44,42,.04)",
                        }}
                      >
                        <div>
                          <div style={{ fontFamily: T.font.body, fontSize: 13, fontWeight: 600, color: T.color.charcoal }}>
                            {share.roomName}
                          </div>
                          <div style={{ display: "flex", gap: 8, marginTop: 4, alignItems: "center" }}>
                            {share.wingName && (
                              <span style={{ fontFamily: T.font.body, fontSize: 11, color: T.color.muted }}>
                                {share.wingIcon} {share.wingName}
                              </span>
                            )}
                            <span style={{
                              padding: "1px 6px", borderRadius: 8,
                              background: share.permission === "contribute" ? `${T.color.sage}12` : `${T.color.walnut}10`,
                              fontFamily: T.font.body, fontSize: 10,
                              color: share.permission === "contribute" ? T.color.sage : T.color.walnut,
                            }}>
                              {share.permission}
                            </span>
                            <span style={{ fontFamily: T.font.body, fontSize: 10, color: T.color.sandstone }}>
                              {t("memories", { count: String(share.memoryCount) })}
                            </span>
                          </div>
                        </div>
                        <span style={{ fontSize: 14, color: T.color.sandstone }}>&#x2192;</span>
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
