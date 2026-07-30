"use client";
import { useState, useEffect, useCallback } from "react";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { getPendingInvites, acceptInvite, acceptWingInvite, declineInvite, declineWingInvite } from "@/lib/auth/invite-actions";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { localeDateCodes, type Locale } from "@/i18n/config";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";

interface PendingInvite {
  id: string;
  type: "wing" | "room";
  permission: string;
  message: string | null;
  createdAt: string;
  inviterName: string;
  inviterAvatar: string | null;
  roomName?: string;
  wingId?: string;
  wingName: string;
  wingIcon: string;
  canAdd?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

interface InviteNotificationsPanelProps {
  onClose: () => void;
  onNavigateToRoom?: (roomId: string) => void;
}

export default function InviteNotificationsPanel({ onClose, onNavigateToRoom }: InviteNotificationsPanelProps) {
  const { t, locale } = useTranslation("inviteNotifications");
  const { t: tc } = useTranslation("common");
  const isMobile = useIsMobile();
  const { containerRef, handleKeyDown } = useFocusTrap(true);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);

  const loadInvites = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    getPendingInvites()
      .then(result => setInvites(result.invites || []))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadInvites(); }, [loadInvites]);

  const handleAccept = async (inviteId: string) => {
    setProcessingId(inviteId);
    setError(null);
    const invite = invites.find(i => i.id === inviteId);
    const result = invite?.type === "wing"
      ? await acceptWingInvite(inviteId) as { error?: string; success?: boolean; alreadyAccepted?: boolean }
      : await acceptInvite(inviteId) as { error?: string; success?: boolean; alreadyAccepted?: boolean };
    if (result.error && !result.alreadyAccepted) {
      setError(result.error);
    } else {
      setInvites(prev => prev.filter(i => i.id !== inviteId));
    }
    setProcessingId(null);
  };

  const handleDecline = async (inviteId: string) => {
    setProcessingId(inviteId);
    setError(null);
    const invite = invites.find(i => i.id === inviteId);
    const result = invite?.type === "wing"
      ? await declineWingInvite(inviteId)
      : await declineInvite(inviteId);
    if (result.error) {
      setError(result.error);
    } else {
      setInvites(prev => prev.filter(i => i.id !== inviteId));
    }
    setProcessingId(null);
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t("justNow");
    if (mins < 60) return t("minutesAgo", { count: String(mins) });
    const hours = Math.floor(mins / 60);
    if (hours < 24) return t("hoursAgo", { count: String(hours) });
    const days = Math.floor(hours / 24);
    if (days === 1) return t("yesterday");
    if (days < 7) return t("daysAgo", { count: String(days) });
    return new Date(dateStr).toLocaleDateString(localeDateCodes[locale as Locale], { month: "short", day: "numeric" });
  };

  return (
    <div onClick={onClose} className="invnp-fade" style={{
      position: "absolute", inset: 0, background: "rgba(42,34,24,.4)",
      backdropFilter: "blur(8px)", zIndex: 55, animation: "fadeIn .2s ease",
    }}>
      <div ref={containerRef} role="dialog" aria-modal="true" aria-label={t("title")} onKeyDown={(e) => { if (e.key === "Escape") onClose(); handleKeyDown(e); }} onClick={e => e.stopPropagation()} className="invnp-panel" style={{
        position: "absolute", right: 0, top: 0, bottom: 0,
        width: isMobile ? "100%" : "min(23.75rem, 92vw)",
        background: `${T.color.linen}f8`, backdropFilter: "blur(20px)",
        borderLeft: isMobile ? "none" : "0.0625rem solid #E3D6BC", // Atrium token: opaque hairline
        boxShadow: "0 0.5rem 1.5rem rgba(64,59,54,0.14)", // Atrium token: S2 overlay shadow
        padding: isMobile ? "1.25rem 1rem" : "1.75rem 1.5rem",
        overflowY: "auto", animation: "slideInRight 0.3s ease",
      }}>
        <style>{`@keyframes slideInRight{from{opacity:0;transform:translateX(2.5rem)}to{opacity:1;transform:translateX(0)}}
.invnp-panel button:focus-visible{outline:0.1875rem solid #D4AF37;outline-offset:0.1875rem}
@media (prefers-reduced-motion: reduce){.invnp-fade,.invnp-panel{animation:none!important}}`}</style>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div>
            <h3 style={{ fontFamily: T.font.display, fontSize: "1.375rem", fontWeight: 600, lineHeight: 1.15, color: "#403B36", margin: 0 }}>
              {t("title")}
            </h3>
            <p style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E", margin: "0.25rem 0 0" }}>
              {invites.length > 0 ? t("pending", { count: String(invites.length) }) : t("noPending")}
            </p>
          </div>
          <button onClick={onClose} aria-label={tc("close")} style={{
            width: "2rem", height: "2rem", borderRadius: "1rem",
            border: "0.0625rem solid #E3D6BC", background: T.color.warmStone, // Atrium token: opaque hairline
            color: "#716A5E", fontSize: "0.8125rem", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            minWidth: "2.75rem", minHeight: "2.75rem",
          }}>&#x2715;</button>
        </div>

        {error && (
          <div role="alert" style={{
            padding: "0.625rem 0.875rem", background: `${T.color.error}10`, border: `0.0625rem solid ${T.color.error}30`,
            borderRadius: "0.75rem", marginBottom: "1rem", fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.error,
          }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: "2.5rem", color: "#716A5E", fontFamily: T.font.body, fontSize: "0.8125rem" }}>
            {t("loading")}
          </div>
        ) : loadError ? (
          <div style={{ textAlign: "center", padding: "2.5rem" }}>
            <div style={{ fontSize: "2.25rem", marginBottom: "0.75rem" }}>&#x26A0;&#xFE0F;</div>
            <p style={{ fontFamily: T.font.body, fontSize: "0.9375rem", color: "#403B36", margin: "0 0 1rem", lineHeight: 1.4 }}>
              {t("loadError")}
            </p>
            <button
              onClick={loadInvites}
              style={{
                padding: "0.625rem 1.25rem", borderRadius: "0.75rem", border: "none",
                background: "#B85C38", color: T.color.white,
                fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600, cursor: "pointer",
                minHeight: "2.75rem",
              }}
            >
              {t("retry")}
            </button>
          </div>
        ) : invites.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2.5rem" }}>
            <div style={{ fontSize: "2.25rem", marginBottom: "0.75rem" }}>&#x1F4EC;</div>
            <p style={{ fontFamily: T.font.display, fontSize: "1.1875rem", fontWeight: 600, lineHeight: 1.15, color: "#403B36", margin: "0 0 0.5rem" }}>
              {t("allCaughtUp")}
            </p>
            <p style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E", margin: 0 }}>
              {t("noPendingNow")}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {invites.map(invite => {
              const initial = invite.inviterName.charAt(0).toUpperCase();
              const isProcessing = processingId === invite.id;

              return (
                <div key={invite.id} style={{
                  padding: "1rem", background: T.color.white, borderRadius: "1rem",
                  // Atrium tokens: opaque hairline + S1 warm-ink card shadow + top highlight
                  border: "0.0625rem solid #E3D6BC", boxShadow: "0 0.25rem 1rem rgba(64,59,54,0.07), inset 0 0.0625rem 0 rgba(255,255,255,0.5)",
                }}>
                  {/* Inviter + room */}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", marginBottom: "0.75rem" }}>
                    <div style={{
                      width: "2.5rem", height: "2.5rem", borderRadius: "1.25rem",
                      background: "rgba(154,79,42,0.11)", // Atrium token: terracotta medallion tint
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: T.font.display, fontSize: "1rem", fontWeight: 600,
                      color: "#9A4F2A", flexShrink: 0, // Atrium token: terracotta glyph
                    }}>
                      {initial}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600, color: "#403B36" }}>
                        {invite.inviterName}
                      </div>
                      <div style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E", marginTop: "0.125rem" }}>
                        {invite.type === "wing"
                          ? <>{t("shared")} {invite.wingIcon} <strong>{invite.wingName}</strong> {t("wingLabel")}</>
                          : <>{t("shared")} <strong>{invite.roomName}</strong>{invite.wingName && <span> {t("in")} {invite.wingIcon} {invite.wingName}</span>}</>
                        }
                      </div>
                      <div style={{ display: "flex", gap: "0.375rem", marginTop: "0.375rem" }}>
                        <span style={{
                          padding: "0.125rem 0.5rem", borderRadius: "2rem",
                          // Atrium tokens: sage medallion tint / muted-ink tint
                          background: invite.permission === "contribute" ? "rgba(86,104,60,0.16)" : "rgba(113,106,94,0.12)",
                          fontFamily: T.font.body, fontSize: "0.6875rem",
                          color: invite.permission === "contribute" ? "#56683C" : "#716A5E",
                        }}>
                          {invite.permission === "contribute" ? t("canViewContribute") : t("canViewOnly")}
                        </span>
                        <span style={{
                          fontFamily: T.font.body, fontSize: "0.6875rem", color: "#716A5E",
                          display: "flex", alignItems: "center",
                        }}>
                          {timeAgo(invite.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Personal message */}
                  {invite.message && (
                    <div style={{
                      padding: "0.625rem 0.875rem", background: T.color.warmStone, borderRadius: "0.75rem",
                      borderLeft: "0.125rem solid #9A4F2A", marginBottom: "0.75rem", // Atrium token: terracotta glyph
                    }}>
                      <p style={{
                        fontFamily: T.font.body, fontSize: "0.8125rem", fontStyle: "italic",
                        color: "#403B36", margin: 0, lineHeight: 1.4,
                      }}>
                        &ldquo;{invite.message}&rdquo;
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button onClick={() => handleAccept(invite.id)} disabled={isProcessing}
                      onMouseEnter={e => { if (!isProcessing) e.currentTarget.style.opacity = "0.85"; }}
                      onMouseLeave={e => { e.currentTarget.style.opacity = isProcessing ? "0.6" : "1"; }}
                      style={{
                      flex: 1, padding: "0.625rem 0.875rem", borderRadius: "0.75rem", border: "none",
                      background: isProcessing ? T.color.sandstone : "#B85C38", // Atrium token: ember active
                      color: T.color.white, fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600,
                      cursor: isProcessing ? "default" : "pointer", opacity: isProcessing ? 0.6 : 1,
                      transition: "opacity 0.2s ease",
                    }}>
                      {isProcessing ? "..." : t("accept")}
                    </button>
                    <button onClick={() => handleDecline(invite.id)} disabled={isProcessing}
                      onMouseEnter={e => { if (!isProcessing) { e.currentTarget.style.background = T.color.warmStone; e.currentTarget.style.borderColor = T.color.sandstone; } }}
                      onMouseLeave={e => { e.currentTarget.style.background = T.color.white; e.currentTarget.style.borderColor = "#E3D6BC"; }}
                      style={{
                      flex: 1, padding: "0.625rem 0.875rem", borderRadius: "0.75rem",
                      border: "0.0625rem solid #E3D6BC", background: T.color.white, // Atrium token: opaque hairline
                      color: "#716A5E", fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 500,
                      cursor: isProcessing ? "default" : "pointer",
                      transition: "background 0.2s ease, border-color 0.2s ease",
                    }}>
                      {t("decline")}
                    </button>
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
