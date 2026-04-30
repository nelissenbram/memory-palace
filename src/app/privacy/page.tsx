"use client";

import Link from "next/link";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { locales } from "@/i18n/config";
import PalaceLogo from "@/components/landing/PalaceLogo";

const F = T.font;
const C = T.color;

export default function PrivacyPolicyPage() {
  const { t, locale, setLocale } = useTranslation("privacy");
  const { t: tc } = useTranslation("common");

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.linen,
        fontFamily: F.body,
        color: C.charcoal,
      }}
    >
      {/* Header */}
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
          <Link href="/" aria-label={tc("a11yBackToHome")} style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 32, height: 32, borderRadius: 8,
            border: `1px solid ${C.sandstone}50`,
            background: "none", color: C.walnut, textDecoration: "none",
            transition: "border-color 0.2s",
          }}>
            <svg width={16} height={16} viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
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
            <span
              style={{
                fontFamily: F.display,
                fontSize: 20,
                fontWeight: 500,
                color: C.charcoal,
                letterSpacing: "-0.3px",
              }}
            >
              The Memory Palace
            </span>
          </Link>
        </div>
        <select value={locale} onChange={(e) => setLocale(e.target.value as typeof locale)} aria-label={tc("a11ySwitchLanguage")} style={{
          background: "none", border: `1px solid ${C.sandstone}60`, borderRadius: "0.375rem",
          padding: "0.25rem 0.5rem", fontSize: "0.75rem", fontFamily: F.body,
          fontWeight: 600, color: C.walnut, cursor: "pointer", letterSpacing: "0.5px",
          textTransform: "uppercase", transition: "border-color 0.2s, color 0.2s",
          appearance: "none", WebkitAppearance: "none", paddingRight: "1.25rem",
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23666'/%3E%3C/svg%3E\")",
          backgroundRepeat: "no-repeat", backgroundPosition: "right 0.375rem center",
        }}>
          {locales.map((l) => <option key={l} value={l}>{l.toUpperCase()}</option>)}
        </select>
      </nav>

      {/* Content */}
      <main
        style={{
          maxWidth: 760,
          margin: "0 auto",
          padding: "60px clamp(20px, 5vw, 40px) 100px",
        }}
      >
        <p
          style={{
            fontFamily: F.body,
            fontSize: 12,
            letterSpacing: "2px",
            textTransform: "uppercase",
            color: C.terracotta,
            fontWeight: 600,
            marginBottom: 12,
          }}
        >
          {t("legal")}
        </p>
        <h1
          style={{
            fontFamily: F.display,
            fontSize: "clamp(32px, 5vw, 48px)",
            fontWeight: 300,
            lineHeight: 1.2,
            color: C.charcoal,
            marginBottom: 8,
          }}
        >
          {t("title")}
        </h1>
        <p style={{ fontSize: 14, color: C.muted, marginBottom: 48 }}>
          {t("lastUpdated")}
        </p>

        <Section title={t("whoWeAreTitle")}>
          <P>
            {t("whoWeAreText1")}
          </P>
          <P>
            {t("whoWeAreText2")}
            <a href="mailto:privacy@thememorypalace.ai" style={linkStyle}>
              privacy@thememorypalace.ai
            </a>
          </P>
        </Section>

        <Section title={t("whatWeCollectTitle")}>
          <P>
            {t("whatWeCollectIntro")}
          </P>
          <Ul>
            <Li>
              <strong>{t("whatWeCollectItem1Label")}</strong>
              {t("whatWeCollectItem1Text")}
            </Li>
            <Li>
              <strong>{t("whatWeCollectItem2Label")}</strong>
              {t("whatWeCollectItem2Text")}
            </Li>
            <Li>
              <strong>{t("whatWeCollectItem3Label")}</strong>
              {t("whatWeCollectItem3Text")}
            </Li>
          </Ul>
        </Section>

        <Section title={t("howWeUseTitle")}>
          <P>
            {t("howWeUseIntro")}
          </P>
          <Ul>
            <Li>{t("howWeUseItem1")}</Li>
            <Li>{t("howWeUseItem2")}</Li>
            <Li>{t("howWeUseItem3")}</Li>
            <Li>{t("howWeUseItem4")}</Li>
          </Ul>
          <P>
            {t("howWeUseNeverPre1")}
            <strong>{t("howWeUseNeverBold")}</strong>
            {t("howWeUseNeverMid")}
            <strong>{t("howWeUseNeverBold")}</strong>
            {t("howWeUseNeverPost")}
          </P>
          <h3
            style={{
              fontFamily: F.display,
              fontSize: "1.125rem",
              fontWeight: 500,
              color: C.charcoal,
              marginBottom: "0.5rem",
              marginTop: "1.5rem",
              lineHeight: 1.3,
            }}
          >
            {t("howWeUseLegalBasisTitle")}
          </h3>
          <P>{t("howWeUseLegalBasisIntro")}</P>
          <Ul>
            <Li>
              <strong>{t("howWeUseLegalBasisItem1Label")}</strong>
              {t("howWeUseLegalBasisItem1Text")}
            </Li>
            <Li>
              <strong>{t("howWeUseLegalBasisItem2Label")}</strong>
              {t("howWeUseLegalBasisItem2Text")}
            </Li>
            <Li>
              <strong>{t("howWeUseLegalBasisItem3Label")}</strong>
              {t("howWeUseLegalBasisItem3Text")}
            </Li>
            <Li>
              <strong>{t("howWeUseLegalBasisItem4Label")}</strong>
              {t("howWeUseLegalBasisItem4Text")}
            </Li>
          </Ul>
        </Section>

        <Section title={t("whereStoredTitle")}>
          <P>
            {t("whereStoredIntro")}
          </P>
          <Ul>
            <Li>
              <strong>{t("whereStoredItem1Label")}</strong>
              {t("whereStoredItem1Pre")}
              <strong>{t("whereStoredItem1Location")}</strong>
              {t("whereStoredItem1Post")}
            </Li>
            <Li>
              <strong>{t("whereStoredItem2Label")}</strong>
              {t("whereStoredItem2Text")}
            </Li>
            <Li>
              <strong>{t("whereStoredItem3Label")}</strong>
              {t("whereStoredItem3Text")}
            </Li>
            <Li>
              <strong>{t("whereStoredCrossBorderTitle")}</strong>
              {t("whereStoredCrossBorderText")}
            </Li>
          </Ul>
          <P>
            {t("whereStoredOutro")}
          </P>
        </Section>

        <Section title={t("whoWeShareTitle")}>
          <P>
            {t("whoWeShareIntroPre")}
            <strong>{t("whoWeShareIntroBold")}</strong>
            {t("whoWeShareIntroPost")}
          </P>
          <Ul>
            <Li>
              <strong>{t("whoWeShareItem1Label")}</strong>
              {t("whoWeShareItem1Text")}
            </Li>
            <Li>
              <strong>{t("whoWeShareItem2Label")}</strong>
              {t("whoWeShareItem2Text")}
            </Li>
            <Li>
              <strong>{t("whoWeShareItem3Label")}</strong>
              {t("whoWeShareItem3Text")}
            </Li>
            <Li>
              <strong>{t("whoWeShareItem4Label")}</strong>
              {t("whoWeShareItem4Text")}
            </Li>
            <Li>
              <strong>{t("whoWeShareItem5Label")}</strong>
              {t("whoWeShareItem5Text")}
            </Li>
            <Li>
              <strong>{t("whoWeShareItem6Label")}</strong>
              {t("whoWeShareItem6Text")}
            </Li>
            <Li>
              <strong>{t("whoWeShareItem7Label")}</strong>
              {t("whoWeShareItem7Text")}
            </Li>
            <Li>
              <strong>{t("whoWeShareItem8Label")}</strong>
              {t("whoWeShareItem8Text")}
            </Li>
            <Li>
              <strong>{t("whoWeShareItem9Label")}</strong>
              {t("whoWeShareItem9Text")}
            </Li>
            <Li>
              <strong>{t("whoWeShareItem10Label")}</strong>
              {t("whoWeShareItem10Text")}
            </Li>
          </Ul>
          <P>
            {t("whoWeShareOutro")}
          </P>
          <Ul>
            <Li>
              <strong>{t("whoWeShareCondition1Label")}</strong>
              {t("whoWeShareCondition1Text")}
            </Li>
            <Li>
              <strong>{t("whoWeShareCondition2Label")}</strong>
              {t("whoWeShareCondition2Text")}
            </Li>
          </Ul>
        </Section>

        <Section title={t("yourRightsTitle")}>
          <P>
            {t("yourRightsIntro")}
          </P>
          <Ul>
            <Li>
              <strong>{t("yourRightsItem1Label")}</strong>
              {t("yourRightsItem1Text")}
            </Li>
            <Li>
              <strong>{t("yourRightsItem2Label")}</strong>
              {t("yourRightsItem2Text")}
            </Li>
            <Li>
              <strong>{t("yourRightsItem3Label")}</strong>
              {t("yourRightsItem3Text")}
            </Li>
            <Li>
              <strong>{t("yourRightsItem4Label")}</strong>
              {t("yourRightsItem4Text")}
            </Li>
            <Li>
              <strong>{t("yourRightsItem5Label")}</strong>
              {t("yourRightsItem5Text")}
            </Li>
            <Li>
              <strong>{t("yourRightsItem6Label")}</strong>
              {t("yourRightsItem6Text")}
            </Li>
            <Li>
              <strong>{t("yourRightsItem7Label")}</strong>
              {t("yourRightsItem7Text")}
            </Li>
            <Li>
              <strong>{t("yourRightsItem8Label")}</strong>
              {t("yourRightsItem8Text")}
            </Li>
          </Ul>
          <P>
            {t("yourRightsOutroPre")}
            <a href="mailto:privacy@thememorypalace.ai" style={linkStyle}>
              privacy@thememorypalace.ai
            </a>
            {t("yourRightsOutroPost")}
          </P>
          <h3
            style={{
              fontFamily: F.display,
              fontSize: "1.125rem",
              fontWeight: 500,
              color: C.charcoal,
              marginBottom: "0.5rem",
              marginTop: "1.5rem",
              lineHeight: 1.3,
            }}
          >
            {t("dataBreachNotificationTitle")}
          </h3>
          <P>
            {t("dataBreachNotificationText")}
          </P>
          <h3
            style={{
              fontFamily: F.display,
              fontSize: "1.125rem",
              fontWeight: 500,
              color: C.charcoal,
              marginBottom: "0.5rem",
              marginTop: "1.5rem",
              lineHeight: 1.3,
            }}
          >
            {t("automatedDecisionTitle")}
          </h3>
          <P>
            {t("automatedDecisionText")}
          </P>
        </Section>

        <Section title={t("retentionTitle")}>
          <P>
            {t("retentionIntro")}
          </P>
          <Ul>
            <Li>
              <strong>{t("retentionItem1Label")}</strong>
              {t("retentionItem1Text")}
            </Li>
            <Li>
              <strong>{t("retentionItem2Label")}</strong>
              {t("retentionItem2Text")}
            </Li>
            <Li>
              <strong>{t("retentionItem3Label")}</strong>
              {t("retentionItem3Text")}
            </Li>
            <Li>
              <strong>{t("retentionItem4Label")}</strong>
              {t("retentionItem4Text")}
            </Li>
          </Ul>
        </Section>

        <Section title={t("cookiesTitle")}>
          <P>
            {t("cookiesIntro")}
          </P>
          <Ul>
            <Li>
              <strong>{t("cookiesItem1Label")}</strong>
              {t("cookiesItem1Text")}
            </Li>
            <Li>
              <strong>{t("cookiesItem2Label")}</strong>
              {t("cookiesItem2Text")}
            </Li>
          </Ul>
          <P>
            {t("cookiesOutroPre")}
            <strong>{t("cookiesOutroBold")}</strong>
            {t("cookiesOutroPost")}
          </P>
        </Section>

        <Section title={t("childrenTitle")}>
          <P>
            {t("childrenText")}
          </P>
        </Section>

        <Section title={t("changesTitle")}>
          <P>
            {t("changesText")}
          </P>
        </Section>

        <Section title={t("contactTitle")}>
          <P>
            {t("contactIntro")}
          </P>
          <Ul>
            <Li>
              {t("contactEmail")}
              <a href="mailto:privacy@thememorypalace.ai" style={linkStyle}>
                privacy@thememorypalace.ai
              </a>
            </Li>
            <Li>{t("contactCompany")}</Li>
          </Ul>
          <P>
            {t("contactOutro")}
          </P>
        </Section>

        <div style={{ marginTop: 48, paddingTop: 24, borderTop: `1px solid ${C.sandstone}40` }}>
          <Link
            href="/security"
            style={{ ...linkStyle, fontSize: 14, marginRight: 24 }}
          >
            {t("linkSecurity")}
          </Link>
          <Link
            href="/terms"
            style={{ ...linkStyle, fontSize: 14, marginRight: 24 }}
          >
            {t("linkTerms")}
          </Link>
          <Link href="/" style={{ ...linkStyle, fontSize: 14 }}>
            {t("linkHome")}
          </Link>
        </div>
      </main>
    </div>
  );
}

/* ─── Reusable styled sub-components ─── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 40 }}>
      <h2
        style={{
          fontFamily: F.display,
          fontSize: 24,
          fontWeight: 500,
          color: C.charcoal,
          marginBottom: 14,
          lineHeight: 1.3,
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: 15,
        lineHeight: 1.75,
        color: C.walnut,
        marginBottom: 12,
      }}
    >
      {children}
    </p>
  );
}

function Ul({ children }: { children: React.ReactNode }) {
  return (
    <ul
      style={{
        paddingLeft: 20,
        marginBottom: 12,
      }}
    >
      {children}
    </ul>
  );
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li
      style={{
        fontSize: 15,
        lineHeight: 1.75,
        color: C.walnut,
        marginBottom: 6,
      }}
    >
      {children}
    </li>
  );
}

const linkStyle: React.CSSProperties = {
  color: C.terracotta,
  textDecoration: "none",
  fontWeight: 500,
};
