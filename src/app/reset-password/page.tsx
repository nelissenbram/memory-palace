"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { updatePassword } from "@/lib/auth/actions";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { T } from "@/lib/theme";
import { createClient } from "@/lib/supabase/client";
import { useIsCompact } from "@/lib/hooks/useIsMobile";
import { useIsPortrait } from "@/lib/hooks/useIsPortrait";

/**
 * Decode the `amr` (authentication methods reference) claim from a Supabase
 * access token WITHOUT any JWT library — we only read a public claim, we do NOT
 * trust it for authorization (the server enforces that). A password-recovery
 * session records a `recovery` method in `amr`; a normal email/OAuth login does
 * not. This lets us tell "user followed a reset link" apart from "user is simply
 * logged in and wandered onto /reset-password".
 */
function tokenHasRecoveryAmr(accessToken: string | undefined): boolean {
  if (!accessToken) return false;
  try {
    const payload = accessToken.split(".")[1];
    if (!payload) return false;
    // base64url → base64
    const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(
      decodeURIComponent(
        atob(b64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      )
    );
    const amr = json?.amr;
    if (!Array.isArray(amr)) return false;
    return amr.some(
      (entry: unknown) =>
        (typeof entry === "string" && entry === "recovery") ||
        (typeof entry === "object" &&
          entry !== null &&
          (entry as { method?: string }).method === "recovery")
    );
  } catch {
    return false;
  }
}

export default function ResetPasswordPage() {
  const { t } = useTranslation("resetPassword");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // Tri-state: null = still checking, false = not a recovery context, true = ok.
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const isCompact = useIsCompact();
  const isPortrait = useIsPortrait();

  // Tighten the card on small viewports; ease heading down in short landscape.
  const cardStyleResponsive: React.CSSProperties = {
    ...cardStyle,
    padding: isCompact ? "1.5rem 1.25rem" : cardStyle.padding,
    margin: isCompact ? "1rem" : cardStyle.margin,
  };
  const titleStyleResponsive: React.CSSProperties = {
    ...titleStyle,
    fontSize: !isPortrait && isCompact ? "1.375rem" : titleStyle.fontSize,
  };

  useEffect(() => {
    const supabase = createClient();

    // A normally-authenticated user must NOT be handed the password-reset form
    // just because they have a session. Only a genuine recovery context counts:
    //   1. the session's `amr` claim records a `recovery` method (set when the
    //      reset link is exchanged), or
    //   2. an explicit ?type=recovery flag is present on the URL (belt-and-braces
    //      for callbacks that forward it), or
    //   3. Supabase's own PASSWORD_RECOVERY auth event fires on this client.
    let settled = false;
    const settle = (ok: boolean) => {
      if (settled) return;
      settled = true;
      setHasSession(ok);
    };

    const urlIsRecovery =
      typeof window !== "undefined" &&
      (new URLSearchParams(window.location.search).get("type") === "recovery" ||
        new URLSearchParams(
          window.location.hash.replace(/^#/, "")
        ).get("type") === "recovery");

    // Supabase emits PASSWORD_RECOVERY when it establishes a recovery session
    // client-side (e.g. from URL hash tokens).
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") settle(true);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        settle(false);
        return;
      }
      if (urlIsRecovery || tokenHasRecoveryAmr(session.access_token)) {
        settle(true);
      } else {
        settle(false);
      }
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    const confirm = formData.get("confirmPassword") as string;

    if (password.length < 8) {
      setError(t("passwordTooShort"));
      return;
    }
    if (password !== confirm) {
      setError(t("passwordsMismatch"));
      return;
    }

    setLoading(true);
    const result = await updatePassword(formData);
    // If updatePassword succeeds it redirects, so we only get here on error
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  // Loading state while checking session
  if (hasSession === null) {
    return (
      <div className="mp-scroll" style={wrapperStyle}>
        <AuthBlobs />
        <main style={cardStyleResponsive}>
          <div role="status" aria-live="polite" style={{ textAlign: "center", padding: "2rem 0" }}>
            <div style={spinnerStyle} aria-hidden="true" />
            <span
              style={{
                position: "absolute",
                width: "1px",
                height: "1px",
                padding: 0,
                margin: "-1px",
                overflow: "hidden",
                clip: "rect(0 0 0 0)",
                whiteSpace: "nowrap",
                border: 0,
              }}
            >
              {t("loading")}
            </span>
          </div>
        </main>
      </div>
    );
  }

  // No recovery context — link expired, invalid, or a normal logged-in user.
  if (!hasSession) {
    return (
      <div className="mp-scroll" style={wrapperStyle}>
        <AuthBlobs />
        <main style={cardStyleResponsive}>
          <div style={{ textAlign: "center" }}>
            <div style={iconContainerStyle}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={T.color.ember} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            </div>
            <h1 style={titleStyleResponsive}>{t("title")}</h1>
            <p style={{ fontSize: "0.875rem", color: T.color.muted, lineHeight: 1.6, marginTop: "0.75rem" }}>
              {t("noSession")}
            </p>
            <Link href="/forgot-password" style={primaryLinkStyle}>
              {t("requestNewLink")}
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="mp-scroll" style={wrapperStyle}>
      <AuthBlobs />
      <main style={cardStyleResponsive}>
        <form onSubmit={handleSubmit}>
          <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
            <div style={iconContainerStyle}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={T.color.ember} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                <circle cx="12" cy="16" r="1"/>
              </svg>
            </div>
            <h1 style={titleStyleResponsive}>{t("title")}</h1>
            <p style={{ fontSize: "0.875rem", color: T.color.muted, marginTop: "0.375rem" }}>
              {t("subtitle")}
            </p>
          </div>

          {error && (
            <div role="alert" style={errorBannerStyle}>
              {error}
            </div>
          )}

          <label htmlFor="reset-password" style={labelStyle}>{t("newPassword")}</label>
          <input
            id="reset-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            placeholder={t("newPasswordPlaceholder")}
            style={inputStyle}
          />

          <label htmlFor="reset-confirm-password" style={{ ...labelStyle, marginTop: "0.875rem" }}>
            {t("confirmPassword")}
          </label>
          <input
            id="reset-confirm-password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            placeholder={t("confirmPasswordPlaceholder")}
            style={inputStyle}
          />

          <button type="submit" disabled={loading} style={buttonStyle(loading)}>
            {loading ? t("updating") : t("updatePassword")}
          </button>

          <p style={{ textAlign: "center", fontSize: "0.8125rem", color: T.color.muted, marginTop: "1.25rem", marginBottom: 0 }}>
            <Link
              href="/forgot-password"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: T.touch,
                padding: "0.5rem 0.75rem",
                color: T.color.ember,
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              {t("requestNewLink")}
            </Link>
          </p>
        </form>
      </main>
    </div>
  );
}

/**
 * Decorative background blobs — identical to the shared (auth) layout so
 * /reset-password reads as a pixel-sibling of /login and /forgot-password even
 * though it lives outside the (auth) route group. (Full extraction of one shared
 * AuthShell is tracked separately; it needs the (auth)/layout + a new shared
 * component, both outside this pass's editable-file allowlist.)
 */
function AuthBlobs() {
  return (
    <>
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(198,107,61,0.08) 0%, transparent 70%)",
          top: -100,
          right: -100,
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          width: 300,
          height: 300,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(74,103,65,0.06) 0%, transparent 70%)",
          bottom: -80,
          left: -80,
          pointerEvents: "none",
        }}
      />
    </>
  );
}

// Chrome mirrors src/app/(auth)/layout.tsx exactly (canon CREAM→warmStone
// gradient, HAIRLINE border, warm-ink shadow, rem sizing) so the two surfaces
// stay pixel-identical.
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
  paddingBottom: "max(1.5rem, env(safe-area-inset-bottom, 0px))",
};

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "27.5rem",
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

const iconContainerStyle: React.CSSProperties = {
  width: "3.5rem",
  height: "3.5rem",
  borderRadius: "1.75rem",
  background: `linear-gradient(135deg, ${T.color.ember}20, ${T.color.walnut}20)`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  margin: "0 auto 0.5rem",
};

const titleStyle: React.CSSProperties = {
  fontFamily: T.font.display,
  fontSize: "1.75rem",
  fontWeight: 300,
  color: T.color.ink,
  margin: 0,
  lineHeight: 1.3,
};

const labelStyle: React.CSSProperties = {
  fontFamily: T.font.body,
  fontSize: "0.6875rem",
  color: T.color.muted,
  letterSpacing: ".5px",
  textTransform: "uppercase",
  display: "block",
  marginBottom: "0.375rem",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.8125rem 1rem",
  borderRadius: "0.625rem",
  border: `1.5px solid ${T.color.sandstone}`,
  background: T.color.white,
  fontFamily: T.font.body,
  fontSize: "1rem",
  color: T.color.ink,
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.2s",
};

// Shared warm-red-on-cream error banner — same palette on every auth surface.
const errorBannerStyle: React.CSSProperties = {
  padding: "0.625rem 0.875rem",
  borderRadius: "0.625rem",
  background: "#FDF2F2",
  border: "1px solid #FECACA",
  color: T.color.error,
  fontSize: "0.8125rem",
  marginBottom: "1rem",
};

const buttonStyle = (disabled: boolean): React.CSSProperties => ({
  width: "100%",
  padding: "0.875rem",
  borderRadius: "0.75rem",
  border: "none",
  background: disabled
    ? `${T.color.sandstone}40`
    : `linear-gradient(135deg, ${T.color.ember}, ${T.color.walnut})`,
  color: disabled ? T.color.muted : T.color.white,
  fontFamily: T.font.body,
  fontSize: "0.9375rem",
  fontWeight: 600,
  cursor: disabled ? "default" : "pointer",
  marginTop: "1.25rem",
  transition: "all 0.2s",
});

const primaryLinkStyle: React.CSSProperties = {
  display: "inline-block",
  marginTop: "1.25rem",
  padding: "0.875rem 2rem",
  borderRadius: "0.75rem",
  background: `linear-gradient(135deg, ${T.color.ember}, ${T.color.walnut})`,
  color: T.color.white,
  textDecoration: "none",
  fontWeight: 600,
  fontSize: "0.9375rem",
  fontFamily: T.font.body,
};

const spinnerStyle: React.CSSProperties = {
  width: "2rem",
  height: "2rem",
  border: `3px solid ${T.color.sandstone}`,
  borderTop: `3px solid ${T.color.ember}`,
  borderRadius: "50%",
  animation: "spin 1s linear infinite",
  margin: "0 auto",
};
