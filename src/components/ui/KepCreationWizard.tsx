"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useKepStore } from "@/lib/stores/kepStore";
import TuscanCard from "@/components/ui/TuscanCard";
import { T } from "@/lib/theme";
import { WIZARD_STEPS, INITIAL_WIZARD_DATA, buildCreatePayload, SOURCE_ICONS } from "@/lib/kep/creation-steps";
import type { WizardData } from "@/lib/kep/creation-steps";
import type { KepSourceType } from "@/types/kep";

export function KepCreationWizard() {
  const { t } = useTranslation("kep");
  const router = useRouter();
  const { createKep, isCreating, error, clearError } = useKepStore();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardData>(INITIAL_WIZARD_DATA);
  const stepRef = useRef<HTMLDivElement>(null);

  // Move focus to the step region on change so keyboard/SR users are told
  // the wizard advanced (the region is aria-live for the announcement).
  useEffect(() => {
    stepRef.current?.focus();
  }, [step]);

  const currentStep = WIZARD_STEPS[step];
  const canProceed = currentStep.isValid(data);

  const handleNext = () => {
    if (step < WIZARD_STEPS.length - 1) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleCreate = async () => {
    clearError();
    const payload = buildCreatePayload(data);
    const kep = await createKep(payload);
    if (kep) {
      router.push(`/palace/keps/${kep.id}`);
    }
  };

  const update = (partial: Partial<WizardData>) => setData({ ...data, ...partial });

  return (
    <div style={{ minHeight: "100%", background: "#FCFAF5", padding: "1.5rem 1rem", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      <div style={{
        maxWidth: "36rem",
        margin: "0 auto",
        padding: "1.5rem",
        background: "#FCFAF5",
        border: "0.0625rem solid #E3D6BC",
        borderRadius: "1rem",
        boxShadow: T.shadow[2],
      }}>
      <h1 style={{ fontFamily: T.font.display, fontSize: "1.375rem", fontWeight: 600, lineHeight: 1.15, color: "#403B36", marginBottom: "0.5rem" }}>{t("wizardTitle")}</h1>

      {/* Step indicator */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem" }}>
        {WIZARD_STEPS.map((s, i) => (
          <div key={s.id} style={{ flex: 1, height: "0.25rem", borderRadius: "0.125rem", background: i <= step ? "#B85C38" : "#E3D6BC" }} />
        ))}
      </div>

      {/* Step content */}
      <div ref={stepRef} tabIndex={-1} aria-live="polite" style={{ outline: "none" }}>
        {step === 0 && <StepSource data={data} update={update} t={t} />}
        {step === 1 && <StepConfigure data={data} update={update} t={t} />}
        {step === 2 && <StepRouting data={data} update={update} t={t} />}
        {step === 3 && <StepReview data={data} t={t} />}
      </div>

      {/* Create error */}
      {error && step === WIZARD_STEPS.length - 1 && (
        <div
          role="alert"
          style={{
            fontFamily: T.font.body,
            fontSize: "0.875rem",
            lineHeight: 1.4,
            color: "#9A4F2A",
            background: "rgba(154,79,42,0.09)",
            border: "0.0625rem solid #E3D6BC",
            borderRadius: "0.75rem",
            padding: "0.625rem 0.875rem",
            marginTop: "1.25rem",
          }}
        >
          {t("wizardCreateError")}
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "2rem", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        <button
          onClick={step === 0 ? () => router.back() : handleBack}
          style={{ padding: "0.625rem 1.25rem", borderRadius: "0.75rem", background: T.color.warmStone, border: "none", cursor: "pointer", fontFamily: T.font.body, fontWeight: 500, color: "#403B36", minHeight: "2.75rem" }}
        >
          {t("wizardBack")}
        </button>

        {step < WIZARD_STEPS.length - 1 ? (
          <button
            onClick={handleNext}
            disabled={!canProceed}
            style={{
              padding: "0.625rem 1.25rem",
              borderRadius: "0.75rem",
              background: canProceed ? "#B85C38" : T.color.sandstone,
              color: canProceed ? "#FCFAF5" : "#716A5E",
              border: "none",
              cursor: canProceed ? "pointer" : "not-allowed",
              fontFamily: T.font.body,
              fontWeight: 600,
              minHeight: "2.75rem",
            }}
          >
            {t("wizardNext")}
          </button>
        ) : (
          <button
            onClick={handleCreate}
            disabled={isCreating}
            style={{
              padding: "0.625rem 1.25rem",
              borderRadius: "0.75rem",
              background: "#B85C38",
              color: "#FCFAF5",
              border: "none",
              cursor: "pointer",
              fontFamily: T.font.body,
              fontWeight: 600,
              opacity: isCreating ? 0.6 : 1,
              minHeight: "2.75rem",
            }}
          >
            {isCreating ? t("wizardCreating") : t("wizardCreate")}
          </button>
        )}
      </div>
      </div>
    </div>
  );
}

function StepSource({ data, update, t }: { data: WizardData; update: (d: Partial<WizardData>) => void; t: (key: string, params?: Record<string, string>) => string }) {
  const sources: { type: KepSourceType; label: string; desc: string }[] = [
    { type: "whatsapp", label: t("sourceWhatsapp"), desc: t("wizardWhatsappDesc") },
    { type: "photos", label: t("sourcePhotos"), desc: t("wizardPhotosDesc") },
  ];

  const select = (type: KepSourceType) => update({ source_type: type, icon: SOURCE_ICONS[type] });

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      select(sources[index].type);
    } else if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault();
      select(sources[(index + 1) % sources.length].type);
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault();
      select(sources[(index - 1 + sources.length) % sources.length].type);
    }
  };

  return (
    <div>
      <h2 style={{ fontFamily: T.font.display, fontSize: "1.0625rem", fontWeight: 600, lineHeight: 1.15, color: "#403B36", marginBottom: "0.25rem" }}>{t("wizardStep1")}</h2>
      <p style={{ fontFamily: T.font.body, color: "#716A5E", fontSize: "0.9375rem", lineHeight: 1.4, marginBottom: "1.25rem" }}>{t("wizardStep1Desc")}</p>

      <div role="radiogroup" aria-label={t("wizardStep1")} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {sources.map((s, i) => {
          const selected = data.source_type === s.type;
          return (
            <div
              key={s.type}
              role="radio"
              aria-checked={selected}
              tabIndex={0}
              onClick={() => select(s.type)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              onFocus={(e) => { e.currentTarget.style.outline = "0.1875rem solid #D4AF37"; e.currentTarget.style.outlineOffset = "0.125rem"; }}
              onBlur={(e) => { e.currentTarget.style.outline = "none"; }}
              style={{
                cursor: "pointer",
                border: selected ? "0.125rem solid #B85C38" : "0.125rem solid transparent",
                borderRadius: "1rem",
              }}
            >
              <TuscanCard animate={false}>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <span aria-hidden="true" style={{ fontSize: "2rem" }}>{SOURCE_ICONS[s.type]}</span>
                  <div>
                    <div style={{ fontFamily: T.font.body, fontWeight: 600, color: "#403B36" }}>{s.label}</div>
                    <div style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E", marginTop: "0.25rem" }}>{s.desc}</div>
                  </div>
                </div>
              </TuscanCard>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StepConfigure({ data, update, t }: { data: WizardData; update: (d: Partial<WizardData>) => void; t: (key: string, params?: Record<string, string>) => string }) {
  return (
    <div>
      <h2 style={{ fontFamily: T.font.display, fontSize: "1.0625rem", fontWeight: 600, lineHeight: 1.15, color: "#403B36", marginBottom: "0.25rem" }}>{t("wizardStep2")}</h2>
      <p style={{ fontFamily: T.font.body, color: "#716A5E", fontSize: "0.9375rem", lineHeight: 1.4, marginBottom: "1.25rem" }}>{t("wizardStep2Desc")}</p>

      {/* Name */}
      <div style={{ marginBottom: "1rem" }}>
        <label style={{ fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 500, color: "#403B36", display: "block", marginBottom: "0.375rem" }}>{t("name")} *</label>
        <input
          value={data.name}
          onChange={(e) => update({ name: e.target.value })}
          placeholder={data.source_type === "whatsapp" ? t("wizardNamePlaceholderWA") : t("wizardNamePlaceholderPhotos")}
          style={inputStyle}
        />
      </div>

      {/* Description */}
      <div style={{ marginBottom: "1rem" }}>
        <label style={{ fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 500, color: "#403B36", display: "block", marginBottom: "0.375rem" }}>{t("description")}</label>
        <textarea
          value={data.description}
          onChange={(e) => update({ description: e.target.value })}
          rows={2}
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </div>

      {/* Photos-specific config */}
      {data.source_type === "photos" && (
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 500, color: "#403B36", display: "block", marginBottom: "0.375rem" }}>{t("wizardDateRange")}</label>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input
              type="date"
              value={data.photos_date_from}
              onChange={(e) => update({ photos_date_from: e.target.value })}
              style={{ ...inputStyle, flex: 1 }}
            />
            <input
              type="date"
              value={data.photos_date_to}
              onChange={(e) => update({ photos_date_to: e.target.value })}
              style={{ ...inputStyle, flex: 1 }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function StepRouting({ data, update, t }: { data: WizardData; update: (d: Partial<WizardData>) => void; t: (key: string, params?: Record<string, string>) => string }) {
  return (
    <div>
      <h2 style={{ fontFamily: T.font.display, fontSize: "1.0625rem", fontWeight: 600, lineHeight: 1.15, color: "#403B36", marginBottom: "0.25rem" }}>{t("wizardStep3")}</h2>
      <p style={{ fontFamily: T.font.body, color: "#716A5E", fontSize: "0.9375rem", lineHeight: 1.4, marginBottom: "1.25rem" }}>{t("wizardStep3DescRouting")}</p>

      {/* Auto-route toggle */}
      <TuscanCard>
        <div style={{ padding: "1rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontFamily: T.font.body, fontWeight: 500, color: "#403B36" }}>{t("autoRoute")}</div>
            <div style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E", marginTop: "0.25rem" }}>{t("autoRouteDesc")}</div>
          </div>
          <label style={{ position: "relative", display: "inline-block", width: "3rem", height: "1.5rem" }}>
            <input
              type="checkbox"
              checked={data.auto_route_enabled}
              onChange={(e) => update({ auto_route_enabled: e.target.checked })}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span style={{
              position: "absolute",
              cursor: "pointer",
              top: 0, left: 0, right: 0, bottom: 0,
              background: data.auto_route_enabled ? "#B85C38" : T.color.sandstone,
              borderRadius: "1.5rem",
              transition: "0.2s ease",
            }}>
              <span style={{
                position: "absolute",
                height: "1.125rem",
                width: "1.125rem",
                left: data.auto_route_enabled ? "1.5rem" : "0.1875rem",
                bottom: "0.1875rem",
                background: "#FCFAF5",
                borderRadius: "50%",
                transition: "0.2s ease",
              }} />
            </span>
          </label>
        </div>
      </TuscanCard>
    </div>
  );
}

function CheckMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#56683C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function CrossMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#716A5E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function StepReview({ data, t }: { data: WizardData; t: (key: string, params?: Record<string, string>) => string }) {
  const sourceLabel = data.source_type === "whatsapp" ? t("sourceWhatsapp") : t("sourcePhotos");
  return (
    <div>
      <h2 style={{ fontFamily: T.font.display, fontSize: "1.0625rem", fontWeight: 600, lineHeight: 1.15, color: "#403B36", marginBottom: "0.25rem" }}>{t("wizardStep4")}</h2>
      <p style={{ fontFamily: T.font.body, color: "#716A5E", fontSize: "0.9375rem", lineHeight: 1.4, marginBottom: "1.25rem" }}>{t("wizardStep4Desc")}</p>

      <TuscanCard>
        <div style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
            <span aria-hidden="true" style={{ fontSize: "2rem" }}>{data.icon}</span>
            <div>
              <div style={{ fontFamily: T.font.body, fontWeight: 600, fontSize: "1.0625rem", color: "#403B36" }}>{data.name}</div>
              {data.description && <div style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E" }}>{data.description}</div>}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", fontFamily: T.font.body, fontSize: "0.9375rem", color: "#403B36" }}>
            <div><span style={{ color: "#716A5E" }}>{t("wizardReviewSource")}:</span> {sourceLabel}</div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
              <span style={{ color: "#716A5E" }}>{t("wizardReviewAutoRoute")}:</span>
              {data.auto_route_enabled ? <CheckMark /> : <CrossMark />}
              <span>{data.auto_route_enabled ? t("wizardOn") : t("wizardOff")}</span>
            </div>
          </div>
        </div>
      </TuscanCard>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.625rem 0.75rem",
  borderRadius: "0.75rem",
  border: "0.0625rem solid #E3D6BC", // Atrium token: opaque hairline
  fontFamily: T.font.body,
  fontSize: "1rem", // keep >=16px so iOS Safari doesn't zoom on focus
  color: "#403B36",
  outline: "none",
  boxSizing: "border-box",
};
