"use client";

import { useState, useEffect, useCallback } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import {
  MailIcon,
  Spinner,
  smallPillStyle,
  pillBtnStyle,
  labelStyle,
  getInputStyle,
} from "./PersonPanelShared";

interface PersonPanelInviteProps {
  isMobile: boolean;
  personName?: string;
  personId: string;
}

type InviteStatus = "idle" | "sending" | "sent" | "error";

interface StoredInvite {
  email: string;
  permission: "view" | "contribute";
  date: string;
  status: "pending";
  personId?: string;
}

const STORAGE_KEY = "family-tree-invites";

function loadInvites(): StoredInvite[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as StoredInvite[];
  } catch {
    return [];
  }
}

function saveInvites(invites: StoredInvite[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(invites));
  } catch {
    // storage full or unavailable
  }
}

export default function PersonPanelInvite({ isMobile, personName, personId }: PersonPanelInviteProps) {
  const { t } = useTranslation("familyTree");
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [permission, setPermission] = useState<"view" | "contribute">("view");
  const [status, setStatus] = useState<InviteStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [sentInvites, setSentInvites] = useState<StoredInvite[]>([]);

  useEffect(() => {
    setSentInvites(loadInvites().filter((inv) => inv.personId === personId));
  }, [personId]);

  const inputStyle = getInputStyle(isMobile);
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail);

  const addInviteToStorage = useCallback((email: string, perm: "view" | "contribute") => {
    const newInvite: StoredInvite = {
      email: email.trim().toLowerCase(),
      permission: perm,
      date: new Date().toISOString(),
      status: "pending",
      personId,
    };
    const allInvites = loadInvites();
    // Remove duplicate for same email+person, keep others
    const updated = [newInvite, ...allInvites.filter(
      (inv) => !(inv.email === newInvite.email && inv.personId === personId),
    )];
    saveInvites(updated);
    setSentInvites(updated.filter((inv) => inv.personId === personId));
  }, [personId]);

  const removeInviteFromStorage = useCallback((email: string) => {
    const updated = loadInvites().filter((inv) => !(inv.email === email && inv.personId === personId));
    saveInvites(updated);
    setSentInvites(updated.filter((inv) => inv.personId === personId));
  }, [personId]);

  const handleSendInvite = async () => {
    if (!isValidEmail) return;
    setStatus("sending");
    setErrorMsg("");
    try {
      const res = await fetch("/api/family-tree/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail.trim().toLowerCase(),
          permission,
          personName: personName || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        addInviteToStorage(inviteEmail, permission);
        setStatus("sent");
        setTimeout(() => {
          setShowInvite(false);
          setInviteEmail("");
          setStatus("idle");
        }, 3000);
      } else {
        setErrorMsg(data.error || t("inviteFailed"));
        setStatus("error");
      }
    } catch {
      setErrorMsg(t("inviteFailed"));
      setStatus("error");
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return iso;
    }
  };

  return (
    <div style={{ marginTop: "0.875rem" }}>
      {!showInvite ? (
        <button
          onClick={() => setShowInvite(true)}
          style={{
            ...smallPillStyle,
            color: T.color.sage,
            borderColor: `${T.color.sage}50`,
            gap: "0.375rem",
            width: "100%",
            justifyContent: "center",
          }}
        >
          <MailIcon />
          <span>{t("invitePerson")}</span>
        </button>
      ) : (
        <div
          style={{
            padding: "0.875rem",
            borderRadius: "0.75rem",
            background: `${T.color.sage}0A`,
            border: `1px solid ${T.color.sage}30`,
            display: "flex",
            flexDirection: "column",
            gap: "0.625rem",
          }}
        >
          {/* Header */}
          <div
            style={{
              fontFamily: T.font.display,
              fontSize: "1rem",
              fontWeight: 500,
              color: T.color.charcoal,
            }}
          >
            {t("invitePerson")}
          </div>

          {/* Success message */}
          {status === "sent" && (
            <div
              role="status"
              style={{
                padding: "0.5rem 0.75rem",
                borderRadius: "0.5rem",
                background: `${T.color.sage}15`,
                border: `1px solid ${T.color.sage}30`,
                fontFamily: T.font.body,
                fontSize: "0.75rem",
                color: T.color.sage,
              }}
            >
              {t("inviteSentSuccess", { email: inviteEmail })}
            </div>
          )}

          {/* Error message */}
          {status === "error" && errorMsg && (
            <div
              role="alert"
              style={{
                padding: "0.5rem 0.75rem",
                borderRadius: "0.5rem",
                background: `${T.color.error}10`,
                border: `1px solid ${T.color.error}30`,
                fontFamily: T.font.body,
                fontSize: "0.75rem",
                color: T.color.error,
              }}
            >
              {errorMsg}
            </div>
          )}

          {/* Email input */}
          <div>
            <label
              style={{
                ...labelStyle,
                color: T.color.sage,
              }}
            >
              {t("inviteEmail")}
            </label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSendInvite();
              }}
              placeholder={t("invitePlaceholder")}
              disabled={status === "sending" || status === "sent"}
              style={{
                ...inputStyle,
                borderColor: `${T.color.sage}40`,
              }}
            />
          </div>

          {/* Permission selector */}
          <div>
            <label
              style={{
                ...labelStyle,
                color: T.color.sage,
                fontSize: "0.6875rem",
              }}
            >
              {t("invitePermissionLabel")}
            </label>
            <div style={{ display: "flex", gap: "0.375rem" }}>
              {(["view", "contribute"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  aria-pressed={permission === p}
                  onClick={() => setPermission(p)}
                  disabled={status === "sending" || status === "sent"}
                  style={{
                    flex: 1,
                    padding: isMobile ? "0.625rem" : "0.5rem 0.75rem",
                    borderRadius: "0.5rem",
                    minHeight: "2.75rem",
                    border: `1px solid ${permission === p ? T.color.sage + "40" : T.color.cream}`,
                    background: permission === p ? `${T.color.sage}10` : T.color.white,
                    cursor: status === "sending" || status === "sent" ? "default" : "pointer",
                    fontFamily: T.font.body,
                    fontSize: isMobile ? "0.8125rem" : "0.75rem",
                    color: permission === p ? T.color.sage : T.color.muted,
                    fontWeight: permission === p ? 600 : 400,
                    transition: "all 0.15s ease",
                  }}
                >
                  {p === "view" ? t("inviteCanView") : t("inviteCanContribute")}
                </button>
              ))}
            </div>
          </div>

          {/* Hint */}
          <div
            style={{
              fontFamily: T.font.body,
              fontSize: "0.6875rem",
              color: T.color.muted,
              fontStyle: "italic",
            }}
          >
            {t("inviteHint")}
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              disabled={!isValidEmail || status === "sending" || status === "sent"}
              onClick={handleSendInvite}
              style={{
                ...pillBtnStyle,
                background:
                  isValidEmail && status !== "sending" && status !== "sent"
                    ? T.color.sage
                    : T.color.sandstone,
                color: T.color.white,
                flex: 1,
                fontSize: "0.8125rem",
                padding: "0.5rem 1rem",
                cursor:
                  isValidEmail && status !== "sending" && status !== "sent"
                    ? "pointer"
                    : "default",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.375rem",
              }}
            >
              {status === "sending" ? (
                <>
                  <Spinner size="0.875rem" color={T.color.white} />
                  <span>{t("inviteSending")}</span>
                </>
              ) : status === "sent" ? (
                t("inviteSentLabel")
              ) : (
                t("inviteSend")
              )}
            </button>
            <button
              onClick={() => {
                setShowInvite(false);
                setInviteEmail("");
                setStatus("idle");
                setErrorMsg("");
              }}
              style={{
                ...pillBtnStyle,
                background: T.color.white,
                color: T.color.muted,
                border: `1px solid ${T.color.cream}`,
                fontSize: "0.8125rem",
                padding: "0.5rem 1rem",
              }}
            >
              {t("cancel")}
            </button>
          </div>
        </div>
      )}

      {/* ── Sent invites history ── */}
      {sentInvites.length > 0 && (
        <div
          style={{
            marginTop: "0.75rem",
            padding: "0.75rem",
            borderRadius: "0.75rem",
            background: `${T.color.sandstone}18`,
            border: `1px solid ${T.color.sandstone}30`,
          }}
        >
          <div
            style={{
              fontFamily: T.font.display,
              fontSize: "0.8125rem",
              fontWeight: 500,
              color: T.color.charcoal,
              marginBottom: "0.5rem",
            }}
          >
            {t("sentInvites")}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            {sentInvites.map((inv) => (
              <div
                key={inv.email}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.4375rem 0.625rem",
                  borderRadius: "0.5rem",
                  background: T.color.white,
                  border: `1px solid ${T.color.cream}`,
                  fontSize: "0.75rem",
                  fontFamily: T.font.body,
                }}
              >
                {/* Email + date */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      color: T.color.charcoal,
                      fontWeight: 500,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {inv.email}
                  </div>
                  <div
                    style={{
                      color: T.color.muted,
                      fontSize: "0.6875rem",
                      marginTop: "0.125rem",
                    }}
                  >
                    {formatDate(inv.date)}
                    {" \u00B7 "}
                    {inv.permission === "view"
                      ? t("inviteCanView")
                      : t("inviteCanContribute")}
                  </div>
                </div>

                {/* Status badge */}
                <span
                  style={{
                    padding: "0.125rem 0.4375rem",
                    borderRadius: "624rem",
                    fontSize: "0.625rem",
                    fontWeight: 600,
                    letterSpacing: "0.02em",
                    textTransform: "uppercase",
                    background: "#D4A01720",
                    color: "#B8860B",
                    border: "1px solid #D4A01740",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  {t("invitePending")}
                </span>

                {/* Remove button */}
                <button
                  onClick={() => removeInviteFromStorage(inv.email)}
                  aria-label={t("removeInvite")}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "0.25rem",
                    color: T.color.muted,
                    fontSize: "0.875rem",
                    lineHeight: 1,
                    flexShrink: 0,
                    opacity: 0.6,
                    transition: "opacity 0.15s",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.6"; }}
                  title={t("removeInvite")}
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
