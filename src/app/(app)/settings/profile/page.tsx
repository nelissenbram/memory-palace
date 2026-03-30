"use client";

import { useState, useEffect, useCallback } from "react";
import { T } from "@/lib/theme";
import { createClient } from "@/lib/supabase/client";
import { updateProfile, requestPasswordReset, deleteAccount } from "@/lib/auth/profile-actions";
import MFASetup from "@/components/settings/MFASetup";
import ExportPanel from "@/components/settings/ExportPanel";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useAccessibility } from "@/components/providers/AccessibilityProvider";
import { useDaylight } from "@/components/providers/DaylightProvider";

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

/** Format hour (0-24 float) as HH:MM */
function formatDaylightHour(h: number): string {
  const hr = Math.floor(h) % 24;
  const min = Math.round((h - Math.floor(h)) * 60);
  return `${String(hr).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

/** Get a period label for the given hour */
function daylightPeriodLabel(h: number, t: (k: string) => string): string {
  if (h >= 22 || h < 5) return t("daylight_night");
  if (h >= 5 && h < 9) return t("daylight_morning");
  if (h >= 9 && h < 16) return t("daylight_midday");
  return t("daylight_evening");
}

export default function ProfilePage() {
  const { t, locale, setLocale } = useTranslation("settings");
  const { t: tOnboard } = useTranslation("onboarding");
  const { t: tc } = useTranslation("common");
  const { t: tA11y } = useTranslation("accessibility");
  const { accessibilityMode, toggleAccessibility } = useAccessibility();
  const { daylightEnabled, daylightMode, customHour, toggleDaylight, setDaylightMode, setCustomHour } = useDaylight();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deleting, setDeleting] = useState(false);
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
        padding: "3rem", textAlign: "center",
        fontFamily: T.font.body, fontSize: "1rem", color: T.color.muted,
      }}>
        {t("loadingProfile")}
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{
        padding: "3rem", textAlign: "center",
        fontFamily: T.font.body, fontSize: "1rem", color: T.color.muted,
      }}>
        {t("profileLoadError")}
      </div>
    );
  }

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div role={toast.type === "success" ? "status" : "alert"} aria-live={toast.type === "success" ? "polite" : "assertive"} style={{
          position: "fixed", top: "1.5rem", right: "1.5rem", zIndex: 100,
          padding: "0.875rem 1.25rem", borderRadius: "0.75rem",
          background: toast.type === "success" ? "#4A6741" : "#C05050",
          color: "#FFF",
          fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: 500,
          boxShadow: "0 8px 24px rgba(0,0,0,.15)",
          animation: "fadeIn .2s ease",
          display: "flex", alignItems: "center", gap: "0.625rem",
        }}>
          <span aria-hidden="true">{toast.type === "success" ? "\u2713" : "\u26A0"}</span>
          {toast.message}
          <button onClick={() => setToast(null)} aria-label={tc("close")} style={{
            background: "none", border: "none", color: "#FFF",
            fontSize: "1rem", cursor: "pointer", marginLeft: "0.5rem", opacity: 0.7,
          }}>{"\u2715"}</button>
        </div>
      )}

      {/* Page header */}
      <div style={{ marginBottom: "2rem" }}>
        <h2 style={{
          fontFamily: T.font.display, fontSize: "1.75rem", fontWeight: 500,
          color: T.color.charcoal, margin: "0 0 0.5rem",
        }}>
          {t("yourProfile")}
        </h2>
        <p style={{
          fontFamily: T.font.body, fontSize: "0.9375rem", color: T.color.muted,
          margin: 0, lineHeight: 1.5,
        }}>
          {t("profileDescription")}
        </p>
      </div>

      {/* ── Profile Card ── */}
      <div style={{
        background: T.color.white,
        borderRadius: "1rem",
        border: `1px solid ${T.color.cream}`,
        padding: "1.75rem 2rem",
        boxShadow: "0 2px 8px rgba(44,44,42,.04)",
        marginBottom: "1.5rem",
      }}>
        {/* Avatar + Name header */}
        <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", marginBottom: "1.75rem" }}>
          <div style={{
            width: "4.5rem", height: "4.5rem", borderRadius: "2.25rem",
            background: `linear-gradient(135deg, ${T.color.terracotta}, ${T.color.walnut})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#FFF",
            fontFamily: T.font.display, fontSize: "1.75rem", fontWeight: 600,
            letterSpacing: "1px",
            flexShrink: 0,
          }}>
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                style={{
                  width: "4.5rem", height: "4.5rem", borderRadius: "2.25rem",
                  objectFit: "cover",
                }}
              />
            ) : (
              getInitials(displayName || profile.display_name)
            )}
          </div>
          <div>
            <div style={{
              fontFamily: T.font.display, fontSize: "1.375rem", fontWeight: 500,
              color: T.color.charcoal,
            }}>
              {displayName || t("namePlaceholder")}
            </div>
            <div style={{
              fontFamily: T.font.body, fontSize: "0.875rem", color: T.color.muted,
              marginTop: "0.25rem",
            }}>
              {profile.email}
            </div>
          </div>
        </div>

        {/* Form fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.375rem" }}>
          {/* Display Name */}
          <div>
            <label htmlFor="profile-display-name" style={labelStyle}>{t("displayName")}</label>
            <input
              id="profile-display-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t("namePlaceholder")}
              style={inputStyle}
            />
          </div>

          {/* Email (read-only) */}
          <div>
            <label htmlFor="profile-email" style={labelStyle}>{t("emailAddress")}</label>
            <input
              id="profile-email"
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
              fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.muted,
              margin: "0.375rem 0 0", lineHeight: 1.4,
            }}>
              {t("emailReadonlyNote")}
            </p>
          </div>

          {/* Bio */}
          <div>
            <label htmlFor="profile-bio" style={labelStyle}>{t("aboutMe")}</label>
            <textarea
              id="profile-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={t("aboutMePlaceholder")}
              rows={4}
              style={{
                ...inputStyle,
                resize: "vertical",
                minHeight: "6.25rem",
                lineHeight: 1.6,
              }}
            />
          </div>

          {/* Goal */}
          <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
            <legend style={labelStyle}>{t("yourGoal")}</legend>
            <p style={{
              fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.muted,
              margin: "0 0 0.625rem", lineHeight: 1.4,
            }}>
              {t("goalDescription")}
            </p>
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0.625rem",
            }}>
              {GOAL_IDS.map((gId) => (
                <button
                  key={gId}
                  onClick={() => setGoal(gId)}
                  aria-pressed={goal === gId}
                  style={{
                    padding: "0.875rem 1rem",
                    borderRadius: "0.75rem",
                    border: `2px solid ${goal === gId ? T.color.terracotta : T.color.cream}`,
                    background: goal === gId ? `${T.color.terracotta}12` : T.color.linen,
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all .2s",
                    fontFamily: T.font.body,
                    fontSize: "0.875rem",
                    fontWeight: goal === gId ? 600 : 400,
                    color: goal === gId ? T.color.terracotta : T.color.charcoal,
                  }}
                >
                  {tOnboard(GOAL_LABEL_KEYS[gId])}
                </button>
              ))}
            </div>
          </fieldset>

          {/* Palace Style */}
          <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
            <legend style={labelStyle}>{t("palaceStyle")}</legend>
            <p style={{
              fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.muted,
              margin: "0 0 0.625rem", lineHeight: 1.4,
            }}>
              {t("palaceStyleDesc")}
            </p>
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0.625rem",
            }}>
              {(["roman", "renaissance"] as const).map((era) => {
                const isComingSoon = era === "renaissance";
                return (
                <button
                  key={era}
                  aria-pressed={styleEra === era && !isComingSoon}
                  onClick={async () => {
                    if (isComingSoon) return;
                    setStyleEra(era);
                    await updateProfile({ styleEra: era });
                    showToast(t("palaceStyleUpdated"), "success");
                  }}
                  style={{
                    padding: "0.875rem 1rem",
                    borderRadius: "0.75rem",
                    border: `2px solid ${styleEra === era && !isComingSoon ? (era === "roman" ? T.era.roman.secondary : T.era.renaissance.accent) : T.color.cream}`,
                    background: styleEra === era && !isComingSoon ? `${era === "roman" ? T.era.roman.secondary : T.era.renaissance.accent}12` : T.color.linen,
                    cursor: isComingSoon ? "default" : "pointer",
                    opacity: isComingSoon ? 0.55 : 1,
                    textAlign: "left",
                    transition: "all .2s",
                    fontFamily: T.font.body,
                    fontSize: "0.875rem",
                    fontWeight: styleEra === era && !isComingSoon ? 600 : 400,
                    color: styleEra === era && !isComingSoon ? (era === "roman" ? T.era.roman.secondary : T.era.renaissance.accent) : T.color.charcoal,
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>
                    {era === "roman" ? t("romanName") : t("renaissanceName")}
                    {isComingSoon && <span style={{ fontSize: "0.6875rem", fontWeight: 600, marginLeft: "0.5rem", color: T.color.muted, textTransform: "uppercase", letterSpacing: ".5px" }}>{t("comingSoon")}</span>}
                  </div>
                  <div style={{ fontSize: "0.75rem", fontWeight: 400, color: T.color.muted }}>
                    {era === "roman" ? t("romanDesc") : t("renaissanceDesc")}
                  </div>
                </button>
                );
              })}
            </div>
          </fieldset>
        </div>

        {/* Save button */}
        <div style={{ marginTop: "1.75rem", display: "flex", gap: "0.75rem" }}>
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            style={{
              padding: "0.875rem 2rem",
              borderRadius: "0.75rem",
              border: "none",
              background:
                !hasChanges || saving
                  ? `${T.color.sandstone}60`
                  : `linear-gradient(135deg, ${T.color.terracotta}, ${T.color.walnut})`,
              color: !hasChanges || saving ? T.color.muted : "#FFF",
              fontFamily: T.font.body,
              fontSize: "0.9375rem",
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
                padding: "0.875rem 1.5rem",
                borderRadius: "0.75rem",
                border: `1px solid ${T.color.cream}`,
                background: "transparent",
                color: T.color.muted,
                fontFamily: T.font.body,
                fontSize: "0.9375rem",
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
        borderRadius: "1rem",
        border: `1px solid ${T.color.cream}`,
        padding: "1.75rem 2rem",
        boxShadow: "0 2px 8px rgba(44,44,42,.04)",
        marginBottom: "1.5rem",
      }}>
        <h3 style={{
          fontFamily: T.font.display, fontSize: "1.25rem", fontWeight: 500,
          color: T.color.charcoal, margin: "0 0 0.375rem",
        }}>
          {t("account")}
        </h3>
        <p style={{
          fontFamily: T.font.body, fontSize: "0.875rem", color: T.color.muted,
          margin: "0 0 1.375rem", lineHeight: 1.5,
        }}>
          {t("accountDescription")}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Change Password */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "1.125rem 1.25rem", borderRadius: "0.75rem",
            background: T.color.linen,
            border: `1px solid ${T.color.cream}`,
          }}>
            <div>
              <div style={{
                fontFamily: T.font.body, fontSize: "0.9375rem", fontWeight: 500,
                color: T.color.charcoal,
              }}>
                {t("changePassword")}
              </div>
              <div style={{
                fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.muted,
                marginTop: "0.25rem",
              }}>
                {t("changePasswordDesc")}
              </div>
            </div>
            <button
              onClick={handlePasswordReset}
              style={{
                padding: "0.75rem 1.5rem",
                borderRadius: "0.625rem",
                border: `1px solid ${T.color.cream}`,
                background: T.color.white,
                fontFamily: T.font.body,
                fontSize: "0.875rem",
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
          <ExportPanel showToast={showToast} />
        </div>
      </div>

      {/* ── Security: Two-Factor Authentication ── */}
      <MFASetup />

      {/* ── Language ── */}
      <div style={{
        background: T.color.white,
        borderRadius: "1rem",
        border: `1px solid ${T.color.cream}`,
        padding: "1.75rem 2rem",
        boxShadow: "0 2px 8px rgba(44,44,42,.04)",
        marginBottom: "1.5rem",
      }}>
        <h3 style={{
          fontFamily: T.font.display, fontSize: "1.25rem", fontWeight: 500,
          color: T.color.charcoal, margin: "0 0 1rem",
        }}>
          {tc("language")}
        </h3>
        <div style={{ display: "flex", gap: "0.625rem" }}>
          <button
            onClick={() => setLocale("en")}
            aria-pressed={locale === "en"}
            style={{
              padding: "0.875rem 1.5rem",
              borderRadius: "0.75rem",
              border: `2px solid ${locale === "en" ? T.color.terracotta : T.color.cream}`,
              background: locale === "en" ? `${T.color.terracotta}12` : T.color.linen,
              cursor: "pointer",
              fontFamily: T.font.body,
              fontSize: "0.9375rem",
              fontWeight: locale === "en" ? 600 : 400,
              color: locale === "en" ? T.color.terracotta : T.color.charcoal,
              transition: "all .2s",
            }}
          >
            {tc("english")} (EN)
          </button>
          <button
            onClick={() => setLocale("nl")}
            aria-pressed={locale === "nl"}
            style={{
              padding: "0.875rem 1.5rem",
              borderRadius: "0.75rem",
              border: `2px solid ${locale === "nl" ? T.color.terracotta : T.color.cream}`,
              background: locale === "nl" ? `${T.color.terracotta}12` : T.color.linen,
              cursor: "pointer",
              fontFamily: T.font.body,
              fontSize: "0.9375rem",
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
        borderRadius: "1rem",
        border: `1px solid ${T.color.cream}`,
        padding: "1.75rem 2rem",
        boxShadow: "0 2px 8px rgba(44,44,42,.04)",
        marginBottom: "1.5rem",
      }}>
        <h3 style={{
          fontFamily: T.font.display, fontSize: "1.25rem", fontWeight: 500,
          color: T.color.charcoal, margin: "0 0 1rem",
        }}>
          {tA11y("title")}
        </h3>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "1.125rem 1.25rem", borderRadius: "0.75rem",
          background: T.color.linen,
          border: `1px solid ${T.color.cream}`,
        }}>
          <div>
            <div style={{
              fontFamily: T.font.body, fontSize: "0.9375rem", fontWeight: 500,
              color: T.color.charcoal,
            }}>
              {tA11y("mode")}
            </div>
            <div style={{
              fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.muted,
              marginTop: "0.25rem", lineHeight: 1.4,
            }}>
              {tA11y("modeDescription")}
            </div>
          </div>
          <button
            role="switch"
            aria-checked={accessibilityMode}
            onClick={() => {
              toggleAccessibility();
              showToast(accessibilityMode ? tA11y("disabled") : tA11y("enabled"), "success");
            }}
            style={{
              width: "3.25rem",
              height: "1.75rem",
              borderRadius: "0.875rem",
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
              top: "0.1875rem",
              left: accessibilityMode ? "1.6875rem" : "0.1875rem",
              width: "1.375rem",
              height: "1.375rem",
              borderRadius: "0.6875rem",
              background: T.color.white,
              boxShadow: "0 1px 4px rgba(0,0,0,.15)",
              transition: "left .2s",
            }} />
          </button>
        </div>
      </div>

      {/* ── Dynamic Daylight ── */}
      <div style={{
        background: T.color.white,
        borderRadius: "1rem",
        border: `1px solid ${T.color.cream}`,
        padding: "1.75rem 2rem",
        boxShadow: "0 2px 8px rgba(44,44,42,.04)",
        marginBottom: "1.5rem",
      }}>
        <h3 style={{
          fontFamily: T.font.display, fontSize: "1.25rem", fontWeight: 500,
          color: T.color.charcoal, margin: "0 0 1rem",
        }}>
          {tc("daylightMode")}
        </h3>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "1.125rem 1.25rem", borderRadius: "0.75rem",
          background: T.color.linen,
          border: `1px solid ${T.color.cream}`,
          marginBottom: daylightEnabled ? "0.75rem" : 0,
        }}>
          <div>
            <div style={{
              fontFamily: T.font.body, fontSize: "0.9375rem", fontWeight: 500,
              color: T.color.charcoal,
            }}>
              {tc("daylightMode")}
            </div>
            <div style={{
              fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.muted,
              marginTop: "0.25rem", lineHeight: 1.4,
            }}>
              {tc("daylightDesc")}
            </div>
          </div>
          <button
            role="switch"
            aria-checked={daylightEnabled}
            onClick={toggleDaylight}
            style={{
              width: "3.25rem",
              height: "1.75rem",
              borderRadius: "0.875rem",
              border: "none",
              background: daylightEnabled ? T.color.gold : T.color.sandstone,
              cursor: "pointer",
              position: "relative",
              transition: "background .2s",
              flexShrink: 0,
            }}
          >
            <span style={{
              position: "absolute",
              top: "0.1875rem",
              left: daylightEnabled ? "1.6875rem" : "0.1875rem",
              width: "1.375rem",
              height: "1.375rem",
              borderRadius: "0.6875rem",
              background: T.color.white,
              boxShadow: "0 1px 4px rgba(0,0,0,.15)",
              transition: "left .2s",
            }} />
          </button>
        </div>
        {daylightEnabled && (() => {
          const isAuto = daylightMode === "auto";
          const displayHour = isAuto
            ? new Date().getHours() + new Date().getMinutes() / 60
            : customHour;
          return (
            <div style={{ padding: "0.5rem 0", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {/* Time-of-day slider */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  fontFamily: T.font.body, fontSize: "0.8125rem",
                }}>
                  <span style={{
                    fontWeight: 500,
                    color: isAuto ? T.color.muted : T.color.charcoal,
                  }}>
                    {formatDaylightHour(displayHour)} — {daylightPeriodLabel(displayHour, tc)}
                  </span>
                  <button
                    aria-pressed={isAuto}
                    onClick={() => isAuto ? setCustomHour(displayHour) : setDaylightMode("auto")}
                    style={{
                      padding: "0.25rem 0.75rem",
                      borderRadius: "0.5rem",
                      border: `1px solid ${isAuto ? T.color.gold : T.color.cream}`,
                      background: isAuto ? `${T.color.gold}18` : T.color.linen,
                      cursor: "pointer",
                      fontFamily: T.font.body,
                      fontSize: "0.75rem",
                      fontWeight: isAuto ? 600 : 400,
                      color: isAuto ? T.color.walnut : T.color.muted,
                      transition: "all .2s",
                    }}
                  >
                    {tc("daylight_auto")}
                  </button>
                </div>
                <input
                  type="range"
                  min={0}
                  max={24}
                  step={0.5}
                  value={displayHour}
                  onChange={(e) => setCustomHour(parseFloat(e.target.value))}
                  aria-label={tc("daylightSlider")}
                  style={{
                    width: "100%",
                    accentColor: T.color.gold,
                    cursor: "pointer",
                  }}
                />
                <div style={{
                  display: "flex", justifyContent: "space-between",
                  fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.muted,
                  opacity: 0.6,
                }}>
                  <span>00:00</span>
                  <span>06:00</span>
                  <span>12:00</span>
                  <span>18:00</span>
                  <span>24:00</span>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* ── Danger Zone ── */}
      <div style={{
        background: T.color.white,
        borderRadius: "1rem",
        border: `1px solid #C0505020`,
        padding: "1.75rem 2rem",
        boxShadow: "0 2px 8px rgba(44,44,42,.04)",
      }}>
        <h3 style={{
          fontFamily: T.font.display, fontSize: "1.25rem", fontWeight: 500,
          color: "#C05050", margin: "0 0 0.375rem",
        }}>
          {t("dangerZone")}
        </h3>
        <p style={{
          fontFamily: T.font.body, fontSize: "0.875rem", color: T.color.muted,
          margin: "0 0 1.125rem", lineHeight: 1.5,
        }}>
          {t("dangerDescription")}
        </p>

        {!deleteConfirm ? (
          <button
            onClick={() => setDeleteConfirm(true)}
            style={{
              padding: "0.875rem 1.75rem",
              borderRadius: "0.75rem",
              border: `1px solid #C0505033`,
              background: "#C0505008",
              fontFamily: T.font.body,
              fontSize: "0.9375rem",
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
            padding: "1.25rem 1.5rem", borderRadius: "0.875rem",
            background: "#FDF2F2",
            border: "1px solid #FECACA",
          }}>
            <p style={{
              fontFamily: T.font.body, fontSize: "0.9375rem", fontWeight: 500,
              color: "#B91C1C", margin: "0 0 0.75rem",
            }}>
              {t("deleteConfirmTitle")}
            </p>
            <p style={{
              fontFamily: T.font.body, fontSize: "0.875rem", color: "#7F1D1D",
              margin: "0 0 1rem", lineHeight: 1.5,
            }}
              dangerouslySetInnerHTML={{ __html: t("deleteConfirmDescription") }}
            />
            <input
              id="profile-delete-confirm"
              aria-label={t("deleteConfirmTitle")}
              type="text"
              value={deleteText}
              onChange={(e) => setDeleteText(e.target.value)}
              placeholder={t("deleteConfirmPlaceholder")}
              style={{
                ...inputStyle,
                borderColor: "#FECACA",
                marginBottom: "0.875rem",
              }}
            />
            <div style={{ display: "flex", gap: "0.625rem" }}>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteText !== "DELETE" || deleting}
                style={{
                  padding: "0.75rem 1.5rem",
                  borderRadius: "0.625rem",
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
                  fontSize: "0.875rem",
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
                  padding: "0.75rem 1.5rem",
                  borderRadius: "0.625rem",
                  border: `1px solid ${T.color.cream}`,
                  background: T.color.white,
                  fontFamily: T.font.body,
                  fontSize: "0.875rem",
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
  fontSize: "0.8125rem",
  fontWeight: 600,
  color: T.color.walnut,
  letterSpacing: ".3px",
  textTransform: "uppercase" as const,
  display: "block",
  marginBottom: "0.5rem",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.875rem 1.125rem",
  borderRadius: "0.75rem",
  border: `1.5px solid ${T.color.sandstone}`,
  background: T.color.white,
  fontFamily: T.font.body,
  fontSize: "0.9375rem",
  color: T.color.charcoal,
  outline: "none",
  boxSizing: "border-box" as const,
  transition: "border-color .2s",
};
