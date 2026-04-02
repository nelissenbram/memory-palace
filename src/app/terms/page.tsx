"use client";

import Link from "next/link";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import PalaceLogo from "@/components/landing/PalaceLogo";

const F = T.font;
const C = T.color;

const EMAIL = "privacy@thememorypalace.ai";
const ODR_URL = "https://ec.europa.eu/consumers/odr";
const MARKER = "@@LINK@@";

/** Split a translated string around a MARKER placeholder and render a link in between. */
function InlineLink({
  text,
  href,
  label,
  external,
}: {
  text: string;
  href: string;
  label: string;
  external?: boolean;
}) {
  const parts = text.split(MARKER);
  return (
    <>
      {parts[0]}
      <a
        href={href}
        style={linkStyle}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {label}
      </a>
      {parts[1] || ""}
    </>
  );
}

export default function TermsOfServicePage() {
  const { t, locale, setLocale } = useTranslation("terms");

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
          <Link href="/" aria-label="Back to home" style={{
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
        <button onClick={() => setLocale(locale === "en" ? "nl" : "en")} aria-label="Switch language" style={{
          background: "none", border: `1px solid ${C.sandstone}60`, borderRadius: "0.375rem",
          padding: "0.25rem 0.5rem", fontSize: "0.75rem", fontFamily: F.body,
          fontWeight: 600, color: C.walnut, cursor: "pointer", letterSpacing: "0.5px",
          textTransform: "uppercase", transition: "border-color 0.2s, color 0.2s",
        }}>
          {locale === "en" ? "NL" : "EN"}
        </button>
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

        <Section title={t("section1Title")}>
          <P>{t("section1P1")}</P>
          <P>{t("section1P2")}</P>
        </Section>

        <Section title={t("section2Title")}>
          <P>{t("section2P1")}</P>
          <Ul>
            <Li>{t("section2Li1")}</Li>
            <Li>{t("section2Li2")}</Li>
            <Li>{t("section2Li3")}</Li>
            <Li>
              <InlineLink
                text={t("section2Li4", { email: MARKER })}
                href={`mailto:${EMAIL}`}
                label={EMAIL}
              />
            </Li>
          </Ul>
          <P>{t("section2P2")}</P>
        </Section>

        <Section title={t("section3Title")}>
          <P>{t("section3P1")}</P>
          <Ul>
            <Li>{t("section3Li1")}</Li>
            <Li>{t("section3Li2")}</Li>
            <Li>{t("section3Li3")}</Li>
            <Li>{t("section3Li4")}</Li>
            <Li>{t("section3Li5")}</Li>
          </Ul>
          <P>{t("section3P2")}</P>
        </Section>

        <Section title={t("section4Title")}>
          <P>{t("section4P1")}</P>
          <P>{t("section4P2")}</P>
          <P>{t("section4P3")}</P>
        </Section>

        <Section title={t("section5Title")}>
          <P>{t("section5P1")}</P>
          <P>{t("section5P2")}</P>
        </Section>

        <Section title={t("section6Title")}>
          <P>{t("section6P1")}</P>
          <Ul>
            <Li>{t("section6Li1")}</Li>
            <Li>{t("section6Li2")}</Li>
            <Li>{t("section6Li3")}</Li>
          </Ul>
          <P>{t("section6P2")}</P>
        </Section>

        <Section title={t("section7Title")}>
          <P>{t("section7P1")}</P>
        </Section>

        <Section title={t("section8Title")}>
          <P>{t("section8P1")}</P>
          <P>{t("section8P2")}</P>
          <P>{t("section8P3")}</P>
        </Section>

        <Section title={t("section9Title")}>
          <P>{t("section9P1")}</P>
          <P>{t("section9P2")}</P>
        </Section>

        <Section title={t("section10Title")}>
          <P>{t("section10P1")}</P>
          <P>
            <InlineLink
              text={t("section10P2", { link: MARKER })}
              href={ODR_URL}
              label={ODR_URL}
              external
            />
          </P>
        </Section>

        <Section title={t("section11Title")}>
          <P>{t("section11P1")}</P>
          <Ul>
            <Li>
              <InlineLink
                text={t("section11Li1Email", { email: MARKER })}
                href={`mailto:${EMAIL}`}
                label={EMAIL}
              />
            </Li>
            <Li>{t("section11Li2Company")}</Li>
          </Ul>
        </Section>

        <div style={{ marginTop: 48, paddingTop: 24, borderTop: `1px solid ${C.sandstone}40` }}>
          <Link
            href="/privacy"
            style={{ ...linkStyle, fontSize: 14, marginRight: 24 }}
          >
            {t("privacyPolicy")}
          </Link>
          <Link
            href="/security"
            style={{ ...linkStyle, fontSize: 14, marginRight: 24 }}
          >
            {t("securityPolicy")}
          </Link>
          <Link href="/" style={{ ...linkStyle, fontSize: 14 }}>
            {t("backToHome")}
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
