"use client";

import { useState } from "react";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useTranslation } from "@/lib/hooks/useTranslation";
import TuscanCard from "@/components/ui/TuscanCard";
import { Sheet } from "@/components/ui/Sheet";
import { ANIM, EASE } from "@/components/ui/TuscanStyles";

const C = T.color;
const F = T.font;

/* ───── Canon neutral tokens ─────
   Source the Kep surface's neutrals from the canon library palette (mirrors
   src/lib/libraryTokens.ts CREAM/TRAY/HAIRLINE/SAGE) rather than theme.ts's
   legacy linen/warmStone/sandstone, so this surface shares one source of truth
   with its Library/Atrium siblings. Kept as well-named locals to avoid touching
   the shared token files. */
const TRAY = "#F2EDE4";    // canon lifted-tray neutral (libraryTokens TRAY)
const HAIRLINE = "#E3D6BC"; // canon card border (libraryTokens HAIRLINE)
const SAGE = "#56683C";    // canon sage (libraryTokens SAGE)
const NEUTRAL_SOFT = "#EDE6D8"; // canon warm neutral for header gradient / secondary fills

/* ───── Helpers ───── */

function formatPhone(phone: string): string {
  if (!phone) return "";
  const clean = phone.replace(/\D/g, "");
  if (!clean) return "";
  // We can't reliably split country code from national number without a full
  // phone library, so format loosely: assume a 1–3 digit country code, then
  // group the remaining national digits in readable blocks of 3.
  const ccLen = clean.length > 11 ? 3 : clean.length > 10 ? 2 : 1;
  const cc = clean.slice(0, Math.min(ccLen, clean.length));
  const rest = clean.slice(cc.length);
  const grouped = rest.replace(/(\d{3})(?=\d)/g, "$1 ").trim();
  return grouped ? `+${cc} ${grouped}` : `+${cc}`;
}

function downloadVCard(phone: string) {
  const vcard = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    "FN:Kep - Memory Palace",
    "ORG:The Memory Palace",
    `TEL;TYPE=CELL:+${phone}`,
    "NOTE:Your personal memory porter on WhatsApp",
    "END:VCARD",
  ].join("\n");
  const blob = new Blob([vcard], { type: "text/vcard;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Kep-Memory-Palace.vcf";
  a.click();
  URL.revokeObjectURL(url);
}

/* ───── SVG Illustrations ───── */

function KepPorterIllustration({ size = 140 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="90" cy="52" rx="28" ry="12" fill={C.walnut} opacity="0.9" />
      <rect x="72" y="28" width="36" height="24" rx="18" fill={C.walnut} />
      <rect x="86" y="20" width="8" height="10" rx="4" fill={C.gold} />
      <circle cx="90" cy="68" r="18" fill={C.sandstone} />
      <path d="M78 84 L90 96 L102 84" fill={C.cream} stroke={C.walnut} strokeWidth="1.5" />
      <path d="M66 88 Q66 84 78 84 L102 84 Q114 84 114 88 L118 140 H62 Z" fill={C.charcoal} />
      <path d="M78 84 L82 110 L90 96 L98 110 L102 84" fill="none" stroke={C.walnut} strokeWidth="1.2" />
      <circle cx="90" cy="108" r="2" fill={C.gold} />
      <circle cx="90" cy="118" r="2" fill={C.gold} />
      <circle cx="90" cy="128" r="2" fill={C.gold} />
      <path d="M62 100 Q48 110 52 128 L68 128" fill="none" stroke={C.charcoal} strokeWidth="6" strokeLinecap="round" />
      <path d="M118 100 Q132 110 128 128 L112 128" fill="none" stroke={C.charcoal} strokeWidth="6" strokeLinecap="round" />
      <rect x="48" y="124" width="84" height="4" rx="2" fill={C.gold} />
      <rect x="56" y="112" width="14" height="12" rx="2" fill={C.terracotta} opacity="0.8" />
      <rect x="74" y="108" width="14" height="16" rx="2" fill={C.sage} opacity="0.8" />
      <rect x="92" y="110" width="14" height="14" rx="2" fill={C.walnut} opacity="0.8" />
      <rect x="110" y="112" width="14" height="12" rx="2" fill={C.terracotta} opacity="0.6" />
      <circle cx="52" cy="130" r="5" fill={C.cream} />
      <circle cx="128" cy="130" r="5" fill={C.cream} />
      <rect x="76" y="140" width="12" height="20" rx="2" fill={C.charcoal} />
      <rect x="92" y="140" width="12" height="20" rx="2" fill={C.charcoal} />
      <ellipse cx="82" cy="162" rx="10" ry="4" fill={C.walnut} />
      <ellipse cx="98" cy="162" rx="10" ry="4" fill={C.walnut} />
    </svg>
  );
}

function KepFlowIllustration({ t }: { t: (key: string) => string }) {
  return (
    <svg width="100%" height="100" viewBox="5 0 280 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ maxWidth: "22rem", margin: "0 auto", display: "block", overflow: "visible" }}>
      <rect x="10" y="20" width="60" height="60" rx="14" fill={C.warmStone} opacity="0.5" stroke="#E3D6BC" strokeWidth="1.5" />
      <rect x="22" y="36" width="36" height="4" rx="2" fill="#25D366" opacity="0.6" />
      <rect x="22" y="44" width="28" height="4" rx="2" fill="#716A5E" opacity="0.4" />
      <rect x="22" y="52" width="20" height="4" rx="2" fill="#716A5E" opacity="0.3" />
      <rect x="28" y="60" width="12" height="9" rx="1.5" stroke="#25D366" strokeWidth="1" fill="none" />
      <circle cx="32" cy="64" r="1.5" fill="#25D366" opacity="0.5" />
      <line x1="80" y1="50" x2="118" y2="50" stroke="#9A4F2A" strokeWidth="1.5" strokeDasharray="4 3" />
      <polygon points="120,50 114,46 114,54" fill="#9A4F2A" />
      <ellipse cx="150" cy="38" rx="12" ry="5" fill={C.walnut} opacity="0.8" />
      <rect x="142" y="28" width="16" height="10" rx="8" fill={C.walnut} />
      <circle cx="150" cy="45" r="8" fill={C.sandstone} />
      <path d="M140 54 Q140 52 144 52 L156 52 Q160 52 160 54 L162 72 H138 Z" fill={C.charcoal} />
      <circle cx="150" cy="60" r="1" fill={C.gold} />
      <circle cx="150" cy="64" r="1" fill={C.gold} />
      <rect x="134" y="70" width="32" height="2" rx="1" fill={C.gold} />
      <rect x="140" y="64" width="8" height="6" rx="1" fill={C.terracotta} opacity="0.7" />
      <rect x="150" y="62" width="8" height="8" rx="1" fill={C.sage} opacity="0.7" />
      <line x1="172" y1="50" x2="210" y2="50" stroke="#9A4F2A" strokeWidth="1.5" strokeDasharray="4 3" />
      <polygon points="212,50 206,46 206,54" fill="#9A4F2A" />
      <rect x="220" y="18" width="56" height="64" rx="4" fill={C.warmStone} stroke={C.walnut} strokeWidth="1.5" />
      <rect x="234" y="30" width="28" height="42" rx="2" fill={C.cream} stroke={C.walnut} strokeWidth="1" />
      <circle cx="256" cy="52" r="2" fill={C.gold} />
      <rect x="230" y="76" width="36" height="5" rx="2" fill={C.gold} opacity="0.3" />
      <rect x="226" y="24" width="6" height="8" rx="1" fill={C.sage} opacity="0.3" stroke={C.walnut} strokeWidth="0.5" />
      <text x="40" y="96" textAnchor="middle" fontFamily={F.body} fontSize="9" fill="#716A5E" fontWeight="500">{t("flowWhatsapp")}</text>
      <text x="150" y="96" textAnchor="middle" fontFamily={F.body} fontSize="9" fill="#716A5E" fontWeight="500">{t("flowKep")}</text>
      <text x="248" y="96" textAnchor="middle" fontFamily={F.body} fontSize="9" fill="#716A5E" fontWeight="500">{t("flowRoom")}</text>
    </svg>
  );
}

function WhatsAppIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

/* ───── Panel ───── */

interface KepCapturePanelProps {
  onClose: () => void;
}

export default function KepCapturePanel({ onClose }: KepCapturePanelProps) {
  const { t } = useTranslation("kepLanding");
  const isMobile = useIsMobile();
  const [copied, setCopied] = useState(false);

  const waPhone = process.env.NEXT_PUBLIC_KEP_WHATSAPP_NUMBER || "";
  const waLink = waPhone ? `https://wa.me/${waPhone}?text=Hi%20Kep` : "#";
  const displayPhone = formatPhone(waPhone);

  const handleCopy = () => {
    if (!waPhone) return;
    navigator.clipboard.writeText(`+${waPhone}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={t("navTitle")}
      side="right"
      maxWidth="30rem"
      background={TRAY}
    >
      {/* Content \u2014 Sheet owns the outer overlay, scrim, header title, close button, scroll region, focus-trap and body-lock */}
      <div>
          {/* Hero: Porter + Title */}
          <div style={{
            textAlign: "center",
            marginBottom: "2rem",
            animation: `${ANIM.tuscanFadeSlideUp} 0.5s ${EASE} both`,
          }}>
            <KepPorterIllustration size={isMobile ? 100 : 130} />
            <h1 style={{
              fontFamily: F.display,
              fontSize: isMobile ? "1.375rem" : "1.75rem", // Atrium token: titleL/h1m
              fontWeight: 600,
              color: C.ink,
              margin: "0.75rem 0 0.25rem",
              lineHeight: 1.15,
            }}>
              {t("title")}
            </h1>
            <p style={{
              fontFamily: F.display,
              fontSize: "0.9375rem",
              color: C.inkMuted, // Atrium token: muted, full opacity
              fontStyle: "italic",
              maxWidth: "28rem",
              margin: "0 auto",
              lineHeight: 1.4,
            }}>
              {t("subtitle")}
            </p>
          </div>

          {/* How it works visual */}
          <div style={{
            marginBottom: "2rem",
            animation: `${ANIM.tuscanFadeSlideUp} 0.5s ${EASE} 0.1s both`,
            display: "flex", justifyContent: "center",
          }}>
            <KepFlowIllustration t={t} />
          </div>

          {/* Steps */}
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: "1rem",
            marginBottom: "2rem",
            animation: `${ANIM.tuscanFadeSlideUp} 0.5s ${EASE} 0.15s both`,
          }}>
            {/* Step 1: Save the number */}
            <TuscanCard variant="elevated" padding={isMobile ? "1.25rem" : "1.5rem"}>
              <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                <StepBadge n={1} />
                <div style={{ flex: 1 }}>
                  <h3 style={stepTitle}>{t("quickStep1Title")}</h3>
                  <p style={stepDesc}>{t("quickStep1Text")}</p>
                  <div style={{
                    display: "inline-flex", alignItems: "center",
                    background: "rgba(154,79,42,0.11)", border: `0.0625rem solid ${HAIRLINE}`, // canon terracotta medallion tint + hairline (gold reserved for the palace itself)
                    borderRadius: "0.75rem", padding: "0.5rem 1rem",
                    marginBottom: "0.75rem",
                  }}>
                    <span style={{
                      fontFamily: "monospace", fontSize: isMobile ? "1rem" : "1.125rem",
                      fontWeight: 700, color: C.rustDeep, letterSpacing: "0.03em", // Atrium token: terracotta glyph
                    }}>
                      {displayPhone}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <button onClick={() => downloadVCard(waPhone)} style={btnPrimary}>
                      <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="2" width="14" height="16" rx="2" />
                        <circle cx="10" cy="8" r="2.5" />
                        <path d="M5.5 16c0-2 2-3.5 4.5-3.5s4.5 1.5 4.5 3.5" />
                      </svg>
                      {t("quickStep1Save")}
                    </button>
                    <button onClick={handleCopy} style={{
                      ...btnSecondary,
                      background: copied ? SAGE : NEUTRAL_SOFT, // canon sage on-copy, warm neutral at rest
                      color: copied ? C.cream : C.ink,
                      borderColor: copied ? SAGE : HAIRLINE, // canon sage / hairline
                    }}>
                      {copied ? t("quickStep1Copied") : t("quickStep1Copy")}
                    </button>
                  </div>
                </div>
              </div>
            </TuscanCard>

            {/* Step 2: Say Hi */}
            <TuscanCard variant="elevated" padding={isMobile ? "1.25rem" : "1.5rem"}>
              <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                <StepBadge n={2} />
                <div style={{ flex: 1 }}>
                  <h3 style={stepTitle}>{t("quickStep2Title")}</h3>
                  <p style={stepDesc}>{t("quickStep2Text")}</p>
                  {waPhone ? (
                    <a href={waLink} target="_blank" rel="noopener noreferrer" style={btnWhatsApp}>
                      <WhatsAppIcon size={16} />
                      {t("quickStep2Button")}
                    </a>
                  ) : (
                    // No WhatsApp number configured — render a disabled control rather than a dead href="#"
                    <span style={{ ...btnWhatsApp, opacity: 0.5, cursor: "not-allowed" }} aria-disabled="true">
                      <WhatsAppIcon size={16} />
                      {t("quickStep2Button")}
                    </span>
                  )}
                </div>
              </div>
            </TuscanCard>

            {/* Step 3: Send memories */}
            <TuscanCard variant="elevated" padding={isMobile ? "1.25rem" : "1.5rem"}>
              <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                <StepBadge n={3} />
                <div style={{ flex: 1 }}>
                  <h3 style={stepTitle}>{t("quickStep3Title")}</h3>
                  <p style={stepDesc}>{t("quickStep3Text")}</p>
                </div>
              </div>
            </TuscanCard>

            {/* Step 4: Organize into rooms */}
            <TuscanCard variant="elevated" padding={isMobile ? "1.25rem" : "1.5rem"}>
              <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                <StepBadge n={4} />
                <div style={{ flex: 1 }}>
                  <h3 style={stepTitle}>{t("quickStep4Title")}</h3>
                  <p style={stepDesc}>{t("quickStep4Text")}</p>
                  <div style={{
                    display: "flex", flexWrap: "wrap", gap: "0.375rem",
                    marginTop: "0.5rem",
                  }}>
                    {[`ROOM ${t("cmdExampleKitchen")}`, `NEW ${t("cmdExampleHolidays")}`, "ROOMS"].map((cmd) => (
                      <code key={cmd} style={{
                        fontFamily: "monospace", fontSize: "0.8125rem", fontWeight: 600, // Atrium token: meta
                        color: C.ink, background: TRAY, // canon lifted-tray neutral (was C.linen)
                        padding: "0.25rem 0.5rem", borderRadius: "0.25rem",
                        border: `0.0625rem solid ${HAIRLINE}`, // canon hairline
                      }}>
                        {cmd}
                      </code>
                    ))}
                  </div>
                </div>
              </div>
            </TuscanCard>
          </div>

          {/* Settings link */}
          <TuscanCard
            variant="glass"
            padding={isMobile ? "1rem" : "1.25rem"}
            style={{
              marginBottom: "1.5rem",
              animation: `${ANIM.tuscanFadeSlideUp} 0.5s ${EASE} 0.25s both`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
              <div style={{
                width: "2.25rem", height: "2.25rem", borderRadius: "50%",
                background: "rgba(86,104,60,0.16)", display: "flex", // Atrium token: sage medallion tint
                alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#56683C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <polyline points="9 12 11 14 15 10" />
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: F.body, fontSize: "0.8125rem", color: C.inkSoft, lineHeight: 1.5, margin: 0 }}>
                  {t("settingsHint")}
                </p>
                <a
                  href="/settings/connections"
                  style={{
                    fontFamily: F.body, fontSize: "0.8125rem", fontWeight: 600,
                    color: C.rustDeep, textDecoration: "underline", // Atrium token: terracotta glyph (text-safe on light)
                    textUnderlineOffset: "0.1875rem",
                  }}
                >
                  {t("settingsLink")}
                </a>
              </div>
            </div>
          </TuscanCard>

          {/* Commands tip */}
          <p style={{
            fontFamily: F.body, fontSize: "0.8125rem", color: C.inkMuted, // Atrium token: meta + muted
            textAlign: "center", fontStyle: "italic",
            animation: `${ANIM.tuscanFadeSlideUp} 0.5s ${EASE} 0.3s both`,
          }}>
            {t("commandsHint")}
          </p>
      </div>
    </Sheet>
  );
}

/* ───── Shared styles ───── */

const stepTitle: React.CSSProperties = {
  fontFamily: F.display, fontSize: "1.0625rem", fontWeight: 600, // Atrium token: titleS
  color: C.ink, margin: "0 0 0.25rem",
};

const stepDesc: React.CSSProperties = {
  fontFamily: F.body, fontSize: "0.9375rem", color: C.inkMuted, // Atrium token: body + muted
  lineHeight: 1.4, margin: "0 0 0.625rem",
};

const btnPrimary: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: "0.375rem",
  background: C.ember, color: C.cream, // Atrium token: ember (active/button register)
  border: "none", borderRadius: "0.75rem", // Atrium token: small-control radius
  padding: "0.4375rem 0.875rem", fontSize: "0.8125rem",
  fontWeight: 600, cursor: "pointer", fontFamily: F.body,
};

const btnSecondary: React.CSSProperties = {
  border: "0.0625rem solid",
  borderRadius: "0.75rem", padding: "0.4375rem 0.75rem", // Atrium token: small-control radius
  fontSize: "0.8125rem", cursor: "pointer",
  fontWeight: 500, fontFamily: F.body,
  background: NEUTRAL_SOFT, color: C.ink, // canon warm neutral (was C.warmStone)
  transition: `all 0.2s ${EASE}`,
};

const btnWhatsApp: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: "0.5rem",
  background: "#25D366", color: "#fff",
  padding: "0.4375rem 1rem", borderRadius: "0.75rem", // Atrium token: small-control radius
  fontSize: "0.8125rem", fontWeight: 600, textDecoration: "none",
  fontFamily: F.body,
};

function StepBadge({ n }: { n: number }) {
  return (
    <div style={{
      width: "2rem", height: "2rem", borderRadius: "50%",
      background: `linear-gradient(135deg, ${C.ember}, ${C.rustDeep})`, // Atrium token: opaque ember→terracotta, no alpha band
      color: C.cream,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: F.display, fontSize: "0.8125rem", fontWeight: 700,
      flexShrink: 0, marginTop: "0.125rem",
      boxShadow: T.shadow[1], // Atrium token: S1 warm-ink shadow
    }}>
      {n}
    </div>
  );
}
