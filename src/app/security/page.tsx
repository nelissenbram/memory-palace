"use client";

import Link from "next/link";
import { T } from "@/lib/theme";
import { useIsMobile, useIsSmall } from "@/lib/hooks/useIsMobile";
import { useTranslation } from "@/lib/hooks/useTranslation";
import PalaceLogo from "@/components/landing/PalaceLogo";

const F = T.font;
const C = T.color;

/* ─── Custom SVG icons per security category ─── */

function HostingIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      {/* Server rack */}
      <rect x="6" y="4" width="20" height="8" rx="2" fill={C.terracotta} opacity="0.15" stroke={C.terracotta} strokeWidth="1.5" />
      <rect x="6" y="14" width="20" height="8" rx="2" fill={C.terracotta} opacity="0.08" stroke={C.terracotta} strokeWidth="1.5" />
      <circle cx="10" cy="8" r="1.2" fill={C.terracotta} />
      <circle cx="10" cy="18" r="1.2" fill={C.terracotta} />
      <line x1="14" y1="8" x2="22" y2="8" stroke={C.terracotta} strokeWidth="1.2" strokeLinecap="round" />
      <line x1="14" y1="18" x2="22" y2="18" stroke={C.terracotta} strokeWidth="1.2" strokeLinecap="round" />
      {/* Base */}
      <path d="M12 24h8M16 22v4" stroke={C.walnut} strokeWidth="1.5" strokeLinecap="round" />
      {/* EU stars hint */}
      <circle cx="26" cy="5" r="0.8" fill={C.sage} />
      <circle cx="28" cy="7" r="0.8" fill={C.sage} />
      <circle cx="26" cy="9" r="0.8" fill={C.sage} />
    </svg>
  );
}

function EncryptionIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      {/* Lock body */}
      <rect x="8" y="14" width="16" height="13" rx="3" fill={C.terracotta} opacity="0.12" stroke={C.terracotta} strokeWidth="1.5" />
      {/* Lock shackle */}
      <path d="M11 14V10a5 5 0 0 1 10 0v4" stroke={C.terracotta} strokeWidth="1.8" strokeLinecap="round" fill="none" />
      {/* Keyhole */}
      <circle cx="16" cy="20" r="2" fill={C.terracotta} />
      <rect x="15.2" y="21" width="1.6" height="3" rx="0.8" fill={C.terracotta} />
    </svg>
  );
}

function AuthIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      {/* Shield */}
      <path d="M16 3L5 8v7c0 7.5 4.7 13.5 11 16 6.3-2.5 11-8.5 11-16V8L16 3z" fill={C.sage} opacity="0.12" stroke={C.sage} strokeWidth="1.5" strokeLinejoin="round" />
      {/* Checkmark */}
      <path d="M11 16l3.5 3.5L21.5 12" stroke={C.sage} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function PrivacyIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      {/* Eye with line through */}
      <path d="M4 16s4-8 12-8 12 8 12 8-4 8-12 8S4 16 4 16z" fill={C.walnut} opacity="0.08" stroke={C.walnut} strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="16" cy="16" r="3.5" stroke={C.walnut} strokeWidth="1.5" fill="none" />
      <circle cx="16" cy="16" r="1.5" fill={C.walnut} />
      {/* Privacy slash */}
      <line x1="6" y1="6" x2="26" y2="26" stroke={C.terracotta} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function BackupIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      {/* Cloud */}
      <path d="M8 22a5 5 0 0 1-.5-9.97A7 7 0 0 1 21 10a5.5 5.5 0 0 1 3 10H8z" fill={C.sage} opacity="0.12" stroke={C.sage} strokeWidth="1.5" strokeLinejoin="round" />
      {/* Circular arrow */}
      <path d="M13 18l3 3 3-3" stroke={C.sage} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <line x1="16" y1="13" x2="16" y2="21" stroke={C.sage} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function BackArrowIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ─── Item icons — smaller, per-feature SVGs ─── */

function ItemIcon({ category, index, size = 24 }: { category: string; index: number; size?: number }) {
  const s = size;
  const clr = category === "hosting" ? C.terracotta
    : category === "encryption" ? C.terracotta
    : category === "auth" ? C.sage
    : category === "privacy" ? C.walnut
    : C.sage;

  // Each category gets distinct mini-icons per item
  const icons: Record<string, React.ReactElement[]> = {
    hosting: [
      // Globe (Vercel hosting)
      <svg key="h0" width={s} height={s} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke={clr} strokeWidth="1.4" /><ellipse cx="12" cy="12" rx="4.5" ry="9" stroke={clr} strokeWidth="1.2" /><line x1="3" y1="12" x2="21" y2="12" stroke={clr} strokeWidth="1.2" /></svg>,
      // EU flag
      <svg key="h1" width={s} height={s} viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" stroke={clr} strokeWidth="1.4" fill={clr} opacity="0.08" /><circle cx="12" cy="12" r="1" fill={clr} />{[0,60,120,180,240,300].map(a=><circle key={a} cx={12+4*Math.cos(a*Math.PI/180)} cy={12+4*Math.sin(a*Math.PI/180)} r="0.7" fill={clr} />)}</svg>,
      // Compliance document
      <svg key="h2" width={s} height={s} viewBox="0 0 24 24" fill="none"><rect x="5" y="2" width="14" height="20" rx="2" stroke={clr} strokeWidth="1.4" fill={clr} opacity="0.06" /><line x1="8" y1="7" x2="16" y2="7" stroke={clr} strokeWidth="1.2" strokeLinecap="round" /><line x1="8" y1="11" x2="14" y2="11" stroke={clr} strokeWidth="1.2" strokeLinecap="round" /><path d="M9 15l2 2 4-4" stroke={clr} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>,
    ],
    encryption: [
      // TLS / transit
      <svg key="e0" width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M4 12h4m8 0h4" stroke={clr} strokeWidth="1.4" strokeLinecap="round" /><rect x="8" y="8" width="8" height="8" rx="2" stroke={clr} strokeWidth="1.4" fill={clr} opacity="0.08" /><path d="M10.5 12l1.5 1.5 2.5-3" stroke={clr} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>,
      // At rest / database
      <svg key="e1" width={s} height={s} viewBox="0 0 24 24" fill="none"><ellipse cx="12" cy="7" rx="7" ry="3" stroke={clr} strokeWidth="1.4" fill={clr} opacity="0.06" /><path d="M5 7v10c0 1.66 3.13 3 7 3s7-1.34 7-3V7" stroke={clr} strokeWidth="1.4" /><ellipse cx="12" cy="13" rx="7" ry="2.5" stroke={clr} strokeWidth="0.8" opacity="0.4" /></svg>,
      // File encryption
      <svg key="e2" width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke={clr} strokeWidth="1.4" fill={clr} opacity="0.06" /><path d="M14 2v6h6" stroke={clr} strokeWidth="1.4" /><rect x="8" y="13" width="8" height="5" rx="1.5" stroke={clr} strokeWidth="1.2" /><circle cx="12" cy="15.5" r="1" fill={clr} /></svg>,
      // Password / key
      <svg key="e3" width={s} height={s} viewBox="0 0 24 24" fill="none"><circle cx="8" cy="12" r="4" stroke={clr} strokeWidth="1.4" fill={clr} opacity="0.08" /><line x1="12" y1="12" x2="21" y2="12" stroke={clr} strokeWidth="1.4" strokeLinecap="round" /><line x1="18" y1="12" x2="18" y2="9" stroke={clr} strokeWidth="1.4" strokeLinecap="round" /><line x1="21" y1="12" x2="21" y2="9" stroke={clr} strokeWidth="1.4" strokeLinecap="round" /></svg>,
    ],
    auth: [
      // Email magic link
      <svg key="a0" width={s} height={s} viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" stroke={clr} strokeWidth="1.4" fill={clr} opacity="0.06" /><path d="M3 7l9 6 9-6" stroke={clr} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>,
      // Social OAuth
      <svg key="a1" width={s} height={s} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke={clr} strokeWidth="1.4" fill={clr} opacity="0.08" /><path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" stroke={clr} strokeWidth="1.4" strokeLinecap="round" /><circle cx="19" cy="8" r="2.5" stroke={clr} strokeWidth="1.2" /><path d="M19 6.5v3M17.5 8h3" stroke={clr} strokeWidth="1.2" strokeLinecap="round" /></svg>,
      // 2FA / phone
      <svg key="a2" width={s} height={s} viewBox="0 0 24 24" fill="none"><rect x="7" y="2" width="10" height="20" rx="2.5" stroke={clr} strokeWidth="1.4" fill={clr} opacity="0.06" /><line x1="7" y1="5" x2="17" y2="5" stroke={clr} strokeWidth="1" /><line x1="7" y1="19" x2="17" y2="19" stroke={clr} strokeWidth="1" /><circle cx="12" cy="21" r="0.5" fill={clr} /><path d="M10 11l1.5 1.5 3-3" stroke={clr} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>,
      // RLS / person
      <svg key="a3" width={s} height={s} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="3.5" stroke={clr} strokeWidth="1.4" fill={clr} opacity="0.08" /><path d="M5 20c0-3 3.1-5.5 7-5.5s7 2.5 7 5.5" stroke={clr} strokeWidth="1.4" strokeLinecap="round" /><rect x="16" y="12" width="5" height="5" rx="1" stroke={clr} strokeWidth="1.2" /><path d="M17.5 14.5h2" stroke={clr} strokeWidth="1" strokeLinecap="round" /></svg>,
      // JWT token
      <svg key="a4" width={s} height={s} viewBox="0 0 24 24" fill="none"><rect x="3" y="7" width="18" height="10" rx="2" stroke={clr} strokeWidth="1.4" fill={clr} opacity="0.06" /><circle cx="7" cy="12" r="2" stroke={clr} strokeWidth="1.2" /><line x1="11" y1="10" x2="19" y2="10" stroke={clr} strokeWidth="1.2" strokeLinecap="round" /><line x1="11" y1="14" x2="16" y2="14" stroke={clr} strokeWidth="1.2" strokeLinecap="round" /></svg>,
    ],
    privacy: [
      // Export / download
      <svg key="p0" width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M12 3v12M8 11l4 4 4-4" stroke={clr} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" stroke={clr} strokeWidth="1.4" strokeLinecap="round" /></svg>,
      // Delete / trash
      <svg key="p1" width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M5 7h14l-1.5 14H6.5L5 7z" stroke={clr} strokeWidth="1.4" fill={clr} opacity="0.06" /><line x1="3" y1="7" x2="21" y2="7" stroke={clr} strokeWidth="1.4" strokeLinecap="round" /><path d="M9 4h6" stroke={clr} strokeWidth="1.4" strokeLinecap="round" /><line x1="10" y1="10" x2="10" y2="18" stroke={clr} strokeWidth="1.2" strokeLinecap="round" /><line x1="14" y1="10" x2="14" y2="18" stroke={clr} strokeWidth="1.2" strokeLinecap="round" /></svg>,
      // Cookie
      <svg key="p2" width={s} height={s} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke={clr} strokeWidth="1.4" fill={clr} opacity="0.08" /><circle cx="9" cy="10" r="1.2" fill={clr} /><circle cx="14" cy="8" r="1" fill={clr} /><circle cx="15" cy="14" r="1.2" fill={clr} /><circle cx="10" cy="15" r="0.9" fill={clr} /><path d="M19 8a4 4 0 01-4 0" stroke={clr} strokeWidth="1" opacity="0.3" /></svg>,
      // No tracking
      <svg key="p3" width={s} height={s} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke={clr} strokeWidth="1.4" /><circle cx="12" cy="12" r="5" stroke={clr} strokeWidth="1.2" opacity="0.4" /><circle cx="12" cy="12" r="1.5" fill={clr} /><line x1="4" y1="4" x2="20" y2="20" stroke={C.terracotta} strokeWidth="2" strokeLinecap="round" /></svg>,
      // Legacy / dove
      <svg key="p4" width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M12 21s-6-3-6-9V6l6-3 6 3v6c0 6-6 9-6 9z" stroke={clr} strokeWidth="1.4" fill={clr} opacity="0.08" /><path d="M9 12.5l2 2 4-4" stroke={clr} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>,
    ],
    backup: [
      // Daily backup
      <svg key="b0" width={s} height={s} viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="16" rx="2" stroke={clr} strokeWidth="1.4" fill={clr} opacity="0.06" /><line x1="3" y1="9" x2="21" y2="9" stroke={clr} strokeWidth="1.2" /><line x1="8" y1="4" x2="8" y2="9" stroke={clr} strokeWidth="1.2" /><line x1="16" y1="4" x2="16" y2="9" stroke={clr} strokeWidth="1.2" /><path d="M9 14l2 2 4-4" stroke={clr} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>,
      // PITR / clock
      <svg key="b1" width={s} height={s} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke={clr} strokeWidth="1.4" fill={clr} opacity="0.06" /><path d="M12 6v6l4 2" stroke={clr} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M4 12a8 8 0 011.5-4.5" stroke={clr} strokeWidth="1.4" strokeLinecap="round" /><path d="M5 4v3.5h3.5" stroke={clr} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>,
      // Multi-region / globe
      <svg key="b2" width={s} height={s} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke={clr} strokeWidth="1.4" fill={clr} opacity="0.06" /><ellipse cx="12" cy="12" rx="4.5" ry="9" stroke={clr} strokeWidth="1" /><line x1="3" y1="9" x2="21" y2="9" stroke={clr} strokeWidth="1" /><line x1="3" y1="15" x2="21" y2="15" stroke={clr} strokeWidth="1" /><circle cx="8" cy="9" r="1.2" fill={clr} /><circle cx="17" cy="15" r="1.2" fill={clr} /></svg>,
    ],
  };

  const categoryIcons = icons[category] || [];
  return categoryIcons[index] || <svg width={s} height={s} />;
}

/* ─── Section type with SVG icon component ─── */

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

/* ─── Hero shield SVG ─── */

function HeroShield({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path
        d="M32 4L8 16v14c0 16 10.2 28.5 24 34 13.8-5.5 24-18 24-34V16L32 4z"
        fill={C.terracotta}
        opacity="0.1"
        stroke={C.terracotta}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M22 32l7 7L42 25"
        stroke={C.terracotta}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Decorative inner lines */}
      <path
        d="M32 10L14 19v11c0 12 7.6 22 18 27"
        stroke={C.terracotta}
        opacity="0.15"
        strokeWidth="1"
        fill="none"
      />
    </svg>
  );
}

/* ─── Commitment dove SVG ─── */

function CommitmentDove({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      {/* Dove body */}
      <path
        d="M12 36c2-6 8-10 14-10 2 0 4-2 4-4s-2-4-4-4c-1 0-2-1-2-2s1-2 2-2c6 0 10 4 10 10 0 8-6 14-14 14-4 0-8-1-10-2z"
        fill={C.linen}
        stroke={C.linen}
        strokeWidth="1.5"
        opacity="0.9"
      />
      {/* Wing */}
      <path
        d="M20 22c-4-6-2-12 4-14-2 4 0 8 4 10"
        stroke={C.linen}
        strokeWidth="1.5"
        fill="none"
        opacity="0.7"
      />
      {/* Olive branch */}
      <path d="M12 36c-2 2-4 4-2 6" stroke={C.sage} strokeWidth="1.5" strokeLinecap="round" />
      <ellipse cx="9" cy="40" rx="2" ry="1" fill={C.sage} opacity="0.6" transform="rotate(-20 9 40)" />
      <ellipse cx="7" cy="42" rx="2" ry="1" fill={C.sage} opacity="0.4" transform="rotate(-40 7 42)" />
    </svg>
  );
}

export default function SecurityPage() {
  const isMobile = useIsMobile();
  const isSmall = useIsSmall();
  const { t, locale, setLocale } = useTranslation("securityPage");

  return (
    <div
      style={{
        width: "100vw",
        minHeight: "100vh",
        overflowX: "hidden",
        background: C.linen,
        fontFamily: F.body,
        color: C.charcoal,
      }}
    >
      {/* --- Nav --- */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 clamp(20px, 5vw, 60px)",
          height: 64,
          background: "rgba(250,250,247,0.92)",
          backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${C.sandstone}40`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Back button */}
          <Link
            href="/"
            aria-label="Back to home"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              height: 32,
              borderRadius: 8,
              border: `1px solid ${C.sandstone}50`,
              background: "none",
              color: C.walnut,
              textDecoration: "none",
              transition: "border-color 0.2s",
            }}
          >
            <BackArrowIcon />
          </Link>
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              textDecoration: "none",
            }}
          >
            <PalaceLogo variant="mark" color="dark" size="sm" />
            {!isSmall && (
              <span
                style={{
                  fontFamily: F.display,
                  fontSize: 20,
                  fontWeight: 500,
                  color: C.charcoal,
                  letterSpacing: "-0.3px",
                }}
              >
                {t("navBrand")}
              </span>
            )}
          </Link>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Language toggle */}
          <button
            onClick={() => setLocale(locale === "en" ? "nl" : "en")}
            aria-label="Switch language"
            style={{
              background: "none",
              border: `1px solid ${C.sandstone}60`,
              borderRadius: "0.375rem",
              padding: "0.25rem 0.5rem",
              fontSize: "0.75rem",
              fontFamily: F.body,
              fontWeight: 600,
              color: C.walnut,
              cursor: "pointer",
              letterSpacing: "0.5px",
              textTransform: "uppercase",
              transition: "border-color 0.2s, color 0.2s",
            }}
          >
            {locale === "en" ? "NL" : "EN"}
          </button>
          <Link
            href="/register"
            style={{
              fontFamily: F.body,
              fontSize: 14,
              fontWeight: 600,
              color: C.white,
              textDecoration: "none",
              padding: isMobile ? "10px 18px" : "8px 20px",
              borderRadius: 10,
              background: `linear-gradient(135deg, ${C.terracotta}, ${C.walnut})`,
            }}
          >
            {t("getStarted")}
          </Link>
        </div>
      </nav>

      {/* --- Hero --- */}
      <section
        style={{
          textAlign: "center",
          padding: isMobile ? "60px 20px 50px" : "80px clamp(20px, 5vw, 60px) 60px",
          background: `radial-gradient(ellipse at 50% 30%, ${C.warmStone}, ${C.linen} 70%)`,
        }}
      >
        <div style={{ display: "inline-block", marginBottom: 20 }}>
          <HeroShield size={isMobile ? 48 : 56} />
        </div>
        <h1
          style={{
            fontFamily: F.display,
            fontSize: "clamp(32px, 5vw, 56px)",
            fontWeight: 300,
            lineHeight: 1.15,
            color: C.charcoal,
            marginBottom: 16,
          }}
        >
          {t("heroTitle")}
        </h1>
        <p
          style={{
            fontSize: "clamp(17px, 2.2vw, 20px)",
            color: C.walnut,
            maxWidth: 600,
            margin: "0 auto",
            lineHeight: 1.7,
          }}
        >
          {t("heroDescription")}
        </p>
      </section>

      {/* --- Sections --- */}
      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
          padding: isMobile
            ? "40px 20px 60px"
            : "60px clamp(20px, 5vw, 60px) 80px",
        }}
      >
        {SECTIONS.map((section, si) => (
          <div key={si} style={{ marginBottom: 56 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 24,
              }}
            >
              <section.IconComponent size={isMobile ? 24 : 28} />
              <h2
                style={{
                  fontFamily: F.display,
                  fontSize: "clamp(24px, 3vw, 32px)",
                  fontWeight: 400,
                  color: C.charcoal,
                  margin: 0,
                }}
              >
                {t(section.titleKey)}
              </h2>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  isSmall
                    ? "1fr"
                    : section.items.length === 2
                    ? "repeat(2, 1fr)"
                    : "repeat(auto-fit, minmax(250px, 1fr))",
                gap: isMobile ? 16 : 20,
              }}
            >
              {section.items.map((item, ii) => (
                <div
                  key={ii}
                  style={{
                    background: C.white,
                    borderRadius: 16,
                    padding: isMobile ? "24px 20px" : "28px 24px",
                    border: `1px solid ${C.sandstone}50`,
                  }}
                >
                  <div style={{ marginBottom: 12 }}>
                    <ItemIcon category={section.category} index={ii} size={24} />
                  </div>
                  <h3
                    style={{
                      fontFamily: F.display,
                      fontSize: "clamp(18px, 2vw, 22px)",
                      fontWeight: 500,
                      color: C.charcoal,
                      marginBottom: 8,
                    }}
                  >
                    {t(item.labelKey)}
                  </h3>
                  <p
                    style={{
                      fontSize: "clamp(15px, 1.6vw, 17px)",
                      color: C.walnut,
                      lineHeight: 1.7,
                      margin: 0,
                    }}
                  >
                    {t(item.detailKey)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* --- Commitment --- */}
        <div
          style={{
            background: `linear-gradient(135deg, ${C.charcoal}, #3D3D3A)`,
            borderRadius: 20,
            padding: isMobile ? "36px 24px" : "48px 40px",
            textAlign: "center",
            marginTop: 20,
          }}
        >
          <div style={{ display: "inline-block", marginBottom: 16 }}>
            <CommitmentDove size={isMobile ? 36 : 40} />
          </div>
          <h2
            style={{
              fontFamily: F.display,
              fontSize: "clamp(24px, 3vw, 34px)",
              fontWeight: 300,
              fontStyle: "italic",
              color: C.linen,
              lineHeight: 1.3,
              maxWidth: 600,
              margin: "0 auto 16px",
            }}
          >
            {t("commitmentTitle")}
            <br />
            {t("commitmentTitle2")}
          </h2>
          <p
            style={{
              fontSize: "clamp(15px, 1.6vw, 17px)",
              color: C.muted,
              lineHeight: 1.7,
              maxWidth: 520,
              margin: "0 auto",
            }}
          >
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

      {/* --- CTA --- */}
      <section
        style={{
          padding: isMobile ? "40px 20px 60px" : "60px clamp(20px, 5vw, 60px) 80px",
          textAlign: "center",
          background: C.warmStone,
        }}
      >
        <h2
          style={{
            fontFamily: F.display,
            fontSize: "clamp(24px, 3.5vw, 38px)",
            fontWeight: 300,
            color: C.charcoal,
            marginBottom: 16,
            lineHeight: 1.2,
          }}
        >
          {t("ctaTitle")}
        </h2>
        <p
          style={{
            fontSize: "clamp(15px, 1.8vw, 17px)",
            color: C.walnut,
            maxWidth: 480,
            margin: "0 auto 32px",
            lineHeight: 1.6,
          }}
        >
          {t("ctaDescription")}
        </p>
        <Link
          href="/register"
          style={{
            display: "inline-block",
            fontFamily: F.body,
            fontSize: 16,
            fontWeight: 600,
            color: C.white,
            textDecoration: "none",
            padding: "16px 36px",
            borderRadius: 14,
            background: `linear-gradient(135deg, ${C.terracotta}, ${C.walnut})`,
            boxShadow: "0 4px 20px rgba(193,127,89,0.3)",
          }}
        >
          {t("ctaButton")}
        </Link>
      </section>

      {/* --- Footer --- */}
      <footer
        style={{
          padding: "28px clamp(20px, 5vw, 60px)",
          borderTop: `1px solid ${C.sandstone}40`,
          background: C.charcoal,
          textAlign: "center",
        }}
      >
        <div style={{ marginBottom: 12, display: "flex", justifyContent: "center", gap: 24 }}>
          <Link href="/privacy" style={{ fontSize: 13, color: C.muted, textDecoration: "none" }}>
            {t("privacyPolicy")}
          </Link>
          <Link href="/terms" style={{ fontSize: 13, color: C.muted, textDecoration: "none" }}>
            {t("termsOfService")}
          </Link>
        </div>
        <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>
          &copy; {new Date().getFullYear()} {t("footerCopyright")}
        </p>
      </footer>
    </div>
  );
}
