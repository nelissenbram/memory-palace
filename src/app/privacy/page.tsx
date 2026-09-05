"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext } from "react";
import { T } from "@/lib/theme";
import { useIsMobile, useIsSmall, useIsCompact } from "@/lib/hooks/useIsMobile";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { locales } from "@/i18n/config";
import PalaceLogo from "@/components/landing/PalaceLogo";

const F = T.font;
const C = T.color;

/** Shared page constants so the four legal pages read consistently. */
const PROSE_MAX = "47.5rem";

/** Shared responsive flag so the module-level P/Li helpers can bump body copy
 *  to ~1rem on phones without threading a prop through every call site. */
const MobileCtx = createContext(false);

/** History-aware back: when the user arrived from another in-app page (e.g.
 *  Settings → Subscription → Privacy), intercept the click and go back through
 *  history instead of dumping them on the landing page. Falls back to the
 *  Link's normal href="/" navigation when there is no in-app history (direct
 *  visit, external referrer, modified click, malformed referrer). */
function useHistoryBack() {
  const router = useRouter();
  return useCallback(
    (e: React.MouseEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      try {
        if (
          window.history.length > 1 &&
          !!document.referrer &&
          new URL(document.referrer).origin === window.location.origin
        ) {
          e.preventDefault();
          router.back();
        }
      } catch {
        /* malformed referrer — let the Link navigate to "/" */
      }
    },
    [router],
  );
}

export default function PrivacyPolicyPage() {
  const isMobile = useIsMobile();
  const isSmall = useIsSmall();
  const isCompact = useIsCompact();
  const { t, locale, setLocaleNoReload } = useTranslation("privacy");
  const { t: tc } = useTranslation("common");
  const handleBack = useHistoryBack();

  return (
    <MobileCtx.Provider value={isMobile}>
    <div
      style={{
        minHeight: "100vh",
        background: C.cream,
        fontFamily: F.body,
        color: C.ink,
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
          padding: isMobile ? "0 1.25rem" : "0 3.75rem",
          height: "4rem",
          background: "rgba(252,250,245,0.92)",
          backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${C.hairline}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <Link href="/" onClick={handleBack} aria-label={tc("a11yBackToHome")} style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: "2.75rem", height: "2.75rem", borderRadius: "0.5rem",
            border: `1px solid ${C.hairline}`,
            background: "none", color: C.inkMuted, textDecoration: "none",
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
              gap: "0.625rem",
              textDecoration: "none",
            }}
          >
            <PalaceLogo variant="mark" color="dark" size="sm" />
            {!isSmall && (
              <span
                style={{
                  fontFamily: F.display,
                  fontSize: "1.25rem",
                  fontWeight: 500,
                  color: C.ink,
                  letterSpacing: "-0.3px",
                }}
              >
                {t("navBrand")}
              </span>
            )}
          </Link>
        </div>
        <select value={locale} onChange={(e) => setLocaleNoReload(e.target.value as typeof locale)} aria-label={tc("a11ySwitchLanguage")} style={{
          background: "none", border: `1px solid ${C.hairline}`, borderRadius: "0.375rem",
          padding: "0.5rem 0.5rem", minHeight: "2.75rem", fontSize: "1rem", fontFamily: F.body,
          fontWeight: 600, color: C.inkMuted, cursor: "pointer", letterSpacing: "0.5px",
          textTransform: "uppercase", transition: "border-color 0.2s, color 0.2s",
          appearance: "none", WebkitAppearance: "none", paddingRight: "1.25rem",
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23716A5E'/%3E%3C/svg%3E\")",
          backgroundRepeat: "no-repeat", backgroundPosition: "right 0.375rem center",
        }}>
          {locales.map((l) => <option key={l} value={l}>{l.toUpperCase()}</option>)}
        </select>
      </nav>

      {/* Content */}
      <main
        style={{
          maxWidth: PROSE_MAX,
          margin: "0 auto",
          padding: isMobile
            ? "2.5rem 1.25rem 5rem"
            : `3.75rem ${isCompact ? "2rem" : "2.5rem"} 6.25rem`,
        }}
      >
        <p
          style={{
            fontFamily: F.body,
            fontSize: "0.8125rem",
            letterSpacing: "0.125rem",
            textTransform: "uppercase",
            color: C.ember,
            fontWeight: 600,
            marginBottom: "0.75rem",
          }}
        >
          {t("legal")}
        </p>
        <h1
          style={{
            fontFamily: F.display,
            fontSize: isMobile ? "2rem" : "3rem",
            fontWeight: 300,
            lineHeight: 1.2,
            color: C.ink,
            marginBottom: "0.5rem",
          }}
        >
          {t("title")}
        </h1>
        <p style={{ fontSize: "0.875rem", color: C.inkMuted, marginBottom: "3rem" }}>
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
          {/* LEG-001: controller block — name + contact only (explicit owner choice:
              no postal address, no company number, no legal entity). */}
          <P>
            <strong>{t("controllerLabel")}</strong>
            {t("controllerText")}
            <a href="mailto:privacy@thememorypalace.ai" style={linkStyle}>
              privacy@thememorypalace.ai
            </a>
          </P>
          <P>{t("dpoText")}</P>
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
            {/* LEG-014: subscription/billing data category — plan, status,
                Apple/Stripe payment references; never card details. */}
            <Li>
              <strong>{t("whatWeCollectItem4Label")}</strong>
              {t("whatWeCollectItem4Text")}
            </Li>
          </Ul>
          {/* LEG-006: Art. 9 special-categories clause — explicit consent basis,
              withdrawn by deleting the content. */}
          <h3
            style={{
              fontFamily: F.display,
              fontSize: "1.125rem",
              fontWeight: 500,
              color: C.ink,
              marginBottom: "0.5rem",
              marginTop: "1.5rem",
              lineHeight: 1.3,
            }}
          >
            {t("specialCategoriesTitle")}
          </h3>
          <P>{t("specialCategoriesText")}</P>
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
              color: C.ink,
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
            <Li>
              <strong>{t("whoWeShareItem11Label")}</strong>
              {t("whoWeShareItem11Text")}
            </Li>
            <Li>
              <strong>{t("whoWeShareItem12Label")}</strong>
              {t("whoWeShareItem12Text")}
            </Li>
            <Li>
              <strong>{t("whoWeShareItem13Label")}</strong>
              {t("whoWeShareItem13Text")}
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
              color: C.ink,
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
              color: C.ink,
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
            {/* LEG-014: billing records — subscription duration + 7y statutory
                accounting retention. */}
            <Li>
              <strong>{t("retentionItem5Label")}</strong>
              {t("retentionItem5Text")}
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

        <div style={{ marginTop: "3rem", paddingTop: "1.5rem", borderTop: `1px solid ${C.hairline}` }}>
          <Link
            href="/security"
            style={{ ...linkStyle, fontSize: "0.875rem", marginRight: "1.5rem" }}
          >
            {t("linkSecurity")}
          </Link>
          <Link
            href="/terms"
            style={{ ...linkStyle, fontSize: "0.875rem", marginRight: "1.5rem" }}
          >
            {t("linkTerms")}
          </Link>
          <Link
            href="/data-deletion"
            style={{ ...linkStyle, fontSize: "0.875rem", marginRight: "1.5rem" }}
          >
            {t("linkDataDeletion")}
          </Link>
          <Link href="/" onClick={handleBack} style={{ ...linkStyle, fontSize: "0.875rem" }}>
            {t("linkHome")}
          </Link>
        </div>
      </main>
    </div>
    </MobileCtx.Provider>
  );
}

/* ─── Reusable styled sub-components ─── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: "2.5rem" }}>
      <h2
        style={{
          fontFamily: F.display,
          fontSize: "1.5rem",
          fontWeight: 500,
          color: C.ink,
          marginBottom: "0.875rem",
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
  const isMobile = useContext(MobileCtx);
  return (
    <p
      style={{
        fontSize: isMobile ? "1rem" : "0.9375rem",
        lineHeight: 1.75,
        color: C.ink,
        marginBottom: "0.75rem",
      }}
    >
      {children}
    </p>
  );
}

function Ul({ children }: { children: React.ReactNode }) {
  const isMobile = useContext(MobileCtx);
  return (
    <ul
      style={{
        paddingLeft: isMobile ? "1rem" : "1.25rem",
        marginBottom: "0.75rem",
      }}
    >
      {children}
    </ul>
  );
}

function Li({ children }: { children: React.ReactNode }) {
  const isMobile = useContext(MobileCtx);
  return (
    <li
      style={{
        fontSize: isMobile ? "1rem" : "0.9375rem",
        lineHeight: 1.75,
        color: C.ink,
        marginBottom: "0.375rem",
      }}
    >
      {children}
    </li>
  );
}

const linkStyle: React.CSSProperties = {
  color: C.ember,
  textDecoration: "none",
  fontWeight: 500,
};
