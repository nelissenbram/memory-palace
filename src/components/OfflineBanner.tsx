"use client";

import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useOfflineSync } from "@/lib/hooks/useOfflineSync";

export default function OfflineBanner() {
  const { t } = useTranslation("offlineBanner");
  const { isOnline, isSyncing, syncProgress, queueCount } = useOfflineSync();

  if (isOnline && !isSyncing && queueCount === 0) return null;

  const bannerBg = !isOnline
    ? "#5C4033"
    : isSyncing
      ? "#3D6B4F"
      : "#6B5B3D";
  const bannerText = "#FAFAF7";

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: bannerBg,
        color: bannerText,
        fontFamily: T.font.body,
        fontSize: 13,
        fontWeight: 500,
        padding: "8px 16px",
        textAlign: "center",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        animation: "slideDown .3s ease",
      }}
    >
      <style>{`@keyframes slideDown{from{transform:translateY(-100%)}to{transform:translateY(0)}}`}</style>

      {!isOnline && (
        <>
          <span
            style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: 4,
              background: "#E8A87C",
            }}
          />
          {t("offline")}
          {queueCount > 0 && (
            <span style={{ opacity: 0.7, fontSize: 11 }}>
              ({t("pending", { count: String(queueCount) })})
            </span>
          )}
        </>
      )}

      {isOnline && isSyncing && syncProgress && (
        <>
          <span
            style={{
              display: "inline-block",
              width: 14,
              height: 14,
              border: "2px solid transparent",
              borderTopColor: bannerText,
              borderRadius: "50%",
              animation: "spin .6s linear infinite",
            }}
          />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          {t("syncing", { done: String(syncProgress.done), total: String(syncProgress.total) })}
        </>
      )}

      {isOnline && !isSyncing && queueCount > 0 && (
        <>
          <span
            style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: 4,
              background: "#E8A87C",
            }}
          />
          {queueCount > 1 ? t("waitingPlural", { count: String(queueCount) }) : t("waitingSingular", { count: String(queueCount) })}
        </>
      )}
    </div>
  );
}
