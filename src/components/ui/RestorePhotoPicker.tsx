"use client";

import React, { useState, useEffect, useRef } from "react";
import { T } from "@/lib/theme";
import { Sheet } from "@/components/ui/Sheet";
import RelayIcons from "@/components/ui/RelayIcons";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useMemoryStore } from "@/lib/stores/memoryStore";
import RestorePhotoModal from "@/components/ui/RestorePhotoModal";
import type { Mem } from "@/lib/constants/defaults";

export interface RestorablePhoto {
  mem: Mem;
  /** Local room id (e.g. "ro1") — required by RestorePhotoModal to save the copy into the same room. */
  roomId: string;
}

interface RestorePhotoPickerProps {
  /** The caller's own stored photos eligible for restore, newest first. */
  photos: RestorablePhoto[];
  /** Room a brand-new upload lands in (newest photo's room, else the first room). Undefined hides the upload path. */
  uploadRoomId?: string;
  onClose: () => void;
}

interface RestoreQuota {
  used: number;
  limit: number;
}

/**
 * "Restore a Photo" entry flow from the Atrium tile. Instead of dropping the
 * user in the Library with a transient hint, this shows their own photos in a
 * grid right away: tap one → straight into the RestorePhotoModal before/after
 * flow. Closing the modal returns here so several photos can be restored in a
 * row. "Upload a photo" runs the normal upload INSIDE this flow (addMemory →
 * /api/upload → createMemory) and then opens the restore modal on the fresh
 * photo directly — no round-trip through the Library and back.
 *
 * Canon: inline styles, rem, T.color tokens, Fraunces + Source Sans, >=2.75rem
 * touch targets, reduced-motion guard on the spinner.
 */
export default function RestorePhotoPicker({ photos, uploadRoomId, onClose }: RestorePhotoPickerProps) {
  const { t } = useTranslation("memoryDetail");
  const { t: tc } = useTranslation("common");
  const { addMemory } = useMemoryStore();
  const [selected, setSelected] = useState<RestorablePhoto | null>(null);
  const [quota, setQuota] = useState<RestoreQuota | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Remaining-restores line (same source the modal uses). Best-effort: the
  // picker renders fine without it, so failures stay silent.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/ai-enhance")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.quota && typeof data.quota.limit === "number") setQuota(data.quota as RestoreQuota);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const quotaLeft = quota ? Math.max(quota.limit - quota.used, 0) : null;

  // Upload-in-place: persist through the app's normal path, then jump straight
  // into the restore modal on the fresh photo. addMemory swaps the optimistic
  // client id for the SERVER id in the store on success — the restore backend
  // looks the photo up by that id, so we re-read the store to find the fresh
  // entry (the one that wasn't there before) rather than trusting our local id.
  const handleFile = async (file: File) => {
    if (!uploadRoomId || uploading) return;
    setUploadError(false);
    setUploading(true);
    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const clientId = `restoreup-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const before = new Set((useMemoryStore.getState().userMems[uploadRoomId] || []).map((m) => m.id));
      before.add(clientId);
      const ok = await addMemory(uploadRoomId, {
        id: clientId,
        title: file.name.replace(/\.[^.]+$/, "") || t("restorePickerUploadTitle"),
        hue: Math.floor(Math.random() * 360), s: 50, l: 70,
        type: "photo",
        dataUrl,
        desc: "",
        createdAt: new Date().toISOString(),
      });
      if (!ok) { setUploadError(true); return; }
      const after = useMemoryStore.getState().userMems[uploadRoomId] || [];
      const fresh = after.find((m) => !before.has(m.id)) || after.find((m) => m.id === clientId);
      if (fresh) setSelected({ mem: fresh, roomId: uploadRoomId });
      else setUploadError(true);
    } catch {
      setUploadError(true);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const ghostBtn: React.CSSProperties = {
    minHeight: T.touch, padding: "0 1.25rem", borderRadius: T.radius.md,
    border: `0.0625rem solid ${T.color.hairline}`, background: T.color.cream, color: T.color.ink,
    fontFamily: T.font.body, fontSize: "1rem", fontWeight: 600, cursor: "pointer",
  };
  const primaryBtn: React.CSSProperties = {
    minHeight: T.touch, padding: "0 1.25rem", borderRadius: T.radius.md,
    border: "none", background: T.color.ember, color: T.color.cream,
    fontFamily: T.font.body, fontSize: "1rem", fontWeight: 600, cursor: "pointer",
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
  };

  const uploadButton = uploadRoomId ? (
    <button onClick={() => fileInputRef.current?.click()} style={{ ...primaryBtn, opacity: uploading ? 0.7 : 1 }} disabled={uploading}>
      {uploading && (
        <span
          className="mp-restorepick-spin"
          aria-hidden
          style={{
            width: "1rem", height: "1rem", flex: "0 0 auto",
            border: `0.125rem solid rgba(255,255,255,0.4)`, borderTopColor: T.color.cream,
            borderRadius: "50%", animation: "mp-restorepick-spin 0.9s linear infinite",
          }}
        />
      )}
      {uploading ? t("restorePickerUploading") : t("restorePickerAddPhotos")}
    </button>
  ) : null;

  // A photo is picked → hand over to the existing restore flow. Rendering the
  // modal INSTEAD of the picker sheet (both are Sheets) keeps one layer open at
  // a time; the modal's onClose returns to the grid for another pick.
  if (selected) {
    return (
      <RestorePhotoModal
        memory={selected.mem}
        roomId={selected.roomId}
        side="right"
        onClose={() => setSelected(null)}
      />
    );
  }

  // side="right": the Atrium's unified right-anchored side sheet (phones get
  // the bottom sheet automatically), matching every other Atrium tile panel.
  return (
    <Sheet open onClose={onClose} title={t("restorePickerTitle")} icon={<RelayIcons.restore />} iconTint="terracotta" side="right" maxWidth="30rem">
      <style>{`
        @keyframes mp-restorepick-spin { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) { .mp-restorepick-spin { animation: none !important; } }
      `}</style>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />

      {photos.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
          <p style={{ fontFamily: T.font.display, fontSize: T.fontSize.lg, color: T.color.ink, margin: "0 0 0.5rem" }}>
            {t("restorePickerEmptyTitle")}
          </p>
          <p style={{ fontFamily: T.font.body, fontSize: T.fontSize.base, color: T.color.inkMuted, lineHeight: 1.55, margin: "0 0 1.25rem" }}>
            {t("restorePickerEmptyBody")}
          </p>
          {uploadError && (
            <p style={{ fontFamily: T.font.body, fontSize: T.fontSize.sm, color: T.color.ember, margin: "0 0 1rem" }}>
              {t("restorePickerUploadFailed")}
            </p>
          )}
          <div style={{ display: "flex", gap: T.space.sm, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={onClose} style={ghostBtn}>{tc("close")}</button>
            {uploadButton}
          </div>
        </div>
      ) : (
        <div>
          <p style={{ fontFamily: T.font.body, fontSize: T.fontSize.base, color: T.color.inkMuted, lineHeight: 1.55, margin: "0 0 1rem" }}>
            {t("restorePickerIntro")}
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(7.5rem, 1fr))",
              gap: T.space.sm,
            }}
          >
            {photos.map((p) => (
              <button
                key={p.mem.id}
                onClick={() => setSelected(p)}
                aria-label={t("restorePickerPickLabel", { title: p.mem.title || tc("untitled") })}
                style={{
                  padding: 0, border: `0.0625rem solid ${T.color.hairline}`, borderRadius: T.radius.md,
                  background: T.color.warmStone, cursor: "pointer", overflow: "hidden",
                  display: "block", textAlign: "left",
                }}
              >
                <div style={{ aspectRatio: "1 / 1", overflow: "hidden" }}>
                  <img
                    src={p.mem.thumbnailUrl || p.mem.dataUrl || undefined}
                    alt=""
                    loading="lazy"
                    style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>
                <span
                  style={{
                    display: "block", padding: "0.375rem 0.5rem", minHeight: "2rem",
                    fontFamily: T.font.body, fontSize: T.fontSize.xs, fontWeight: 600, color: T.color.ink,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}
                >
                  {p.mem.title || tc("untitled")}
                </span>
              </button>
            ))}
          </div>

          {uploadError && (
            <p style={{ fontFamily: T.font.body, fontSize: T.fontSize.sm, color: T.color.ember, textAlign: "center", margin: `${T.space.md} 0 0` }}>
              {t("restorePickerUploadFailed")}
            </p>
          )}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: T.space.sm, flexWrap: "wrap", marginTop: T.space.md }}>
            <span style={{ fontFamily: T.font.body, fontSize: T.fontSize.sm, color: T.color.inkMuted }}>
              {quotaLeft !== null ? t("restoreQuotaLeft", { left: String(quotaLeft), limit: String(quota!.limit) }) : ""}
            </span>
            {uploadButton}
          </div>
        </div>
      )}
    </Sheet>
  );
}
