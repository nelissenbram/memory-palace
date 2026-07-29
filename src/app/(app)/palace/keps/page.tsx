"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { T } from "@/lib/theme";
import { useIsMobile, useIsCompact } from "@/lib/hooks/useIsMobile";
import { useTranslation } from "@/lib/hooks/useTranslation";
import TuscanCard from "@/components/ui/TuscanCard";
import NavigationBar from "@/components/ui/NavigationBar";
import { ANIM, EASE } from "@/components/ui/TuscanStyles";

const C = T.color;
const F = T.font;
/* Canon mono token for WhatsApp command chips (rather than the raw 'monospace' keyword). */
const MONO = "ui-monospace, 'SF Mono', 'SFMono-Regular', 'Menlo', 'Consolas', monospace";

/* ───── Helpers ───── */

function formatPhone(phone: string): string {
  if (!phone) return "";
  const clean = phone.replace(/\D/g, "");
  // Guard against short/malformed numbers so we never render a broken pill.
  if (clean.length < 8) return clean ? `+${clean}` : "";
  if (clean.length >= 10) {
    const cc = clean.slice(0, clean.length - 9);
    const rest = clean.slice(clean.length - 9);
    return `+${cc} ${rest.slice(0, 1)} ${rest.slice(1, 5)} ${rest.slice(5)}`;
  }
  return `+${clean}`;
}

function downloadVCard(phone: string, fn: string, org: string, note: string) {
  const clean = phone.replace(/\D/g, "");
  if (clean.length < 8) return; // don't save a malformed contact
  const vcard = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${fn}`,
    `ORG:${org}`,
    `TEL;TYPE=CELL:+${clean}`,
    `NOTE:${note}`,
    "END:VCARD",
  ].join("\n");
  try {
    const blob = new Blob([vcard], { type: "text/vcard;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Kep-Memory-Palace.vcf";
    // Appending to the DOM before click() is required for a reliable download
    // on some mobile/WebKit browsers; remove and revoke afterwards.
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    // Surface a silent no-op instead of swallowing it entirely.
    console.error("[Kep] vCard download failed", err);
  }
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
      <rect x="56" y="112" width="14" height="12" rx="2" fill={C.ember} opacity="0.8" />
      <rect x="74" y="108" width="14" height="16" rx="2" fill={C.sage} opacity="0.8" />
      <rect x="92" y="110" width="14" height="14" rx="2" fill={C.walnut} opacity="0.8" />
      <rect x="110" y="112" width="14" height="12" rx="2" fill={C.ember} opacity="0.6" />
      <circle cx="52" cy="130" r="5" fill={C.cream} />
      <circle cx="128" cy="130" r="5" fill={C.cream} />
      <rect x="76" y="140" width="12" height="20" rx="2" fill={C.charcoal} />
      <rect x="92" y="140" width="12" height="20" rx="2" fill={C.charcoal} />
      <ellipse cx="82" cy="162" rx="10" ry="4" fill={C.walnut} />
      <ellipse cx="98" cy="162" rx="10" ry="4" fill={C.walnut} />
    </svg>
  );
}

/** Visual: WhatsApp bubble -> Kep porter -> Room door */
function KepFlowIllustration({ roomLabel }: { roomLabel: string }) {
  return (
    <svg width="100%" height="100" viewBox="5 0 280 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ maxWidth: "22rem", margin: "0 auto", display: "block", overflow: "visible" }}>
      {/* WhatsApp bubble */}
      <rect x="10" y="20" width="60" height="60" rx="14" fill="#25D366" opacity="0.15" stroke="#25D366" strokeWidth="1.5" />
      <rect x="22" y="36" width="36" height="4" rx="2" fill="#25D366" opacity="0.6" />
      <rect x="22" y="44" width="28" height="4" rx="2" fill="#25D366" opacity="0.4" />
      <rect x="22" y="52" width="20" height="4" rx="2" fill="#25D366" opacity="0.3" />
      {/* Photo icon inside */}
      <rect x="28" y="60" width="12" height="9" rx="1.5" stroke="#25D366" strokeWidth="1" fill="none" />
      <circle cx="32" cy="64" r="1.5" fill="#25D366" opacity="0.5" />

      {/* Arrow 1 */}
      <line x1="80" y1="50" x2="118" y2="50" stroke={C.gold} strokeWidth="1.5" strokeDasharray="4 3" />
      <polygon points="120,50 114,46 114,54" fill={C.gold} />

      {/* Kep porter (mini) */}
      <ellipse cx="150" cy="38" rx="12" ry="5" fill={C.walnut} opacity="0.8" />
      <rect x="142" y="28" width="16" height="10" rx="8" fill={C.walnut} />
      <circle cx="150" cy="45" r="8" fill={C.sandstone} />
      <path d="M140 54 Q140 52 144 52 L156 52 Q160 52 160 54 L162 72 H138 Z" fill={C.charcoal} />
      <circle cx="150" cy="60" r="1" fill={C.gold} />
      <circle cx="150" cy="64" r="1" fill={C.gold} />
      {/* Tray with photo */}
      <rect x="134" y="70" width="32" height="2" rx="1" fill={C.gold} />
      <rect x="140" y="64" width="8" height="6" rx="1" fill={C.ember} opacity="0.7" />
      <rect x="150" y="62" width="8" height="8" rx="1" fill={C.sage} opacity="0.7" />

      {/* Arrow 2 */}
      <line x1="172" y1="50" x2="210" y2="50" stroke={C.gold} strokeWidth="1.5" strokeDasharray="4 3" />
      <polygon points="212,50 206,46 206,54" fill={C.gold} />

      {/* Room/door */}
      <rect x="220" y="18" width="56" height="64" rx="4" fill={C.warmStone} stroke={C.walnut} strokeWidth="1.5" />
      {/* Door */}
      <rect x="234" y="30" width="28" height="42" rx="2" fill={C.cream} stroke={C.walnut} strokeWidth="1" />
      <circle cx="256" cy="52" r="2" fill={C.gold} />
      {/* Room label */}
      <rect x="230" y="76" width="36" height="5" rx="2" fill={C.gold} opacity="0.3" />
      {/* Window */}
      <rect x="226" y="24" width="6" height="8" rx="1" fill={C.sage} opacity="0.3" stroke={C.walnut} strokeWidth="0.5" />

      {/* Labels below */}
      <text x="40" y="96" textAnchor="middle" fontFamily={F.body} fontSize="9" fill={C.muted} fontWeight="500">WhatsApp</text>
      <text x="150" y="96" textAnchor="middle" fontFamily={F.body} fontSize="9" fill={C.muted} fontWeight="500">Kep</text>
      <text x="248" y="96" textAnchor="middle" fontFamily={F.body} fontSize="9" fill={C.muted} fontWeight="500">{roomLabel}</text>
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

/* ───── Main Page ───── */

export default function KepsPage() {
  const { t } = useTranslation("kepLanding");
  const isMobile = useIsMobile();
  const isCompact = useIsCompact();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  // Gate entrance animations behind the user's reduced-motion preference.
  const anim = (delay: string) =>
    reduceMotion ? undefined : `${ANIM.tuscanFadeSlideUp} 0.5s ${EASE} ${delay}both`;

  const waPhone = process.env.NEXT_PUBLIC_KEP_WHATSAPP_NUMBER || "";
  const waLink = waPhone
    ? `https://wa.me/${waPhone}?text=${encodeURIComponent(t("waPrefill"))}`
    : "#";
  const displayPhone = formatPhone(waPhone);

  const handleCopy = () => {
    if (!waPhone) return;
    navigator.clipboard.writeText(`+${waPhone}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  const handleModeChange = (mode: string) => {
    if (mode === "atrium") router.push("/atrium");
    else if (mode === "3d") router.push("/palace");
    else if (mode === "library") router.push("/library");
  };

  return (
    <div style={{
      minHeight: "100dvh",
      background: C.cream,
      paddingBottom: isMobile ? "calc(4.5rem + env(safe-area-inset-bottom, 0px))" : "3rem",
    }}>
      {/* Desktop NavigationBar */}
      {/* Intentional: Kep is reached from the Atrium, so we keep Atrium as the
          active mode here rather than introducing a separate Kep tab. */}
      {!isMobile && (
        <NavigationBar
          currentMode="atrium"
          onModeChange={handleModeChange}
          onNotifications={() => router.push("/palace?notifications=1")}
          isMobile={false}
          activeTab={null}
        />
      )}

      <div style={{
        maxWidth: isMobile ? "36rem" : "52rem",
        margin: "0 auto",
        padding: isMobile ? "1.25rem" : "1.5rem",
        paddingTop: (isMobile || isCompact) ? "1.25rem" : "4.5rem",
      }}>
        {/* Header with title + close button (top-right, consistent with other submenus) */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: "1.5rem",
        }}>
          <h2 style={{
            fontFamily: F.display, fontSize: isMobile ? "1.125rem" : "1.375rem",
            fontWeight: 500, color: C.inkSoft, margin: 0,
          }}>
            {t("navTitle")}
          </h2>
          <button
            onClick={() => { window.location.href = "/atrium"; }}
            aria-label="Close"
            style={{
              width: "2.75rem", height: "2.75rem",
              borderRadius: "50%", background: C.warmStone,
              display: "flex", alignItems: "center", justifyContent: "center",
              border: `1px solid ${C.cream}`, cursor: "pointer", flexShrink: 0, padding: 0,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* ── Hero: Porter + Title ── */}
        <div style={{
          textAlign: "center",
          marginBottom: "2rem",
          animation: anim(""),
        }}>
          <KepPorterIllustration size={isMobile ? 110 : 140} />
          <h1 style={{
            fontFamily: F.display,
            fontSize: isMobile ? "1.75rem" : "2.25rem",
            fontWeight: 600,
            color: C.inkSoft,
            margin: "0.75rem 0 0.25rem",
            lineHeight: 1.15,
          }}>
            {t("title")}
          </h1>
          <p style={{
            fontFamily: F.display,
            fontSize: "1rem",
            color: C.walnut,
            fontStyle: "italic",
            maxWidth: "28rem",
            margin: "0 auto",
            lineHeight: 1.5,
          }}>
            {t("subtitle")}
          </p>
        </div>

        {/* ── How it works visual ── */}
        <div style={{
          marginBottom: "2rem",
          animation: anim("0.1s "),
          display: "flex", justifyContent: "center",
        }}>
          <KepFlowIllustration roomLabel={t("flowRoomLabel")} />
        </div>

        {/* ── Steps ── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
          gap: "1rem",
          marginBottom: "2rem",
          animation: anim("0.15s "),
        }}>
          {/* Step 1: Save the number */}
          <TuscanCard variant="elevated" padding={isMobile ? "1.25rem" : "1.5rem"}>
            <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
              <StepBadge n={1} />
              <div style={{ flex: 1 }}>
                <h3 style={stepTitle}>{t("quickStep1Title")}</h3>
                <p style={stepDesc}>{t("quickStep1Text")}</p>
                {/* Phone number pill */}
                {waPhone && (
                  <div style={{
                    display: "inline-flex", alignItems: "center",
                    background: `${C.ember}0D`, border: `1.5px solid ${C.ember}35`,
                    borderRadius: "0.625rem", padding: "0.5rem 1rem",
                    marginBottom: "0.75rem",
                  }}>
                    <span style={{
                      fontFamily: F.body, fontSize: isMobile ? "1rem" : "1.125rem",
                      fontWeight: 700, color: C.ink, letterSpacing: "0.03em",
                      fontVariantNumeric: "tabular-nums",
                    }}>
                      {displayPhone}
                    </span>
                  </div>
                )}
                {waPhone && (
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <button onClick={() => downloadVCard(waPhone, t("vcardName"), t("vcardOrg"), t("vcardNote"))} style={btnPrimary}>
                      <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="2" width="14" height="16" rx="2" />
                        <circle cx="10" cy="8" r="2.5" />
                        <path d="M5.5 16c0-2 2-3.5 4.5-3.5s4.5 1.5 4.5 3.5" />
                      </svg>
                      {t("quickStep1Save")}
                    </button>
                    <button onClick={handleCopy} style={{
                      ...btnSecondary,
                      background: copied ? C.sage : C.warmStone,
                      color: copied ? C.cream : C.walnut,
                      borderColor: copied ? C.sage : C.hairline,
                    }}>
                      {copied ? t("quickStep1Copied") : t("quickStep1Copy")}
                    </button>
                  </div>
                )}
                {/* Graceful fallback when the WhatsApp number env var is unset:
                    never render dead CTAs (blank-tab link / broken vCard). */}
                {!waPhone && (
                  <p style={{
                    fontFamily: F.body, fontSize: "0.8125rem", color: C.muted,
                    fontStyle: "italic", margin: "0.25rem 0 0", lineHeight: 1.5,
                  }}>
                    {t("unavailable")}
                  </p>
                )}
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
                {waPhone && (
                  <a href={waLink} target="_blank" rel="noopener noreferrer" style={btnWhatsApp}>
                    <WhatsAppIcon size={16} />
                    {t("quickStep2Button")}
                  </a>
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
                  {["ROOM Kitchen", "NEW Holidays", "ROOMS"].map((cmd) => (
                    <code key={cmd} style={{
                      fontFamily: MONO, fontSize: "0.75rem", fontWeight: 600,
                      color: C.walnut, background: C.linen,
                      padding: "0.25rem 0.5rem", borderRadius: "0.25rem",
                      border: `1px solid ${C.hairline}`,
                    }}>
                      {cmd}
                    </code>
                  ))}
                </div>
                <p style={{
                  fontFamily: F.body, fontSize: "0.6875rem", color: C.muted,
                  fontStyle: "italic", margin: "0.5rem 0 0",
                }}>
                  {t("commandsAreEnglish")}
                </p>
              </div>
            </div>
          </TuscanCard>
        </div>

        {/* ── Settings link ── */}
        <TuscanCard
          variant="glass"
          padding={isMobile ? "1rem" : "1.25rem"}
          style={{
            marginBottom: "1.5rem",
            animation: anim("0.25s "),
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
            <div style={{
              width: "2.25rem", height: "2.25rem", borderRadius: "50%",
              background: `${C.sage}18`, display: "flex",
              alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.sage} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <polyline points="9 12 11 14 15 10" />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: F.body, fontSize: "0.8125rem", color: C.inkSoft, lineHeight: 1.5, margin: 0 }}>
                {t("settingsHint")}
              </p>
              <button
                onClick={() => router.push("/settings/connections")}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontFamily: F.body, fontSize: "0.8125rem", fontWeight: 600,
                  color: C.ember, padding: "0.125rem 0 0", textDecoration: "underline",
                  textUnderlineOffset: "0.1875rem",
                }}
              >
                {t("settingsLink")}
              </button>
            </div>
          </div>
        </TuscanCard>

        {/* ── Commands tip ── */}
        <p style={{
          fontFamily: F.body, fontSize: "0.75rem", color: C.muted,
          textAlign: "center", fontStyle: "italic",
          animation: anim("0.3s "),
        }}>
          {t("commandsHint")}
        </p>
      </div>

      {/* Mobile NavigationBar */}
      {isMobile && (
        <NavigationBar
          currentMode="atrium"
          onModeChange={handleModeChange}
          onNotifications={() => router.push("/palace?notifications=1")}
          isMobile={true}
          activeTab={null}
        />
      )}
    </div>
  );
}

/* ───── Shared styles ───── */

const stepTitle: React.CSSProperties = {
  fontFamily: F.display, fontSize: "1rem", fontWeight: 600,
  color: C.inkSoft, margin: "0 0 0.25rem",
};

const stepDesc: React.CSSProperties = {
  fontFamily: F.body, fontSize: "0.875rem", color: C.inkSoft,
  lineHeight: 1.6, margin: "0 0 0.625rem",
};

const btnPrimary: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.375rem",
  background: C.ember, color: C.cream,
  border: "none", borderRadius: "0.5rem",
  padding: "0.4375rem 1rem", minHeight: "2.75rem", fontSize: "0.8125rem",
  fontWeight: 600, cursor: "pointer", fontFamily: F.body,
};

const btnSecondary: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  border: "1px solid",
  borderRadius: "0.5rem", padding: "0.4375rem 1rem", minHeight: "2.75rem",
  fontSize: "0.8125rem", cursor: "pointer",
  fontWeight: 500, fontFamily: F.body,
  background: C.warmStone, color: C.walnut,
  transition: `all 0.2s ${EASE}`,
};

const btnWhatsApp: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
  background: "#25D366", color: "#fff",
  padding: "0.4375rem 1rem", minHeight: "2.75rem", borderRadius: "0.5rem",
  fontSize: "0.8125rem", fontWeight: 600, textDecoration: "none",
  fontFamily: F.body,
};

/* ───── Step Badge ───── */

function StepBadge({ n }: { n: number }) {
  return (
    <div style={{
      width: "2rem", height: "2rem", borderRadius: "50%",
      background: `linear-gradient(135deg, ${C.ember}, ${C.ember}D0)`,
      color: C.cream,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: F.display, fontSize: "0.875rem", fontWeight: 700,
      flexShrink: 0, marginTop: "0.125rem",
      boxShadow: `0 0.125rem 0.5rem ${C.ember}30`,
    }}>
      {n}
    </div>
  );
}
