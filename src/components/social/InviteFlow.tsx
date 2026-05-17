"use client";

import React, { useState, useEffect } from "react";
import { T } from "@/lib/theme";
import TuscanCard from "@/components/ui/TuscanCard";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { track } from "@/lib/analytics";

interface InviteFlowProps {
  referralCode: string;
  targetUrl?: string;
  onClose: () => void;
}

export default function InviteFlow({
  referralCode,
  targetUrl,
  onClose,
}: InviteFlowProps) {
  const { t } = useTranslation("social");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const siteUrl = typeof window !== "undefined" ? window.location.origin : "";
  const baseUrl = targetUrl || siteUrl;
  const inviteUrl = `${baseUrl}?ref=${encodeURIComponent(referralCode)}`;

  const fullMessage = message
    ? `${message}\n\n${inviteUrl}`
    : inviteUrl;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      track("social_invite_copy", { hasMessage: !!message });
    } catch {
      // Fallback
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: t("inviteShareTitle"),
          text: message || undefined,
          url: inviteUrl,
        });
        track("social_invite_share", { method: "native" });
      } catch {
        // User cancelled
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-title"
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
        style={{ width: "min(28rem, 90vw)" }}
      >
        <h2
          id="invite-title"
          style={{
            fontFamily: T.font.display,
            fontSize: "1.5rem",
            fontWeight: 600,
            color: T.color.charcoal,
            margin: "0 0 0.25rem",
          }}
        >
          {t("inviteTitle")}
        </h2>
        <p
          style={{
            fontFamily: T.font.body,
            fontSize: "0.875rem",
            color: T.color.muted,
            margin: "0 0 1.5rem",
          }}
        >
          {t("inviteSubtitle")}
        </p>

        {/* Personal message */}
        <label
          htmlFor="invite-message"
          style={{
            fontFamily: T.font.body,
            fontSize: "0.8125rem",
            fontWeight: 600,
            color: T.color.charcoal,
            display: "block",
            marginBottom: "0.375rem",
          }}
        >
          {t("personalMessage")}
        </label>
        <textarea
          id="invite-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder={t("inviteMessagePlaceholder")}
          style={{
            width: "100%",
            fontFamily: T.font.body,
            fontSize: "0.875rem",
            padding: "0.625rem 0.875rem",
            borderRadius: "0.625rem",
            border: `1px solid ${T.color.sandstone}`,
            background: T.color.cream,
            color: T.color.charcoal,
            resize: "vertical",
            outline: "none",
            boxSizing: "border-box",
          }}
        />

        {/* Preview */}
        <div
          style={{
            marginTop: "1rem",
            padding: "0.75rem",
            borderRadius: "0.5rem",
            background: T.color.linen,
            fontFamily: T.font.body,
            fontSize: "0.8125rem",
            color: T.color.inkSoft,
            wordBreak: "break-all",
            lineHeight: 1.5,
            whiteSpace: "pre-wrap",
          }}
        >
          {fullMessage}
        </div>

        {/* Actions */}
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            marginTop: "1.5rem",
          }}
        >
          <button
            onClick={handleCopy}
            style={{
              flex: 1,
              fontFamily: T.font.body,
              fontSize: "0.875rem",
              fontWeight: 500,
              padding: "0.75rem",
              borderRadius: "0.625rem",
              border: `1px solid ${T.color.sandstone}`,
              background: "transparent",
              color: copied ? T.color.success : T.color.walnut,
              cursor: "pointer",
              transition: "color 0.2s",
            }}
          >
            {copied ? t("copied") : t("copyLink")}
          </button>
          <button
            onClick={handleShare}
            style={{
              flex: 1,
              fontFamily: T.font.body,
              fontSize: "0.875rem",
              fontWeight: 600,
              padding: "0.75rem",
              borderRadius: "0.625rem",
              border: "none",
              background: `linear-gradient(135deg, ${T.color.gold}, ${T.color.goldDark})`,
              color: T.color.cream,
              cursor: "pointer",
            }}
          >
            {t("share")}
          </button>
        </div>

        <button
          onClick={onClose}
          style={{
            width: "100%",
            fontFamily: T.font.body,
            fontSize: "0.8125rem",
            color: T.color.muted,
            background: "none",
            border: "none",
            cursor: "pointer",
            marginTop: "0.75rem",
            padding: "0.5rem",
          }}
        >
          {t("close")}
        </button>
      </TuscanCard>
    </div>
  );
}
