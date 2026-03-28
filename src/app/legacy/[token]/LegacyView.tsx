"use client";

import { useTranslation } from "@/lib/hooks/useTranslation";

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

  if (data.error === "not_found" || data.error === "not_configured") {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.iconLarge}>&#x1F3DB;&#xFE0F;</div>
          <h1 style={styles.title}>{t("linkNotFound")}</h1>
          <p style={styles.subtitle}>
            {t("linkNotFoundDesc")}
          </p>
        </div>
      </div>
    );
  }

  if (data.error === "expired") {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.iconLarge}>&#x1F3DB;&#xFE0F;</div>
          <h1 style={styles.title}>{t("linkExpired")}</h1>
          <p style={styles.subtitle}>
            {t("linkExpiredDesc")}
          </p>
        </div>
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
        <div style={styles.iconLarge}>&#x1F3DB;&#xFE0F;</div>
        <h1 style={styles.headerTitle}>
          {t("memoriesFrom", { name: senderName })}
        </h1>
        <p style={styles.headerSubtitle}>
          {t("greeting", { contact: contactName, sender: senderName })}
        </p>
      </header>

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
          <div key={wing.id} style={styles.wingSection}>
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
                      <div key={memory.id} style={styles.memoryCard}>
                        {memory.media_url && memory.media_type?.startsWith("image") && (
                          <div style={styles.mediaContainer}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={memory.media_url}
                              alt={memory.title}
                              style={styles.mediaImage}
                            />
                          </div>
                        )}
                        {memory.media_url && memory.media_type?.startsWith("video") && (
                          <div style={styles.mediaContainer}>
                            <video
                              src={memory.media_url}
                              controls
                              style={styles.mediaImage}
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
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      {memories.length === 0 && (
        <div style={styles.card}>
          <p style={styles.subtitle}>
            {t("noMemories")}
          </p>
        </div>
      )}

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
    </div>
  );
}

// ── Inline styles matching the app's design system ──

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#FAFAF7",
    fontFamily: "'Georgia', serif",
    padding: "0 0 3.75rem",
  },
  header: {
    background: "linear-gradient(135deg, #C17F59 0%, #8B7355 100%)",
    padding: "3.75rem 1.5rem 3rem",
    textAlign: "center",
  },
  iconLarge: {
    fontSize: "3rem",
    marginBottom: "1rem",
    textAlign: "center" as const,
  },
  headerTitle: {
    margin: "0 0 0.5rem",
    fontSize: "1.75rem",
    fontWeight: 400,
    color: "#FFFFFF",
    lineHeight: 1.3,
  },
  headerSubtitle: {
    margin: 0,
    fontSize: "1rem",
    color: "#FFFFFF",
    opacity: 0.85,
    lineHeight: 1.5,
  },
  card: {
    maxWidth: "40rem",
    margin: "2rem auto",
    padding: "2rem",
    backgroundColor: "#FFFFFF",
    borderRadius: "1.25rem",
    border: "1px solid #EEEAE3",
    boxShadow: "0 4px 24px rgba(44,44,42,0.08)",
    textAlign: "center" as const,
  },
  title: {
    margin: "1rem 0 0.5rem",
    fontSize: "1.5rem",
    fontWeight: 600,
    color: "#2C2C2A",
  },
  subtitle: {
    margin: "0.5rem 0 0",
    fontSize: "0.9375rem",
    color: "#8B7355",
    lineHeight: 1.7,
  },
  messageSubject: {
    margin: "0 0 0.75rem",
    fontSize: "1.25rem",
    fontWeight: 600,
    color: "#2C2C2A",
    textAlign: "left" as const,
  },
  messageBody: {
    margin: 0,
    fontSize: "1rem",
    color: "#2C2C2A",
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
    fontWeight: 600,
    color: "#2C2C2A",
  },
  wingDescription: {
    margin: "0 0 1.25rem",
    fontSize: "0.875rem",
    color: "#9A9183",
    lineHeight: 1.5,
  },
  roomSection: {
    marginBottom: "2rem",
  },
  roomTitle: {
    margin: "0 0 0.25rem",
    fontSize: "1.125rem",
    fontWeight: 600,
    color: "#8B7355",
  },
  roomDescription: {
    margin: "0 0 1rem",
    fontSize: "0.875rem",
    color: "#9A9183",
    lineHeight: 1.5,
  },
  memoriesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "1.25rem",
  },
  memoryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: "1rem",
    border: "1px solid #EEEAE3",
    overflow: "hidden",
    boxShadow: "0 2px 12px rgba(44,44,42,0.06)",
  },
  mediaContainer: {
    width: "100%",
    aspectRatio: "4/3",
    overflow: "hidden",
    backgroundColor: "#F0EDE8",
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
    color: "#2C2C2A",
    lineHeight: 1.4,
  },
  memoryDescription: {
    margin: "0 0 0.5rem",
    fontSize: "0.875rem",
    color: "#8B7355",
    lineHeight: 1.5,
  },
  memoryDate: {
    margin: 0,
    fontSize: "0.75rem",
    color: "#D4C5B2",
  },
  footer: {
    maxWidth: "40rem",
    margin: "3rem auto 0",
    padding: "1.5rem",
    textAlign: "center" as const,
    borderTop: "1px solid #EEEAE3",
  },
  footerText: {
    margin: "0 0 0.25rem",
    fontSize: "0.8125rem",
    color: "#9A9183",
  },
  footerExpiry: {
    margin: 0,
    fontSize: "0.6875rem",
    color: "#D4C5B2",
  },
};
