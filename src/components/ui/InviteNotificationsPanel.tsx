"use client";
import { useState, useEffect } from "react";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { getPendingInvites, acceptInvite, acceptWingInvite, declineInvite } from "@/lib/auth/invite-actions";
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

  useEffect(() => {
    getPendingInvites().then(result => {
      setInvites(result.invites || []);
      setLoading(false);
    });
  }, []);

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
    const result = await declineInvite(inviteId);
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
    <div onClick={onClose} style={{
      position: "absolute", inset: 0, background: "rgba(42,34,24,.4)",
      backdropFilter: "blur(8px)", zIndex: 55, animation: "fadeIn .2s ease",
    }}>
      <div ref={containerRef} role="dialog" aria-modal="true" aria-label={t("title")} onKeyDown={(e) => { if (e.key === "Escape") onClose(); handleKeyDown(e); }} onClick={e => e.stopPropagation()} style={{
        position: "absolute", right: 0, top: 0, bottom: 0,
        width: isMobile ? "100%" : "min(23.75rem, 92vw)",
        background: `${T.color.linen}f8`, backdropFilter: "blur(20px)",
        borderLeft: isMobile ? "none" : `1px solid ${T.color.cream}`,
        padding: isMobile ? "1.25rem 1rem" : "1.75rem 1.5rem",
        overflowY: "auto", animation: "slideInRight .3s cubic-bezier(.23,1,.32,1)",
      }}>
        <style>{`@keyframes slideInRight{from{opacity:0;transform:translateX(2.5rem)}to{opacity:1;transform:translateX(0)}}`}</style>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div>
            <h3 style={{ fontFamily: T.font.display, fontSize: "1.375rem", fontWeight: 500, color: T.color.charcoal, margin: 0 }}>
              {t("title")}
            </h3>
            <p style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.muted, margin: "0.25rem 0 0" }}>
              {invites.length > 0 ? t("pending", { count: String(invites.length) }) : t("noPending")}
            </p>
          </div>
          <button onClick={onClose} aria-label={tc("close")} style={{
            width: "2rem", height: "2rem", borderRadius: "1rem",
            border: `1px solid ${T.color.cream}`, background: T.color.warmStone,
            color: T.color.muted, fontSize: "0.875rem", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            minWidth: "2.75rem", minHeight: "2.75rem",
          }}>&#x2715;</button>
        </div>

        {error && (
          <div role="alert" style={{
            padding: "0.625rem 0.875rem", background: `${T.color.error}10`, border: `1px solid ${T.color.error}30`,
            borderRadius: "0.625rem", marginBottom: "1rem", fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.error,
          }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: "2.5rem", color: T.color.muted, fontFamily: T.font.body, fontSize: "0.8125rem" }}>
            {t("loading")}
          </div>
        ) : invites.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2.5rem" }}>
            <div style={{ fontSize: "2.25rem", marginBottom: "0.75rem" }}>&#x1F4EC;</div>
            <p style={{ fontFamily: T.font.display, fontSize: "1.125rem", color: T.color.charcoal, margin: "0 0 0.5rem" }}>
              {t("allCaughtUp")}
            </p>
            <p style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.muted, margin: 0 }}>
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
                  padding: "1rem", background: T.color.white, borderRadius: "0.875rem",
                  border: `1px solid ${T.color.cream}`, boxShadow: "0 2px 8px rgba(44,44,42,.06)",
                }}>
                  {/* Inviter + room */}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", marginBottom: "0.75rem" }}>
                    <div style={{
                      width: "2.5rem", height: "2.5rem", borderRadius: "1.25rem",
                      background: `linear-gradient(135deg, ${T.color.terracotta}25, ${T.color.walnut}15)`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: T.font.display, fontSize: "1rem", fontWeight: 600,
                      color: T.color.terracotta, flexShrink: 0,
                    }}>
                      {initial}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600, color: T.color.charcoal }}>
                        {invite.inviterName}
                      </div>
                      <div style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.muted, marginTop: "0.125rem" }}>
                        {invite.type === "wing"
                          ? <>{t("shared")} {invite.wingIcon} <strong>{invite.wingName}</strong> {t("wingLabel")}</>
                          : <>{t("shared")} <strong>{invite.roomName}</strong>{invite.wingName && <span> {t("in")} {invite.wingIcon} {invite.wingName}</span>}</>
                        }
                      </div>
                      <div style={{ display: "flex", gap: "0.375rem", marginTop: "0.375rem" }}>
                        <span style={{
                          padding: "0.125rem 0.5rem", borderRadius: "0.75rem",
                          background: invite.permission === "contribute" ? `${T.color.sage}12` : `${T.color.walnut}12`,
                          fontFamily: T.font.body, fontSize: "0.625rem",
                          color: invite.permission === "contribute" ? T.color.sage : T.color.walnut,
                        }}>
                          {invite.permission === "contribute" ? t("canViewContribute") : t("canViewOnly")}
                        </span>
                        <span style={{
                          fontFamily: T.font.body, fontSize: "0.625rem", color: T.color.muted,
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
                      padding: "0.625rem 0.875rem", background: T.color.warmStone, borderRadius: "0.625rem",
                      borderLeft: `2px solid ${T.color.terracotta}`, marginBottom: "0.75rem",
                    }}>
                      <p style={{
                        fontFamily: T.font.body, fontSize: "0.75rem", fontStyle: "italic",
                        color: T.color.charcoal, margin: 0, lineHeight: 1.5,
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
                      flex: 1, padding: "0.625rem 0.875rem", borderRadius: "0.625rem", border: "none",
                      background: isProcessing ? T.color.sandstone : `linear-gradient(135deg, ${T.color.terracotta}, ${T.color.walnut})`,
                      color: T.color.white, fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 600,
                      cursor: isProcessing ? "default" : "pointer", opacity: isProcessing ? 0.6 : 1,
                      transition: "opacity .15s",
                    }}>
                      {isProcessing ? "..." : t("accept")}
                    </button>
                    <button onClick={() => handleDecline(invite.id)} disabled={isProcessing}
                      onMouseEnter={e => { if (!isProcessing) { e.currentTarget.style.background = T.color.warmStone; e.currentTarget.style.borderColor = T.color.sandstone; } }}
                      onMouseLeave={e => { e.currentTarget.style.background = T.color.white; e.currentTarget.style.borderColor = T.color.cream; }}
                      style={{
                      flex: 1, padding: "0.625rem 0.875rem", borderRadius: "0.625rem",
                      border: `1px solid ${T.color.cream}`, background: T.color.white,
                      color: T.color.muted, fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 500,
                      cursor: isProcessing ? "default" : "pointer",
                      transition: "background .15s, border-color .15s",
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
