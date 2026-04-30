"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { updatePerson } from "@/lib/auth/family-tree-actions";
import type { FamilyTreePerson } from "@/lib/auth/family-tree-actions";
import {
  GenderIcon,
  SilhouetteAvatar,
  Spinner,
  SectionCard,
  smallPillStyle,
  formatDateHuman,
} from "./PersonPanelShared";

interface PersonPanelPhotoProps {
  person: FamilyTreePerson;
  fullName: string;
  genderLabel: string | null;
  onUpdate: () => void;
  locale: string;
  children?: React.ReactNode;
}

export default function PersonPanelPhoto({
  person,
  fullName,
  genderLabel,
  onUpdate,
  locale,
  children,
}: PersonPanelPhotoProps) {
  const { t } = useTranslation("familyTree");

  const [uploading, setUploading] = useState(false);
  const [removingPhoto, setRemovingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  // Track the last uploaded URL so we can keep preview until parent provides it
  const lastUploadedUrl = useRef<string | null>(null);
  // Track whether the real (non-blob) image has finished loading
  const [realImageLoaded, setRealImageLoaded] = useState(false);

  const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5 MB

  // Clear the blob preview once the parent has re-rendered with the new photo_path
  // AND the real image has finished loading (so there's no flash of empty avatar)
  useEffect(() => {
    if (
      photoPreview &&
      lastUploadedUrl.current &&
      person.photo_path === lastUploadedUrl.current &&
      realImageLoaded
    ) {
      URL.revokeObjectURL(photoPreview);
      setPhotoPreview(null);
      lastUploadedUrl.current = null;
      setRealImageLoaded(false);
    }
  }, [person.photo_path, photoPreview, realImageLoaded]);

  // Reset realImageLoaded when person changes
  useEffect(() => {
    setRealImageLoaded(false);
  }, [person.id]);

  // Handle real image load error — keep blob preview or show fallback
  const [realImageError, setRealImageError] = useState(false);
  useEffect(() => {
    setRealImageError(false);
  }, [person.photo_path]);

  const processPhotoFile = useCallback(async (file: File) => {
    if (file.size > MAX_PHOTO_SIZE) {
      setPhotoError(t("photoTooLarge"));
      return;
    }
    setUploading(true);
    setPhotoError("");

    // Show immediate preview
    const previewUrl = URL.createObjectURL(file);
    setPhotoPreview(previewUrl);

    const clearPreviewOnError = () => {
      URL.revokeObjectURL(previewUrl);
      setPhotoPreview(null);
      lastUploadedUrl.current = null;
    };

    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setPhotoError(t("photoUploadError")); setUploading(false); clearPreviewOnError(); return; }
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/family-tree/${person.id}_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("memories")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) {
        console.error("Photo upload error:", upErr);
        setPhotoError(t("photoUploadError") + ": " + upErr.message);
        clearPreviewOnError();
      } else {
        const { data: urlData } = supabase.storage
          .from("memories")
          .getPublicUrl(path);
        const updateResult = await updatePerson(person.id, { photo_path: urlData.publicUrl });
        if (updateResult && "error" in updateResult && updateResult.error) {
          setPhotoError(t("photoUploadError") + ": " + updateResult.error);
          clearPreviewOnError();
        } else {
          // Keep preview alive — store the expected URL so the useEffect
          // can clear the blob preview once person.photo_path matches.
          lastUploadedUrl.current = urlData.publicUrl;
          onUpdate();
        }
      }
    } catch (err) {
      console.error("Photo upload exception:", err);
      setPhotoError(t("photoUploadError"));
      clearPreviewOnError();
    }
    setUploading(false);
  }, [person.id, t, onUpdate]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processPhotoFile(file);
  };

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file && file.type.startsWith("image/")) {
        await processPhotoFile(file);
      }
    },
    [processPhotoFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleRemovePhoto = async () => {
    setRemovingPhoto(true);
    setPhotoError("");
    try {
      await updatePerson(person.id, { photo_path: null });
      onUpdate();
    } catch {
      setPhotoError(t("photoRemoveError"));
    }
    setRemovingPhoto(false);
  };

  const isPhotoSkipped = person.photo_path === "__none__";
  const displayPhoto = photoPreview || (isPhotoSkipped ? null : person.photo_path);
  // The actual stored URL (not the blob preview) for the lightbox
  const storedPhoto = !isPhotoSkipped ? person.photo_path : null;

  const handleMarkNoPhoto = async () => {
    setRemovingPhoto(true);
    setPhotoError("");
    try {
      await updatePerson(person.id, { photo_path: "__none__" });
      onUpdate();
    } catch {
      setPhotoError(t("photoRemoveError"));
    }
    setRemovingPhoto(false);
  };

  const handleClearNoPhoto = async () => {
    setRemovingPhoto(true);
    setPhotoError("");
    try {
      await updatePerson(person.id, { photo_path: null });
      onUpdate();
    } catch {
      setPhotoError(t("photoRemoveError"));
    }
    setRemovingPhoto(false);
  };

  const handleAvatarClick = () => {
    // If there is a stored photo (not uploading), open lightbox
    if (storedPhoto && !uploading) {
      setLightboxOpen(true);
    } else {
      fileRef.current?.click();
    }
  };

  return (
    <SectionCard>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "1rem",
        }}
      >
        {/* Photo avatar with drag-drop */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={handleAvatarClick}
          style={{
            width: "5rem",
            height: "5rem",
            borderRadius: "2.5rem",
            border: dragOver
              ? `3px dashed ${T.color.terracotta}`
              : `3px solid ${T.color.walnut}`,
            background: dragOver
              ? `${T.color.terracotta}15`
              : `linear-gradient(135deg, ${T.color.warmStone}, ${T.color.sandstone})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "2rem",
            color: T.color.walnut,
            overflow: "hidden",
            flexShrink: 0,
            position: "relative",
            cursor: "pointer",
            transition: "border-color .2s ease",
          }}
          title={storedPhoto && !uploading ? t("viewPhoto") : t("uploadPhoto")}
        >
          {uploading && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(255,255,255,0.7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 2,
                borderRadius: "50%",
              }}
            >
              <Spinner size="1.5rem" color={T.color.terracotta} />
            </div>
          )}
          {displayPhoto ? (
            photoPreview ? (
              <>
                {/* Render real image behind the blob preview so it can load in background */}
                {person.photo_path && person.photo_path !== "__none__" && person.photo_path === lastUploadedUrl.current && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={person.photo_path}
                    alt={fullName}
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0 }}
                    onLoad={() => setRealImageLoaded(true)}
                    onError={() => { setRealImageError(true); setRealImageLoaded(true); }}
                  />
                )}
                {/* Blob preview: use plain <img> — Next.js Image can't optimise blob: URLs */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoPreview}
                  alt={fullName}
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderRadius: "50%",
                    zIndex: 1,
                  }}
                />
              </>
            ) : realImageError ? (
              /* Stored URL failed to load — show silhouette fallback */
              <SilhouetteAvatar gender={person.gender} size={36} birthDate={person.birth_date} deathDate={person.death_date} />
            ) : (
              /* Plain <img> for stored photo — avoids Next.js Image proxy/domain issues */
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={displayPhoto}
                alt={fullName}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  borderRadius: "50%",
                }}
                onError={() => setRealImageError(true)}
              />
            )
          ) : isPhotoSkipped ? (
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.125rem",
            }}>
              <SilhouetteAvatar gender={person.gender} size={28} birthDate={person.birth_date} deathDate={person.death_date} />
              <span style={{
                fontFamily: T.font.body,
                fontSize: "0.5rem",
                color: T.color.muted,
                textTransform: "uppercase",
                letterSpacing: "0.03em",
              }}>N/A</span>
            </div>
          ) : (
            <SilhouetteAvatar gender={person.gender} size={36} birthDate={person.birth_date} deathDate={person.death_date} />
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: T.font.display,
              fontSize: "1.125rem",
              fontWeight: 600,
              color: T.color.charcoal,
            }}
          >
            {fullName}
          </div>
          {/* Gender display with icon */}
          {genderLabel && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.375rem",
                marginTop: "0.125rem",
                fontFamily: T.font.body,
                fontSize: "0.8125rem",
                color: T.color.walnut,
              }}
            >
              <GenderIcon gender={person.gender} />
              <span>{genderLabel}</span>
            </div>
          )}
          {/* Lifespan with human-friendly dates */}
          {(person.birth_date || person.death_date) && (
            <div
              style={{
                fontFamily: T.font.body,
                fontSize: "0.8125rem",
                color: T.color.muted,
                marginTop: "0.125rem",
              }}
              title={
                [
                  person.birth_date ? `${t("born")}: ${formatDateHuman(person.birth_date, locale)}` : "",
                  person.death_date ? `${t("died")}: ${formatDateHuman(person.death_date, locale)}` : "",
                ]
                  .filter(Boolean)
                  .join(" \u2014 ")
              }
            >
              {person.birth_date ? formatDateHuman(person.birth_date, locale) : "?"}
              {person.birth_place ? `, ${person.birth_place}` : ""} {"\u2013"}{" "}
              {person.death_date ? formatDateHuman(person.death_date, locale) : ""}
              {person.death_place ? `, ${person.death_place}` : ""}
            </div>
          )}

          {/* Photo actions */}
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                fileRef.current?.click();
              }}
              disabled={uploading}
              style={smallPillStyle}
            >
              {uploading ? (
                <>
                  <Spinner size="0.75rem" color={T.color.walnut} />{" "}
                  <span style={{ marginLeft: "0.375rem" }}>{t("uploadingPhoto")}</span>
                </>
              ) : (
                t("uploadPhoto")
              )}
            </button>
            {person.photo_path && !isPhotoSkipped && (
              <>
                <button
                  onClick={() => setLightboxOpen(true)}
                  style={{
                    ...smallPillStyle,
                    color: T.color.walnut,
                    borderColor: `${T.color.walnut}40`,
                  }}
                >
                  {t("viewPhoto")}
                </button>
                <button
                  onClick={handleRemovePhoto}
                  disabled={removingPhoto}
                  style={{
                    ...smallPillStyle,
                    color: T.color.error,
                    borderColor: `${T.color.error}40`,
                  }}
                >
                  {removingPhoto ? t("removingPhoto") : t("removePhoto")}
                </button>
              </>
            )}
            {!person.photo_path && (
              <button
                onClick={handleMarkNoPhoto}
                disabled={removingPhoto}
                style={{
                  ...smallPillStyle,
                  color: T.color.muted,
                  borderColor: `${T.color.sandstone}`,
                  fontSize: "0.6875rem",
                }}
              >
                N/A
              </button>
            )}
            {isPhotoSkipped && (
              <button
                onClick={handleClearNoPhoto}
                disabled={removingPhoto}
                style={{
                  ...smallPillStyle,
                  color: T.color.muted,
                  borderColor: `${T.color.sandstone}`,
                  fontSize: "0.6875rem",
                }}
              >
                {t("undoNoPhoto")}
              </button>
            )}
          </div>
          {photoError && (
            <div
              style={{
                marginTop: "0.375rem",
                fontFamily: T.font.body,
                fontSize: "0.75rem",
                color: T.color.error,
              }}
            >
              {photoError}
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            style={{ display: "none" }}
          />
        </div>
      </div>

      {children}

      {/* Photo lightbox overlay */}
      {lightboxOpen && storedPhoto && (
        <div
          onClick={() => setLightboxOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0, 0, 0, 0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          {/* Close button */}
          <button
            onClick={() => setLightboxOpen(false)}
            aria-label={t("closePhoto")}
            style={{
              position: "absolute",
              top: "1rem",
              right: "1rem",
              background: "rgba(255,255,255,0.15)",
              border: "none",
              borderRadius: "50%",
              width: "2.5rem",
              height: "2.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#fff",
              fontSize: "1.25rem",
              fontFamily: T.font.body,
              zIndex: 10000,
            }}
          >
            &times;
          </button>
          {/* Enlarged photo */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              maxWidth: "90vw",
              maxHeight: "85vh",
              borderRadius: "0.75rem",
              overflow: "hidden",
              boxShadow: "0 0.5rem 3rem rgba(0,0,0,0.5)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={storedPhoto}
              alt={fullName}
              style={{
                display: "block",
                maxWidth: "90vw",
                maxHeight: "85vh",
                objectFit: "contain",
                borderRadius: "0.75rem",
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                padding: "0.75rem 1rem",
                background: "linear-gradient(transparent, rgba(0,0,0,0.6))",
                color: "#fff",
                fontFamily: T.font.display,
                fontSize: "1rem",
                textAlign: "center",
              }}
            >
              {fullName}
            </div>
          </div>
        </div>
      )}
    </SectionCard>
  );
}
