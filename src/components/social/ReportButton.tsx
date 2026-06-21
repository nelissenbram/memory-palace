"use client";

import React, { useState, useTransition } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";

interface ReportButtonProps {
  targetType: string;
  targetId: string;
  targetUserId?: string;
  /** Optional style override for the trigger link. */
  variant?: "link" | "button";
}

const REASONS = ["spam", "abuse", "explicit", "hate", "other"] as const;

/**
 * Report control for public surfaces that may be viewed without an account
 * (public gallery, shared family tree). Posts to /api/report, which accepts
 * anonymous reports (Apple Guideline 1.2).
 */
export default function ReportButton({
  targetType,
  targetId,
  targetUserId,
  variant = "link",
}: ReportButtonProps) {
  const { t } = useTranslation("social");
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<(typeof REASONS)[number]>("spam");
  const [details, setDetails] = useState("");
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  const submit = () => {
    startTransition(async () => {
      try {
        await fetch("/api/report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetType, targetId, targetUserId, reason, details }),
        });
      } catch {
        /* swallow — still show thanks so abusers can't probe success */
      }
      setDone(true);
    });
  };

  const trigger: React.CSSProperties =
    variant === "button"
      ? {
          fontFamily: T.font.body,
          fontSize: "0.8125rem",
          fontWeight: 600,
          padding: "0.5rem 1rem",
          borderRadius: "2rem",
          border: `1px solid ${T.color.sandstone}`,
          background: "transparent",
          color: T.color.walnut,
          cursor: "pointer",
          minHeight: "2.75rem",
        }
      : {
          fontFamily: T.font.body,
          fontSize: "0.75rem",
          color: T.color.muted,
          background: "none",
          border: "none",
          cursor: "pointer",
          textDecoration: "underline",
          textUnderlineOffset: "0.15rem",
          padding: "0.375rem 0.5rem",
          minHeight: "2.75rem",
        };

  return (
    <>
      <button onClick={() => { setDone(false); setOpen(true); }} style={trigger} aria-label={t("safetyReport")}>
        {variant === "link" ? `⚑ ${t("safetyReport")}` : t("safetyReport")}
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 70,
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
                <p style={{ fontFamily: T.font.display, fontSize: "1.125rem", color: T.color.charcoal, margin: "0 0 1rem" }}>
                  {t("safetyReportThanks")}
                </p>
                <button onClick={() => setOpen(false)} style={primaryBtn}>
                  {t("safetyClose")}
                </button>
              </div>
            ) : (
              <>
                <h3 style={{ fontFamily: T.font.display, fontSize: "1.25rem", color: T.color.charcoal, margin: "0 0 0.5rem" }}>
                  {t("safetyReportTitle")}
                </h3>
                <p style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.walnut, margin: "0 0 1rem", lineHeight: 1.5 }}>
                  {t("safetyReportDesc")}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }}>
                  {REASONS.map((r) => (
                    <label key={r} style={{ display: "flex", alignItems: "center", gap: "0.625rem", fontFamily: T.font.body, fontSize: "0.875rem", color: T.color.charcoal, cursor: "pointer", padding: "0.375rem 0" }}>
                      <input type="radio" name="public-report-reason" checked={reason === r} onChange={() => setReason(r)} />
                      {t(`safetyReason_${r}`)}
                    </label>
                  ))}
                </div>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder={t("safetyDetailsPlaceholder")}
                  rows={3}
                  style={{ width: "100%", fontFamily: T.font.body, fontSize: "0.875rem", padding: "0.625rem", borderRadius: "0.5rem", border: `1px solid ${T.color.sandstone}`, resize: "vertical", marginBottom: "1rem" }}
                />
                <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                  <button onClick={() => setOpen(false)} style={ghostBtn}>{t("safetyCancel")}</button>
                  <button onClick={submit} disabled={isPending} style={primaryBtn}>
                    {isPending ? t("safetyReportSubmitting") : t("safetySubmit")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
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
