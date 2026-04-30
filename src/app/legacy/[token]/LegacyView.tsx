"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "@/lib/hooks/useTranslation";
import Image from "next/image";

interface Memory {
  id: string;
  title: string;
  description: string | null;
  room_id: string;
  media_url: string | null;
  media_type: string | null;
  created_at: string;
}

interface Room {
  id: string;
  name: string;
  wing_id: string;
  description: string | null;
}

interface Wing {
  id: string;
  name: string;
  description: string | null;
}

interface LegacyData {
  error: "not_configured" | "not_found" | "expired" | null;
  senderName?: string;
  contactName?: string;
  message?: { subject: string; message_body: string } | null;
  wings?: Wing[];
  rooms?: Room[];
  memories?: Memory[];
  expiresAt?: string;
}

export default function LegacyView({ data }: { data: LegacyData }) {
  const { t, locale } = useTranslation("legacyView");

  // Back-to-top button visibility
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 500);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  if (data.error === "not_found" || data.error === "not_configured") {
    return (
      <div style={styles.container}>
        <main>
          <div style={styles.card}>
            <div style={styles.iconLarge} aria-label={t("memoryPalaceIcon")}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 9L12 4L21 9" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                <line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                <line x1="6" y1="9.5" x2="6" y2="19" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                <line x1="12" y1="9.5" x2="12" y2="19" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" opacity={0.6} />
                <line x1="18" y1="9.5" x2="18" y2="19" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                <line x1="2" y1="20" x2="22" y2="20" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 style={styles.title}>{t("linkNotFound")}</h1>
            <p style={styles.subtitle}>
              {t("linkNotFoundDesc")}
            </p>
            <div style={styles.actionLinks}>
              <a href="https://thememorypalace.ai" style={styles.actionLink}>
                {t("linkNotFoundHome")}
              </a>
              <a href="https://thememorypalace.ai/about" style={styles.actionLinkSecondary}>
                {t("linkNotFoundAction")}
              </a>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (data.error === "expired") {
    return (
      <div style={styles.container}>
        <main>
          <div style={styles.card}>
            <div style={styles.iconLarge} aria-label={t("memoryPalaceIcon")}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 9L12 4L21 9" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                <line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                <line x1="6" y1="9.5" x2="6" y2="19" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                <line x1="12" y1="9.5" x2="12" y2="19" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" opacity={0.6} />
                <line x1="18" y1="9.5" x2="18" y2="19" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                <line x1="2" y1="20" x2="22" y2="20" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 style={styles.title}>{t("linkExpired")}</h1>
            <p style={styles.subtitle}>
              {t("linkExpiredDesc")}
            </p>
            <div style={styles.actionLinks}>
              <a href="https://thememorypalace.ai" style={styles.actionLink}>
                {t("linkExpiredHome")}
              </a>
              <a href="https://thememorypalace.ai/about" style={styles.actionLinkSecondary}>
                {t("linkExpiredAction")}
              </a>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const {
    senderName = t("someoneFallback"),
    contactName = t("friendFallback"),
    message,
    wings = [],
    rooms = [],
    memories = [],
    expiresAt,
  } = data;

  // Group memories by room, rooms by wing
  const memoriesByRoom = new Map<string, Memory[]>();
  for (const mem of memories) {
    if (!memoriesByRoom.has(mem.room_id)) memoriesByRoom.set(mem.room_id, []);
    memoriesByRoom.get(mem.room_id)!.push(mem);
  }

  const roomsByWing = new Map<string, Room[]>();
  for (const room of rooms) {
    if (!roomsByWing.has(room.wing_id)) roomsByWing.set(room.wing_id, []);
    roomsByWing.get(room.wing_id)!.push(room);
  }

  const expiresDate = expiresAt
    ? new Date(expiresAt).toLocaleDateString(locale, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={{ ...styles.iconLarge, color: LT.color.white }} aria-label={t("memoryPalaceIcon")}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 9L12 4L21 9" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                <line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                <line x1="6" y1="9.5" x2="6" y2="19" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                <line x1="12" y1="9.5" x2="12" y2="19" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" opacity={0.6} />
                <line x1="18" y1="9.5" x2="18" y2="19" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                <line x1="2" y1="20" x2="22" y2="20" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
        <h1 style={styles.headerTitle}>
          {t("memoriesFrom", { name: senderName })}
        </h1>
        <p style={styles.headerSubtitle}>
          {t("greeting", { contact: contactName, sender: senderName })}
        </p>
      </header>

      {/* Expiry banner */}
      {expiresDate && (
        <div style={styles.expiryBanner}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }} aria-hidden="true">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12 7V12L15 14" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>{t("expiryBanner", { date: expiresDate })}</span>
        </div>
      )}

      <main>
        {/* Intro explanation for outsiders */}
        <div style={styles.card}>
          <p style={styles.introText}>
            {t("introExplanation", { sender: senderName })}
          </p>
        </div>

        {/* Message */}
        {message && (message.subject || message.message_body) && (
          <div style={styles.card}>
            {message.subject && (
              <h2 style={styles.messageSubject}>{message.subject}</h2>
            )}
            {message.message_body && (
              <p style={styles.messageBody}>{message.message_body}</p>
            )}
          </div>
        )}

        {/* Memories organized by wing/room */}
        {wings.map((wing) => {
          const wingRooms = roomsByWing.get(wing.id) || [];
          if (wingRooms.length === 0) return null;

          return (
            <section key={wing.id} style={styles.wingSection}>
              <h2 style={styles.wingTitle}>{wing.name}</h2>
              {wing.description && (
                <p style={styles.wingDescription}>{wing.description}</p>
              )}

              {wingRooms.map((room) => {
                const roomMemories = memoriesByRoom.get(room.id) || [];
                if (roomMemories.length === 0) return null;

                return (
                  <div key={room.id} style={styles.roomSection}>
                    <h3 style={styles.roomTitle}>{room.name}</h3>
                    {room.description && (
                      <p style={styles.roomDescription}>{room.description}</p>
                    )}

                    <div style={styles.memoriesGrid}>
                      {roomMemories.map((memory) => (
                        <article key={memory.id} style={styles.memoryCard}>
                          {memory.media_url && memory.media_type?.startsWith("image") && (
                            <div style={styles.mediaContainer}>
                              <Image
                                src={memory.media_url}
                                alt={memory.title}
                                fill sizes="(max-width: 768px) 100vw, 400px"
                                style={{ objectFit: "cover" }}
                              />
                            </div>
                          )}
                          {memory.media_url && memory.media_type?.startsWith("video") && (
                            <div style={styles.mediaContainer}>
                              <video
                                src={memory.media_url}
                                controls
                                preload="metadata"
                                aria-label={t("videoMemory", { title: memory.title })}
                                style={styles.mediaImage}
                              />
                            </div>
                          )}
                          {memory.media_url && memory.media_type?.startsWith("audio") && (
                            <div style={styles.audioContainer}>
                              <audio
                                src={memory.media_url}
                                controls
                                preload="none"
                                aria-label={t("audioMemory", { title: memory.title })}
                                style={styles.audioElement}
                              />
                            </div>
                          )}
                          <div style={styles.memoryContent}>
                            <h4 style={styles.memoryTitle}>{memory.title}</h4>
                            {memory.description && (
                              <p style={styles.memoryDescription}>
                                {memory.description}
                              </p>
                            )}
                            <p style={styles.memoryDate}>
                              {new Date(memory.created_at).toLocaleDateString(
                                locale,
                                {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                }
                              )}
                            </p>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                );
              })}
            </section>
          );
        })}

        {memories.length === 0 && (
          <div style={styles.card}>
            <p style={styles.subtitle}>
              {t("noMemories")}
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        <p style={styles.footerText}>
          {t("tagline")}
        </p>
        {expiresDate && (
          <p style={styles.footerExpiry}>
            {t("expiresOn", { date: expiresDate })}
          </p>
        )}
      </footer>

      {/* Back to top */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          aria-label={t("backToTop")}
          style={styles.backToTop}
        >
          <span aria-hidden="true">&#x25B2;</span>
        </button>
      )}
    </div>
  );
}

// ── Local theme tokens (public page — no ThemeProvider) ──

const LT = {
  color: {
    linen: "#FAFAF7",
    white: "#FFFFFF",
    cream: "#EEEAE3",
    sand: "#F5F0EA",
    sandstone: "#F0EDE8",
    charcoal: "#2C2C2A",
    walnut: "#8B7355",
    terracotta: "#C17F59",
    muted: "#9A9183",
    faded: "#D4C5B2",
  },
  font: {
    display: "'Cormorant Garamond', Georgia, serif",
    body: "'Source Sans 3', 'Segoe UI', system-ui, sans-serif",
  },
} as const;

// ── Inline styles matching the app's design system ──

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    backgroundColor: LT.color.linen,
    fontFamily: LT.font.body,
    padding: "0 0 3.75rem",
  },
  header: {
    background: `linear-gradient(135deg, ${LT.color.terracotta} 0%, ${LT.color.walnut} 100%)`,
    padding: "3.75rem 1.5rem 3rem",
    textAlign: "center",
  },
  iconLarge: {
    marginBottom: "1rem",
    textAlign: "center" as const,
    display: "flex",
    justifyContent: "center",
    color: LT.color.walnut,
  },
  headerTitle: {
    margin: "0 0 0.5rem",
    fontSize: "1.75rem",
    fontFamily: LT.font.display,
    fontWeight: 400,
    color: LT.color.white,
    lineHeight: 1.3,
  },
  headerSubtitle: {
    margin: 0,
    fontSize: "1rem",
    color: LT.color.white,
    opacity: 0.85,
    lineHeight: 1.5,
  },
  card: {
    maxWidth: "40rem",
    margin: "2rem auto",
    padding: "2rem",
    backgroundColor: LT.color.white,
    borderRadius: "1.25rem",
    border: `1px solid ${LT.color.cream}`,
    boxShadow: "0 4px 24px rgba(44,44,42,0.08)",
    textAlign: "center" as const,
  },
  title: {
    margin: "1rem 0 0.5rem",
    fontSize: "1.5rem",
    fontFamily: LT.font.display,
    fontWeight: 600,
    color: LT.color.charcoal,
  },
  subtitle: {
    margin: "0.5rem 0 0",
    fontSize: "0.9375rem",
    color: LT.color.walnut,
    lineHeight: 1.7,
  },
  introText: {
    margin: 0,
    fontSize: "0.9375rem",
    color: LT.color.walnut,
    lineHeight: 1.7,
    fontStyle: "italic",
  },
  actionLinks: {
    marginTop: "1.5rem",
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.75rem",
    alignItems: "center",
  },
  actionLink: {
    display: "inline-block",
    padding: "0.75rem 1.5rem",
    borderRadius: "0.75rem",
    background: `linear-gradient(135deg, ${LT.color.terracotta}, ${LT.color.walnut})`,
    color: LT.color.white,
    fontSize: "0.9375rem",
    fontWeight: 600,
    textDecoration: "none",
    transition: "opacity .2s",
  },
  actionLinkSecondary: {
    display: "inline-block",
    fontSize: "0.875rem",
    color: LT.color.walnut,
    textDecoration: "underline",
    textUnderlineOffset: "0.1875rem",
  },
  messageSubject: {
    margin: "0 0 0.75rem",
    fontSize: "1.25rem",
    fontFamily: LT.font.display,
    fontWeight: 600,
    color: LT.color.charcoal,
    textAlign: "left" as const,
  },
  messageBody: {
    margin: 0,
    fontSize: "1rem",
    color: LT.color.charcoal,
    lineHeight: 1.7,
    textAlign: "left" as const,
    whiteSpace: "pre-wrap" as const,
  },
  wingSection: {
    maxWidth: "56.25rem",
    margin: "2.5rem auto 0",
    padding: "0 1.5rem",
  },
  wingTitle: {
    margin: "0 0 0.25rem",
    fontSize: "1.375rem",
    fontFamily: LT.font.display,
    fontWeight: 600,
    color: LT.color.charcoal,
  },
  wingDescription: {
    margin: "0 0 1.25rem",
    fontSize: "0.875rem",
    color: LT.color.muted,
    lineHeight: 1.5,
  },
  roomSection: {
    marginBottom: "2rem",
  },
  roomTitle: {
    margin: "0 0 0.25rem",
    fontSize: "1.125rem",
    fontFamily: LT.font.display,
    fontWeight: 600,
    color: LT.color.walnut,
  },
  roomDescription: {
    margin: "0 0 1rem",
    fontSize: "0.875rem",
    color: LT.color.muted,
    lineHeight: 1.5,
  },
  memoriesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "1.25rem",
  },
  memoryCard: {
    backgroundColor: LT.color.white,
    borderRadius: "1rem",
    border: `1px solid ${LT.color.cream}`,
    overflow: "hidden",
    boxShadow: "0 2px 12px rgba(44,44,42,0.06)",
  },
  mediaContainer: {
    width: "100%",
    aspectRatio: "4/3",
    overflow: "hidden",
    backgroundColor: LT.color.sandstone,
    position: "relative" as const,
  },
  mediaImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover" as const,
    display: "block",
  },
  memoryContent: {
    padding: "1rem 1.25rem",
  },
  memoryTitle: {
    margin: "0 0 0.25rem",
    fontSize: "1rem",
    fontWeight: 600,
    color: LT.color.charcoal,
    lineHeight: 1.4,
  },
  memoryDescription: {
    margin: "0 0 0.5rem",
    fontSize: "0.875rem",
    color: LT.color.walnut,
    lineHeight: 1.5,
  },
  memoryDate: {
    margin: 0,
    fontSize: "0.75rem",
    color: LT.color.faded,
  },
  footer: {
    maxWidth: "40rem",
    margin: "3rem auto 0",
    padding: "1.5rem",
    textAlign: "center" as const,
    borderTop: `1px solid ${LT.color.cream}`,
  },
  footerText: {
    margin: "0 0 0.25rem",
    fontSize: "0.8125rem",
    color: LT.color.muted,
  },
  footerExpiry: {
    margin: 0,
    fontSize: "0.6875rem",
    color: LT.color.faded,
  },
  expiryBanner: {
    maxWidth: "40rem",
    margin: "0 auto",
    padding: "0.625rem 1.5rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    backgroundColor: LT.color.sand,
    borderBottom: `1px solid ${LT.color.cream}`,
    fontSize: "0.8125rem",
    color: LT.color.walnut,
    lineHeight: 1.5,
  },
  expiryBannerIcon: {
    /* SVG icon; no fontSize needed */
  },
  audioContainer: {
    width: "100%",
    padding: "1.25rem 1rem",
    backgroundColor: LT.color.charcoal,
    borderRadius: "0.5rem 0.5rem 0 0",
    boxSizing: "border-box" as const,
  },
  audioElement: {
    width: "100%",
    display: "block",
    borderRadius: "0.25rem",
  },
  backToTop: {
    position: "fixed" as const,
    bottom: "1.5rem",
    right: "1.5rem",
    width: "2.75rem",
    height: "2.75rem",
    borderRadius: "50%",
    border: `1px solid ${LT.color.cream}`,
    backgroundColor: LT.color.charcoal,
    color: LT.color.cream,
    fontSize: "0.875rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 2px 8px rgba(44,44,42,0.12)",
    transition: "opacity 0.2s",
    zIndex: 50,
  },
};
