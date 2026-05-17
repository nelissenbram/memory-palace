"use client";

import React, { useEffect, useRef, useState } from "react";
import { T } from "@/lib/theme";
import TuscanCard from "@/components/ui/TuscanCard";
import { useTranslation } from "@/lib/hooks/useTranslation";

interface QRShareModalProps {
  url: string;
  title: string;
  onClose: () => void;
}

export default function QRShareModal({ url, title, onClose }: QRShareModalProps) {
  const { t } = useTranslation("social");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrReady, setQrReady] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function generate() {
      try {
        const QRCode = (await import("qrcode")).default;
        if (cancelled || !canvasRef.current) return;

        await QRCode.toCanvas(canvasRef.current, url, {
          width: 256,
          margin: 2,
          color: {
            dark: T.color.charcoal,
            light: T.color.cream,
          },
        });
        setQrReady(true);
      } catch {
        if (!cancelled) setQrError(t("qrError"));
      }
    }

    generate();
    return () => {
      cancelled = true;
    };
  }, [url]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `memory-palace-${title.replace(/\s+/g, "-").toLowerCase()}.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select text
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(0.25rem)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <TuscanCard
        variant="solid"
        padding="2rem"
        style={{ width: "min(22rem, 90vw)", textAlign: "center" }}
      >
        <h2
          id="qr-title"
          style={{
            fontFamily: T.font.display,
            fontSize: "1.375rem",
            fontWeight: 600,
            color: T.color.charcoal,
            margin: "0 0 0.25rem",
          }}
        >
          {t("shareQR")}
        </h2>
        <p
          style={{
            fontFamily: T.font.body,
            fontSize: "0.875rem",
            color: T.color.muted,
            margin: "0 0 1.25rem",
          }}
        >
          {title}
        </p>

        {/* QR Canvas */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "1rem",
            background: T.color.cream,
            borderRadius: "0.75rem",
            border: `1px solid ${T.color.lineFaint}`,
            marginBottom: "1.25rem",
          }}
        >
          <canvas
            ref={canvasRef}
            aria-label={t("shareQR")}
            style={{
              maxWidth: "100%",
              height: "auto",
              opacity: qrReady ? 1 : 0.3,
              transition: "opacity 0.3s",
            }}
          />
        </div>

        {qrError && (
          <p
            style={{
              fontFamily: T.font.body,
              fontSize: "0.8125rem",
              color: T.color.error,
              margin: "0 0 0.75rem",
            }}
          >
            {qrError}
          </p>
        )}

        {/* URL display */}
        <div
          style={{
            fontFamily: T.font.body,
            fontSize: "0.75rem",
            color: T.color.muted,
            background: T.color.linen,
            padding: "0.5rem 0.75rem",
            borderRadius: "0.375rem",
            wordBreak: "break-all",
            marginBottom: "1rem",
          }}
        >
          {url}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={handleCopyLink}
            style={{
              flex: 1,
              fontFamily: T.font.body,
              fontSize: "0.8125rem",
              fontWeight: 500,
              padding: "0.625rem",
              borderRadius: "0.625rem",
              border: `1px solid ${T.color.sandstone}`,
              background: "transparent",
              color: T.color.walnut,
              cursor: "pointer",
            }}
          >
            {copied ? t("copied") : t("copyLink")}
          </button>
          <button
            onClick={handleDownload}
            disabled={!qrReady}
            style={{
              flex: 1,
              fontFamily: T.font.body,
              fontSize: "0.8125rem",
              fontWeight: 600,
              padding: "0.625rem",
              borderRadius: "0.625rem",
              border: "none",
              background: `linear-gradient(135deg, ${T.color.gold}, ${T.color.goldDark})`,
              color: T.color.cream,
              cursor: qrReady ? "pointer" : "not-allowed",
              opacity: qrReady ? 1 : 0.5,
            }}
          >
            {t("downloadQR")}
          </button>
        </div>

        <button
          onClick={onClose}
          style={{
            fontFamily: T.font.body,
            fontSize: "0.8125rem",
            color: T.color.muted,
            background: "none",
            border: "none",
            cursor: "pointer",
            marginTop: "1rem",
          }}
        >
          {t("close")}
        </button>
      </TuscanCard>
    </div>
  );
}
