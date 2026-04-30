"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { T } from "@/lib/theme";
import { WINGS } from "@/lib/constants/wings";
import { checkKepInvite, createVirtualRoom, createPalaceRoom } from "@/lib/kep/join-actions";
import { WingIcon } from "@/components/ui/WingRoomIcons";
import { useRoomStore } from "@/lib/stores/roomStore";
import { useTranslation } from "@/lib/hooks/useTranslation";

interface PageProps {
  params: Promise<{ code: string }>;
}

type Step = "auth-check" | "choose" | "virtual-name" | "palace-wing" | "creating" | "ready" | "error";

function CameraIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="14" width="40" height="28" rx="4" stroke={T.color.walnut} strokeWidth="2.5" fill="none" />
      <path d="M16 14V10a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" stroke={T.color.walnut} strokeWidth="2.5" fill="none" />
      <circle cx="24" cy="28" r="8" stroke={T.color.terracotta} strokeWidth="2.5" fill="none" />
      <circle cx="24" cy="28" r="3" fill={T.color.terracotta} />
    </svg>
  );
}

export default function KepJoinPage({ params }: PageProps) {
  const { t } = useTranslation("kepJoin");
  const router = useRouter();
  const pathname = usePathname();
  const [code, setCode] = useState("");
  const [step, setStep] = useState<Step>("auth-check");
  const [error, setError] = useState("");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomName, setRoomName] = useState("");
  const [createdRoomName, setCreatedRoomName] = useState("");
  const [createdWingName, setCreatedWingName] = useState("");
  const [selectedWing, setSelectedWing] = useState<string | null>(null);

  const addRoom = useRoomStore((s) => s.addRoom);

  // All wings
  const wings = WINGS;

  useEffect(() => {
    let cancelled = false;
    params.then(({ code: c }) => {
      setCode(c);
      checkKepInvite(c).then((result) => {
        if (cancelled) return;
        if (result.error === "Not authenticated") {
          router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
          return;
        }
        if (result.error) {
          setStep("error");
          setError(result.error);
          return;
        }
        if (result.existingRoomId) {
          setRoomId(result.existingRoomId);
          setStep("ready");
        } else {
          setStep("choose");
        }
      });
    });
    return () => { cancelled = true; };
  }, [params, router, pathname]);

  async function handleVirtualRoom() {
    if (!roomName.trim() || !code) return;
    setStep("creating");
    setError("");
    try {
      const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Server action timed out after 15s")), 15000));
      const result = await Promise.race([createVirtualRoom(code, roomName.trim()), timeout]);
      if (result.error) {
        setStep("error");
        setError(result.error);
      } else if (result.roomId) {
        setRoomId(result.roomId);
        setCreatedRoomName(roomName.trim());
        setCreatedWingName("");
        setStep("ready");
      } else {
        setStep("error");
        setError("No room ID returned");
      }
    } catch (e) {
      setStep("error");
      setError(String(e));
    }
  }

  async function handlePalaceRoom() {
    if (!selectedWing || !roomName.trim() || !code) return;
    setStep("creating");
    setError("");
    try {
      const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Server action timed out after 15s")), 15000));
      const result = await Promise.race([createPalaceRoom(code, selectedWing, roomName.trim()), timeout]);
      if (result.error) {
        setStep("error");
        setError(result.error);
      } else if (result.roomId) {
        // Add to local room store so it appears in the 3D palace
        addRoom(selectedWing, roomName.trim(), "📸");
        setRoomId(result.roomId);
        setCreatedRoomName(roomName.trim());
        const w = WINGS.find((wing) => wing.id === selectedWing);
        setCreatedWingName(w?.name || "");
        setStep("ready");
      } else {
        setStep("error");
        setError("No room ID returned");
      }
    } catch (e) {
      setStep("error");
      setError(String(e));
    }
  }

  function handleEnter() {
    if (!roomId) return;
    // Store navigation target so the palace auto-navigates to the wing+room
    if (selectedWing) {
      sessionStorage.setItem("kep_navigate", JSON.stringify({ wingId: selectedWing, roomId }));
    }
    router.push("/palace");
  }

  const cardStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: "0.875rem",
    padding: "1rem 1.25rem", borderRadius: "1rem", width: "100%",
    border: `1px solid ${T.color.cream}`, background: T.color.linen,
    cursor: "pointer", transition: "border-color .15s, box-shadow .15s",
    textAlign: "left" as const,
  };

  return (
    <div style={{
      minHeight: "100dvh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: T.color.linen, fontFamily: T.font.body, padding: "2rem",
    }}>
      <div style={{
        background: T.color.white, borderRadius: "1.5rem", padding: "2rem 2.5rem",
        maxWidth: "32rem", width: "100%", textAlign: "center",
        boxShadow: "0 8px 32px rgba(44,44,42,.1)", border: `1px solid ${T.color.cream}`,
      }}>
        {/* Header */}
        <div style={{ marginBottom: "1.25rem" }}>
          <CameraIcon />
          <h1 style={{ fontFamily: T.font.display, fontSize: "1.375rem", color: T.color.charcoal, marginTop: "0.75rem" }}>
            {t("title")}
          </h1>
          {step !== "ready" && (
            <p style={{ color: T.color.muted, fontSize: "0.8125rem", marginTop: "0.25rem" }}>
              {t("subtitle")}
            </p>
          )}
        </div>

        {/* Auth check */}
        {step === "auth-check" && (
          <p style={{ color: T.color.muted, fontSize: "0.875rem" }}>{t("loading")}</p>
        )}

        {/* Choice */}
        {step === "choose" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", textAlign: "left" }}>
            <button
              onClick={() => { setStep("virtual-name"); setRoomName(""); }}
              style={cardStyle}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.color.terracotta; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.color.cream; }}
            >
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="6" width="30" height="22" rx="3" stroke={T.color.walnut} strokeWidth="2" fill="none" />
                <path d="M3 12h30" stroke={T.color.sandstone} strokeWidth="1.5" />
                <circle cx="18" cy="20" r="3" fill={T.color.terracotta} />
              </svg>
              <div>
                <div style={{ fontFamily: T.font.display, fontSize: "0.9375rem", color: T.color.charcoal }}>{t("quickRoom")}</div>
                <div style={{ fontSize: "0.75rem", color: T.color.muted, marginTop: "0.125rem" }}>
                  {t("quickRoomDesc")}
                </div>
              </div>
            </button>
            <button
              onClick={() => { setStep("palace-wing"); setRoomName(""); setSelectedWing(null); }}
              style={cardStyle}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.color.terracotta; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.color.cream; }}
            >
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 4L4 11h28L18 4z" stroke={T.color.walnut} strokeWidth="2" fill="none" />
                <rect x="7" y="13" width="3" height="14" rx="1" stroke={T.color.walnut} strokeWidth="1.5" fill="none" />
                <rect x="16.5" y="13" width="3" height="14" rx="1" stroke={T.color.walnut} strokeWidth="1.5" fill="none" />
                <rect x="26" y="13" width="3" height="14" rx="1" stroke={T.color.walnut} strokeWidth="1.5" fill="none" />
                <rect x="4" y="27" width="28" height="3" rx="1" stroke={T.color.walnut} strokeWidth="1.5" fill="none" />
              </svg>
              <div>
                <div style={{ fontFamily: T.font.display, fontSize: "0.9375rem", color: T.color.charcoal }}>{t("addToPalace")}</div>
                <div style={{ fontSize: "0.75rem", color: T.color.muted, marginTop: "0.125rem" }}>
                  {t("addToPalaceDesc")}
                </div>
              </div>
            </button>
          </div>
        )}

        {/* Virtual: name only */}
        {step === "virtual-name" && (
          <div style={{ textAlign: "left" }}>
            <button onClick={() => setStep("choose")} style={{ background: "none", border: "none", color: T.color.muted, fontSize: "0.8125rem", cursor: "pointer", marginBottom: "0.75rem", padding: 0 }}>
              {"\u2190"} {t("back")}
            </button>
            <label style={{ display: "block", fontFamily: T.font.display, fontSize: "0.875rem", color: T.color.charcoal, marginBottom: "0.375rem" }}>
              {t("roomName")}
            </label>
            <input
              type="text" value={roomName} onChange={(e) => setRoomName(e.target.value)}
              placeholder={t("roomNamePlaceholder")} maxLength={80} autoFocus
              style={{
                width: "100%", padding: "0.75rem 1rem", borderRadius: "0.75rem",
                border: `1px solid ${T.color.cream}`, fontFamily: T.font.body,
                fontSize: "0.9375rem", background: T.color.linen, color: T.color.charcoal,
                outline: "none", boxSizing: "border-box",
              }}
            />
            <button onClick={handleVirtualRoom} disabled={!roomName.trim()} style={{
              width: "100%", marginTop: "1rem", padding: "0.75rem", borderRadius: "0.75rem",
              border: "none", fontFamily: T.font.display, fontSize: "0.9375rem",
              cursor: roomName.trim() ? "pointer" : "default",
              background: roomName.trim() ? T.color.terracotta : T.color.cream,
              color: roomName.trim() ? T.color.white : T.color.muted,
            }}>
              {t("createRoom")}
            </button>
          </div>
        )}

        {/* Palace: wing picker + name */}
        {step === "palace-wing" && (
          <div style={{ textAlign: "left" }}>
            <button onClick={() => setStep("choose")} style={{ background: "none", border: "none", color: T.color.muted, fontSize: "0.8125rem", cursor: "pointer", marginBottom: "0.75rem", padding: 0 }}>
              {"\u2190"} {t("back")}
            </button>
            <p style={{ fontFamily: T.font.display, fontSize: "0.875rem", color: T.color.charcoal, marginBottom: "0.75rem" }}>
              {t("chooseWing")}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem", marginBottom: "1rem" }}>
              {wings.map((w) => (
                <button
                  key={w.id}
                  onClick={() => setSelectedWing(w.id)}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center",
                    padding: "0.75rem 0.25rem", borderRadius: "0.75rem", cursor: "pointer",
                    border: selectedWing === w.id ? `2px solid ${T.color.terracotta}` : `1px solid ${T.color.cream}`,
                    background: selectedWing === w.id ? `${T.color.terracotta}0c` : T.color.linen,
                    transition: "border-color .15s",
                  }}
                >
                  <WingIcon wingId={w.id} size={28} color={w.accent} />
                  <span style={{ fontFamily: T.font.display, fontSize: "0.6875rem", color: T.color.charcoal }}>{w.name}</span>
                </button>
              ))}
            </div>
            {selectedWing && (
              <>
                <label style={{ display: "block", fontFamily: T.font.display, fontSize: "0.875rem", color: T.color.charcoal, marginBottom: "0.375rem" }}>
                  {t("roomName")}
                </label>
                <input
                  type="text" value={roomName} onChange={(e) => setRoomName(e.target.value)}
                  placeholder={t("roomNamePlaceholder")} maxLength={80} autoFocus
                  style={{
                    width: "100%", padding: "0.75rem 1rem", borderRadius: "0.75rem",
                    border: `1px solid ${T.color.cream}`, fontFamily: T.font.body,
                    fontSize: "0.9375rem", background: T.color.linen, color: T.color.charcoal,
                    outline: "none", boxSizing: "border-box",
                  }}
                />
                <button onClick={handlePalaceRoom} disabled={!roomName.trim()} style={{
                  width: "100%", marginTop: "1rem", padding: "0.75rem", borderRadius: "0.75rem",
                  border: "none", fontFamily: T.font.display, fontSize: "0.9375rem",
                  cursor: roomName.trim() ? "pointer" : "default",
                  background: roomName.trim() ? T.color.terracotta : T.color.cream,
                  color: roomName.trim() ? T.color.white : T.color.muted,
                }}>
                  {t("createRoom")}
                </button>
              </>
            )}
          </div>
        )}

        {/* Creating */}
        {step === "creating" && (
          <p style={{ color: T.color.muted, fontSize: "0.875rem" }}>{t("creating")}</p>
        )}

        {/* Ready — success screen */}
        {step === "ready" && (
          <>
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginBottom: "0.75rem" }}>
              <circle cx="20" cy="20" r="18" stroke={T.color.terracotta} strokeWidth="2.5" fill="none" />
              <path d="M12 20l5 5 11-11" stroke={T.color.terracotta} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
            <p style={{ fontFamily: T.font.display, fontSize: "1.125rem", color: T.color.charcoal, marginBottom: "0.25rem" }}>
              {t("setupComplete")}
            </p>
            <div style={{
              background: T.color.linen, borderRadius: "0.75rem", padding: "0.875rem 1rem",
              margin: "0.75rem 0", border: `1px solid ${T.color.cream}`, textAlign: "left",
            }}>
              {createdRoomName && (
                <p style={{ fontFamily: T.font.display, fontSize: "0.875rem", color: T.color.charcoal }}>
                  {createdWingName
                    ? `"${createdRoomName}" in ${createdWingName}`
                    : `"${createdRoomName}" (virtual room)`}
                </p>
              )}
              <p style={{ color: T.color.muted, fontSize: "0.8125rem", marginTop: "0.375rem" }}>
                {t("setupDesc")}
              </p>
            </div>

            {/* Share placeholder */}
            <button
              disabled
              style={{
                width: "100%", padding: "0.625rem", borderRadius: "0.75rem", marginBottom: "0.5rem",
                border: `1px dashed ${T.color.cream}`, background: "transparent",
                fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.muted,
                cursor: "default",
              }}
            >
              {t("shareComingSoon")}
            </button>

            <button onClick={handleEnter} style={{
              width: "100%", padding: "0.75rem", borderRadius: "0.75rem", border: "none",
              background: T.color.terracotta, color: T.color.white,
              fontFamily: T.font.display, fontSize: "0.9375rem", cursor: "pointer",
            }}>
              {t("enterPalace")}
            </button>
          </>
        )}

        {/* Error — visible! */}
        {step === "error" && (
          <div style={{
            background: "#fef2f2", borderRadius: "0.75rem", padding: "1rem",
            border: "1px solid #fecaca", marginBottom: "0.75rem",
          }}>
            <p style={{ color: "#b91c1c", fontSize: "0.875rem", fontWeight: 500, marginBottom: "0.25rem" }}>
              {t("error")}
            </p>
            <p style={{ color: "#dc2626", fontSize: "0.8125rem" }}>{error}</p>
          </div>
        )}
        {step === "error" && (
          <button
            onClick={() => { setStep("choose"); setError(""); }}
            style={{
              padding: "0.625rem 1.5rem", borderRadius: "0.75rem", border: "none",
              background: T.color.terracotta, color: T.color.white,
              fontFamily: T.font.display, fontSize: "0.875rem", cursor: "pointer",
            }}
          >
            {t("tryAgain")}
          </button>
        )}
      </div>
    </div>
  );
}
