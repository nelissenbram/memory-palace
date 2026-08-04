"use client";

import React, { useState, useTransition, useRef, useEffect } from "react";
import { T } from "@/lib/theme";
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
  const autoRan = useRef(false);

  const runValidate = (rawCode: string) => {
    const value = rawCode.trim();
    if (!value) return;
    startTransition(async () => {
      setError(null);
      const result = await validatePasscode(value);
      if (!result.ok) {
        // validatePasscode returns a stable error CODE, not prose, so every
        // locale renders localized copy (previously it always returned raw
        // English, which won over the t() fallback for nl/de/es/fr users).
        const errorKey: Record<string, string> = {
          required: "passcodeRequired",
          invalid: "passcodeInvalid",
          expired: "passcodeExpired",
          rateLimited: "passcodeRateLimited",
        };
        setError(t(errorKey[result.error ?? "invalid"] ?? "passcodeInvalid"));
        return;
      }
      setValidatedShare(result.share!);
      track("passcode_validated", {
        hasWing: !!result.share?.wingId,
        hasRoom: !!result.share?.roomId,
      });
    });
  };

  useEffect(() => {
    // Pre-fill + auto-validate from a shared link (/passcode?code=ABC123) so a
    // recipient who clicks "copy share link" lands on a working gate instead of
    // an empty field. Guarded to run once so we don't re-hit the rate limiter.
    if (autoRan.current) return;
    let urlCode: string | null = null;
    try {
      urlCode = new URLSearchParams(window.location.search).get("code");
    } catch { /* SSR / malformed URL — fall through to manual entry */ }
    if (urlCode) {
      autoRan.current = true;
      const normalized = urlCode.toUpperCase().trim();
      setCode(normalized);
      runValidate(normalized);
    } else {
      inputRef.current?.focus();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runValidate(code);
  };

  const handleVisit = () => {
    if (!validatedShare) return;
    // Stash the signed passcode-access token so the gallery can present it to
    // the API route. scope='passcode' shares are NOT served by slug alone — the
    // token proves the passcode was entered. sessionStorage keeps it out of the
    // URL / server logs.
    try {
      sessionStorage.setItem(`mp_passcode_token:${validatedShare.slug}`, validatedShare.accessToken);
    } catch {
      /* private mode / storage disabled — fall through; API returns 401 */
    }
    const url = `/public/${validatedShare.slug}`;
    window.location.href = url;
  };

  return (
    <div style={wrapperStyle}>
      {/* Real CSS :focus-visible ring (gold) — keyboard users get a ring, mouse
          users don't, without the old JS onFocus/onBlur border juggling. No
          @media queries here, so this stays canon-compliant. */}
      <style
        dangerouslySetInnerHTML={{
          __html: `.mp-passcode-input:focus-visible{border-color:${T.color.gold};outline:0.1875rem solid ${T.color.gold}55;outline-offset:0.125rem;}`,
        }}
      />

      {/* Decorative blobs — identical to the shared (auth) layout so the passcode
          gate reads as a sibling of /login and /reset-password. */}
      <div aria-hidden="true" style={blobTopStyle} />
      <div aria-hidden="true" style={blobBottomStyle} />

      {/* Blurred cream auth card (matches src/app/(auth)/layout.tsx exactly). */}
      <main id="main-content" style={cardStyle}>
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
              color: T.color.ink,
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
                  color: T.color.ink,
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
            <button onClick={handleVisit} style={ctaButtonStyle}>
              {t("passcodeEnterPalace")}
            </button>
          </div>
        ) : (
          /* ── Passcode input form ── */
          <form onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              className="mp-passcode-input"
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
                // Source Sans body family to match the auth shell; a modest
                // tracking + centered caps still reads as a passcode field
                // without the old monospace 1.5rem divergence.
                fontFamily: T.font.body,
                fontSize: "1.125rem",
                fontWeight: 600,
                letterSpacing: "0.2rem",
                padding: "0.8125rem 1rem",
                borderRadius: "0.625rem",
                border: `1.5px solid ${error ? T.color.error : T.color.sandstone}`,
                background: T.color.white,
                color: T.color.ink,
                textAlign: "center",
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.2s ease",
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
                ...ctaButtonStyle,
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
      </main>
    </div>
  );
}

// Chrome mirrors src/app/(auth)/layout.tsx exactly (canon CREAM→warmStone
// gradient, blurred cream card, HAIRLINE border, warm-ink shadow) so the
// passcode gate is a pixel-sibling of the login / reset-password surfaces.
const wrapperStyle: React.CSSProperties = {
  minHeight: "100dvh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "linear-gradient(165deg, #FCFAF5 0%, #F2EDE4 50%, #E5DDD0 100%)",
  fontFamily: T.font.body,
  position: "relative",
  overflowX: "hidden",
  overflowY: "auto",
  WebkitOverflowScrolling: "touch",
  padding: "1rem",
  paddingBottom: "max(1.5rem, env(safe-area-inset-bottom, 0px))",
};

const cardStyle: React.CSSProperties = {
  width: "min(27.5rem, 92vw)",
  padding: "2.5rem 2.25rem",
  background: "rgba(252,250,245,0.85)",
  backdropFilter: "blur(20px)",
  borderRadius: "1.25rem",
  border: `1px solid ${T.color.hairline}`,
  boxShadow: "0 0.5rem 1.5rem rgba(64,59,54,0.14)",
  position: "relative",
  zIndex: 1,
  margin: "1.25rem",
};

const blobTopStyle: React.CSSProperties = {
  position: "absolute",
  width: 400,
  height: 400,
  borderRadius: "50%",
  background: "radial-gradient(circle, rgba(198,107,61,0.08) 0%, transparent 70%)",
  top: -100,
  right: -100,
  pointerEvents: "none",
};

const blobBottomStyle: React.CSSProperties = {
  position: "absolute",
  width: 300,
  height: 300,
  borderRadius: "50%",
  background: "radial-gradient(circle, rgba(74,103,65,0.06) 0%, transparent 70%)",
  bottom: -80,
  left: -80,
  pointerEvents: "none",
};

// EMBER primary CTA — matches the auth-shell button grammar.
const ctaButtonStyle: React.CSSProperties = {
  width: "100%",
  fontFamily: T.font.body,
  fontSize: "1rem",
  fontWeight: 600,
  padding: "0.875rem",
  borderRadius: "0.75rem",
  border: "none",
  background: `linear-gradient(135deg, ${T.color.ember}, ${T.color.walnut})`,
  color: T.color.cream,
  cursor: "pointer",
};
