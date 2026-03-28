"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import * as THREE from "three";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import { useUserStore } from "@/lib/stores/userStore";
import { updateProfile } from "@/lib/auth/profile-actions";
import {
  loadBustModel,
  loadImage,
  detectAndCropFace,
  type BustStyle,
  type BustGender,
} from "@/lib/3d/bustBuilder";

interface BustBuilderPanelProps {
  onClose: () => void;
  pedestalIndex?: number;
}

type Stage = "manage" | "upload" | "calibrating" | "ready" | "creating" | "done" | "error";

export default function BustBuilderPanel({ onClose, pedestalIndex = 0 }: BustBuilderPanelProps) {
  const isMobile = useIsMobile();
  const { t } = useTranslation("bustBuilder");
  const { containerRef: focusTrapRef, handleKeyDown } = useFocusTrap(true);
  const { styleEra, bustPedestals, userName } = useUserStore();
  const pedestalData = bustPedestals[pedestalIndex];
  const hasBust = !!pedestalData?.faceUrl;

  const [preview, setPreview] = useState<string | null>(null);
  const [croppedFace, setCroppedFace] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>(hasBust ? "manage" : "upload");
  const [error, setError] = useState<string | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [calibrationMessage, setCalibrationMessage] = useState<string | null>(null);
  const [creationStep, setCreationStep] = useState("");
  const [doneBustGroup, setDoneBustGroup] = useState<THREE.Group | null>(null);
  const [bustNameInput, setBustNameInput] = useState(pedestalData?.name || (pedestalIndex === 0 ? userName : "") || "");
  const [bustGender, setBustGender] = useState<BustGender>(
    pedestalData?.gender || "male"
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const previewCanvasRef = useRef<HTMLDivElement>(null);

  const bustStyle: BustStyle = styleEra === "renaissance" ? "renaissance" : "roman";
  const bustStyleLabel = bustStyle === "renaissance" ? "bronze" : "marble";

  const handleFile = useCallback(async (f: File) => {
    const url = URL.createObjectURL(f);
    setPreview(url);
    setError(null);
    setCroppedFace(null);
    setFaceDetected(false);
    setCalibrationMessage(null);
    setStage("calibrating");

    try {
      const img = await loadImage(url);
      const result = await detectAndCropFace(img);
      setCroppedFace(result.croppedUrl);
      setFaceDetected(result.detected);
      setCalibrationMessage(result.message);
      setStage("ready");
    } catch {
      setCalibrationMessage(t("failedToProcess"));
      setFaceDetected(false);
      setStage("ready");
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith("image/")) handleFile(f);
  }, [handleFile]);

  // ── Remove existing bust ──
  const handleRemove = async () => {
    const store = useUserStore.getState();
    store.removeBustPedestal(pedestalIndex);
    await updateProfile({ bustPedestals: useUserStore.getState().bustPedestals }).catch(() => {});
    if (pedestalIndex === 0) {
      await updateProfile({ bustTextureUrl: "" }).catch(() => {});
    }
    onClose();
  };

  // ── Create bust ──
  const handleCreate = async () => {
    if (!croppedFace && !preview) return;
    setError(null);
    setStage("creating");

    try {
      setCreationStep(t("preparingPortrait"));
      const faceUrl = croppedFace || preview!;

      // Convert to a reasonable-sized data URL
      const img = await loadImage(faceUrl);
      const canvas = document.createElement("canvas");
      const maxSize = 512;
      const ratio = Math.min(maxSize / img.width, maxSize / img.height);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const textureDataUrl = canvas.toDataURL("image/jpeg", 0.85);

      // Save per-pedestal data
      setCreationStep(t("savingToPalace"));
      const store = useUserStore.getState();
      store.setBustPedestal(pedestalIndex, {
        faceUrl: textureDataUrl,
        name: bustNameInput || "",
        gender: bustGender,
      });

      await updateProfile({ bustPedestals: useUserStore.getState().bustPedestals }).catch(() => {});
      if (pedestalIndex === 0) {
        await updateProfile({ bustTextureUrl: textureDataUrl, bustName: bustNameInput, bustGender }).catch(() => {});
      }

      // Load the composite bust for preview
      setCreationStep(t("sculptingBust"));
      const bustGroup = await loadBustModel(bustStyle, bustGender, textureDataUrl);
      setDoneBustGroup(bustGroup);
      setStage("done");
    } catch (err) {
      console.error("Bust creation failed:", err);
      setError(t("failedToCreate"));
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

    const box = new THREE.Box3().setFromObject(clone);
    const modelHeight = box.max.y - box.min.y;
    const targetH = 0.7;
    const sc = targetH / Math.max(modelHeight, 0.01);
    const center = box.getCenter(new THREE.Vector3());
    clone.position.set(-center.x * sc, -box.min.y * sc, -center.z * sc);
    clone.scale.set(sc, sc, sc);
    scene.add(clone);

    // Fixed frontal render (no rotation)
    renderer.render(scene, camera);

    const cleanup = () => { renderer.dispose(); };
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
      <div ref={focusTrapRef} role="dialog" aria-modal="true" aria-label={t("title")} onKeyDown={(e) => { if (e.key === "Escape") onClose(); handleKeyDown(e); }} onClick={e => e.stopPropagation()} style={{
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
              {t("pedestalTitle", { index: String(pedestalIndex + 1) })}{pedestalData?.name ? ` — ${pedestalData.name}` : ""}
            </h2>
            {pedestalData?.faceUrl && (
              <img src={pedestalData.faceUrl} alt={t("currentBust")} style={{
                width: 160, height: 160, objectFit: "cover",
                borderRadius: 16, margin: "0 auto 16px",
                border: `3px solid ${T.color.sandstone}`, display: "block",
              }} />
            )}
            <p style={{
              fontFamily: T.font.body, fontSize: 13, color: T.color.muted,
              textAlign: "center", marginBottom: 20, lineHeight: 1.5,
            }}>
              {t("bustDescription", { style: bustStyleLabel, index: String(pedestalIndex + 1) })}
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={() => { setStage("upload"); setPreview(null); setCroppedFace(null); }} style={{
                fontFamily: T.font.body, fontSize: 14, fontWeight: 600,
                padding: "10px 24px", borderRadius: 10, border: "none",
                background: `linear-gradient(135deg,${T.color.terracotta},${T.color.walnut})`,
                color: "#FFF", cursor: "pointer",
              }}>
                {t("changePhoto")}
              </button>
              <button onClick={handleRemove} style={{
                fontFamily: T.font.body, fontSize: 14, padding: "10px 20px",
                borderRadius: 10, border: `1px solid ${T.color.sandstone}`,
                background: "transparent", color: T.color.muted, cursor: "pointer",
              }}>
                {t("removeBust")}
              </button>
              <button onClick={onClose} style={{
                fontFamily: T.font.body, fontSize: 14, padding: "10px 20px",
                borderRadius: 10, border: `1px solid ${T.color.cream}`,
                background: "transparent", color: T.color.walnut, cursor: "pointer",
              }}>
                {t("close")}
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
              {hasBust ? t("changeBust", { index: String(pedestalIndex + 1) }) : t("createBust", { index: String(pedestalIndex + 1) })}
            </h2>
            <p style={{
              fontFamily: T.font.body, fontSize: 14, color: T.color.muted,
              textAlign: "center", marginBottom: 16, lineHeight: 1.5,
            }}>
              {t("uploadPrompt", { style: bustStyleLabel })}
            </p>

            {/* Name input */}
            <div style={{ marginBottom: 14 }}>
              <label style={{
                fontFamily: T.font.body, fontSize: 12, color: T.color.muted,
                textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 4,
              }}>
                {t("nameOnPlaque")}
              </label>
              <input
                type="text"
                value={bustNameInput}
                onChange={e => setBustNameInput(e.target.value)}
                placeholder={t("namePlaceholder")}
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
                {t("bustStyle")}
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
                    {g === "male" ? t("male") : t("female")}
                  </button>
                ))}
              </div>
            </div>

            {/* Photo upload */}
            <div
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              style={{
                border: `2px dashed ${T.color.sandstone}`,
                borderRadius: 14, padding: "36px 20px",
                textAlign: "center", cursor: "pointer",
                background: `${T.color.warmStone}80`,
              }}
            >
              <div style={{ fontSize: 36, marginBottom: 8 }}>{"📷"}</div>
              <div style={{ fontFamily: T.font.body, fontSize: 14, color: T.color.muted }}>
                {t("dropPortrait")}
              </div>
              <div style={{ fontFamily: T.font.body, fontSize: 11, color: T.color.muted, marginTop: 4, opacity: 0.7 }}>
                {t("portraitTip")}
              </div>
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
                  {t("back")}
                </button>
              )}
            </div>
          </>
        )}

        {/* ═══ CALIBRATING — detecting face ═══ */}
        {stage === "calibrating" && (
          <div style={{ textAlign: "center", padding: "30px 0" }}>
            <h2 style={{
              fontFamily: T.font.display, fontSize: 22, fontWeight: 400,
              color: T.color.charcoal, marginBottom: 16,
            }}>
              {t("detectingFace")}
            </h2>
            {preview && (
              <img src={preview} alt="Processing" style={{
                width: 100, height: 100, objectFit: "cover",
                borderRadius: "50%", margin: "0 auto 16px",
                border: `3px solid ${T.color.sandstone}`,
                display: "block", opacity: 0.7,
                animation: "pulse 1.2s ease-in-out infinite",
              }} />
            )}
            <p style={{
              fontFamily: T.font.body, fontSize: 14, color: T.color.muted,
            }}>
              {t("analyzingPhoto")}
            </p>
          </div>
        )}

        {/* ═══ READY — face calibrated, preview shown ═══ */}
        {stage === "ready" && (
          <>
            <h2 style={{
              fontFamily: T.font.display, fontSize: 22, fontWeight: 400,
              color: T.color.charcoal, textAlign: "center", marginBottom: 16,
            }}>
              {faceDetected ? t("faceCalibrated") : t("photoLoaded")}
            </h2>

            {/* Crop preview: original with crop overlay + cropped result */}
            <div style={{
              display: "flex", gap: 20, justifyContent: "center",
              alignItems: "center", marginBottom: 16,
            }}>
              {/* Original photo with crop circle overlay */}
              <div style={{ textAlign: "center" }}>
                <div style={{
                  fontFamily: T.font.body, fontSize: 11, color: T.color.muted,
                  textTransform: "uppercase", letterSpacing: 1, marginBottom: 6,
                }}>
                  {t("original")}
                </div>
                <div style={{
                  position: "relative", width: 110, height: 110,
                  borderRadius: 10, overflow: "hidden",
                  border: `2px solid ${T.color.sandstone}`,
                }}>
                  {preview && (
                    <>
                      <img src={preview} alt="Original" style={{
                        width: "100%", height: "100%", objectFit: "cover",
                      }} />
                      {/* Dimmed overlay with circular crop cutout */}
                      <div style={{
                        position: "absolute", inset: 0,
                        background: "rgba(0,0,0,0.45)",
                        maskImage: "radial-gradient(ellipse 42% 50% at 50% 45%, transparent 98%, black 100%)",
                        WebkitMaskImage: "radial-gradient(ellipse 42% 50% at 50% 45%, transparent 98%, black 100%)",
                      }} />
                      {/* Crop circle border */}
                      <div style={{
                        position: "absolute", left: "50%", top: "45%",
                        transform: "translate(-50%, -50%)",
                        width: "84%", height: "90%",
                        borderRadius: "45%",
                        border: `2px dashed ${faceDetected ? "#4A6741" : "#FFB74D"}`,
                        pointerEvents: "none",
                      }} />
                    </>
                  )}
                </div>
              </div>

              {/* Arrow */}
              <div style={{
                fontFamily: T.font.body, fontSize: 22, color: T.color.muted,
              }}>
                →
              </div>

              {/* Cropped face result */}
              <div style={{ textAlign: "center" }}>
                <div style={{
                  fontFamily: T.font.body, fontSize: 11, color: T.color.muted,
                  textTransform: "uppercase", letterSpacing: 1, marginBottom: 6,
                }}>
                  {t("faceCrop")}
                </div>
                {croppedFace && (
                  <img src={croppedFace} alt="Cropped face" style={{
                    width: 110, height: 110, objectFit: "cover",
                    borderRadius: "50%",
                    border: `3px solid ${faceDetected ? "#4A6741" : T.color.sandstone}`,
                    filter: bustStyle === "roman"
                      ? "saturate(0.35) sepia(0.25) brightness(1.05)"
                      : "saturate(0.3) sepia(0.45) brightness(0.85)",
                  }} />
                )}
              </div>
            </div>

            {/* Calibration feedback */}
            <div style={{
              padding: "10px 16px", borderRadius: 10, marginBottom: 16,
              background: faceDetected ? "#E8F5E4" : "#FFF3E0",
              border: `1px solid ${faceDetected ? "#A5D6A0" : "#FFB74D"}`,
              textAlign: "center",
            }}>
              <div style={{
                fontFamily: T.font.body, fontSize: 13,
                color: faceDetected ? "#2E7D32" : "#E65100",
                lineHeight: 1.4,
              }}>
                {faceDetected ? "✓ " : "⚠ "}{calibrationMessage}
              </div>
            </div>

            {/* Gender + Name (compact) */}
            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <label style={{
                  fontFamily: T.font.body, fontSize: 11, color: T.color.muted,
                  textTransform: "uppercase", letterSpacing: 1,
                }}>
                  {t("name")}
                </label>
                <input
                  type="text"
                  value={bustNameInput}
                  onChange={e => setBustNameInput(e.target.value)}
                  placeholder="Name on plaque..."
                  style={{
                    width: "100%", padding: "8px 10px", borderRadius: 8, marginTop: 4,
                    border: `1px solid ${T.color.sandstone}`, background: `${T.color.warmStone}60`,
                    fontFamily: T.font.body, fontSize: 14, color: T.color.charcoal,
                    outline: "none", boxSizing: "border-box",
                  }}
                />
              </div>
              <div style={{ width: 120 }}>
                <label style={{
                  fontFamily: T.font.body, fontSize: 11, color: T.color.muted,
                  textTransform: "uppercase", letterSpacing: 1,
                }}>
                  {t("body")}
                </label>
                <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                  {(["male", "female"] as const).map(g => (
                    <button
                      key={g}
                      onClick={() => setBustGender(g)}
                      style={{
                        flex: 1, padding: "7px 0", borderRadius: 6, cursor: "pointer",
                        fontFamily: T.font.body, fontSize: 12, fontWeight: bustGender === g ? 600 : 400,
                        border: bustGender === g
                          ? `2px solid ${T.color.terracotta}`
                          : `1px solid ${T.color.sandstone}`,
                        background: bustGender === g ? `${T.color.terracotta}18` : "transparent",
                        color: bustGender === g ? T.color.charcoal : T.color.muted,
                      }}
                    >
                      {g === "male" ? "M" : "F"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => { setStage("upload"); setPreview(null); setCroppedFace(null); }} style={{
                fontFamily: T.font.body, fontSize: 14, padding: "10px 20px",
                borderRadius: 10, border: `1px solid ${T.color.sandstone}`,
                background: "transparent", color: T.color.walnut, cursor: "pointer",
              }}>
                {t("changePhoto")}
              </button>
              <button
                onClick={handleCreate}
                style={{
                  fontFamily: T.font.body, fontSize: 15, fontWeight: 600,
                  padding: "12px 32px", borderRadius: 10, border: "none",
                  background: `linear-gradient(135deg,${T.color.terracotta},${T.color.walnut})`,
                  color: "#FFF", cursor: "pointer",
                }}
              >
                {t("createBustBtn")}
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
              {t("creatingBust")}
            </h2>
            {/* Face preview with sculpting animation */}
            <div style={{
              width: 120, height: 140, margin: "0 auto 20px",
              position: "relative",
            }}>
              {croppedFace && (
                <img src={croppedFace} alt="Sculpting" style={{
                  width: 90, height: 110, objectFit: "cover",
                  borderRadius: "45% 45% 40% 40%",
                  border: `3px solid ${T.color.sandstone}`,
                  display: "block", margin: "0 auto",
                  filter: bustStyle === "roman"
                    ? "saturate(0.4) sepia(0.3) brightness(1.1)"
                    : "saturate(0.3) sepia(0.5) brightness(0.8)",
                  animation: "pulse 1.5s ease-in-out infinite",
                }} />
              )}
              {/* Bust body silhouette */}
              <div style={{
                width: 70, height: 35, margin: "-4px auto 0",
                background: bustStyle === "roman"
                  ? "linear-gradient(180deg, #E8E0D4, #D8D0C4)"
                  : "linear-gradient(180deg, #6A5840, #5A4830)",
                borderRadius: "0 0 50% 50% / 0 0 100% 100%",
                opacity: 0.6,
              }} />
            </div>
            <p style={{
              fontFamily: T.font.body, fontSize: 14, color: T.color.muted,
              marginBottom: 8,
            }}>
              {creationStep || t("sculptingStyle", { style: bustStyleLabel })}
            </p>
            {/* Progress dots */}
            <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: T.color.terracotta,
                  animation: `pulse 1.2s ease-in-out ${i * 0.3}s infinite`,
                  opacity: 0.5,
                }} />
              ))}
            </div>
          </div>
        )}

        {/* ═══ ERROR ═══ */}
        {stage === "error" && (
          <div role="alert" style={{ textAlign: "center", padding: "20px 0" }}>
            <h2 style={{
              fontFamily: T.font.display, fontSize: 22, fontWeight: 400,
              color: T.color.charcoal, marginBottom: 12,
            }}>
              {t("somethingWrong")}
            </h2>
            <p style={{
              fontFamily: T.font.body, fontSize: 14, color: "#C0392B",
              marginBottom: 16,
            }}>
              {error || t("tryAgain")}
            </p>
            <button onClick={() => { setStage("upload"); setError(null); setPreview(null); setCroppedFace(null); }} style={{
              fontFamily: T.font.body, fontSize: 14, padding: "10px 24px",
              borderRadius: 10, border: `1px solid ${T.color.sandstone}`,
              background: "transparent", color: T.color.walnut, cursor: "pointer",
            }}>
              {t("tryAgainBtn")}
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
              {t("bustReady")}
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
              {t("bustPlaced", { style: bustStyleLabel, index: String(pedestalIndex + 1) })}
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => {
                setStage("upload");
                setPreview(null);
                setCroppedFace(null);
                setDoneBustGroup(null);
              }} style={{
                fontFamily: T.font.body, fontSize: 14, padding: "10px 20px",
                borderRadius: 10, border: `1px solid ${T.color.sandstone}`,
                background: "transparent", color: T.color.walnut, cursor: "pointer",
              }}>
                {t("changePhoto")}
              </button>
              <button onClick={onClose} style={{
                fontFamily: T.font.body, fontSize: 15, fontWeight: 600,
                padding: "12px 32px", borderRadius: 10, border: "none",
                background: `linear-gradient(135deg,${T.color.terracotta},${T.color.walnut})`,
                color: "#FFF", cursor: "pointer",
              }}>
                {t("doneBtn")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
