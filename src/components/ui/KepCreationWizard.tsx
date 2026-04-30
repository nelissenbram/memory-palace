"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useKepStore } from "@/lib/stores/kepStore";
import TuscanCard from "@/components/ui/TuscanCard";
import { WIZARD_STEPS, INITIAL_WIZARD_DATA, buildCreatePayload, SOURCE_ICONS } from "@/lib/kep/creation-steps";
import type { WizardData } from "@/lib/kep/creation-steps";
import type { KepSourceType } from "@/types/kep";

export function KepCreationWizard() {
  const { t } = useTranslation("kep");
  const router = useRouter();
  const { createKep, isCreating } = useKepStore();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardData>(INITIAL_WIZARD_DATA);

  const currentStep = WIZARD_STEPS[step];
  const canProceed = currentStep.isValid(data);

  const handleNext = () => {
    if (step < WIZARD_STEPS.length - 1) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleCreate = async () => {
    const payload = buildCreatePayload(data);
    const kep = await createKep(payload);
    if (kep) {
      // If WhatsApp, verify group
      if (data.source_type === "whatsapp" && data.wa_group_id) {
        await fetch("/api/keps/whatsapp/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kep_id: kep.id,
            wa_group_id: data.wa_group_id,
            wa_group_name: data.wa_group_name,
          }),
        });
      }
      router.push(`/palace/keps/${kep.id}`);
    }
  };

  const update = (partial: Partial<WizardData>) => setData({ ...data, ...partial });

  return (
    <div style={{ maxWidth: "36rem", margin: "0 auto", padding: "1.5rem" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>{t("wizardTitle")}</h1>

      {/* Step indicator */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem" }}>
        {WIZARD_STEPS.map((s, i) => (
          <div key={s.id} style={{ flex: 1, height: "0.25rem", borderRadius: "0.125rem", background: i <= step ? "#b45309" : "#e5e7eb" }} />
        ))}
      </div>

      {/* Step content */}
      {step === 0 && <StepSource data={data} update={update} t={t} />}
      {step === 1 && <StepConfigure data={data} update={update} t={t} />}
      {step === 2 && <StepRouting data={data} update={update} t={t} />}
      {step === 3 && <StepReview data={data} t={t} />}

      {/* Navigation */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "2rem" }}>
        <button
          onClick={step === 0 ? () => router.back() : handleBack}
          style={{ padding: "0.625rem 1.25rem", borderRadius: "0.375rem", background: "#f3f4f6", border: "none", cursor: "pointer", fontWeight: 500 }}
        >
          {t("wizardBack")}
        </button>

        {step < WIZARD_STEPS.length - 1 ? (
          <button
            onClick={handleNext}
            disabled={!canProceed}
            style={{
              padding: "0.625rem 1.25rem",
              borderRadius: "0.375rem",
              background: canProceed ? "#b45309" : "#d1d5db",
              color: "#fff",
              border: "none",
              cursor: canProceed ? "pointer" : "not-allowed",
              fontWeight: 600,
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
              borderRadius: "0.375rem",
              background: "#b45309",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              opacity: isCreating ? 0.6 : 1,
            }}
          >
            {isCreating ? t("wizardCreating") : t("wizardCreate")}
          </button>
        )}
      </div>
    </div>
  );
}

function StepSource({ data, update, t }: { data: WizardData; update: (d: Partial<WizardData>) => void; t: (key: string, params?: Record<string, string>) => string }) {
  const sources: { type: KepSourceType; icon: string; desc: string }[] = [
    { type: "whatsapp", icon: "\u{1F4AC}", desc: t("wizardWhatsappDesc") },
    { type: "photos", icon: "\u{1F4F8}", desc: t("wizardPhotosDesc") },
  ];

  return (
    <div>
      <h2 style={{ fontSize: "1.125rem", marginBottom: "0.25rem" }}>{t("wizardStep1")}</h2>
      <p style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: "1.25rem" }}>{t("wizardStep1Desc")}</p>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {sources.map((s) => (
          <div
            key={s.type}
            onClick={() => update({ source_type: s.type, icon: SOURCE_ICONS[s.type] })}
            style={{
              cursor: "pointer",
              border: data.source_type === s.type ? "2px solid #b45309" : "2px solid transparent",
              borderRadius: "1rem",
            }}
          >
            <TuscanCard>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <span style={{ fontSize: "2rem" }}>{s.icon}</span>
                <div>
                  <div style={{ fontWeight: 600 }}>{s.type === "whatsapp" ? t("sourceWhatsapp") : t("sourcePhotos")}</div>
                  <div style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "0.25rem" }}>{s.desc}</div>
                </div>
              </div>
            </TuscanCard>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepConfigure({ data, update, t }: { data: WizardData; update: (d: Partial<WizardData>) => void; t: (key: string, params?: Record<string, string>) => string }) {
  return (
    <div>
      <h2 style={{ fontSize: "1.125rem", marginBottom: "0.25rem" }}>{t("wizardStep2")}</h2>
      <p style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: "1.25rem" }}>{t("wizardStep2Desc")}</p>

      {/* Name */}
      <div style={{ marginBottom: "1rem" }}>
        <label style={{ fontSize: "0.875rem", fontWeight: 500, display: "block", marginBottom: "0.375rem" }}>{t("name")} *</label>
        <input
          value={data.name}
          onChange={(e) => update({ name: e.target.value })}
          placeholder={data.source_type === "whatsapp" ? t("wizardNamePlaceholderWA") : t("wizardNamePlaceholderPhotos")}
          style={inputStyle}
        />
      </div>

      {/* Description */}
      <div style={{ marginBottom: "1rem" }}>
        <label style={{ fontSize: "0.875rem", fontWeight: 500, display: "block", marginBottom: "0.375rem" }}>{t("description")}</label>
        <textarea
          value={data.description}
          onChange={(e) => update({ description: e.target.value })}
          rows={2}
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </div>

      {/* Source-specific config */}
      {data.source_type === "whatsapp" && (
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ fontSize: "0.875rem", fontWeight: 500, display: "block", marginBottom: "0.375rem" }}>{t("whatsappGroupId")} *</label>
          <input
            value={data.wa_group_id}
            onChange={(e) => update({ wa_group_id: e.target.value })}
            placeholder={t("wizardGroupIdPlaceholder")}
            style={inputStyle}
          />
          <div style={{ marginTop: "0.75rem" }}>
            <label style={{ fontSize: "0.875rem", fontWeight: 500, display: "block", marginBottom: "0.375rem" }}>{t("whatsappGroupName")}</label>
            <input
              value={data.wa_group_name}
              onChange={(e) => update({ wa_group_name: e.target.value })}
              placeholder={t("wizardGroupNamePlaceholder")}
              style={inputStyle}
            />
          </div>
        </div>
      )}

      {data.source_type === "photos" && (
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ fontSize: "0.875rem", fontWeight: 500, display: "block", marginBottom: "0.375rem" }}>{t("wizardDateRange")}</label>
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
      <h2 style={{ fontSize: "1.125rem", marginBottom: "0.25rem" }}>{t("wizardStep3")}</h2>
      <p style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: "1.25rem" }}>{t("wizardStep3Desc")}</p>

      {/* Auto-route toggle */}
      <TuscanCard>
        <div style={{ padding: "1rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 500 }}>{t("autoRoute")}</div>
            <div style={{ fontSize: "0.8125rem", color: "#6b7280", marginTop: "0.25rem" }}>{t("autoRouteDesc")}</div>
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
              background: data.auto_route_enabled ? "#b45309" : "#d1d5db",
              borderRadius: "1.5rem",
              transition: "0.2s",
            }}>
              <span style={{
                position: "absolute",
                height: "1.125rem",
                width: "1.125rem",
                left: data.auto_route_enabled ? "1.5rem" : "0.1875rem",
                bottom: "0.1875rem",
                background: "#fff",
                borderRadius: "50%",
                transition: "0.2s",
              }} />
            </span>
          </label>
        </div>
      </TuscanCard>
    </div>
  );
}

function StepReview({ data, t }: { data: WizardData; t: (key: string, params?: Record<string, string>) => string }) {
  return (
    <div>
      <h2 style={{ fontSize: "1.125rem", marginBottom: "0.25rem" }}>{t("wizardStep4")}</h2>
      <p style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: "1.25rem" }}>{t("wizardStep4Desc")}</p>

      <TuscanCard>
        <div style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
            <span style={{ fontSize: "2rem" }}>{data.icon}</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: "1.125rem" }}>{data.name}</div>
              {data.description && <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>{data.description}</div>}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", fontSize: "0.875rem" }}>
            <div><span style={{ color: "#6b7280" }}>{t("wizardReviewSource")}:</span> {data.source_type === "whatsapp" ? "\u{1F4AC} WhatsApp" : "\u{1F4F8} Google Photos"}</div>
            <div><span style={{ color: "#6b7280" }}>{t("wizardReviewAutoRoute")}:</span> {data.auto_route_enabled ? `\u2705 ${t("wizardOn")}` : `\u274C ${t("wizardOff")}`}</div>
            {data.source_type === "whatsapp" && data.wa_group_name && (
              <div><span style={{ color: "#6b7280" }}>{t("wizardReviewGroup")}:</span> {data.wa_group_name}</div>
            )}
          </div>
        </div>
      </TuscanCard>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.625rem 0.75rem",
  borderRadius: "0.375rem",
  border: "1px solid #d1d5db",
  fontSize: "0.875rem",
  outline: "none",
  boxSizing: "border-box",
};
