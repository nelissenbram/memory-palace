"use client";

import { T } from "@/lib/theme";
import { useOfflineSync } from "@/lib/hooks/useOfflineSync";

export default function OfflineBanner() {
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
          You&apos;re offline &mdash; changes will sync when reconnected
          {queueCount > 0 && (
            <span style={{ opacity: 0.7, fontSize: 11 }}>
              ({queueCount} pending)
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
          Syncing memories... {syncProgress.done}/{syncProgress.total}
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
          {queueCount} memory{queueCount > 1 ? "ies" : ""} waiting to sync
        </>
      )}
    </div>
  );
}
