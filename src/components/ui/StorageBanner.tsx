"use client";

import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { isIOS, isAndroid } from "@/lib/native/platform";

interface Props {
  storageMb: number;
  limitMb: number;
  onUpgrade: () => void;
}

export default function StorageBanner({ storageMb, limitMb, onUpgrade }: Props) {
  const { t } = useTranslation("palace");
  const pct = limitMb > 0 ? (storageMb / limitMb) * 100 : 0;
  // No in-app purchase path in native apps this round, and /pricing redirects
  // native users to /atrium — so an "Upgrade" tap would bounce to the home
  // screen. Show the storage notice without a dead CTA (Apple Guideline 2.1a).
  const nativeApp = isIOS() || isAndroid();

  if (pct < 50) return null;

  const level =
    pct >= 100 ? "full" : pct >= 95 ? "urgent" : pct >= 80 ? "warning" : "info";

  const styles: Record<string, { bg: string; border: string; color: string }> = {
    info:    { bg: `${T.color.muted}12`, border: `${T.color.muted}33`, color: T.color.muted },
    warning: { bg: `${T.color.terracotta}12`, border: `${T.color.terracotta}33`, color: T.color.terracotta },
    urgent:  { bg: `${T.color.error}12`, border: `${T.color.error}33`, color: T.color.error },
    full:    { bg: `${T.color.error}18`, border: `${T.color.error}55`, color: T.color.error },
  };

  const s = styles[level];

  const messageKey: Record<string, string> = {
    info: "storageWarning50",
    warning: "storageWarning80",
    urgent: "storageWarning95",
    full: "storageFull",
  };

  return (
    <div
      role="alert"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        padding: "0.75rem 1rem",
        borderRadius: "0.75rem",
        background: s.bg,
        border: `1px solid ${s.border}`,
      }}
    >
      <span
        style={{
          flex: 1,
          fontFamily: T.font.body,
          fontSize: "0.8125rem",
          color: s.color,
          lineHeight: 1.4,
        }}
      >
        {t(messageKey[level], {
          used: String(Math.round(storageMb)),
          limit: String(Math.round(limitMb)),
          pct: String(Math.round(pct)),
        })}
      </span>
      {!nativeApp && (
        <button
          onClick={onUpgrade}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "0.5rem",
            border: "none",
            background: level === "full"
              ? T.color.error
              : level === "urgent"
              ? T.color.error
              : T.color.terracotta,
            color: "#FFF",
            fontFamily: T.font.body,
            fontSize: "0.75rem",
            fontWeight: 600,
            cursor: "pointer",
            whiteSpace: "nowrap",
            minHeight: "2.25rem",
          }}
        >
          {t("upgradeNow") || "Upgrade"}
        </button>
      )}
    </div>
  );
}
