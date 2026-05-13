"use client";

import Link from "next/link";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useTranslation } from "@/lib/hooks/useTranslation";
import PalaceLogo from "@/components/landing/PalaceLogo";

const C = T.color;
const F = T.font;

/* ───── SVG Illustrations ───── */

function KepPorterIllustration({ size = 180 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Bell / dome hat */}
      <ellipse cx="90" cy="52" rx="28" ry="12" fill={C.walnut} opacity="0.9" />
      <rect x="72" y="28" width="36" height="24" rx="18" fill={C.walnut} />
      <rect x="86" y="20" width="8" height="10" rx="4" fill={C.gold} />
      {/* Head silhouette - featureless */}
      <circle cx="90" cy="68" r="18" fill={C.sandstone} />
      {/* Collar / cravat */}
      <path d="M78 84 L90 96 L102 84" fill={C.cream} stroke={C.walnut} strokeWidth="1.5" />
      {/* Torso - formal jacket */}
      <path d="M66 88 Q66 84 78 84 L102 84 Q114 84 114 88 L118 140 H62 Z" fill={C.charcoal} />
      {/* Jacket lapels */}
      <path d="M78 84 L82 110 L90 96 L98 110 L102 84" fill="none" stroke={C.walnut} strokeWidth="1.2" />
      {/* Buttons */}
      <circle cx="90" cy="108" r="2" fill={C.gold} />
      <circle cx="90" cy="118" r="2" fill={C.gold} />
      <circle cx="90" cy="128" r="2" fill={C.gold} />
      {/* Arms carrying a tray */}
      <path d="M62 100 Q48 110 52 128 L68 128" fill="none" stroke={C.charcoal} strokeWidth="6" strokeLinecap="round" />
      <path d="M118 100 Q132 110 128 128 L112 128" fill="none" stroke={C.charcoal} strokeWidth="6" strokeLinecap="round" />
      {/* Tray / platter */}
      <rect x="48" y="124" width="84" height="4" rx="2" fill={C.gold} />
      {/* Items on tray - memories */}
      <rect x="56" y="112" width="14" height="12" rx="2" fill={C.terracotta} opacity="0.8" />
      <rect x="74" y="108" width="14" height="16" rx="2" fill={C.sage} opacity="0.8" />
      <rect x="92" y="110" width="14" height="14" rx="2" fill={C.walnut} opacity="0.8" />
      <rect x="110" y="112" width="14" height="12" rx="2" fill={C.terracotta} opacity="0.6" />
      {/* Gloves - white */}
      <circle cx="52" cy="130" r="5" fill={C.cream} />
      <circle cx="128" cy="130" r="5" fill={C.cream} />
      {/* Base / legs hint */}
      <rect x="76" y="140" width="12" height="20" rx="2" fill={C.charcoal} />
      <rect x="92" y="140" width="12" height="20" rx="2" fill={C.charcoal} />
      {/* Shoes */}
      <ellipse cx="82" cy="162" rx="10" ry="4" fill={C.walnut} />
      <ellipse cx="98" cy="162" rx="10" ry="4" fill={C.walnut} />
    </svg>
  );
}

function WhatsAppIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function StepIcon({ number }: { number: number }) {
  return (
    <div style={{
      width: "3rem", height: "3rem", borderRadius: "50%",
      background: C.terracotta, color: C.cream,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: F.display, fontSize: "1.25rem", fontWeight: 600,
      flexShrink: 0,
    }}>
      {number}
    </div>
  );
}

function ShieldIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M24 4L8 12v12c0 11.1 6.8 21.4 16 24 9.2-2.6 16-12.9 16-24V12L24 4z" fill={C.sage} opacity="0.15" stroke={C.sage} strokeWidth="2" />
      <path d="M20 24l4 4 8-8" stroke={C.sage} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="18" cy="20" r="10" stroke={C.walnut} strokeWidth="2" fill={C.walnut} opacity="0.1" />
      <circle cx="18" cy="20" r="4" fill={C.walnut} opacity="0.3" />
      <rect x="26" y="18" width="18" height="4" rx="2" fill={C.walnut} opacity="0.8" />
      <rect x="38" y="22" width="4" height="6" rx="1" fill={C.walnut} opacity="0.6" />
      <rect x="32" y="22" width="4" height="4" rx="1" fill={C.walnut} opacity="0.6" />
    </svg>
  );
}

/* ───── Main Page ───── */

export default function KepLandingPage() {
  const isMobile = useIsMobile();
  const { t, locale } = useTranslation("kepLanding");

  const waPhone = process.env.NEXT_PUBLIC_KEP_WHATSAPP_NUMBER || "";
  const waLink = waPhone
    ? `https://wa.me/${waPhone}?text=Hi%20Kep`
    : "#";

  const sectionStyle = {
    maxWidth: "56rem",
    margin: "0 auto",
    padding: isMobile ? "2.5rem 1.25rem" : "4rem 2rem",
  };

  return (
    <div style={{
      minHeight: "100dvh",
      background: `linear-gradient(180deg, ${C.linen} 0%, ${C.cream} 40%, ${C.linen} 100%)`,
      fontFamily: F.body,
      color: C.charcoal,
    }}>
      {/* ── Nav ── */}
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: isMobile ? "1rem 1.25rem" : "1rem 2.5rem",
        borderBottom: `1px solid ${C.lineFaint}`,
      }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.5rem", textDecoration: "none" }}>
          <PalaceLogo size="sm" />
          <span style={{ fontFamily: F.display, fontSize: "1.125rem", color: C.walnut, fontWeight: 600 }}>
            The Memory Palace
          </span>
        </Link>
      </nav>

      {/* ── Hero ── */}
      <section style={{
        ...sectionStyle,
        textAlign: "center",
        paddingTop: isMobile ? "3rem" : "5rem",
        paddingBottom: isMobile ? "2rem" : "3rem",
      }}>
        <KepPorterIllustration size={isMobile ? 150 : 200} />
        <h1 style={{
          fontFamily: F.display, fontSize: isMobile ? "2.25rem" : "3.25rem",
          fontWeight: 600, color: C.charcoal, marginTop: "1.5rem", marginBottom: "0.5rem",
          lineHeight: 1.1,
        }}>
          {t("title")}
        </h1>
        <p style={{
          fontFamily: F.display, fontSize: isMobile ? "1.125rem" : "1.375rem",
          color: C.walnut, fontStyle: "italic", marginBottom: "1.5rem",
        }}>
          {t("subtitle")}
        </p>
        <p style={{
          fontSize: isMobile ? "1rem" : "1.125rem", color: C.inkSoft,
          maxWidth: "40rem", margin: "0 auto", lineHeight: 1.7,
        }}>
          {t("heroText")}
        </p>
      </section>

      {/* ── Divider ── */}
      <div style={{
        width: "4rem", height: "2px", background: C.gold, margin: "0 auto",
        opacity: 0.6,
      }} />

      {/* ── Who is Kep ── */}
      <section style={sectionStyle}>
        <div style={{
          display: "flex", flexDirection: isMobile ? "column" : "row",
          gap: isMobile ? "1.5rem" : "3rem", alignItems: "center",
        }}>
          <KeyIcon />
          <div>
            <h2 style={{
              fontFamily: F.display, fontSize: isMobile ? "1.5rem" : "2rem",
              fontWeight: 600, color: C.charcoal, marginBottom: "0.75rem",
            }}>
              {t("whatIsKep")}
            </h2>
            <p style={{ fontSize: "1rem", color: C.inkSoft, lineHeight: 1.7 }}>
              {t("whatIsKepText")}
            </p>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section style={{
        ...sectionStyle,
        background: C.cream,
        borderRadius: "1.5rem",
        border: `1px solid ${C.lineFaint}`,
        maxWidth: "52rem",
        padding: isMobile ? "2rem 1.25rem" : "3rem 2.5rem",
      }}>
        <h2 style={{
          fontFamily: F.display, fontSize: isMobile ? "1.5rem" : "2rem",
          fontWeight: 600, color: C.charcoal, textAlign: "center", marginBottom: "2.5rem",
        }}>
          {t("howItWorksTitle")}
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          {[1, 2, 3, 4].map((n) => (
            <div key={n} style={{
              display: "flex", gap: "1.25rem", alignItems: "flex-start",
            }}>
              <StepIcon number={n} />
              <div>
                <h3 style={{
                  fontFamily: F.display, fontSize: "1.125rem", fontWeight: 600,
                  color: C.charcoal, marginBottom: "0.25rem",
                }}>
                  {t(`step${n}Title` as "step1Title")}
                </h3>
                <p style={{ fontSize: "0.9375rem", color: C.inkSoft, lineHeight: 1.65 }}>
                  {t(`step${n}Text` as "step1Text")}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Divider ── */}
      <div style={{
        width: "4rem", height: "2px", background: C.gold, margin: "2.5rem auto",
        opacity: 0.6,
      }} />

      {/* ── Privacy ── */}
      <section style={sectionStyle}>
        <div style={{
          display: "flex", flexDirection: isMobile ? "column" : "row",
          gap: isMobile ? "1.5rem" : "3rem", alignItems: "center",
        }}>
          <ShieldIcon />
          <div>
            <h2 style={{
              fontFamily: F.display, fontSize: isMobile ? "1.5rem" : "2rem",
              fontWeight: 600, color: C.charcoal, marginBottom: "0.75rem",
            }}>
              {t("privacyTitle")}
            </h2>
            <p style={{ fontSize: "1rem", color: C.inkSoft, lineHeight: 1.7 }}>
              {t("privacyText")}
            </p>
          </div>
        </div>
      </section>

      {/* ── The Faithful Porter ── */}
      <section style={{
        ...sectionStyle,
        textAlign: "center",
      }}>
        <h2 style={{
          fontFamily: F.display, fontSize: isMobile ? "1.5rem" : "2rem",
          fontWeight: 600, color: C.charcoal, marginBottom: "1rem",
        }}>
          {t("personaTitle")}
        </h2>
        <p style={{
          fontSize: "1rem", color: C.inkSoft, lineHeight: 1.7,
          maxWidth: "40rem", margin: "0 auto", fontStyle: "italic",
        }}>
          {t("personaText")}
        </p>
      </section>

      {/* ── CTA ── */}
      <section style={{
        ...sectionStyle,
        textAlign: "center",
        paddingBottom: isMobile ? "3rem" : "5rem",
      }}>
        <h2 style={{
          fontFamily: F.display, fontSize: isMobile ? "1.5rem" : "2rem",
          fontWeight: 600, color: C.charcoal, marginBottom: "0.75rem",
        }}>
          {t("ctaTitle")}
        </h2>
        <p style={{
          fontSize: "1rem", color: C.inkSoft, marginBottom: "2rem",
          maxWidth: "32rem", margin: "0 auto 2rem",
        }}>
          {t("ctaText")}
        </p>
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex", alignItems: "center", gap: "0.75rem",
            background: "#25D366", color: "#fff",
            padding: "0.875rem 2rem", borderRadius: "0.75rem",
            fontSize: "1.0625rem", fontWeight: 600, textDecoration: "none",
            boxShadow: "0 4px 16px rgba(37,211,102,0.3)",
            transition: "transform 0.2s, box-shadow 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 6px 24px rgba(37,211,102,0.4)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 4px 16px rgba(37,211,102,0.3)";
          }}
        >
          <WhatsAppIcon size={22} />
          {t("ctaButton")}
        </a>
        <div style={{ marginTop: "2rem" }}>
          <Link href="/" style={{
            color: C.walnut, fontSize: "0.9375rem",
            textDecoration: "underline", textUnderlineOffset: "3px",
          }}>
            {t("learnMore")}
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        borderTop: `1px solid ${C.lineFaint}`,
        padding: "1.5rem 2rem",
        textAlign: "center",
        fontSize: "0.8125rem",
        color: C.muted,
      }}>
        The Memory Palace &middot; Kep
      </footer>
    </div>
  );
}
