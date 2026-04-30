"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { T } from "@/lib/theme";
import { WINGS } from "@/lib/constants/wings";
import { createPalaceRoom } from "@/lib/kep/join-actions";
import TuscanCard from "@/components/ui/TuscanCard";
import { useTranslation } from "@/lib/hooks/useTranslation";

interface PageProps {
  params: Promise<{ code: string }>;
}

export default function KepPalacePage({ params }: PageProps) {
  const { t } = useTranslation("kepJoin");
  const router = useRouter();
  const pathname = usePathname();
  const [code, setCode] = useState("");
  const [selectedWing, setSelectedWing] = useState<string | null>(null);
  const [roomName, setRoomName] = useState("");
  const [status, setStatus] = useState<"pick" | "name" | "creating" | "error">("pick");
  const [error, setError] = useState("");

  useEffect(() => {
    params.then(({ code: c }) => setCode(c));
  }, [params]);

  // Filter out attic — only real wings
  const wings = WINGS.filter((w) => w.id !== "attic");

  async function handleCreate() {
    if (!selectedWing || !roomName.trim() || !code) return;
    setStatus("creating");
    const result = await createPalaceRoom(code, selectedWing, roomName);
    if (result.error) {
      if (result.error === "Not authenticated") {
        router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
        return;
      }
      setStatus("error");
      setError(result.error);
    } else if (result.roomId) {
      router.push(`/palace?room=${result.roomId}`);
    }
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: T.color.linen,
        fontFamily: T.font.body,
        padding: "2rem",
      }}
    >
      <div
        style={{
          background: T.color.white,
          borderRadius: "1.5rem",
          padding: "2rem",
          maxWidth: "32rem",
          width: "100%",
          boxShadow: "0 8px 32px rgba(44,44,42,.1)",
          border: `1px solid ${T.color.cream}`,
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🏛️</div>
          <h1
            style={{
              fontFamily: T.font.display,
              fontSize: "1.375rem",
              color: T.color.charcoal,
              marginBottom: "0.375rem",
            }}
          >
            {t("addKepRoom")}
          </h1>
          <p style={{ color: T.color.muted, fontSize: "0.8125rem" }}>
            {t("addKepRoomDesc")}
          </p>
        </div>

        {status === "error" && (
          <div
            style={{
              padding: "0.75rem 1rem",
              background: "#fef2f2",
              borderRadius: "0.75rem",
              color: "#c0392b",
              fontSize: "0.8125rem",
              marginBottom: "1rem",
              textAlign: "center",
            }}
          >
            {error === "Not authenticated" ? (
              <>
                {t("pleaseSignIn")}{" "}
                <a href="/auth/sign-in" style={{ color: T.color.terracotta, textDecoration: "underline" }}>
                  {t("signIn")}
                </a>
              </>
            ) : (
              error
            )}
          </div>
        )}

        {status !== "creating" && (
          <>
            {/* Wing picker */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(8rem, 1fr))",
                gap: "0.75rem",
                marginBottom: "1.5rem",
              }}
            >
              {wings.map((w) => (
                <div
                  key={w.id}
                  onClick={() => {
                    setSelectedWing(w.id);
                    setStatus("name");
                  }}
                  style={{ cursor: "pointer" }}
                >
                  <TuscanCard
                    variant={selectedWing === w.id ? "solid" : "glass"}
                    style={{
                      textAlign: "center",
                      padding: "1rem 0.5rem",
                      border: selectedWing === w.id ? `2px solid ${T.color.terracotta}` : undefined,
                    }}
                  >
                    <div style={{ fontSize: "1.5rem", marginBottom: "0.375rem" }}>{w.icon}</div>
                    <div
                      style={{
                        fontFamily: T.font.display,
                        fontSize: "0.8125rem",
                        color: T.color.charcoal,
                      }}
                    >
                      {w.name}
                    </div>
                  </TuscanCard>
                </div>
              ))}
            </div>

            {/* Room name input */}
            {selectedWing && (
              <div style={{ marginBottom: "1.25rem" }}>
                <label
                  style={{
                    display: "block",
                    fontFamily: T.font.display,
                    fontSize: "0.8125rem",
                    color: T.color.charcoal,
                    marginBottom: "0.375rem",
                  }}
                >
                  {t("roomName")}
                </label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder={t("roomNamePlaceholder")}
                  maxLength={80}
                  style={{
                    width: "100%",
                    padding: "0.625rem 0.875rem",
                    borderRadius: "0.75rem",
                    border: `1px solid ${T.color.cream}`,
                    fontFamily: T.font.body,
                    fontSize: "0.875rem",
                    background: T.color.linen,
                    color: T.color.charcoal,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            )}

            {/* Create button */}
            <button
              onClick={handleCreate}
              disabled={!selectedWing || !roomName.trim()}
              style={{
                width: "100%",
                padding: "0.75rem",
                borderRadius: "0.75rem",
                border: "none",
                background: selectedWing && roomName.trim() ? T.color.terracotta : T.color.cream,
                color: selectedWing && roomName.trim() ? T.color.white : T.color.muted,
                fontFamily: T.font.display,
                fontSize: "0.9375rem",
                cursor: selectedWing && roomName.trim() ? "pointer" : "default",
                transition: "background .2s",
              }}
            >
              {t("createRoom")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
