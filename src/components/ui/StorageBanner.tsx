"use client";

import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useIsSmall } from "@/lib/hooks/useIsMobile";
import { isIOS, isAndroid } from "@/lib/native/platform";
import { IAP_ENABLED } from "@/lib/native/iap-flags";

interface Props {
  storageMb: number;
  limitMb: number;
  onUpgrade: () => void;
}

export default function StorageBanner({ storageMb, limitMb, onUpgrade }: Props) {
  const { t } = useTranslation("palace");
  const isSmall = useIsSmall();
  const pct = limitMb > 0 ? (storageMb / limitMb) * 100 : 0;
  // Android has no in-app purchase path — hide the Upgrade CTA there. iOS shows
  // it only when IAP is live (IAP_ENABLED), leading to the IAP paywall (/pricing).
  // On web it always shows.
  const hideUpgrade = isAndroid() || (isIOS() && !IAP_ENABLED);

  if (pct < 50) return null;

  const level =
    pct >= 100 ? "full" : pct >= 95 ? "urgent" : pct >= 80 ? "warning" : "info";

  // Canon hexes (libraryTokens): MUTED #716A5E, EMBER #B85C38, error C05050.
  const styles: Record<string, { bg: string; border: string; color: string }> = {
    info:    { bg: `${T.color.inkMuted}12`, border: `${T.color.inkMuted}33`, color: T.color.inkMuted },
    warning: { bg: `${T.color.ember}12`, border: `${T.color.ember}33`, color: T.color.ember },
    urgent:  { bg: `${T.color.error}12`, border: `${T.color.error}33`, color: T.color.error },
    full:    { bg: `${T.color.error}18`, border: `${T.color.error}55`, color: T.color.error },
  };

  const s = styles[level];

  // info/warning are polite status; only genuine full/urgent escalation is assertive.
  const isUrgent = level === "urgent" || level === "full";

  const messageKey: Record<string, string> = {
    info: "storageWarning50",
    warning: "storageWarning80",
    urgent: "storageWarning95",
    full: "storageFull",
  };

  // Canon EMBER for the default/warning CTA; escalate to error red only at urgent/full.
  const ctaBg = isUrgent ? T.color.error : T.color.ember;

  return (
    <div
      role={isUrgent ? "alert" : "status"}
      aria-live={isUrgent ? "assertive" : "polite"}
      style={{
        display: "flex",
        flexDirection: isSmall ? "column" : "row",
        alignItems: isSmall ? "stretch" : "center",
        gap: "0.75rem",
        padding: "0.75rem 1rem",
        borderRadius: "1rem",
        background: s.bg,
        border: `0.0625rem solid ${s.border}`,
      }}
    >
      <span
        style={{
          flex: 1,
          fontFamily: T.font.body,
          fontSize: "0.8125rem",
          color: s.color,
          lineHeight: 1.4,
          display: "flex",
          alignItems: "baseline",
          gap: "0.5rem",
        }}
      >
        <span
          style={{
            fontFamily: T.font.display,
            fontSize: "1.125rem",
            fontWeight: 600,
            color: s.color,
          }}
        >
          {Math.round(pct)}%
        </span>
        {t(messageKey[level], {
          used: String(Math.round(storageMb)),
          limit: String(Math.round(limitMb)),
          pct: String(Math.round(pct)),
        })}
      </span>
      {!hideUpgrade && (
        <button
          onClick={onUpgrade}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "0.5rem",
            border: "none",
            background: ctaBg,
            color: T.color.cream,
            fontFamily: T.font.body,
            fontSize: "0.75rem",
            fontWeight: 600,
            cursor: "pointer",
            whiteSpace: "nowrap",
            minWidth: "2.75rem",
            minHeight: "2.75rem",
            transition: "transform .2s ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-0.1875rem)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; }}
          onFocus={(e) => { e.currentTarget.style.outline = "0.1875rem solid #D4AF37"; e.currentTarget.style.outlineOffset = "0.1875rem"; }}
          onBlur={(e) => { e.currentTarget.style.outline = "none"; }}
        >
          {t("upgradeNow")}
        </button>
      )}
    </div>
  );
}
