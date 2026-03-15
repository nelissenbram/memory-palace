"use client";

import { useState, useEffect, useRef } from "react";
import { T } from "@/lib/theme";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PWAInstallBanner() {
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Don't show if already installed (standalone mode)
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    // Don't show if already dismissed
    if (localStorage.getItem("mp_pwa_dismissed")) return;

    // Detect iOS (Safari doesn't fire beforeinstallprompt)
    const ua = navigator.userAgent;
    const isiOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (isiOS) {
      setIsIOS(true);
      // Delay showing on iOS so it doesn't block the landing page
      const t = setTimeout(() => setShow(true), 3000);
      return () => clearTimeout(t);
    }

    // Android/Chrome: capture the beforeinstallprompt event
    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      setTimeout(() => setShow(true), 2000);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt.current) {
      await deferredPrompt.current.prompt();
      const { outcome } = await deferredPrompt.current.userChoice;
      if (outcome === "accepted") {
        setShow(false);
      }
      deferredPrompt.current = null;
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
        padding: "0 12px 12px",
      }}>
        <div style={{
          background: `linear-gradient(135deg, ${T.color.charcoal}, #3A3632)`,
          borderRadius: 18,
          padding: "18px 20px",
          boxShadow: "0 -4px 30px rgba(0,0,0,.25)",
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}>
          {/* App icon */}
          <div style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: `linear-gradient(135deg, ${T.color.terracotta}, ${T.color.walnut})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 26,
            flexShrink: 0,
          }}>
            {"\u{1F3DB}\uFE0F"}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: T.font.display,
              fontSize: 16,
              fontWeight: 600,
              color: "#FFFFFF",
              marginBottom: 2,
            }}>
              Install Memory Palace
            </div>
            {isIOS ? (
              <div style={{
                fontFamily: T.font.body,
                fontSize: 12,
                color: "#BBAEA0",
                lineHeight: 1.4,
              }}>
                Tap <span style={{
                  display: "inline-flex", alignItems: "center",
                  background: "rgba(255,255,255,.15)", borderRadius: 4,
                  padding: "1px 5px", margin: "0 2px", fontSize: 14,
                }}>{"\u{1F4E4}"}</span> then <strong style={{ color: "#E8DDD0" }}>&quot;Add to Home Screen&quot;</strong>
              </div>
            ) : (
              <div style={{
                fontFamily: T.font.body,
                fontSize: 12,
                color: "#BBAEA0",
                lineHeight: 1.3,
              }}>
                Add to your home screen for the full experience
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            {!isIOS && (
              <button onClick={handleInstall} style={{
                padding: "10px 18px",
                borderRadius: 12,
                border: "none",
                background: `linear-gradient(135deg, ${T.color.terracotta}, ${T.color.walnut})`,
                color: "#FFF",
                fontFamily: T.font.body,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                minHeight: 44,
              }}>
                Install
              </button>
            )}
            <button onClick={handleDismiss} style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,.15)",
              background: "transparent",
              color: "#9A9183",
              fontFamily: T.font.body,
              fontSize: 12,
              cursor: "pointer",
              minHeight: 44,
            }}>
              {isIOS ? "Got it" : "Later"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
