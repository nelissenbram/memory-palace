"use client";
import { useMemo, useCallback, useEffect, useState } from "react";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useRoomStore } from "@/lib/stores/roomStore";
import { useMemoryStore } from "@/lib/stores/memoryStore";
import { usePalaceStore } from "@/lib/stores/palaceStore";
import { useUserStore } from "@/lib/stores/userStore";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { ROOM_MEMS } from "@/lib/constants/defaults";
import { WINGS } from "@/lib/constants/wings";
import type { Mem } from "@/lib/constants/defaults";
import type { Wing, WingRoom } from "@/lib/constants/wings";
import Image from "next/image";

/* ═══════════════════════════════════════════════════════════
   CSS KEYFRAMES — injected once via <style>
   ═══════════════════════════════════════════════════════════ */
const KEYFRAMES = `
@keyframes homeSlideUp {
  from { opacity: 0; transform: translateY(1.5rem); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes homeFadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes homeScaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes homeShimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
@keyframes homePulseGlow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(212,175,55,0); }
  50%      { box-shadow: 0 0 1.5rem 0.25rem rgba(212,175,55,0.12); }
}
@keyframes homeFloat {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-0.375rem); }
}
`;

/* ═══════════════════════════════════════════════════════════
   TYPE ICONS (same as LibraryView)
   ═══════════════════════════════════════════════════════════ */
const TYPE_ICONS: Record<string, string> = {
  photo: "\u{1F5BC}\uFE0F", video: "\u{1F3AC}", album: "\u{1F4D6}",
  orb: "\u{1F52E}", case: "\u{1F3FA}", voice: "\u{1F399}\uFE0F",
  document: "\u{1F4DC}", audio: "\u{1F3B5}", painting: "\u{1F3A8}",
};

/* ═══════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════ */

function formatDateLuxury(locale: string): string {
  const now = new Date();
  try {
    const opts: Intl.DateTimeFormatOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    return new Intl.DateTimeFormat(locale === "nl" ? "nl-NL" : "en-US", opts).format(now);
  } catch {
    return now.toLocaleDateString();
  }
}

function getTimeGreeting(t: (key: string) => string): string {
  const h = new Date().getHours();
  if (h < 12) return t("goodMorning");
  if (h < 18) return t("goodAfternoon");
  return t("goodEvening");
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */
export default function HomeView() {
  const isMobile = useIsMobile();
  const { t, locale } = useTranslation("home");
  const { userName } = useUserStore();
  const { setNavMode, enterCorridor } = usePalaceStore();
  const { getWings, getWingRooms } = useRoomStore();
  const { userMems, fetchRoomMemories } = useMemoryStore();

  const wings = getWings();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Prefetch all memories
  useEffect(() => {
    for (const w of wings) {
      for (const r of getWingRooms(w.id)) {
        fetchRoomMemories(r.id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Get all memories across all wings
  const allMemories = useMemo(() => {
    const result: { mem: Mem; wing: Wing; room: WingRoom }[] = [];
    for (const w of wings) {
      for (const r of getWingRooms(w.id)) {
        const mems = userMems[r.id] || ROOM_MEMS[r.id] || [];
        for (const m of mems) {
          result.push({ mem: m, wing: w, room: r });
        }
      }
    }
    return result;
  }, [wings, getWingRooms, userMems]);

  // Recent 8 memories sorted by createdAt
  const recentMemories = useMemo(() => {
    return [...allMemories]
      .sort((a, b) => {
        const da = a.mem.createdAt ? new Date(a.mem.createdAt).getTime() : 0;
        const db = b.mem.createdAt ? new Date(b.mem.createdAt).getTime() : 0;
        return db - da;
      })
      .slice(0, 8);
  }, [allMemories]);

  // Stats
  const totalMemories = allMemories.length;
  const wingsUsed = useMemo(() => {
    const used = new Set<string>();
    for (const { wing } of allMemories) used.add(wing.id);
    return used.size;
  }, [allMemories]);
  const totalRooms = useMemo(() => {
    let count = 0;
    for (const w of wings) count += getWingRooms(w.id).length;
    return count;
  }, [wings, getWingRooms]);
  const sharedRooms = useMemo(() => {
    let count = 0;
    for (const w of wings) {
      for (const r of getWingRooms(w.id)) {
        if (r.shared) count++;
      }
    }
    return count;
  }, [wings, getWingRooms]);

  // "On this day" — memories from today's date in previous years
  const onThisDayMemories = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const day = now.getDate();
    const year = now.getFullYear();
    return allMemories.filter(({ mem }) => {
      if (!mem.createdAt) return false;
      const d = new Date(mem.createdAt);
      return d.getMonth() === month && d.getDate() === day && d.getFullYear() !== year;
    });
  }, [allMemories]);

  // Wing memory counts for cards
  const wingMemCount = useCallback((wingId: string) => {
    return getWingRooms(wingId).reduce((sum, r) => sum + (userMems[r.id] || ROOM_MEMS[r.id] || []).length, 0);
  }, [getWingRooms, userMems]);

  const handleNavigateToMemory = useCallback((wingId: string, roomId: string) => {
    setNavMode("library");
  }, [setNavMode]);

  const displayName = userName || t("guest");
  const dateStr = formatDateLuxury(locale);
  const greeting = getTimeGreeting(t);

  const animDelay = (i: number) => `${0.1 + i * 0.08}s`;

  return (
    <div style={{
      width: "100vw",
      height: "100dvh",
      overflow: "auto",
      background: `linear-gradient(175deg, ${T.color.linen} 0%, ${T.color.warmStone} 40%, ${T.color.cream} 100%)`,
      fontFamily: T.font.body,
    }}>
      <style>{KEYFRAMES}</style>

      {/* ═══ SCROLLABLE CONTENT ═══ */}
      <div style={{
        maxWidth: "72rem",
        margin: "0 auto",
        padding: isMobile ? "1.5rem 1rem 3rem" : "2.5rem 2rem 4rem",
      }}>

        {/* ── 1. HERO SECTION ── */}
        <section style={{
          textAlign: "center",
          padding: isMobile ? "2rem 0.5rem 1.5rem" : "3rem 1rem 2rem",
          animation: mounted ? "homeFadeIn 0.8s ease both" : "none",
        }}>
          <p style={{
            fontFamily: T.font.body,
            fontSize: "0.8125rem",
            color: T.color.muted,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginBottom: "0.5rem",
          }}>
            {dateStr}
          </p>
          <h1 style={{
            fontFamily: T.font.display,
            fontSize: isMobile ? "2rem" : "3rem",
            fontWeight: 300,
            color: T.color.charcoal,
            lineHeight: 1.2,
            margin: 0,
            letterSpacing: "-0.01em",
          }}>
            {greeting}, <span style={{ fontWeight: 600 }}>{displayName}</span>
          </h1>
          <p style={{
            fontFamily: T.font.display,
            fontSize: isMobile ? "1rem" : "1.25rem",
            fontWeight: 300,
            fontStyle: "italic",
            color: T.color.walnut,
            marginTop: "0.75rem",
            opacity: 0.8,
          }}>
            {t("tagline")}
          </p>

          {/* Decorative divider */}
          <div style={{
            width: "3rem",
            height: "0.0625rem",
            background: `linear-gradient(90deg, transparent, ${T.color.gold}, transparent)`,
            margin: "1.5rem auto 0",
          }} />
        </section>

        {/* ── 2. TWO MAIN NAVIGATION CARDS ── */}
        <section style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
          gap: isMobile ? "1rem" : "1.5rem",
          marginTop: isMobile ? "1rem" : "1.5rem",
          animation: mounted ? "homeSlideUp 0.7s ease 0.15s both" : "none",
        }}>
          {/* Library Card */}
          <button
            onClick={() => setNavMode("library")}
            style={{
              all: "unset",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              borderRadius: "1rem",
              overflow: "hidden",
              background: `rgba(255,255,255,0.55)`,
              backdropFilter: "blur(1.5rem)",
              WebkitBackdropFilter: "blur(1.5rem)",
              border: `0.0625rem solid rgba(255,255,255,0.7)`,
              boxShadow: "0 0.25rem 2rem rgba(44,44,42,0.06)",
              transition: "transform 0.3s ease, box-shadow 0.3s ease",
              minHeight: isMobile ? "10rem" : "14rem",
              position: "relative",
              boxSizing: "border-box",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = "translateY(-0.25rem)";
              e.currentTarget.style.boxShadow = "0 0.75rem 3rem rgba(44,44,42,0.1)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 0.25rem 2rem rgba(44,44,42,0.06)";
            }}
          >
            {/* Card inner */}
            <div style={{ padding: isMobile ? "1.25rem" : "1.75rem", flex: 1, display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.75rem" }}>
                <span style={{
                  width: "2.5rem", height: "2.5rem", borderRadius: "0.75rem",
                  background: `linear-gradient(135deg, ${T.color.terracotta}, ${T.color.walnut})`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "1.25rem", flexShrink: 0,
                }}>
                  {"\u{1F4DA}"}
                </span>
                <div>
                  <h2 style={{
                    fontFamily: T.font.display, fontSize: isMobile ? "1.25rem" : "1.5rem",
                    fontWeight: 600, color: T.color.charcoal, margin: 0, textAlign: "left",
                  }}>
                    {t("libraryTitle")}
                  </h2>
                  <p style={{
                    fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.muted,
                    margin: 0, textAlign: "left",
                  }}>
                    {t("librarySubtitle")}
                  </p>
                </div>
              </div>

              {/* Mini stats preview */}
              <div style={{
                display: "flex", gap: "1rem", marginTop: "auto",
                paddingTop: "0.75rem", borderTop: `0.0625rem solid rgba(44,44,42,0.06)`,
              }}>
                <div>
                  <span style={{
                    fontFamily: T.font.display, fontSize: "1.25rem", fontWeight: 700,
                    color: T.color.charcoal,
                  }}>
                    {totalMemories}
                  </span>
                  <span style={{
                    fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.muted,
                    display: "block",
                  }}>
                    {t("memories")}
                  </span>
                </div>
                <div>
                  <span style={{
                    fontFamily: T.font.display, fontSize: "1.25rem", fontWeight: 700,
                    color: T.color.charcoal,
                  }}>
                    {wings.filter(w => w.id !== "attic").length}
                  </span>
                  <span style={{
                    fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.muted,
                    display: "block",
                  }}>
                    {t("wings")}
                  </span>
                </div>
                <div>
                  <span style={{
                    fontFamily: T.font.display, fontSize: "1.25rem", fontWeight: 700,
                    color: T.color.charcoal,
                  }}>
                    {totalRooms}
                  </span>
                  <span style={{
                    fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.muted,
                    display: "block",
                  }}>
                    {t("rooms")}
                  </span>
                </div>
              </div>

              {/* Recent thumbnails strip */}
              {recentMemories.length > 0 && (
                <div style={{
                  display: "flex", gap: "0.375rem", marginTop: "0.75rem", overflow: "hidden",
                }}>
                  {recentMemories.slice(0, 5).map(({ mem }, i) => (
                    <div key={mem.id} style={{
                      width: "2.5rem", height: "2.5rem", borderRadius: "0.5rem",
                      background: mem.dataUrl && !mem.dataUrl.startsWith("data:audio")
                        ? "transparent"
                        : `hsl(${mem.hue}, ${mem.s}%, ${mem.l}%)`,
                      overflow: "hidden", flexShrink: 0, position: "relative",
                      border: `0.0625rem solid rgba(255,255,255,0.8)`,
                    }}>
                      {mem.dataUrl && !mem.dataUrl.startsWith("data:audio") ? (
                        <Image src={mem.dataUrl} alt="" fill style={{ objectFit: "cover" }}
                          sizes="40px" unoptimized={mem.dataUrl.startsWith("data:")} />
                      ) : (
                        <span style={{
                          position: "absolute", inset: 0, display: "flex",
                          alignItems: "center", justifyContent: "center",
                          fontSize: "0.75rem", opacity: 0.7,
                        }}>
                          {TYPE_ICONS[mem.type] || ""}
                        </span>
                      )}
                    </div>
                  ))}
                  {recentMemories.length > 5 && (
                    <div style={{
                      width: "2.5rem", height: "2.5rem", borderRadius: "0.5rem",
                      background: T.color.cream, display: "flex",
                      alignItems: "center", justifyContent: "center",
                      fontSize: "0.6875rem", color: T.color.walnut, flexShrink: 0,
                      fontFamily: T.font.body, fontWeight: 600,
                    }}>
                      +{recentMemories.length - 5}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom accent bar */}
            <div style={{
              height: "0.1875rem",
              background: `linear-gradient(90deg, ${T.color.terracotta}, ${T.color.gold}, ${T.color.terracotta})`,
            }} />
          </button>

          {/* 3D Palace Card */}
          <button
            onClick={() => setNavMode("3d")}
            style={{
              all: "unset",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              borderRadius: "1rem",
              overflow: "hidden",
              background: `linear-gradient(135deg, ${T.color.charcoal} 0%, #3a3a38 50%, ${T.color.charcoal} 100%)`,
              border: `0.0625rem solid rgba(255,255,255,0.08)`,
              boxShadow: "0 0.25rem 2rem rgba(44,44,42,0.15)",
              transition: "transform 0.3s ease, box-shadow 0.3s ease",
              minHeight: isMobile ? "10rem" : "14rem",
              position: "relative",
              boxSizing: "border-box",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = "translateY(-0.25rem)";
              e.currentTarget.style.boxShadow = "0 0.75rem 3rem rgba(44,44,42,0.25)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 0.25rem 2rem rgba(44,44,42,0.15)";
            }}
          >
            {/* Palace illustration — CSS art */}
            <div style={{
              position: "absolute", top: 0, right: 0, bottom: 0, width: "50%",
              opacity: 0.08, overflow: "hidden", pointerEvents: "none",
            }}>
              {/* Columns */}
              <div style={{ position: "absolute", bottom: "1rem", left: "15%", width: "0.375rem", height: "60%", background: T.color.gold, borderRadius: "0.125rem" }} />
              <div style={{ position: "absolute", bottom: "1rem", left: "35%", width: "0.375rem", height: "60%", background: T.color.gold, borderRadius: "0.125rem" }} />
              <div style={{ position: "absolute", bottom: "1rem", left: "55%", width: "0.375rem", height: "60%", background: T.color.gold, borderRadius: "0.125rem" }} />
              <div style={{ position: "absolute", bottom: "1rem", left: "75%", width: "0.375rem", height: "60%", background: T.color.gold, borderRadius: "0.125rem" }} />
              {/* Pediment */}
              <div style={{
                position: "absolute", bottom: "60%", left: "5%", width: "80%", height: "0",
                borderLeft: "2rem solid transparent", borderRight: "2rem solid transparent",
                borderBottom: `2rem solid ${T.color.gold}`,
              }} />
            </div>

            <div style={{ padding: isMobile ? "1.25rem" : "1.75rem", flex: 1, display: "flex", flexDirection: "column", position: "relative", zIndex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.75rem" }}>
                <span style={{
                  width: "2.5rem", height: "2.5rem", borderRadius: "0.75rem",
                  background: `linear-gradient(135deg, ${T.color.gold}, ${T.color.goldDark})`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "1.25rem", flexShrink: 0,
                  animation: "homeFloat 4s ease-in-out infinite",
                }}>
                  {"\u{1F3DB}\uFE0F"}
                </span>
                <div>
                  <h2 style={{
                    fontFamily: T.font.display, fontSize: isMobile ? "1.25rem" : "1.5rem",
                    fontWeight: 600, color: T.color.linen, margin: 0, textAlign: "left",
                  }}>
                    {t("palaceTitle")}
                  </h2>
                  <p style={{
                    fontFamily: T.font.body, fontSize: "0.8125rem", color: `${T.color.sandstone}`,
                    margin: 0, textAlign: "left",
                  }}>
                    {t("palaceSubtitle")}
                  </p>
                </div>
              </div>

              {/* Palace wing preview */}
              <div style={{
                display: "flex", flexWrap: "wrap", gap: "0.5rem",
                marginTop: "auto", paddingTop: "0.75rem",
                borderTop: `0.0625rem solid rgba(255,255,255,0.08)`,
              }}>
                {wings.filter(w => w.id !== "attic").map(w => (
                  <span key={w.id} style={{
                    display: "inline-flex", alignItems: "center", gap: "0.25rem",
                    padding: "0.25rem 0.5rem", borderRadius: "0.375rem",
                    background: "rgba(255,255,255,0.06)",
                    fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.sandstone,
                  }}>
                    <span style={{ fontSize: "0.75rem" }}>{w.icon}</span>
                    {w.name}
                  </span>
                ))}
              </div>

              {/* Shimmer accent */}
              <div style={{
                marginTop: "0.75rem",
                height: "0.125rem", borderRadius: "0.0625rem",
                background: `linear-gradient(90deg, transparent 0%, ${T.color.gold}40 25%, ${T.color.gold} 50%, ${T.color.gold}40 75%, transparent 100%)`,
                backgroundSize: "200% 100%",
                animation: "homeShimmer 3s ease-in-out infinite",
              }} />
            </div>
          </button>
        </section>

        {/* ── 3. RECENT MEMORIES ROW ── */}
        {recentMemories.length > 0 && (
          <section style={{
            marginTop: isMobile ? "2rem" : "2.5rem",
            animation: mounted ? "homeSlideUp 0.7s ease 0.3s both" : "none",
          }}>
            <div style={{
              display: "flex", alignItems: "baseline", justifyContent: "space-between",
              marginBottom: "0.75rem",
            }}>
              <h3 style={{
                fontFamily: T.font.display, fontSize: isMobile ? "1.125rem" : "1.375rem",
                fontWeight: 600, color: T.color.charcoal, margin: 0,
              }}>
                {t("recentMemories")}
              </h3>
              <button
                onClick={() => setNavMode("library")}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.walnut,
                  padding: "0.25rem 0",
                  transition: "color 0.15s ease",
                }}
                onMouseEnter={e => { e.currentTarget.style.color = T.color.charcoal; }}
                onMouseLeave={e => { e.currentTarget.style.color = T.color.walnut; }}
              >
                {t("viewAll")} {"\u2192"}
              </button>
            </div>

            <div style={{
              display: "flex", gap: "0.875rem",
              overflowX: "auto", paddingBottom: "0.5rem",
              scrollSnapType: "x mandatory",
              msOverflowStyle: "none",
              scrollbarWidth: "none",
            }}>
              {recentMemories.map(({ mem, wing, room }, i) => {
                const hasImage = mem.dataUrl && !mem.dataUrl.startsWith("data:audio") && !mem.videoBlob;
                return (
                  <div
                    key={mem.id}
                    onClick={() => handleNavigateToMemory(wing.id, room.id)}
                    style={{
                      minWidth: isMobile ? "9rem" : "11rem",
                      maxWidth: isMobile ? "9rem" : "11rem",
                      borderRadius: "0.75rem",
                      overflow: "hidden",
                      background: "rgba(255,255,255,0.7)",
                      backdropFilter: "blur(0.5rem)",
                      border: `0.0625rem solid rgba(255,255,255,0.8)`,
                      boxShadow: "0 0.125rem 0.75rem rgba(44,44,42,0.04)",
                      cursor: "pointer",
                      transition: "transform 0.2s ease, box-shadow 0.2s ease",
                      scrollSnapAlign: "start",
                      animation: mounted ? `homeScaleIn 0.5s ease ${animDelay(i)} both` : "none",
                      flexShrink: 0,
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = "translateY(-0.125rem) scale(1.02)";
                      e.currentTarget.style.boxShadow = "0 0.375rem 1.25rem rgba(44,44,42,0.08)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = "translateY(0) scale(1)";
                      e.currentTarget.style.boxShadow = "0 0.125rem 0.75rem rgba(44,44,42,0.04)";
                    }}
                  >
                    {/* Thumbnail */}
                    <div style={{
                      height: "7rem", position: "relative", overflow: "hidden",
                      background: hasImage ? "transparent" : `hsl(${mem.hue}, ${mem.s}%, ${mem.l}%)`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {hasImage ? (
                        <Image src={mem.dataUrl!} alt={mem.title} fill
                          style={{ objectFit: "cover" }} sizes="180px"
                          unoptimized={mem.dataUrl!.startsWith("data:")} />
                      ) : (
                        <span style={{ fontSize: "1.5rem", opacity: 0.6 }}>
                          {TYPE_ICONS[mem.type] || "\u{1F4C4}"}
                        </span>
                      )}
                    </div>
                    {/* Info */}
                    <div style={{ padding: "0.5rem 0.625rem" }}>
                      <p style={{
                        fontFamily: T.font.display, fontSize: "0.8125rem", fontWeight: 600,
                        color: T.color.charcoal, margin: 0,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {mem.title}
                      </p>
                      <p style={{
                        fontFamily: T.font.body, fontSize: "0.625rem", color: T.color.muted,
                        margin: "0.125rem 0 0",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {wing.icon} {wing.name} / {room.icon} {room.name}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── 4. QUICK STATS ── */}
        <section style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
          gap: "0.875rem",
          marginTop: isMobile ? "2rem" : "2.5rem",
          animation: mounted ? "homeSlideUp 0.7s ease 0.45s both" : "none",
        }}>
          {[
            { value: totalMemories, label: t("statMemories"), icon: "\u2728" },
            { value: wingsUsed, label: t("statWings"), icon: "\u{1F3DB}\uFE0F" },
            { value: totalRooms, label: t("statRooms"), icon: "\u{1F6AA}" },
            { value: sharedRooms, label: t("statShared"), icon: "\u{1F91D}" },
          ].map((stat, i) => (
            <div key={stat.label} style={{
              borderRadius: "0.75rem",
              padding: isMobile ? "1rem" : "1.25rem",
              background: "rgba(255,255,255,0.5)",
              backdropFilter: "blur(0.75rem)",
              border: `0.0625rem solid rgba(255,255,255,0.6)`,
              boxShadow: "0 0.0625rem 0.5rem rgba(44,44,42,0.03)",
              textAlign: "center",
              transition: "transform 0.2s ease",
              animation: mounted ? `homeScaleIn 0.4s ease ${animDelay(i + 4)} both` : "none",
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.03)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
            >
              <span style={{ fontSize: "1.25rem", display: "block", marginBottom: "0.25rem" }}>
                {stat.icon}
              </span>
              <span style={{
                fontFamily: T.font.display, fontSize: isMobile ? "1.5rem" : "2rem",
                fontWeight: 700, color: T.color.gold,
                display: "block", lineHeight: 1.1,
              }}>
                {stat.value}
              </span>
              <span style={{
                fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.walnut,
                display: "block", marginTop: "0.25rem",
                letterSpacing: "0.03em",
              }}>
                {stat.label}
              </span>
            </div>
          ))}
        </section>

        {/* ── 5. ON THIS DAY TEASER ── */}
        {onThisDayMemories.length > 0 && (
          <section style={{
            marginTop: isMobile ? "2rem" : "2.5rem",
            borderRadius: "1rem",
            padding: isMobile ? "1.25rem" : "1.5rem",
            background: `linear-gradient(135deg, rgba(212,175,55,0.06) 0%, rgba(212,175,55,0.02) 100%)`,
            border: `0.0625rem solid ${T.color.gold}20`,
            animation: mounted ? "homeSlideUp 0.7s ease 0.6s both, homePulseGlow 4s ease-in-out 1.5s infinite" : "none",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
              <span style={{ fontSize: "1.25rem" }}>{"\u{1F4C5}"}</span>
              <h3 style={{
                fontFamily: T.font.display, fontSize: isMobile ? "1.125rem" : "1.25rem",
                fontWeight: 600, color: T.color.charcoal, margin: 0,
              }}>
                {t("onThisDay")}
              </h3>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", overflowX: "auto", paddingBottom: "0.25rem" }}>
              {onThisDayMemories.slice(0, 4).map(({ mem, wing, room }) => {
                const year = mem.createdAt ? new Date(mem.createdAt).getFullYear() : "";
                return (
                  <div
                    key={mem.id}
                    onClick={() => handleNavigateToMemory(wing.id, room.id)}
                    style={{
                      minWidth: "8rem",
                      padding: "0.75rem",
                      borderRadius: "0.625rem",
                      background: "rgba(255,255,255,0.6)",
                      border: `0.0625rem solid rgba(212,175,55,0.15)`,
                      cursor: "pointer",
                      flexShrink: 0,
                      transition: "transform 0.15s ease",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.03)"; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
                  >
                    <span style={{
                      fontFamily: T.font.display, fontSize: "0.6875rem",
                      color: T.color.gold, fontWeight: 600,
                    }}>
                      {year}
                    </span>
                    <p style={{
                      fontFamily: T.font.display, fontSize: "0.8125rem", fontWeight: 600,
                      color: T.color.charcoal, margin: "0.25rem 0 0",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {mem.title}
                    </p>
                    <p style={{
                      fontFamily: T.font.body, fontSize: "0.625rem", color: T.color.muted,
                      margin: "0.125rem 0 0",
                    }}>
                      {wing.icon} {wing.name}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── 6. FOOTER HINT ── */}
        <div style={{
          textAlign: "center",
          marginTop: "2.5rem",
          animation: mounted ? "homeFadeIn 1s ease 0.8s both" : "none",
        }}>
          <p style={{
            fontFamily: T.font.body, fontSize: "0.75rem",
            color: T.color.muted, opacity: 0.6,
          }}>
            {t("footerHint")}
          </p>
        </div>
      </div>
    </div>
  );
}
