"use client";

/**
 * Privacy & Security — the real controls page (Explore/Me revision, change 17).
 *
 * Order: MFA, password, blocked accounts (Apple 1.2 — never unmount), cookie
 * consent (GDPR — moved from /settings/cookies, behavior unchanged), data
 * export, then the trust brochure compressed into one collapsed accordion,
 * and the danger zone (account deletion, GDPR Art. 17) last.
 */

import React, { useState, useEffect, useCallback } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useIsMobile, useIsCompact } from "@/lib/hooks/useIsMobile";
import { hasAnalyticsConsent, initAnalytics, optOutAnalytics } from "@/lib/analytics";
import { identifyCurrentUser } from "@/components/PostHogProvider";
import { INK, INK_DEEP, MUTED, EMBER_GLYPH, EMBER, SAGE, HAIRLINE, CREAM, DANGER, DANGER_SOFT } from "@/lib/libraryTokens";
import BlockedAccountsPanel from "@/components/social/BlockedAccountsPanel";
import MFASetup from "@/components/settings/MFASetup";
import ExportPanel from "@/components/settings/ExportPanel";
import { requestPasswordReset, deleteAccount } from "@/lib/auth/profile-actions";
import { SettingsPageHeader, SectionOverline } from "../_SettingsChrome";

const F = T.font;

/* Canon tokens imported from libraryTokens (INK/MUTED/EMBER_GLYPH/EMBER/SAGE/HAIRLINE/CREAM).
   EMBER_GLYPH is the terracotta at-rest glyph accent (was locally named TERRA). */
const TERRA = EMBER_GLYPH; // terracotta glyph / at-rest accent (canon EMBER_GLYPH)

/* Danger register — the canon warm destructive token (libraryTokens DANGER),
   scoped to this destructive surface (GDPR Art.17 delete + error toast). The
   former undocumented 3-step off-canon ramp collapses to the single canon DANGER;
   STRONG/DEEP alias it so existing hierarchy call sites keep compiling. */
const DANGER_STRONG = DANGER; // confirm text / active delete
const DANGER_DEEP = DANGER;   // danger description

/* ─── Category icons (compact versions for settings context) ─── */

function HostingIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect x="6" y="4" width="20" height="8" rx="2" fill={TERRA} opacity="0.15" stroke={TERRA} strokeWidth="1.5" />
      <rect x="6" y="14" width="20" height="8" rx="2" fill={TERRA} opacity="0.08" stroke={TERRA} strokeWidth="1.5" />
      <circle cx="10" cy="8" r="1.2" fill={TERRA} />
      <circle cx="10" cy="18" r="1.2" fill={TERRA} />
      <line x1="14" y1="8" x2="22" y2="8" stroke={TERRA} strokeWidth="1.2" strokeLinecap="round" />
      <line x1="14" y1="18" x2="22" y2="18" stroke={TERRA} strokeWidth="1.2" strokeLinecap="round" />
      <path d="M12 24h8M16 22v4" stroke={MUTED} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function EncryptionIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect x="8" y="14" width="16" height="13" rx="3" fill={TERRA} opacity="0.12" stroke={TERRA} strokeWidth="1.5" />
      <path d="M11 14V10a5 5 0 0 1 10 0v4" stroke={TERRA} strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <circle cx="16" cy="20" r="2" fill={TERRA} />
      <rect x="15.2" y="21" width="1.6" height="3" rx="0.8" fill={TERRA} />
    </svg>
  );
}

function AuthIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M16 3L5 8v7c0 7.5 4.7 13.5 11 16 6.3-2.5 11-8.5 11-16V8L16 3z" fill={SAGE} opacity="0.12" stroke={SAGE} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M11 16l3.5 3.5L21.5 12" stroke={SAGE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function PrivacyIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M4 16s4-8 12-8 12 8 12 8-4 8-12 8S4 16 4 16z" fill={MUTED} opacity="0.08" stroke={MUTED} strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="16" cy="16" r="3.5" stroke={MUTED} strokeWidth="1.5" fill="none" />
      <circle cx="16" cy="16" r="1.5" fill={MUTED} />
      <line x1="6" y1="6" x2="26" y2="26" stroke={TERRA} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function BackupIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M8 22a5 5 0 0 1-.5-9.97A7 7 0 0 1 21 10a5.5 5.5 0 0 1 3 10H8z" fill={SAGE} opacity="0.12" stroke={SAGE} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M13 18l3 3 3-3" stroke={SAGE} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <line x1="16" y1="13" x2="16" y2="21" stroke={SAGE} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/* ─── Cookie category icons (from the merged /settings/cookies page) ─── */

function EssentialIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M16 3L5 8v7c0 7.5 4.7 13.5 11 16 6.3-2.5 11-8.5 11-16V8L16 3z" fill={SAGE} opacity="0.12" stroke={SAGE} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M11 16l3.5 3.5L21.5 12" stroke={SAGE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function AnalyticsIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect x="5" y="5" width="22" height="22" rx="3" fill={MUTED} opacity="0.08" stroke={MUTED} strokeWidth="1.5" />
      <rect x="9" y="16" width="3" height="7" rx="0.75" fill={MUTED} opacity="0.4" />
      <rect x="14.5" y="12" width="3" height="11" rx="0.75" fill={MUTED} opacity="0.6" />
      <rect x="20" y="9" width="3" height="14" rx="0.75" fill={MUTED} opacity="0.8" />
    </svg>
  );
}

/* ─── Toggle component (cookie consent — behavior unchanged) ─── */

function Toggle({
  checked,
  disabled,
  onToggle,
  ariaLabel,
}: {
  checked: boolean;
  disabled?: boolean;
  onToggle?: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      onClick={disabled ? undefined : onToggle}
      aria-label={ariaLabel}
      aria-checked={checked}
      role="switch"
      disabled={disabled}
      className="mp-cookie-toggle"
      style={{
        // The BUTTON is the tap target (>=2.75rem tall); the visual track/thumb
        // stay small inside it. Horizontal padding keeps the whole hit-zone
        // comfortable on phones without changing the switch's look.
        flexShrink: 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "2.75rem",
        minWidth: "2.75rem",
        padding: "0 0.5rem",
        border: "none",
        background: "transparent",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: "block",
          width: "3rem",
          height: "1.625rem",
          borderRadius: "0.8125rem",
          background: checked ? EMBER : HAIRLINE,
          position: "relative",
          transition: "background 0.2s ease",
        }}
      >
        <span style={{
          display: "block",
          width: "1.25rem",
          height: "1.25rem",
          borderRadius: "50%",
          background: "#FFFFFF",
          position: "absolute",
          top: "0.1875rem",
          left: checked ? "1.5625rem" : "0.1875rem",
          transition: "left 0.2s ease",
          boxShadow: "0 0.0625rem 0.25rem rgba(64,59,54,0.14)", // Atrium warm ink
        }} />
      </span>
    </button>
  );
}

/* ─── Cookie categories — localStorage key mp-cookie-analytics (GDPR analytics
       consent toggle; honours the banner's '0'/'1' contract, moved from /settings/cookies) ─── */

type CookieCategory = {
  IconComponent: React.FC<{ size?: number }>;
  titleKey: string;
  descriptionKey: string;
  alwaysOn?: boolean;
  storageKey?: string;
};

const COOKIE_CATEGORIES: CookieCategory[] = [
  {
    IconComponent: EssentialIcon,
    titleKey: "essentialTitle",
    descriptionKey: "essentialDescription",
    alwaysOn: true,
  },
  // NOTE: the "Preferences" category was removed — it persisted to `mp-cookie-consent`
  // (hyphen), a key read nowhere, so the toggle changed no behavior. Rather than ship a
  // GDPR consent control that does nothing, we drop it until a real preference behavior
  // exists to wire it to.
  {
    IconComponent: AnalyticsIcon,
    titleKey: "analyticsTitle",
    descriptionKey: "analyticsDescription",
    storageKey: "mp-cookie-analytics",
  },
];

/* ─── Trust brochure section definitions (kept, collapsed into an accordion) ─── */

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
      { labelKey: "privacyKepLabel", detailKey: "privacyKepDetail" },
      { labelKey: "privacySocialLabel", detailKey: "privacySocialDetail" },
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

/* ─── Shared card recipe ─── */

const cardStyle: React.CSSProperties = {
  background: "#FFFFFF",
  borderRadius: "1rem",
  border: `0.0625rem solid ${HAIRLINE}`,
  padding: "1.5rem 1.75rem",
  boxShadow: "0 0.25rem 1rem rgba(64,59,54,0.07), inset 0 0.0625rem 0 rgba(255,255,255,0.5)", // Atrium S1 + top highlight
  marginBottom: "1rem",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.875rem 1.125rem",
  borderRadius: "0.75rem",
  border: `0.0625rem solid ${HAIRLINE}`,
  background: "#FFFFFF",
  fontFamily: T.font.body,
  fontSize: "1rem", // >= 1rem so iOS Safari never zooms on focus
  color: INK,
  outline: "none",
  boxSizing: "border-box" as const,
  transition: "border-color .2s, box-shadow .2s",
};

export default function SecuritySettingsPage() {
  const { t } = useTranslation("securityPage");
  const { t: ts } = useTranslation("settings");
  const { t: tck } = useTranslation("cookieSettings");
  const { t: tc } = useTranslation("common");
  const isMobile = useIsMobile();
  const isCompact = useIsCompact();

  // Card padding tightens on phone / iPad portrait so content isn't cramped by
  // desktop-scale gutters. Vertical rhythm is preserved; only the horizontal
  // gutter shrinks. (Inline-style responsiveness — no @media.)
  const cardPadX = isCompact ? "1rem" : "1.75rem";
  const cardPad = `1.5rem ${cardPadX}`;
  const card: React.CSSProperties = { ...cardStyle, padding: cardPad };

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [brochureOpen, setBrochureOpen] = useState(false);

  // Danger zone (account deletion — GDPR Art. 17, moved from Profile)
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Cookie consent (moved from /settings/cookies — behavior unchanged)
  const [consents, setConsents] = useState<Record<string, boolean>>({});
  const [consentsLoaded, setConsentsLoaded] = useState(false);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    try {
      const state: Record<string, boolean> = {};
      for (const cat of COOKIE_CATEGORIES) {
        if (cat.storageKey) {
          // Derive the analytics toggle from the real runtime contract
          // (hasAnalyticsConsent honours both the explicit '0'/'1' override AND
          // the banner's mp_cookie_consent decision) so the switch can never
          // display out of sync with what actually captures.
          state[cat.storageKey] =
            cat.storageKey === "mp-cookie-analytics"
              ? hasAnalyticsConsent()
              : localStorage.getItem(cat.storageKey) === "1";
        }
      }
      setConsents(state);
    } catch {
      /* private browsing */
    }
    setConsentsLoaded(true);
  }, []);

  const handleCookieToggle = (storageKey: string) => {
    const newValue = !consents[storageKey];
    setConsents((prev) => ({ ...prev, [storageKey]: newValue }));
    try {
      if (newValue) {
        localStorage.setItem(storageKey, "1");
      } else if (storageKey === "mp-cookie-analytics") {
        // GDPR opt-out must be explicit: hasAnalyticsConsent() treats a MISSING
        // analytics key as "undecided" and falls through to mp_cookie_consent.
        // Removing the key would leave analytics ENABLED after an accepted banner,
        // so we write the banner's exact opt-out contract ('0') instead.
        localStorage.setItem(storageKey, "0");
      } else {
        localStorage.removeItem(storageKey);
      }
    } catch {
      /* private browsing */
    }
    // Apply the decision to the live session immediately (GDPR consent
    // withdrawal / grant must take effect without a reload).
    if (storageKey === "mp-cookie-analytics") {
      if (newValue) {
        // Consent granted mid-session: init, then attach the signed-in identity.
        void initAnalytics().then(() => identifyCurrentUser());
      } else {
        optOutAnalytics();
      }
    }
  };

  const handlePasswordReset = async () => {
    const result = await requestPasswordReset();
    if (result.error) {
      showToast(result.error, "error");
    } else if (result.socialOnly) {
      // Social-login-only account: a reset link is useless — steer them to their
      // provider instead of a false "check your inbox" success.
      showToast(tf("passwordResetSocialOnly", "This account signs in with a social provider, so there's no password to reset. Just sign in with that provider next time."), "error");
    } else if (result.notConfigured) {
      showToast(tf("passwordResetUnavailable", "Password reset isn't available in this environment."), "error");
    } else {
      showToast(ts("passwordResetSent"), "success");
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteText !== ts("deleteConfirmWord")) return;
    setDeleting(true);
    const result = await deleteAccount();
    if (result.error) {
      showToast(result.error, "error");
      setDeleting(false);
    } else {
      window.location.href = "/login";
    }
  };

  // i18n fallback helper — new keys work before the locale files land.
  const tf = (key: string, fallback: string) => {
    const v = t(key);
    return v === key ? fallback : v;
  };

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div role={toast.type === "success" ? "status" : "alert"} aria-live={toast.type === "success" ? "polite" : "assertive"} className="mp-security-toast" style={{
          position: "fixed", top: "1.5rem", right: "1.5rem", zIndex: 100,
          padding: "0.875rem 1.25rem", borderRadius: "0.75rem",
          background: toast.type === "success" ? SAGE : DANGER,
          color: "#FFF",
          fontFamily: F.body, fontSize: "0.9375rem", fontWeight: 500,
          boxShadow: "0 0.5rem 1.5rem rgba(64,59,54,0.14)", /* Atrium token S2 */
          animation: "fadeIn .2s ease",
          display: "flex", alignItems: "center", gap: "0.625rem",
        }}>
          <span aria-hidden="true">{toast.type === "success" ? "✓" : "⚠"}</span>
          {toast.message}
          <button onClick={() => setToast(null)} aria-label={tc("close")} className="mp-security-focus" style={{
            background: "none", border: "none", color: "#FFF",
            fontSize: "0.9375rem", cursor: "pointer", marginLeft: "0.5rem", opacity: 0.7,
          }}>{"✕"}</button>
        </div>
      )}

      {/* Header — desktop only */}
      <SettingsPageHeader
        hidden={isMobile}
        icon="security"
        title={t("heroTitle")}
        subtitle={t("heroDescription")}
      />

      {/* Section overline — Sign-in & access */}
      <SectionOverline label={tf("sectionSignInAccess", "Sign-in & access")} />

      {/* ── 1. Two-Factor Authentication ── */}
      <MFASetup />

      {/* ── 2. Password ── */}
      <div style={card}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: "1rem", flexWrap: "wrap",
        }}>
          <div style={{ flex: 1, minWidth: "12rem" }}>
            <h3 style={{
              fontFamily: F.display, fontSize: "1.1875rem", fontWeight: 600,
              color: INK, margin: "0 0 0.375rem",
            }}>
              {ts("changePassword")}
            </h3>
            <p style={{
              fontFamily: F.body, fontSize: "0.8125rem", color: MUTED,
              margin: 0, lineHeight: 1.4,
            }}>
              {ts("changePasswordDesc")}
            </p>
          </div>
          <button
            onClick={handlePasswordReset}
            className="mp-security-btn"
            style={{
              padding: "0.75rem 1.5rem",
              borderRadius: "0.75rem",
              border: `0.0625rem solid ${HAIRLINE}`,
              background: "transparent",
              fontFamily: F.body,
              fontSize: "0.9375rem",
              fontWeight: 500,
              color: MUTED,
              cursor: "pointer",
              transition: "all 0.2s ease",
              flexShrink: 0,
              minHeight: "2.75rem",
            }}
          >
            {ts("sendResetLink")}
          </button>
        </div>
      </div>

      {/* ── 3. Blocked accounts (Apple Guideline 1.2 — must stay mounted) ── */}
      <BlockedAccountsPanel />

      {/* Section overline — Privacy & your data */}
      <SectionOverline label={tf("sectionPrivacyData", "Privacy & your data")} style={{ marginTop: "1.75rem" }} />

      {/* ── 4. Cookie consent (GDPR — anchor target for /settings/cookies redirect) ── */}
      <div id="cookies" style={{ scrollMarginTop: "4.5rem" }}>
        {COOKIE_CATEGORIES.map((cat, i) => {
          const isOn = cat.alwaysOn || (cat.storageKey ? consents[cat.storageKey] ?? false : false);
          return (
            <div key={i} style={card}>
              <div style={{
                display: "flex", alignItems: "center", gap: "0.75rem",
                marginBottom: "1rem",
              }}>
                <cat.IconComponent size={24} />
                <h3 style={{
                  fontFamily: F.display, fontSize: "1.1875rem", fontWeight: 600,
                  color: INK, margin: 0, flex: 1,
                }}>
                  {tck(cat.titleKey)}
                </h3>
                {consentsLoaded && (
                  <Toggle
                    checked={isOn}
                    disabled={cat.alwaysOn}
                    onToggle={cat.storageKey ? () => handleCookieToggle(cat.storageKey!) : undefined}
                    ariaLabel={cat.alwaysOn ? tck("alwaysOnLabel") : tck("toggleLabel", { category: tck(cat.titleKey) })}
                  />
                )}
              </div>
              <p style={{
                fontFamily: F.body, fontSize: "0.8125rem",
                color: MUTED, lineHeight: 1.4, margin: 0,
                padding: "0.875rem 1rem",
                borderRadius: "0.75rem",
                background: CREAM,
                border: `0.0625rem solid ${HAIRLINE}`,
              }}>
                {tck(cat.descriptionKey)}
              </p>
              {cat.alwaysOn && (
                <p style={{
                  fontFamily: F.body, fontSize: "0.8125rem",
                  color: MUTED, lineHeight: 1.4,
                  margin: "0.75rem 0 0", fontStyle: "italic",
                }}>
                  {tck("alwaysOnNote")}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* ── 5. Data export (GDPR Art. 15 — must stay reachable) ── */}
      <div style={{ marginBottom: "1rem" }}>
        <ExportPanel showToast={showToast} />
      </div>

      {/* ── 6. "How we protect your data" — the trust brochure, collapsed ── */}
      <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
        <button
          onClick={() => setBrochureOpen((o) => !o)}
          aria-expanded={brochureOpen}
          className="mp-security-btn"
          style={{
            width: "100%",
            display: "flex", alignItems: "center", gap: "0.75rem",
            padding: `1.25rem ${cardPadX}`,
            minHeight: "2.75rem",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <AuthIcon size={24} />
          <span style={{
            flex: 1,
            fontFamily: F.display, fontSize: "1.1875rem", fontWeight: 600,
            color: INK,
          }}>
            {tf("howWeProtectTitle", "How we protect your data")}
          </span>
          <svg
            width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke={MUTED} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            aria-hidden="true"
            style={{ flexShrink: 0, transform: brochureOpen ? "rotate(90deg)" : "none", transition: "transform .2s" }}
            className="mp-security-chevron"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>

        {brochureOpen && (
          <div style={{ padding: `0 ${cardPadX} 1.5rem` }}>
            {SECTIONS.map((section, si) => (
              <div key={si} style={{ marginBottom: "1.25rem" }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: "0.75rem",
                  marginBottom: "0.75rem",
                }}>
                  <section.IconComponent size={24} />
                  <h3 style={{
                    fontFamily: F.display, fontSize: "1.0625rem", fontWeight: 600,
                    color: INK, margin: 0,
                  }}>
                    {t(section.titleKey)}
                  </h3>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                  {section.items.map((item, ii) => (
                    <div key={ii} style={{
                      padding: "0.75rem 1rem",
                      borderRadius: "0.75rem",
                      background: CREAM,
                      border: `0.0625rem solid ${HAIRLINE}`,
                    }}>
                      <h4 style={{
                        fontFamily: F.body, fontSize: "0.9375rem", fontWeight: 600,
                        color: INK, margin: "0 0 0.25rem",
                      }}>
                        {t(item.labelKey)}
                      </h4>
                      <p style={{
                        fontFamily: F.body, fontSize: "0.8125rem",
                        color: MUTED, lineHeight: 1.4, margin: 0,
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
              background: `linear-gradient(135deg, ${INK}, ${INK_DEEP})`, // warm-ink keystone
              borderRadius: "1rem",
              padding: "1.75rem 2rem",
            }}>
              <h3 style={{
                fontFamily: F.display, fontSize: "1.1875rem", fontWeight: 600,
                fontStyle: "italic", color: "#FCFAF5", lineHeight: 1.15,
                margin: "0 0 0.75rem",
              }}>
                {t("commitmentTitle")}
                <br />
                {t("commitmentTitle2")}
              </h3>
              <p style={{
                fontFamily: F.body, fontSize: "0.8125rem",
                color: "rgba(252,250,245,0.72)" /* Atrium token: keystone desc */, lineHeight: 1.4, margin: 0,
              }}>
                {t("commitmentBody")}{" "}
                <a
                  href="mailto:privacy@thememorypalace.ai"
                  style={{ color: EMBER, textDecoration: "none" }}
                >
                  privacy@thememorypalace.ai
                </a>
                {t("commitmentBodyEnd")}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── 7. Danger Zone — last (GDPR Art. 17, terracotta register, never gold) ── */}
      <section role="region" aria-labelledby="danger-zone-heading">
      {/* Section overline — Danger zone (danger register — the one non-ember overline) */}
      <div style={{
        display: "flex", alignItems: "center", gap: "0.5rem",
        marginTop: "1.75rem", marginBottom: "1rem",
      }}>
        <span aria-hidden="true" style={{ width: "0.5rem", height: "0.5rem", borderRadius: "50%", background: DANGER, flexShrink: 0 }} />
        <span style={{
          fontFamily: F.body, fontSize: "0.6875rem", fontWeight: 700,
          letterSpacing: "0.12em", textTransform: "uppercase", color: DANGER, whiteSpace: "nowrap",
        }}>
          {tf("sectionDangerZone", "Danger zone")}
        </span>
        <span aria-hidden="true" style={{ flex: 1, height: "0.0625rem", background: `linear-gradient(90deg, ${DANGER_SOFT}, transparent)` }} />
      </div>

      <div style={{
        background: "#FFFFFF",
        borderRadius: "1rem",
        border: `0.0625rem solid ${DANGER_SOFT}`, /* canon danger soft tint */
        padding: isCompact ? "1.5rem 1rem" : "1.75rem 2rem",
        boxShadow: "0 0.25rem 1rem rgba(64,59,54,0.07), inset 0 0.0625rem 0 rgba(255,255,255,0.5)", /* Atrium S1 + top highlight */
      }}>
        <h3 id="danger-zone-heading" style={{
          fontFamily: F.display, fontSize: "1.1875rem", fontWeight: 600,
          color: DANGER, margin: "0 0 0.375rem",
        }}>
          {ts("dangerZone")}
        </h3>
        <p style={{
          fontFamily: F.body, fontSize: "0.9375rem", color: MUTED,
          margin: "0 0 1.125rem", lineHeight: 1.4,
        }}>
          {ts("dangerDescription")}
        </p>

        {!deleteConfirm ? (
          <button
            onClick={() => setDeleteConfirm(true)}
            className="mp-security-danger-btn"
            style={{
              padding: "0.875rem 1.75rem",
              borderRadius: "0.75rem",
              border: "0.0625rem solid #F2DCDC", /* Atrium pre-mixed: danger 20% on white */
              background: "#FDF9F9", /* Atrium pre-mixed: danger 3% on white */
              fontFamily: F.body,
              fontSize: "0.9375rem",
              fontWeight: 600,
              color: DANGER,
              cursor: "pointer",
              transition: "all 0.2s ease",
              minHeight: "2.75rem",
            }}
          >
            {ts("deleteAccount")}
          </button>
        ) : (
          <div style={{
            padding: "1.25rem 1.5rem", borderRadius: "0.875rem",
            background: "#FAF1F1", /* Atrium pre-mixed: danger 8% on white */
            border: "0.0625rem solid #ECCACA", /* Atrium pre-mixed: danger 30% on white */
          }}>
            <p style={{
              fontFamily: F.body, fontSize: "0.9375rem", fontWeight: 500,
              color: DANGER_STRONG, margin: "0 0 0.75rem",
            }}>
              {ts("deleteConfirmTitle")}
            </p>
            <p style={{
              fontFamily: F.body, fontSize: "0.9375rem", color: DANGER_DEEP,
              margin: "0 0 1rem", lineHeight: 1.4,
            }}>
              {(() => {
                const raw = ts("deleteConfirmDescription");
                const parts = raw.split(/\{boldStart\}|\{boldEnd\}/);
                // Expect [before, bold, after]. If a locale is missing the
                // {boldStart}/{boldEnd} placeholders the split yields <3 parts —
                // render the raw string verbatim so no text is silently dropped.
                if (parts.length < 3) return raw;
                return (
                  <>
                    {parts[0]}
                    {parts[1] && <strong>{parts[1]}</strong>}
                    {parts[2]}
                  </>
                );
              })()}
            </p>
            <input
              id="security-delete-confirm"
              className="mp-settings-input"
              aria-label={ts("deleteConfirmTitle")}
              type="text"
              value={deleteText}
              onChange={(e) => setDeleteText(e.target.value)}
              placeholder={ts("deleteConfirmPlaceholder")}
              style={{
                ...inputStyle,
                borderColor: "#ECCACA", /* Atrium pre-mixed: danger 30% on white */
                marginBottom: "0.875rem",
              }}
            />
            <div style={{ display: "flex", gap: "0.625rem" }}>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteText !== ts("deleteConfirmWord") || deleting}
                className="mp-security-focus"
                style={{
                  padding: "0.75rem 1.5rem",
                  borderRadius: "0.75rem",
                  border: "none",
                  background:
                    deleteText === ts("deleteConfirmWord") && !deleting
                      ? DANGER_STRONG
                      : "#EEE9DF" /* Atrium pre-mixed: sandstone 37% on cream */,
                  color:
                    deleteText === ts("deleteConfirmWord") && !deleting
                      ? "#FFF"
                      : MUTED,
                  fontFamily: F.body,
                  fontSize: "0.9375rem",
                  fontWeight: 600,
                  cursor:
                    deleteText === ts("deleteConfirmWord") && !deleting
                      ? "pointer"
                      : "default",
                  transition: "all 0.2s ease",
                  minHeight: "2.75rem",
                }}
              >
                {deleting ? ts("deleting") : ts("permanentlyDelete")}
              </button>
              <button
                onClick={() => {
                  setDeleteConfirm(false);
                  setDeleteText("");
                }}
                className="mp-security-btn"
                style={{
                  padding: "0.75rem 1.5rem",
                  borderRadius: "0.75rem",
                  border: `0.0625rem solid ${HAIRLINE}`,
                  background: "transparent",
                  fontFamily: F.body,
                  fontSize: "0.9375rem",
                  fontWeight: 500,
                  color: MUTED,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  minHeight: "2.75rem",
                }}
              >
                {tc("cancel")}
              </button>
            </div>
          </div>
        )}
      </div>
      </section>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-0.5rem); } to { opacity: 1; transform: translateY(0); } }
        @media (prefers-reduced-motion: reduce) {
          .mp-security-toast { animation: none !important; }
          .mp-cookie-toggle span { transition: none !important; }
          .mp-security-chevron { transition: none !important; }
        }
        @media (hover: hover) {
          .mp-security-btn:hover { background: rgba(154,79,42,0.07) !important; }
          .mp-security-danger-btn:hover { background: #FAF1F1 !important; } /* danger 8% on white */
        }
        .mp-security-btn:active { background: rgba(154,79,42,0.12) !important; }
        .mp-cookie-toggle:focus-visible { outline: 0.1875rem solid #D4AF37; outline-offset: 0.1875rem; }
        .mp-security-btn:focus-visible,
        .mp-security-danger-btn:focus-visible,
        .mp-security-focus:focus-visible {
          outline: 0.1875rem solid #D4AF37; /* Atrium gold focus ring */
          outline-offset: 0.1875rem;
        }
        .mp-settings-input:focus-visible {
          outline: 0.1875rem solid #D4AF37; /* Atrium gold focus ring */
          outline-offset: 0.1875rem;
        }
      `}</style>
    </div>
  );
}
