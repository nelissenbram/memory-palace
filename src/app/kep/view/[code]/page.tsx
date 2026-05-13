"use client";

import { useEffect, useState } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";

interface PageProps {
  params: Promise<{ code: string }>;
}

interface Memory {
  id: string;
  title: string | null;
  type: string;
  file_url: string | null;
  created_at: string;
}

interface RoomData {
  name: string;
  expires_at: string | null;
  grounded_at: string | null;
  memories: Memory[];
}

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

function getDaysRemaining(expiresAt: string): number {
  const now = Date.now();
  const expiry = new Date(expiresAt).getTime();
  return Math.max(0, Math.ceil((expiry - now) / (1000 * 60 * 60 * 24)));
}

export default function KepViewPage({ params }: PageProps) {
  const { t } = useTranslation("kepView");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [room, setRoom] = useState<RoomData | null>(null);
  const [selectedImage, setSelectedImage] = useState<Memory | null>(null);

  useEffect(() => {
    let cancelled = false;
    params.then(({ code }) => {
      fetch(`/api/kep/view/${code}`)
        .then((res) => {
          if (!res.ok) throw new Error(res.status === 404 ? "not_found" : "error");
          return res.json();
        })
        .then((data) => {
          if (!cancelled) {
            setRoom(data);
            setLoading(false);
          }
        })
        .catch((err) => {
          if (!cancelled) {
            setError(err.message === "not_found" ? "not_found" : "error");
            setLoading(false);
          }
        });
    });
    return () => { cancelled = true; };
  }, [params]);

  const isExpired = room?.expires_at ? getDaysRemaining(room.expires_at) <= 0 : false;
  const daysLeft = room?.expires_at ? getDaysRemaining(room.expires_at) : null;

  return (
    <div style={{
      minHeight: "100dvh", display: "flex", flexDirection: "column",
      alignItems: "center", background: T.color.linen,
      fontFamily: T.font.body, padding: "1.5rem",
    }}>
      <div style={{
        background: T.color.white, borderRadius: "1.5rem", padding: "2rem 2.5rem",
        maxWidth: "48rem", width: "100%",
        boxShadow: "0 8px 32px rgba(44,44,42,.1)", border: `1px solid ${T.color.cream}`,
      }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <CameraIcon />
          <h1 style={{
            fontFamily: T.font.display, fontSize: "1.375rem",
            color: T.color.charcoal, marginTop: "0.75rem",
          }}>
            {loading ? t("loading") : room ? room.name : t("title")}
          </h1>
        </div>

        {/* Loading */}
        {loading && (
          <p style={{ color: T.color.muted, fontSize: "0.875rem", textAlign: "center" }}>
            {t("loading")}
          </p>
        )}

        {/* Error */}
        {error === "not_found" && (
          <div style={{
            background: "#fef2f2", borderRadius: "0.75rem", padding: "1rem",
            border: "1px solid #fecaca", textAlign: "center",
          }}>
            <p style={{ color: "#b91c1c", fontSize: "0.875rem", fontWeight: 500 }}>
              {t("notFound")}
            </p>
            <p style={{ color: "#dc2626", fontSize: "0.8125rem", marginTop: "0.25rem" }}>
              {t("notFoundDesc")}
            </p>
          </div>
        )}

        {error === "error" && (
          <div style={{
            background: "#fef2f2", borderRadius: "0.75rem", padding: "1rem",
            border: "1px solid #fecaca", textAlign: "center",
          }}>
            <p style={{ color: "#b91c1c", fontSize: "0.875rem", fontWeight: 500 }}>
              {t("error")}
            </p>
          </div>
        )}

        {/* Expired */}
        {room && isExpired && (
          <div style={{ textAlign: "center" }}>
            <div style={{
              background: `${T.color.terracotta}10`, borderRadius: "0.75rem",
              padding: "1.5rem", border: `1px solid ${T.color.terracotta}30`,
              marginBottom: "1.5rem",
            }}>
              <p style={{
                fontFamily: T.font.display, fontSize: "1.125rem",
                color: T.color.terracotta, marginBottom: "0.5rem",
              }}>
                {t("expired")}
              </p>
              <p style={{ color: T.color.muted, fontSize: "0.8125rem" }}>
                {t("expiredDesc")}
              </p>
            </div>
            <a
              href="/register"
              style={{
                display: "inline-block", padding: "0.75rem 2rem",
                borderRadius: "0.75rem", border: "none",
                background: T.color.terracotta, color: T.color.white,
                fontFamily: T.font.display, fontSize: "0.9375rem",
                textDecoration: "none", cursor: "pointer",
              }}
            >
              {t("createPalace")}
            </a>
          </div>
        )}

        {/* Room content */}
        {room && !isExpired && (
          <>
            {/* Expiry countdown */}
            {daysLeft !== null && !room.grounded_at && (
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                gap: "0.5rem", marginBottom: "1.25rem",
                padding: "0.5rem 1rem", borderRadius: "0.5rem",
                background: daysLeft <= 3 ? "#fef2f2" : `${T.color.gold}10`,
                border: `1px solid ${daysLeft <= 3 ? "#fecaca" : T.color.gold + "30"}`,
              }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="8" cy="8" r="7" stroke={daysLeft <= 3 ? "#b91c1c" : T.color.gold} strokeWidth="1.5" fill="none" />
                  <path d="M8 4v4l3 2" stroke={daysLeft <= 3 ? "#b91c1c" : T.color.gold} strokeWidth="1.5" strokeLinecap="round" fill="none" />
                </svg>
                <span style={{
                  fontSize: "0.8125rem",
                  color: daysLeft <= 3 ? "#b91c1c" : T.color.walnut,
                }}>
                  {t("daysRemaining", { count: String(daysLeft) })}
                </span>
              </div>
            )}

            {/* Memory grid */}
            {room.memories.length === 0 ? (
              <p style={{
                color: T.color.muted, fontSize: "0.875rem",
                textAlign: "center", padding: "2rem 0",
              }}>
                {t("noMemories")}
              </p>
            ) : (
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(8rem, 1fr))",
                gap: "0.75rem",
              }}>
                {room.memories.map((memory) => (
                  <button
                    key={memory.id}
                    onClick={() => memory.file_url && setSelectedImage(memory)}
                    style={{
                      position: "relative", paddingTop: "100%",
                      paddingLeft: 0, paddingRight: 0, paddingBottom: 0,
                      borderRadius: "0.75rem", overflow: "hidden",
                      border: `1px solid ${T.color.cream}`,
                      background: T.color.linen, cursor: memory.file_url ? "pointer" : "default",
                    }}
                  >
                    {memory.file_url ? (
                      memory.type === "video" ? (
                        <video
                          src={memory.file_url}
                          style={{
                            position: "absolute", top: 0, left: 0,
                            width: "100%", height: "100%", objectFit: "cover",
                          }}
                          muted
                          playsInline
                        />
                      ) : (
                        <img
                          src={memory.file_url}
                          alt={memory.title || ""}
                          style={{
                            position: "absolute", top: 0, left: 0,
                            width: "100%", height: "100%", objectFit: "cover",
                          }}
                          loading="lazy"
                        />
                      )
                    ) : (
                      <div style={{
                        position: "absolute", top: 0, left: 0,
                        width: "100%", height: "100%",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: T.color.muted, fontSize: "0.75rem", padding: "0.5rem",
                        textAlign: "center",
                      }}>
                        {memory.title || memory.type}
                      </div>
                    )}
                    {/* Video play icon overlay */}
                    {memory.type === "video" && memory.file_url && (
                      <div style={{
                        position: "absolute", bottom: "0.375rem", right: "0.375rem",
                        background: "rgba(0,0,0,0.5)", borderRadius: "0.25rem",
                        padding: "0.125rem 0.25rem",
                      }}>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="white">
                          <path d="M3 1.5l7 4.5-7 4.5V1.5z" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* CTA */}
            <div style={{
              marginTop: "2rem", textAlign: "center",
              padding: "1.25rem", borderRadius: "0.75rem",
              background: T.color.linen, border: `1px solid ${T.color.cream}`,
            }}>
              <p style={{
                fontFamily: T.font.display, fontSize: "0.9375rem",
                color: T.color.charcoal, marginBottom: "0.75rem",
              }}>
                {t("ctaTitle")}
              </p>
              <a
                href="/register"
                style={{
                  display: "inline-block", padding: "0.625rem 1.75rem",
                  borderRadius: "0.75rem", border: "none",
                  background: T.color.terracotta, color: T.color.white,
                  fontFamily: T.font.display, fontSize: "0.875rem",
                  textDecoration: "none", cursor: "pointer",
                }}
              >
                {t("createPalace")}
              </a>
            </div>
          </>
        )}
      </div>

      {/* Lightbox */}
      {selectedImage && selectedImage.file_url && (
        <div
          onClick={() => setSelectedImage(null)}
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.85)", zIndex: 9999,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", padding: "1rem",
          }}
        >
          <button
            onClick={() => setSelectedImage(null)}
            style={{
              position: "absolute", top: "1rem", right: "1rem",
              background: "rgba(255,255,255,0.15)", border: "none",
              borderRadius: "50%", width: "2.5rem", height: "2.5rem",
              color: "white", fontSize: "1.25rem", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            x
          </button>
          {selectedImage.type === "video" ? (
            <video
              src={selectedImage.file_url}
              controls
              autoPlay
              style={{ maxWidth: "90vw", maxHeight: "85vh", borderRadius: "0.5rem" }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <img
              src={selectedImage.file_url}
              alt={selectedImage.title || ""}
              style={{ maxWidth: "90vw", maxHeight: "85vh", borderRadius: "0.5rem", objectFit: "contain" }}
              onClick={(e) => e.stopPropagation()}
            />
          )}
          {selectedImage.title && (
            <p style={{
              position: "absolute", bottom: "1.5rem",
              color: "white", fontFamily: T.font.display,
              fontSize: "0.9375rem", textAlign: "center",
              background: "rgba(0,0,0,0.5)", padding: "0.375rem 1rem",
              borderRadius: "0.5rem",
            }}>
              {selectedImage.title}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
