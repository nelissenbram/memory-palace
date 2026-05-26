"use client";

import React, { useState, useTransition, useEffect, useCallback } from "react";
import { T } from "@/lib/theme";
import TuscanCard from "@/components/ui/TuscanCard";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { createPasscode, getMyPasscodes, deletePasscode } from "@/lib/social/passcode-actions";
import type { PasscodeShare } from "@/lib/social/passcode-actions";
import { track } from "@/lib/analytics";

interface WingOption {
  id: string;
  name: string;
  nameKey?: string;
}

interface PasscodeModalProps {
  wings: WingOption[];
  currentWingId?: string;
  currentRoomId?: string;
  currentRoomName?: string;
  onClose: () => void;
}

const EXPIRY_OPTIONS = [
  { hours: 1, key: "expiry1h" },
  { hours: 24, key: "expiry24h" },
  { hours: 168, key: "expiry7d" },
  { hours: 720, key: "expiry30d" },
] as const;

export default function PasscodeModal({
  wings,
  currentWingId,
  currentRoomId,
  currentRoomName,
  onClose,
}: PasscodeModalProps) {
  const { t } = useTranslation("social");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<"link" | "code" | null>(null);

  // Form state
  const [selectedWingIds, setSelectedWingIds] = useState<string[]>(
    currentWingId ? [currentWingId] : []
  );
  const [shareRoom, setShareRoom] = useState(!!currentRoomId);
  const [customPasscode, setCustomPasscode] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [expiryHours, setExpiryHours] = useState(24);

  // Result state
  const [createdShare, setCreatedShare] = useState<PasscodeShare | null>(null);

  // Active passcodes list
  const [activeShares, setActiveShares] = useState<PasscodeShare[]>([]);
  const [showManage, setShowManage] = useState(false);

  // Load active passcodes
  useEffect(() => {
    getMyPasscodes().then((res) => {
      if (res.ok) setActiveShares(res.shares);
    });
  }, [createdShare]);

  // Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isPending) onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isPending, onClose]);

  const toggleWing = useCallback((wingId: string) => {
    setSelectedWingIds((prev) =>
      prev.includes(wingId)
        ? prev.filter((id) => id !== wingId)
        : [...prev, wingId]
    );
  }, []);

  const handleCreate = () => {
    startTransition(async () => {
      setError(null);

      // Create one share per selected wing (or one for the room)
      if (shareRoom && currentRoomId) {
        const result = await createPasscode({
          roomId: currentRoomId,
          passcode: useCustom ? customPasscode : undefined,
          expiresInHours: expiryHours,
        });
        if (!result.ok) {
          setError(result.error || t("passcodeError"));
          return;
        }
        setCreatedShare(result.share!);
        track("passcode_created", { type: "room", expiryHours });
      } else if (selectedWingIds.length > 0) {
        // Create for the first selected wing
        const result = await createPasscode({
          wingId: selectedWingIds[0],
          passcode: useCustom ? customPasscode : undefined,
          expiresInHours: expiryHours,
        });
        if (!result.ok) {
          setError(result.error || t("passcodeError"));
          return;
        }
        setCreatedShare(result.share!);
        track("passcode_created", { type: "wing", expiryHours });
      } else {
        setError(t("passcodeSelectWing"));
        return;
      }
    });
  };

  const handleDelete = (shareId: string) => {
    startTransition(async () => {
      const result = await deletePasscode(shareId);
      if (result.ok) {
        setActiveShares((prev) => prev.filter((s) => s.id !== shareId));
      }
    });
  };

  const copyToClipboard = async (text: string, type: "link" | "code") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Fallback
    }
  };

  const shareUrl = createdShare
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/passcode`
    : "";

  const displayPasscode = createdShare?.passcode?.toUpperCase() || "";

  // ── Styles ──
  const labelStyle: React.CSSProperties = {
    fontFamily: T.font.body,
    fontSize: "0.8125rem",
    fontWeight: 600,
    color: T.color.charcoal,
    display: "block",
    marginBottom: "0.375rem",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    fontFamily: T.font.body,
    fontSize: "0.875rem",
    padding: "0.625rem 0.875rem",
    borderRadius: "0.625rem",
    border: `1px solid ${T.color.sandstone}`,
    background: T.color.cream,
    color: T.color.charcoal,
    outline: "none",
    boxSizing: "border-box",
  };

  const btnSecondary: React.CSSProperties = {
    fontFamily: T.font.body,
    fontSize: "0.875rem",
    padding: "0.625rem 1.25rem",
    borderRadius: "0.625rem",
    border: `1px solid ${T.color.sandstone}`,
    background: "transparent",
    color: T.color.walnut,
    cursor: "pointer",
  };

  const btnPrimary: React.CSSProperties = {
    fontFamily: T.font.body,
    fontSize: "0.875rem",
    fontWeight: 600,
    padding: "0.625rem 1.5rem",
    borderRadius: "0.625rem",
    border: "none",
    background: `linear-gradient(135deg, ${T.color.gold}, ${T.color.goldDark})`,
    color: T.color.cream,
    cursor: isPending ? "wait" : "pointer",
    opacity: isPending ? 0.6 : 1,
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="passcode-title"
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
        if (e.target === e.currentTarget && !isPending) onClose();
      }}
    >
      <TuscanCard
        variant="solid"
        padding="2rem"
        style={{
          width: "min(30rem, 92vw)",
          maxHeight: "85vh",
          overflow: "auto",
        }}
      >
        <h2
          id="passcode-title"
          style={{
            fontFamily: T.font.display,
            fontSize: "1.5rem",
            fontWeight: 600,
            color: T.color.charcoal,
            margin: "0 0 0.25rem",
          }}
        >
          {t("passcodeTitle")}
        </h2>
        <p
          style={{
            fontFamily: T.font.body,
            fontSize: "0.875rem",
            color: T.color.muted,
            margin: "0 0 1.5rem",
          }}
        >
          {t("passcodeSubtitle")}
        </p>

        {/* ── Created share result ── */}
        {createdShare ? (
          <div>
            <div
              style={{
                background: `${T.color.success}10`,
                border: `1px solid ${T.color.success}40`,
                borderRadius: "0.75rem",
                padding: "1.25rem",
                marginBottom: "1.25rem",
              }}
            >
              <p
                style={{
                  fontFamily: T.font.body,
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: T.color.success,
                  margin: "0 0 1rem",
                }}
              >
                {t("passcodeCreated")}
              </p>

              {/* Passcode display */}
              <label style={labelStyle}>{t("passcodeLabel")}</label>
              <div
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  alignItems: "center",
                  marginBottom: "1rem",
                }}
              >
                <code
                  style={{
                    flex: 1,
                    fontFamily: "monospace",
                    fontSize: "1.5rem",
                    fontWeight: 700,
                    letterSpacing: "0.25rem",
                    padding: "0.75rem 1rem",
                    background: T.color.cream,
                    border: `1px solid ${T.color.sandstone}`,
                    borderRadius: "0.625rem",
                    color: T.color.charcoal,
                    textAlign: "center",
                  }}
                >
                  {displayPasscode}
                </code>
                <button
                  onClick={() => copyToClipboard(displayPasscode, "code")}
                  style={{
                    ...btnSecondary,
                    padding: "0.75rem",
                    flexShrink: 0,
                  }}
                >
                  {copied === "code" ? t("copied") : t("copyCode")}
                </button>
              </div>

              {/* Share link */}
              <label style={labelStyle}>{t("passcodeLink")}</label>
              <div
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  alignItems: "center",
                }}
              >
                <input
                  readOnly
                  value={shareUrl}
                  style={{ ...inputStyle, fontSize: "0.8125rem" }}
                />
                <button
                  onClick={() => copyToClipboard(shareUrl, "link")}
                  style={{
                    ...btnSecondary,
                    padding: "0.625rem 0.75rem",
                    flexShrink: 0,
                  }}
                >
                  {copied === "link" ? t("copied") : t("copyLink")}
                </button>
              </div>

              <p
                style={{
                  fontFamily: T.font.body,
                  fontSize: "0.75rem",
                  color: T.color.muted,
                  margin: "1rem 0 0",
                }}
              >
                {t("passcodeExpiryNote", {
                  expiry: new Date(createdShare.expiresAt).toLocaleString(),
                })}
              </p>
            </div>

            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                justifyContent: "flex-end",
              }}
            >
              <button onClick={onClose} style={btnSecondary}>
                {t("close")}
              </button>
              <button
                onClick={() => setCreatedShare(null)}
                style={btnPrimary}
              >
                {t("passcodeCreateAnother")}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* ── Share target selection ── */}
            {currentRoomId && (
              <div style={{ marginBottom: "1.25rem" }}>
                <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={shareRoom}
                    onChange={() => setShareRoom(!shareRoom)}
                    style={{ accentColor: T.color.gold }}
                  />
                  {t("passcodeShareRoom", { name: currentRoomName || "" })}
                </label>
              </div>
            )}

            {!shareRoom && (
              <div style={{ marginBottom: "1.25rem" }}>
                <label style={labelStyle}>{t("passcodeSelectWings")}</label>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "0.5rem",
                  }}
                >
                  {wings.map((w) => (
                    <button
                      key={w.id}
                      onClick={() => toggleWing(w.id)}
                      style={{
                        fontFamily: T.font.body,
                        fontSize: "0.8125rem",
                        fontWeight: selectedWingIds.includes(w.id) ? 600 : 400,
                        padding: "0.5rem 0.875rem",
                        borderRadius: "0.5rem",
                        border: `1px solid ${selectedWingIds.includes(w.id) ? T.color.gold : T.color.sandstone}`,
                        background: selectedWingIds.includes(w.id) ? `${T.color.gold}15` : "transparent",
                        color: selectedWingIds.includes(w.id) ? T.color.goldDark : T.color.walnut,
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {w.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Expiry picker ── */}
            <div style={{ marginBottom: "1.25rem" }}>
              <label style={labelStyle}>{t("passcodeExpiry")}</label>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {EXPIRY_OPTIONS.map((opt) => (
                  <button
                    key={opt.hours}
                    onClick={() => setExpiryHours(opt.hours)}
                    style={{
                      fontFamily: T.font.body,
                      fontSize: "0.8125rem",
                      fontWeight: expiryHours === opt.hours ? 600 : 400,
                      padding: "0.5rem 0.875rem",
                      borderRadius: "0.5rem",
                      border: `1px solid ${expiryHours === opt.hours ? T.color.gold : T.color.sandstone}`,
                      background: expiryHours === opt.hours ? `${T.color.gold}15` : "transparent",
                      color: expiryHours === opt.hours ? T.color.goldDark : T.color.walnut,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {t(opt.key)}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Custom passcode ── */}
            <div style={{ marginBottom: "1.25rem" }}>
              <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={useCustom}
                  onChange={() => setUseCustom(!useCustom)}
                  style={{ accentColor: T.color.gold }}
                />
                {t("passcodeCustom")}
              </label>
              {useCustom && (
                <input
                  type="text"
                  value={customPasscode}
                  onChange={(e) => setCustomPasscode(e.target.value)}
                  placeholder={t("passcodeCustomPlaceholder")}
                  maxLength={20}
                  style={{ ...inputStyle, marginTop: "0.5rem" }}
                />
              )}
              {!useCustom && (
                <p
                  style={{
                    fontFamily: T.font.body,
                    fontSize: "0.75rem",
                    color: T.color.muted,
                    margin: "0.375rem 0 0",
                  }}
                >
                  {t("passcodeAutoGenerate")}
                </p>
              )}
            </div>

            {/* ── Active passcodes toggle ── */}
            {activeShares.length > 0 && (
              <div style={{ marginBottom: "1.25rem" }}>
                <button
                  onClick={() => setShowManage(!showManage)}
                  style={{
                    fontFamily: T.font.body,
                    fontSize: "0.8125rem",
                    color: T.color.walnut,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    textDecoration: "underline",
                    padding: 0,
                  }}
                >
                  {t("passcodeManage", { count: String(activeShares.length) })}
                </button>
                {showManage && (
                  <div
                    style={{
                      marginTop: "0.75rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.5rem",
                    }}
                  >
                    {activeShares.map((s) => (
                      <div
                        key={s.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "0.5rem 0.75rem",
                          borderRadius: "0.5rem",
                          border: `1px solid ${T.color.sandstone}`,
                          background: T.color.cream,
                        }}
                      >
                        <div>
                          <code
                            style={{
                              fontFamily: "monospace",
                              fontSize: "0.875rem",
                              fontWeight: 600,
                              color: T.color.charcoal,
                              letterSpacing: "0.125rem",
                            }}
                          >
                            {s.passcode.toUpperCase()}
                          </code>
                          <span
                            style={{
                              fontFamily: T.font.body,
                              fontSize: "0.75rem",
                              color: T.color.muted,
                              marginLeft: "0.75rem",
                            }}
                          >
                            {t("passcodeExpiresAt", {
                              date: new Date(s.expiresAt).toLocaleDateString(),
                            })}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDelete(s.id)}
                          disabled={isPending}
                          style={{
                            fontFamily: T.font.body,
                            fontSize: "0.75rem",
                            color: T.color.error,
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: "0.25rem 0.5rem",
                          }}
                        >
                          {t("passcodeRevoke")}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {error && (
              <p
                style={{
                  fontFamily: T.font.body,
                  fontSize: "0.8125rem",
                  color: T.color.error,
                  margin: "0 0 1rem",
                }}
              >
                {error}
              </p>
            )}

            {/* ── Actions ── */}
            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                justifyContent: "flex-end",
                marginTop: "1.5rem",
              }}
            >
              <button onClick={onClose} style={btnSecondary}>
                {t("cancel")}
              </button>
              <button
                onClick={handleCreate}
                disabled={isPending}
                style={btnPrimary}
              >
                {isPending ? t("passcodeCreating") : t("passcodeCreate")}
              </button>
            </div>
          </>
        )}
      </TuscanCard>
    </div>
  );
}
