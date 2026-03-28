"use client";

import { useState, useEffect, useRef } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PWAInstallBanner() {
  const { t } = useTranslation("pwa");
  const [show, setShow] = useState(false);
  const [hasPrompt, setHasPrompt] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Don't show if already installed (standalone mode)
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    // Don't show if already dismissed
    if (localStorage.getItem("mp_pwa_dismissed")) return;
    // Only show on mobile/tablet
    if (!/Mobi|Android|iPad|iPhone|iPod/i.test(navigator.userAgent) && navigator.maxTouchPoints <= 1) return;

    const ua = navigator.userAgent;
    const isiOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIsIOS(isiOS);

    // Capture beforeinstallprompt (Android/Chrome)
    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      setHasPrompt(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const t = setTimeout(() => setShow(true), 2500);

    return () => {
      clearTimeout(t);
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt.current) {
      // Native install prompt available — trigger it directly
      await deferredPrompt.current.prompt();
      const { outcome } = await deferredPrompt.current.userChoice;
      if (outcome === "accepted") {
        setShow(false);
        localStorage.setItem("mp_pwa_dismissed", "1");
      }
      deferredPrompt.current = null;
      setHasPrompt(false);
    } else {
      // No native prompt — show manual instructions
      setShowInstructions(true);
    }
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem("mp_pwa_dismissed", "1");
  };

  if (!show) return null;

  return (
    <div style={{
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 9999,
      animation: "slideUp .4s ease",
    }}>
      <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
      <div style={{
        margin: "0 auto",
        maxWidth: 480,
        padding: "0 0.75rem 0.75rem",
      }}>
        <div style={{
          background: `linear-gradient(135deg, ${T.color.charcoal}, #3A3632)`,
          borderRadius: "1.125rem",
          padding: "1.125rem 1.25rem",
          boxShadow: "0 -4px 30px rgba(0,0,0,.25)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
            {/* App icon */}
            <div style={{
              width: "3.25rem", height: "3.25rem", borderRadius: "0.875rem",
              background: `linear-gradient(135deg, ${T.color.terracotta}, ${T.color.walnut})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.625rem", flexShrink: 0,
            }}>
              {"\u{1F3DB}\uFE0F"}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: T.font.display, fontSize: "1rem", fontWeight: 600,
                color: "#FFFFFF", marginBottom: 2,
              }}>
                {t("title")}
              </div>
              <div style={{
                fontFamily: T.font.body, fontSize: "0.75rem", color: "#BBAEA0",
              }}>
                {t("subtitle")}
              </div>
            </div>

            {/* Always show Install button */}
            <button onClick={handleInstall} style={{
              padding: "0.75rem 1.375rem",
              borderRadius: "0.875rem",
              border: "none",
              background: `linear-gradient(135deg, ${T.color.terracotta}, ${T.color.walnut})`,
              color: "#FFF",
              fontFamily: T.font.body,
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: "pointer",
              minHeight: "3rem",
              flexShrink: 0,
              boxShadow: `0 4px 16px ${T.color.terracotta}60`,
            }}>
              {t("install")}
            </button>

            {/* Small dismiss X */}
            <button onClick={handleDismiss} style={{
              width: "1.75rem", height: "1.75rem",
              borderRadius: "0.875rem",
              border: "none",
              background: "rgba(255,255,255,.1)",
              color: "#9A9183",
              fontSize: "0.875rem",
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              {"\u2715"}
            </button>
          </div>

          {/* Instructions — only show if native prompt not available and user tapped Install */}
          {showInstructions && !hasPrompt && (
            <div style={{
              marginTop: "0.875rem",
              padding: "0.75rem 0.875rem",
              background: "rgba(255,255,255,.08)",
              borderRadius: "0.75rem",
              fontFamily: T.font.body,
              fontSize: "0.8125rem",
              color: "#D4C5B2",
              lineHeight: 1.5,
            }}>
              {isIOS ? (
                <>
                  <strong style={{ color: "#FFF" }}>{t("iosTitle")}</strong><br/>
                  {t("iosStep1a")} <span style={{
                    display: "inline-flex", alignItems: "center",
                    background: "rgba(255,255,255,.15)", borderRadius: 4,
                    padding: "1px 6px", margin: "0 3px", fontSize: 15,
                  }}>{"\u{1F4E4}"}</span> {t("iosStep1b")}<br/>
                  {t("iosStep2a")} <strong style={{ color: "#FFF" }}>{t("iosStep2b")}</strong><br/>
                  {t("iosStep3a")} <strong style={{ color: "#FFF" }}>{t("iosStep3b")}</strong>
                </>
              ) : (
                <>
                  <strong style={{ color: "#FFF" }}>{t("androidTitle")}</strong><br/>
                  {t("androidStep1a")} <strong style={{ color: "#FFF" }}>{"\u22EE"}</strong> {t("androidStep1b")}<br/>
                  {t("androidStep2a")} <strong style={{ color: "#FFF" }}>{t("androidStep2b")}</strong>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
