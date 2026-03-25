"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import * as THREE from "three";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useUserStore } from "@/lib/stores/userStore";
import { updateProfile } from "@/lib/auth/profile-actions";
import {
  loadBustModel,
  loadImage,
  validateFacePhoto,
  type BustStyle,
  type BustGender,
} from "@/lib/3d/bustBuilder";

interface BustBuilderPanelProps {
  onClose: () => void;
}

type Stage = "manage" | "upload" | "creating" | "done" | "error";

export default function BustBuilderPanel({ onClose }: BustBuilderPanelProps) {
  const isMobile = useIsMobile();
  const { styleEra, bustTextureUrl, bustModelUrl, bustName: savedBustName, bustGender: savedBustGender, userName } = useUserStore();
  const hasBust = !!(bustTextureUrl || bustModelUrl);

  const [preview, setPreview] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>(hasBust ? "manage" : "upload");
  const [error, setError] = useState<string | null>(null);
  const [photoFeedback, setPhotoFeedback] = useState<string | null>(null);
  const [doneBustGroup, setDoneBustGroup] = useState<THREE.Group | null>(null);
  const [bustNameInput, setBustNameInput] = useState(savedBustName || userName || "");
  const [bustGender, setBustGender] = useState<BustGender>(
    (savedBustGender as BustGender) || "male"
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const previewCanvasRef = useRef<HTMLDivElement>(null);

  const bustStyle: BustStyle = styleEra === "renaissance" ? "renaissance" : "roman";
  const bustStyleLabel = bustStyle === "renaissance" ? "bronze" : "marble";

  const handleFile = useCallback(async (f: File) => {
    const url = URL.createObjectURL(f);
    setPreview(url);
    setPhotoFeedback(null);
    setError(null);

    // Validate the photo
    try {
      const img = await loadImage(url);
      const result = await validateFacePhoto(img);
      if (!result.valid) {
        setPhotoFeedback(result.message || "Please use a clear face photo.");
      }
    } catch {
      // Validation failed silently, allow upload anyway
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith("image/")) handleFile(f);
  }, [handleFile]);

  // ── Remove existing bust ──
  const handleRemove = async () => {
    await updateProfile({ bustTextureUrl: "" });
    await updateProfile({ bustModelUrl: "" }).catch(() => {});
    const store = useUserStore.getState();
    store.bustTextureUrl = null;
    store.setBustModelUrl(null);
    store.setBustName(null);
    onClose();
  };

  // ── Create bust ──
  const handleCreate = async () => {
    if (!preview) return;
    setError(null);
    setStage("creating");

    try {
      // Save the face photo as the bust texture
      const img = await loadImage(preview);
      const canvas = document.createElement("canvas");
      const maxSize = 512;
      const ratio = Math.min(maxSize / img.width, maxSize / img.height);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const textureDataUrl = canvas.toDataURL("image/jpeg", 0.85);

      await updateProfile({ bustTextureUrl: textureDataUrl });
      useUserStore.getState().bustTextureUrl = textureDataUrl;

      // Save name and gender
      const store = useUserStore.getState();
      if (bustNameInput) {
        await updateProfile({ bustName: bustNameInput }).catch(() => {});
        store.setBustName(bustNameInput);
      }
      await updateProfile({ bustGender: bustGender }).catch(() => {});
      store.setBustGender(bustGender);

      // Load the composite bust for preview
      const bustGroup = await loadBustModel(bustStyle, bustGender, textureDataUrl);
      setDoneBustGroup(bustGroup);
      setStage("done");
    } catch (err) {
      console.error("Bust creation failed:", err);
      setError("Failed to create bust. Please try a different photo.");
      setStage("error");
    }
  };

  // ── 3D Preview renderer ──
  const renderBustPreview = useCallback((bustGroup: THREE.Group) => {
    const el = previewCanvasRef.current;
    if (!el) return;

    const w = 220, h = 260;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.localClippingEnabled = true;
    el.innerHTML = "";
    el.appendChild(renderer.domElement);
    renderer.domElement.style.borderRadius = "14px";

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, w / h, 0.01, 100);
    camera.position.set(0, 0.45, 0.8);
    camera.lookAt(0, 0.35, 0);

    scene.add(new THREE.AmbientLight("#FFF8F0", 0.6));
    const key = new THREE.DirectionalLight("#FFF5E0", 1.5);
    key.position.set(1, 2, 2);
    scene.add(key);
    const fill = new THREE.DirectionalLight("#E8E0FF", 0.4);
    fill.position.set(-1, 1, -1);
    scene.add(fill);

    const clone = bustGroup.clone();

    // Auto-scale to fit camera view
    const box = new THREE.Box3().setFromObject(clone);
    const modelHeight = box.max.y - box.min.y;
    const targetH = 0.7;
    const sc = targetH / Math.max(modelHeight, 0.01);
    const center = box.getCenter(new THREE.Vector3());
    clone.position.set(-center.x * sc, -box.min.y * sc, -center.z * sc);
    clone.scale.set(sc, sc, sc);
    scene.add(clone);

    let frameId: number;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      clone.rotation.y += 0.008;
      renderer.render(scene, camera);
    };
    animate();

    const cleanup = () => { cancelAnimationFrame(frameId); renderer.dispose(); };
    setTimeout(cleanup, 30000);
    (el as any).__cleanup = cleanup;
  }, []);

  useEffect(() => {
    if (stage === "done" && doneBustGroup && previewCanvasRef.current) {
      renderBustPreview(doneBustGroup);
    }
  }, [stage, doneBustGroup, renderBustPreview]);

  useEffect(() => {
    return () => {
      const el = previewCanvasRef.current;
      if (el && (el as any).__cleanup) (el as any).__cleanup();
      if (doneBustGroup) {
        doneBustGroup.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            if (child.material instanceof THREE.Material) child.material.dispose();
          }
        });
      }
    };
  }, [doneBustGroup]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(44,44,42,.6)", backdropFilter: "blur(6px)",
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: T.color.linen, borderRadius: 20,
        padding: isMobile ? "24px 18px" : "32px 36px",
        maxWidth: 440, width: "90%",
        boxShadow: "0 12px 48px rgba(0,0,0,.2)",
        maxHeight: "90vh", overflowY: "auto",
      }}>
        {/* ═══ MANAGE EXISTING BUST ═══ */}
        {stage === "manage" && (
          <>
            <h2 style={{
              fontFamily: T.font.display, fontSize: 22, fontWeight: 400,
              color: T.color.charcoal, textAlign: "center", marginBottom: 16,
            }}>
              Your Bust
            </h2>
            {bustTextureUrl && (
              <img src={bustTextureUrl} alt="Current bust" style={{
                width: 160, height: 160, objectFit: "cover",
                borderRadius: 16, margin: "0 auto 16px",
                border: `3px solid ${T.color.sandstone}`, display: "block",
              }} />
            )}
            <p style={{
              fontFamily: T.font.body, fontSize: 13, color: T.color.muted,
              textAlign: "center", marginBottom: 20, lineHeight: 1.5,
            }}>
              Your {bustStyleLabel} bust is displayed on a pedestal in the entrance hall.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={() => { setStage("upload"); setPreview(null); }} style={{
                fontFamily: T.font.body, fontSize: 14, fontWeight: 600,
                padding: "10px 24px", borderRadius: 10, border: "none",
                background: `linear-gradient(135deg,${T.color.terracotta},${T.color.walnut})`,
                color: "#FFF", cursor: "pointer",
              }}>
                Change Photo
              </button>
              <button onClick={handleRemove} style={{
                fontFamily: T.font.body, fontSize: 14, padding: "10px 20px",
                borderRadius: 10, border: `1px solid ${T.color.sandstone}`,
                background: "transparent", color: T.color.muted, cursor: "pointer",
              }}>
                Remove Bust
              </button>
              <button onClick={onClose} style={{
                fontFamily: T.font.body, fontSize: 14, padding: "10px 20px",
                borderRadius: 10, border: `1px solid ${T.color.cream}`,
                background: "transparent", color: T.color.walnut, cursor: "pointer",
              }}>
                Close
              </button>
            </div>
          </>
        )}

        {/* ═══ UPLOAD PHOTO ═══ */}
        {stage === "upload" && (
          <>
            <h2 style={{
              fontFamily: T.font.display, fontSize: 22, fontWeight: 400,
              color: T.color.charcoal, textAlign: "center", marginBottom: 8,
            }}>
              {hasBust ? "Change Your Bust" : "Create Your Bust"}
            </h2>
            <p style={{
              fontFamily: T.font.body, fontSize: 14, color: T.color.muted,
              textAlign: "center", marginBottom: 16, lineHeight: 1.5,
            }}>
              Upload a portrait photo to place on a {bustStyleLabel} bust in your palace.
            </p>

            {/* Name input */}
            <div style={{ marginBottom: 14 }}>
              <label style={{
                fontFamily: T.font.body, fontSize: 12, color: T.color.muted,
                textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 4,
              }}>
                Name on plaque
              </label>
              <input
                type="text"
                value={bustNameInput}
                onChange={e => setBustNameInput(e.target.value)}
                placeholder="Enter name for the bust..."
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: 10,
                  border: `1px solid ${T.color.sandstone}`, background: `${T.color.warmStone}60`,
                  fontFamily: T.font.body, fontSize: 15, color: T.color.charcoal,
                  outline: "none", boxSizing: "border-box",
                }}
              />
            </div>

            {/* Gender selector */}
            <div style={{ marginBottom: 18 }}>
              <label style={{
                fontFamily: T.font.body, fontSize: 12, color: T.color.muted,
                textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 6,
              }}>
                Bust style
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                {(["male", "female"] as const).map(g => (
                  <button
                    key={g}
                    onClick={() => setBustGender(g)}
                    style={{
                      flex: 1, padding: "8px 0", borderRadius: 8, cursor: "pointer",
                      fontFamily: T.font.body, fontSize: 14, fontWeight: bustGender === g ? 600 : 400,
                      border: bustGender === g
                        ? `2px solid ${T.color.terracotta}`
                        : `1px solid ${T.color.sandstone}`,
                      background: bustGender === g
                        ? `${T.color.terracotta}18`
                        : "transparent",
                      color: bustGender === g ? T.color.charcoal : T.color.muted,
                    }}
                  >
                    {g === "male" ? "Male" : "Female"}
                  </button>
                ))}
              </div>
            </div>

            {/* Photo upload */}
            <div
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => !preview && inputRef.current?.click()}
              style={{
                border: `2px dashed ${preview ? T.color.terracotta : T.color.sandstone}`,
                borderRadius: 14, padding: preview ? "16px" : "36px 20px",
                textAlign: "center", cursor: preview ? "default" : "pointer",
                background: `${T.color.warmStone}80`,
              }}
            >
              {preview ? (
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <img src={preview} alt="Selected" style={{
                    width: 80, height: 80, objectFit: "cover", borderRadius: 12,
                    border: `2px solid ${photoFeedback ? "#C0392B" : T.color.terracotta}`,
                  }} />
                  <div style={{ flex: 1, textAlign: "left" }}>
                    {photoFeedback ? (
                      <div style={{
                        fontFamily: T.font.body, fontSize: 13, color: "#C0392B",
                        lineHeight: 1.4,
                      }}>
                        {photoFeedback}
                      </div>
                    ) : (
                      <div style={{
                        fontFamily: T.font.body, fontSize: 13, color: "#4A6741",
                        fontWeight: 500,
                      }}>
                        Photo looks good!
                      </div>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }} style={{
                      fontFamily: T.font.body, fontSize: 12, color: T.color.muted,
                      background: "none", border: "none", cursor: "pointer",
                      textDecoration: "underline", marginTop: 4, padding: 0,
                    }}>
                      Change photo
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>{"📷"}</div>
                  <div style={{ fontFamily: T.font.body, fontSize: 14, color: T.color.muted }}>
                    Drop a portrait photo or click to browse
                  </div>
                  <div style={{ fontFamily: T.font.body, fontSize: 11, color: T.color.muted, marginTop: 4, opacity: 0.7 }}>
                    A head &amp; shoulders portrait works best
                  </div>
                </>
              )}
              <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 18 }}>
              {hasBust && (
                <button onClick={() => setStage("manage")} style={{
                  fontFamily: T.font.body, fontSize: 14, padding: "10px 20px",
                  borderRadius: 10, border: `1px solid ${T.color.sandstone}`,
                  background: "transparent", color: T.color.walnut, cursor: "pointer",
                }}>
                  Back
                </button>
              )}
              <button
                onClick={handleCreate}
                disabled={!preview}
                style={{
                  fontFamily: T.font.body, fontSize: 15, fontWeight: 600,
                  padding: "12px 32px", borderRadius: 10, border: "none",
                  background: preview
                    ? `linear-gradient(135deg,${T.color.terracotta},${T.color.walnut})`
                    : T.color.sandstone,
                  color: "#FFF", cursor: preview ? "pointer" : "not-allowed",
                  opacity: preview ? 1 : 0.5,
                }}
              >
                Create Bust
              </button>
            </div>
          </>
        )}

        {/* ═══ CREATING ═══ */}
        {stage === "creating" && (
          <div style={{ textAlign: "center", padding: "30px 0" }}>
            <h2 style={{
              fontFamily: T.font.display, fontSize: 22, fontWeight: 400,
              color: T.color.charcoal, marginBottom: 16,
            }}>
              Creating Your Bust
            </h2>
            {preview && (
              <img src={preview} alt="Processing" style={{
                width: 80, height: 80, objectFit: "cover",
                borderRadius: "50%", margin: "0 auto 20px",
                border: `3px solid ${T.color.sandstone}`,
                display: "block", opacity: 0.7,
                animation: "pulse 1.5s ease-in-out infinite",
              }} />
            )}
            <p style={{
              fontFamily: T.font.body, fontSize: 14, color: T.color.muted,
            }}>
              Sculpting your {bustStyleLabel} bust...
            </p>
          </div>
        )}

        {/* ═══ ERROR ═══ */}
        {stage === "error" && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <h2 style={{
              fontFamily: T.font.display, fontSize: 22, fontWeight: 400,
              color: T.color.charcoal, marginBottom: 12,
            }}>
              Something went wrong
            </h2>
            <p style={{
              fontFamily: T.font.body, fontSize: 14, color: "#C0392B",
              marginBottom: 16,
            }}>
              {error || "Please try again with a different photo."}
            </p>
            <button onClick={() => { setStage("upload"); setError(null); setPreview(null); }} style={{
              fontFamily: T.font.body, fontSize: 14, padding: "10px 24px",
              borderRadius: 10, border: `1px solid ${T.color.sandstone}`,
              background: "transparent", color: T.color.walnut, cursor: "pointer",
            }}>
              Try Again
            </button>
          </div>
        )}

        {/* ═══ DONE ═══ */}
        {stage === "done" && (
          <div style={{ textAlign: "center" }}>
            <h2 style={{
              fontFamily: T.font.display, fontSize: 22, fontWeight: 400,
              color: T.color.charcoal, marginBottom: 12,
            }}>
              Your Bust is Ready
            </h2>
            <div ref={previewCanvasRef} style={{
              width: 220, height: 260, margin: "0 auto 16px",
              borderRadius: 14, overflow: "hidden",
              background: `linear-gradient(180deg, ${T.color.warmStone}40, ${T.color.linen})`,
            }} />
            <p style={{
              fontFamily: T.font.body, fontSize: 13, color: T.color.muted,
              marginBottom: 16,
            }}>
              Your {bustStyleLabel} bust has been placed on a pedestal in the entrance hall.
              Re-enter the hall to see it.
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
