"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { T } from "@/lib/theme";
import { createClient } from "@/lib/supabase/client";
import { updateProfile, requestPasswordReset, deleteAccount, uploadAvatar } from "@/lib/auth/profile-actions";
import { updateProfile as updateSocialProfile } from "@/lib/social/profile-actions";
import MFASetup from "@/components/settings/MFASetup";
import ExportPanel from "@/components/settings/ExportPanel";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { locales, localeNames } from "@/i18n/config";
import { useAccessibility } from "@/components/providers/AccessibilityProvider";
import Image from "next/image";
import { useDaylight } from "@/components/providers/DaylightProvider";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useRouter } from "next/navigation";
import { isIOS } from "@/lib/native/platform";

interface ProfileData {
  display_name: string;
  email: string;
  bio: string;
  avatar_url: string;
  username: string;
  is_public: boolean;
  whatsapp_phone: string;
}

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
  const { t: tc } = useTranslation("common");
  const { t: tA11y } = useTranslation("accessibility");
  const { scaleLevel, setScaleLevel } = useAccessibility();
  const { daylightEnabled, daylightMode, customHour, toggleDaylight, setDaylightMode, setCustomHour } = useDaylight();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  // Hide the not-yet-shipped Renaissance style on iOS (Apple Guideline 2.3.1).
  const [hideComingSoon, setHideComingSoon] = useState(false);
  useEffect(() => { setHideComingSoon(isIOS()); }, []);
  const [deleteText, setDeleteText] = useState("");
  const [deleting, setDeleting] = useState(false);
  // Editable fields
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [username, setUsername] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [isPublicSaving, setIsPublicSaving] = useState(false);
  const [styleEra, setStyleEra] = useState("");
  const [aiConsent, setAiConsent] = useState(false);
  const [aiSaving, setAiSaving] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [personaType, setPersonaType] = useState<string | null>(null);
  const { t: tPersona } = useTranslation("persona" as "common");
  const router = useRouter();
  const isMobile = useIsMobile();

  // Avatar upload
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  // Load persona from localStorage
  useEffect(() => {
    setPersonaType(localStorage.getItem("mp_persona_type"));
  }, []);

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
            bio: data.bio || "",
            avatar_url: data.avatar_url || "",
            username: data.username || "",
            is_public: !!data.is_public,
            whatsapp_phone: data.whatsapp_phone || "",
          };
          setProfile(p);
          setDisplayName(p.display_name);
          setBio(p.bio);
          setUsername(p.username);
          setWhatsappPhone(p.whatsapp_phone);
          setIsPublic(!!data.is_public);
          setStyleEra(data.style_era || "roman");
          setAiConsent(!!data.ai_consent);
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
      username !== profile.username ||
      whatsappPhone !== profile.whatsapp_phone);

  const handleSave = async () => {
    setSaving(true);
    const result = await updateProfile({
      displayName,
      bio,
      whatsappPhone: whatsappPhone || null,
    });

    if (result.error) {
      showToast(result.error, "error");
      setSaving(false);
      return;
    }

    if (username !== profile!.username) {
      const socialResult = await updateSocialProfile({
        username: username || undefined,
      });
      if (socialResult.error) {
        showToast(socialResult.error, "error");
        setSaving(false);
        return;
      }
    }

    // Optimistic update
    setProfile((prev) =>
      prev
        ? { ...prev, display_name: displayName, bio, username, whatsapp_phone: whatsappPhone }
        : prev
    );
    showToast(t("profileSaved"), "success");
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
    if (deleteText !== t("deleteConfirmWord")) return;
    setDeleting(true);
    const result = await deleteAccount();
    if (result.error) {
      showToast(result.error, "error");
      setDeleting(false);
    } else {
      window.location.href = "/login";
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!file || !profile) return;
    if (!file.type.startsWith("image/")) {
      showToast(t("avatarInvalidType"), "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast(t("avatarTooLarge"), "error");
      return;
    }
    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await uploadAvatar(formData);
      if (result.error) {
        showToast(result.error, "error");
        return;
      }
      if (result.url) {
        setProfile((prev) => prev ? { ...prev, avatar_url: result.url! } : prev);
        showToast(t("avatarSaved"), "success");
      }
    } catch {
      showToast(t("avatarUploadError"), "error");
    }
    setAvatarUploading(false);
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
        fontFamily: T.font.body, fontSize: "0.9375rem" /* Atrium body */, color: "#716A5E" /* Atrium muted */,
      }}>
        {t("loadingProfile")}
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{
        padding: "3rem", textAlign: "center",
        fontFamily: T.font.body, fontSize: "0.9375rem" /* Atrium body */, color: "#716A5E" /* Atrium muted */,
      }}>
        {loading ? "..." : t("profileLoadError")}
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
          background: toast.type === "success" ? "#56683C" : "#C05050", /* Atrium sage */
          color: "#FFF",
          fontFamily: T.font.body, fontSize: "0.9375rem", fontWeight: 500,
          boxShadow: "0 0.5rem 1.5rem rgba(64,59,54,0.14)", /* Atrium token S2 */
          animation: "fadeIn .2s ease",
          display: "flex", alignItems: "center", gap: "0.625rem",
        }}>
          <span aria-hidden="true">{toast.type === "success" ? "\u2713" : "\u26A0"}</span>
          {toast.message}
          <button onClick={() => setToast(null)} aria-label={tc("close")} style={{
            background: "none", border: "none", color: "#FFF",
            fontSize: "0.9375rem" /* Atrium body */, cursor: "pointer", marginLeft: "0.5rem", opacity: 0.7,
          }}>{"\u2715"}</button>
        </div>
      )}

      {/* Page header — desktop only (mobile uses tab bar as title) */}
      {!isMobile && (
        <div style={{ marginBottom: "2rem" }}>
          <h2 style={{
            fontFamily: T.font.display, fontSize: "1.75rem", fontWeight: 600,
            color: "#403B36" /* Atrium ink */, margin: "0 0 0.5rem",
          }}>
            {t("yourProfile")}
          </h2>
          <p style={{
            fontFamily: T.font.body, fontSize: "0.9375rem", color: "#716A5E" /* Atrium muted */,
            margin: 0, lineHeight: 1.5,
          }}>
            {t("profileDescription")}
          </p>
        </div>
      )}

      {/* ── Profile Card ── */}
      <div style={{
        background: T.color.white,
        borderRadius: "1rem",
        border: "0.0625rem solid #E3D6BC", /* Atrium hairline */
        padding: "1.75rem 2rem",
        boxShadow: "0 0.25rem 1rem rgba(64,59,54,0.07), inset 0 0.0625rem 0 rgba(255,255,255,0.5)", /* Atrium S1 + top highlight */
        marginBottom: "1.5rem",
      }}>
        {/* Avatar + Name header */}
        <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", marginBottom: "1.75rem" }}>
          {/* Clickable avatar with upload overlay */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <button
              onClick={() => avatarInputRef.current?.click()}
              aria-label={t("changeProfilePhoto")}
              disabled={avatarUploading}
              style={{
                width: "4.5rem", height: "4.5rem", borderRadius: "2.25rem",
                background: "linear-gradient(135deg, #B85C38, #9A4F2A)" /* Atrium ember → glyph */,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#FFF",
                fontFamily: T.font.display, fontSize: "1.75rem", fontWeight: 600,
                letterSpacing: "0.0625rem",
                border: "none",
                cursor: avatarUploading ? "wait" : "pointer",
                padding: 0,
                overflow: "hidden",
                position: "relative",
              }}
            >
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt=""
                  width={72} height={72}
                  style={{ borderRadius: "2.25rem", objectFit: "cover" }}
                />
              ) : (
                getInitials(displayName || profile.display_name)
              )}
              {/* Hover overlay */}
              <span style={{
                position: "absolute", inset: 0, borderRadius: "2.25rem",
                background: "rgba(64,59,54,0.45)", /* Atrium warm-ink scrim */
                display: "flex", alignItems: "center", justifyContent: "center",
                opacity: avatarUploading ? 1 : 0,
                transition: "opacity .2s",
              }}
                className="mp-avatar-overlay"
              >
                {avatarUploading ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 1s linear infinite" }}>
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                )}
              </span>
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleAvatarUpload(file);
                e.target.value = "";
              }}
            />
          </div>
          <div>
            <div style={{
              fontFamily: T.font.display, fontSize: "1.375rem", fontWeight: 600,
              color: "#403B36" /* Atrium ink */,
            }}>
              {displayName || t("namePlaceholder")}
            </div>
            <div style={{
              fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E" /* Atrium muted */,
              marginTop: "0.25rem",
            }}>
              {profile.email}
            </div>
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarUploading}
              style={{
                fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600,
                color: "#9A4F2A" /* Atrium terracotta glyph */, background: "none",
                border: "none", padding: "0.25rem 0", cursor: avatarUploading ? "wait" : "pointer",
                marginTop: "0.25rem", opacity: avatarUploading ? 0.6 : 1,
              }}
            >
              {avatarUploading ? t("uploadingPhoto") : t("changeProfilePhoto")}
            </button>
          </div>
        </div>

        {/* Form fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.375rem" }}>
          {/* Display Name */}
          <div>
            <label htmlFor="profile-display-name" style={labelStyle}>{t("displayName")}</label>
            <input
              id="profile-display-name"
              className="mp-settings-input"
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
              className="mp-settings-input"
              type="email"
              value={profile.email}
              readOnly
              style={{
                ...inputStyle,
                background: T.color.warmStone,
                color: "#716A5E" /* Atrium muted */,
                cursor: "not-allowed",
              }}
            />
            <p style={{
              fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E" /* Atrium muted */,
              margin: "0.375rem 0 0", lineHeight: 1.4,
            }}>
              {t("emailReadonlyNote")}
            </p>
          </div>

          {/* Username (social) */}
          <div>
            <label htmlFor="profile-username" style={labelStyle}>{t("username")}</label>
            <input
              id="profile-username"
              className="mp-settings-input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
              placeholder={t("usernamePlaceholder")}
              maxLength={30}
              style={inputStyle}
            />
            <p style={{
              fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E" /* Atrium muted */,
              margin: "0.375rem 0 0", lineHeight: 1.4,
            }}>
              {t("usernameHelp")}
            </p>
          </div>

          {/* Bio */}
          <div>
            <label htmlFor="profile-bio" style={labelStyle}>{t("aboutMe")}</label>
            <textarea
              id="profile-bio"
              className="mp-settings-input"
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

          {/* WhatsApp Phone (for Kep) */}
          <div>
            <label htmlFor="profile-whatsapp-phone" style={labelStyle}>{t("whatsappPhone")}</label>
            <input
              id="profile-whatsapp-phone"
              className="mp-settings-input"
              type="tel"
              value={whatsappPhone}
              onChange={(e) => setWhatsappPhone(e.target.value.replace(/[^\d+\s()-]/g, ""))}
              placeholder={t("whatsappPhonePlaceholder")}
              maxLength={20}
              style={inputStyle}
            />
            <p style={{
              fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E" /* Atrium muted */,
              margin: "0.375rem 0 0", lineHeight: 1.4,
            }}>
              {t("whatsappPhoneHelp")}
            </p>
          </div>

          {/* Profile Visibility */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "1.125rem 1.25rem", borderRadius: "0.75rem",
            background: T.color.linen,
            border: "0.0625rem solid #E3D6BC", /* Atrium hairline */
          }}>
            <div style={{ marginRight: "1rem" }}>
              <div style={{
                fontFamily: T.font.body, fontSize: "0.9375rem", fontWeight: 500,
                color: "#403B36" /* Atrium ink */,
              }}>
                {t("profileVisibility")}
              </div>
              <div style={{
                fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E" /* Atrium muted */,
                marginTop: "0.25rem", lineHeight: 1.4,
              }}>
                {t("profileVisibilityDesc")}
              </div>
            </div>
            <button
              role="switch"
              aria-checked={isPublic}
              disabled={isPublicSaving}
              onClick={async () => {
                const newVal = !isPublic;
                setIsPublicSaving(true);
                setIsPublic(newVal);
                const result = await updateSocialProfile({ is_public: newVal });
                if (result.error) {
                  showToast(result.error, "error");
                  setIsPublic(!newVal);
                } else {
                  setProfile((prev) => prev ? { ...prev, is_public: newVal } : prev);
                  showToast(newVal ? t("profileVisibilityOn") : t("profileVisibilityOff"), "success");
                }
                setIsPublicSaving(false);
              }}
              style={{
                width: "3.25rem",
                height: "1.75rem",
                borderRadius: "0.875rem",
                border: "none",
                background: isPublic ? "#56683C" /* Atrium sage */ : T.color.sandstone,
                cursor: isPublicSaving ? "wait" : "pointer",
                position: "relative",
                transition: "background .2s",
                flexShrink: 0,
                opacity: isPublicSaving ? 0.6 : 1,
              }}
            >
              <span style={{
                position: "absolute",
                top: "0.1875rem",
                left: isPublic ? "1.6875rem" : "0.1875rem",
                width: "1.375rem",
                height: "1.375rem",
                borderRadius: "0.6875rem",
                background: T.color.white,
                boxShadow: "0 0.0625rem 0.25rem rgba(64,59,54,0.14)", /* Atrium warm ink */
                transition: "left .2s",
              }} />
            </button>
          </div>

          {/* Palace Style */}
          <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
            <legend style={labelStyle}>{t("palaceStyle")}</legend>
            <p style={{
              fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E" /* Atrium muted */,
              margin: "0 0 0.625rem", lineHeight: 1.4,
            }}>
              {t("palaceStyleDesc")}
            </p>
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0.625rem",
            }}>
              {(["roman", "renaissance"] as const).filter((era) => !(hideComingSoon && era === "renaissance")).map((era) => {
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
                    border: `0.125rem solid ${styleEra === era && !isComingSoon ? (era === "roman" ? T.era.roman.secondary : T.era.renaissance.accent) : "#E3D6BC"}`, /* Atrium hairline */
                    background: styleEra === era && !isComingSoon ? "#F6EBE3" /* Atrium terracotta tray, pre-mixed */ : T.color.linen,
                    cursor: isComingSoon ? "default" : "pointer",
                    opacity: isComingSoon ? 0.55 : 1,
                    textAlign: "left",
                    transition: "all .2s",
                    fontFamily: T.font.body,
                    fontSize: "0.9375rem",
                    fontWeight: styleEra === era && !isComingSoon ? 600 : 500,
                    color: styleEra === era && !isComingSoon ? (era === "roman" ? T.era.roman.secondary : T.era.renaissance.accent) : "#403B36" /* Atrium ink */,
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: "0.125rem" }}>
                    {era === "roman" ? t("romanName") : t("renaissanceName")}
                    {isComingSoon && <span style={{ fontSize: "0.6875rem", fontWeight: 700, marginLeft: "0.5rem", color: "#716A5E" /* Atrium muted */, textTransform: "uppercase", letterSpacing: "0.12em" }}>{t("comingSoon")}</span>}
                  </div>
                  <div style={{ fontSize: "0.8125rem", fontWeight: 500, color: "#716A5E" /* Atrium muted */ }}>
                    {era === "roman" ? t("romanDesc") : t("renaissanceDesc")}
                  </div>
                </button>
                );
              })}
            </div>
          </fieldset>

          {/* Memory Style / Persona */}
          <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
            <legend style={labelStyle}>{t("yourMemoryStyle")}</legend>
            <p style={{
              fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E" /* Atrium muted */,
              margin: "0 0 0.625rem", lineHeight: 1.4,
            }}>
              {t("memoryStyleDesc")}
            </p>
            {personaType ? (
              <div style={{
                display: "flex", alignItems: "center", gap: "1rem",
                padding: "1rem 1.25rem", borderRadius: "0.75rem",
                background: T.color.linen,
                border: "0.0625rem solid #E3D6BC", /* Atrium hairline */
              }}>
                <div style={{
                  width: "2.5rem", height: "2.5rem", borderRadius: "50%",
                  background: "rgba(154,79,42,0.11)" /* Atrium terracotta medallion */, border: "0.0625rem solid rgba(154,79,42,0.35)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#9A4F2A" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4M12 8h.01" />
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontFamily: T.font.display, fontSize: "1.0625rem", fontWeight: 600,
                    color: "#403B36" /* Atrium ink */,
                  }}>
                    {tPersona("resultTitle").replace("{type}", tPersona(`${personaType}Label`))}
                  </div>
                  <div style={{
                    fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E" /* Atrium muted */,
                    marginTop: "0.125rem", lineHeight: 1.45,
                  }}>
                    {tPersona(`${personaType}Desc`)}
                  </div>
                </div>
                <button
                  onClick={() => {
                    localStorage.removeItem("mp_persona_type");
                    setPersonaType(null);
                    showToast(t("personaReset"), "success");
                  }}
                  style={{
                    fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600,
                    color: "#9A4F2A" /* Atrium terracotta glyph */, background: "none",
                    border: "0.0625rem solid rgba(154,79,42,0.35)",
                    borderRadius: "0.5rem", padding: "0.5rem 0.875rem",
                    cursor: "pointer", flexShrink: 0, transition: "all 0.2s",
                  }}
                >
                  {t("retakeQuiz")}
                </button>
              </div>
            ) : (
              <div style={{
                padding: "1rem 1.25rem", borderRadius: "0.75rem",
                background: T.color.linen, border: "0.0625rem solid #E3D6BC", /* Atrium hairline */
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <span style={{
                  fontFamily: T.font.body, fontSize: "0.9375rem", color: "#716A5E" /* Atrium muted */,
                }}>
                  {t("noPersonaYet")}
                </span>
                <button
                  onClick={() => { router.push("/atrium"); }}
                  style={{
                    fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600,
                    color: "#9A4F2A" /* Atrium terracotta glyph */, background: "none",
                    border: "0.0625rem solid rgba(154,79,42,0.35)",
                    borderRadius: "0.5rem", padding: "0.5rem 0.875rem",
                    cursor: "pointer", flexShrink: 0, transition: "all 0.2s",
                  }}
                >
                  {t("takeQuiz")}
                </button>
              </div>
            )}
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
                  ? "#EEE9DF" /* Atrium pre-mixed: sandstone 37% on cream */
                  : "linear-gradient(135deg, #B85C38, #9A4F2A)" /* Atrium ember → glyph */,
              color: !hasChanges || saving ? "#716A5E" /* Atrium muted */ : "#FFF",
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
                setUsername(profile.username);
              }}
              style={{
                padding: "0.875rem 1.5rem",
                borderRadius: "0.75rem",
                border: "0.0625rem solid #E3D6BC", /* Atrium hairline */
                background: "transparent",
                color: "#716A5E" /* Atrium muted */,
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
        border: "0.0625rem solid #E3D6BC", /* Atrium hairline */
        padding: "1.75rem 2rem",
        boxShadow: "0 0.25rem 1rem rgba(64,59,54,0.07), inset 0 0.0625rem 0 rgba(255,255,255,0.5)", /* Atrium S1 + top highlight */
        marginBottom: "1.5rem",
      }}>
        <h3 style={{
          fontFamily: T.font.display, fontSize: "1.1875rem", fontWeight: 600,
          color: "#403B36" /* Atrium ink */, margin: "0 0 0.375rem",
        }}>
          {t("account")}
        </h3>
        <p style={{
          fontFamily: T.font.body, fontSize: "0.9375rem", color: "#716A5E" /* Atrium muted */,
          margin: "0 0 1.375rem", lineHeight: 1.4,
        }}>
          {t("accountDescription")}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Change Password */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "1.125rem 1.25rem", borderRadius: "0.75rem",
            background: T.color.linen,
            border: "0.0625rem solid #E3D6BC", /* Atrium hairline */
          }}>
            <div>
              <div style={{
                fontFamily: T.font.body, fontSize: "0.9375rem", fontWeight: 500,
                color: "#403B36" /* Atrium ink */,
              }}>
                {t("changePassword")}
              </div>
              <div style={{
                fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E" /* Atrium muted */,
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
                border: "0.0625rem solid #E3D6BC", /* Atrium hairline */
                background: T.color.white,
                fontFamily: T.font.body,
                fontSize: "0.9375rem",
                fontWeight: 500,
                color: "#403B36" /* Atrium ink */,
                cursor: "pointer",
                transition: "all 0.2s ease",
                flexShrink: 0,
                minHeight: "2.75rem",
              }}
            >
              {t("sendResetLink")}
            </button>
          </div>

          {/* Download My Data */}
          <ExportPanel showToast={showToast} />
        </div>
      </div>

      {/* ── AI Features Consent ── */}
      <div style={{
        background: T.color.white,
        borderRadius: "1rem",
        border: "0.0625rem solid #E3D6BC", /* Atrium hairline */
        padding: "1.75rem 2rem",
        boxShadow: "0 0.25rem 1rem rgba(64,59,54,0.07), inset 0 0.0625rem 0 rgba(255,255,255,0.5)", /* Atrium S1 + top highlight */
        marginBottom: "1.5rem",
      }}>
        <h3 style={{
          fontFamily: T.font.display, fontSize: "1.1875rem", fontWeight: 600,
          color: "#403B36" /* Atrium ink */, margin: "0 0 0.375rem",
        }}>
          {t("aiFeatures")}
        </h3>
        <p style={{
          fontFamily: T.font.body, fontSize: "0.9375rem", color: "#716A5E" /* Atrium muted */,
          margin: "0 0 1.375rem", lineHeight: 1.4,
        }}>
          {t("aiFeaturesDesc")}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* General AI consent toggle */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "1.125rem 1.25rem", borderRadius: "0.75rem",
            background: T.color.linen,
            border: "0.0625rem solid #E3D6BC", /* Atrium hairline */
          }}>
            <div style={{ marginRight: "1rem" }}>
              <div style={{
                fontFamily: T.font.body, fontSize: "0.9375rem", fontWeight: 500,
                color: "#403B36" /* Atrium ink */,
              }}>
                {t("aiConsent")}
              </div>
              <div style={{
                fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E" /* Atrium muted */,
                marginTop: "0.25rem", lineHeight: 1.4,
              }}>
                {t("aiConsentDesc")}
              </div>
            </div>
            <button
              role="switch"
              aria-checked={aiConsent}
              disabled={aiSaving}
              onClick={async () => {
                const newVal = !aiConsent;
                setAiSaving(true);
                setAiConsent(newVal);
                await updateProfile({ aiConsent: newVal });
                showToast(newVal ? t("aiConsentOn") : t("aiConsentOff"), "success");
                setAiSaving(false);
              }}
              style={{
                width: "3.25rem",
                height: "1.75rem",
                borderRadius: "0.875rem",
                border: "none",
                background: aiConsent ? "#56683C" /* Atrium sage */ : T.color.sandstone,
                cursor: aiSaving ? "wait" : "pointer",
                position: "relative",
                transition: "background .2s",
                flexShrink: 0,
                opacity: aiSaving ? 0.6 : 1,
              }}
            >
              <span style={{
                position: "absolute",
                top: "0.1875rem",
                left: aiConsent ? "1.6875rem" : "0.1875rem",
                width: "1.375rem",
                height: "1.375rem",
                borderRadius: "0.6875rem",
                background: T.color.white,
                boxShadow: "0 0.0625rem 0.25rem rgba(64,59,54,0.14)", /* Atrium warm ink */
                transition: "left .2s",
              }} />
            </button>
          </div>

        </div>
      </div>

      {/* ── Security: Two-Factor Authentication ── */}
      <MFASetup />

      {/* ── Language ── */}
      <div style={{
        background: T.color.white,
        borderRadius: "1rem",
        border: "0.0625rem solid #E3D6BC", /* Atrium hairline */
        padding: "1.75rem 2rem",
        boxShadow: "0 0.25rem 1rem rgba(64,59,54,0.07), inset 0 0.0625rem 0 rgba(255,255,255,0.5)", /* Atrium S1 + top highlight */
        marginBottom: "1.5rem",
      }}>
        <h3 style={{
          fontFamily: T.font.display, fontSize: "1.1875rem", fontWeight: 600,
          color: "#403B36" /* Atrium ink */, margin: "0 0 1rem",
        }}>
          {tc("language")}
        </h3>
        <div style={{ display: "flex", gap: "0.625rem", flexWrap: "wrap" }}>
          {locales.map((l) => (
            <button
              key={l}
              onClick={() => setLocale(l)}
              aria-pressed={locale === l}
              style={{
                padding: "0.875rem 1.5rem",
                borderRadius: "0.75rem",
                border: `0.125rem solid ${locale === l ? "#B85C38" : "#E3D6BC"}`, /* Atrium ember / hairline */
                background: locale === l ? "#F6EBE3" /* terracotta tray */ : T.color.linen,
                cursor: "pointer",
                fontFamily: T.font.body,
                fontSize: "0.9375rem",
                fontWeight: locale === l ? 600 : 500,
                color: locale === l ? "#9A4F2A" : "#403B36", /* Atrium glyph / ink */
                transition: "all .2s",
              }}
            >
              {localeNames[l]} ({l.toUpperCase()})
            </button>
          ))}
        </div>
      </div>

      {/* ── Text Size (Accessibility) ── */}
      <div style={{
        background: T.color.white,
        borderRadius: "1rem",
        border: "0.0625rem solid #E3D6BC", /* Atrium hairline */
        padding: "1.75rem 2rem",
        boxShadow: "0 0.25rem 1rem rgba(64,59,54,0.07), inset 0 0.0625rem 0 rgba(255,255,255,0.5)", /* Atrium S1 + top highlight */
        marginBottom: "1.5rem",
      }}>
        <h3 style={{
          fontFamily: T.font.display, fontSize: "1.1875rem", fontWeight: 600,
          color: "#403B36" /* Atrium ink */, margin: "0 0 0.25rem",
        }}>
          {tA11y("title")}
        </h3>
        <p style={{
          fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E" /* Atrium muted */,
          margin: "0 0 1rem", lineHeight: 1.4,
        }}>
          {tA11y("subtitle")}
        </p>
        <div
          role="radiogroup"
          aria-label={tA11y("title")}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "0.75rem",
          }}
        >
          {(["standard", "comfortable", "large"] as const).map((level) => {
            const isSelected = scaleLevel === level;
            const previewSize = { standard: "1rem", comfortable: "1.125rem", large: "1.25rem" }[level];
            return (
              <button
                key={level}
                role="radio"
                aria-checked={isSelected}
                onClick={() => {
                  setScaleLevel(level);
                  showToast(tA11y("changed", { level: tA11y(level) }), "success");
                }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "1rem 0.75rem",
                  borderRadius: "0.75rem",
                  border: isSelected ? "0.125rem solid #56683C" : "0.0625rem solid #E3D6BC", /* Atrium sage / hairline */
                  background: isSelected ? "#EFF2E8" /* Atrium sage tray */ : T.color.linen,
                  cursor: "pointer",
                  transition: "all .2s",
                  position: "relative",
                }}
              >
                {isSelected && (
                  <span style={{
                    position: "absolute", top: "0.5rem", right: "0.5rem",
                    width: "1.25rem", height: "1.25rem", borderRadius: "50%",
                    background: "#56683C" /* Atrium sage */, display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke={T.color.white} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2.5 6l2.5 2.5 4.5-5" />
                    </svg>
                  </span>
                )}
                <span style={{
                  fontFamily: T.font.display, fontSize: previewSize, fontWeight: 600,
                  color: isSelected ? "#403B36" : "#716A5E", /* Atrium ink / muted */
                }}>
                  Aa
                </span>
                <span style={{
                  fontFamily: T.font.body, fontSize: "0.9375rem", fontWeight: 600,
                  color: isSelected ? "#403B36" : "#716A5E", /* Atrium ink / muted */
                }}>
                  {tA11y(level)}
                </span>
                <span style={{
                  fontFamily: T.font.body, fontSize: "0.8125rem",
                  color: "#716A5E" /* Atrium muted */, lineHeight: 1.3,
                }}>
                  {tA11y(`${level}Desc`)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Dynamic Daylight ── */}
      <div style={{
        background: T.color.white,
        borderRadius: "1rem",
        border: "0.0625rem solid #E3D6BC", /* Atrium hairline */
        padding: "1.75rem 2rem",
        boxShadow: "0 0.25rem 1rem rgba(64,59,54,0.07), inset 0 0.0625rem 0 rgba(255,255,255,0.5)", /* Atrium S1 + top highlight */
        marginBottom: "1.5rem",
      }}>
        <h3 style={{
          fontFamily: T.font.display, fontSize: "1.1875rem", fontWeight: 600,
          color: "#403B36" /* Atrium ink */, margin: "0 0 1rem",
        }}>
          {tc("daylightMode")}
        </h3>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "1.125rem 1.25rem", borderRadius: "0.75rem",
          background: T.color.linen,
          border: "0.0625rem solid #E3D6BC", /* Atrium hairline */
          marginBottom: daylightEnabled ? "0.75rem" : 0,
        }}>
          <div>
            <div style={{
              fontFamily: T.font.body, fontSize: "0.9375rem", fontWeight: 500,
              color: "#403B36" /* Atrium ink */,
            }}>
              {tc("daylightMode")}
            </div>
            <div style={{
              fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E" /* Atrium muted */,
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
              background: daylightEnabled ? "#56683C" /* Atrium sage — matches other switches */ : T.color.sandstone,
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
              boxShadow: "0 0.0625rem 0.25rem rgba(64,59,54,0.14)", /* Atrium warm ink */
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
                    color: isAuto ? "#716A5E" /* Atrium muted */ : "#403B36" /* Atrium ink */,
                  }}>
                    {formatDaylightHour(displayHour)} — {daylightPeriodLabel(displayHour, tc)}
                  </span>
                  <button
                    aria-pressed={isAuto}
                    onClick={() => isAuto ? setCustomHour(displayHour) : setDaylightMode("auto")}
                    style={{
                      padding: "0.25rem 0.75rem",
                      borderRadius: "0.5rem",
                      border: `0.0625rem solid ${isAuto ? "rgba(154,79,42,0.35)" : "#E3D6BC"}`, /* Atrium terracotta / hairline */
                      background: isAuto ? "#F6EBE3" : T.color.linen,
                      cursor: "pointer",
                      fontFamily: T.font.body,
                      fontSize: "0.8125rem",
                      fontWeight: isAuto ? 600 : 500,
                      color: isAuto ? "#9A4F2A" : "#716A5E", /* Atrium glyph / muted */
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
                    accentColor: "#B85C38", /* Atrium ember */
                    cursor: "pointer",
                  }}
                />
                <div style={{
                  display: "flex", justifyContent: "space-between",
                  fontFamily: T.font.body, fontSize: "0.6875rem", color: "#716A5E", /* Atrium muted, full opacity */
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
        border: "0.0625rem solid #EFD3D3", /* Atrium pre-mixed: danger 25% on white */
        padding: "1.75rem 2rem",
        boxShadow: "0 0.25rem 1rem rgba(64,59,54,0.07)", /* Atrium S1 */
      }}>
        <h3 style={{
          fontFamily: T.font.display, fontSize: "1.1875rem", fontWeight: 600,
          color: "#C05050", margin: "0 0 0.375rem",
        }}>
          {t("dangerZone")}
        </h3>
        <p style={{
          fontFamily: T.font.body, fontSize: "0.9375rem", color: "#716A5E" /* Atrium muted */,
          margin: "0 0 1.125rem", lineHeight: 1.4,
        }}>
          {t("dangerDescription")}
        </p>

        {!deleteConfirm ? (
          <button
            onClick={() => setDeleteConfirm(true)}
            style={{
              padding: "0.875rem 1.75rem",
              borderRadius: "0.75rem",
              border: "0.0625rem solid #F2DCDC", /* Atrium pre-mixed: danger 20% on white */
              background: "#FDF9F9", /* Atrium pre-mixed: danger 3% on white */
              fontFamily: T.font.body,
              fontSize: "0.9375rem",
              fontWeight: 600,
              color: "#C05050",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            {t("deleteAccount")}
          </button>
        ) : (
          <div style={{
            padding: "1.25rem 1.5rem", borderRadius: "0.875rem",
            background: "#FAF1F1", /* Atrium pre-mixed: danger 8% on white */
            border: "0.0625rem solid #ECCACA", /* Atrium pre-mixed: danger 30% on white */
          }}>
            <p style={{
              fontFamily: T.font.body, fontSize: "0.9375rem", fontWeight: 500,
              color: "#A83A3A" /* danger strong, one ramp */, margin: "0 0 0.75rem",
            }}>
              {t("deleteConfirmTitle")}
            </p>
            <p style={{
              fontFamily: T.font.body, fontSize: "0.9375rem", color: "#8C3434" /* danger deep, one ramp */,
              margin: "0 0 1rem", lineHeight: 1.4,
            }}>
              {(() => {
                const raw = t("deleteConfirmDescription");
                const parts = raw.split(/\{boldStart\}|\{boldEnd\}/);
                // parts[0] = before, parts[1] = bold text, parts[2] = after
                return (
                  <>
                    {parts[0]}
                    {parts[1] && <strong>{parts[1]}</strong>}
                    {parts[2]}
                  </>
                );
              })()}
            </p>
            <input
              id="profile-delete-confirm"
              className="mp-settings-input"
              aria-label={t("deleteConfirmTitle")}
              type="text"
              value={deleteText}
              onChange={(e) => setDeleteText(e.target.value)}
              placeholder={t("deleteConfirmPlaceholder")}
              style={{
                ...inputStyle,
                borderColor: "#ECCACA", /* Atrium pre-mixed: danger 30% on white */
                marginBottom: "0.875rem",
              }}
            />
            <div style={{ display: "flex", gap: "0.625rem" }}>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteText !== t("deleteConfirmWord") || deleting}
                style={{
                  padding: "0.75rem 1.5rem",
                  borderRadius: "0.625rem",
                  border: "none",
                  background:
                    deleteText === t("deleteConfirmWord") && !deleting
                      ? "#A83A3A" /* danger strong, one ramp */
                      : "#EEE9DF" /* Atrium pre-mixed: sandstone 37% on cream */,
                  color:
                    deleteText === t("deleteConfirmWord") && !deleting
                      ? "#FFF"
                      : "#716A5E" /* Atrium muted */,
                  fontFamily: T.font.body,
                  fontSize: "0.9375rem",
                  fontWeight: 600,
                  cursor:
                    deleteText === t("deleteConfirmWord") && !deleting
                      ? "pointer"
                      : "default",
                  transition: "all 0.2s ease",
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
                  border: "0.0625rem solid #E3D6BC", /* Atrium hairline */
                  background: T.color.white,
                  fontFamily: T.font.body,
                  fontSize: "0.9375rem",
                  fontWeight: 500,
                  color: "#403B36" /* Atrium ink */,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                {tc("cancel")}
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-0.5rem); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) { [role="status"], [role="alert"], svg, .mp-avatar-overlay, button, input, span { animation: none !important; transition: none !important; } }
        button:hover .mp-avatar-overlay { opacity: 1 !important; }
        ${settingsFocusStyle}
      `}</style>
    </div>
  );
}

// ── Shared styles ──
const labelStyle: React.CSSProperties = {
  fontFamily: T.font.body,
  fontSize: "0.6875rem", /* Atrium overline: the one small-caps voice */
  fontWeight: 700,
  color: "#716A5E", /* Atrium muted */
  letterSpacing: "0.12em",
  textTransform: "uppercase" as const,
  display: "block",
  marginBottom: "0.5rem",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.875rem 1.125rem",
  borderRadius: "0.75rem",
  border: "0.0625rem solid #E3D6BC", /* Atrium hairline */
  background: T.color.white,
  fontFamily: T.font.body,
  fontSize: "0.9375rem",
  color: "#403B36" /* Atrium ink */,
  outline: "none",
  boxSizing: "border-box" as const,
  transition: "border-color .2s, box-shadow .2s",
};

/* ── Global focus-visible ring for settings inputs ── */
const settingsFocusStyle = `
  .mp-settings-input:focus-visible {
    outline: 0.1875rem solid #D4AF37; /* Atrium gold focus ring */
    outline-offset: 0.1875rem;
  }
`;
