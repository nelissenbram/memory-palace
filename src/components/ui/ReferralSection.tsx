"use client";

/**
 * ReferralSection — the self-contained "Refer a friend" card (overline +
 * referral code, copy/share/invite actions, earned-rewards list), extracted
 * from settings/subscription so it can render on BOTH the Subscription and
 * Sharing settings pages ("mensen zoeken onder Subscription én onder Sharing").
 *
 * Fully self-contained: it fetches /api/referral itself, carries its own toast
 * + InviteFlow state, and keeps the iOS gate INSIDE the component — rewards are
 * web/Stripe promo codes that can't apply to Apple IAP, so surfacing them on
 * iOS steers off-platform (Apple Guideline 3.1.1). On iOS (or while no
 * referral code exists) it renders nothing at all.
 *
 * i18n: same "subscription" section keys as the original inline block.
 */

import { useState, useEffect, useCallback, type CSSProperties } from "react";
import { T } from "@/lib/theme";
import { isIOS } from "@/lib/native/platform";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { INK, MUTED, HAIRLINE, EMBER, EMBER_GLYPH, CREAM, TRAY, SAGE, SHADOW, TOP_HIGHLIGHT } from "@/lib/libraryTokens";
import Toast, { type ToastData } from "@/components/ui/Toast";
import InviteFlow from "@/components/social/InviteFlow";
import { SectionOverline } from "@/app/(app)/settings/_SettingsChrome";

const F = T.font;

/* Same named locals as the subscription surface (see its EMBER_GLYPH_RGB note)
 * so the card chrome stays pixel-identical on both render sites. */
const EMBER_GLYPH_RGB = "154,79,42";
const EMBER_GLYPH_TINT = `rgba(${EMBER_GLYPH_RGB},0.07)`;
const EMBER_GLYPH_TINT_12 = `rgba(${EMBER_GLYPH_RGB},0.12)`;
const CARD_SHADOW = `${SHADOW[1]}, ${TOP_HIGHLIGHT}`;
const EMBER_GRADIENT = `linear-gradient(135deg, ${EMBER}, ${EMBER_GLYPH})`;

/* Canon ember CTA base (never disabled inside this card). */
const emberCta: CSSProperties = {
  minHeight: "2.75rem",
  padding: "0.75rem 1.5rem",
  borderRadius: "0.75rem",
  border: "none",
  background: EMBER_GRADIENT,
  fontFamily: F.body,
  fontSize: "0.875rem",
  fontWeight: 600,
  color: CREAM,
  cursor: "pointer",
  transition: "all .15s",
};

interface ReferralReward {
  promo_code: string;
  created_at: string;
  redeemed: boolean;
}

export default function ReferralSection({ overlineStyle }: {
  /** Lets each settings page keep its own section-overline spacing grammar. */
  overlineStyle?: CSSProperties;
}) {
  const { t } = useTranslation("subscription");
  const isApple = isIOS();
  const isMobile = useIsMobile();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralCount, setReferralCount] = useState(0);
  const [referralRewards, setReferralRewards] = useState<ReferralReward[]>([]);
  const [showInviteFlow, setShowInviteFlow] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
  }, []);

  // i18n fallback helper — new keys work before the locale files land.
  const tf = (key: string, fallback: string) => {
    const v = t(key);
    return v === key ? fallback : v;
  };

  useEffect(() => {
    // Never fetch on iOS — the section is sealed there (Apple 3.1.1).
    if (isApple) return;
    let cancelled = false;
    (async () => {
      try {
        const refRes = await fetch("/api/referral");
        if (refRes.ok) {
          const refData = await refRes.json();
          if (cancelled) return;
          setReferralCode(refData.referralCode);
          setReferralCount(refData.referralCount ?? 0);
          setReferralRewards(refData.rewards ?? []);
        }
      } catch {
        // non-critical — the section simply doesn't render
      }
    })();
    return () => { cancelled = true; };
  }, [isApple]);

  // Hidden on iOS: rewards are web/Stripe promo codes that can't apply to
  // Apple IAP, so surfacing them on iOS steers off-platform (3.1.1).
  if (!referralCode || isApple) return null;

  return (
    <div className="mp-refer-section">
      {toast && (
        <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
      )}

      <SectionOverline label={tf("sectionReferFriend", "Refer a friend")} style={overlineStyle} />
      <div style={{
        background: CREAM,
        borderRadius: "1rem",
        border: `0.0625rem solid ${HAIRLINE}`,
        padding: "1.75rem 2rem",
        boxShadow: CARD_SHADOW,
        marginBottom: "1.5rem",
      }}>
        <h3 style={{
          fontFamily: F.display, fontSize: "1.25rem", fontWeight: 500,
          color: INK, margin: "0 0 0.375rem",
        }}>
          {t("referralTitle")}
        </h3>
        <p style={{
          fontFamily: F.body, fontSize: "0.875rem", color: MUTED,
          margin: "0 0 1.25rem", lineHeight: 1.5,
        }}>
          {t("referralDesc")}
        </p>

        {/* Referral code display */}
        <div style={{
          display: "flex", alignItems: "center", gap: "0.75rem",
          flexWrap: "wrap", marginBottom: "1rem",
        }}>
          <div>
            <div style={{
              fontFamily: F.body, fontSize: "0.6875rem", fontWeight: 700,
              color: MUTED, textTransform: "uppercase", letterSpacing: "0.12em",
              marginBottom: "0.25rem",
            }}>
              {t("referralCode")}
            </div>
            <div style={{
              fontFamily: "monospace", fontSize: "1.25rem", fontWeight: 700,
              color: INK, letterSpacing: "0.125rem",
              padding: "0.5rem 1rem",
              background: CREAM,
              borderRadius: "0.5rem",
              border: `0.0625rem solid ${HAIRLINE}`,
              userSelect: "all",
            }}>
              {referralCode}
            </div>
          </div>

          <div style={{
            fontFamily: F.body, fontSize: "0.875rem", color: MUTED,
            padding: "0.5rem 0.75rem",
            background: "rgba(86,104,60,0.08)",
            borderRadius: "0.5rem",
          }}>
            {t("referralCount", { count: String(referralCount) })}
          </div>
        </div>

        {/* Share actions */}
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button
            onClick={() => {
              const link = `https://thememorypalace.ai/register?ref=${referralCode}`;
              navigator.clipboard.writeText(link).then(() => {
                showToast(t("referralCopied"), "success");
              });
            }}
            className="mp-refer-secondary"
            style={{
              minHeight: "2.75rem",
              padding: "0.75rem 1.5rem",
              borderRadius: "0.75rem",
              border: `0.0625rem solid ${HAIRLINE}`,
              background: "transparent",
              fontFamily: F.body, fontSize: "0.875rem", fontWeight: 500,
              color: MUTED,
              cursor: "pointer",
              transition: "all .15s",
              display: "flex", alignItems: "center", gap: "0.5rem",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="9" y="9" width="13" height="13" rx="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            {t("copyLink")}
          </button>

          {typeof navigator !== "undefined" && "share" in navigator && (
            <button
              className="mp-refer-primary"
              onClick={() => {
                const link = `https://thememorypalace.ai/register?ref=${referralCode}`;
                navigator.share({
                  title: "The Memory Palace",
                  text: t("referralDesc"),
                  url: link,
                }).catch(() => {});
              }}
              style={{
                ...emberCta,
                display: "flex", alignItems: "center", gap: "0.5rem",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="18" cy="5" r="3"/>
                <circle cx="6" cy="12" r="3"/>
                <circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
              {t("referralShare")}
            </button>
          )}

          <button
            onClick={() => setShowInviteFlow(true)}
            className="mp-refer-secondary"
            style={{
              minHeight: "2.75rem",
              padding: "0.75rem 1.5rem",
              borderRadius: "0.75rem",
              border: `0.0625rem solid ${HAIRLINE}`,
              background: "transparent",
              fontFamily: F.body, fontSize: "0.875rem", fontWeight: 500,
              color: MUTED,
              cursor: "pointer",
              transition: "all .15s",
              display: "flex", alignItems: "center", gap: "0.5rem",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <line x1="19" y1="8" x2="19" y2="14"/>
              <line x1="22" y1="11" x2="16" y2="11"/>
            </svg>
            {t("inviteFriends")}
          </button>
        </div>

        {showInviteFlow && referralCode && (
          <InviteFlow
            referralCode={referralCode}
            targetUrl="https://thememorypalace.ai/register"
            onClose={() => setShowInviteFlow(false)}
          />
        )}

        {/* Earned Rewards */}
        {referralRewards.length > 0 && (
          <div style={{ marginTop: "1.5rem" }}>
            <h4 style={{
              fontFamily: F.display, fontSize: "1rem", fontWeight: 500,
              color: INK, margin: "0 0 0.75rem",
            }}>
              {t("referralRewardsTitle")}
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {referralRewards.map((reward) => (
                <div
                  key={reward.promo_code}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.75rem 1rem",
                    borderRadius: "0.625rem",
                    background: reward.redeemed ? TRAY : "rgba(86,104,60,0.07)",
                    border: `0.0625rem solid ${reward.redeemed ? "rgba(227,214,188,0.7)" : "rgba(86,104,60,0.25)"}`,
                    flexWrap: "wrap",
                    gap: "0.5rem",
                  }}
                >
                  <div>
                    <div style={{
                      fontFamily: "monospace",
                      fontSize: "0.9375rem",
                      fontWeight: 700,
                      color: reward.redeemed ? MUTED : INK,
                      letterSpacing: "0.0625rem",
                      textDecoration: reward.redeemed ? "line-through" : "none",
                    }}>
                      {reward.promo_code}
                    </div>
                    <div style={{
                      fontFamily: F.body,
                      fontSize: isMobile ? "0.8125rem" : "0.75rem",
                      color: MUTED,
                      marginTop: "0.125rem",
                    }}>
                      {t("referralRewardHint")}
                    </div>
                  </div>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}>
                    <span style={{
                      fontFamily: F.body,
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      padding: "0.25rem 0.5rem",
                      borderRadius: "0.375rem",
                      background: reward.redeemed ? "rgba(113,106,94,0.12)" : "rgba(86,104,60,0.12)",
                      color: reward.redeemed ? MUTED : SAGE,
                    }}>
                      {reward.redeemed ? t("referralRewardRedeemed") : t("referralRewardStatus")}
                    </span>
                    {!reward.redeemed && (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(reward.promo_code).then(() => {
                            showToast(t("referralCopied"), "success");
                          });
                        }}
                        className="mp-refer-secondary"
                        style={{
                          minHeight: "2.75rem",
                          padding: "0.375rem 0.75rem",
                          borderRadius: "0.375rem",
                          border: `0.0625rem solid ${HAIRLINE}`,
                          background: "transparent",
                          fontFamily: F.body,
                          fontSize: "0.75rem",
                          fontWeight: 500,
                          color: MUTED,
                          cursor: "pointer",
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ verticalAlign: "middle", marginRight: "0.25rem" }}>
                          <rect x="9" y="9" width="13" height="13" rx="2"/>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                        {t("copy")}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Canon hover / focus / reduced-motion states (style-only) — component-
          scoped so the card behaves identically on every page that renders it. */}
      <style>{`
        @media (hover: hover) {
          .mp-refer-secondary:hover { background: ${EMBER_GLYPH_TINT} !important; }
          .mp-refer-primary:hover { filter: brightness(1.06); }
        }
        .mp-refer-secondary:active { background: ${EMBER_GLYPH_TINT_12} !important; }
        .mp-refer-primary:active { filter: brightness(0.96); }
        .mp-refer-section button:focus-visible {
          outline: 0.1875rem solid #D4AF37;
          outline-offset: 0.125rem;
        }
        @media (prefers-reduced-motion: reduce) {
          .mp-refer-section * { transition: none !important; animation: none !important; }
        }
      `}</style>
    </div>
  );
}
