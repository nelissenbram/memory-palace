"use client";

import { useState } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { TreeBranchIcon } from "./PersonCard";

interface OnboardingWizardProps {
  onStart: () => void;
  onSkip: () => void;
  isMobile: boolean;
}

/* ── SVG step icons (Roman/Tuscan style, no emoji) ── */

/** Roman bust / figure — represents "add yourself" */
function RomanBustIcon({ size = 40, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {/* Head */}
      <circle cx="12" cy="7" r="3.5" />
      {/* Laurel hint */}
      <path d="M8 5.5 Q10 3.5 12 4 Q14 3.5 16 5.5" strokeWidth="1" opacity="0.5" />
      {/* Toga body */}
      <path d="M12 10.5 C7 10.5 5 15 5 21 L19 21 C19 15 17 10.5 12 10.5Z" fill={color} fillOpacity="0.08" />
      {/* Toga drape */}
      <path d="M7 13 Q10 11 12 12.5 Q14 11 17 13" strokeWidth="1" opacity="0.4" />
      {/* Base / pedestal hint */}
      <line x1="6" y1="21" x2="18" y2="21" strokeWidth="1.5" />
    </svg>
  );
}

/** Family group — Roman domus style (matches FamilyIcon from WingRoomIcons) */
function FamilyGroupIcon({ size = 40, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {/* Triangular pediment */}
      <polyline points="3,14 12,4 21,14" />
      {/* Two columns */}
      <line x1="6" y1="14" x2="6" y2="20" />
      <line x1="18" y1="14" x2="18" y2="20" />
      {/* Base step */}
      <line x1="3" y1="20" x2="21" y2="20" />
      {/* Doorway arch — family entrance */}
      <path d="M10,20 L10,16 Q12,13 14,16 L14,20" />
      {/* People silhouettes inside — three figures */}
      <circle cx="10.5" cy="17.5" r="0.6" fill={color} fillOpacity="0.3" />
      <circle cx="12" cy="17" r="0.7" fill={color} fillOpacity="0.3" />
      <circle cx="13.5" cy="17.5" r="0.6" fill={color} fillOpacity="0.3" />
    </svg>
  );
}

type StepDef = { icon: "bust" | "family" | "tree"; titleKey: string; descKey: string };

const STEPS: readonly StepDef[] = [
  { icon: "bust",   titleKey: "onboardingStep1Title", descKey: "onboardingStep1Desc" },
  { icon: "family", titleKey: "onboardingStep2Title", descKey: "onboardingStep2Desc" },
  { icon: "tree",   titleKey: "onboardingStep3Title", descKey: "onboardingStep3Desc" },
] as const;

function StepIcon({ icon, size = 40 }: { icon: StepDef["icon"]; size?: number }) {
  const color = T.color.walnut;
  switch (icon) {
    case "bust":   return <RomanBustIcon size={size} color={color} />;
    case "family": return <FamilyGroupIcon size={size} color={color} />;
    case "tree":   return <TreeBranchIcon size={size} color={color} />;
  }
}

export function OnboardingWizard({ onStart, onSkip, isMobile }: OnboardingWizardProps) {
  const { t } = useTranslation("familyTree");
  const { t: tc } = useTranslation("common");
  const [step, setStep] = useState(0);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        minHeight: "25rem",
        padding: isMobile ? "1.5rem" : "3rem",
        gap: "2rem",
      }}
    >
      {/* Tree icon */}
      <div
        style={{
          width: "5rem",
          height: "5rem",
          borderRadius: "50%",
          background: `${T.color.warmStone}C0`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <TreeBranchIcon size={36} color={T.color.walnut} />
      </div>

      {/* Title */}
      <h2
        style={{
          fontFamily: T.font.display,
          fontSize: isMobile ? "1.5rem" : "1.75rem",
          fontWeight: 600,
          color: T.color.charcoal,
          margin: 0,
          textAlign: "center",
        }}
      >
        {t("onboardingTitle")}
      </h2>

      {/* Steps indicator */}
      <div style={{ display: "flex", gap: "0.5rem" }}>
        {STEPS.map((_, i) => (
          <div
            key={i}
            style={{
              width: "0.5rem",
              height: "0.5rem",
              borderRadius: "50%",
              background: i === step ? T.color.terracotta : T.color.sandstone,
              opacity: i === step ? 1 : 0.4,
              transition: "all 0.2s ease",
            }}
          />
        ))}
      </div>

      {/* Current step card */}
      <div
        style={{
          background: T.color.white,
          borderRadius: "1rem",
          border: `1px solid ${T.color.cream}`,
          padding: isMobile ? "1.5rem" : "2rem",
          maxWidth: "22rem",
          width: "100%",
          textAlign: "center",
          boxShadow: "0 0.25rem 1rem rgba(44,44,42,.06)",
        }}
      >
        <div style={{
          width: "3.5rem",
          height: "3.5rem",
          borderRadius: "50%",
          background: `${T.color.warmStone}C0`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "0.75rem",
          marginLeft: "auto",
          marginRight: "auto",
        }}>
          <StepIcon icon={STEPS[step].icon} size={28} />
        </div>
        <h3
          style={{
            fontFamily: T.font.display,
            fontSize: "1.125rem",
            fontWeight: 600,
            color: T.color.charcoal,
            margin: "0 0 0.5rem",
          }}
        >
          {t(STEPS[step].titleKey)}
        </h3>
        <p
          style={{
            fontFamily: T.font.body,
            fontSize: "0.875rem",
            color: T.color.muted,
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          {t(STEPS[step].descKey)}
        </p>
      </div>

      {/* Navigation buttons */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
        {step < STEPS.length - 1 ? (
          <>
            <button
              onClick={onSkip}
              style={{
                padding: "0.625rem 1.25rem",
                borderRadius: "0.75rem",
                border: `1px solid ${T.color.cream}`,
                background: "transparent",
                fontFamily: T.font.body,
                fontSize: "0.875rem",
                fontWeight: 500,
                color: T.color.muted,
                cursor: "pointer",
                minHeight: "2.75rem",
              }}
            >
              {t("onboardingSkip")}
            </button>
            <button
              onClick={() => setStep(step + 1)}
              style={{
                padding: "0.625rem 1.5rem",
                borderRadius: "0.75rem",
                border: "none",
                background: T.color.terracotta,
                fontFamily: T.font.body,
                fontSize: "0.875rem",
                fontWeight: 600,
                color: T.color.white,
                cursor: "pointer",
                minHeight: "2.75rem",
                boxShadow: `0 0.25rem 0.75rem rgba(193,127,89,.25)`,
              }}
            >
              {tc("next")}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onSkip}
              style={{
                padding: "0.625rem 1.25rem",
                borderRadius: "0.75rem",
                border: `1px solid ${T.color.cream}`,
                background: "transparent",
                fontFamily: T.font.body,
                fontSize: "0.875rem",
                fontWeight: 500,
                color: T.color.muted,
                cursor: "pointer",
                minHeight: "2.75rem",
              }}
            >
              {t("onboardingSkip")}
            </button>
            <button
              onClick={onStart}
              style={{
                padding: "0.75rem 2rem",
                borderRadius: "0.75rem",
                border: "none",
                background: T.color.sage,
                fontFamily: T.font.body,
                fontSize: "1rem",
                fontWeight: 600,
                color: T.color.white,
                cursor: "pointer",
                minHeight: "2.75rem",
                boxShadow: `0 0.25rem 0.75rem rgba(107,142,89,.25)`,
              }}
            >
              {t("onboardingStart")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
