"use client";

import { useEffect, useState } from "react";
import { T } from "@/lib/theme";
import { WINGS } from "@/lib/constants/wings";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useIsMobile, useIsCompact } from "@/lib/hooks/useIsMobile";
import ReportButton from "@/components/social/ReportButton";
import Image from "next/image";

/** Canon interactive/CTA color. */
const EMBER = "#B85C38";

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

// Map wing slug to its static config for accent colors & icons.
// wing.accent drives the header/divider identity accent ONLY — never a CTA fill.
function getWingMeta(slug: string | null, fallbackName: string) {
  if (!slug) return { icon: "", accent: EMBER, name: fallbackName };
  const wing = WINGS.find((w) => w.id === slug);
  return wing
    ? { icon: wing.icon, accent: wing.accent, name: wing.name }
    : { icon: "", accent: EMBER, name: fallbackName };
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
    photo: "📷",
    video: "🎥",
    orb: "🔮",
    case: "📦",
    album: "📚",
  };
  return <span style={{ fontSize: "0.75rem" }}>{icons[type] || "✨"}</span>;
}

/** Translated, capitalized label for a memory type slug (fallback: the raw slug). */
function useTypeLabel() {
  const { t } = useTranslation("publicGallery");
  return (type: string) => {
    const key = `type_${type}`;
    const label = t(key);
    return label === key ? type : label;
  };
}

export default function PublicGallery({ slug }: { slug: string }) {
  const { t, locale } = useTranslation("publicGallery");
  const isMobile = useIsMobile();
  const isCompact = useIsCompact();
  const [data, setData] = useState<PublicShareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMemory, setSelectedMemory] = useState<PublicMemory | null>(null);

  useEffect(() => {
    fetch(`/api/public-share/${slug}`)
      .then((res) => {
        if (res.ok) return res.json();
        // Distinguish permanent / expired / retryable failures.
        if (res.status === 410) throw new Error(t("linkExpired"));
        if (res.status === 429 || res.status >= 500) throw new Error(t("linkTryAgain"));
        throw new Error(t("linkDeactivated"));
      })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : t("linkNoLongerAvailable"));
        setLoading(false);
      });
  }, [slug, t]);

  if (loading) {
    return (
      <div style={{
        minHeight: "100dvh",
        background: `linear-gradient(180deg, ${T.color.linen} 0%, ${T.color.warmStone} 100%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <div style={{
          fontFamily: T.font.display,
          fontSize: "1.25rem",
          color: T.color.inkSoft,
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
        minHeight: "100dvh",
        background: `linear-gradient(180deg, ${T.color.linen} 0%, ${T.color.warmStone} 100%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: "1rem",
        padding: "1.5rem",
      }}>
        <div style={{ fontSize: isMobile ? "2.25rem" : "3rem" }}>{"🏛️"}</div>
        <h1 style={{
          fontFamily: T.font.display,
          fontSize: isMobile ? "1.5rem" : "1.75rem",
          fontWeight: 500,
          color: T.color.inkSoft,
          textAlign: "center",
        }}>
          {t("linkUnavailable")}
        </h1>
        <p style={{
          fontFamily: T.font.body,
          fontSize: "0.875rem",
          color: T.color.muted,
          textAlign: "center",
          maxWidth: "25rem",
          lineHeight: 1.6,
        }}>
          {error || t("linkDeactivated")}
        </p>
        <a href="/" style={{
          marginTop: "0.5rem",
          minHeight: T.touch,
          display: "inline-flex",
          alignItems: "center",
          fontFamily: T.font.body,
          fontSize: "0.8125rem",
          fontWeight: 600,
          color: T.color.cream,
          background: EMBER,
          padding: "0.75rem 1.75rem",
          borderRadius: "0.75rem",
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
      minHeight: "100dvh",
      background: `linear-gradient(180deg, ${T.color.linen} 0%, ${T.color.warmStone} 50%, ${T.color.linen} 100%)`,
    }}>
      {/* Header */}
      <header style={{
        padding: isMobile ? "1.75rem 1.25rem 1.5rem" : "2.5rem 1.5rem 2rem",
        textAlign: "center",
        animation: "fadeUp .6s cubic-bezier(.23,1,.32,1)",
      }}>
        {wingMeta.icon && (
          <div style={{ fontSize: isMobile ? "2rem" : "2.5rem", marginBottom: "0.5rem" }}>{wingMeta.icon}</div>
        )}
        <h1 style={{
          fontFamily: T.font.display,
          fontSize: isMobile ? "1.5rem" : "2rem",
          fontWeight: 500,
          color: T.color.inkSoft,
          margin: "0 0 0.375rem",
          letterSpacing: "-0.02em",
        }}>
          {headerTitle}
        </h1>
        <p style={{
          fontFamily: T.font.body,
          fontSize: "0.875rem",
          color: T.color.muted,
          margin: 0,
        }}>
          {t("sharedBy", { name: data.owner.displayName })}
          {memories.length > 0 && (
            <span style={{ margin: "0 0.375rem", color: T.color.sandstone }}>{"·"}</span>
          )}
          {memories.length > 0 && (memories.length === 1
            ? t("memorySingular", { count: String(memories.length) })
            : t("memoryPlural", { count: String(memories.length) }))}
        </p>

        {/* Section seam — matches TuscanSectionHeader's canon underline
            (0.125rem, rounded) so the public gallery reads as a sibling of the
            profile page. Wing identity accent tints it (never a CTA fill). */}
        <div
          aria-hidden="true"
          style={{
            width: "3.5rem",
            height: "0.125rem",
            background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
            borderRadius: "0.125rem",
            margin: "1.25rem auto 0",
            opacity: 0.55,
          }}
        />

        {/* Report objectionable content (Apple Guideline 1.2) */}
        <div style={{ marginTop: "0.75rem", textAlign: "center" }}>
          <ReportButton targetType="gallery" targetId={slug} />
        </div>
      </header>

      {/* Gallery grid */}
      {memories.length === 0 ? (
        <div style={{
          textAlign: "center",
          padding: isMobile ? "3rem 1.5rem" : "3.75rem 1.5rem",
          animation: "fadeIn .6s ease",
        }}>
          <div style={{ fontSize: "2.25rem", marginBottom: "0.75rem", opacity: 0.5 }}>{"🏛️"}</div>
          <p style={{
            fontFamily: T.font.display,
            fontSize: "1.25rem",
            color: T.color.walnut,
          }}>
            {t("noMemories")}
          </p>
        </div>
      ) : (
        <div style={{
          maxWidth: "62.5rem",
          margin: "0 auto",
          padding: "0 1rem 2.5rem",
          display: "grid",
          gridTemplateColumns: `repeat(auto-fill, minmax(${isCompact ? "10rem" : "17.5rem"}, 1fr))`,
          gap: "1rem",
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
        padding: isMobile ? "2rem 1.25rem 2.5rem" : "2rem 1.5rem 2.5rem",
        textAlign: "center",
        borderTop: `1px solid ${T.color.hairline}`,
        background: `${T.color.linen}cc`,
      }}>
        <div style={{
          fontFamily: T.font.display,
          fontSize: "1.125rem",
          fontWeight: 500,
          fontStyle: "italic",
          color: T.color.walnut,
          marginBottom: "0.75rem",
        }}>
          {t("brandName")}
        </div>
        <p style={{
          fontFamily: T.font.body,
          fontSize: "0.8125rem",
          color: T.color.muted,
          marginBottom: "1rem",
          lineHeight: 1.6,
        }}>
          {t("tagline")}
        </p>
        <a
          href="/register"
          style={{
            display: "inline-flex",
            alignItems: "center",
            minHeight: T.touch,
            fontFamily: T.font.body,
            fontSize: "0.8125rem",
            fontWeight: 600,
            color: T.color.cream,
            background: EMBER,
            padding: "0.75rem 2rem",
            borderRadius: "0.75rem",
            textDecoration: "none",
            transition: "transform .15s, box-shadow .15s",
            boxShadow: `0 4px 16px ${EMBER}30`,
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
  const typeLabel = useTypeLabel();
  const hasImage = mem.fileUrl && (mem.type === "photo" || mem.type === "album");
  const hasVideo = mem.fileUrl && mem.type === "video";
  const hslBg = `hsl(${mem.hue}, ${Math.max(mem.saturation - 20, 10)}%, ${Math.min(mem.lightness + 25, 92)}%)`;
  const hslAccent = `hsl(${mem.hue}, ${mem.saturation}%, ${mem.lightness}%)`;

  return (
    <button
      onClick={onClick}
      style={{
        // Canon TuscanCard grammar: opaque CREAM on a HAIRLINE border with the
        // warm-ink shadow ramp (matches the profile page's card grammar).
        background: T.color.cream,
        borderRadius: "1rem",
        border: `1px solid ${T.color.hairline}`,
        overflow: "hidden",
        cursor: "pointer",
        textAlign: "left",
        transition: "transform .2s, box-shadow .2s",
        boxShadow: T.shadow[1],
        animationDelay: `${index * 50}ms`,
        display: "flex",
        flexDirection: "column",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-0.125rem)";
        e.currentTarget.style.boxShadow = T.shadow.hover;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = T.shadow[1];
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
            unoptimized
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
          background: `linear-gradient(135deg, ${hslBg}, ${hslAccent}25)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}>
          {/* Poster placeholder only — the <video> element is mounted in the
              lightbox so cards don't each fetch a full video source. */}
          <div style={{
            width: "3rem",
            height: "3rem",
            borderRadius: "50%",
            background: "rgba(252,250,245,0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.25rem",
            boxShadow: "0 2px 12px rgba(64,59,54,.15)",
          }}>
            {"▶️"}
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
            width: "4rem",
            height: "4rem",
            borderRadius: "50%",
            background: `${hslAccent}20`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.75rem",
          }}>
            <MemoryTypeIcon type={mem.type} />
          </div>
        </div>
      )}

      {/* Card body */}
      <div style={{ padding: "0.875rem 1rem 1rem", flex: 1, display: "flex", flexDirection: "column" }}>
        <h3 style={{
          fontFamily: T.font.display,
          fontSize: "1.0625rem",
          fontWeight: 500,
          color: T.color.inkSoft,
          margin: "0 0 0.25rem",
          lineHeight: 1.3,
        }}>
          {mem.title}
        </h3>
        {mem.description && (
          <p style={{
            fontFamily: T.font.body,
            fontSize: "0.75rem",
            color: T.color.muted,
            margin: "0 0 0.5rem",
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
          gap: "0.375rem",
        }}>
          <MemoryTypeIcon type={mem.type} />
          <span style={{
            fontFamily: T.font.body,
            fontSize: "0.6875rem",
            color: T.color.sandstone,
            textTransform: "capitalize",
            letterSpacing: "0.03em",
          }}>
            {typeLabel(mem.type)}
          </span>
          {mem.createdAt && (
            <>
              <span style={{ color: T.color.sandstone, fontSize: "0.625rem" }}>{"·"}</span>
              <span style={{
                fontFamily: T.font.body,
                fontSize: "0.6875rem",
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
  const typeLabel = useTypeLabel();
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
        background: "rgba(64,59,54,.7)",
        backdropFilter: "blur(16px)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "fadeIn .2s ease",
        padding: "1rem",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: T.color.cream,
          borderRadius: "1.25rem",
          border: `1px solid ${T.color.hairline}`,
          boxShadow: "0 1.5rem 5rem rgba(64,59,54,.25)",
          maxWidth: "42.5rem",
          width: "100%",
          maxHeight: "90dvh",
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
            height: "60dvh",
            overflow: "hidden",
            background: T.color.warmStone,
            position: "relative",
          }}>
            <Image
              src={mem.fileUrl!}
              alt={mem.title}
              fill sizes="(max-width: 768px) 100vw, 800px"
              unoptimized
              style={{
                objectFit: "contain",
              }}
            />
          </div>
        )}
        {hasVideo && (
          <div style={{
            width: "100%",
            maxHeight: "60dvh",
            overflow: "hidden",
            background: "#000",
          }}>
            <video
              src={mem.fileUrl!}
              controls
              autoPlay
              playsInline
              preload="metadata"
              style={{
                width: "100%",
                maxHeight: "60dvh",
                objectFit: "contain",
                display: "block",
              }}
            />
          </div>
        )}
        {!hasImage && !hasVideo && (
          <div style={{
            width: "100%",
            height: "11.25rem",
            background: `linear-gradient(135deg, ${hslAccent}15, ${hslAccent}30)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <div style={{
              width: "4.5rem",
              height: "4.5rem",
              borderRadius: "50%",
              background: `${hslAccent}20`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "2rem",
            }}>
              <MemoryTypeIcon type={mem.type} />
            </div>
          </div>
        )}

        {/* Content */}
        <div style={{ padding: "1.25rem 1.5rem 1.5rem", overflowY: "auto" }}>
          <h2 style={{
            fontFamily: T.font.display,
            fontSize: "1.625rem",
            fontWeight: 500,
            color: T.color.inkSoft,
            margin: "0 0 0.5rem",
            lineHeight: 1.3,
          }}>
            {mem.title}
          </h2>
          {mem.description && (
            <p style={{
              fontFamily: T.font.body,
              fontSize: "0.875rem",
              color: T.color.muted,
              margin: "0 0 1rem",
              lineHeight: 1.7,
            }}>
              {mem.description}
            </p>
          )}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            paddingTop: "0.75rem",
            borderTop: `1px solid ${T.color.hairline}`,
          }}>
            <MemoryTypeIcon type={mem.type} />
            <span style={{
              fontFamily: T.font.body,
              fontSize: "0.75rem",
              color: T.color.sandstone,
              textTransform: "capitalize",
            }}>
              {typeLabel(mem.type)}
            </span>
            {mem.createdAt && (
              <>
                <span style={{ color: T.color.sandstone }}>{"·"}</span>
                <span style={{
                  fontFamily: T.font.body,
                  fontSize: "0.75rem",
                  color: T.color.sandstone,
                }}>
                  {formatDate(mem.createdAt, locale)}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Close button */}
        <div style={{ padding: "0 1.5rem 1.25rem" }}>
          <button
            onClick={onClose}
            style={{
              width: "100%",
              minHeight: T.touch,
              padding: "0.75rem",
              fontFamily: T.font.body,
              fontSize: "0.8125rem",
              background: "transparent",
              border: `1px solid ${T.color.hairline}`,
              borderRadius: "0.625rem",
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
