"use client";

import { useState, useEffect, useCallback } from "react";
import { T } from "@/lib/theme";
import { createClient } from "@/lib/supabase/client";
import { updateProfile, requestPasswordReset, deleteAccount } from "@/lib/auth/profile-actions";
import MFASetup from "@/components/settings/MFASetup";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useAccessibility } from "@/components/providers/AccessibilityProvider";

interface ProfileData {
  display_name: string;
  email: string;
  goal: string;
  bio: string;
  avatar_url: string;
}

const GOAL_IDS = ["preserve", "legacy", "share", "organize"] as const;
const GOAL_LABEL_KEYS: Record<string, string> = {
  preserve: "goalPreserve",
  legacy: "goalLegacy",
  share: "goalShare",
  organize: "goalOrganize",
};

export default function ProfilePage() {
  const { t, locale, setLocale } = useTranslation("settings");
  const { t: tOnboard } = useTranslation("onboarding");
  const { t: tc } = useTranslation("common");
  const { t: tA11y } = useTranslation("accessibility");
  const { accessibilityMode, toggleAccessibility } = useAccessibility();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Editable fields
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [goal, setGoal] = useState("");
  const [styleEra, setStyleEra] = useState("");

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
  }, []);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  // Load profile
  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (data) {
          const p: ProfileData = {
            display_name: data.display_name || "",
            email: user.email || "",
            goal: data.goal || "",
            bio: data.bio || "",
            avatar_url: data.avatar_url || "",
          };
          setProfile(p);
          setDisplayName(p.display_name);
          setBio(p.bio);
          setGoal(p.goal);
          setStyleEra(data.style_era || "roman");
        }
      } catch {
        // ignore
      }
      setLoading(false);
    }
    load();
  }, []);

  const hasChanges =
    profile &&
    (displayName !== profile.display_name ||
      bio !== profile.bio ||
      goal !== profile.goal);

  const handleSave = async () => {
    setSaving(true);
    const result = await updateProfile({
      displayName,
      bio,
      goal,
    });

    if (result.error) {
      showToast(result.error, "error");
    } else {
      // Optimistic update
      setProfile((prev) =>
        prev
          ? { ...prev, display_name: displayName, bio, goal }
          : prev
      );
      showToast(t("profileSaved"), "success");
    }
    setSaving(false);
  };

  const handlePasswordReset = async () => {
    const result = await requestPasswordReset();
    if (result.error) {
      showToast(result.error, "error");
    } else {
      showToast(t("passwordResetSent"), "success");
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteText !== "DELETE") return;
    setDeleting(true);
    const result = await deleteAccount();
    if (result.error) {
      showToast(result.error, "error");
      setDeleting(false);
    } else {
      window.location.href = "/login";
    }
  };

  const handleExportData = async () => {
    setExporting(true);
    try {
      const response = await fetch("/api/export/zip");
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Export failed" }));
        showToast(err.error || t("exportZipError"), "error");
        setExporting(false);
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const disposition = response.headers.get("Content-Disposition");
      const filenameMatch = disposition?.match(/filename="(.+)"/);
      a.download = filenameMatch?.[1] || "memory-palace-export.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(t("exportZipSuccess"), "success");
    } catch {
      showToast(t("exportZipError"), "error");
    }
    setExporting(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";
  };

  if (loading) {
    return (
      <div style={{
        padding: 48, textAlign: "center",
        fontFamily: T.font.body, fontSize: 16, color: T.color.muted,
      }}>
        {t("loadingProfile")}
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{
        padding: 48, textAlign: "center",
        fontFamily: T.font.body, fontSize: 16, color: T.color.muted,
      }}>
        {t("profileLoadError")}
      </div>
    );
  }

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 24, right: 24, zIndex: 100,
          padding: "14px 20px", borderRadius: 12,
          background: toast.type === "success" ? "#4A6741" : "#C05050",
          color: "#FFF",
          fontFamily: T.font.body, fontSize: 14, fontWeight: 500,
          boxShadow: "0 8px 24px rgba(0,0,0,.15)",
          animation: "fadeIn .2s ease",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span>{toast.type === "success" ? "\u2713" : "\u26A0"}</span>
          {toast.message}
          <button onClick={() => setToast(null)} style={{
            background: "none", border: "none", color: "#FFF",
            fontSize: 16, cursor: "pointer", marginLeft: 8, opacity: 0.7,
          }}>{"\u2715"}</button>
        </div>
      )}

      {/* Page header */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{
          fontFamily: T.font.display, fontSize: 28, fontWeight: 500,
          color: T.color.charcoal, margin: "0 0 8px",
        }}>
          {t("yourProfile")}
        </h2>
        <p style={{
          fontFamily: T.font.body, fontSize: 15, color: T.color.muted,
          margin: 0, lineHeight: 1.5,
        }}>
          {t("profileDescription")}
        </p>
      </div>

      {/* ── Profile Card ── */}
      <div style={{
        background: T.color.white,
        borderRadius: 16,
        border: `1px solid ${T.color.cream}`,
        padding: "28px 32px",
        boxShadow: "0 2px 8px rgba(44,44,42,.04)",
        marginBottom: 24,
      }}>
        {/* Avatar + Name header */}
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 28 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 36,
            background: `linear-gradient(135deg, ${T.color.terracotta}, ${T.color.walnut})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#FFF",
            fontFamily: T.font.display, fontSize: 28, fontWeight: 600,
            letterSpacing: "1px",
            flexShrink: 0,
          }}>
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Avatar"
                style={{
                  width: 72, height: 72, borderRadius: 36,
                  objectFit: "cover",
                }}
              />
            ) : (
              getInitials(displayName || profile.display_name)
            )}
          </div>
          <div>
            <div style={{
              fontFamily: T.font.display, fontSize: 22, fontWeight: 500,
              color: T.color.charcoal,
            }}>
              {displayName || t("namePlaceholder")}
            </div>
            <div style={{
              fontFamily: T.font.body, fontSize: 14, color: T.color.muted,
              marginTop: 4,
            }}>
              {profile.email}
            </div>
          </div>
        </div>

        {/* Form fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {/* Display Name */}
          <div>
            <label style={labelStyle}>{t("displayName")}</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t("namePlaceholder")}
              style={inputStyle}
            />
          </div>

          {/* Email (read-only) */}
          <div>
            <label style={labelStyle}>{t("emailAddress")}</label>
            <input
              type="email"
              value={profile.email}
              readOnly
              style={{
                ...inputStyle,
                background: T.color.warmStone,
                color: T.color.muted,
                cursor: "not-allowed",
              }}
            />
            <p style={{
              fontFamily: T.font.body, fontSize: 12, color: T.color.muted,
              margin: "6px 0 0", lineHeight: 1.4,
            }}>
              {t("emailReadonlyNote")}
            </p>
          </div>

          {/* Bio */}
          <div>
            <label style={labelStyle}>{t("aboutMe")}</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={t("aboutMePlaceholder")}
              rows={4}
              style={{
                ...inputStyle,
                resize: "vertical",
                minHeight: 100,
                lineHeight: 1.6,
              }}
            />
          </div>

          {/* Goal */}
          <div>
            <label style={labelStyle}>{t("yourGoal")}</label>
            <p style={{
              fontFamily: T.font.body, fontSize: 13, color: T.color.muted,
              margin: "0 0 10px", lineHeight: 1.4,
            }}>
              {t("goalDescription")}
            </p>
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
            }}>
              {GOAL_IDS.map((gId) => (
                <button
                  key={gId}
                  onClick={() => setGoal(gId)}
                  style={{
                    padding: "14px 16px",
                    borderRadius: 12,
                    border: `2px solid ${goal === gId ? T.color.terracotta : T.color.cream}`,
                    background: goal === gId ? `${T.color.terracotta}12` : T.color.linen,
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all .2s",
                    fontFamily: T.font.body,
                    fontSize: 14,
                    fontWeight: goal === gId ? 600 : 400,
                    color: goal === gId ? T.color.terracotta : T.color.charcoal,
                  }}
                >
                  {tOnboard(GOAL_LABEL_KEYS[gId])}
                </button>
              ))}
            </div>
          </div>

          {/* Palace Style */}
          <div>
            <label style={labelStyle}>{t("palaceStyle")}</label>
            <p style={{
              fontFamily: T.font.body, fontSize: 13, color: T.color.muted,
              margin: "0 0 10px", lineHeight: 1.4,
            }}>
              {t("palaceStyleDesc")}
            </p>
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
            }}>
              {(["roman", "renaissance"] as const).map((era) => {
                const isComingSoon = era === "renaissance";
                return (
                <button
                  key={era}
                  onClick={async () => {
                    if (isComingSoon) return;
                    setStyleEra(era);
                    await updateProfile({ styleEra: era });
                    showToast(t("palaceStyleUpdated"), "success");
                  }}
                  style={{
                    padding: "14px 16px",
                    borderRadius: 12,
                    border: `2px solid ${styleEra === era && !isComingSoon ? (era === "roman" ? T.era.roman.secondary : T.era.renaissance.accent) : T.color.cream}`,
                    background: styleEra === era && !isComingSoon ? `${era === "roman" ? T.era.roman.secondary : T.era.renaissance.accent}12` : T.color.linen,
                    cursor: isComingSoon ? "default" : "pointer",
                    opacity: isComingSoon ? 0.55 : 1,
                    textAlign: "left",
                    transition: "all .2s",
                    fontFamily: T.font.body,
                    fontSize: 14,
                    fontWeight: styleEra === era && !isComingSoon ? 600 : 400,
                    color: styleEra === era && !isComingSoon ? (era === "roman" ? T.era.roman.secondary : T.era.renaissance.accent) : T.color.charcoal,
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>
                    {era === "roman" ? t("romanName") : t("renaissanceName")}
                    {isComingSoon && <span style={{ fontSize: 11, fontWeight: 600, marginLeft: 8, color: T.color.muted, textTransform: "uppercase", letterSpacing: ".5px" }}>{t("comingSoon")}</span>}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 400, color: T.color.muted }}>
                    {era === "roman" ? t("romanDesc") : t("renaissanceDesc")}
                  </div>
                </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Save button */}
        <div style={{ marginTop: 28, display: "flex", gap: 12 }}>
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            style={{
              padding: "14px 32px",
              borderRadius: 12,
              border: "none",
              background:
                !hasChanges || saving
                  ? `${T.color.sandstone}60`
                  : `linear-gradient(135deg, ${T.color.terracotta}, ${T.color.walnut})`,
              color: !hasChanges || saving ? T.color.muted : "#FFF",
              fontFamily: T.font.body,
              fontSize: 15,
              fontWeight: 600,
              cursor: !hasChanges || saving ? "default" : "pointer",
              transition: "all .2s",
            }}
          >
            {saving ? t("saving") : t("saveChanges")}
          </button>
          {hasChanges && (
            <button
              onClick={() => {
                setDisplayName(profile.display_name);
                setBio(profile.bio);
                setGoal(profile.goal);
              }}
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
                transition: "all .2s",
              }}
            >
              {tc("discard")}
            </button>
          )}
        </div>
      </div>

      {/* ── Account Section ── */}
      <div style={{
        background: T.color.white,
        borderRadius: 16,
        border: `1px solid ${T.color.cream}`,
        padding: "28px 32px",
        boxShadow: "0 2px 8px rgba(44,44,42,.04)",
        marginBottom: 24,
      }}>
        <h3 style={{
          fontFamily: T.font.display, fontSize: 20, fontWeight: 500,
          color: T.color.charcoal, margin: "0 0 6px",
        }}>
          {t("account")}
        </h3>
        <p style={{
          fontFamily: T.font.body, fontSize: 14, color: T.color.muted,
          margin: "0 0 22px", lineHeight: 1.5,
        }}>
          {t("accountDescription")}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Change Password */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "18px 20px", borderRadius: 12,
            background: T.color.linen,
            border: `1px solid ${T.color.cream}`,
          }}>
            <div>
              <div style={{
                fontFamily: T.font.body, fontSize: 15, fontWeight: 500,
                color: T.color.charcoal,
              }}>
                {t("changePassword")}
              </div>
              <div style={{
                fontFamily: T.font.body, fontSize: 13, color: T.color.muted,
                marginTop: 4,
              }}>
                {t("changePasswordDesc")}
              </div>
            </div>
            <button
              onClick={handlePasswordReset}
              style={{
                padding: "12px 24px",
                borderRadius: 10,
                border: `1px solid ${T.color.cream}`,
                background: T.color.white,
                fontFamily: T.font.body,
                fontSize: 14,
                fontWeight: 500,
                color: T.color.charcoal,
                cursor: "pointer",
                transition: "all .15s",
                flexShrink: 0,
              }}
            >
              {t("sendResetLink")}
            </button>
          </div>

          {/* Download My Data */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "18px 20px", borderRadius: 12,
            background: T.color.linen,
            border: `1px solid ${T.color.cream}`,
          }}>
            <div>
              <div style={{
                fontFamily: T.font.body, fontSize: 15, fontWeight: 500,
                color: T.color.charcoal,
              }}>
                {t("exportZip")}
              </div>
              <div style={{
                fontFamily: T.font.body, fontSize: 13, color: T.color.muted,
                marginTop: 4, maxWidth: 380, lineHeight: 1.4,
              }}>
                {t("exportZipDesc")}
              </div>
            </div>
            <button
              onClick={handleExportData}
              disabled={exporting}
              style={{
                padding: "12px 24px",
                borderRadius: 10,
                border: `1px solid ${T.color.cream}`,
                background: exporting ? `${T.color.sandstone}60` : T.color.white,
                fontFamily: T.font.body,
                fontSize: 14,
                fontWeight: 500,
                color: exporting ? T.color.muted : T.color.charcoal,
                cursor: exporting ? "default" : "pointer",
                transition: "all .15s",
                flexShrink: 0,
              }}
            >
              {exporting ? t("exportingZip") : t("exportZip")}
            </button>
          </div>
        </div>
      </div>

      {/* ── Security: Two-Factor Authentication ── */}
      <MFASetup />

      {/* ── Language ── */}
      <div style={{
        background: T.color.white,
        borderRadius: 16,
        border: `1px solid ${T.color.cream}`,
        padding: "28px 32px",
        boxShadow: "0 2px 8px rgba(44,44,42,.04)",
        marginBottom: 24,
      }}>
        <h3 style={{
          fontFamily: T.font.display, fontSize: 20, fontWeight: 500,
          color: T.color.charcoal, margin: "0 0 16px",
        }}>
          {tc("language")}
        </h3>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => setLocale("en")}
            style={{
              padding: "14px 24px",
              borderRadius: 12,
              border: `2px solid ${locale === "en" ? T.color.terracotta : T.color.cream}`,
              background: locale === "en" ? `${T.color.terracotta}12` : T.color.linen,
              cursor: "pointer",
              fontFamily: T.font.body,
              fontSize: 15,
              fontWeight: locale === "en" ? 600 : 400,
              color: locale === "en" ? T.color.terracotta : T.color.charcoal,
              transition: "all .2s",
            }}
          >
            {tc("english")} (EN)
          </button>
          <button
            onClick={() => setLocale("nl")}
            style={{
              padding: "14px 24px",
              borderRadius: 12,
              border: `2px solid ${locale === "nl" ? T.color.terracotta : T.color.cream}`,
              background: locale === "nl" ? `${T.color.terracotta}12` : T.color.linen,
              cursor: "pointer",
              fontFamily: T.font.body,
              fontSize: 15,
              fontWeight: locale === "nl" ? 600 : 400,
              color: locale === "nl" ? T.color.terracotta : T.color.charcoal,
              transition: "all .2s",
            }}
          >
            {tc("dutch")} (NL)
          </button>
        </div>
      </div>

      {/* ── Accessibility ── */}
      <div style={{
        background: T.color.white,
        borderRadius: 16,
        border: `1px solid ${T.color.cream}`,
        padding: "28px 32px",
        boxShadow: "0 2px 8px rgba(44,44,42,.04)",
        marginBottom: 24,
      }}>
        <h3 style={{
          fontFamily: T.font.display, fontSize: 20, fontWeight: 500,
          color: T.color.charcoal, margin: "0 0 16px",
        }}>
          {tA11y("title")}
        </h3>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 20px", borderRadius: 12,
          background: T.color.linen,
          border: `1px solid ${T.color.cream}`,
        }}>
          <div>
            <div style={{
              fontFamily: T.font.body, fontSize: 15, fontWeight: 500,
              color: T.color.charcoal,
            }}>
              {tA11y("mode")}
            </div>
            <div style={{
              fontFamily: T.font.body, fontSize: 13, color: T.color.muted,
              marginTop: 4, lineHeight: 1.4,
            }}>
              {tA11y("modeDescription")}
            </div>
          </div>
          <button
            onClick={() => {
              toggleAccessibility();
              showToast(accessibilityMode ? tA11y("disabled") : tA11y("enabled"), "success");
            }}
            style={{
              width: 52,
              height: 28,
              borderRadius: 14,
              border: "none",
              background: accessibilityMode
                ? T.color.sage
                : T.color.sandstone,
              cursor: "pointer",
              position: "relative",
              transition: "background .2s",
              flexShrink: 0,
            }}
          >
            <span style={{
              position: "absolute",
              top: 3,
              left: accessibilityMode ? 27 : 3,
              width: 22,
              height: 22,
              borderRadius: 11,
              background: T.color.white,
              boxShadow: "0 1px 4px rgba(0,0,0,.15)",
              transition: "left .2s",
            }} />
          </button>
        </div>
      </div>

      {/* ── Danger Zone ── */}
      <div style={{
        background: T.color.white,
        borderRadius: 16,
        border: `1px solid #C0505020`,
        padding: "28px 32px",
        boxShadow: "0 2px 8px rgba(44,44,42,.04)",
      }}>
        <h3 style={{
          fontFamily: T.font.display, fontSize: 20, fontWeight: 500,
          color: "#C05050", margin: "0 0 6px",
        }}>
          {t("dangerZone")}
        </h3>
        <p style={{
          fontFamily: T.font.body, fontSize: 14, color: T.color.muted,
          margin: "0 0 18px", lineHeight: 1.5,
        }}>
          {t("dangerDescription")}
        </p>

        {!deleteConfirm ? (
          <button
            onClick={() => setDeleteConfirm(true)}
            style={{
              padding: "14px 28px",
              borderRadius: 12,
              border: `1px solid #C0505033`,
              background: "#C0505008",
              fontFamily: T.font.body,
              fontSize: 15,
              fontWeight: 600,
              color: "#C05050",
              cursor: "pointer",
              transition: "all .15s",
            }}
          >
            {t("deleteAccount")}
          </button>
        ) : (
          <div style={{
            padding: "20px 24px", borderRadius: 14,
            background: "#FDF2F2",
            border: "1px solid #FECACA",
          }}>
            <p style={{
              fontFamily: T.font.body, fontSize: 15, fontWeight: 500,
              color: "#B91C1C", margin: "0 0 12px",
            }}>
              {t("deleteConfirmTitle")}
            </p>
            <p style={{
              fontFamily: T.font.body, fontSize: 14, color: "#7F1D1D",
              margin: "0 0 16px", lineHeight: 1.5,
            }}
              dangerouslySetInnerHTML={{ __html: t("deleteConfirmDescription") }}
            />
            <input
              type="text"
              value={deleteText}
              onChange={(e) => setDeleteText(e.target.value)}
              placeholder={t("deleteConfirmPlaceholder")}
              style={{
                ...inputStyle,
                borderColor: "#FECACA",
                marginBottom: 14,
              }}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteText !== "DELETE" || deleting}
                style={{
                  padding: "12px 24px",
                  borderRadius: 10,
                  border: "none",
                  background:
                    deleteText === "DELETE" && !deleting
                      ? "#B91C1C"
                      : `${T.color.sandstone}60`,
                  color:
                    deleteText === "DELETE" && !deleting
                      ? "#FFF"
                      : T.color.muted,
                  fontFamily: T.font.body,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor:
                    deleteText === "DELETE" && !deleting
                      ? "pointer"
                      : "default",
                  transition: "all .15s",
                }}
              >
                {deleting ? t("deleting") : t("permanentlyDelete")}
              </button>
              <button
                onClick={() => {
                  setDeleteConfirm(false);
                  setDeleteText("");
                }}
                style={{
                  padding: "12px 24px",
                  borderRadius: 10,
                  border: `1px solid ${T.color.cream}`,
                  background: T.color.white,
                  fontFamily: T.font.body,
                  fontSize: 14,
                  fontWeight: 500,
                  color: T.color.charcoal,
                  cursor: "pointer",
                  transition: "all .15s",
                }}
              >
                {tc("cancel")}
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}

// ── Shared styles ──
const labelStyle: React.CSSProperties = {
  fontFamily: T.font.body,
  fontSize: 13,
  fontWeight: 600,
  color: T.color.walnut,
  letterSpacing: ".3px",
  textTransform: "uppercase" as const,
  display: "block",
  marginBottom: 8,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 18px",
  borderRadius: 12,
  border: `1.5px solid ${T.color.sandstone}`,
  background: T.color.white,
  fontFamily: T.font.body,
  fontSize: 15,
  color: T.color.charcoal,
  outline: "none",
  boxSizing: "border-box" as const,
  transition: "border-color .2s",
};
