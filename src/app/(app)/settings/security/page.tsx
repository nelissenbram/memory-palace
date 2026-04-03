"use client";

import React from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";

const F = T.font;
const C = T.color;

/* ─── Category icons (compact versions for settings context) ─── */

function HostingIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect x="6" y="4" width="20" height="8" rx="2" fill={C.terracotta} opacity="0.15" stroke={C.terracotta} strokeWidth="1.5" />
      <rect x="6" y="14" width="20" height="8" rx="2" fill={C.terracotta} opacity="0.08" stroke={C.terracotta} strokeWidth="1.5" />
      <circle cx="10" cy="8" r="1.2" fill={C.terracotta} />
      <circle cx="10" cy="18" r="1.2" fill={C.terracotta} />
      <line x1="14" y1="8" x2="22" y2="8" stroke={C.terracotta} strokeWidth="1.2" strokeLinecap="round" />
      <line x1="14" y1="18" x2="22" y2="18" stroke={C.terracotta} strokeWidth="1.2" strokeLinecap="round" />
      <path d="M12 24h8M16 22v4" stroke={C.walnut} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function EncryptionIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect x="8" y="14" width="16" height="13" rx="3" fill={C.terracotta} opacity="0.12" stroke={C.terracotta} strokeWidth="1.5" />
      <path d="M11 14V10a5 5 0 0 1 10 0v4" stroke={C.terracotta} strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <circle cx="16" cy="20" r="2" fill={C.terracotta} />
      <rect x="15.2" y="21" width="1.6" height="3" rx="0.8" fill={C.terracotta} />
    </svg>
  );
}

function AuthIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M16 3L5 8v7c0 7.5 4.7 13.5 11 16 6.3-2.5 11-8.5 11-16V8L16 3z" fill={C.sage} opacity="0.12" stroke={C.sage} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M11 16l3.5 3.5L21.5 12" stroke={C.sage} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function PrivacyIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M4 16s4-8 12-8 12 8 12 8-4 8-12 8S4 16 4 16z" fill={C.walnut} opacity="0.08" stroke={C.walnut} strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="16" cy="16" r="3.5" stroke={C.walnut} strokeWidth="1.5" fill="none" />
      <circle cx="16" cy="16" r="1.5" fill={C.walnut} />
      <line x1="6" y1="6" x2="26" y2="26" stroke={C.terracotta} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function BackupIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M8 22a5 5 0 0 1-.5-9.97A7 7 0 0 1 21 10a5.5 5.5 0 0 1 3 10H8z" fill={C.sage} opacity="0.12" stroke={C.sage} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M13 18l3 3 3-3" stroke={C.sage} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <line x1="16" y1="13" x2="16" y2="21" stroke={C.sage} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/* ─── Section definitions ─── */

type SectionDef = {
  category: string;
  IconComponent: React.FC<{ size?: number }>;
  titleKey: string;
  items: { labelKey: string; detailKey: string }[];
};

const SECTIONS: SectionDef[] = [
  {
    category: "hosting",
    IconComponent: HostingIcon,
    titleKey: "sectionHostingTitle",
    items: [
      { labelKey: "hostingVercelLabel", detailKey: "hostingVercelDetail" },
      { labelKey: "hostingEuLabel", detailKey: "hostingEuDetail" },
      { labelKey: "hostingGdprLabel", detailKey: "hostingGdprDetail" },
    ],
  },
  {
    category: "encryption",
    IconComponent: EncryptionIcon,
    titleKey: "sectionEncryptionTitle",
    items: [
      { labelKey: "encryptionTransitLabel", detailKey: "encryptionTransitDetail" },
      { labelKey: "encryptionRestLabel", detailKey: "encryptionRestDetail" },
      { labelKey: "encryptionFilesLabel", detailKey: "encryptionFilesDetail" },
      { labelKey: "encryptionPasswordLabel", detailKey: "encryptionPasswordDetail" },
    ],
  },
  {
    category: "auth",
    IconComponent: AuthIcon,
    titleKey: "sectionAuthTitle",
    items: [
      { labelKey: "authEmailLabel", detailKey: "authEmailDetail" },
      { labelKey: "authSocialLabel", detailKey: "authSocialDetail" },
      { labelKey: "authMfaLabel", detailKey: "authMfaDetail" },
      { labelKey: "authRlsLabel", detailKey: "authRlsDetail" },
      { labelKey: "authJwtLabel", detailKey: "authJwtDetail" },
    ],
  },
  {
    category: "privacy",
    IconComponent: PrivacyIcon,
    titleKey: "sectionPrivacyTitle",
    items: [
      { labelKey: "privacyExportLabel", detailKey: "privacyExportDetail" },
      { labelKey: "privacyDeleteLabel", detailKey: "privacyDeleteDetail" },
      { labelKey: "privacyCookieLabel", detailKey: "privacyCookieDetail" },
      { labelKey: "privacyNoTrackingLabel", detailKey: "privacyNoTrackingDetail" },
      { labelKey: "privacyLegacyLabel", detailKey: "privacyLegacyDetail" },
    ],
  },
  {
    category: "backup",
    IconComponent: BackupIcon,
    titleKey: "sectionBackupTitle",
    items: [
      { labelKey: "backupDailyLabel", detailKey: "backupDailyDetail" },
      { labelKey: "backupPitrLabel", detailKey: "backupPitrDetail" },
      { labelKey: "backupReplicatedLabel", detailKey: "backupReplicatedDetail" },
    ],
  },
];

export default function SecuritySettingsPage() {
  const { t } = useTranslation("securityPage");

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h2 style={{
          fontFamily: F.display, fontSize: "1.75rem", fontWeight: 500,
          color: C.charcoal, margin: "0 0 0.5rem",
        }}>
          {t("heroTitle")}
        </h2>
        <p style={{
          fontFamily: F.body, fontSize: "0.9375rem", color: C.muted,
          margin: 0, lineHeight: 1.5, maxWidth: "37.5rem",
        }}>
          {t("heroDescription")}
        </p>
      </div>

      {/* Sections */}
      {SECTIONS.map((section, si) => (
        <div key={si} style={{
          background: C.white,
          borderRadius: "1rem",
          border: `1px solid ${C.cream}`,
          padding: "1.5rem 1.75rem",
          boxShadow: "0 2px 8px rgba(44,44,42,.04)",
          marginBottom: "1rem",
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: "0.75rem",
            marginBottom: "1rem",
          }}>
            <section.IconComponent size={24} />
            <h3 style={{
              fontFamily: F.display, fontSize: "1.25rem", fontWeight: 500,
              color: C.charcoal, margin: 0,
            }}>
              {t(section.titleKey)}
            </h3>
          </div>

          <div style={{
            display: "flex", flexDirection: "column", gap: "0.875rem",
          }}>
            {section.items.map((item, ii) => (
              <div key={ii} style={{
                padding: "0.875rem 1rem",
                borderRadius: "0.625rem",
                background: C.linen,
                border: `1px solid ${C.cream}`,
              }}>
                <h4 style={{
                  fontFamily: F.body, fontSize: "0.875rem", fontWeight: 600,
                  color: C.charcoal, margin: "0 0 0.375rem",
                }}>
                  {t(item.labelKey)}
                </h4>
                <p style={{
                  fontFamily: F.body, fontSize: "0.8125rem",
                  color: C.walnut, lineHeight: 1.6, margin: 0,
                }}>
                  {t(item.detailKey)}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Commitment */}
      <div style={{
        background: `linear-gradient(135deg, ${C.charcoal}, #3D3D3A)`,
        borderRadius: "1rem",
        padding: "1.75rem 2rem",
        marginTop: "0.5rem",
      }}>
        <h3 style={{
          fontFamily: F.display, fontSize: "1.25rem", fontWeight: 300,
          fontStyle: "italic", color: C.linen, lineHeight: 1.3,
          margin: "0 0 0.75rem",
        }}>
          {t("commitmentTitle")}
          <br />
          {t("commitmentTitle2")}
        </h3>
        <p style={{
          fontFamily: F.body, fontSize: "0.8125rem",
          color: C.muted, lineHeight: 1.7, margin: 0,
        }}>
          {t("commitmentBody")}{" "}
          <a
            href="mailto:privacy@thememorypalace.ai"
            style={{ color: C.terracotta, textDecoration: "none" }}
          >
            privacy@thememorypalace.ai
          </a>
          {t("commitmentBodyEnd")}
        </p>
      </div>
    </div>
  );
}

