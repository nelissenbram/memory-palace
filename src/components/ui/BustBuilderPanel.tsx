"use client";
import { useState, useRef, useCallback } from "react";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useUserStore } from "@/lib/stores/userStore";
import { updateProfile } from "@/lib/auth/profile-actions";
import { createBustTexture, loadImage, type BustStyle } from "@/lib/3d/bustBuilder";

interface BustBuilderPanelProps {
  onClose: () => void;
}

export default function BustBuilderPanel({ onClose }: BustBuilderPanelProps) {
  const isMobile = useIsMobile();
  const { styleEra } = useUserStore();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreview(url);
    setResult(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith("image/")) handleFile(f);
  }, [handleFile]);

  const handleCreate = async () => {
    if (!preview) return;
    setProcessing(true);
    try {
      const img = await loadImage(preview);
      const style: BustStyle = (styleEra === "renaissance" ? "renaissance" : "roman");
      const texture = await createBustTexture(img, style);
      // Convert canvas to data URL for storage
      const canvas = (texture.image as HTMLCanvasElement);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      setResult(dataUrl);
      // Save to profile
      await updateProfile({ bustTextureUrl: dataUrl });
      useUserStore.getState().bustTextureUrl = dataUrl;
    } catch (err) {
      console.error("Bust creation failed:", err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(44,44,42,.6)", backdropFilter: "blur(6px)",
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: T.color.linen, borderRadius: 20,
        padding: isMobile ? "24px 18px" : "32px 36px",
        maxWidth: 420, width: "90%",
        boxShadow: "0 12px 48px rgba(0,0,0,.2)",
      }}>
        <h2 style={{
          fontFamily: T.font.display, fontSize: 24, fontWeight: 400,
          color: T.color.charcoal, textAlign: "center", marginBottom: 16,
        }}>
          Create Your Bust
        </h2>
        <p style={{
          fontFamily: T.font.body, fontSize: 14, color: T.color.muted,
          textAlign: "center", marginBottom: 20, lineHeight: 1.5,
        }}>
          Upload a face photo to create a {styleEra === "renaissance" ? "bronze" : "marble"} bust for your palace entrance.
        </p>

        {/* Upload area */}
        {!preview && (
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            style={{
              border: `2px dashed ${T.color.sandstone}`,
              borderRadius: 14, padding: "40px 20px",
              textAlign: "center", cursor: "pointer",
              background: `${T.color.warmStone}80`,
              transition: "all .2s",
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 8 }}>{"📷"}</div>
            <div style={{ fontFamily: T.font.body, fontSize: 14, color: T.color.muted }}>
              Drop a photo or click to browse
            </div>
            <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          </div>
        )}

        {/* Preview */}
        {preview && !result && (
          <div style={{ textAlign: "center" }}>
            <img src={preview} alt="Face preview" style={{
              width: 180, height: 180, objectFit: "cover",
              borderRadius: "50%", margin: "0 auto 16px",
              border: `3px solid ${T.color.sandstone}`,
              display: "block",
            }} />
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => { setPreview(null); setFile(null); }} style={{
                fontFamily: T.font.body, fontSize: 14, padding: "10px 20px",
                borderRadius: 10, border: `1px solid ${T.color.sandstone}`,
                background: "transparent", color: T.color.walnut, cursor: "pointer",
              }}>
                Change Photo
              </button>
              <button onClick={handleCreate} disabled={processing} style={{
                fontFamily: T.font.body, fontSize: 14, fontWeight: 600,
                padding: "10px 24px", borderRadius: 10, border: "none",
                background: `linear-gradient(135deg,${T.color.terracotta},${T.color.walnut})`,
                color: "#FFF", cursor: processing ? "wait" : "pointer",
                opacity: processing ? 0.7 : 1,
              }}>
                {processing ? "Creating..." : "Create Bust"}
              </button>
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div style={{ textAlign: "center" }}>
            <img src={result} alt="Your bust" style={{
              width: 180, height: 180, objectFit: "cover",
              borderRadius: 16, margin: "0 auto 16px",
              border: `3px solid ${T.color.gold}`,
              display: "block",
            }} />
            <p style={{
              fontFamily: T.font.body, fontSize: 13, color: T.color.muted,
              marginBottom: 16,
            }}>
              Your bust has been placed on a pedestal in the entrance hall.
            </p>
            <button onClick={onClose} style={{
              fontFamily: T.font.body, fontSize: 15, fontWeight: 600,
              padding: "12px 32px", borderRadius: 10, border: "none",
              background: `linear-gradient(135deg,${T.color.terracotta},${T.color.walnut})`,
              color: "#FFF", cursor: "pointer",
            }}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
