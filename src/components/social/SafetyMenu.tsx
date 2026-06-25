"use client";

import React, { useState, useTransition } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { confirmDialog } from "@/lib/ui/confirm";
import {
  blockUser,
  type ReportTargetType,
} from "@/lib/social/safety-actions";

interface SafetyMenuProps {
  targetType: ReportTargetType;
  targetId: string;
  /** Owner of the reported content; required to enable Block. */
  targetUserId?: string;
  /** Show the "Block user" action (only meaningful when targetUserId is set). */
  showBlock?: boolean;
  onBlocked?: () => void;
}

const REASONS = [
  "spam",
  "abuse",
  "explicit",
  "hate",
  "other",
] as const;

export default function SafetyMenu({
  targetType,
  targetId,
  targetUserId,
  showBlock = false,
  onBlocked,
}: SafetyMenuProps) {
  const { t } = useTranslation("social");
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState<null | "report">(null);
  const [reason, setReason] = useState<(typeof REASONS)[number]>("spam");
  const [details, setDetails] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleReport = () => {
    setError(false);
    startTransition(async () => {
      // Use the public /api/report endpoint so reporting works for guests too
      // (logged-out viewers must be able to flag UGC — Apple Guideline 1.2).
      try {
        const res = await fetch("/api/report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetType, targetId, targetUserId, reason, details }),
        });
        const data = await res.json().catch(() => ({ ok: false }));
        if (data.ok) setDone(true);
        else setError(true);
      } catch {
        setError(true);
      }
    });
  };

  const handleBlock = async () => {
    if (!targetUserId) return;
    if (!(await confirmDialog({ message: t("safetyBlockConfirm"), destructive: true }))) return;
    startTransition(async () => {
      const res = await blockUser(targetUserId);
      if (!res?.blocked) {
        // Blocking requires an account; surface the failure rather than pretending it worked.
        window.alert(res?.error || "Could not complete this action.");
        return;
      }
      setOpen(false);
      onBlocked?.();
    });
  };

  const menuBtn: React.CSSProperties = {
    display: "block",
    width: "100%",
    textAlign: "left",
    fontFamily: T.font.body,
    fontSize: "0.8125rem",
    padding: "0.625rem 0.875rem",
    background: "transparent",
    border: "none",
    color: T.color.charcoal,
    cursor: "pointer",
    minHeight: "2.75rem",
  };

  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={t("safetyMenuLabel")}
        aria-haspopup="menu"
        aria-expanded={open}
        style={{
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: T.color.muted,
          fontSize: "1.25rem",
          lineHeight: 1,
          padding: "0.25rem 0.5rem",
          minHeight: "2.75rem",
          minWidth: "2.5rem",
        }}
      >
        {"⋯"}
      </button>

      {open && (
        <>
          {/* click-away */}
          <div
            onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 40 }}
          />
          <div
            role="menu"
            style={{
              position: "absolute",
              right: 0,
              top: "100%",
              zIndex: 41,
              minWidth: "11rem",
              maxWidth: "calc(100vw - 2rem)",
              background: T.color.cream,
              border: `1px solid ${T.color.sandstone}`,
              borderRadius: "0.625rem",
              boxShadow: "0 0.5rem 1.5rem rgba(0,0,0,0.18)",
              overflow: "hidden",
            }}
          >
            <button
              role="menuitem"
              style={menuBtn}
              onClick={() => {
                setOpen(false);
                setDone(false);
                setDialog("report");
              }}
            >
              {"⚑"} {t("safetyReport")}
            </button>
            {showBlock && targetUserId && (
              <button
                role="menuitem"
                style={{ ...menuBtn, color: T.color.terracotta }}
                onClick={handleBlock}
                disabled={isPending}
              >
                {"⊘"} {t("safetyBlock")}
              </button>
            )}
          </div>
        </>
      )}

      {dialog === "report" && (
        <div
          onClick={() => setDialog(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            background: "rgba(20,16,12,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            style={{
              width: "100%",
              maxWidth: "26rem",
              background: T.color.cream,
              border: `1px solid ${T.color.sandstone}`,
              borderRadius: "1rem",
              padding: "1.5rem",
              boxShadow: "0 1rem 3rem rgba(0,0,0,0.3)",
            }}
          >
            {done ? (
              <div style={{ textAlign: "center" }}>
                <p
                  style={{
                    fontFamily: T.font.display,
                    fontSize: "1.125rem",
                    color: T.color.charcoal,
                    margin: "0 0 1rem",
                  }}
                >
                  {t("safetyReportThanks")}
                </p>
                <button
                  onClick={() => setDialog(null)}
                  style={primaryBtn}
                >
                  {t("safetyClose")}
                </button>
              </div>
            ) : (
              <>
                <h3
                  style={{
                    fontFamily: T.font.display,
                    fontSize: "1.25rem",
                    color: T.color.charcoal,
                    margin: "0 0 0.5rem",
                  }}
                >
                  {targetType === "user"
                    ? t("safetyReportUserTitle")
                    : t("safetyReportTitle")}
                </h3>
                <p
                  style={{
                    fontFamily: T.font.body,
                    fontSize: "0.8125rem",
                    color: T.color.walnut,
                    margin: "0 0 1rem",
                    lineHeight: 1.5,
                  }}
                >
                  {t("safetyReportDesc")}
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }}>
                  {REASONS.map((r) => (
                    <label
                      key={r}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.625rem",
                        fontFamily: T.font.body,
                        fontSize: "0.875rem",
                        color: T.color.charcoal,
                        cursor: "pointer",
                        padding: "0.375rem 0",
                      }}
                    >
                      <input
                        type="radio"
                        name="report-reason"
                        checked={reason === r}
                        onChange={() => setReason(r)}
                      />
                      {t(`safetyReason_${r}`)}
                    </label>
                  ))}
                </div>

                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder={t("safetyDetailsPlaceholder")}
                  rows={3}
                  style={{
                    width: "100%",
                    fontFamily: T.font.body,
                    fontSize: "0.875rem",
                    padding: "0.625rem",
                    borderRadius: "0.5rem",
                    border: `1px solid ${T.color.sandstone}`,
                    resize: "vertical",
                    marginBottom: "1rem",
                  }}
                />

                {error && (
                  <p role="alert" style={{
                    fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.error,
                    margin: "0 0 0.75rem", lineHeight: 1.5,
                  }}>
                    {t("safetyReportError") !== "safetyReportError" ? t("safetyReportError") : "Could not file your report. Please try again."}
                  </p>
                )}

                <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                  <button onClick={() => setDialog(null)} style={ghostBtn}>
                    {t("safetyCancel")}
                  </button>
                  <button onClick={handleReport} disabled={isPending} style={primaryBtn}>
                    {isPending ? t("safetyReportSubmitting") : t("safetySubmit")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const primaryBtn: React.CSSProperties = {
  fontFamily: T.font.body,
  fontSize: "0.875rem",
  fontWeight: 600,
  padding: "0.625rem 1.25rem",
  borderRadius: "2rem",
  border: "none",
  background: `linear-gradient(135deg, ${T.color.gold}, ${T.color.goldDark})`,
  color: T.color.cream,
  cursor: "pointer",
  minHeight: "2.75rem",
};

const ghostBtn: React.CSSProperties = {
  fontFamily: T.font.body,
  fontSize: "0.875rem",
  fontWeight: 600,
  padding: "0.625rem 1.25rem",
  borderRadius: "2rem",
  border: `1px solid ${T.color.sandstone}`,
  background: "transparent",
  color: T.color.walnut,
  cursor: "pointer",
  minHeight: "2.75rem",
};
