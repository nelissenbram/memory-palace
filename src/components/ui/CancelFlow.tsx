"use client";
import { useState } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { track } from "@/lib/analytics";

const F = T.font;
const C = T.color;

type CancelReason = "too_expensive" | "not_using" | "missing_features" | "other";

interface CancelFlowProps {
  onClose: () => void;
  onProceedToPortal: () => void;
  planName: string;
}

export default function CancelFlow({ onClose, onProceedToPortal, planName }: CancelFlowProps) {
  const { t } = useTranslation("cancelFlow");
  const [step, setStep] = useState<"reason" | "offer" | "confirm">("reason");
  const [reason, setReason] = useState<CancelReason | null>(null);

  const reasons: { key: CancelReason; label: string }[] = [
    { key: "too_expensive", label: t("reasonExpensive") },
    { key: "not_using", label: t("reasonNotUsing") },
    { key: "missing_features", label: t("reasonMissing") },
    { key: "other", label: t("reasonOther") },
  ];

  const handleSelectReason = (r: CancelReason) => {
    setReason(r);
    track("cancel_reason_selected", { reason: r });
    setStep("offer");
  };

  const handleProceedToCancel = () => {
    track("cancel_proceeded", { reason });
    onProceedToPortal();
  };

  const offerForReason: Record<CancelReason, { title: string; body: string; cta: string; action: () => void }> = {
    too_expensive: {
      title: t("offerPauseTitle"),
      body: t("offerPauseBody"),
      cta: t("offerPauseCta"),
      action: () => {
        track("cancel_pause_accepted");
        // Pause = redirect to Stripe portal where they can pause
        onProceedToPortal();
      },
    },
    not_using: {
      title: t("offerReminderTitle"),
      body: t("offerReminderBody"),
      cta: t("offerReminderCta"),
      action: () => {
        track("cancel_reminder_accepted");
        onClose();
      },
    },
    missing_features: {
      title: t("offerFeedbackTitle"),
      body: t("offerFeedbackBody"),
      cta: t("offerFeedbackCta"),
      action: () => {
        track("cancel_feedback_accepted");
        window.open("mailto:support@thememorypalace.ai?subject=Feature%20Request", "_blank");
        onClose();
      },
    },
    other: {
      title: t("offerStayTitle"),
      body: t("offerStayBody"),
      cta: t("offerStayCta"),
      action: () => {
        track("cancel_stay_accepted");
        onClose();
      },
    },
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(44,44,42,.5)",
        backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{
          maxWidth: "26rem", width: "100%",
          background: C.white, borderRadius: "1.125rem",
          padding: "2rem",
          boxShadow: "0 1rem 3rem rgba(0,0,0,0.15)",
          animation: "onb-fadeUp .3s ease",
        }}
      >
        {/* Step 1: Why are you leaving? */}
        {step === "reason" && (
          <>
            <h3 style={{
              fontFamily: F.display, fontSize: "1.375rem", fontWeight: 500,
              color: C.charcoal, margin: "0 0 0.5rem", textAlign: "center",
            }}>
              {t("whyLeaving")}
            </h3>
            <p style={{
              fontFamily: F.body, fontSize: "0.875rem", color: C.muted,
              textAlign: "center", margin: "0 0 1.5rem", lineHeight: 1.5,
            }}>
              {t("whyLeavingDesc", { plan: planName })}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              {reasons.map((r) => (
                <button
                  key={r.key}
                  onClick={() => handleSelectReason(r.key)}
                  style={{
                    padding: "0.875rem 1.25rem",
                    borderRadius: "0.75rem",
                    border: `1px solid ${C.cream}`,
                    background: C.linen,
                    fontFamily: F.body, fontSize: "0.875rem",
                    color: C.charcoal, textAlign: "left",
                    cursor: "pointer", transition: "all .15s",
                    minHeight: "2.75rem",
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <button
              onClick={onClose}
              style={{
                width: "100%", marginTop: "1rem",
                fontFamily: F.body, fontSize: "0.8125rem",
                color: C.muted, background: "none", border: "none",
                cursor: "pointer",
              }}
            >
              {t("nevermind")}
            </button>
          </>
        )}

        {/* Step 2: Offer based on reason */}
        {step === "offer" && reason && (
          <>
            <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>
                {reason === "too_expensive" ? "\u23F8" : reason === "not_using" ? "\uD83D\uDCA1" : reason === "missing_features" ? "\u2709" : "\u2764"}
              </div>
              <h3 style={{
                fontFamily: F.display, fontSize: "1.25rem", fontWeight: 500,
                color: C.charcoal, margin: "0 0 0.5rem",
              }}>
                {offerForReason[reason].title}
              </h3>
              <p style={{
                fontFamily: F.body, fontSize: "0.875rem", color: C.muted,
                lineHeight: 1.6, margin: 0,
              }}>
                {offerForReason[reason].body}
              </p>
            </div>

            <button
              onClick={offerForReason[reason].action}
              style={{
                width: "100%", padding: "0.875rem",
                borderRadius: "0.75rem", border: "none",
                background: `linear-gradient(135deg, ${C.terracotta}, ${C.walnut})`,
                fontFamily: F.body, fontSize: "0.9375rem", fontWeight: 600,
                color: C.white, cursor: "pointer",
                marginBottom: "0.75rem", minHeight: "3rem",
              }}
            >
              {offerForReason[reason].cta}
            </button>

            <button
              onClick={() => setStep("confirm")}
              style={{
                width: "100%",
                fontFamily: F.body, fontSize: "0.8125rem",
                color: C.muted, background: "none", border: "none",
                cursor: "pointer", textDecoration: "underline",
                textUnderlineOffset: "2px",
              }}
            >
              {t("stillWantToCancel")}
            </button>
          </>
        )}

        {/* Step 3: Final confirm */}
        {step === "confirm" && (
          <>
            <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
              <h3 style={{
                fontFamily: F.display, fontSize: "1.25rem", fontWeight: 500,
                color: C.charcoal, margin: "0 0 0.5rem",
              }}>
                {t("confirmTitle")}
              </h3>
              <p style={{
                fontFamily: F.body, fontSize: "0.875rem", color: C.muted,
                lineHeight: 1.6, margin: 0,
              }}>
                {t("confirmBody")}
              </p>
            </div>

            <button
              onClick={handleProceedToCancel}
              style={{
                width: "100%", padding: "0.875rem",
                borderRadius: "0.75rem",
                border: `1px solid ${C.cream}`,
                background: C.linen,
                fontFamily: F.body, fontSize: "0.875rem", fontWeight: 500,
                color: C.charcoal, cursor: "pointer",
                marginBottom: "0.625rem", minHeight: "3rem",
              }}
            >
              {t("proceedToCancel")}
            </button>

            <button
              onClick={onClose}
              style={{
                width: "100%", padding: "0.875rem",
                borderRadius: "0.75rem", border: "none",
                background: `linear-gradient(135deg, ${C.terracotta}, ${C.walnut})`,
                fontFamily: F.body, fontSize: "0.9375rem", fontWeight: 600,
                color: C.white, cursor: "pointer", minHeight: "3rem",
              }}
            >
              {t("keepMyPlan")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
