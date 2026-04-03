"use client";

import { useEffect, useState } from "react";
import { T } from "@/lib/theme";
import { WINGS } from "@/lib/constants/wings";
import { useTranslation } from "@/lib/hooks/useTranslation";
import Image from "next/image";

interface PublicMemory {
  id: string;
  title: string;
  description: string | null;
  type: string;
  hue: number;
  saturation: number;
  lightness: number;
  fileUrl: string | null;
  createdAt: string;
}

interface PublicShareData {
  room: { name: string; localId: string };
  wing: { slug: string; name: string } | null;
  memories: PublicMemory[];
  owner: { displayName: string };
}

// Map wing slug to its static config for accent colors & icons
function getWingMeta(slug: string | null, fallbackName: string) {
  if (!slug) return { icon: "", accent: T.color.terracotta, name: fallbackName };
  const wing = WINGS.find((w) => w.id === slug);
  return wing
    ? { icon: wing.icon, accent: wing.accent, name: wing.name }
    : { icon: "", accent: T.color.terracotta, name: fallbackName };
}

function formatDate(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleDateString(locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function MemoryTypeIcon({ type }: { type: string }) {
  const icons: Record<string, string> = {
    photo: "\uD83D\uDCF7",
    video: "\uD83C\uDFA5",
    orb: "\uD83D\uDD2E",
    case: "\uD83D\uDCE6",
    album: "\uD83D\uDCDA",
  };
  return <span style={{ fontSize: 12 }}>{icons[type] || "\u2728"}</span>;
}

export default function PublicGallery({ slug }: { slug: string }) {
  const { t, locale } = useTranslation("publicGallery");
  const [data, setData] = useState<PublicShareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMemory, setSelectedMemory] = useState<PublicMemory | null>(null);

  useEffect(() => {
    fetch(`/api/public-share/${slug}`)
      .then((res) => {
        if (!res.ok) throw new Error("not found");
        return res.json();
      })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        setError(t("linkNoLongerAvailable"));
        setLoading(false);
      });
  }, [slug, t]);

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        background: `linear-gradient(180deg, ${T.color.linen} 0%, ${T.color.warmStone} 100%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <div style={{
          fontFamily: T.font.display,
          fontSize: 20,
          color: T.color.walnut,
          animation: "fadeIn .5s ease",
        }}>
          {t("loading")}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{
        minHeight: "100vh",
        background: `linear-gradient(180deg, ${T.color.linen} 0%, ${T.color.warmStone} 100%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 16,
        padding: 24,
      }}>
        <div style={{ fontSize: 48 }}>{"\uD83C\uDFDB\uFE0F"}</div>
        <h1 style={{
          fontFamily: T.font.display,
          fontSize: 28,
          fontWeight: 400,
          color: T.color.charcoal,
          textAlign: "center",
        }}>
          {t("linkUnavailable")}
        </h1>
        <p style={{
          fontFamily: T.font.body,
          fontSize: 14,
          color: T.color.muted,
          textAlign: "center",
          maxWidth: 400,
          lineHeight: 1.6,
        }}>
          {error || t("linkDeactivated")}
        </p>
        <a href="/" style={{
          marginTop: 8,
          fontFamily: T.font.body,
          fontSize: 13,
          fontWeight: 600,
          color: T.color.white,
          background: T.color.terracotta,
          padding: "12px 28px",
          borderRadius: 12,
          textDecoration: "none",
          transition: "opacity .15s",
        }}>
          {t("createOwn")}
        </a>
      </div>
    );
  }

  const wingMeta = getWingMeta(data.wing?.slug || null, t("memories"));
  const accent = wingMeta.accent;
  const memories = data.memories;
  const headerTitle = data.wing?.name
    ? t("sharedMemories", { name: data.wing.name })
    : t("sharedMemories", { name: t("shared") });

  return (
    <div style={{
      minHeight: "100vh",
      background: `linear-gradient(180deg, ${T.color.linen} 0%, ${T.color.warmStone} 50%, ${T.color.linen} 100%)`,
    }}>
      {/* Header */}
      <header style={{
        padding: "40px 24px 32px",
        textAlign: "center",
        animation: "fadeUp .6s cubic-bezier(.23,1,.32,1)",
      }}>
        {wingMeta.icon && (
          <div style={{ fontSize: 40, marginBottom: 8 }}>{wingMeta.icon}</div>
        )}
        <h1 style={{
          fontFamily: T.font.display,
          fontSize: 32,
          fontWeight: 400,
          color: T.color.charcoal,
          margin: "0 0 6px",
          letterSpacing: "-0.5px",
        }}>
          {headerTitle}
        </h1>
        <p style={{
          fontFamily: T.font.body,
          fontSize: 14,
          color: T.color.muted,
          margin: 0,
        }}>
          {t("sharedBy", { name: data.owner.displayName })}
          {memories.length > 0 && (
            <span style={{ margin: "0 6px", color: T.color.sandstone }}>{"\u00B7"}</span>
          )}
          {memories.length > 0 && (memories.length === 1
            ? t("memorySingular", { count: String(memories.length) })
            : t("memoryPlural", { count: String(memories.length) }))}
        </p>

        {/* Decorative divider */}
        <div style={{
          width: 60,
          height: 1,
          background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
          margin: "20px auto 0",
          opacity: 0.5,
        }} />
      </header>

      {/* Gallery grid */}
      {memories.length === 0 ? (
        <div style={{
          textAlign: "center",
          padding: "60px 24px",
          animation: "fadeIn .6s ease",
        }}>
          <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.5 }}>{"\uD83C\uDFDB\uFE0F"}</div>
          <p style={{
            fontFamily: T.font.display,
            fontSize: 20,
            color: T.color.walnut,
          }}>
            {t("noMemories")}
          </p>
        </div>
      ) : (
        <div style={{
          maxWidth: 1000,
          margin: "0 auto",
          padding: "0 16px 40px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 16,
          animation: "fadeUp .7s cubic-bezier(.23,1,.32,1) .1s both",
        }}>
          {memories.map((mem, i) => (
            <MemoryCard
              key={mem.id}
              mem={mem}
              accent={accent}
              index={i}
              locale={locale}
              onClick={() => setSelectedMemory(mem)}
            />
          ))}
        </div>
      )}

      {/* Lightbox */}
      {selectedMemory && (
        <MemoryLightbox
          mem={selectedMemory}
          accent={accent}
          locale={locale}
          closeLabel={t("close")}
          onClose={() => setSelectedMemory(null)}
        />
      )}

      {/* Branding footer */}
      <footer style={{
        padding: "32px 24px 40px",
        textAlign: "center",
        borderTop: `1px solid ${T.color.cream}`,
        background: `${T.color.linen}cc`,
      }}>
        <div style={{
          fontFamily: T.font.display,
          fontSize: 18,
          fontWeight: 400,
          fontStyle: "italic",
          color: T.color.walnut,
          marginBottom: 12,
        }}>
          {t("brandName")}
        </div>
        <p style={{
          fontFamily: T.font.body,
          fontSize: 13,
          color: T.color.muted,
          marginBottom: 16,
          lineHeight: 1.6,
        }}>
          {t("tagline")}
        </p>
        <a
          href="/register"
          style={{
            display: "inline-block",
            fontFamily: T.font.body,
            fontSize: 13,
            fontWeight: 600,
            color: T.color.white,
            background: accent,
            padding: "12px 32px",
            borderRadius: 12,
            textDecoration: "none",
            transition: "transform .15s, box-shadow .15s",
            boxShadow: `0 4px 16px ${accent}30`,
          }}
        >
          {t("createOwn")}
        </a>
      </footer>
    </div>
  );
}

/* --- Memory Card --------------------------------------------------------- */

function MemoryCard({
  mem,
  accent,
  index,
  locale,
  onClick,
}: {
  mem: PublicMemory;
  accent: string;
  index: number;
  locale: string;
  onClick: () => void;
}) {
  const hasImage = mem.fileUrl && (mem.type === "photo" || mem.type === "album");
  const hasVideo = mem.fileUrl && mem.type === "video";
  const hslBg = `hsl(${mem.hue}, ${Math.max(mem.saturation - 20, 10)}%, ${Math.min(mem.lightness + 25, 92)}%)`;
  const hslAccent = `hsl(${mem.hue}, ${mem.saturation}%, ${mem.lightness}%)`;

  return (
    <button
      onClick={onClick}
      style={{
        background: T.color.white,
        borderRadius: 16,
        border: `1px solid ${T.color.cream}`,
        overflow: "hidden",
        cursor: "pointer",
        textAlign: "left",
        transition: "transform .2s, box-shadow .2s",
        boxShadow: "0 2px 12px rgba(44,44,42,.06)",
        animationDelay: `${index * 50}ms`,
        display: "flex",
        flexDirection: "column",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.boxShadow = "0 8px 30px rgba(44,44,42,.12)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 2px 12px rgba(44,44,42,.06)";
      }}
    >
      {/* Image area */}
      {hasImage ? (
        <div style={{
          width: "100%",
          aspectRatio: "4 / 3",
          overflow: "hidden",
          background: hslBg,
          position: "relative",
        }}>
          <Image
            src={mem.fileUrl!}
            alt={mem.title}
            fill sizes="(max-width: 768px) 50vw, 300px"
            style={{
              objectFit: "cover",
            }}
          />
        </div>
      ) : hasVideo ? (
        <div style={{
          width: "100%",
          aspectRatio: "4 / 3",
          overflow: "hidden",
          background: hslBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}>
          <video
            src={mem.fileUrl!}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
            muted
            preload="metadata"
          />
          <div style={{
            position: "absolute",
            width: 48,
            height: 48,
            borderRadius: 24,
            background: "rgba(255,255,255,0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            boxShadow: "0 2px 12px rgba(0,0,0,.15)",
          }}>
            {"\u25B6\uFE0F"}
          </div>
        </div>
      ) : (
        <div style={{
          width: "100%",
          aspectRatio: "4 / 3",
          background: `linear-gradient(135deg, ${hslBg}, ${hslAccent}25)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            background: `${hslAccent}20`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
          }}>
            <MemoryTypeIcon type={mem.type} />
          </div>
        </div>
      )}

      {/* Card body */}
      <div style={{ padding: "14px 16px 16px", flex: 1, display: "flex", flexDirection: "column" }}>
        <h3 style={{
          fontFamily: T.font.display,
          fontSize: 17,
          fontWeight: 500,
          color: T.color.charcoal,
          margin: "0 0 4px",
          lineHeight: 1.3,
        }}>
          {mem.title}
        </h3>
        {mem.description && (
          <p style={{
            fontFamily: T.font.body,
            fontSize: 12,
            color: T.color.muted,
            margin: "0 0 8px",
            lineHeight: 1.5,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}>
            {mem.description}
          </p>
        )}
        <div style={{
          marginTop: "auto",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}>
          <MemoryTypeIcon type={mem.type} />
          <span style={{
            fontFamily: T.font.body,
            fontSize: 11,
            color: T.color.sandstone,
          }}>
            {mem.type}
          </span>
          {mem.createdAt && (
            <>
              <span style={{ color: T.color.sandstone, fontSize: 10 }}>{"\u00B7"}</span>
              <span style={{
                fontFamily: T.font.body,
                fontSize: 11,
                color: T.color.sandstone,
              }}>
                {formatDate(mem.createdAt, locale)}
              </span>
            </>
          )}
        </div>
      </div>
    </button>
  );
}

/* --- Lightbox ------------------------------------------------------------- */

function MemoryLightbox({
  mem,
  accent,
  locale,
  closeLabel,
  onClose,
}: {
  mem: PublicMemory;
  accent: string;
  locale: string;
  closeLabel: string;
  onClose: () => void;
}) {
  const hasImage = mem.fileUrl && (mem.type === "photo" || mem.type === "album");
  const hasVideo = mem.fileUrl && mem.type === "video";
  const hslAccent = `hsl(${mem.hue}, ${mem.saturation}%, ${mem.lightness}%)`;

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(42,34,24,.7)",
        backdropFilter: "blur(16px)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "fadeIn .2s ease",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: T.color.linen,
          borderRadius: 20,
          border: `1px solid ${T.color.cream}`,
          boxShadow: "0 24px 80px rgba(44,44,42,.25)",
          maxWidth: 680,
          width: "100%",
          maxHeight: "90vh",
          overflow: "hidden",
          animation: "fadeUp .3s cubic-bezier(.23,1,.32,1)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Media */}
        {hasImage && (
          <div style={{
            width: "100%",
            height: "60vh",
            overflow: "hidden",
            background: T.color.warmStone,
            position: "relative",
          }}>
            <Image
              src={mem.fileUrl!}
              alt={mem.title}
              fill sizes="(max-width: 768px) 100vw, 800px"
              style={{
                objectFit: "contain",
              }}
            />
          </div>
        )}
        {hasVideo && (
          <div style={{
            width: "100%",
            maxHeight: "60vh",
            overflow: "hidden",
            background: "#000",
          }}>
            <video
              src={mem.fileUrl!}
              controls
              autoPlay
              playsInline
              style={{
                width: "100%",
                maxHeight: "60vh",
                objectFit: "contain",
                display: "block",
              }}
            />
          </div>
        )}
        {!hasImage && !hasVideo && (
          <div style={{
            width: "100%",
            height: 180,
            background: `linear-gradient(135deg, ${hslAccent}15, ${hslAccent}30)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <div style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              background: `${hslAccent}20`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
            }}>
              <MemoryTypeIcon type={mem.type} />
            </div>
          </div>
        )}

        {/* Content */}
        <div style={{ padding: "20px 24px 24px", overflowY: "auto" }}>
          <h2 style={{
            fontFamily: T.font.display,
            fontSize: 26,
            fontWeight: 500,
            color: T.color.charcoal,
            margin: "0 0 8px",
            lineHeight: 1.3,
          }}>
            {mem.title}
          </h2>
          {mem.description && (
            <p style={{
              fontFamily: T.font.body,
              fontSize: 14,
              color: T.color.muted,
              margin: "0 0 16px",
              lineHeight: 1.7,
            }}>
              {mem.description}
            </p>
          )}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            paddingTop: 12,
            borderTop: `1px solid ${T.color.cream}`,
          }}>
            <MemoryTypeIcon type={mem.type} />
            <span style={{
              fontFamily: T.font.body,
              fontSize: 12,
              color: T.color.sandstone,
              textTransform: "capitalize",
            }}>
              {mem.type}
            </span>
            {mem.createdAt && (
              <>
                <span style={{ color: T.color.sandstone }}>{"\u00B7"}</span>
                <span style={{
                  fontFamily: T.font.body,
                  fontSize: 12,
                  color: T.color.sandstone,
                }}>
                  {formatDate(mem.createdAt, locale)}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Close button */}
        <div style={{ padding: "0 24px 20px" }}>
          <button
            onClick={onClose}
            style={{
              width: "100%",
              padding: 12,
              fontFamily: T.font.body,
              fontSize: 13,
              background: "transparent",
              border: `1px solid ${T.color.cream}`,
              borderRadius: 10,
              cursor: "pointer",
              color: T.color.muted,
              transition: "background .15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = T.color.warmStone; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            {closeLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
