"use client";
import { useState, useEffect, useCallback } from "react";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import {
  getAllMyShares,
  leaveWingShare,
  leaveRoomShare,
  updateSharePermissions,
} from "@/lib/auth/sharing-actions";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SentWingShare {
  id: string;
  wing_id: string;
  shared_with_email: string;
  shared_with_id: string;
  status: string;
  can_add: boolean;
  can_edit: boolean;
  can_delete: boolean;
  created_at: string;
  recipientName?: string;
  wingName: string;
  wingIcon: string;
}

interface SentRoomShare {
  id: string;
  room_id: string;
  shared_with_email: string;
  status: string;
  can_add: boolean;
  can_edit: boolean;
  can_delete: boolean;
  created_at: string;
  recipientName?: string;
  roomName: string;
  roomIcon: string;
  wingName: string;
}

interface ReceivedWingShare {
  id: string;
  wing_id: string;
  owner_id: string;
  status: string;
  can_add: boolean;
  can_edit: boolean;
  can_delete: boolean;
  created_at: string;
  ownerName: string;
  wingName: string;
  wingIcon: string;
}

interface ReceivedRoomShare {
  id: string;
  room_id: string;
  owner_id: string;
  status: string;
  can_add: boolean;
  can_edit: boolean;
  can_delete: boolean;
  placed_in_wing_id: string;
  created_at: string;
  ownerName: string;
  roomName: string;
  roomIcon: string;
  placedInWingName?: string;
}

interface ShareData {
  sent: { wings: SentWingShare[]; rooms: SentRoomShare[] };
  received: { wings: ReceivedWingShare[]; rooms: ReceivedRoomShare[] };
}

interface SharingSettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

/* ------------------------------------------------------------------ */
/*  Tiny toggle switch (iOS-style)                                     */
/* ------------------------------------------------------------------ */

function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      style={{
        width: "2.25rem",
        height: "1.25rem",
        borderRadius: "0.625rem",
        border: "none",
        background: checked ? T.color.terracotta : T.color.sandstone,
        cursor: disabled ? "default" : "pointer",
        position: "relative",
        transition: "background .2s",
        flexShrink: 0,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div
        style={{
          width: "0.875rem",
          height: "0.875rem",
          borderRadius: "50%",
          background: "#FFF",
          position: "absolute",
          top: "0.1875rem",
          left: checked ? "1.1875rem" : "0.1875rem",
          transition: "left .2s",
          boxShadow: "0 1px 3px rgba(0,0,0,.2)",
        }}
      />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Inline confirmation dialog                                         */
/* ------------------------------------------------------------------ */

function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
  confirmLabel,
  cancelLabel,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel: string;
  cancelLabel: string;
}) {
  return (
    <div
      style={{
        marginTop: "0.5rem",
        padding: "0.75rem",
        background: `${T.color.error}08`,
        border: `1px solid ${T.color.error}25`,
        borderRadius: "0.5rem",
      }}
    >
      <p
        style={{
          fontFamily: T.font.body,
          fontSize: "0.75rem",
          color: T.color.charcoal,
          margin: "0 0 0.5rem",
          lineHeight: 1.5,
        }}
      >
        {message}
      </p>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button
          onClick={onConfirm}
          style={{
            padding: "0.375rem 0.75rem",
            borderRadius: "0.375rem",
            border: "none",
            background: T.color.terracotta,
            color: "#FFF",
            fontFamily: T.font.body,
            fontSize: "0.6875rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {confirmLabel}
        </button>
        <button
          onClick={onCancel}
          style={{
            padding: "0.375rem 0.75rem",
            borderRadius: "0.375rem",
            border: `1px solid ${T.color.cream}`,
            background: T.color.white,
            color: T.color.muted,
            fontFamily: T.font.body,
            fontSize: "0.6875rem",
            cursor: "pointer",
          }}
        >
          {cancelLabel}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Status badge                                                       */
/* ------------------------------------------------------------------ */

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "accepted"
      ? T.color.sage
      : status === "declined"
        ? T.color.error
        : T.color.muted;
  const bg =
    status === "accepted"
      ? `${T.color.sage}15`
      : status === "declined"
        ? `${T.color.error}12`
        : `${T.color.muted}12`;
  return (
    <span
      style={{
        padding: "0.125rem 0.5rem",
        borderRadius: "0.625rem",
        background: bg,
        fontFamily: T.font.body,
        fontSize: "0.625rem",
        fontWeight: 600,
        color,
        textTransform: "capitalize",
      }}
    >
      {status}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Type badge (Wing / Room)                                           */
/* ------------------------------------------------------------------ */

function TypeBadge({ type }: { type: "wing" | "room" }) {
  const isWing = type === "wing";
  return (
    <span
      style={{
        padding: "0.125rem 0.4375rem",
        borderRadius: "0.25rem",
        background: isWing ? `${T.color.walnut}12` : `${T.color.terracotta}12`,
        fontFamily: T.font.body,
        fontSize: "0.5625rem",
        fontWeight: 600,
        color: isWing ? T.color.walnut : T.color.terracotta,
        textTransform: "uppercase",
        letterSpacing: "0.03rem",
      }}
    >
      {type}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Permission badge (read-only, for "Shared with me" tab)             */
/* ------------------------------------------------------------------ */

function PermissionBadge({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <span
      style={{
        padding: "0.125rem 0.375rem",
        borderRadius: "0.25rem",
        background: enabled ? `${T.color.sage}12` : `${T.color.muted}08`,
        fontFamily: T.font.body,
        fontSize: "0.5625rem",
        color: enabled ? T.color.sage : T.color.sandstone,
        fontWeight: enabled ? 600 : 400,
      }}
    >
      {label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function SharingSettingsPanel({ open, onClose }: SharingSettingsPanelProps) {
  const isMobile = useIsMobile();
  const { t } = useTranslation("sharingSettings");
  const { t: tc } = useTranslation("common");
  const { containerRef, handleKeyDown } = useFocusTrap(open);

  const [activeTab, setActiveTab] = useState<"sent" | "received">("sent");
  const [data, setData] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmingRevoke, setConfirmingRevoke] = useState<string | null>(null);
  const [confirmingLeave, setConfirmingLeave] = useState<string | null>(null);
  const [updatingPerm, setUpdatingPerm] = useState<string | null>(null);

  /* Fetch data when panel opens */
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    getAllMyShares()
      .then((result) => setData(result))
      .catch(() => setError(t("loadError")))
      .finally(() => setLoading(false));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Permission toggle handler */
  const handlePermToggle = useCallback(
    async (
      shareId: string,
      type: "wing" | "room",
      field: "can_add" | "can_edit" | "can_delete",
      value: boolean,
    ) => {
      if (!data) return;
      setUpdatingPerm(shareId + field);

      // Optimistic update
      setData((prev) => {
        if (!prev) return prev;
        const key = type === "wing" ? "wings" : "rooms";
        return {
          ...prev,
          sent: {
            ...prev.sent,
            [key]: prev.sent[key].map((s: SentWingShare | SentRoomShare) =>
              s.id === shareId ? { ...s, [field]: value } : s,
            ),
          },
        };
      });

      try {
        const table = type === "wing" ? "wing_shares" as const : "room_shares" as const;
        await updateSharePermissions(shareId, table, { [field]: value });
      } catch {
        // Revert on failure
        setData((prev) => {
          if (!prev) return prev;
          const key = type === "wing" ? "wings" : "rooms";
          return {
            ...prev,
            sent: {
              ...prev.sent,
              [key]: prev.sent[key].map((s: SentWingShare | SentRoomShare) =>
                s.id === shareId ? { ...s, [field]: !value } : s,
              ),
            },
          };
        });
        setError(t("updateError"));
      }
      setUpdatingPerm(null);
    },
    [data, t],
  );

  /* Revoke handler */
  const handleRevoke = useCallback(
    async (shareId: string, type: "wing" | "room") => {
      setData((prev) => {
        if (!prev) return prev;
        const key = type === "wing" ? "wings" : "rooms";
        return {
          ...prev,
          sent: {
            ...prev.sent,
            [key]: prev.sent[key].filter((s: SentWingShare | SentRoomShare) => s.id !== shareId),
          },
        };
      });
      setConfirmingRevoke(null);

      try {
        if (type === "wing") {
          await leaveWingShare(shareId);
        } else {
          await leaveRoomShare(shareId);
        }
      } catch {
        setError(t("revokeError"));
        // Re-fetch to restore state
        getAllMyShares().then((result) => setData(result));
      }
    },
    [t],
  );

  /* Leave handler */
  const handleLeave = useCallback(
    async (shareId: string, type: "wing" | "room") => {
      setData((prev) => {
        if (!prev) return prev;
        const key = type === "wing" ? "wings" : "rooms";
        return {
          ...prev,
          received: {
            ...prev.received,
            [key]: prev.received[key].filter(
              (s: ReceivedWingShare | ReceivedRoomShare) => s.id !== shareId,
            ),
          },
        };
      });
      setConfirmingLeave(null);

      try {
        if (type === "wing") {
          await leaveWingShare(shareId);
        } else {
          await leaveRoomShare(shareId);
        }
      } catch {
        setError(t("leaveError"));
        getAllMyShares().then((result) => setData(result));
      }
    },
    [t],
  );

  if (!open) return null;

  const sentCount =
    (data?.sent.wings.length || 0) + (data?.sent.rooms.length || 0);
  const receivedCount =
    (data?.received.wings.length || 0) + (data?.received.rooms.length || 0);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(42,34,24,.4)",
        backdropFilter: "blur(8px)",
        zIndex: 100,
        animation: "fadeIn .2s ease",
      }}
    >
      <style>{`
        @keyframes slideInRight{from{opacity:0;transform:translateX(2.5rem)}to{opacity:1;transform:translateX(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
      `}</style>

      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label={t("title")}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
          handleKeyDown(e);
        }}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "fixed",
          right: 0,
          top: 0,
          bottom: 0,
          width: isMobile ? "100%" : "24rem",
          background: `${T.color.linen}f8`,
          backdropFilter: "blur(20px)",
          borderLeft: isMobile ? "none" : `1px solid ${T.color.cream}`,
          display: "flex",
          flexDirection: "column",
          animation: "slideInRight .3s cubic-bezier(.23,1,.32,1)",
        }}
      >
        {/* ---- Header ---- */}
        <div
          style={{
            padding: isMobile ? "1.25rem 1rem 0" : "1.75rem 1.5rem 0",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
            }}
          >
            <h2
              style={{
                fontFamily: T.font.display,
                fontSize: "1.375rem",
                fontWeight: 600,
                color: T.color.charcoal,
                margin: 0,
              }}
            >
              {t("title")}
            </h2>
            <button
              onClick={onClose}
              aria-label={tc("close")}
              style={{
                width: "2rem",
                height: "2rem",
                borderRadius: "1rem",
                border: `1px solid ${T.color.cream}`,
                background: T.color.warmStone,
                color: T.color.muted,
                fontSize: "0.875rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              &#x2715;
            </button>
          </div>

          {/* ---- Tabs ---- */}
          <div
            style={{
              display: "flex",
              gap: "0.25rem",
              background: T.color.warmStone,
              borderRadius: "0.5rem",
              padding: "0.1875rem",
              marginBottom: "1rem",
            }}
          >
            {(["sent", "received"] as const).map((tab) => {
              const active = activeTab === tab;
              const count = tab === "sent" ? sentCount : receivedCount;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  aria-pressed={active}
                  style={{
                    flex: 1,
                    padding: "0.5rem 0.75rem",
                    borderRadius: "0.375rem",
                    border: "none",
                    background: active ? T.color.white : "transparent",
                    boxShadow: active ? "0 1px 3px rgba(44,44,42,.08)" : "none",
                    fontFamily: T.font.body,
                    fontSize: "0.8125rem",
                    fontWeight: active ? 600 : 400,
                    color: active ? T.color.charcoal : T.color.muted,
                    cursor: "pointer",
                    transition: "all .15s",
                  }}
                >
                  {tab === "sent" ? t("sharedByMe") : t("sharedWithMe")}
                  {!loading && (
                    <span
                      style={{
                        marginLeft: "0.375rem",
                        fontSize: "0.6875rem",
                        color: active ? T.color.terracotta : T.color.sandstone,
                      }}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ---- Error ---- */}
        {error && (
          <div
            role="alert"
            style={{
              margin: "0 1.5rem",
              padding: "0.625rem 0.875rem",
              background: `${T.color.error}10`,
              border: `1px solid ${T.color.error}30`,
              borderRadius: "0.625rem",
              marginBottom: "0.75rem",
              fontFamily: T.font.body,
              fontSize: "0.75rem",
              color: T.color.error,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              aria-label={tc("close")}
              style={{
                background: "none",
                border: "none",
                color: T.color.error,
                cursor: "pointer",
                fontSize: "0.875rem",
              }}
            >
              &#x2715;
            </button>
          </div>
        )}

        {/* ---- Scrollable content ---- */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: isMobile ? "0 1rem 1.25rem" : "0 1.5rem 1.75rem",
          }}
        >
          {loading ? (
            <div
              style={{
                textAlign: "center",
                padding: "3rem 1rem",
                color: T.color.muted,
                fontFamily: T.font.body,
                fontSize: "0.8125rem",
              }}
            >
              {t("loading")}
            </div>
          ) : activeTab === "sent" ? (
            /* ============ SHARED BY ME ============ */
            sentCount === 0 ? (
              <EmptyState
                icon="&#x1F517;"
                title={t("noSentShares")}
                subtitle={t("noSentSharesDesc")}
              />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {/* Sent wings */}
                {data!.sent.wings.map((share) => (
                  <div
                    key={share.id}
                    style={{
                      padding: "0.875rem 1rem",
                      background: T.color.white,
                      borderRadius: "0.75rem",
                      border: `1px solid ${T.color.cream}`,
                      boxShadow: "0 1px 4px rgba(44,44,42,.04)",
                    }}
                  >
                    {/* Header row */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        marginBottom: "0.5rem",
                      }}
                    >
                      <TypeBadge type="wing" />
                      <span style={{ fontSize: "1rem" }}>{share.wingIcon}</span>
                      <span
                        style={{
                          fontFamily: T.font.body,
                          fontSize: "0.8125rem",
                          fontWeight: 600,
                          color: T.color.charcoal,
                          flex: 1,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {share.wingName}
                      </span>
                      <StatusBadge status={share.status} />
                    </div>

                    {/* Recipient */}
                    <div
                      style={{
                        fontFamily: T.font.body,
                        fontSize: "0.75rem",
                        color: T.color.muted,
                        marginBottom: "0.625rem",
                      }}
                    >
                      {share.recipientName || share.shared_with_email}
                    </div>

                    {/* Permission toggles */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.375rem",
                        marginBottom: "0.625rem",
                      }}
                    >
                      {(
                        [
                          ["can_add", t("canAdd")],
                          ["can_edit", t("canEdit")],
                          ["can_delete", t("canDelete")],
                        ] as const
                      ).map(([field, label]) => (
                        <div
                          key={field}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <span
                            style={{
                              fontFamily: T.font.body,
                              fontSize: "0.6875rem",
                              color: T.color.walnut,
                            }}
                          >
                            {label}
                          </span>
                          <Toggle
                            checked={share[field]}
                            disabled={updatingPerm === share.id + field}
                            label={label}
                            onChange={(v) => handlePermToggle(share.id, "wing", field, v)}
                          />
                        </div>
                      ))}
                    </div>

                    {/* Revoke */}
                    {confirmingRevoke === share.id ? (
                      <ConfirmDialog
                        message={t("revokeConfirm", {
                          name: share.recipientName || share.shared_with_email,
                        })}
                        confirmLabel={t("revokeAccess")}
                        cancelLabel={tc("cancel")}
                        onConfirm={() => handleRevoke(share.id, "wing")}
                        onCancel={() => setConfirmingRevoke(null)}
                      />
                    ) : (
                      <button
                        onClick={() => setConfirmingRevoke(share.id)}
                        style={{
                          width: "100%",
                          padding: "0.375rem",
                          borderRadius: "0.375rem",
                          border: `1px solid ${T.color.error}25`,
                          background: `${T.color.error}06`,
                          fontFamily: T.font.body,
                          fontSize: "0.6875rem",
                          color: T.color.error,
                          cursor: "pointer",
                          fontWeight: 500,
                        }}
                      >
                        {t("revokeAccess")}
                      </button>
                    )}
                  </div>
                ))}

                {/* Sent rooms */}
                {data!.sent.rooms.map((share) => (
                  <div
                    key={share.id}
                    style={{
                      padding: "0.875rem 1rem",
                      background: T.color.white,
                      borderRadius: "0.75rem",
                      border: `1px solid ${T.color.cream}`,
                      boxShadow: "0 1px 4px rgba(44,44,42,.04)",
                    }}
                  >
                    {/* Header row */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        marginBottom: "0.25rem",
                      }}
                    >
                      <TypeBadge type="room" />
                      <span style={{ fontSize: "1rem" }}>{share.roomIcon}</span>
                      <span
                        style={{
                          fontFamily: T.font.body,
                          fontSize: "0.8125rem",
                          fontWeight: 600,
                          color: T.color.charcoal,
                          flex: 1,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {share.roomName}
                      </span>
                      <StatusBadge status={share.status} />
                    </div>

                    {/* Wing context */}
                    <div
                      style={{
                        fontFamily: T.font.body,
                        fontSize: "0.6875rem",
                        color: T.color.sandstone,
                        marginBottom: "0.375rem",
                      }}
                    >
                      {share.wingName}
                    </div>

                    {/* Recipient */}
                    <div
                      style={{
                        fontFamily: T.font.body,
                        fontSize: "0.75rem",
                        color: T.color.muted,
                        marginBottom: "0.625rem",
                      }}
                    >
                      {share.recipientName || share.shared_with_email}
                    </div>

                    {/* Permission toggles */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.375rem",
                        marginBottom: "0.625rem",
                      }}
                    >
                      {(
                        [
                          ["can_add", t("canAdd")],
                          ["can_edit", t("canEdit")],
                          ["can_delete", t("canDelete")],
                        ] as const
                      ).map(([field, label]) => (
                        <div
                          key={field}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <span
                            style={{
                              fontFamily: T.font.body,
                              fontSize: "0.6875rem",
                              color: T.color.walnut,
                            }}
                          >
                            {label}
                          </span>
                          <Toggle
                            checked={share[field]}
                            disabled={updatingPerm === share.id + field}
                            label={label}
                            onChange={(v) => handlePermToggle(share.id, "room", field, v)}
                          />
                        </div>
                      ))}
                    </div>

                    {/* Revoke */}
                    {confirmingRevoke === share.id ? (
                      <ConfirmDialog
                        message={t("revokeConfirm", {
                          name: share.recipientName || share.shared_with_email,
                        })}
                        confirmLabel={t("revokeAccess")}
                        cancelLabel={tc("cancel")}
                        onConfirm={() => handleRevoke(share.id, "room")}
                        onCancel={() => setConfirmingRevoke(null)}
                      />
                    ) : (
                      <button
                        onClick={() => setConfirmingRevoke(share.id)}
                        style={{
                          width: "100%",
                          padding: "0.375rem",
                          borderRadius: "0.375rem",
                          border: `1px solid ${T.color.error}25`,
                          background: `${T.color.error}06`,
                          fontFamily: T.font.body,
                          fontSize: "0.6875rem",
                          color: T.color.error,
                          cursor: "pointer",
                          fontWeight: 500,
                        }}
                      >
                        {t("revokeAccess")}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )
          ) : (
            /* ============ SHARED WITH ME ============ */
            receivedCount === 0 ? (
              <EmptyState
                icon="&#x1F3DB;&#xFE0F;"
                title={t("noReceivedShares")}
                subtitle={t("noReceivedSharesDesc")}
              />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {/* Received wings */}
                {data!.received.wings.map((share) => (
                  <div
                    key={share.id}
                    style={{
                      padding: "0.875rem 1rem",
                      background: T.color.white,
                      borderRadius: "0.75rem",
                      border: `1px solid ${T.color.cream}`,
                      boxShadow: "0 1px 4px rgba(44,44,42,.04)",
                    }}
                  >
                    {/* Header row */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        marginBottom: "0.25rem",
                      }}
                    >
                      <TypeBadge type="wing" />
                      <span style={{ fontSize: "1rem" }}>{share.wingIcon}</span>
                      <span
                        style={{
                          fontFamily: T.font.body,
                          fontSize: "0.8125rem",
                          fontWeight: 600,
                          color: T.color.charcoal,
                          flex: 1,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {share.wingName}
                      </span>
                    </div>

                    {/* Shared by */}
                    <div
                      style={{
                        fontFamily: T.font.body,
                        fontSize: "0.75rem",
                        color: T.color.muted,
                        marginBottom: "0.5rem",
                      }}
                    >
                      {t("sharedBy", { name: share.ownerName })}
                    </div>

                    {/* Permission badges */}
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "0.25rem",
                        marginBottom: "0.625rem",
                      }}
                    >
                      <PermissionBadge label={t("viewOnly")} enabled={true} />
                      <PermissionBadge label={t("canAdd")} enabled={share.can_add} />
                      <PermissionBadge label={t("canEdit")} enabled={share.can_edit} />
                      <PermissionBadge label={t("canDelete")} enabled={share.can_delete} />
                    </div>

                    {/* Leave */}
                    {confirmingLeave === share.id ? (
                      <ConfirmDialog
                        message={t("leaveConfirm", { name: share.wingName })}
                        confirmLabel={t("leave")}
                        cancelLabel={tc("cancel")}
                        onConfirm={() => handleLeave(share.id, "wing")}
                        onCancel={() => setConfirmingLeave(null)}
                      />
                    ) : (
                      <button
                        onClick={() => setConfirmingLeave(share.id)}
                        style={{
                          width: "100%",
                          padding: "0.375rem",
                          borderRadius: "0.375rem",
                          border: `1px solid ${T.color.sandstone}50`,
                          background: "transparent",
                          fontFamily: T.font.body,
                          fontSize: "0.6875rem",
                          color: T.color.walnut,
                          cursor: "pointer",
                          fontWeight: 500,
                        }}
                      >
                        {t("leave")}
                      </button>
                    )}
                  </div>
                ))}

                {/* Received rooms */}
                {data!.received.rooms.map((share) => (
                  <div
                    key={share.id}
                    style={{
                      padding: "0.875rem 1rem",
                      background: T.color.white,
                      borderRadius: "0.75rem",
                      border: `1px solid ${T.color.cream}`,
                      boxShadow: "0 1px 4px rgba(44,44,42,.04)",
                    }}
                  >
                    {/* Header row */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        marginBottom: "0.25rem",
                      }}
                    >
                      <TypeBadge type="room" />
                      <span style={{ fontSize: "1rem" }}>{share.roomIcon}</span>
                      <span
                        style={{
                          fontFamily: T.font.body,
                          fontSize: "0.8125rem",
                          fontWeight: 600,
                          color: T.color.charcoal,
                          flex: 1,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {share.roomName}
                      </span>
                    </div>

                    {/* Shared by + placement */}
                    <div
                      style={{
                        fontFamily: T.font.body,
                        fontSize: "0.75rem",
                        color: T.color.muted,
                        marginBottom: share.placedInWingName ? "0.125rem" : "0.5rem",
                      }}
                    >
                      {t("sharedBy", { name: share.ownerName })}
                    </div>
                    {share.placedInWingName && (
                      <div
                        style={{
                          fontFamily: T.font.body,
                          fontSize: "0.6875rem",
                          color: T.color.sandstone,
                          marginBottom: "0.5rem",
                        }}
                      >
                        {t("placedIn", { wing: share.placedInWingName })}
                      </div>
                    )}

                    {/* Permission badges */}
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "0.25rem",
                        marginBottom: "0.625rem",
                      }}
                    >
                      <PermissionBadge label={t("viewOnly")} enabled={true} />
                      <PermissionBadge label={t("canAdd")} enabled={share.can_add} />
                      <PermissionBadge label={t("canEdit")} enabled={share.can_edit} />
                      <PermissionBadge label={t("canDelete")} enabled={share.can_delete} />
                    </div>

                    {/* Leave */}
                    {confirmingLeave === share.id ? (
                      <ConfirmDialog
                        message={t("leaveConfirm", { name: share.roomName })}
                        confirmLabel={t("leave")}
                        cancelLabel={tc("cancel")}
                        onConfirm={() => handleLeave(share.id, "room")}
                        onCancel={() => setConfirmingLeave(null)}
                      />
                    ) : (
                      <button
                        onClick={() => setConfirmingLeave(share.id)}
                        style={{
                          width: "100%",
                          padding: "0.375rem",
                          borderRadius: "0.375rem",
                          border: `1px solid ${T.color.sandstone}50`,
                          background: "transparent",
                          fontFamily: T.font.body,
                          fontSize: "0.6875rem",
                          color: T.color.walnut,
                          cursor: "pointer",
                          fontWeight: 500,
                        }}
                      >
                        {t("leave")}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty state                                                        */
/* ------------------------------------------------------------------ */

function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
      <div
        style={{ fontSize: "2.25rem", marginBottom: "0.75rem" }}
        dangerouslySetInnerHTML={{ __html: icon }}
      />
      <p
        style={{
          fontFamily: T.font.display,
          fontSize: "1.125rem",
          color: T.color.charcoal,
          margin: "0 0 0.5rem",
        }}
      >
        {title}
      </p>
      <p
        style={{
          fontFamily: T.font.body,
          fontSize: "0.8125rem",
          color: T.color.muted,
          margin: 0,
          lineHeight: 1.6,
        }}
      >
        {subtitle}
      </p>
    </div>
  );
}
