"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useRoomStore } from "@/lib/stores/roomStore";
import { translateWingName, translateRoomName } from "@/lib/constants/wings";

interface SharedFile {
  id: string;
  name: string;
  type: string;
  blob: Blob;
  previewUrl: string | null;
}

export default function ShareReceivePage() {
  const { t } = useTranslation("shareReceive");
  const { t: tWings } = useTranslation("wings");
  const { t: tc } = useTranslation("common");
  const isMobile = useIsMobile();
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomStore = useRoomStore();
  const allWings = roomStore.getWings();

  const [files, setFiles] = useState<SharedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [targetWingId, setTargetWingId] = useState(allWings[0]?.id || "");
  const [targetRoomId, setTargetRoomId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const [done, setDone] = useState(false);

  const targetRooms = roomStore.getWingRooms(targetWingId);

  // Default room selection
  useEffect(() => {
    if (!targetRoomId && targetRooms.length > 0) setTargetRoomId(targetRooms[0].id);
    else if (targetRoomId && !targetRooms.some((r) => r.id === targetRoomId)) {
      setTargetRoomId(targetRooms[0]?.id || "");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetWingId]);

  // Load shared files from SW cache
  useEffect(() => {
    async function loadSharedFiles() {
      const fileIds = searchParams.get("files")?.split(",").filter(Boolean) || [];
      if (fileIds.length === 0) {
        setLoading(false);
        return;
      }

      const cache = await caches.open("share-target-v1");
      const loaded: SharedFile[] = [];

      for (const id of fileIds) {
        try {
          const response = await cache.match(`/share-file/${id}`);
          if (response) {
            const blob = await response.blob();
            const name = response.headers.get("X-File-Name") || `shared-${id}`;
            const type = response.headers.get("Content-Type") || "image/jpeg";
            const isImage = type.startsWith("image/");
            loaded.push({
              id,
              name,
              type,
              blob,
              previewUrl: isImage ? URL.createObjectURL(blob) : null,
            });
            // Clean up cache entry
            await cache.delete(`/share-file/${id}`);
          }
        } catch { /* skip failed */ }
      }

      setFiles(loaded);
      setLoading(false);
    }

    loadSharedFiles();
  }, [searchParams]);

  const handleUpload = useCallback(async () => {
    if (files.length === 0 || !targetRoomId) return;
    setUploading(true);
    setUploadCount(0);
    let count = 0;

    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file.blob, file.name);
      formData.append("roomId", targetRoomId);
      formData.append("source", "share_target");
      try {
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        if (res.ok) count++;
      } catch { /* skip */ }
      setUploadCount(count);
    }

    // Clean up preview URLs
    files.forEach((f) => { if (f.previewUrl) URL.revokeObjectURL(f.previewUrl); });
    setUploading(false);
    setDone(true);
  }, [files, targetRoomId]);

  // Done state — redirect after delay
  useEffect(() => {
    if (done) {
      const timer = setTimeout(() => router.push("/palace"), 2000);
      return () => clearTimeout(timer);
    }
  }, [done, router]);

  if (loading) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        minHeight: "60vh",
        fontFamily: T.font.body, fontSize: "1rem", color: T.color.muted,
      }}>
        {t("loading")}
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        minHeight: "60vh", gap: "1rem", padding: "2rem",
        textAlign: "center",
      }}>
        <p style={{ fontFamily: T.font.display, fontSize: "1.25rem", color: T.color.charcoal }}>
          {t("noFiles")}
        </p>
        <p style={{ fontFamily: T.font.body, fontSize: "0.875rem", color: T.color.muted }}>
          {t("noFilesHint")}
        </p>
        <button
          onClick={() => router.push("/palace")}
          style={{
            padding: "0.75rem 1.5rem", borderRadius: "0.625rem",
            border: "none",
            background: `linear-gradient(135deg, ${T.color.gold}, ${T.color.goldDark})`,
            color: T.color.white,
            fontFamily: T.font.display, fontSize: "1rem", fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {t("goToPalace")}
        </button>
      </div>
    );
  }

  if (done) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        minHeight: "60vh", gap: "1rem",
        textAlign: "center",
      }}>
        <div style={{ fontSize: "2.5rem" }}>&#10003;</div>
        <p style={{ fontFamily: T.font.display, fontSize: "1.25rem", color: T.color.charcoal }}>
          {t("doneTitle", { count: String(uploadCount) })}
        </p>
        <p style={{ fontFamily: T.font.body, fontSize: "0.875rem", color: T.color.muted }}>
          {t("doneRedirect")}
        </p>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: "32rem", margin: "0 auto",
      padding: isMobile ? "1.5rem 1rem" : "3rem 2rem",
    }}>
      <h1 style={{
        fontFamily: T.font.display, fontSize: isMobile ? "1.5rem" : "1.75rem",
        fontWeight: 500, color: T.color.charcoal,
        margin: "0 0 0.5rem",
      }}>
        {t("title")}
      </h1>
      <p style={{
        fontFamily: T.font.body, fontSize: "0.875rem", color: T.color.muted,
        margin: "0 0 1.5rem",
      }}>
        {t("subtitle", { count: String(files.length) })}
      </p>

      {/* Preview thumbnails */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(5rem, 1fr))",
        gap: "0.5rem",
        marginBottom: "1.5rem",
      }}>
        {files.map((file) => (
          <div key={file.id} style={{
            aspectRatio: "1",
            borderRadius: "0.5rem",
            overflow: "hidden",
            background: T.color.warmStone,
            border: `1px solid ${T.color.cream}`,
          }}>
            {file.previewUrl ? (
              <img src={file.previewUrl} alt={file.name} style={{
                width: "100%", height: "100%", objectFit: "cover",
              }} />
            ) : (
              <div style={{
                width: "100%", height: "100%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: T.font.body, fontSize: "0.625rem", color: T.color.muted,
                padding: "0.25rem", textAlign: "center",
              }}>
                {file.name}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Room selector */}
      <div style={{
        padding: "1rem 1.25rem",
        background: T.color.cream,
        borderRadius: "0.75rem",
        border: `1px solid ${T.color.sandstone}`,
        marginBottom: "1.5rem",
        display: "flex", gap: "1rem",
        flexDirection: isMobile ? "column" : "row",
      }}>
        <div style={{ flex: 1 }}>
          <label style={{
            display: "block", fontFamily: T.font.display,
            fontSize: "0.875rem", fontWeight: 600, color: T.color.walnut,
            marginBottom: "0.375rem",
          }}>{t("wing")}</label>
          <select
            value={targetWingId}
            onChange={(e) => setTargetWingId(e.target.value)}
            style={{
              width: "100%", padding: "0.625rem 0.875rem",
              borderRadius: "0.5rem", border: `1px solid ${T.color.sandstone}`,
              background: T.color.white, fontFamily: T.font.body,
              fontSize: "0.9375rem", color: T.color.charcoal,
            }}
          >
            {allWings.map((w) => (
              <option key={w.id} value={w.id}>{translateWingName(w, tWings) || w.id}</option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={{
            display: "block", fontFamily: T.font.display,
            fontSize: "0.875rem", fontWeight: 600, color: T.color.walnut,
            marginBottom: "0.375rem",
          }}>{t("room")}</label>
          <select
            value={targetRoomId}
            onChange={(e) => setTargetRoomId(e.target.value)}
            style={{
              width: "100%", padding: "0.625rem 0.875rem",
              borderRadius: "0.5rem", border: `1px solid ${T.color.sandstone}`,
              background: T.color.white, fontFamily: T.font.body,
              fontSize: "0.9375rem", color: T.color.charcoal,
            }}
          >
            {targetRooms.map((r) => (
              <option key={r.id} value={r.id}>{translateRoomName(r, tWings) || r.id}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Upload button */}
      <button
        onClick={handleUpload}
        disabled={uploading || !targetRoomId}
        style={{
          width: "100%", padding: "0.875rem",
          borderRadius: "0.625rem", border: "none",
          background: uploading
            ? T.color.sandstone
            : `linear-gradient(135deg, ${T.color.gold}, ${T.color.goldDark})`,
          color: T.color.white,
          fontFamily: T.font.display, fontSize: "1rem", fontWeight: 600,
          cursor: uploading ? "default" : "pointer",
          boxShadow: uploading ? "none" : `0 0.25rem 1rem rgba(212,175,55,0.25)`,
        }}
      >
        {uploading
          ? t("uploading", { current: String(uploadCount), total: String(files.length) })
          : t("uploadButton", { count: String(files.length) })
        }
      </button>
    </div>
  );
}
