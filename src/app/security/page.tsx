"use client";

import Link from "next/link";
import { T } from "@/lib/theme";
import { useIsMobile, useIsSmall } from "@/lib/hooks/useIsMobile";
import { useTranslation } from "@/lib/hooks/useTranslation";

const F = T.font;
const C = T.color;

type SectionDef = {
  icon: string;
  titleKey: string;
  items: { icon: string; labelKey: string; detailKey: string }[];
};

const SECTIONS: SectionDef[] = [
  {
    icon: "\u{1F3DB}\uFE0F",
    titleKey: "sectionHostingTitle",
    items: [
      { icon: "\u{1F30D}", labelKey: "hostingVercelLabel", detailKey: "hostingVercelDetail" },
      { icon: "\u{1F1EA}\u{1F1FA}", labelKey: "hostingEuLabel", detailKey: "hostingEuDetail" },
      { icon: "\u{1F4CB}", labelKey: "hostingGdprLabel", detailKey: "hostingGdprDetail" },
    ],
  },
  {
    icon: "\u{1F510}",
    titleKey: "sectionEncryptionTitle",
    items: [
      { icon: "\u{1F512}", labelKey: "encryptionTransitLabel", detailKey: "encryptionTransitDetail" },
      { icon: "\u{1F4BE}", labelKey: "encryptionRestLabel", detailKey: "encryptionRestDetail" },
      { icon: "\u{1F4C1}", labelKey: "encryptionFilesLabel", detailKey: "encryptionFilesDetail" },
      { icon: "\u{1F511}", labelKey: "encryptionPasswordLabel", detailKey: "encryptionPasswordDetail" },
    ],
  },
  {
    icon: "\u{1F6E1}\uFE0F",
    titleKey: "sectionAuthTitle",
    items: [
      { icon: "\u2709\uFE0F", labelKey: "authEmailLabel", detailKey: "authEmailDetail" },
      { icon: "\u{1F517}", labelKey: "authSocialLabel", detailKey: "authSocialDetail" },
      { icon: "\u{1F4F1}", labelKey: "authMfaLabel", detailKey: "authMfaDetail" },
      { icon: "\u{1F464}", labelKey: "authRlsLabel", detailKey: "authRlsDetail" },
      { icon: "\u{1F3AB}", labelKey: "authJwtLabel", detailKey: "authJwtDetail" },
    ],
  },
  {
    icon: "\u{1F39B}\uFE0F",
    titleKey: "sectionPrivacyTitle",
    items: [
      { icon: "\u{1F4E5}", labelKey: "privacyExportLabel", detailKey: "privacyExportDetail" },
      { icon: "\u{1F5D1}\uFE0F", labelKey: "privacyDeleteLabel", detailKey: "privacyDeleteDetail" },
      { icon: "\u{1F36A}", labelKey: "privacyCookieLabel", detailKey: "privacyCookieDetail" },
      { icon: "\u{1F6AB}", labelKey: "privacyNoTrackingLabel", detailKey: "privacyNoTrackingDetail" },
      { icon: "\u{1F54A}\uFE0F", labelKey: "privacyLegacyLabel", detailKey: "privacyLegacyDetail" },
    ],
  },
  {
    icon: "\u{1F504}",
    titleKey: "sectionBackupTitle",
    items: [
      { icon: "\u{1F4BE}", labelKey: "backupDailyLabel", detailKey: "backupDailyDetail" },
      { icon: "\u23F1\uFE0F", labelKey: "backupPitrLabel", detailKey: "backupPitrDetail" },
      { icon: "\u{1F310}", labelKey: "backupReplicatedLabel", detailKey: "backupReplicatedDetail" },
    ],
  },
];

export default function SecurityPage() {
  const isMobile = useIsMobile();
  const isSmall = useIsSmall();
  const { t } = useTranslation("securityPage");

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
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
          }}
        >
          <span style={{ fontSize: 22 }}>{"\u{1F3DB}\uFE0F"}</span>
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
        </Link>
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
      </nav>

      {/* --- Hero --- */}
      <section
        style={{
          textAlign: "center",
          padding: isMobile ? "60px 20px 50px" : "80px clamp(20px, 5vw, 60px) 60px",
          background: `radial-gradient(ellipse at 50% 30%, ${C.warmStone}, ${C.linen} 70%)`,
        }}
      >
        <span style={{ fontSize: 56, display: "block", marginBottom: 20 }}>
          {"\u{1F6E1}\uFE0F"}
        </span>
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
              <span style={{ fontSize: 28 }}>{section.icon}</span>
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
                  <span
                    style={{
                      fontSize: 28,
                      display: "block",
                      marginBottom: 12,
                    }}
                  >
                    {item.icon}
                  </span>
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
          <span style={{ fontSize: 40, display: "block", marginBottom: 16 }}>
            {"\u{1F54A}\uFE0F"}
          </span>
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
        <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>
          &copy; {new Date().getFullYear()} {t("footerCopyright")}
        </p>
      </footer>
    </div>
  );
}
