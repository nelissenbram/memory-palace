"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { T } from "@/lib/theme";
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
      setError("Please enter all 6 digits.");
      return;
    }

    setVerifying(true);
    setError("");

    const result = await verifyMFA(factorId, codeStr);
    if (result.error) {
      setError("Invalid code. Please check your authenticator app and try again.");
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
        padding: "20px 0",
        fontFamily: T.font.body,
        fontSize: 15,
        color: T.color.muted,
      }}>
        Loading security settings...
      </div>
    );
  }

  const isEnabled = factors.length > 0;

  return (
    <div style={{
      background: T.color.white,
      borderRadius: 16,
      border: `1px solid ${T.color.cream}`,
      padding: "28px 32px",
      boxShadow: "0 2px 8px rgba(44,44,42,.04)",
      marginBottom: 24,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
        <ShieldIcon />
        <h3 style={{
          fontFamily: T.font.display, fontSize: 20, fontWeight: 500,
          color: T.color.charcoal, margin: 0,
        }}>
          Two-Factor Authentication
        </h3>
        {isEnabled && (
          <span style={{
            padding: "4px 12px",
            borderRadius: 20,
            background: `${T.color.sage}15`,
            color: T.color.sage,
            fontFamily: T.font.body,
            fontSize: 12,
            fontWeight: 600,
          }}>
            Enabled
          </span>
        )}
      </div>
      <p style={{
        fontFamily: T.font.body, fontSize: 15, color: T.color.muted,
        margin: "0 0 22px", lineHeight: 1.6,
      }}>
        Add an extra layer of security to your account. When enabled, you will need
        to enter a code from your authenticator app each time you sign in.
      </p>

      {error && (
        <div style={{
          padding: "12px 16px",
          borderRadius: 10,
          background: "#FDF2F2",
          border: "1px solid #FECACA",
          color: T.color.error,
          fontSize: 15,
          marginBottom: 20,
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
            padding: "14px 28px",
            borderRadius: 12,
            border: "none",
            background: `linear-gradient(135deg, ${T.color.terracotta}, ${T.color.walnut})`,
            color: T.color.white,
            fontFamily: T.font.body,
            fontSize: 16,
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          Enable Two-Factor Authentication
        </button>
      )}

      {step === "idle" && isEnabled && (
        <div>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "18px 20px", borderRadius: 12,
            background: `${T.color.sage}08`,
            border: `1px solid ${T.color.sage}25`,
          }}>
            <div>
              <div style={{
                fontFamily: T.font.body, fontSize: 16, fontWeight: 500,
                color: T.color.charcoal,
              }}>
                Authenticator App
              </div>
              <div style={{
                fontFamily: T.font.body, fontSize: 14, color: T.color.muted,
                marginTop: 4,
              }}>
                Your account is protected with two-factor authentication.
              </div>
            </div>
            <div style={{
              width: 36, height: 36, borderRadius: 18,
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
                marginTop: 16,
                padding: "12px 24px",
                borderRadius: 10,
                border: `1px solid ${T.color.error}30`,
                background: "transparent",
                fontFamily: T.font.body,
                fontSize: 14,
                fontWeight: 500,
                color: T.color.error,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              Disable Two-Factor Authentication
            </button>
          ) : (
            <div style={{
              marginTop: 16,
              padding: "18px 20px",
              borderRadius: 12,
              background: "#FDF2F2",
              border: "1px solid #FECACA",
            }}>
              <p style={{
                fontFamily: T.font.body, fontSize: 15, fontWeight: 500,
                color: "#B91C1C", margin: "0 0 8px",
              }}>
                Are you sure?
              </p>
              <p style={{
                fontFamily: T.font.body, fontSize: 14, color: "#7F1D1D",
                margin: "0 0 16px", lineHeight: 1.5,
              }}>
                Disabling two-factor authentication will make your account less secure.
                You can always re-enable it later.
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => handleDisable(factors[0].id)}
                  disabled={disabling}
                  style={{
                    padding: "10px 20px",
                    borderRadius: 10,
                    border: "none",
                    background: disabling ? `${T.color.sandstone}60` : "#B91C1C",
                    color: disabling ? T.color.muted : "#FFF",
                    fontFamily: T.font.body,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: disabling ? "default" : "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {disabling ? "Disabling..." : "Yes, Disable 2FA"}
                </button>
                <button
                  onClick={() => setDisableConfirm(false)}
                  style={{
                    padding: "10px 20px",
                    borderRadius: 10,
                    border: `1px solid ${T.color.cream}`,
                    background: T.color.white,
                    fontFamily: T.font.body,
                    fontSize: 14,
                    fontWeight: 500,
                    color: T.color.charcoal,
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  Cancel
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
            padding: "24px",
            borderRadius: 14,
            background: T.color.linen,
            border: `1px solid ${T.color.cream}`,
            marginBottom: 20,
          }}>
            <h4 style={{
              fontFamily: T.font.display, fontSize: 18, fontWeight: 500,
              color: T.color.charcoal, margin: "0 0 8px",
            }}>
              Step 1: Scan the QR Code
            </h4>
            <p style={{
              fontFamily: T.font.body, fontSize: 15, color: T.color.muted,
              margin: "0 0 20px", lineHeight: 1.6,
            }}>
              Open your authenticator app (such as Google Authenticator, Authy, or 1Password)
              and scan this QR code.
            </p>

            {qrDataUrl ? (
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <div style={{
                  display: "inline-block",
                  padding: 16,
                  borderRadius: 16,
                  background: "#FFF",
                  border: `1px solid ${T.color.cream}`,
                  boxShadow: "0 2px 12px rgba(44,44,42,.08)",
                }}>
                  <img
                    src={qrDataUrl}
                    alt="Scan this QR code with your authenticator app"
                    width={240}
                    height={240}
                    style={{ display: "block" }}
                  />
                </div>
              </div>
            ) : (
              <div style={{
                textAlign: "center", padding: 40,
                fontFamily: T.font.body, fontSize: 15, color: T.color.muted,
              }}>
                Generating QR code...
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
                  fontSize: 14,
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                {showSecret ? "Hide secret key" : "Can't scan? Enter the key manually"}
              </button>
              {showSecret && (
                <div style={{
                  marginTop: 12,
                  padding: "14px 18px",
                  borderRadius: 10,
                  background: T.color.white,
                  border: `1px solid ${T.color.cream}`,
                  fontFamily: "monospace",
                  fontSize: 16,
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
            padding: "24px",
            borderRadius: 14,
            background: T.color.linen,
            border: `1px solid ${T.color.cream}`,
            marginBottom: 20,
          }}>
            <h4 style={{
              fontFamily: T.font.display, fontSize: 18, fontWeight: 500,
              color: T.color.charcoal, margin: "0 0 8px",
            }}>
              Step 2: Enter the Verification Code
            </h4>
            <p style={{
              fontFamily: T.font.body, fontSize: 15, color: T.color.muted,
              margin: "0 0 20px", lineHeight: 1.6,
            }}>
              After scanning, your authenticator app will show a 6-digit code.
              Enter it below to complete setup.
            </p>

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 10,
                marginBottom: 20,
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
                    width: 50,
                    height: 60,
                    textAlign: "center",
                    fontSize: 24,
                    fontFamily: T.font.body,
                    fontWeight: 600,
                    color: T.color.charcoal,
                    borderRadius: 12,
                    border: `2px solid ${digit ? T.color.terracotta : T.color.sandstone}`,
                    background: T.color.white,
                    outline: "none",
                    transition: "border-color 0.2s",
                    caretColor: T.color.terracotta,
                  }}
                />
              ))}
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button
                onClick={() => handleVerifyCode()}
                disabled={verifying || code.some((d) => !d)}
                style={{
                  padding: "14px 32px",
                  borderRadius: 12,
                  border: "none",
                  background:
                    verifying || code.some((d) => !d)
                      ? `${T.color.sandstone}40`
                      : `linear-gradient(135deg, ${T.color.terracotta}, ${T.color.walnut})`,
                  color: verifying || code.some((d) => !d) ? T.color.muted : T.color.white,
                  fontFamily: T.font.body,
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: verifying || code.some((d) => !d) ? "default" : "pointer",
                  transition: "all 0.2s",
                }}
              >
                {verifying ? "Verifying..." : "Verify and Enable"}
              </button>
              <button
                onClick={resetSetup}
                style={{
                  padding: "14px 24px",
                  borderRadius: 12,
                  border: `1px solid ${T.color.cream}`,
                  background: "transparent",
                  color: T.color.muted,
                  fontFamily: T.font.body,
                  fontSize: 15,
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Complete Step ── */}
      {step === "complete" && (
        <div style={{
          padding: "28px 24px",
          borderRadius: 14,
          background: `${T.color.sage}08`,
          border: `1px solid ${T.color.sage}25`,
          textAlign: "center",
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 28,
            background: T.color.sage,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px",
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
          </div>
          <h4 style={{
            fontFamily: T.font.display, fontSize: 22, fontWeight: 500,
            color: T.color.charcoal, margin: "0 0 8px",
          }}>
            Two-Factor Authentication is Now Active
          </h4>
          <p style={{
            fontFamily: T.font.body, fontSize: 16, color: T.color.muted,
            margin: "0 0 8px", lineHeight: 1.6,
          }}>
            Your account is now protected with an additional layer of security.
            You will need your authenticator app each time you sign in.
          </p>
          <p style={{
            fontFamily: T.font.body, fontSize: 14, color: T.color.walnut,
            margin: "0 0 24px", lineHeight: 1.5, fontWeight: 500,
          }}>
            Important: Make sure you have a backup of your authenticator app data.
            If you lose access to your authenticator, you may be locked out of your account.
          </p>
          <button
            onClick={resetSetup}
            style={{
              padding: "12px 28px",
              borderRadius: 10,
              border: `1px solid ${T.color.cream}`,
              background: T.color.white,
              fontFamily: T.font.body,
              fontSize: 15,
              fontWeight: 500,
              color: T.color.charcoal,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            Done
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
