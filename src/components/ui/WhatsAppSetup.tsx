"use client";

import { useState } from "react";
import { useTranslation } from "@/lib/hooks/useTranslation";
import TuscanCard from "@/components/ui/TuscanCard";
import type { WhatsAppLink, KepExclusion } from "@/types/kep";

interface WhatsAppSetupProps {
  kepId: string;
  link: WhatsAppLink | null;
  exclusions: KepExclusion[];
  onVerify: (groupId: string, groupName: string) => Promise<void>;
  onSendDisclosure: () => Promise<void>;
}

export function WhatsAppSetup({ kepId, link, exclusions, onVerify, onSendDisclosure }: WhatsAppSetupProps) {
  const { t } = useTranslation("kep");
  const [groupId, setGroupId] = useState(link?.wa_group_id || "");
  const [groupName, setGroupName] = useState(link?.wa_group_name || "");
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async () => {
    if (!groupId.trim()) return;
    setIsVerifying(true);
    try {
      await onVerify(groupId.trim(), groupName.trim());
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <h3 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 600 }}>{t("whatsappSetup")}</h3>

      {/* Group connection */}
      <TuscanCard>
        <div style={{ padding: "1.25rem" }}>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ fontSize: "0.875rem", fontWeight: 500, display: "block", marginBottom: "0.375rem" }}>{t("whatsappGroupId")} *</label>
            <input
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              disabled={!!link?.verified}
              placeholder="e.g., 120363..."
              style={{
                width: "100%",
                padding: "0.625rem 0.75rem",
                borderRadius: "0.375rem",
                border: "1px solid #d1d5db",
                fontSize: "0.875rem",
                boxSizing: "border-box",
                background: link?.verified ? "#f9fafb" : "#fff",
              }}
            />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ fontSize: "0.875rem", fontWeight: 500, display: "block", marginBottom: "0.375rem" }}>{t("whatsappGroupName")}</label>
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              disabled={!!link?.verified}
              placeholder={t("whatsappOptional")}
              style={{
                width: "100%",
                padding: "0.625rem 0.75rem",
                borderRadius: "0.375rem",
                border: "1px solid #d1d5db",
                fontSize: "0.875rem",
                boxSizing: "border-box",
                background: link?.verified ? "#f9fafb" : "#fff",
              }}
            />
          </div>

          {link?.verified ? (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#10b981", fontSize: "0.875rem", fontWeight: 500 }}>
              \u2705 {t("whatsappVerified")}
              {link.verified_at && <span style={{ color: "#9ca3af", fontWeight: 500 }}>({new Date(link.verified_at).toLocaleDateString()})</span>}
            </div>
          ) : (
            <button
              onClick={handleVerify}
              disabled={!groupId.trim() || isVerifying}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "0.375rem",
                background: groupId.trim() && !isVerifying ? "#b45309" : "#d1d5db",
                color: "#fff",
                border: "none",
                cursor: groupId.trim() && !isVerifying ? "pointer" : "not-allowed",
                fontWeight: 500,
                fontSize: "0.875rem",
              }}
            >
              {isVerifying ? t("whatsappVerifying") : t("whatsappVerifyGroup")}
            </button>
          )}
        </div>
      </TuscanCard>

      {/* Disclosure */}
      {link?.verified && (
        <TuscanCard>
          <div style={{ padding: "1.25rem" }}>
            <h4 style={{ margin: "0 0 0.5rem", fontSize: "1rem" }}>{t("whatsappDisclosure")}</h4>
            <p style={{ fontSize: "0.8125rem", color: "#6b7280", margin: "0 0 0.75rem", lineHeight: 1.5 }}>
              {t("whatsappDisclosureText")}
            </p>
            <p style={{ fontSize: "0.75rem", color: "#9ca3af", margin: "0 0 0.75rem" }}>
              {t("whatsappStopHandling")}
            </p>

            {link.disclosure_sent ? (
              <div style={{ color: "#10b981", fontSize: "0.875rem", fontWeight: 500 }}>
                \u2705 {t("whatsappDisclosureSent")}
                {link.disclosure_sent_at && <span style={{ color: "#9ca3af", fontWeight: 500 }}> ({new Date(link.disclosure_sent_at).toLocaleDateString()})</span>}
              </div>
            ) : (
              <button
                onClick={onSendDisclosure}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "0.375rem",
                  background: "#f59e0b",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 500,
                  fontSize: "0.875rem",
                }}
              >
                {t("whatsappSendDisclosure")}
              </button>
            )}
          </div>
        </TuscanCard>
      )}

      {/* Exclusions */}
      {link?.verified && (
        <TuscanCard>
          <div style={{ padding: "1.25rem" }}>
            <h4 style={{ margin: "0 0 0.75rem", fontSize: "1rem" }}>{t("whatsappExclusions")}</h4>
            {exclusions.length === 0 ? (
              <p style={{ fontSize: "0.875rem", color: "#6b7280", margin: 0 }}>{t("whatsappNoExclusions")}</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.875rem" }}>
                {exclusions.map((ex) => (
                  <li key={ex.id} style={{ marginBottom: "0.375rem" }}>
                    {ex.phone_number}
                    <span style={{ color: "#9ca3af", marginLeft: "0.5rem" }}>
                      ({new Date(ex.excluded_at).toLocaleDateString()})
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </TuscanCard>
      )}
    </div>
  );
}
