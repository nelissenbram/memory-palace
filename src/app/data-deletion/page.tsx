"use client";

import Link from "next/link";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { locales } from "@/i18n/config";
import PalaceLogo from "@/components/landing/PalaceLogo";

const F = T.font;
const C = T.color;

export default function DataDeletionPage() {
  const { t, locale, setLocaleNoReload } = useTranslation("dataDeletion");
  const { t: tc } = useTranslation("common");

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.cream,
        fontFamily: F.body,
        color: C.inkSoft,
        paddingTop: "max(1rem, env(safe-area-inset-top, 0px))",
        paddingBottom: "max(1rem, env(safe-area-inset-bottom, 0px))",
      }}
    >
      {/* Header */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 clamp(1.25rem, 5vw, 3.75rem)",
          height: "4rem",
          background: "rgba(252,250,245,0.92)",
          backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${C.sandstone}40`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <Link
            href="/"
            aria-label={tc("a11yBackToHome")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "2.75rem",
              height: "2.75rem",
              borderRadius: "0.5rem",
              border: `1px solid ${C.sandstone}50`,
              background: "none",
              color: C.walnut,
              textDecoration: "none",
              transition: "border-color 0.2s",
            }}
          >
            <svg width={16} height={16} viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.625rem",
              textDecoration: "none",
            }}
          >
            <PalaceLogo variant="mark" color="dark" size="sm" />
            <span
              style={{
                fontFamily: F.display,
                fontSize: "1.25rem",
                fontWeight: 500,
                color: C.inkSoft,
                letterSpacing: "-0.3px",
              }}
            >
              The Memory Palace
            </span>
          </Link>
        </div>
        <select
          value={locale}
          onChange={(e) => setLocaleNoReload(e.target.value as typeof locale)}
          aria-label={tc("a11ySwitchLanguage")}
          style={{
            background: "none",
            border: `1px solid ${C.sandstone}60`,
            borderRadius: "0.375rem",
            padding: "0.25rem 0.5rem",
            fontSize: "1rem",
            fontFamily: F.body,
            fontWeight: 600,
            color: C.walnut,
            cursor: "pointer",
            letterSpacing: "0.5px",
            textTransform: "uppercase",
            transition: "border-color 0.2s, color 0.2s",
            appearance: "none",
            WebkitAppearance: "none",
            paddingRight: "1.25rem",
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23716A5E'/%3E%3C/svg%3E\")",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 0.375rem center",
          }}
        >
          {locales.map((l) => (
            <option key={l} value={l}>
              {l.toUpperCase()}
            </option>
          ))}
        </select>
      </nav>

      {/* Content */}
      <main
        style={{
          maxWidth: "47.5rem",
          margin: "0 auto",
          padding: "3.75rem clamp(1.25rem, 5vw, 2.5rem) 6.25rem",
        }}
      >
        <p
          style={{
            fontFamily: F.body,
            fontSize: "0.75rem",
            letterSpacing: "2px",
            textTransform: "uppercase",
            color: C.terracotta,
            fontWeight: 600,
            marginBottom: "0.75rem",
          }}
        >
          {t("legal")}
        </p>
        <h1
          style={{
            fontFamily: F.display,
            fontSize: "clamp(2rem, 5vw, 3rem)",
            fontWeight: 300,
            lineHeight: 1.2,
            color: C.inkSoft,
            marginBottom: "1.5rem",
          }}
        >
          {t("title")}
        </h1>

        <p style={{ fontSize: "0.9375rem", lineHeight: 1.75, color: C.walnut, marginBottom: "1rem" }}>
          {t("introPre")}
          <strong>{t("appName")}</strong>
          {t("introPost")}
        </p>

        <h2
          style={{
            fontFamily: F.display,
            fontSize: "1.5rem",
            fontWeight: 500,
            color: C.inkSoft,
            marginTop: "2rem",
            marginBottom: "0.875rem",
            lineHeight: 1.3,
          }}
        >
          {t("option1Title")}
        </h2>
        <ol style={{ lineHeight: 1.8, paddingLeft: "1.5rem", marginBottom: "1rem", color: C.walnut, fontSize: "0.9375rem" }}>
          <li>
            {t("option1Step1Pre")}
            <a href="https://thememorypalace.ai/login" style={linkStyle}>
              thememorypalace.ai
            </a>
          </li>
          <li>{t("option1Step2")}</li>
          <li>{t("option1Step3")}</li>
          <li>{t("option1Step4")}</li>
        </ol>

        <h2
          style={{
            fontFamily: F.display,
            fontSize: "1.5rem",
            fontWeight: 500,
            color: C.inkSoft,
            marginTop: "2rem",
            marginBottom: "0.875rem",
            lineHeight: 1.3,
          }}
        >
          {t("option2Title")}
        </h2>
        <ol style={{ lineHeight: 1.8, paddingLeft: "1.5rem", marginBottom: "1rem", color: C.walnut, fontSize: "0.9375rem" }}>
          <li>
            {t("option2Step1Pre")}
            <strong>{t("option2Step1Command")}</strong>
            {t("option2Step1Post")}
          </li>
          <li>{t("option2Step2")}</li>
          <li>{t("option2Step3")}</li>
        </ol>

        <h2
          style={{
            fontFamily: F.display,
            fontSize: "1.5rem",
            fontWeight: 500,
            color: C.inkSoft,
            marginTop: "2rem",
            marginBottom: "0.875rem",
            lineHeight: 1.3,
          }}
        >
          {t("option3Title")}
        </h2>
        <p style={{ fontSize: "0.9375rem", lineHeight: 1.75, color: C.walnut, marginBottom: "2rem" }}>
          {t("option3Pre")}
          <a href="mailto:privacy@thememorypalace.ai" style={linkStyle}>
            privacy@thememorypalace.ai
          </a>
          {t("option3Post")}
        </p>

        <hr style={{ border: "none", borderTop: `1px solid ${C.sandstone}40`, margin: "2rem 0" }} />

        <p style={{ fontSize: "0.875rem", color: C.muted, lineHeight: 1.75 }}>
          {t("footerPre")}
          <Link href="/privacy" style={linkStyle}>
            {t("footerPrivacyLink")}
          </Link>
          {t("footerPost")}
        </p>
      </main>
    </div>
  );
}

const linkStyle: React.CSSProperties = {
  color: C.terracotta,
  textDecoration: "none",
  fontWeight: 500,
};
