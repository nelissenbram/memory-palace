"use client";

import React, { useState, useEffect, useMemo } from "react";
import { T } from "@/lib/theme";
import { Sheet } from "@/components/ui/Sheet";
import { useTranslation } from "@/lib/hooks/useTranslation";
import RestorePhotoModal from "@/components/ui/RestorePhotoModal";
import type { Mem } from "@/lib/constants/defaults";

export interface RestorablePhoto {
  mem: Mem;
  /** Local room id (e.g. "ro1") — required by RestorePhotoModal to save the copy into the same room. */
  roomId: string;
}

interface RestorePhotoPickerProps {
  /** The caller's own stored photos (https-backed) eligible for restore, newest first. */
  photos: RestorablePhoto[];
  /** Route the user into the normal photo-upload flow (used when they have nothing to restore yet). */
  onAddPhotos: () => void;
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
 * row; the empty state hands users with no photos to the upload flow.
 *
 * Canon: inline styles, rem, T.color tokens, Fraunces + Source Sans, >=2.75rem
 * touch targets.
 */
export default function RestorePhotoPicker({ photos, onAddPhotos, onClose }: RestorePhotoPickerProps) {
  const { t } = useTranslation("memoryDetail");
  const { t: tc } = useTranslation("common");
  const [selected, setSelected] = useState<RestorablePhoto | null>(null);
  const [quota, setQuota] = useState<RestoreQuota | null>(null);

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

  const ghostBtn: React.CSSProperties = {
    minHeight: T.touch, padding: "0 1.25rem", borderRadius: T.radius.md,
    border: `0.0625rem solid ${T.color.hairline}`, background: T.color.cream, color: T.color.ink,
    fontFamily: T.font.body, fontSize: "1rem", fontWeight: 600, cursor: "pointer",
  };
  const primaryBtn: React.CSSProperties = {
    minHeight: T.touch, padding: "0 1.25rem", borderRadius: T.radius.md,
    border: "none", background: T.color.ember, color: T.color.cream,
    fontFamily: T.font.body, fontSize: "1rem", fontWeight: 600, cursor: "pointer",
  };

  const emptyState = useMemo(() => photos.length === 0, [photos.length]);

  // A photo is picked → hand over to the existing restore flow. Rendering the
  // modal INSTEAD of the picker sheet (both are Sheets) keeps one layer open at
  // a time; the modal's onClose returns to the grid for another pick.
  if (selected) {
    return (
      <RestorePhotoModal
        memory={selected.mem}
        roomId={selected.roomId}
        onClose={() => setSelected(null)}
      />
    );
  }

  return (
    <Sheet open onClose={onClose} title={t("restorePickerTitle")} maxWidth="42rem">
      {emptyState ? (
        <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
          <p style={{ fontFamily: T.font.display, fontSize: T.fontSize.lg, color: T.color.ink, margin: "0 0 0.5rem" }}>
            {t("restorePickerEmptyTitle")}
          </p>
          <p style={{ fontFamily: T.font.body, fontSize: T.fontSize.base, color: T.color.inkMuted, lineHeight: 1.55, margin: "0 0 1.25rem" }}>
            {t("restorePickerEmptyBody")}
          </p>
          <div style={{ display: "flex", gap: T.space.sm, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={onClose} style={ghostBtn}>{tc("close")}</button>
            <button onClick={onAddPhotos} style={primaryBtn}>{t("restorePickerAddPhotos")}</button>
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

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: T.space.sm, flexWrap: "wrap", marginTop: T.space.md }}>
            <span style={{ fontFamily: T.font.body, fontSize: T.fontSize.sm, color: T.color.inkMuted }}>
              {quotaLeft !== null ? t("restoreQuotaLeft", { left: String(quotaLeft), limit: String(quota!.limit) }) : ""}
            </span>
            <button onClick={onAddPhotos} style={ghostBtn}>{t("restorePickerAddPhotos")}</button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
