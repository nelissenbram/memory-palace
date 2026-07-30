"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signUp } from "@/lib/auth/actions";
import { signInWithGoogle, signInWithApple } from "@/lib/auth/social-login";
import { createClient } from "@/lib/supabase/client";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useIsPortrait } from "@/lib/hooks/useIsPortrait";
import { T } from "@/lib/theme";
import { EMBER, HAIRLINE, MUTED, INK, GOLD } from "@/lib/libraryTokens";
import PalaceLogo from "@/components/landing/PalaceLogo";
import { track } from "@/lib/analytics";
import { isIOS, isNative } from "@/lib/native/platform";

// Canon-consistent focus handlers for inline-styled inputs: EMBER border +
// ceremonial GOLD ring on focus (inline styles cannot express :focus).
function applyFocus(el: HTMLInputElement) {
  el.style.borderColor = EMBER;
  el.style.boxShadow = `0 0 0 0.1875rem ${GOLD}66`;
}
function clearFocus(el: HTMLInputElement) {
  el.style.borderColor = HAIRLINE;
  el.style.boxShadow = "none";
}

export default function RegisterPage() {
  return <Suspense><RegisterContent /></Suspense>;
}

function RegisterContent() {
  const { t } = useTranslation("register");
  const { t: tc } = useTranslation("common");
  const isMobile = useIsMobile();
  const isPortrait = useIsPortrait();
  // A short/landscape phone (mobile but not portrait) has little vertical room;
  // tighten the header + divider rhythm so the create-account CTA stays reachable
  // without scrolling.
  const isShort = isMobile && !isPortrait;
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  // Email is retained after a successful sign-up so the confirmation-screen
  // resend can re-target it without re-entry.
  const [registeredEmail, setRegisteredEmail] = useState("");
  // Resend-confirmation state machine: idle → sending → sent (cooldown) / error.
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [resendCooldown, setResendCooldown] = useState(0);
  // OAuth state. `appleFirst` set after mount to avoid hydration mismatch; on
  // iOS, Apple is shown first for equal prominence (Apple Guideline 4.8).
  const [oauthLoading, setOauthLoading] = useState<"google" | "apple" | null>(null);
  const [appleFirst, setAppleFirst] = useState(false);
  useEffect(() => { setAppleFirst(isIOS()); }, []);
  // Backstop for a dropped browserFinished: when the in-app auth sheet closes the
  // WebView regains visibility — reset a stuck OAuth spinner so the buttons never
  // wedge (native only; web redirects away instead).
  useEffect(() => {
    if (!oauthLoading || !isNative()) return;
    const reset = () => { if (document.visibilityState === "visible") setOauthLoading(null); };
    document.addEventListener("visibilitychange", reset);
    return () => document.removeEventListener("visibilitychange", reset);
  }, [oauthLoading]);
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");
  const refCode = searchParams.get("ref");

  // Store referral code for post-registration application
  useEffect(() => {
    if (refCode) {
      localStorage.setItem("mp_referral_code", refCode);
    }
  }, [refCode]);

  // Tick down the resend cooldown once per second so the button re-enables.
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [resendCooldown]);

  // Re-send the confirmation email for a user stuck on the check-email screen
  // (never arrived / expired). Uses the browser Supabase client's resend() —
  // Supabase returns success even for an already-confirmed or unknown address, so
  // this never leaks account existence. A 45s cooldown throttles abuse.
  async function handleResend() {
    if (resendState === "sending" || resendCooldown > 0 || !registeredEmail) return;
    setResendState("sending");
    try {
      const supabase = createClient();
      const { error: resendErr } = await supabase.auth.resend({
        type: "signup",
        email: registeredEmail,
      });
      if (resendErr) {
        setResendState("error");
        return;
      }
      setResendState("sent");
      setResendCooldown(45);
      track("signup_confirmation_resent");
    } catch {
      setResendState("error");
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const formData = new FormData(e.currentTarget);

    const password = formData.get("password") as string | null;
    const confirm = formData.get("confirmPassword") as string | null;
    const email = ((formData.get("email") as string | null) ?? "").trim();

    // Guard against a bypassed `required` attribute (e.g. autofill/scripting)
    // so a null password can never .length-deref before the try/catch below.
    if (!password) {
      setError(t("passwordTooShort"));
      setLoading(false);
      return;
    }
    if (password.length < 8) {
      setError(t("passwordTooShort"));
      setLoading(false);
      return;
    }
    if (password !== confirm) {
      setError(t("passwordsMismatch"));
      setLoading(false);
      return;
    }

    // Enforce the age attestation server-side too (see signUp): submit it in the
    // FormData rather than merely gating the button client-side.
    formData.set("ageConfirmed", ageConfirmed ? "true" : "false");
    if (redirect) formData.set("redirect", redirect);
    try {
      const result = await signUp(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setRegisteredEmail(email);
        setSuccess(true);
        track("signup_completed");

        // Apply referral code if stored
        try {
          const storedRef = localStorage.getItem("mp_referral_code");
          if (storedRef) {
            localStorage.removeItem("mp_referral_code");
            // Referral rewards mint a Stripe coupon — a web payment mechanism Apple
            // forbids the app to facilitate. Never run this on iOS (Guideline 3.1.1).
            if (!isIOS()) {
              await fetch("/api/referral", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: storedRef }),
              });
            }
          }
        } catch {
          // non-critical — referral application is best-effort
        }
      }
    } catch {
      setError(tc("somethingWentWrong"));
    }
    setLoading(false);
  }

  if (success) {
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: "4rem", height: "4rem", borderRadius: "2rem",
          background: `linear-gradient(135deg, ${EMBER}20, ${T.color.walnut}20)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 1rem",
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={EMBER} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2"/>
            <path d="M22 4L12 13 2 4"/>
          </svg>
        </div>
        <h2
          style={{
            fontFamily: T.font.display,
            fontSize: "1.5rem",
            fontWeight: 500,
            color: T.color.charcoal,
            margin: "0 0 0.75rem",
          }}
        >
          {t("checkEmail")}
        </h2>
        <p style={{ fontSize: "0.875rem", color: MUTED, lineHeight: 1.6 }}>
          {t("confirmationSent")}
          {registeredEmail && (
            <span style={{ display: "block", marginTop: "0.375rem", color: INK, fontWeight: 600 }}>
              {registeredEmail}
            </span>
          )}
          {redirect && (
            <span style={{ display: "block", marginTop: "0.5rem", color: EMBER }}>
              {t("afterConfirming")}
            </span>
          )}
        </p>

        {/* Stuck-user recovery: resend the confirmation email, or explain the
            already-registered case. */}
        {registeredEmail && (
          <div style={{ marginTop: "1.25rem" }}>
            <p style={{ fontSize: "0.8125rem", color: MUTED, lineHeight: 1.6, margin: "0 0 0.625rem" }}>
              {t("didntGetEmail")}
            </p>
            <button
              type="button"
              onClick={handleResend}
              disabled={resendState === "sending" || resendCooldown > 0}
              style={{
                minHeight: "2.75rem",
                padding: "0.625rem 1.25rem",
                borderRadius: "0.75rem",
                border: `1.5px solid ${HAIRLINE}`,
                background: T.color.white,
                color: resendState === "sending" || resendCooldown > 0 ? MUTED : EMBER,
                fontFamily: T.font.body,
                fontSize: "0.875rem",
                fontWeight: 600,
                cursor: resendState === "sending" || resendCooldown > 0 ? "default" : "pointer",
                transition: "all 0.2s",
              }}
            >
              {resendState === "sending"
                ? t("resending")
                : resendCooldown > 0
                  ? t("resendCooldown", { seconds: String(resendCooldown) })
                  : t("resendConfirmation")}
            </button>
            {resendState === "sent" && (
              <p role="status" style={{ fontSize: "0.8125rem", color: T.color.walnut, marginTop: "0.625rem", marginBottom: 0 }}>
                {t("resendSent")}
              </p>
            )}
            {resendState === "error" && (
              <p role="alert" style={{ fontSize: "0.8125rem", color: T.color.error, marginTop: "0.625rem", marginBottom: 0 }}>
                {t("resendError")}
              </p>
            )}
          </div>
        )}

        <Link
          href="/login"
          style={{
            display: "inline-block",
            marginTop: "1.25rem",
            padding: "0.5rem 0.75rem",
            color: EMBER,
            textDecoration: "none",
            fontWeight: 600,
            fontSize: "0.875rem",
          }}
        >
          {t("backToSignIn")}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ textAlign: "center", marginBottom: isShort ? "0.75rem" : isMobile ? "1.25rem" : "1.75rem" }}>
        <div style={{ marginBottom: isShort ? "0.25rem" : "0.5rem" }}><PalaceLogo variant="mark" color="dark" size={isMobile ? "md" : "lg"} /></div>
        <h1
          style={{
            fontFamily: T.font.display,
            fontSize: isMobile ? "1.5rem" : "1.75rem",
            fontWeight: 300,
            color: T.color.charcoal,
            margin: 0,
            lineHeight: 1.3,
          }}
        >
          {t("title")}
        </h1>
        <p style={{ fontSize: "0.875rem", color: MUTED, marginTop: "0.375rem" }}>
          {t("subtitle")}
        </p>
      </div>

      {error && (
        <div
          id="register-error"
          role="alert"
          style={{
            padding: "0.625rem 0.875rem",
            borderRadius: "0.625rem",
            background: "#FDF2F2",
            border: "1px solid #FECACA",
            color: T.color.error,
            fontSize: "0.8125rem",
            marginBottom: "1rem",
          }}
        >
          {error}
        </div>
      )}

      <label htmlFor="register-name" style={labelStyle}>{t("name")}</label>
      <input
        id="register-name"
        name="displayName"
        type="text"
        autoComplete="name"
        placeholder={t("namePlaceholder")}
        onFocus={(e) => applyFocus(e.currentTarget)}
        onBlur={(e) => clearFocus(e.currentTarget)}
        style={inputStyle}
      />

      <label htmlFor="register-email" style={{ ...labelStyle, marginTop: "0.875rem" }}>{t("email")}</label>
      <input
        id="register-email"
        name="email"
        type="email"
        autoComplete="email"
        required
        aria-describedby={error ? "register-error" : undefined}
        placeholder={t("emailPlaceholder")}
        onFocus={(e) => applyFocus(e.currentTarget)}
        onBlur={(e) => clearFocus(e.currentTarget)}
        style={inputStyle}
      />

      <label htmlFor="register-password" style={{ ...labelStyle, marginTop: "0.875rem" }}>{t("password")}</label>
      <input
        id="register-password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        aria-describedby={error ? "register-error" : undefined}
        placeholder={t("passwordPlaceholder")}
        onFocus={(e) => applyFocus(e.currentTarget)}
        onBlur={(e) => clearFocus(e.currentTarget)}
        style={inputStyle}
      />

      <label htmlFor="register-confirm-password" style={{ ...labelStyle, marginTop: "0.875rem" }}>{t("confirmPassword")}</label>
      <input
        id="register-confirm-password"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        required
        aria-describedby={error ? "register-error" : undefined}
        placeholder={t("confirmPasswordPlaceholder")}
        onFocus={(e) => applyFocus(e.currentTarget)}
        onBlur={(e) => clearFocus(e.currentTarget)}
        style={inputStyle}
      />

      <label
        htmlFor="register-age"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          marginTop: "1rem",
          minHeight: "2.75rem",
          padding: "0.5rem 0",
          fontSize: "0.8125rem",
          color: MUTED,
          cursor: "pointer",
        }}
      >
        <input
          id="register-age"
          type="checkbox"
          checked={ageConfirmed}
          onChange={(e) => setAgeConfirmed(e.target.checked)}
          style={{ width: "1.25rem", height: "1.25rem", flexShrink: 0, accentColor: EMBER }}
        />
        {t("ageConfirm")}
      </label>

      <button type="submit" disabled={loading || !ageConfirmed} style={buttonStyle(loading || !ageConfirmed)}>
        {loading ? t("creating") : t("createAccount")}
      </button>

      <div style={{ ...dividerStyle, margin: isShort ? "0.875rem 0 0.75rem" : isMobile ? "1.25rem 0 1rem" : "1.5rem 0 1.25rem" }}>
        <span style={dividerLineStyle} />
        <span style={dividerTextStyle}>{t("orSignUpWith")}</span>
        <span style={dividerLineStyle} />
      </div>

      {(() => {
        const handleOAuth = async (provider: "google" | "apple") => {
          if (oauthLoading) return;
          if (!ageConfirmed) {
            setError(t("ageRequiredForSocial"));
            return;
          }
          setError("");
          setOauthLoading(provider);
          // Safety net: if iOS drops browserFinished, never leave the button stuck
          // disabled (no-op'ing every later tap). Force-reset after 45s.
          const safety = setTimeout(() => setOauthLoading(null), 45000);
          const clear = () => { clearTimeout(safety); setOauthLoading(null); };
          const fn = provider === "google" ? signInWithGoogle : signInWithApple;
          try {
            // onDismiss resets the spinner if the in-app auth sheet closes without
            // completing, so a cancelled/failed sign-up never looks frozen.
            // Thread the deep-link redirect so social sign-up honors invite/kep
            // links like the password path does.
            const { error: oauthErr } = await fn({ onDismiss: clear, redirect });
            if (oauthErr) {
              clear();
              setError(oauthErr);
            }
          } catch {
            clear();
            setError(tc("somethingWentWrong"));
          }
        };
        const googleBtn = (
          <button
            key="google"
            type="button"
            onClick={() => handleOAuth("google")}
            disabled={!!oauthLoading}
            style={{ ...googleButtonStyle, ...(!ageConfirmed ? { opacity: 0.6 } : {}) }}
          >
            <GoogleIcon />
            {oauthLoading === "google" ? t("signingUp") : t("signUpWithGoogle")}
          </button>
        );
        const appleBtn = (
          <button
            key="apple"
            type="button"
            onClick={() => handleOAuth("apple")}
            disabled={!!oauthLoading}
            style={{ ...appleButtonStyle, ...(!ageConfirmed ? { opacity: 0.6 } : {}) }}
          >
            <AppleIcon />
            {oauthLoading === "apple" ? t("signingUp") : t("signUpWithApple")}
          </button>
        );
        // Apple first on iOS (Guideline 4.8); Google first elsewhere.
        return appleFirst ? [appleBtn, googleBtn] : [googleBtn, appleBtn];
      })()}

      <p
        style={{
          textAlign: "center",
          fontSize: "0.8125rem",
          color: MUTED,
          marginTop: "1.25rem",
          marginBottom: 0,
        }}
      >
        {t("alreadyHaveAccount")}{" "}
        <Link
          href="/login"
          style={{ color: EMBER, textDecoration: "none", fontWeight: 600, display: "inline-block", padding: "0.5rem 0.25rem" }}
        >
          {t("signIn")}
        </Link>
      </p>

      <p
        style={{
          textAlign: "center",
          fontSize: "0.6875rem",
          color: MUTED,
          marginTop: "1rem",
          marginBottom: 0,
          lineHeight: 1.6,
        }}
      >
        {t("agreeTerms")}{" "}
        <Link href="/terms" style={legalLinkStyle}>
          {tc("termsOfService")}
        </Link>{" "}
        {t("and")}{" "}
        <Link href="/privacy" style={legalLinkStyle}>
          {tc("privacyPolicy")}
        </Link>
        .
      </p>
    </form>
  );
}

// Terms/Privacy links live inline in a small centered paragraph. inline-block +
// vertical padding grows the tap area toward the 2.75rem guideline without
// breaking the sentence flow; negative vertical margin keeps line spacing tight.
const legalLinkStyle: React.CSSProperties = {
  color: EMBER,
  textDecoration: "none",
  display: "inline-block",
  padding: "0.5rem 0.25rem",
  margin: "-0.5rem 0",
};

const labelStyle: React.CSSProperties = {
  fontFamily: T.font.body,
  fontSize: "0.6875rem",
  color: MUTED,
  letterSpacing: ".5px",
  textTransform: "uppercase",
  display: "block",
  marginBottom: "0.375rem",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.8125rem 1rem",
  borderRadius: "0.625rem",
  border: `1.5px solid ${HAIRLINE}`,
  background: T.color.white,
  fontFamily: T.font.body,
  fontSize: "1rem",
  color: INK,
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.2s, box-shadow 0.2s",
};

const buttonStyle = (disabled: boolean): React.CSSProperties => ({
  width: "100%",
  padding: "0.875rem",
  borderRadius: "0.75rem",
  border: "none",
  background: disabled
    ? `${T.color.sandstone}40`
    : `linear-gradient(135deg, ${EMBER}, ${T.color.walnut})`,
  color: disabled ? MUTED : T.color.white,
  fontFamily: T.font.body,
  fontSize: "0.9375rem",
  fontWeight: 600,
  cursor: disabled ? "default" : "pointer",
  marginTop: "1.25rem",
  transition: "all 0.2s",
});

const dividerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.75rem",
  margin: "1.5rem 0 1.25rem",
};

const dividerLineStyle: React.CSSProperties = {
  flex: 1,
  height: 1,
  background: HAIRLINE,
};

const dividerTextStyle: React.CSSProperties = {
  fontFamily: T.font.body,
  fontSize: "0.75rem",
  color: MUTED,
  whiteSpace: "nowrap",
};

const socialButtonBase: React.CSSProperties = {
  width: "100%",
  minHeight: "2.75rem",
  padding: "0.75rem 1rem",
  borderRadius: "0.75rem",
  fontFamily: T.font.body,
  fontSize: "0.875rem",
  fontWeight: 600,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.625rem",
  transition: "all 0.2s",
};

const googleButtonStyle: React.CSSProperties = {
  ...socialButtonBase,
  background: T.color.white,
  color: "#3C4043",
  border: `1.5px solid ${HAIRLINE}`,
  marginBottom: "0.625rem",
};

const appleButtonStyle: React.CSSProperties = {
  ...socialButtonBase,
  background: "#000000",
  color: "#FFFFFF",
  border: "1.5px solid #000000",
};

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.0 24.0 0 0 0 0 21.56l7.98-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.32 2.32-2.11 4.45-3.74 4.25z"/>
    </svg>
  );
}
