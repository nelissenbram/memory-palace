"use client";

import React, { useState, useTransition, useRef, useEffect } from "react";
import { T } from "@/lib/theme";
import TuscanCard from "@/components/ui/TuscanCard";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { validatePasscode } from "@/lib/social/passcode-actions";
import type { ValidatedShare } from "@/lib/social/passcode-actions";
import { track } from "@/lib/analytics";

export default function PasscodeEntry() {
  const { t } = useTranslation("social");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [validatedShare, setValidatedShare] = useState<ValidatedShare | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    startTransition(async () => {
      setError(null);
      const result = await validatePasscode(code);
      if (!result.ok) {
        setError(result.error || t("passcodeInvalid"));
        return;
      }
      setValidatedShare(result.share!);
      track("passcode_validated", {
        hasWing: !!result.share?.wingId,
        hasRoom: !!result.share?.roomId,
      });
    });
  };

  const handleVisit = () => {
    if (!validatedShare) return;
    // Navigate to the public share view
    const url = `/public/${validatedShare.slug}`;
    window.location.href = url;
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(165deg, #FAFAF7 0%, #F2EDE7 50%, #D4C5B2 100%)",
        padding: "1rem",
      }}
    >
      <TuscanCard
        variant="solid"
        padding="2.5rem"
        style={{ width: "min(26rem, 92vw)" }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          {/* Lock icon */}
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke={T.color.ember}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ marginBottom: "1rem" }}
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <h1
            style={{
              fontFamily: T.font.display,
              fontSize: "1.75rem",
              fontWeight: 600,
              color: T.color.charcoal,
              margin: "0 0 0.5rem",
            }}
          >
            {t("passcodeEntryTitle")}
          </h1>
          <p
            style={{
              fontFamily: T.font.body,
              fontSize: "0.875rem",
              color: T.color.muted,
              margin: 0,
            }}
          >
            {t("passcodeEntrySubtitle")}
          </p>
        </div>

        {validatedShare ? (
          /* ── Valid passcode result ── */
          <div role="status" aria-live="polite">
            <div
              style={{
                background: `${T.color.success}10`,
                border: `1px solid ${T.color.success}40`,
                borderRadius: "0.75rem",
                padding: "1.25rem",
                textAlign: "center",
                marginBottom: "1.5rem",
              }}
            >
              <p
                style={{
                  fontFamily: T.font.body,
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: T.color.success,
                  margin: "0 0 0.75rem",
                }}
              >
                {t("passcodeValid")}
              </p>
              <p
                style={{
                  fontFamily: T.font.display,
                  fontSize: "1.25rem",
                  fontWeight: 600,
                  color: T.color.charcoal,
                  margin: "0 0 0.25rem",
                }}
              >
                {validatedShare.ownerName}
                {t("passcodePossessive")}
              </p>
              {validatedShare.wingName && (
                <p
                  style={{
                    fontFamily: T.font.body,
                    fontSize: "0.875rem",
                    color: T.color.walnut,
                    margin: "0 0 0.25rem",
                  }}
                >
                  {validatedShare.wingName}
                  {validatedShare.roomName && ` / ${validatedShare.roomName}`}
                </p>
              )}
              {validatedShare.expiresAt && (
                <p
                  style={{
                    fontFamily: T.font.body,
                    fontSize: "0.75rem",
                    color: T.color.muted,
                    margin: "0.5rem 0 0",
                  }}
                >
                  {t("passcodeAccessUntil", {
                    date: new Date(validatedShare.expiresAt).toLocaleString(),
                  })}
                </p>
              )}
            </div>
            <button
              onClick={handleVisit}
              style={{
                width: "100%",
                fontFamily: T.font.body,
                fontSize: "1rem",
                fontWeight: 600,
                padding: "0.875rem",
                borderRadius: "0.625rem",
                border: "none",
                background: `linear-gradient(135deg, ${T.color.terracotta}, ${T.color.walnut})`,
                color: T.color.cream,
                cursor: "pointer",
              }}
            >
              {t("passcodeEnterPalace")}
            </button>
          </div>
        ) : (
          /* ── Passcode input form ── */
          <form onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder={t("passcodePlaceholder")}
              maxLength={20}
              autoComplete="off"
              autoCapitalize="characters"
              enterKeyHint="go"
              spellCheck={false}
              aria-label={t("passcodeEntryTitle")}
              aria-invalid={!!error}
              aria-describedby={error ? "passcode-error" : undefined}
              style={{
                width: "100%",
                fontFamily: "monospace",
                fontSize: "1.5rem",
                fontWeight: 700,
                letterSpacing: "0.25rem",
                padding: "1rem",
                borderRadius: "0.625rem",
                border: `2px solid ${error ? T.color.error : T.color.sandstone}`,
                background: T.color.cream,
                color: T.color.charcoal,
                textAlign: "center",
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.2s ease",
              }}
              onFocus={(e) => {
                if (!error) e.currentTarget.style.borderColor = T.color.gold;
              }}
              onBlur={(e) => {
                if (!error) e.currentTarget.style.borderColor = T.color.sandstone;
              }}
            />

            {error && (
              <p
                id="passcode-error"
                role="alert"
                aria-live="assertive"
                style={{
                  fontFamily: T.font.body,
                  fontSize: "0.8125rem",
                  color: T.color.error,
                  textAlign: "center",
                  margin: "0.75rem 0 0",
                }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isPending || !code.trim()}
              style={{
                width: "100%",
                fontFamily: T.font.body,
                fontSize: "1rem",
                fontWeight: 600,
                padding: "0.875rem",
                borderRadius: "0.625rem",
                border: "none",
                background: `linear-gradient(135deg, ${T.color.terracotta}, ${T.color.walnut})`,
                color: T.color.cream,
                cursor: isPending ? "wait" : "pointer",
                opacity: isPending || !code.trim() ? 0.6 : 1,
                marginTop: "1.25rem",
                transition: "opacity 0.15s ease",
              }}
            >
              {isPending ? t("passcodeValidating") : t("passcodeSubmit")}
            </button>
          </form>
        )}

        {/* Footer link back */}
        <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
          <a
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: T.touch,
              padding: "0.5rem 0.75rem",
              fontFamily: T.font.body,
              fontSize: "0.8125rem",
              color: T.color.walnut,
              textDecoration: "none",
            }}
          >
            {t("passcodeBackHome")}
          </a>
        </div>
      </TuscanCard>
    </div>
  );
}
