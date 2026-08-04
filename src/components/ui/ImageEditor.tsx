"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";

// ── Inline line-glyphs (stroke currentColor / 1.5 / viewBox 24 — same stroke
//    grammar as WingRoomIcons) replacing the old emoji icons ──
interface GlyphProps {
  size?: number;
}

const glyphProps = (size: number): React.SVGProps<SVGSVGElement> => ({
  xmlns: "http://www.w3.org/2000/svg",
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

/** Original — plain circle outline */
const OriginalGlyph = ({ size = 18 }: GlyphProps) => (
  <svg {...glyphProps(size)}><circle cx="12" cy="12" r="8" /></svg>
);

/** Warm — sun */
const WarmGlyph = ({ size = 18 }: GlyphProps) => (
  <svg {...glyphProps(size)}>
    <circle cx="12" cy="12" r="4" />
    <line x1="12" y1="2.5" x2="12" y2="5" /><line x1="12" y1="19" x2="12" y2="21.5" />
    <line x1="2.5" y1="12" x2="5" y2="12" /><line x1="19" y1="12" x2="21.5" y2="12" />
    <line x1="5.3" y1="5.3" x2="7" y2="7" /><line x1="17" y1="17" x2="18.7" y2="18.7" />
    <line x1="5.3" y1="18.7" x2="7" y2="17" /><line x1="17" y1="7" x2="18.7" y2="5.3" />
  </svg>
);

/** Cool — snowflake */
const CoolGlyph = ({ size = 18 }: GlyphProps) => (
  <svg {...glyphProps(size)}>
    <line x1="12" y1="3" x2="12" y2="21" />
    <line x1="4.2" y1="7.5" x2="19.8" y2="16.5" />
    <line x1="4.2" y1="16.5" x2="19.8" y2="7.5" />
    <polyline points="9.8,5.2 12,7.4 14.2,5.2" />
    <polyline points="9.8,18.8 12,16.6 14.2,18.8" />
  </svg>
);

/** Vivid — prism triangle splitting rays */
const VividGlyph = ({ size = 18 }: GlyphProps) => (
  <svg {...glyphProps(size)}>
    <path d="M12 4.5 L19.5 18 L4.5 18 Z" />
    <line x1="2" y1="10" x2="8" y2="13" />
    <line x1="15.5" y1="12.5" x2="22" y2="9.5" />
    <line x1="16" y1="14.5" x2="22.5" y2="14.5" />
  </svg>
);

/** Soft — cloud */
const SoftGlyph = ({ size = 18 }: GlyphProps) => (
  <svg {...glyphProps(size)}>
    <path d="M6.5 17.5 Q3 17.5 3 14.3 Q3 11.5 5.8 11.1 Q6.3 6.5 11 6.5 Q14.8 6.5 15.7 10 Q21 10 21 13.8 Q21 17.5 17.2 17.5 Z" />
  </svg>
);

/** Vintage — camera */
const VintageGlyph = ({ size = 18 }: GlyphProps) => (
  <svg {...glyphProps(size)}>
    <rect x="3.5" y="8" width="17" height="11.5" rx="2" />
    <path d="M8.5 8 L10 5.5 L14 5.5 L15.5 8" />
    <circle cx="12" cy="13.5" r="3.2" />
  </svg>
);

/** B&W — half-filled circle */
const BWGlyph = ({ size = 18 }: GlyphProps) => (
  <svg {...glyphProps(size)}>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 4 A8 8 0 0 1 12 20 Z" fill="currentColor" stroke="none" />
  </svg>
);

/** Dramatic — high-contrast diamond, half filled */
const DramaticGlyph = ({ size = 18 }: GlyphProps) => (
  <svg {...glyphProps(size)}>
    <polygon points="12,3 21,12 12,21 3,12" />
    <polygon points="12,3 21,12 12,21" fill="currentColor" stroke="none" />
  </svg>
);

/** Fade — layered horizon lines dissolving downward */
const FadeGlyph = ({ size = 18 }: GlyphProps) => (
  <svg {...glyphProps(size)}>
    <line x1="4" y1="7" x2="20" y2="7" />
    <line x1="6" y1="11" x2="18" y2="11" strokeOpacity={0.65} />
    <line x1="8" y1="15" x2="16" y2="15" strokeOpacity={0.4} />
    <line x1="10" y1="19" x2="14" y2="19" strokeOpacity={0.2} />
  </svg>
);

/** Noir — filled crescent moon */
const NoirGlyph = ({ size = 18 }: GlyphProps) => (
  <svg {...glyphProps(size)}>
    <path d="M19.5 14.5 A8 8 0 1 1 9.5 4.5 A6.5 6.5 0 0 0 19.5 14.5 Z" fill="currentColor" />
  </svg>
);

/** Filters tab — four-point sparkle */
const SparkleGlyph = ({ size = 14 }: GlyphProps) => (
  <svg {...glyphProps(size)}>
    <path d="M12 4 L13.6 10.4 L20 12 L13.6 13.6 L12 20 L10.4 13.6 L4 12 L10.4 10.4 Z" />
  </svg>
);

/** Adjust tab — sliders */
const SlidersGlyph = ({ size = 14 }: GlyphProps) => (
  <svg {...glyphProps(size)}>
    <line x1="4" y1="7" x2="20" y2="7" /><circle cx="9" cy="7" r="1.8" />
    <line x1="4" y1="12" x2="20" y2="12" /><circle cx="15" cy="12" r="1.8" />
    <line x1="4" y1="17" x2="20" y2="17" /><circle cx="7" cy="17" r="1.8" />
  </svg>
);

/** Crop/Rotate tab — crop marks */
const CropGlyph = ({ size = 14 }: GlyphProps) => (
  <svg {...glyphProps(size)}>
    <path d="M7 2.5 L7 15 Q7 17 9 17 L21.5 17" />
    <path d="M2.5 7 L15 7 Q17 7 17 9 L17 21.5" />
  </svg>
);

// ── Filter presets ──
interface FilterPreset {
  name: string;
  icon: React.FC<GlyphProps>;
  filter: string; // CSS filter string
}

const PRESETS: FilterPreset[] = [
  { name: "filterOriginal", icon: OriginalGlyph, filter: "none" },
  { name: "filterWarm", icon: WarmGlyph, filter: "brightness(1.05) saturate(1.3) sepia(0.15)" },
  { name: "filterCool", icon: CoolGlyph, filter: "brightness(1.05) saturate(0.9) hue-rotate(15deg)" },
  { name: "filterVivid", icon: VividGlyph, filter: "saturate(1.6) contrast(1.1)" },
  { name: "filterSoft", icon: SoftGlyph, filter: "brightness(1.08) contrast(0.9) saturate(0.85)" },
  { name: "filterVintage", icon: VintageGlyph, filter: "sepia(0.4) contrast(1.1) brightness(0.95) saturate(0.8)" },
  { name: "filterBW", icon: BWGlyph, filter: "grayscale(1) contrast(1.1)" },
  { name: "filterDramatic", icon: DramaticGlyph, filter: "contrast(1.4) brightness(0.9) saturate(1.2)" },
  { name: "filterFade", icon: FadeGlyph, filter: "brightness(1.1) contrast(0.85) saturate(0.7)" },
  { name: "filterNoir", icon: NoirGlyph, filter: "grayscale(1) contrast(1.5) brightness(0.85)" },
];

// ── Slider config ──
interface Adjustment {
  key: string;
  label: string;
  min: number;
  max: number;
  default: number;
  step: number;
  unit: string;
  cssProp: string;
}

const ADJUSTMENTS: Adjustment[] = [
  { key: "brightness", label: "brightness", min: 0.3, max: 2, default: 1, step: 0.05, unit: "", cssProp: "brightness" },
  { key: "contrast", label: "contrast", min: 0.3, max: 2, default: 1, step: 0.05, unit: "", cssProp: "contrast" },
  { key: "saturate", label: "saturation", min: 0, max: 2.5, default: 1, step: 0.05, unit: "", cssProp: "saturate" },
  { key: "hueRotate", label: "hue", min: -180, max: 180, default: 0, step: 5, unit: "deg", cssProp: "hue-rotate" },
  { key: "blur", label: "blur", min: 0, max: 10, default: 0, step: 0.5, unit: "px", cssProp: "blur" },
];

type Tab = "presets" | "adjust" | "crop";

interface ImageEditorProps {
  dataUrl: string;
  accent?: string;
  onSave: (editedDataUrl: string) => void;
  onCancel: () => void;
}

export default function ImageEditor({ dataUrl, accent, onSave, onCancel }: ImageEditorProps) {
  const isMobile = useIsMobile();
  const { t } = useTranslation("imageEditor");
  const { t: tc } = useTranslation("common");
  const { containerRef, handleKeyDown } = useFocusTrap(true);
  const color = accent || T.color.terracotta;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [tab, setTab] = useState<Tab>("presets");
  const [preset, setPreset] = useState(0); // index into PRESETS
  const [adjustments, setAdjustments] = useState<Record<string, number>>(
    Object.fromEntries(ADJUSTMENTS.map(a => [a.key, a.default]))
  );
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [saving, setSaving] = useState(false);

  // Crop state
  const [cropActive, setCropActive] = useState(false);
  const [cropRect, setCropRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [cropDragging, setCropDragging] = useState(false);
  const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Load image once
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => { imgRef.current = img; renderPreview(); };
    img.src = dataUrl;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataUrl]);

  // Build CSS filter string from adjustments (only when using "adjust" tab or when preset is "Original")
  const buildFilterString = useCallback(() => {
    if (preset > 0 && tab === "presets") {
      return PRESETS[preset].filter;
    }
    // Build from sliders
    return ADJUSTMENTS.map(a => {
      const val = adjustments[a.key];
      if (val === a.default) return null;
      return `${a.cssProp}(${val}${a.unit})`;
    }).filter(Boolean).join(" ") || "none";
  }, [preset, tab, adjustments]);

  // Render preview to canvas
  const renderPreview = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Account for rotation
    const isRotated = rotation === 90 || rotation === 270;
    const srcW = img.naturalWidth;
    const srcH = img.naturalHeight;
    const outW = isRotated ? srcH : srcW;
    const outH = isRotated ? srcW : srcH;

    // Scale to fit preview area (max 440x320)
    const scale = Math.min(440 / outW, 320 / outH, 1);
    canvas.width = Math.round(outW * scale);
    canvas.height = Math.round(outH * scale);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    // Apply CSS filter
    const filterStr = buildFilterString();
    if (filterStr !== "none") {
      ctx.filter = filterStr;
    }

    // Rotation transform
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);

    const drawW = isRotated ? canvas.height : canvas.width;
    const drawH = isRotated ? canvas.width : canvas.height;
    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    // Draw crop overlay
    if (cropActive && cropRect) {
      ctx.save();
      // Dim outside crop
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // Clear crop area
      ctx.clearRect(cropRect.x, cropRect.y, cropRect.w, cropRect.h);
      // Redraw image in crop area
      ctx.save();
      ctx.beginPath();
      ctx.rect(cropRect.x, cropRect.y, cropRect.w, cropRect.h);
      ctx.clip();
      if (filterStr !== "none") ctx.filter = filterStr;
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();
      // Crop border
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(cropRect.x, cropRect.y, cropRect.w, cropRect.h);
      // Corner handles
      const corners = [
        [cropRect.x, cropRect.y],
        [cropRect.x + cropRect.w, cropRect.y],
        [cropRect.x, cropRect.y + cropRect.h],
        [cropRect.x + cropRect.w, cropRect.y + cropRect.h],
      ];
      ctx.setLineDash([]);
      ctx.fillStyle = "#fff";
      for (const [cx, cy] of corners) {
        ctx.fillRect(cx - 4, cy - 4, 8, 8);
      }
      ctx.restore();
    }
  }, [buildFilterString, rotation, cropActive, cropRect]);

  // Re-render on state changes
  useEffect(() => { renderPreview(); }, [renderPreview]);

  // Adjustment slider change (debounced to avoid re-render on every pixel)
  const adjustTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleAdjust = useCallback((key: string, val: number) => {
    setPreset(0);
    if (adjustTimer.current) clearTimeout(adjustTimer.current);
    adjustTimer.current = setTimeout(() => {
      setAdjustments(prev => ({ ...prev, [key]: val }));
    }, 50);
  }, []);
  useEffect(() => {
    return () => { if (adjustTimer.current) clearTimeout(adjustTimer.current); };
  }, []);

  // Reset adjustments
  const handleReset = () => {
    setPreset(0);
    setAdjustments(Object.fromEntries(ADJUSTMENTS.map(a => [a.key, a.default])));
    setRotation(0);
    setCropActive(false);
    setCropRect(null);
  };

  // Crop interaction handlers
  const getCropCoords = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.round(((e.clientX - rect.left) / rect.width) * canvas.width),
      y: Math.round(((e.clientY - rect.top) / rect.height) * canvas.height),
    };
  };

  const handleCropMouseDown = (e: React.MouseEvent) => {
    if (!cropActive) return;
    const coords = getCropCoords(e);
    if (!coords) return;
    setCropDragging(true);
    setCropStart(coords);
    setCropRect({ x: coords.x, y: coords.y, w: 0, h: 0 });
  };

  const handleCropMouseMove = (e: React.MouseEvent) => {
    if (!cropDragging || !cropStart) return;
    const coords = getCropCoords(e);
    if (!coords) return;
    const x = Math.min(cropStart.x, coords.x);
    const y = Math.min(cropStart.y, coords.y);
    const w = Math.abs(coords.x - cropStart.x);
    const h = Math.abs(coords.y - cropStart.y);
    setCropRect({ x, y, w, h });
  };

  const handleCropMouseUp = () => {
    setCropDragging(false);
  };

  // Touch event handlers (mirror mouse handlers)
  const getTouchCropCoords = (e: React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas || !e.touches[0]) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.round(((e.touches[0].clientX - rect.left) / rect.width) * canvas.width),
      y: Math.round(((e.touches[0].clientY - rect.top) / rect.height) * canvas.height),
    };
  };

  const handleCropTouchStart = (e: React.TouchEvent) => {
    if (!cropActive) return;
    const coords = getTouchCropCoords(e);
    if (!coords) return;
    e.preventDefault();
    setCropDragging(true);
    setCropStart(coords);
    setCropRect({ x: coords.x, y: coords.y, w: 0, h: 0 });
  };

  const handleCropTouchMove = (e: React.TouchEvent) => {
    if (!cropDragging || !cropStart) return;
    const coords = getTouchCropCoords(e);
    if (!coords) return;
    e.preventDefault();
    const x = Math.min(cropStart.x, coords.x);
    const y = Math.min(cropStart.y, coords.y);
    const w = Math.abs(coords.x - cropStart.x);
    const h = Math.abs(coords.y - cropStart.y);
    setCropRect({ x, y, w, h });
  };

  const handleCropTouchEnd = () => {
    setCropDragging(false);
  };

  // Apply crop aspect ratio presets
  const applyCropPreset = (ratio: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setCropActive(true);
    const margin = 20;
    const availW = canvas.width - margin * 2;
    const availH = canvas.height - margin * 2;
    let w: number, h: number;
    if (availW / availH > ratio) {
      h = availH;
      w = Math.round(h * ratio);
    } else {
      w = availW;
      h = Math.round(w / ratio);
    }
    setCropRect({
      x: Math.round((canvas.width - w) / 2),
      y: Math.round((canvas.height - h) / 2),
      w, h,
    });
  };

  // ── Save: render full-res to offscreen canvas, export as data URL ──
  const handleSave = async () => {
    const img = imgRef.current;
    if (!img) return;
    setSaving(true);

    try {
      const offscreen = document.createElement("canvas");
      const ctx = offscreen.getContext("2d")!;

      const isRotated = rotation === 90 || rotation === 270;
      let srcW = img.naturalWidth;
      let srcH = img.naturalHeight;
      let outW = isRotated ? srcH : srcW;
      let outH = isRotated ? srcW : srcH;

      // If cropping, calculate the crop in original image coordinates
      const canvas = canvasRef.current;
      if (cropActive && cropRect && cropRect.w > 10 && cropRect.h > 10 && canvas) {
        const scaleX = outW / canvas.width;
        const scaleY = outH / canvas.height;
        outW = Math.round(cropRect.w * scaleX);
        outH = Math.round(cropRect.h * scaleY);
      }

      offscreen.width = outW;
      offscreen.height = outH;

      // Apply filter
      const filterStr = buildFilterString();
      if (filterStr !== "none") ctx.filter = filterStr;

      if (cropActive && cropRect && cropRect.w > 10 && cropRect.h > 10 && canvas) {
        // Cropped render
        const scaleX = (isRotated ? srcH : srcW) / canvas.width;
        const scaleY = (isRotated ? srcW : srcH) / canvas.height;
        const cx = cropRect.x * scaleX;
        const cy = cropRect.y * scaleY;

        ctx.save();
        ctx.translate(outW / 2, outH / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        const fullW = isRotated ? srcH : srcW;
        const fullH = isRotated ? srcW : srcH;
        const drawW = isRotated ? outH : outW;
        const drawH = isRotated ? outW : outH;
        ctx.drawImage(img, -fullW / 2 + (fullW / 2 - cx - outW / 2), -fullH / 2 + (fullH / 2 - cy - outH / 2), isRotated ? srcH : srcW, isRotated ? srcW : srcH);
        ctx.restore();
      } else {
        // Full image render with rotation
        ctx.save();
        ctx.translate(outW / 2, outH / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        const drawW = isRotated ? outH : outW;
        const drawH = isRotated ? outW : outH;
        ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();
      }

      const edited = offscreen.toDataURL("image/jpeg", 0.92);
      onSave(edited);
    } catch (err) {
      console.error("Image editor save error:", err);
    } finally {
      setSaving(false);
    }
  };

  const TABS: { key: Tab; label: string; icon: React.FC<GlyphProps> }[] = [
    { key: "presets", label: t("filters"), icon: SparkleGlyph },
    { key: "adjust", label: t("adjust"), icon: SlidersGlyph },
    { key: "crop", label: t("cropRotate"), icon: CropGlyph },
  ];

  return (
    <div onClick={onCancel} style={{ position: "absolute", inset: 0, background: "rgba(30,26,20,.7)", backdropFilter: "blur(16px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 55, animation: "fadeIn .2s ease" }}>
      <div ref={containerRef} role="dialog" aria-modal="true" aria-label={t("title")} onKeyDown={(e) => { if (e.key === "Escape") onCancel(); handleKeyDown(e); }} onClick={e => e.stopPropagation()} style={{ background: T.color.linen, borderRadius: isMobile ? 0 : "1.25rem", border: isMobile ? "none" : `1px solid ${T.color.cream}`, boxShadow: isMobile ? "none" : "0 20px 80px rgba(64,59,54,.3)", maxWidth: isMobile ? undefined : "32.5rem", width: isMobile ? "100%" : "94%", height: isMobile ? "100%" : undefined, overflow: "hidden", animation: isMobile ? "fadeIn .2s ease" : "fadeUp .3s cubic-bezier(.23,1,.32,1)", maxHeight: isMobile ? "100%" : "92vh", display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <div style={{ padding: "1rem 1.25rem 0.75rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${T.color.cream}` }}>
          <div style={{ fontFamily: T.font.display, fontSize: "1.125rem", fontWeight: 500, color: T.color.charcoal }}>{t("title")}</div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button onClick={handleReset} style={{ padding: "0.375rem 0.75rem", borderRadius: "0.5rem", border: `1px solid ${T.color.cream}`, background: T.color.white, fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.muted, cursor: "pointer" }}>{t("reset")}</button>
            <button onClick={onCancel} aria-label={tc("close")} style={{ width: "1.75rem", height: "1.75rem", borderRadius: "0.875rem", border: `1px solid ${T.color.cream}`, background: T.color.warmStone, color: T.color.muted, fontSize: "0.75rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", minWidth: "2.75rem", minHeight: "2.75rem" }}>{"\u2715"}</button>
          </div>
        </div>

        {/* Canvas preview */}
        <div ref={previewRef} style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "1rem 1rem 0.5rem", background: T.color.charcoal, minHeight: "12.5rem" }}>
          <canvas
            ref={canvasRef}
            onMouseDown={handleCropMouseDown}
            onMouseMove={handleCropMouseMove}
            onMouseUp={handleCropMouseUp}
            onMouseLeave={handleCropMouseUp}
            onTouchStart={handleCropTouchStart}
            onTouchMove={handleCropTouchMove}
            onTouchEnd={handleCropTouchEnd}
            style={{ maxWidth: "100%", maxHeight: "20rem", borderRadius: "0.5rem", cursor: cropActive ? "crosshair" : "default", touchAction: cropActive ? "none" : "auto" }}
          />
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", borderBottom: `1px solid ${T.color.cream}`, padding: "0 1rem" }}>
          {TABS.map(tab_ => (
            <button key={tab_.key} onClick={() => { setTab(tab_.key); if (tab_.key !== "crop") { setCropActive(false); setCropRect(null); } }}
              style={{ flex: 1, padding: "0.625rem 0", fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: tab === tab_.key ? 600 : 500, color: tab === tab_.key ? color : T.color.muted, background: "transparent", border: "none", borderBottom: tab === tab_.key ? `2px solid ${color}` : "2px solid transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.3125rem" }}>
              <tab_.icon size={14} />{tab_.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ padding: "0.75rem 1rem 1rem", overflowY: "auto", flex: 1 }}>

          {/* Presets tab */}
          {tab === "presets" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.375rem" }}>
              {PRESETS.map((p, i) => (
                <button key={p.name} onClick={() => setPreset(i)}
                  style={{ padding: "0.625rem 0.25rem", borderRadius: "0.625rem", border: preset === i ? `2px solid ${color}` : `1px solid ${T.color.cream}`, background: preset === i ? `${color}10` : T.color.white, cursor: "pointer", textAlign: "center", transition: "all .15s" }}>
                  <div style={{ display: "flex", justifyContent: "center", height: "1.125rem", color: preset === i ? color : T.color.muted }}><p.icon size={18} /></div>
                  <div style={{ fontFamily: T.font.body, fontSize: "0.5625rem", color: preset === i ? color : T.color.muted, fontWeight: preset === i ? 600 : 500, marginTop: "0.1875rem" }}>{t(p.name)}</div>
                </button>
              ))}
            </div>
          )}

          {/* Adjust tab */}
          {tab === "adjust" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
              {ADJUSTMENTS.map(a => (
                <div key={a.key}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                    <label htmlFor={`adj-${a.key}`} style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.charcoal, fontWeight: 500 }}>{t(a.label)}</label>
                    <span style={{ fontFamily: T.font.body, fontSize: "0.625rem", color: T.color.muted }}>{adjustments[a.key]}{a.unit}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <input
                      id={`adj-${a.key}`}
                      type="range"
                      min={a.min}
                      max={a.max}
                      step={a.step}
                      value={adjustments[a.key]}
                      onChange={e => handleAdjust(a.key, parseFloat(e.target.value))}
                      style={{ flex: 1, accentColor: color }}
                    />
                    <button onClick={() => handleAdjust(a.key, a.default)}
                      aria-label={t("resetAdjustment")}
                      style={{ width: "1.375rem", height: "1.375rem", borderRadius: "0.6875rem", border: `1px solid ${T.color.cream}`, background: T.color.white, fontSize: "0.625rem", cursor: "pointer", color: T.color.muted, display: "flex", alignItems: "center", justifyContent: "center" }}
                      title={t("resetAdjustment")}>{"\u21BA"}</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Crop & Rotate tab */}
          {tab === "crop" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {/* Rotation */}
              <div>
                <div style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.charcoal, fontWeight: 500, marginBottom: "0.5rem" }}>{t("rotate")}</div>
                <div style={{ display: "flex", gap: "0.375rem" }}>
                  {[
                    { label: "0\u00B0", val: 0 },
                    { label: "90\u00B0", val: 90 },
                    { label: "180\u00B0", val: 180 },
                    { label: "270\u00B0", val: 270 },
                  ].map(r => (
                    <button key={r.val} onClick={() => setRotation(r.val)}
                      style={{ padding: "0.5rem 1rem", borderRadius: "0.5rem", border: rotation === r.val ? `2px solid ${color}` : `1px solid ${T.color.cream}`, background: rotation === r.val ? `${color}10` : T.color.white, fontFamily: T.font.body, fontSize: "0.75rem", color: rotation === r.val ? color : T.color.muted, cursor: "pointer", fontWeight: rotation === r.val ? 600 : 500 }}>
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Crop presets */}
              <div>
                <div style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.charcoal, fontWeight: 500, marginBottom: "0.5rem" }}>{t("crop")}</div>
                <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
                  {[
                    { label: t("free"), ratio: 0 },
                    { label: "1:1", ratio: 1 },
                    { label: "4:3", ratio: 4 / 3 },
                    { label: "16:9", ratio: 16 / 9 },
                    { label: "3:2", ratio: 3 / 2 },
                  ].map(c => (
                    <button key={c.label} onClick={() => {
                      if (c.ratio === 0) { setCropActive(true); setCropRect(null); }
                      else applyCropPreset(c.ratio);
                    }}
                      style={{ padding: "0.5rem 0.875rem", borderRadius: "0.5rem", border: cropActive ? `1px solid ${T.color.cream}` : `1px solid ${T.color.cream}`, background: T.color.white, fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.muted, cursor: "pointer" }}>
                      {c.label}
                    </button>
                  ))}
                  {cropActive && (
                    <button onClick={() => { setCropActive(false); setCropRect(null); }}
                      style={{ padding: "0.5rem 0.875rem", borderRadius: "0.5rem", border: "1px solid #D0606080", background: T.color.white, fontFamily: T.font.body, fontSize: "0.6875rem", color: "#C05050", cursor: "pointer" }}>
                      {t("clearCrop")}
                    </button>
                  )}
                </div>
                {cropActive && <p style={{ fontFamily: T.font.body, fontSize: "0.625rem", color: T.color.muted, marginTop: "0.375rem" }}>
                  {cropRect && cropRect.w > 10 ? t("cropSelected") : t("cropInstruction")}
                </p>}
              </div>
            </div>
          )}
        </div>

        {/* Footer: Save / Cancel */}
        <div style={{ padding: "0.75rem 1rem 1rem", borderTop: `1px solid ${T.color.cream}`, display: "flex", gap: "0.625rem" }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "0.75rem", fontFamily: T.font.body, fontSize: "0.8125rem", background: "transparent", border: `1px solid ${T.color.cream}`, borderRadius: "0.625rem", cursor: "pointer", color: T.color.muted }}>{t("cancel")}</button>
          <button onClick={handleSave} disabled={saving}
            style={{ flex: 2, padding: "0.75rem", fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600, background: saving ? `${T.color.sandstone}60` : color, border: "none", borderRadius: "0.625rem", cursor: saving ? "default" : "pointer", color: T.color.white }}>
            {saving ? t("applying") : t("applyChanges")}
          </button>
        </div>
      </div>
    </div>
  );
}
