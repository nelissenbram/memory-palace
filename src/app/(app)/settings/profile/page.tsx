"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { T } from "@/lib/theme";
import { createClient } from "@/lib/supabase/client";
import { updateProfile, uploadAvatar } from "@/lib/auth/profile-actions";
import { updateProfile as updateSocialProfile } from "@/lib/social/profile-actions";
import Link from "next/link";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { locales, localeNames } from "@/i18n/config";
import { useAccessibility } from "@/components/providers/AccessibilityProvider";
import Image from "next/image";
import { useDaylight } from "@/components/providers/DaylightProvider";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useRouter } from "next/navigation";
import { isIOS } from "@/lib/native/platform";
import { syncSettingsFromServer } from "@/lib/stores/settingsSync";
import { SettingsPageHeader, SectionOverline } from "../_SettingsChrome";
import { INK, MUTED, HAIRLINE, EMBER, EMBER_GLYPH, TRAY, CREAM, SAGE, GOLD } from "@/lib/libraryTokens";

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
  // Hide the not-yet-shipped Renaissance style on iOS (Apple Guideline 2.3.1).
  const [hideComingSoon, setHideComingSoon] = useState(false);
  useEffect(() => { setHideComingSoon(isIOS()); }, []);
  // Hydration-safe host for the public-profile URL row.
  const [publicHost, setPublicHost] = useState("thememorypalace.ai");
  useEffect(() => { if (window.location.host) setPublicHost(window.location.host); }, []);
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

  // Load persona from localStorage, and re-hydrate when a cross-device settings
  // sync lands (settingsSync fires "mp-settings-synced" after pulling
  // profiles.local_settings) so the label doesn't stay stale after retaking the
  // quiz on another device. We also kick off a sync on mount because this
  // surface can be opened on a fresh device without ever loading the 3D palace
  // (the only other place that pulls settings from the server).
  useEffect(() => {
    const readPersona = () => setPersonaType(localStorage.getItem("mp_persona_type"));
    readPersona();
    window.addEventListener("mp-settings-synced", readPersona);
    syncSettingsFromServer();
    return () => window.removeEventListener("mp-settings-synced", readPersona);
  }, []);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
  }, []);

  // i18n fallback helper — new keys work before the locale files land.
  const tf = useCallback((key: string, fallback: string) => {
    const v = t(key);
    return v === key ? fallback : v;
  }, [t]);

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

  // Server rejects usernames under 3 chars — mirror that inline so Save can't fail silently.
  const usernameTooShort = username.length > 0 && username.length < 3;

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
        background: T.color.white,
        borderRadius: "1rem",
        border: `0.0625rem solid ${HAIRLINE}`, /* Atrium hairline */
        padding: "3rem 2rem",
        boxShadow: "0 0.25rem 1rem rgba(64,59,54,0.07), inset 0 0.0625rem 0 rgba(255,255,255,0.5)", /* Atrium S1 */
        textAlign: "center",
        display: "flex", flexDirection: "column", alignItems: "center", gap: "0.875rem",
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={EMBER_GLYPH} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 1s linear infinite" }} aria-hidden="true">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        </svg>
        <span style={{ fontFamily: T.font.body, fontSize: "0.9375rem", color: MUTED /* Atrium muted */ }}>
          {t("loadingProfile")}
        </span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div role="alert" style={{
        background: T.color.white,
        borderRadius: "1rem",
        border: `0.0625rem solid ${HAIRLINE}`, /* Atrium hairline */
        padding: "3rem 2rem",
        boxShadow: "0 0.25rem 1rem rgba(64,59,54,0.07), inset 0 0.0625rem 0 rgba(255,255,255,0.5)", /* Atrium S1 */
        textAlign: "center",
        display: "flex", flexDirection: "column", alignItems: "center", gap: "0.875rem",
      }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#C05050" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
        </svg>
        <span style={{ fontFamily: T.font.body, fontSize: "0.9375rem", color: MUTED /* Atrium muted */ }}>
          {t("profileLoadError")}
        </span>
        <button
          className="mp-settings-btn"
          onClick={() => window.location.reload()}
          style={{
            minHeight: "2.75rem",
            padding: "0.625rem 1.5rem",
            borderRadius: "0.75rem",
            border: `0.0625rem solid ${HAIRLINE}`, /* Atrium hairline */
            background: "transparent",
            color: EMBER /* Atrium ember (actionable) */,
            fontFamily: T.font.body, fontSize: "0.9375rem", fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {tf("retry", "Try again")}
        </button>
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
          background: toast.type === "success" ? SAGE : T.color.error, /* SAGE success / error token */
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
      <SettingsPageHeader
        hidden={isMobile}
        icon="profile"
        title={t("yourProfile")}
        subtitle={t("profileDescription")}
      />

      {/* Section overline — Your details */}
      <SectionOverline label={tf("sectionYourDetails", "Your details")} />

      {/* ── Profile Card ── */}
      <div style={{
        background: T.color.white,
        borderRadius: "1rem",
        border: `0.0625rem solid ${HAIRLINE}`, /* Atrium hairline */
        padding: "1.75rem 2rem",
        boxShadow: "0 0.25rem 1rem rgba(64,59,54,0.07), inset 0 0.0625rem 0 rgba(255,255,255,0.5)", /* Atrium S1 + top highlight */
        marginBottom: "1.5rem",
      }}>
        {/* Avatar + Name header */}
        <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", marginBottom: "1.75rem" }}>
          {/* Clickable avatar with upload overlay */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <button
              className="mp-settings-btn"
              onClick={() => avatarInputRef.current?.click()}
              aria-label={t("changeProfilePhoto")}
              disabled={avatarUploading}
              style={{
                width: "4.5rem", height: "4.5rem", borderRadius: "2.25rem",
                background: `linear-gradient(135deg, ${EMBER}, ${EMBER_GLYPH})` /* Atrium ember → glyph */,
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
              color: INK /* Atrium ink */,
            }}>
              {displayName || t("namePlaceholder")}
            </div>
            <div style={{
              fontFamily: T.font.body, fontSize: "0.8125rem", color: MUTED /* Atrium muted */,
              marginTop: "0.25rem",
            }}>
              {profile.email}
            </div>
            <button
              className="mp-settings-btn"
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarUploading}
              style={{
                fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600,
                color: EMBER /* Atrium ember (actionable link) */, background: "none",
                border: "none", padding: "0 0.5rem", minHeight: "2.75rem",
                display: "inline-flex", alignItems: "center",
                cursor: avatarUploading ? "wait" : "pointer",
                marginTop: "0.25rem", marginLeft: "-0.5rem", opacity: avatarUploading ? 0.6 : 1,
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
                background: TRAY, /* Atrium tray (read-only) */
                color: MUTED /* Atrium muted */,
                cursor: "not-allowed",
              }}
            />
            <p style={{
              fontFamily: T.font.body, fontSize: "0.8125rem", color: MUTED /* Atrium muted */,
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
              fontFamily: T.font.body, fontSize: "0.8125rem", color: MUTED /* Atrium muted */,
              margin: "0.375rem 0 0", lineHeight: 1.4,
            }}>
              {t("usernameHelp")}
            </p>
            {usernameTooShort && (
              <p role="alert" style={{
                fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.error /* Atrium error */,
                margin: "0.375rem 0 0", lineHeight: 1.4,
              }}>
                {tf("usernameTooShort", "Username must be at least 3 characters.")}
              </p>
            )}
            {/* Public-profile link (change 18 — the shareable URL, first time on mobile) */}
            {profile.username && (
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                gap: "0.75rem", flexWrap: "wrap",
                minHeight: "2.75rem",
                marginTop: "0.625rem",
                padding: "0.625rem 1rem",
                borderRadius: "0.75rem",
                background: TRAY /* Atrium tray — recessed below the white card */,
                border: `0.0625rem solid ${HAIRLINE}`, /* Atrium hairline */
              }}>
                <span style={{
                  fontFamily: T.font.body, fontSize: "0.8125rem", color: INK /* Atrium ink */,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0,
                }}>
                  {`${publicHost}/u/${profile.username}`}
                </span>
                <Link
                  href={`/u/${profile.username}`}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: "0.375rem",
                    minHeight: "2.75rem",
                    padding: "0.375rem 0.875rem",
                    fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600,
                    color: EMBER /* Atrium ember (interactive) */,
                    textDecoration: "none",
                    flexShrink: 0,
                  }}
                >
                  {tf("viewPublicProfile", "View public profile")} {"→"}
                </Link>
              </div>
            )}
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
              fontFamily: T.font.body, fontSize: "0.8125rem", color: MUTED /* Atrium muted */,
              margin: "0.375rem 0 0", lineHeight: 1.4,
            }}>
              {t("whatsappPhoneHelp")}
            </p>
          </div>

          {/* Profile Visibility */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "1.125rem 1.25rem", borderRadius: "0.75rem",
            background: TRAY /* Atrium tray — recessed below the white card */,
            border: `0.0625rem solid ${HAIRLINE}`, /* Atrium hairline */
          }}>
            <div style={{ marginRight: "1rem" }}>
              <div style={{
                fontFamily: T.font.body, fontSize: "0.9375rem", fontWeight: 500,
                color: INK /* Atrium ink */,
              }}>
                {t("profileVisibility")}
              </div>
              <div style={{
                fontFamily: T.font.body, fontSize: "0.8125rem", color: MUTED /* Atrium muted */,
                marginTop: "0.25rem", lineHeight: 1.4,
              }}>
                {t("profileVisibilityDesc")}
              </div>
            </div>
            <button
              className="mp-settings-btn"
              role="switch"
              aria-checked={isPublic}
              disabled={isPublicSaving || (!isPublic && !profile.username)}
              onClick={async () => {
                // Can't publish a profile that has no username to share.
                if (!isPublic && !profile.username) {
                  showToast(tf("usernameRequiredForPublic", "Choose a username before making your profile public"), "error");
                  return;
                }
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
                background: isPublic ? EMBER /* Atrium ember = active */ : HAIRLINE /* Atrium off track */,
                cursor: isPublicSaving ? "wait" : (!isPublic && !profile.username ? "not-allowed" : "pointer"),
                position: "relative",
                transition: "background .2s",
                flexShrink: 0,
                opacity: isPublicSaving || (!isPublic && !profile.username) ? 0.6 : 1,
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
              fontFamily: T.font.body, fontSize: "0.8125rem", color: MUTED /* Atrium muted */,
              margin: "0 0 0.625rem", lineHeight: 1.4,
            }}>
              {t("palaceStyleDesc")}
            </p>
            <div
              role="radiogroup"
              aria-label={t("palaceStyle")}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0.625rem",
              }}
            >
              {(["roman", "renaissance"] as const).filter((era) => !(hideComingSoon && era === "renaissance")).map((era) => {
                const isComingSoon = era === "renaissance";
                const isSelected = styleEra === era && !isComingSoon;
                return (
                <button
                  key={era}
                  className="mp-settings-btn"
                  role={isComingSoon ? undefined : "radio"}
                  aria-checked={isComingSoon ? undefined : isSelected}
                  aria-disabled={isComingSoon || undefined}
                  onClick={async () => {
                    if (isComingSoon) return;
                    const prevEra = styleEra;
                    setStyleEra(era);
                    const result = await updateProfile({ styleEra: era });
                    if (result.error) {
                      setStyleEra(prevEra);
                      showToast(result.error, "error");
                    } else {
                      showToast(t("palaceStyleUpdated"), "success");
                    }
                  }}
                  style={{
                    padding: "0.875rem 1rem",
                    borderRadius: "0.75rem",
                    border: `0.125rem solid ${isSelected ? EMBER /* ember (active), matching roman pill grammar */ : HAIRLINE}`,
                    background: isSelected ? TRAY /* terracotta tray */ : CREAM /* panel */,
                    cursor: isComingSoon ? "default" : "pointer",
                    opacity: isComingSoon ? 0.55 : 1,
                    textAlign: "left",
                    transition: "all .2s",
                    fontFamily: T.font.body,
                    fontSize: "0.9375rem",
                    fontWeight: isSelected ? 600 : 500,
                    color: isSelected ? EMBER /* ember (active) */ : INK,
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: "0.125rem" }}>
                    {era === "roman" ? t("romanName") : t("renaissanceName")}
                    {isComingSoon && <span style={{ fontSize: "0.6875rem", fontWeight: 700, marginLeft: "0.5rem", color: MUTED, textTransform: "uppercase", letterSpacing: "0.12em" }}>{t("comingSoon")}</span>}
                  </div>
                  <div style={{ fontSize: "0.8125rem", fontWeight: 500, color: MUTED }}>
                    {era === "roman" ? t("romanDesc") : t("renaissanceDesc")}
                  </div>
                </button>
                );
              })}
            </div>
          </fieldset>

          {/* Memory Style / Persona — shrunk to one link row (change 18; the quiz lives in the Atrium) */}
          <div>
            <span style={labelStyle}>{t("yourMemoryStyle")}</span>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              gap: "0.75rem", minHeight: "2.75rem",
              padding: "0.625rem 1.25rem", borderRadius: "0.75rem",
              background: TRAY /* Atrium tray — recessed below the white card */,
              border: `0.0625rem solid ${HAIRLINE}`, /* Atrium hairline */
            }}>
              <span style={{
                fontFamily: T.font.body, fontSize: "0.9375rem",
                color: personaType ? INK /* Atrium ink */ : MUTED /* Atrium muted */,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0,
              }}>
                {personaType ? tPersona(`${personaType}Label`) : t("noPersonaYet")}
              </span>
              <button
                className="mp-settings-btn"
                onClick={() => { router.push("/atrium?persona=1"); }}
                style={{
                  fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600,
                  color: EMBER /* Atrium ember (actionable) */, background: "none",
                  border: "0.0625rem solid rgba(184,92,56,0.35)",
                  borderRadius: "0.5rem", padding: "0.5rem 0.875rem",
                  minHeight: "2.75rem",
                  cursor: "pointer", flexShrink: 0, transition: "all 0.2s",
                }}
              >
                {personaType ? t("retakeQuiz") : t("takeQuiz")}
              </button>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div style={{ marginTop: "1.75rem", display: "flex", gap: "0.75rem" }}>
          <button
            className="mp-settings-btn"
            onClick={handleSave}
            disabled={!hasChanges || saving || !!usernameTooShort}
            style={{
              padding: "0.875rem 2rem",
              minHeight: "2.75rem",
              borderRadius: "0.75rem",
              border: "none",
              background:
                !hasChanges || saving || usernameTooShort
                  ? "#EEE9DF" /* Atrium pre-mixed: sandstone 37% on cream */
                  : `linear-gradient(135deg, ${EMBER}, ${EMBER_GLYPH})` /* Atrium ember → glyph */,
              color: !hasChanges || saving || usernameTooShort ? MUTED /* Atrium muted */ : "#FFF",
              fontFamily: T.font.body,
              fontSize: "0.9375rem",
              fontWeight: 600,
              cursor: !hasChanges || saving || usernameTooShort ? "default" : "pointer",
              transition: "all .2s",
            }}
          >
            {saving ? t("saving") : t("saveChanges")}
          </button>
          {hasChanges && (
            <button
              className="mp-settings-btn"
              onClick={() => {
                setDisplayName(profile.display_name);
                setBio(profile.bio);
                setUsername(profile.username);
                setWhatsappPhone(profile.whatsapp_phone);
              }}
              style={{
                padding: "0.875rem 1.5rem",
                minHeight: "2.75rem",
                borderRadius: "0.75rem",
                border: `0.0625rem solid ${HAIRLINE}`, /* Atrium hairline */
                background: "transparent",
                color: MUTED /* Atrium muted */,
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

      {/* Section overline — Account & data */}
      <SectionOverline label={tf("sectionAccountData", "Account & data")} />

      {/* ── Connections (folded under Profile — change 16; route survives for OAuth returns) ── */}
      <Link href="/settings/connections" style={{ textDecoration: "none", display: "block", marginBottom: "1.5rem" }}>
        <div style={{
          background: T.color.white,
          borderRadius: "1rem",
          border: `0.0625rem solid ${HAIRLINE}`, /* Atrium hairline */
          padding: "1.125rem 1.5rem",
          boxShadow: "0 0.25rem 1rem rgba(64,59,54,0.07), inset 0 0.0625rem 0 rgba(255,255,255,0.5)", /* Atrium S1 + top highlight */
          display: "flex", alignItems: "center", gap: "1rem",
          minHeight: "2.75rem",
        }}>
          <div style={{
            width: "2.5rem", height: "2.5rem", borderRadius: "0.625rem",
            background: "rgba(154,79,42,0.11)", /* Atrium terracotta medallion */
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, color: EMBER_GLYPH,
          }}>
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: T.font.display, fontSize: "1.0625rem", fontWeight: 600,
              color: INK /* Atrium ink */, marginBottom: "0.125rem",
            }}>
              {tc("connections")}
            </div>
            <div style={{
              fontFamily: T.font.body, fontSize: "0.8125rem", color: MUTED /* Atrium muted */, lineHeight: 1.4,
            }}>
              {tf("connectionsRowDesc", "Manage connected photo and cloud services for importing memories")}
            </div>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
            <path d="m9 18 6-6-6-6" />
          </svg>
        </div>
      </Link>

      {/* Section overline — Preferences */}
      <SectionOverline label={tf("sectionPreferences", "Preferences")} />

      {/* ── AI Features Consent ── */}
      <div style={{
        background: T.color.white,
        borderRadius: "1rem",
        border: `0.0625rem solid ${HAIRLINE}`, /* Atrium hairline */
        padding: "1.75rem 2rem",
        boxShadow: "0 0.25rem 1rem rgba(64,59,54,0.07), inset 0 0.0625rem 0 rgba(255,255,255,0.5)", /* Atrium S1 + top highlight */
        marginBottom: "1.5rem",
      }}>
        <h3 style={{
          fontFamily: T.font.display, fontSize: "1.1875rem", fontWeight: 600,
          color: INK /* Atrium ink */, margin: "0 0 0.375rem",
        }}>
          {t("aiFeatures")}
        </h3>
        <p style={{
          fontFamily: T.font.body, fontSize: "0.9375rem", color: MUTED /* Atrium muted */,
          margin: "0 0 1.375rem", lineHeight: 1.4,
        }}>
          {t("aiFeaturesDesc")}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* General AI consent toggle */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "1.125rem 1.25rem", borderRadius: "0.75rem",
            background: TRAY /* Atrium tray — recessed below the white card */,
            border: `0.0625rem solid ${HAIRLINE}`, /* Atrium hairline */
          }}>
            <div style={{ marginRight: "1rem" }}>
              <div style={{
                fontFamily: T.font.body, fontSize: "0.9375rem", fontWeight: 500,
                color: INK /* Atrium ink */,
              }}>
                {t("aiConsent")}
              </div>
              <div style={{
                fontFamily: T.font.body, fontSize: "0.8125rem", color: MUTED /* Atrium muted */,
                marginTop: "0.25rem", lineHeight: 1.4,
              }}>
                {t("aiConsentDesc")}
              </div>
            </div>
            <button
              className="mp-settings-btn"
              role="switch"
              aria-checked={aiConsent}
              disabled={aiSaving}
              onClick={async () => {
                const newVal = !aiConsent;
                setAiSaving(true);
                setAiConsent(newVal);
                const result = await updateProfile({ aiConsent: newVal });
                if (result.error) {
                  setAiConsent(!newVal);
                  showToast(result.error, "error");
                } else {
                  showToast(newVal ? t("aiConsentOn") : t("aiConsentOff"), "success");
                }
                setAiSaving(false);
              }}
              style={{
                width: "3.25rem",
                height: "1.75rem",
                borderRadius: "0.875rem",
                border: "none",
                background: aiConsent ? EMBER /* Atrium ember = active */ : HAIRLINE /* Atrium off track */,
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

      {/* ── Language ── */}
      <div style={{
        background: T.color.white,
        borderRadius: "1rem",
        border: `0.0625rem solid ${HAIRLINE}`, /* Atrium hairline */
        padding: "1.75rem 2rem",
        boxShadow: "0 0.25rem 1rem rgba(64,59,54,0.07), inset 0 0.0625rem 0 rgba(255,255,255,0.5)", /* Atrium S1 + top highlight */
        marginBottom: "1.5rem",
      }}>
        <h3 style={{
          fontFamily: T.font.display, fontSize: "1.1875rem", fontWeight: 600,
          color: INK /* Atrium ink */, margin: "0 0 1rem",
        }}>
          {tc("language")}
        </h3>
        <div role="radiogroup" aria-label={tc("language")} style={{ display: "flex", gap: "0.625rem", flexWrap: "wrap" }}>
          {locales.map((l) => (
            <button
              key={l}
              className="mp-settings-btn"
              role="radio"
              aria-checked={locale === l}
              onClick={() => {
                if (locale === l) return;
                // Language switch reloads the page; warn before dropping unsaved profile edits.
                if (hasChanges && !window.confirm(tf("unsavedEditsWarning", "You have unsaved changes that will be lost. Switch language anyway?"))) {
                  return;
                }
                setLocale(l);
              }}
              style={{
                minHeight: "2.75rem",
                padding: "0.875rem 1.5rem",
                borderRadius: "0.75rem",
                border: `0.125rem solid ${locale === l ? EMBER : HAIRLINE}`,
                background: locale === l ? TRAY /* terracotta tray */ : CREAM /* panel */,
                cursor: "pointer",
                fontFamily: T.font.body,
                fontSize: "0.9375rem",
                fontWeight: locale === l ? 600 : 500,
                color: locale === l ? EMBER_GLYPH : INK,
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
        border: `0.0625rem solid ${HAIRLINE}`, /* Atrium hairline */
        padding: "1.75rem 2rem",
        boxShadow: "0 0.25rem 1rem rgba(64,59,54,0.07), inset 0 0.0625rem 0 rgba(255,255,255,0.5)", /* Atrium S1 + top highlight */
        marginBottom: "1.5rem",
      }}>
        <h3 style={{
          fontFamily: T.font.display, fontSize: "1.1875rem", fontWeight: 600,
          color: INK /* Atrium ink */, margin: "0 0 0.25rem",
        }}>
          {tA11y("title")}
        </h3>
        <p style={{
          fontFamily: T.font.body, fontSize: "0.8125rem", color: MUTED /* Atrium muted */,
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
                className="mp-settings-btn"
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
                  border: isSelected ? `0.125rem solid ${EMBER}` : `0.0625rem solid ${HAIRLINE}`, /* Atrium ember / hairline */
                  background: isSelected ? TRAY /* Atrium terracotta tray */ : CREAM /* Atrium panel */,
                  cursor: "pointer",
                  transition: "all .2s",
                  position: "relative",
                }}
              >
                {isSelected && (
                  <span style={{
                    position: "absolute", top: "0.5rem", right: "0.5rem",
                    width: "1.25rem", height: "1.25rem", borderRadius: "50%",
                    background: EMBER /* Atrium ember */, display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke={T.color.white} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2.5 6l2.5 2.5 4.5-5" />
                    </svg>
                  </span>
                )}
                <span style={{
                  fontFamily: T.font.display, fontSize: previewSize, fontWeight: 600,
                  color: isSelected ? INK : MUTED, /* Atrium ink / muted */
                }}>
                  Aa
                </span>
                <span style={{
                  fontFamily: T.font.body, fontSize: "0.9375rem", fontWeight: 600,
                  color: isSelected ? INK : MUTED, /* Atrium ink / muted */
                }}>
                  {tA11y(level)}
                </span>
                <span style={{
                  fontFamily: T.font.body, fontSize: "0.8125rem",
                  color: MUTED /* Atrium muted */, lineHeight: 1.3,
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
        border: `0.0625rem solid ${HAIRLINE}`, /* Atrium hairline */
        padding: "1.75rem 2rem",
        boxShadow: "0 0.25rem 1rem rgba(64,59,54,0.07), inset 0 0.0625rem 0 rgba(255,255,255,0.5)", /* Atrium S1 + top highlight */
        marginBottom: "1.5rem",
      }}>
        <h3 style={{
          fontFamily: T.font.display, fontSize: "1.1875rem", fontWeight: 600,
          color: INK /* Atrium ink */, margin: "0 0 1rem",
        }}>
          {tc("daylightMode")}
        </h3>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "1.125rem 1.25rem", borderRadius: "0.75rem",
          background: TRAY /* Atrium tray — recessed below the white card */,
          border: `0.0625rem solid ${HAIRLINE}`, /* Atrium hairline */
          marginBottom: daylightEnabled ? "0.75rem" : 0,
        }}>
          <div>
            <div style={{
              fontFamily: T.font.body, fontSize: "0.9375rem", fontWeight: 500,
              color: INK /* Atrium ink */,
            }}>
              {tc("daylightMode")}
            </div>
            <div style={{
              fontFamily: T.font.body, fontSize: "0.8125rem", color: MUTED /* Atrium muted */,
              marginTop: "0.25rem", lineHeight: 1.4,
            }}>
              {tc("daylightDesc")}
            </div>
          </div>
          <button
            className="mp-settings-btn"
            role="switch"
            aria-checked={daylightEnabled}
            onClick={toggleDaylight}
            style={{
              width: "3.25rem",
              height: "1.75rem",
              borderRadius: "0.875rem",
              border: "none",
              background: daylightEnabled ? EMBER /* Atrium ember = active — matches other switches */ : HAIRLINE /* Atrium off track */,
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
                    color: isAuto ? MUTED /* Atrium muted */ : INK /* Atrium ink */,
                  }}>
                    {formatDaylightHour(displayHour)} — {daylightPeriodLabel(displayHour, tc)}
                  </span>
                  <button
                    className="mp-settings-btn"
                    aria-pressed={isAuto}
                    onClick={() => isAuto ? setCustomHour(displayHour) : setDaylightMode("auto")}
                    style={{
                      padding: "0.25rem 0.75rem",
                      borderRadius: "0.5rem",
                      border: `0.0625rem solid ${isAuto ? "rgba(154,79,42,0.35)" : HAIRLINE}`, /* Atrium terracotta / hairline */
                      background: isAuto ? TRAY : CREAM /* Atrium panel */,
                      cursor: "pointer",
                      fontFamily: T.font.body,
                      fontSize: "0.8125rem",
                      fontWeight: isAuto ? 600 : 500,
                      color: isAuto ? EMBER_GLYPH : MUTED, /* Atrium glyph / muted */
                      transition: "all .2s",
                    }}
                  >
                    {tc("daylight_auto")}
                  </button>
                </div>
                <input
                  type="range"
                  className="mp-daylight-range"
                  min={0}
                  max={24}
                  step={0.5}
                  value={displayHour}
                  onChange={(e) => setCustomHour(parseFloat(e.target.value))}
                  aria-label={tc("daylightSlider")}
                  style={{
                    width: "100%",
                    minHeight: "2.75rem", /* touch target >=2.75rem (canon) */
                    accentColor: EMBER, /* Atrium ember */
                    cursor: "pointer",
                  }}
                />
                <div style={{
                  display: "flex", justifyContent: "space-between",
                  fontFamily: T.font.body, fontSize: "0.6875rem", color: MUTED, /* Atrium muted, full opacity */
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

      {/* ── Security & account controls (change 17) ── */}
      <Link href="/settings/security" style={{ textDecoration: "none", display: "block" }}>
        <div style={{
          background: T.color.white,
          borderRadius: "1rem",
          border: `0.0625rem solid ${HAIRLINE}`, /* Atrium hairline */
          padding: "1.125rem 1.5rem",
          boxShadow: "0 0.25rem 1rem rgba(64,59,54,0.07), inset 0 0.0625rem 0 rgba(255,255,255,0.5)", /* Atrium S1 + top highlight */
          display: "flex", alignItems: "center", gap: "1rem",
          minHeight: "2.75rem",
        }}>
          <div style={{
            width: "2.5rem", height: "2.5rem", borderRadius: "0.625rem",
            background: "rgba(154,79,42,0.11)", /* Atrium terracotta medallion */
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, color: EMBER_GLYPH,
          }}>
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: T.font.display, fontSize: "1.0625rem", fontWeight: 600,
              color: INK /* Atrium ink */, marginBottom: "0.125rem",
            }}>
              {tc("security")}
            </div>
            <div style={{
              fontFamily: T.font.body, fontSize: "0.8125rem", color: MUTED /* Atrium muted */, lineHeight: 1.4,
            }}>
              {tf("securityRowDesc", "Password, two-factor authentication, data export and account deletion")}
            </div>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
            <path d="m9 18 6-6-6-6" />
          </svg>
        </div>
      </Link>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-0.5rem); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) { [role="status"], [role="alert"], .mp-avatar-overlay svg { animation: none !important; } }
        button:hover .mp-avatar-overlay { opacity: 1 !important; }
        /* Daylight range: enlarge the draggable thumb hit-area to canon touch size (2.75rem). */
        .mp-daylight-range { -webkit-appearance: none; appearance: none; background: transparent; }
        .mp-daylight-range:focus { outline: none; }
        .mp-daylight-range::-webkit-slider-runnable-track {
          height: 0.375rem; border-radius: 0.1875rem; background: ${HAIRLINE};
        }
        .mp-daylight-range::-moz-range-track {
          height: 0.375rem; border-radius: 0.1875rem; background: ${HAIRLINE};
        }
        .mp-daylight-range::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 2.75rem; height: 2.75rem; border-radius: 1.375rem;
          background: ${EMBER}; border: 0.25rem solid ${CREAM};
          box-shadow: 0 0.0625rem 0.25rem rgba(64,59,54,0.14); /* Atrium warm ink */
          cursor: pointer; margin-top: -1.1875rem; /* centre 2.75rem thumb on 0.375rem track */
        }
        .mp-daylight-range::-moz-range-thumb {
          width: 2.75rem; height: 2.75rem; border-radius: 1.375rem;
          background: ${EMBER}; border: 0.25rem solid ${CREAM};
          box-shadow: 0 0.0625rem 0.25rem rgba(64,59,54,0.14); /* Atrium warm ink */
          cursor: pointer;
        }
        .mp-daylight-range:focus-visible::-webkit-slider-thumb {
          outline: 0.1875rem solid ${GOLD}; outline-offset: 0.125rem; /* Atrium gold focus ring */
        }
        .mp-daylight-range:focus-visible::-moz-range-thumb {
          outline: 0.1875rem solid ${GOLD}; outline-offset: 0.125rem; /* Atrium gold focus ring */
        }
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
  color: MUTED, /* Atrium muted */
  letterSpacing: "0.12em",
  textTransform: "uppercase" as const,
  display: "block",
  marginBottom: "0.5rem",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.875rem 1.125rem",
  borderRadius: "0.75rem",
  border: `0.0625rem solid ${HAIRLINE}`, /* Atrium hairline */
  background: T.color.white,
  fontFamily: T.font.body,
  fontSize: "1rem", /* >=16px so iOS Safari never zooms-on-focus (canon: inputs >=1rem) */
  color: INK /* Atrium ink */,
  outline: "none",
  boxSizing: "border-box" as const,
  transition: "border-color .2s, box-shadow .2s",
};

/* ── Global focus-visible ring for settings inputs + interactive buttons ── */
const settingsFocusStyle = `
  .mp-settings-input:focus-visible,
  .mp-settings-btn:focus-visible {
    outline: 0.1875rem solid ${GOLD}; /* Atrium gold focus ring */
    outline-offset: 0.1875rem;
  }
`;
