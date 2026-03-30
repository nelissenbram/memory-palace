"use client";
import { useState, useRef, useCallback, useEffect, lazy, Suspense } from "react";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import { useImportStore, type ImportItem } from "@/lib/stores/importStore";
import { useMemoryStore } from "@/lib/stores/memoryStore";
import { useRoomStore } from "@/lib/stores/roomStore";
import { extractExif } from "@/lib/utils/exif";
import { generateThumbnail } from "@/lib/utils/thumbnail";
import Image from "next/image";
import type { Mem } from "@/lib/constants/defaults";

const CloudImportPanel = lazy(() => import("./CloudImportPanel"));

interface Props {
  onClose: () => void;
  initialWingId?: string | null;
  initialRoomId?: string | null;
}

// ═══ Display type options ═══
const DISPLAY_TYPES: [string, string, string][] = [
  ["photo", "\u{1F5BC}\uFE0F", "typeFrame"], ["painting", "\u{1F3A8}", "typePainting"],
  ["video", "\u{1F3AC}", "typeScreen"], ["album", "\u{1F4D6}", "typeAlbum"],
  ["orb", "\u{1F52E}", "typeOrb"], ["case", "\u{1F3FA}", "typeVitrine"],
  ["audio", "\u{1F3B5}", "typeAudio"], ["document", "\u{1F4DC}", "typeDocument"],
];

const TYPE_ICONS: Record<string, string> = Object.fromEntries(DISPLAY_TYPES.map(([k, v]) => [k, v]));

function formatBytes(b: number): string {
  if (b < 1024) return b + " B";
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + " KB";
  return (b / (1024 * 1024)).toFixed(1) + " MB";
}

const MAX_IMAGE_SIZE = 50 * 1024 * 1024; // 50 MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100 MB

function isFileTooLarge(file: File): boolean {
  const maxSize = file.type.startsWith("video/") ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
  return file.size > maxSize;
}

// ═══ Main Panel ═══
export default function MassImportPanel({ onClose, initialWingId, initialRoomId }: Props) {
  const isMobile = useIsMobile();
  const { t } = useTranslation("massImport");
  const { t: tc } = useTranslation("common");
  const { containerRef, handleKeyDown } = useFocusTrap(true);
  const store = useImportStore();
  const addMemory = useMemoryStore((s) => s.addMemory);
  const { getWings, getWingRooms } = useRoomStore();
  const wings = getWings();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [tab, setTab] = useState<"review" | "accepted" | "rejected" | "all">("review");
  const [showCloud, setShowCloud] = useState(false);
  const [skippedOversized, setSkippedOversized] = useState(0);

  // Initialize targets from props
  useEffect(() => {
    if (initialWingId) store.setTarget(initialWingId, initialRoomId || null);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFiles = useCallback((files: FileList | File[]) => {
    const supported = Array.from(files).filter(
      (f) => f.type.startsWith("image/") || f.type.startsWith("video/") || f.type.startsWith("audio/") ||
        f.type.includes("pdf") || f.type.includes("document") || f.type.includes("word")
    );
    const oversized = supported.filter(isFileTooLarge);
    const arr = supported.filter((f) => !isFileTooLarge(f));
    if (oversized.length > 0) setSkippedOversized((prev) => prev + oversized.length);
    if (arr.length > 0) store.addFiles(arr);
  }, [store]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  // ── Processing pipeline ──
  const startProcessing = async () => {
    const items = store.items.filter((i) => i.status === "queued");
    if (items.length === 0) return;
    store.setStep("processing");
    store.setProgress({ total: items.length, processed: 0, errors: 0 });

    // Phase 1: Read files, extract EXIF, generate thumbnails
    for (const item of items) {
      try {
        store.updateItem(item.localId, { status: "reading" });

        // Read as dataUrl
        const maxLabel = item.file.type.startsWith("video/") ? "100 MB" : "50 MB";
        const fileTooLargeMsg = t("fileTooLarge", { size: (item.file.size / (1024 * 1024)).toFixed(1), max: maxLabel });
        const dataUrl = await readFileAsDataUrl(item.file, fileTooLargeMsg);
        const previewUrl = await generateThumbnail(item.file) || (item.file.type.startsWith("image/") ? URL.createObjectURL(item.file) : null);

        store.updateItem(item.localId, { status: "extracting", dataUrl, previewUrl });

        // Extract EXIF
        const exif = await extractExif(item.file);
        const updates: Partial<ImportItem> = { exif };
        if (exif?.lat && exif?.lng) {
          updates.confirmed = {
            ...useImportStore.getState().items.find((i) => i.localId === item.localId)!.confirmed,
            lat: exif.lat, lng: exif.lng,
          };
        }
        if (exif?.dateTaken) {
          // Use EXIF date for createdAt later
        }
        store.updateItem(item.localId, updates);
        store.setProgress({ processed: (useImportStore.getState().progress.processed || 0) + 1 });
      } catch (err: any) {
        store.updateItem(item.localId, { status: "error", error: err.message || t("failedToReadFile") });
        store.setProgress({ errors: (useImportStore.getState().progress.errors || 0) + 1 });
      }
    }

    // Phase 2: AI tagging (if AI mode + API key)
    const readyItems = useImportStore.getState().items.filter((i) => i.status === "extracting");
    if (store.mode === "ai") {
      // Batch into groups of 10
      for (let i = 0; i < readyItems.length; i += 10) {
        const batch = readyItems.slice(i, i + 10);
        for (const item of batch) store.updateItem(item.localId, { status: "tagging" });

        try {
          const wingsData = wings.map((w) => ({
            id: w.id, name: w.name, desc: w.desc,
            rooms: getWingRooms(w.id).map((r) => ({ id: r.id, name: r.name })),
          }));

          const res = await fetch("/api/ai-tag", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              items: batch.map((item) => ({
                fileName: item.fileName,
                fileType: item.fileType,
                exif: item.exif,
                thumbnailBase64: item.previewUrl?.startsWith("data:") ? item.previewUrl : null,
              })),
              wings: wingsData,
            }),
          });

          if (res.ok) {
            const { suggestions } = await res.json();
            for (let j = 0; j < batch.length && j < suggestions.length; j++) {
              const s = suggestions[j];
              const needsReview = Math.random() < store.reviewSampleRate;
              store.updateItem(batch[j].localId, {
                aiSuggestions: s,
                confirmed: {
                  ...useImportStore.getState().items.find((it) => it.localId === batch[j].localId)!.confirmed,
                  title: s.title || batch[j].confirmed.title,
                  desc: s.desc || "",
                  type: s.type || batch[j].confirmed.type,
                  wingId: s.wingId || batch[j].confirmed.wingId,
                  roomId: s.roomId || batch[j].confirmed.roomId,
                  locationName: s.locationName || "",
                },
                status: needsReview ? "ready" : "accepted",
                needsReview,
              });
            }
          } else {
            // AI failed — fall back to smart defaults
            for (const item of batch) {
              store.updateItem(item.localId, { status: "ready", needsReview: true });
            }
          }
        } catch {
          for (const item of batch) {
            store.updateItem(item.localId, { status: "ready", needsReview: true });
          }
        }
      }
    } else {
      // Manual mode or no API key — all go to ready, all need review
      for (const item of readyItems) {
        store.updateItem(item.localId, { status: "ready", needsReview: false });
      }
    }

    // Mark remaining extracting items as ready
    for (const item of useImportStore.getState().items) {
      if (item.status === "extracting" || item.status === "tagging") {
        store.updateItem(item.localId, { status: "ready" });
      }
    }

    store.setStep("review");
  };

  // ── Commit ──
  const commitAll = async () => {
    store.setStep("committing");
    const accepted = useImportStore.getState().items.filter((i) => i.status === "accepted");
    store.setProgress({ total: accepted.length, committed: 0, errors: 0 });

    for (const item of accepted) {
      try {
        const hue = Math.floor(Math.random() * 360);
        const mem: Mem = {
          id: Date.now().toString() + "_" + item.localId,
          title: item.confirmed.title,
          hue,
          s: 45 + Math.floor(Math.random() * 15),
          l: 55 + Math.floor(Math.random() * 15),
          type: item.confirmed.type,
          desc: item.confirmed.desc,
          dataUrl: item.dataUrl || null,
          videoBlob: item.fileType.startsWith("video/"),
          createdAt: item.exif?.dateTaken || new Date().toISOString(),
        };
        if (item.confirmed.lat !== null && item.confirmed.lng !== null) {
          mem.lat = item.confirmed.lat;
          mem.lng = item.confirmed.lng;
        }
        if (item.confirmed.locationName) mem.locationName = item.confirmed.locationName;

        await addMemory(item.confirmed.roomId, mem);
        store.updateItem(item.localId, { status: "committed" });
        store.setProgress({ committed: (useImportStore.getState().progress.committed || 0) + 1 });
      } catch (err: any) {
        store.updateItem(item.localId, { status: "error", error: err.message });
        store.setProgress({ errors: (useImportStore.getState().progress.errors || 0) + 1 });
      }
    }

    store.setStep("done");
  };

  const { step, items, mode, progress, targetWingId, targetRoomId } = store;
  const totalSize = items.reduce((n, i) => n + i.fileSizeBytes, 0);

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(42,34,24,.5)", backdropFilter: "blur(10px)", zIndex: 60, animation: "fadeIn .2s ease", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div ref={containerRef} role="dialog" aria-modal="true" aria-label={t("title")} onKeyDown={(e) => { if (e.key === "Escape") onClose(); handleKeyDown(e); }} onClick={(e) => e.stopPropagation()} style={{
        width: isMobile ? "100%" : "min(820px, 94vw)",
        maxHeight: isMobile ? "100%" : "90vh",
        height: isMobile ? "100%" : undefined,
        overflow: "hidden", display: "flex", flexDirection: "column",
        background: `${T.color.linen}f8`, backdropFilter: "blur(20px)",
        borderRadius: isMobile ? 0 : "1.25rem",
        border: isMobile ? "none" : `1px solid ${T.color.cream}`,
        boxShadow: isMobile ? "none" : "0 24px 80px rgba(44,44,42,.3)",
        animation: isMobile ? "fadeIn .2s ease" : "fadeUp .3s ease",
      }}>
        {/* Header */}
        <div style={{ padding: "1.5rem 1.75rem 0", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{ width: "2.75rem", height: "2.75rem", borderRadius: "0.75rem", background: `linear-gradient(135deg, ${T.color.terracotta}, ${T.color.walnut})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.375rem" }}>{"\u{1F4E6}"}</div>
              <div>
                <h3 style={{ fontFamily: T.font.display, fontSize: "1.375rem", fontWeight: 600, color: T.color.charcoal, margin: 0 }}>{t("heading")}</h3>
                <p style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.muted, margin: "0.125rem 0 0" }}>
                  {step === "drop" && t("dropToBegin")}
                  {step === "processing" && t("processing", { processed: String(progress.processed), total: String(progress.total) })}
                  {step === "review" && t("reviewConfirm")}
                  {step === "committing" && t("committing", { committed: String(progress.committed), total: String(progress.total) })}
                  {step === "done" && t("importComplete")}
                </p>
              </div>
            </div>
            <button onClick={onClose} aria-label={tc("close")} style={{ width: "2rem", height: "2rem", borderRadius: "1rem", border: `1px solid ${T.color.cream}`, background: T.color.warmStone, color: T.color.muted, fontSize: "0.875rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{"\u2715"}</button>
          </div>

          {/* Source toggle: Local / Cloud */}
          {step === "drop" && (
            <div style={{ display: "flex", gap: "0.25rem", marginBottom: "0.75rem", background: T.color.warmStone, borderRadius: "0.625rem", padding: "0.1875rem" }}>
              <button onClick={() => setShowCloud(false)} style={{
                flex: 1, padding: "0.5rem 0.75rem", borderRadius: "0.5rem", border: "none",
                background: !showCloud ? T.color.white : "transparent",
                color: !showCloud ? T.color.charcoal : T.color.muted,
                fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: !showCloud ? 600 : 400, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "0.375rem",
              }}>
                {"\u{1F4C1}"} {t("localFiles")}
              </button>
              <button onClick={() => setShowCloud(true)} style={{
                flex: 1, padding: "0.5rem 0.75rem", borderRadius: "0.5rem", border: "none",
                background: showCloud ? T.color.white : "transparent",
                color: showCloud ? T.color.charcoal : T.color.muted,
                fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: showCloud ? 600 : 400, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "0.375rem",
              }}>
                {"\u2601\uFE0F"} {t("importFromCloud")}
              </button>
            </div>
          )}

          {/* Step indicator */}
          {!showCloud && (
            <div style={{ display: "flex", gap: "0.25rem", marginBottom: "1rem" }}>
              {(["drop", "processing", "review", "committing", "done"] as const).map((s, i) => (
                <div key={s} style={{
                  flex: 1, height: "0.1875rem", borderRadius: "0.125rem",
                  background: (["drop", "processing", "review", "committing", "done"].indexOf(step) >= i) ? T.color.terracotta : `${T.color.sandstone}40`,
                  transition: "background .3s",
                }} />
              ))}
            </div>
          )}
        </div>

        {/* Cloud Import Panel (replaces entire content area) */}
        {showCloud && step === "drop" ? (
          <Suspense fallback={
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "3rem", fontFamily: T.font.body, fontSize: "0.875rem", color: T.color.muted }}>
              {t("loadingCloudImport")}
            </div>
          }>
            <CloudImportPanel onClose={onClose} embedded />
          </Suspense>
        ) : (
        /* Content area (scrollable) */
        <div style={{ flex: 1, overflow: "auto", padding: "0 1.75rem 1.5rem" }}>

          {/* ════ STEP: DROP ════ */}
          {step === "drop" && <>
            {/* Mode selection */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.625rem", marginBottom: "1.25rem" }}>
              <button onClick={() => store.setMode("ai")} style={{
                padding: "1rem 0.875rem", borderRadius: "0.875rem",
                border: mode === "ai" ? `2px solid ${T.color.terracotta}` : `1px solid ${T.color.cream}`,
                background: mode === "ai" ? `${T.color.terracotta}08` : T.color.white,
                cursor: "pointer", textAlign: "left",
              }}>
                <div style={{ fontSize: "1.5rem", marginBottom: "0.375rem" }}>{"\u2728"}</div>
                <div style={{ fontFamily: T.font.display, fontSize: "0.875rem", fontWeight: 600, color: mode === "ai" ? T.color.terracotta : T.color.charcoal }}>{t("aiAssisted")}</div>
                <div style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.muted, lineHeight: 1.4, marginTop: "0.25rem" }}>{t("aiAssistedDesc")}</div>
              </button>
              <button onClick={() => store.setMode("manual")} style={{
                padding: "1rem 0.875rem", borderRadius: "0.875rem",
                border: mode === "manual" ? `2px solid ${T.color.terracotta}` : `1px solid ${T.color.cream}`,
                background: mode === "manual" ? `${T.color.terracotta}08` : T.color.white,
                cursor: "pointer", textAlign: "left",
              }}>
                <div style={{ fontSize: "1.5rem", marginBottom: "0.375rem" }}>{"\u{1F4CB}"}</div>
                <div style={{ fontFamily: T.font.display, fontSize: "0.875rem", fontWeight: 600, color: mode === "manual" ? T.color.terracotta : T.color.charcoal }}>{t("manual")}</div>
                <div style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.muted, lineHeight: 1.4, marginTop: "0.25rem" }}>{t("manualDesc")}</div>
              </button>
            </div>

            {/* Target selection */}
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "0.625rem", marginBottom: "1rem" }}>
              <div>
                <label style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.muted, textTransform: "uppercase", letterSpacing: ".5px", display: "block", marginBottom: "0.375rem" }}>
                  {mode === "manual" ? t("targetWing") : t("defaultWingAi")}
                </label>
                <select value={targetWingId || ""} onChange={(e) => store.setTarget(e.target.value || null, null)}
                  style={{ width: "100%", padding: "0.625rem 0.75rem", borderRadius: "0.625rem", border: `1px solid ${T.color.cream}`, background: T.color.white, fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.charcoal, cursor: "pointer", outline: "none" }}>
                  <option value="">{t("selectWing")}</option>
                  {wings.map((w) => <option key={w.id} value={w.id}>{w.icon} {w.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.muted, textTransform: "uppercase", letterSpacing: ".5px", display: "block", marginBottom: "0.375rem" }}>
                  {mode === "manual" ? t("targetRoom") : t("defaultRoomAi")}
                </label>
                <select value={targetRoomId || ""} onChange={(e) => store.setTarget(targetWingId, e.target.value || null)}
                  disabled={!targetWingId}
                  style={{ width: "100%", padding: "0.625rem 0.75rem", borderRadius: "0.625rem", border: `1px solid ${T.color.cream}`, background: !targetWingId ? `${T.color.warmStone}` : T.color.white, fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.charcoal, cursor: targetWingId ? "pointer" : "default", outline: "none" }}>
                  <option value="">{t("selectRoom")}</option>
                  {targetWingId && getWingRooms(targetWingId).map((r) => <option key={r.id} value={r.id}>{r.icon} {r.name}</option>)}
                </select>
              </div>
            </div>

            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? T.color.terracotta : T.color.sandstone}`,
                borderRadius: "1rem", padding: items.length > 0 ? "1.25rem" : "2.5rem", textAlign: "center", cursor: "pointer",
                background: dragOver ? `${T.color.terracotta}08` : T.color.warmStone,
                marginBottom: "1rem", transition: "all .2s",
              }}
            >
              <div style={{ fontSize: "2.25rem", marginBottom: "0.375rem" }}>{dragOver ? "\u2728" : "\u{1F4E5}"}</div>
              <p style={{ fontFamily: T.font.body, fontSize: "0.875rem", color: T.color.charcoal, margin: 0, fontWeight: 500 }}>
                {items.length > 0 ? t("dropMoreOrBrowse") : t("dropOrBrowse")}
              </p>
              <p style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.muted, margin: "0.25rem 0 0" }}>
                {t("supportedTypes")}
              </p>
            </div>
            <input ref={fileRef} type="file" multiple accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
              style={{ display: "none" }}
              onChange={(e) => { if (e.target.files) handleFiles(e.target.files); e.target.value = ""; }} />

            {/* Oversized files warning */}
            {skippedOversized > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", padding: "0.625rem 0.875rem", borderRadius: "0.625rem", background: "#C0505010", border: "1px solid #C0505033", marginBottom: "0.75rem" }}>
                <span style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: "#C05050", lineHeight: 1.5, flex: 1 }}>
                  {t("filesSkipped", { count: String(skippedOversized) })}
                </span>
                <button onClick={() => setSkippedOversized(0)} aria-label={tc("dismiss")} style={{ background: "none", border: "none", color: "#C05050", fontSize: "0.875rem", cursor: "pointer", padding: "0.25rem", flexShrink: 0 }}>{"\u2715"}</button>
              </div>
            )}

            {/* File list */}
            {items.length > 0 && <>
              <div style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.muted, marginBottom: "0.5rem", display: "flex", justifyContent: "space-between" }}>
                <span>{t("fileCount", { count: String(items.length), size: formatBytes(totalSize) })}</span>
                <button onClick={() => store.reset()} style={{ background: "none", border: "none", color: T.color.terracotta, fontFamily: T.font.body, fontSize: "0.6875rem", cursor: "pointer" }}>{t("clearAll")}</button>
              </div>
              <div style={{ maxHeight: "12.5rem", overflowY: "auto", borderRadius: "0.75rem", border: `1px solid ${T.color.cream}`, background: T.color.white }}>
                {items.map((item) => (
                  <div key={item.localId} style={{ display: "flex", alignItems: "center", gap: "0.625rem", padding: "0.5rem 0.75rem", borderBottom: `1px solid ${T.color.cream}22` }}>
                    <div style={{ width: "2rem", height: "2rem", borderRadius: "0.375rem", background: T.color.warmStone, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", flexShrink: 0 }}>
                      {TYPE_ICONS[item.confirmed.type] || "\u{1F4C4}"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.charcoal, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.fileName}</div>
                      <div style={{ fontFamily: T.font.body, fontSize: "0.625rem", color: T.color.muted }}>{formatBytes(item.fileSizeBytes)}</div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); store.removeItem(item.localId); }}
                      style={{ background: "none", border: "none", color: T.color.muted, fontSize: "0.875rem", cursor: "pointer", padding: "0.25rem" }}>{"\u2715"}</button>
                  </div>
                ))}
              </div>
            </>}

            {/* Start button */}
            {items.length > 0 && <button
              onClick={startProcessing}
              disabled={mode === "manual" && (!targetWingId || !targetRoomId)}
              style={{
                width: "100%", padding: "0.875rem", borderRadius: "0.75rem", border: "none", marginTop: "1rem",
                background: (mode === "manual" && (!targetWingId || !targetRoomId)) ? `${T.color.sandstone}40` : `linear-gradient(135deg, ${T.color.terracotta}, ${T.color.walnut})`,
                color: (mode === "manual" && (!targetWingId || !targetRoomId)) ? T.color.muted : "#FFF",
                fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: 600, cursor: (mode === "manual" && (!targetWingId || !targetRoomId)) ? "default" : "pointer",
              }}
            >
              {mode === "ai" ? t("processWithAi", { count: String(items.length) }) : t("processFiles", { count: String(items.length) })} {"\u{1F680}"}
            </button>}
          </>}

          {/* ════ STEP: PROCESSING ════ */}
          {step === "processing" && <>
            <div style={{ marginBottom: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.muted, marginBottom: "0.375rem" }}>
                <span>{t("processingFiles")}</span>
                <span>{progress.processed}/{progress.total}</span>
              </div>
              <div style={{ width: "100%", height: "0.5rem", borderRadius: "0.25rem", background: `${T.color.sandstone}33`, overflow: "hidden" }}>
                <div style={{ width: `${progress.total ? (progress.processed / progress.total) * 100 : 0}%`, height: "100%", borderRadius: "0.25rem", background: `linear-gradient(90deg, ${T.color.terracotta}, ${T.color.walnut})`, transition: "width .3s" }} />
              </div>
            </div>
            <div style={{ maxHeight: "25rem", overflowY: "auto" }}>
              {items.map((item) => (
                <div key={item.localId} style={{ display: "flex", alignItems: "center", gap: "0.625rem", padding: "0.5rem 0", borderBottom: `1px solid ${T.color.cream}22` }}>
                  <StatusBadge status={item.status} />
                  <span style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.charcoal, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.fileName}</span>
                  <span style={{ fontFamily: T.font.body, fontSize: "0.625rem", color: T.color.muted }}>{item.status}</span>
                </div>
              ))}
            </div>
          </>}

          {/* ════ STEP: REVIEW ════ */}
          {step === "review" && <>
            {/* Tabs */}
            <div style={{ display: "flex", gap: "0.25rem", marginBottom: "1rem", background: T.color.warmStone, borderRadius: "0.625rem", padding: "0.1875rem" }}>
              {([
                ["review", t("tabReview", { count: String(items.filter((i) => i.status === "ready" && i.needsReview).length) })],
                ["accepted", t("tabAccepted", { count: String(items.filter((i) => i.status === "accepted").length) })],
                ["rejected", t("tabRejected", { count: String(items.filter((i) => i.status === "rejected").length) })],
                ["all", t("tabAll", { count: String(items.filter((i) => !["error", "committed"].includes(i.status)).length) })],
              ] as [typeof tab, string][]).map(([key, label]) => (
                <button key={key} onClick={() => setTab(key)} style={{
                  flex: 1, padding: "0.4375rem 0.5rem", borderRadius: "0.5rem", border: "none",
                  background: tab === key ? T.color.white : "transparent",
                  color: tab === key ? T.color.charcoal : T.color.muted,
                  fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: tab === key ? 600 : 400, cursor: "pointer",
                }}>{label}</button>
              ))}
            </div>

            {/* Batch actions */}
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
              <button onClick={() => store.acceptAll()} style={{
                padding: "0.5rem 0.875rem", borderRadius: "0.5rem", border: `1px solid ${T.color.cream}`,
                background: T.color.white, fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 500, color: "#4A6741", cursor: "pointer",
              }}>{t("acceptAllReady")}</button>
            </div>

            {/* Items */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "25rem", overflowY: "auto" }}>
              {filteredItems(items, tab).map((item) => (
                <ReviewCard key={item.localId} item={item} wings={wings} getWingRooms={getWingRooms} />
              ))}
              {filteredItems(items, tab).length === 0 && (
                <div style={{ textAlign: "center", padding: "2rem", fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.muted }}>
                  {t("noItemsInTab")}
                </div>
              )}
            </div>

            {/* Commit button */}
            {items.some((i) => i.status === "accepted") && (
              <button onClick={commitAll} style={{
                width: "100%", padding: "0.875rem", borderRadius: "0.75rem", border: "none", marginTop: "1rem",
                background: `linear-gradient(135deg, ${T.color.terracotta}, ${T.color.walnut})`,
                color: "#FFF", fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: 600, cursor: "pointer",
              }}>
                {t("commitMemories", { count: String(items.filter((i) => i.status === "accepted").length) })} {"\u{1F3DB}\uFE0F"}
              </button>
            )}
          </>}

          {/* ════ STEP: COMMITTING ════ */}
          {step === "committing" && <>
            <div style={{ marginBottom: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.muted, marginBottom: "0.375rem" }}>
                <span>{t("addingMemories")}</span>
                <span>{progress.committed}/{progress.total}</span>
              </div>
              <div style={{ width: "100%", height: "0.5rem", borderRadius: "0.25rem", background: `${T.color.sandstone}33`, overflow: "hidden" }}>
                <div style={{ width: `${progress.total ? (progress.committed / progress.total) * 100 : 0}%`, height: "100%", borderRadius: "0.25rem", background: `linear-gradient(90deg, #4A6741, #6A8848)`, transition: "width .3s" }} />
              </div>
            </div>
          </>}

          {/* ════ STEP: DONE ════ */}
          {step === "done" && <>
            <div style={{ textAlign: "center", padding: "2rem 0" }}>
              <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>{"\u{1F389}"}</div>
              <h3 style={{ fontFamily: T.font.display, fontSize: "1.5rem", fontWeight: 600, color: T.color.charcoal, margin: "0 0 0.5rem" }}>{t("importCompleteHeading")}</h3>
              <p style={{ fontFamily: T.font.body, fontSize: "0.875rem", color: T.color.muted, margin: "0 0 0.25rem" }}>
                {t("memoriesAdded", { count: String(progress.committed) })}
              </p>
              {progress.errors > 0 && (
                <p style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: "#C05050" }}>{t("itemsHadErrors", { count: String(progress.errors) })}</p>
              )}
              <div style={{ display: "flex", gap: "0.625rem", justifyContent: "center", marginTop: "1.25rem" }}>
                <button onClick={() => store.reset()} style={{
                  padding: "0.75rem 1.5rem", borderRadius: "0.75rem", border: `1px solid ${T.color.cream}`,
                  background: T.color.white, fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 500, color: T.color.charcoal, cursor: "pointer",
                }}>{t("importMore")}</button>
                <button onClick={onClose} style={{
                  padding: "0.75rem 1.5rem", borderRadius: "0.75rem", border: "none",
                  background: `linear-gradient(135deg, ${T.color.terracotta}, ${T.color.walnut})`,
                  fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600, color: "#FFF", cursor: "pointer",
                }}>{t("close")}</button>
              </div>
            </div>
          </>}
        </div>
        )}
      </div>
    </div>
  );
}

// ═══ Sub-components ═══

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    queued: T.color.sandstone, reading: "#5A7898", extracting: "#5A7898",
    tagging: "#9B6B8E", ready: "#C9A84C", accepted: "#4A6741",
    rejected: "#C05050", committed: "#4A6741", error: "#C05050",
  };
  const isSpinning = ["reading", "extracting", "tagging"].includes(status);
  return (
    <div style={{
      width: "1.25rem", height: "1.25rem", borderRadius: "0.625rem", flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      border: isSpinning ? `2px solid ${colors[status] || T.color.muted}` : "none",
      borderTopColor: isSpinning ? "transparent" : undefined,
      animation: isSpinning ? "spin .6s linear infinite" : undefined,
      background: isSpinning ? "transparent" : (colors[status] || T.color.sandstone) + "30",
      color: colors[status] || T.color.muted, fontSize: "0.625rem",
    }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      {!isSpinning && (status === "accepted" || status === "committed" ? "\u2713" : status === "rejected" ? "\u2715" : status === "error" ? "!" : "\u2022")}
    </div>
  );
}

function ReviewCard({ item, wings, getWingRooms }: {
  item: ImportItem;
  wings: Array<{ id: string; name: string; icon: string; accent: string }>;
  getWingRooms: (wingId: string) => Array<{ id: string; name: string; icon: string }>;
}) {
  const store = useImportStore();
  const [expanded, setExpanded] = useState(false);
  const { t } = useTranslation("massImport");

  const accent = wings.find((w) => w.id === item.confirmed.wingId)?.accent || T.color.terracotta;

  return (
    <div style={{
      background: T.color.white, borderRadius: "0.875rem", border: `1px solid ${item.status === "accepted" ? "#4A674133" : item.status === "rejected" ? "#C0505033" : T.color.cream}`,
      padding: "0.75rem 0.875rem", transition: "all .15s",
      opacity: item.status === "rejected" ? 0.5 : 1,
    }}>
      <div style={{ display: "flex", gap: "0.625rem", alignItems: "center" }}>
        {/* Thumbnail */}
        <div style={{
          width: "3rem", height: "3rem", borderRadius: "0.5rem", flexShrink: 0, overflow: "hidden",
          background: `hsl(0,0%,90%)`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative",
        }}>
          {item.previewUrl ? (
            <Image src={item.previewUrl} alt="" fill sizes="48px" style={{ objectFit: "cover" }} unoptimized />
          ) : (
            <span style={{ fontSize: "1.375rem" }}>{TYPE_ICONS[item.confirmed.type] || "\u{1F4C4}"}</span>
          )}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 500, color: T.color.charcoal, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {item.confirmed.title}
          </div>
          <div style={{ fontFamily: T.font.body, fontSize: "0.625rem", color: T.color.muted, display: "flex", gap: "0.5rem" }}>
            <span>{TYPE_ICONS[item.confirmed.type]} {item.confirmed.type}</span>
            {item.confirmed.wingId && <span>{"\u2192"} {wings.find((w) => w.id === item.confirmed.wingId)?.icon} {getWingRooms(item.confirmed.wingId).find((r) => r.id === item.confirmed.roomId)?.name || "?"}</span>}
            {item.aiSuggestions && <span style={{ color: "#C9A84C" }}>{Math.round(item.aiSuggestions.confidence * 100)}% AI</span>}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "0.25rem", flexShrink: 0 }}>
          <button onClick={() => setExpanded(!expanded)} style={{
            width: "1.75rem", height: "1.75rem", borderRadius: "0.5rem", border: `1px solid ${T.color.cream}`,
            background: T.color.warmStone, fontSize: "0.6875rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: T.color.muted,
          }}>{"\u270F\uFE0F"}</button>
          {item.status !== "accepted" && <button onClick={() => store.acceptItem(item.localId)} style={{
            width: "1.75rem", height: "1.75rem", borderRadius: "0.5rem", border: "1px solid #4A674133",
            background: "#4A674110", fontSize: "0.6875rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#4A6741",
          }}>{"\u2713"}</button>}
          {item.status !== "rejected" && <button onClick={() => store.rejectItem(item.localId)} style={{
            width: "1.75rem", height: "1.75rem", borderRadius: "0.5rem", border: "1px solid #C0505033",
            background: "#C0505010", fontSize: "0.6875rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#C05050",
          }}>{"\u2715"}</button>}
        </div>
      </div>

      {/* Expanded edit area */}
      {expanded && (
        <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: `1px solid ${T.color.cream}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.625rem", marginBottom: "0.625rem" }}>
            <div>
              <label style={{ fontFamily: T.font.body, fontSize: "0.625rem", color: T.color.muted, textTransform: "uppercase", display: "block", marginBottom: "0.25rem" }}>{t("title")}</label>
              <input value={item.confirmed.title} onChange={(e) => store.updateConfirmed(item.localId, { title: e.target.value })}
                style={{ width: "100%", padding: "0.5rem 0.625rem", borderRadius: "0.5rem", border: `1px solid ${T.color.cream}`, background: T.color.white, fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.charcoal, outline: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ fontFamily: T.font.body, fontSize: "0.625rem", color: T.color.muted, textTransform: "uppercase", display: "block", marginBottom: "0.25rem" }}>{t("location")}</label>
              <input value={item.confirmed.locationName} onChange={(e) => store.updateConfirmed(item.localId, { locationName: e.target.value })} placeholder={t("locationPlaceholder")}
                style={{ width: "100%", padding: "0.5rem 0.625rem", borderRadius: "0.5rem", border: `1px solid ${T.color.cream}`, background: T.color.white, fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.charcoal, outline: "none", boxSizing: "border-box" }} />
            </div>
          </div>
          <div style={{ marginBottom: "0.625rem" }}>
            <label style={{ fontFamily: T.font.body, fontSize: "0.625rem", color: T.color.muted, textTransform: "uppercase", display: "block", marginBottom: "0.25rem" }}>{t("description")}</label>
            <textarea value={item.confirmed.desc} onChange={(e) => store.updateConfirmed(item.localId, { desc: e.target.value })} rows={2} placeholder={t("descriptionPlaceholder")}
              style={{ width: "100%", padding: "0.5rem 0.625rem", borderRadius: "0.5rem", border: `1px solid ${T.color.cream}`, background: T.color.white, fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.charcoal, outline: "none", boxSizing: "border-box", resize: "none" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.625rem" }}>
            <div>
              <label style={{ fontFamily: T.font.body, fontSize: "0.625rem", color: T.color.muted, textTransform: "uppercase", display: "block", marginBottom: "0.25rem" }}>{t("type")}</label>
              <select value={item.confirmed.type} onChange={(e) => store.updateConfirmed(item.localId, { type: e.target.value })}
                style={{ width: "100%", padding: "0.5rem 0.625rem", borderRadius: "0.5rem", border: `1px solid ${T.color.cream}`, background: T.color.white, fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.charcoal, cursor: "pointer", outline: "none" }}>
                {DISPLAY_TYPES.map(([v, icon, labelKey]) => <option key={v} value={v}>{icon} {t(labelKey)}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontFamily: T.font.body, fontSize: "0.625rem", color: T.color.muted, textTransform: "uppercase", display: "block", marginBottom: "0.25rem" }}>{t("wing")}</label>
              <select value={item.confirmed.wingId} onChange={(e) => {
                const rooms = getWingRooms(e.target.value);
                store.updateConfirmed(item.localId, { wingId: e.target.value, roomId: rooms[0]?.id || "" });
              }}
                style={{ width: "100%", padding: "0.5rem 0.625rem", borderRadius: "0.5rem", border: `1px solid ${T.color.cream}`, background: T.color.white, fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.charcoal, cursor: "pointer", outline: "none" }}>
                <option value="">—</option>
                {wings.map((w) => <option key={w.id} value={w.id}>{w.icon} {w.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontFamily: T.font.body, fontSize: "0.625rem", color: T.color.muted, textTransform: "uppercase", display: "block", marginBottom: "0.25rem" }}>{t("room")}</label>
              <select value={item.confirmed.roomId} onChange={(e) => store.updateConfirmed(item.localId, { roomId: e.target.value })}
                disabled={!item.confirmed.wingId}
                style={{ width: "100%", padding: "0.5rem 0.625rem", borderRadius: "0.5rem", border: `1px solid ${T.color.cream}`, background: !item.confirmed.wingId ? T.color.warmStone : T.color.white, fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.charcoal, cursor: item.confirmed.wingId ? "pointer" : "default", outline: "none" }}>
                <option value="">—</option>
                {item.confirmed.wingId && getWingRooms(item.confirmed.wingId).map((r) => <option key={r.id} value={r.id}>{r.icon} {r.name}</option>)}
              </select>
            </div>
          </div>
          {item.exif && (item.exif.dateTaken || item.exif.lat) && (
            <div style={{ marginTop: "0.5rem", fontFamily: T.font.body, fontSize: "0.625rem", color: T.color.muted, display: "flex", gap: "0.75rem" }}>
              {item.exif.dateTaken && <span>{"\u{1F4C5}"} {new Date(item.exif.dateTaken).toLocaleDateString()}</span>}
              {item.exif.lat && item.exif.lng && <span>{"\u{1F4CD}"} {item.exif.lat.toFixed(4)}, {item.exif.lng.toFixed(4)}</span>}
              {item.exif.cameraMake && <span>{"\u{1F4F7}"} {item.exif.cameraMake} {item.exif.cameraModel || ""}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function filteredItems(items: ImportItem[], tab: string): ImportItem[] {
  switch (tab) {
    case "review": return items.filter((i) => i.status === "ready" && i.needsReview);
    case "accepted": return items.filter((i) => i.status === "accepted");
    case "rejected": return items.filter((i) => i.status === "rejected");
    default: return items.filter((i) => !["error", "committed"].includes(i.status));
  }
}

function readFileAsDataUrl(file: File, fileTooLargeMsg?: string): Promise<string> {
  if (isFileTooLarge(file)) {
    return Promise.reject(new Error(fileTooLargeMsg || "File too large"));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}
