"use client";
import { useState, useEffect } from "react";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { getPendingInvites, acceptInvite, declineInvite } from "@/lib/auth/invite-actions";
import { useTranslation } from "@/lib/hooks/useTranslation";

interface PendingInvite {
  id: string;
  permission: string;
  message: string | null;
  createdAt: string;
  inviterName: string;
  inviterAvatar: string | null;
  roomName: string;
  wingName: string;
  wingIcon: string;
}

interface InviteNotificationsPanelProps {
  onClose: () => void;
  onNavigateToRoom?: (roomId: string) => void;
}

export default function InviteNotificationsPanel({ onClose, onNavigateToRoom }: InviteNotificationsPanelProps) {
  const { t, locale } = useTranslation("inviteNotifications");
  const isMobile = useIsMobile();
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
    const result = await acceptInvite(inviteId) as { error?: string; success?: boolean; alreadyAccepted?: boolean };
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
    return new Date(dateStr).toLocaleDateString(locale === "nl" ? "nl-NL" : "en-US", { month: "short", day: "numeric" });
  };

  return (
    <div onClick={onClose} style={{
      position: "absolute", inset: 0, background: "rgba(42,34,24,.4)",
      backdropFilter: "blur(8px)", zIndex: 55, animation: "fadeIn .2s ease",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        position: "absolute", right: 0, top: 0, bottom: 0,
        width: isMobile ? "100%" : "min(380px, 92vw)",
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
              {invites.length > 0 ? t("pending", { count: String(invites.length) }) : t("noPending")}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" style={{
            width: 32, height: 32, borderRadius: 16,
            border: `1px solid ${T.color.cream}`, background: T.color.warmStone,
            color: T.color.muted, fontSize: 14, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>&#x2715;</button>
        </div>

        {error && (
          <div role="alert" style={{
            padding: "10px 14px", background: "#C0505010", border: "1px solid #C0505030",
            borderRadius: 10, marginBottom: 16, fontFamily: T.font.body, fontSize: 12, color: "#C05050",
          }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: T.color.muted, fontFamily: T.font.body, fontSize: 13 }}>
            {t("loading")}
          </div>
        ) : invites.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>&#x1F4EC;</div>
            <p style={{ fontFamily: T.font.display, fontSize: 18, color: T.color.charcoal, margin: "0 0 8px" }}>
              {t("allCaughtUp")}
            </p>
            <p style={{ fontFamily: T.font.body, fontSize: 13, color: T.color.muted, margin: 0 }}>
              {t("noPendingNow")}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {invites.map(invite => {
              const initial = invite.inviterName.charAt(0).toUpperCase();
              const isProcessing = processingId === invite.id;

              return (
                <div key={invite.id} style={{
                  padding: 16, background: T.color.white, borderRadius: 14,
                  border: `1px solid ${T.color.cream}`, boxShadow: "0 2px 8px rgba(44,44,42,.06)",
                }}>
                  {/* Inviter + room */}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 20,
                      background: `linear-gradient(135deg, ${T.color.terracotta}25, ${T.color.walnut}15)`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: T.font.display, fontSize: 16, fontWeight: 600,
                      color: T.color.terracotta, flexShrink: 0,
                    }}>
                      {initial}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: T.font.body, fontSize: 13, fontWeight: 600, color: T.color.charcoal }}>
                        {invite.inviterName}
                      </div>
                      <div style={{ fontFamily: T.font.body, fontSize: 12, color: T.color.muted, marginTop: 2 }}>
                        {t("shared")} <strong>{invite.roomName}</strong>
                        {invite.wingName && <span> {t("in")} {invite.wingIcon} {invite.wingName}</span>}
                      </div>
                      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                        <span style={{
                          padding: "2px 8px", borderRadius: 12,
                          background: invite.permission === "contribute" ? `${T.color.sage}12` : `${T.color.walnut}12`,
                          fontFamily: T.font.body, fontSize: 10,
                          color: invite.permission === "contribute" ? T.color.sage : T.color.walnut,
                        }}>
                          {invite.permission === "contribute" ? t("canViewContribute") : t("canViewOnly")}
                        </span>
                        <span style={{
                          fontFamily: T.font.body, fontSize: 10, color: T.color.muted,
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
                      padding: "10px 14px", background: T.color.warmStone, borderRadius: 10,
                      borderLeft: `2px solid ${T.color.terracotta}`, marginBottom: 12,
                    }}>
                      <p style={{
                        fontFamily: T.font.body, fontSize: 12, fontStyle: "italic",
                        color: T.color.charcoal, margin: 0, lineHeight: 1.5,
                      }}>
                        &ldquo;{invite.message}&rdquo;
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => handleAccept(invite.id)} disabled={isProcessing} style={{
                      flex: 1, padding: "10px 14px", borderRadius: 10, border: "none",
                      background: isProcessing ? T.color.sandstone : `linear-gradient(135deg, ${T.color.terracotta}, ${T.color.walnut})`,
                      color: "#FFF", fontFamily: T.font.body, fontSize: 12, fontWeight: 600,
                      cursor: isProcessing ? "default" : "pointer", opacity: isProcessing ? 0.6 : 1,
                    }}>
                      {isProcessing ? "..." : t("accept")}
                    </button>
                    <button onClick={() => handleDecline(invite.id)} disabled={isProcessing} style={{
                      flex: 1, padding: "10px 14px", borderRadius: 10,
                      border: `1px solid ${T.color.cream}`, background: T.color.white,
                      color: T.color.muted, fontFamily: T.font.body, fontSize: 12, fontWeight: 500,
                      cursor: isProcessing ? "default" : "pointer",
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
