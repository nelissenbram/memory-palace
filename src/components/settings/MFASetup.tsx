"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import {
  enrollMFA,
  verifyMFA,
  unenrollMFA,
  listMFAFactors,
} from "@/lib/auth/mfa-actions";
import QRCode from "qrcode";

type MFAFactor = {
  id: string;
  friendly_name?: string;
  factor_type: string;
  status: string;
};

type SetupStep = "idle" | "qr" | "verify" | "complete";

export default function MFASetup() {
  const { t } = useTranslation("mfa");
  const { t: tc } = useTranslation("common");
  const [factors, setFactors] = useState<MFAFactor[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<SetupStep>("idle");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [factorId, setFactorId] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [disableConfirm, setDisableConfirm] = useState(false);
  const [disabling, setDisabling] = useState(false);
  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);

  const loadFactors = useCallback(async () => {
    const result = await listMFAFactors();
    if (!result.error) {
      // Only show verified factors
      const verified = (result.totp || []).filter(
        (f: MFAFactor) => f.status === "verified"
      );
      setFactors(verified);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadFactors();
  }, [loadFactors]);

  const handleEnroll = async () => {
    setError("");
    setStep("qr");

    const result = await enrollMFA();
    if (result.error) {
      setError(result.error);
      setStep("idle");
      return;
    }

    setFactorId(result.factorId!);
    setSecret(result.secret!);

    // Generate QR code as data URL
    try {
      const dataUrl = await QRCode.toDataURL(result.qrUri!, {
        width: 240,
        margin: 2,
        color: {
          dark: T.color.charcoal,
          light: "#FFFFFF",
        },
      });
      setQrDataUrl(dataUrl);
    } catch {
      // Fallback: show URI text
      setSecret(result.secret!);
    }

    setStep("qr");
  };

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);

    if (value && index < 5) {
      codeRefs.current[index + 1]?.focus();
    }

    if (value && index === 5 && newCode.every((d) => d !== "")) {
      handleVerifyCode(newCode.join(""));
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      codeRefs.current[index - 1]?.focus();
    }
  };

  const handleCodePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const newCode = [...code];
    for (let i = 0; i < 6; i++) {
      newCode[i] = pasted[i] || "";
    }
    setCode(newCode);
    const focusIdx = Math.min(pasted.length, 5);
    codeRefs.current[focusIdx]?.focus();
    if (pasted.length === 6) handleVerifyCode(pasted);
  };

  const handleVerifyCode = async (fullCode?: string) => {
    const codeStr = fullCode || code.join("");
    if (codeStr.length !== 6) {
      setError(t("enterAllDigits"));
      return;
    }

    setVerifying(true);
    setError("");

    const result = await verifyMFA(factorId, codeStr);
    if (result.error) {
      setError(t("invalidCode"));
      setCode(["", "", "", "", "", ""]);
      codeRefs.current[0]?.focus();
      setVerifying(false);
      return;
    }

    setStep("complete");
    setVerifying(false);
    loadFactors();
  };

  const handleDisable = async (fId: string) => {
    setDisabling(true);
    setError("");

    const result = await unenrollMFA(fId);
    if (result.error) {
      setError(result.error);
      setDisabling(false);
      return;
    }

    setDisableConfirm(false);
    setDisabling(false);
    setStep("idle");
    loadFactors();
  };

  const resetSetup = () => {
    setStep("idle");
    setQrDataUrl("");
    setSecret("");
    setFactorId("");
    setCode(["", "", "", "", "", ""]);
    setError("");
    setShowSecret(false);
  };

  if (loading) {
    return (
      <div style={{
        padding: "1.25rem 0",
        fontFamily: T.font.body,
        fontSize: "0.9375rem",
        color: T.color.muted,
      }}>
        {t("loading")}
      </div>
    );
  }

  const isEnabled = factors.length > 0;

  return (
    <div style={{
      background: T.color.white,
      borderRadius: "1rem",
      border: `1px solid ${T.color.cream}`,
      padding: "1.75rem 2rem",
      boxShadow: "0 2px 8px rgba(44,44,42,.04)",
      marginBottom: "1.5rem",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: 6 }}>
        <ShieldIcon />
        <h3 style={{
          fontFamily: T.font.display, fontSize: "1.25rem", fontWeight: 500,
          color: T.color.charcoal, margin: 0,
        }}>
          {t("title")}
        </h3>
        {isEnabled && (
          <span style={{
            padding: "0.25rem 0.75rem",
            borderRadius: "1.25rem",
            background: `${T.color.sage}15`,
            color: T.color.sage,
            fontFamily: T.font.body,
            fontSize: "0.75rem",
            fontWeight: 600,
          }}>
            {t("enabled")}
          </span>
        )}
      </div>
      <p style={{
        fontFamily: T.font.body, fontSize: "0.9375rem", color: T.color.muted,
        margin: "0 0 22px", lineHeight: 1.6,
      }}>
        {t("description")}
      </p>

      {error && (
        <div role="alert" style={{
          padding: "0.75rem 1rem",
          borderRadius: "0.625rem",
          background: "#FDF2F2",
          border: "1px solid #FECACA",
          color: T.color.error,
          fontSize: "0.9375rem",
          marginBottom: "1.25rem",
          fontFamily: T.font.body,
        }}>
          {error}
        </div>
      )}

      {/* ── Idle: Show enable or current status ── */}
      {step === "idle" && !isEnabled && (
        <button
          onClick={handleEnroll}
          style={{
            padding: "0.875rem 1.75rem",
            borderRadius: "0.75rem",
            border: "none",
            background: `linear-gradient(135deg, ${T.color.terracotta}, ${T.color.walnut})`,
            color: T.color.white,
            fontFamily: T.font.body,
            fontSize: "1rem",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          {t("enableButton")}
        </button>
      )}

      {step === "idle" && isEnabled && (
        <div>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "1.125rem 1.25rem", borderRadius: "0.75rem",
            background: `${T.color.sage}08`,
            border: `1px solid ${T.color.sage}25`,
          }}>
            <div>
              <div style={{
                fontFamily: T.font.body, fontSize: "1rem", fontWeight: 500,
                color: T.color.charcoal,
              }}>
                {t("authenticatorApp")}
              </div>
              <div style={{
                fontFamily: T.font.body, fontSize: "0.875rem", color: T.color.muted,
                marginTop: 4,
              }}>
                {t("accountProtected")}
              </div>
            </div>
            <div style={{
              width: "2.25rem", height: "2.25rem", borderRadius: "1.125rem",
              background: T.color.sage,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            </div>
          </div>

          {!disableConfirm ? (
            <button
              onClick={() => setDisableConfirm(true)}
              style={{
                marginTop: "1rem",
                padding: "0.75rem 1.5rem",
                borderRadius: "0.625rem",
                border: `1px solid ${T.color.error}30`,
                background: "transparent",
                fontFamily: T.font.body,
                fontSize: "0.875rem",
                fontWeight: 500,
                color: T.color.error,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {t("disableButton")}
            </button>
          ) : (
            <div style={{
              marginTop: "1rem",
              padding: "1.125rem 1.25rem",
              borderRadius: "0.75rem",
              background: "#FDF2F2",
              border: "1px solid #FECACA",
            }}>
              <p style={{
                fontFamily: T.font.body, fontSize: "0.9375rem", fontWeight: 500,
                color: "#B91C1C", margin: "0 0 8px",
              }}>
                {t("disableConfirmTitle")}
              </p>
              <p style={{
                fontFamily: T.font.body, fontSize: "0.875rem", color: "#7F1D1D",
                margin: "0 0 16px", lineHeight: 1.5,
              }}>
                {t("disableConfirmDesc")}
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => handleDisable(factors[0].id)}
                  disabled={disabling}
                  style={{
                    padding: "0.625rem 1.25rem",
                    borderRadius: "0.625rem",
                    border: "none",
                    background: disabling ? `${T.color.sandstone}60` : "#B91C1C",
                    color: disabling ? T.color.muted : "#FFF",
                    fontFamily: T.font.body,
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    cursor: disabling ? "default" : "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {disabling ? t("disabling") : t("yesDisable")}
                </button>
                <button
                  onClick={() => setDisableConfirm(false)}
                  style={{
                    padding: "0.625rem 1.25rem",
                    borderRadius: "0.625rem",
                    border: `1px solid ${T.color.cream}`,
                    background: T.color.white,
                    fontFamily: T.font.body,
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    color: T.color.charcoal,
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {tc("cancel")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── QR Code Step ── */}
      {step === "qr" && (
        <div>
          <div style={{
            padding: "1.5rem",
            borderRadius: "0.875rem",
            background: T.color.linen,
            border: `1px solid ${T.color.cream}`,
            marginBottom: "1.25rem",
          }}>
            <h4 style={{
              fontFamily: T.font.display, fontSize: "1.125rem", fontWeight: 500,
              color: T.color.charcoal, margin: "0 0 8px",
            }}>
              {t("step1Title")}
            </h4>
            <p style={{
              fontFamily: T.font.body, fontSize: "0.9375rem", color: T.color.muted,
              margin: "0 0 20px", lineHeight: 1.6,
            }}>
              {t("step1Desc")}
            </p>

            {qrDataUrl ? (
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <div style={{
                  display: "inline-block",
                  padding: "1rem",
                  borderRadius: "1rem",
                  background: "#FFF",
                  border: `1px solid ${T.color.cream}`,
                  boxShadow: "0 2px 12px rgba(44,44,42,.08)",
                }}>
                  <img
                    src={qrDataUrl}
                    alt={t("qrCodeAlt")}
                    width={240}
                    height={240}
                    style={{ display: "block" }}
                  />
                </div>
              </div>
            ) : (
              <div style={{
                textAlign: "center", padding: "2.5rem",
                fontFamily: T.font.body, fontSize: "0.9375rem", color: T.color.muted,
              }}>
                {t("generatingQR")}
              </div>
            )}

            {/* Manual entry fallback */}
            <div style={{ textAlign: "center" }}>
              <button
                onClick={() => setShowSecret(!showSecret)}
                style={{
                  background: "none",
                  border: "none",
                  color: T.color.terracotta,
                  fontFamily: T.font.body,
                  fontSize: "0.875rem",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                {showSecret ? t("hideSecret") : t("cantScan")}
              </button>
              {showSecret && (
                <div style={{
                  marginTop: "0.75rem",
                  padding: "0.875rem 1.125rem",
                  borderRadius: "0.625rem",
                  background: T.color.white,
                  border: `1px solid ${T.color.cream}`,
                  fontFamily: "monospace",
                  fontSize: "1rem",
                  letterSpacing: "2px",
                  color: T.color.charcoal,
                  wordBreak: "break-all",
                  userSelect: "all",
                }}>
                  {secret}
                </div>
              )}
            </div>
          </div>

          <div style={{
            padding: "1.5rem",
            borderRadius: "0.875rem",
            background: T.color.linen,
            border: `1px solid ${T.color.cream}`,
            marginBottom: "1.25rem",
          }}>
            <h4 style={{
              fontFamily: T.font.display, fontSize: "1.125rem", fontWeight: 500,
              color: T.color.charcoal, margin: "0 0 8px",
            }}>
              {t("step2Title")}
            </h4>
            <p style={{
              fontFamily: T.font.body, fontSize: "0.9375rem", color: T.color.muted,
              margin: "0 0 20px", lineHeight: 1.6,
            }}>
              {t("step2Desc")}
            </p>

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "0.625rem",
                marginBottom: "1.25rem",
              }}
              onPaste={handleCodePaste}
            >
              {code.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { codeRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeChange(i, e.target.value)}
                  onKeyDown={(e) => handleCodeKeyDown(i, e)}
                  style={{
                    width: "3.125rem",
                    height: "3.75rem",
                    textAlign: "center",
                    fontSize: "1.5rem",
                    fontFamily: T.font.body,
                    fontWeight: 600,
                    color: T.color.charcoal,
                    borderRadius: "0.75rem",
                    border: `2px solid ${digit ? T.color.terracotta : T.color.sandstone}`,
                    background: T.color.white,
                    outline: "none",
                    transition: "border-color 0.2s",
                    caretColor: T.color.terracotta,
                  }}
                />
              ))}
            </div>

            <div style={{ display: "flex", gap: "0.625rem", justifyContent: "center" }}>
              <button
                onClick={() => handleVerifyCode()}
                disabled={verifying || code.some((d) => !d)}
                style={{
                  padding: "0.875rem 2rem",
                  borderRadius: "0.75rem",
                  border: "none",
                  background:
                    verifying || code.some((d) => !d)
                      ? `${T.color.sandstone}40`
                      : `linear-gradient(135deg, ${T.color.terracotta}, ${T.color.walnut})`,
                  color: verifying || code.some((d) => !d) ? T.color.muted : T.color.white,
                  fontFamily: T.font.body,
                  fontSize: "1rem",
                  fontWeight: 600,
                  cursor: verifying || code.some((d) => !d) ? "default" : "pointer",
                  transition: "all 0.2s",
                }}
              >
                {verifying ? t("verifying") : t("verifyAndEnable")}
              </button>
              <button
                onClick={resetSetup}
                style={{
                  padding: "0.875rem 1.5rem",
                  borderRadius: "0.75rem",
                  border: `1px solid ${T.color.cream}`,
                  background: "transparent",
                  color: T.color.muted,
                  fontFamily: T.font.body,
                  fontSize: "0.9375rem",
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                {tc("cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Complete Step ── */}
      {step === "complete" && (
        <div style={{
          padding: "1.75rem 1.5rem",
          borderRadius: "0.875rem",
          background: `${T.color.sage}08`,
          border: `1px solid ${T.color.sage}25`,
          textAlign: "center",
        }}>
          <div style={{
            width: "3.5rem", height: "3.5rem", borderRadius: "1.75rem",
            background: T.color.sage,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px",
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
          </div>
          <h4 style={{
            fontFamily: T.font.display, fontSize: "1.375rem", fontWeight: 500,
            color: T.color.charcoal, margin: "0 0 8px",
          }}>
            {t("completeTitle")}
          </h4>
          <p style={{
            fontFamily: T.font.body, fontSize: "1rem", color: T.color.muted,
            margin: "0 0 8px", lineHeight: 1.6,
          }}>
            {t("completeDesc")}
          </p>
          <p style={{
            fontFamily: T.font.body, fontSize: "0.875rem", color: T.color.walnut,
            margin: "0 0 24px", lineHeight: 1.5, fontWeight: 500,
          }}>
            {t("backupWarning")}
          </p>
          <button
            onClick={resetSetup}
            style={{
              padding: "0.75rem 1.75rem",
              borderRadius: "0.625rem",
              border: `1px solid ${T.color.cream}`,
              background: T.color.white,
              fontFamily: T.font.body,
              fontSize: "0.9375rem",
              fontWeight: 500,
              color: T.color.charcoal,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {tc("done")}
          </button>
        </div>
      )}
    </div>
  );
}

function ShieldIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={T.color.terracotta} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <path d="M9 12l2 2 4-4"/>
    </svg>
  );
}
