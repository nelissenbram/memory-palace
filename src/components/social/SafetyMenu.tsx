"use client";

import React, { useState, useTransition, useEffect } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useIsPortrait } from "@/lib/hooks/useIsPortrait";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
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
  const isMobile = useIsMobile();
  const isPortrait = useIsPortrait();
  const asSheet = isMobile && isPortrait;
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState<null | "report">(null);
  const { containerRef, handleKeyDown } = useFocusTrap(dialog === "report");

  // Escape-to-close for the report dialog (focus trap handles Tab + restore).
  useEffect(() => {
    if (dialog !== "report") return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setDialog(null); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [dialog]);
  const [reason, setReason] = useState<(typeof REASONS)[number]>("spam");
  const [details, setDetails] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState(false);
  const [blockError, setBlockError] = useState(false);
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
    setBlockError(false);
    if (!(await confirmDialog({ message: t("safetyBlockConfirm"), destructive: true }))) return;
    startTransition(async () => {
      const res = await blockUser(targetUserId);
      if (!res?.blocked) {
        // Blocking requires an account; surface the failure with a branded inline
        // notice rather than a raw system alert (origin-prefixed in WKWebView).
        setBlockError(true);
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
        onClick={() => setOpen((o) => { const next = !o; if (next) setBlockError(false); return next; })}
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
          minWidth: "2.75rem",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <MoreIcon />
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
              border: `1px solid ${T.color.hairline}`,
              borderRadius: "0.625rem",
              boxShadow: T.shadow[2],
              overflow: "hidden",
            }}
          >
            <button
              role="menuitem"
              style={{ ...menuBtn, display: "flex", alignItems: "center", gap: "0.5rem" }}
              onClick={() => {
                setOpen(false);
                setDone(false);
                setError(false);
                setDialog("report");
              }}
            >
              <FlagIcon /> {t("safetyReport")}
            </button>
            {showBlock && targetUserId && (
              <button
                role="menuitem"
                style={{ ...menuBtn, color: T.color.terracotta, display: "flex", alignItems: "center", gap: "0.5rem" }}
                onClick={handleBlock}
                disabled={isPending}
              >
                <BlockIcon /> {t("safetyBlock")}
              </button>
            )}
            {blockError && (
              <p
                role="alert"
                style={{
                  fontFamily: T.font.body,
                  fontSize: "0.75rem",
                  color: T.color.error,
                  lineHeight: 1.4,
                  margin: 0,
                  padding: "0.5rem 0.875rem 0.625rem",
                }}
              >
                {t("safetyBlockError")}
              </p>
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
            background: "rgba(64,59,54,0.55)",
            display: "flex",
            alignItems: asSheet ? "flex-end" : "center",
            justifyContent: "center",
            padding: asSheet ? 0 : "1rem",
          }}
        >
          <div
            ref={containerRef}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={handleKeyDown}
            role="dialog"
            aria-modal="true"
            style={{
              width: "100%",
              maxWidth: asSheet ? "none" : "26rem",
              background: T.color.cream,
              border: `1px solid ${T.color.hairline}`,
              borderRadius: asSheet ? "1rem 1rem 0 0" : "1rem",
              padding: "1.5rem",
              paddingBottom: asSheet ? "max(1.5rem, env(safe-area-inset-bottom, 0px))" : "1.5rem",
              boxShadow: T.shadow[2],
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
                    color: T.color.muted,
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
                        minHeight: "2.75rem",
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
                    {t("safetyReportError")}
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
  // Canon: EMBER is the interactive/CTA color; gold is ceremonial-only.
  background: `linear-gradient(135deg, ${T.color.ember}, ${T.color.rustDeep})`,
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
  border: `1px solid ${T.color.hairline}`,
  background: "transparent",
  color: T.color.muted,
  cursor: "pointer",
  minHeight: "2.75rem",
};

/** ── Canon-colored SVG icons (rem-sized) replacing native emoji glyphs. ── */
function MoreIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ width: "1.25rem", height: "1.25rem" }}>
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
    </svg>
  );
}

function FlagIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ width: "1rem", height: "1rem", flexShrink: 0 }}>
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V4s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  );
}

function BlockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ width: "1rem", height: "1rem", flexShrink: 0 }}>
      <circle cx="12" cy="12" r="9" />
      <line x1="5.6" y1="5.6" x2="18.4" y2="18.4" />
    </svg>
  );
}
