"use client";
import { useState, useEffect, useMemo } from "react";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { ROOM_MEMS } from "@/lib/constants/defaults";
import type { Mem } from "@/lib/constants/defaults";
import { useMemoryStore } from "@/lib/stores/memoryStore";
import { useRoomStore } from "@/lib/stores/roomStore";
import Image from "next/image";

const LS_KEY = "mp_seen_reveals";
const LS_REMINDER_KEY = "mp_seen_res_reminders";

interface ResolutionReminder {
  mem: Mem;
  roomId: string;
  roomName: string;
  roomIcon: string;
  wingId: string;
  daysLeft: number;
}

interface RevealedMem {
  mem: Mem;
  roomId: string;
  roomName: string;
  roomIcon: string;
  wingId: string;
}

/** Read the set of memory IDs the user has already acknowledged. */
function getSeenReveals(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

/** Persist an updated set of seen reveal IDs. */
function markSeen(ids: string[]) {
  const current = getSeenReveals();
  for (const id of ids) current.add(id);
  localStorage.setItem(LS_KEY, JSON.stringify([...current]));
}

/** Read the set of resolution reminder IDs dismissed today. */
function getSeenReminders(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_REMINDER_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as { ids: string[]; date: string };
    // Reset daily so reminders reappear each day
    if (parsed.date !== new Date().toISOString().split("T")[0]) return new Set();
    return new Set(parsed.ids);
  } catch {
    return new Set();
  }
}

function markReminderSeen(ids: string[]) {
  const current = getSeenReminders();
  for (const id of ids) current.add(id);
  localStorage.setItem(LS_REMINDER_KEY, JSON.stringify({ ids: [...current], date: new Date().toISOString().split("T")[0] }));
}

/** Find resolutions with target dates within the next 7 days. */
function getUpcomingResolutions(
  allMems: Record<string, Mem[]>,
  getWings: () => { id: string; name: string }[],
  getWingRooms: (wingId: string) => { id: string; name: string; icon: string }[],
): ResolutionReminder[] {
  const todayMs = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const seen = getSeenReminders();
  const results: ResolutionReminder[] = [];

  const roomMap: Record<string, { roomName: string; roomIcon: string; wingId: string }> = {};
  for (const wing of getWings()) {
    for (const room of getWingRooms(wing.id)) {
      roomMap[room.id] = { roomName: room.name, roomIcon: room.icon, wingId: wing.id };
    }
  }

  for (const [roomId, mems] of Object.entries(allMems)) {
    for (const mem of mems) {
      if (!mem.resolution?.targetDate || !mem.resolution.reminders) continue;
      if (seen.has(mem.id)) continue;
      const targetMs = new Date(mem.resolution.targetDate + "T00:00:00").getTime();
      const diff = targetMs - todayMs;
      if (diff > 0 && diff <= sevenDaysMs) {
        const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
        const info = roomMap[roomId] || { roomName: roomId, roomIcon: "", wingId: "" };
        results.push({ mem, roomId, roomName: info.roomName, roomIcon: info.roomIcon, wingId: info.wingId, daysLeft });
      }
    }
  }
  return results;
}

/**
 * Scan all memories for time capsules whose revealDate <= today
 * that the user hasn't acknowledged yet.
 */
function getNewlyRevealed(
  allMems: Record<string, Mem[]>,
  getWings: () => { id: string; name: string }[],
  getWingRooms: (wingId: string) => { id: string; name: string; icon: string }[],
): RevealedMem[] {
  const todayStr = new Date().toISOString().split("T")[0];
  const seen = getSeenReveals();
  const results: RevealedMem[] = [];

  // Build roomId -> room info map
  const roomMap: Record<string, { roomName: string; roomIcon: string; wingId: string }> = {};
  for (const wing of getWings()) {
    for (const room of getWingRooms(wing.id)) {
      roomMap[room.id] = { roomName: room.name, roomIcon: room.icon, wingId: wing.id };
    }
  }

  for (const [roomId, mems] of Object.entries(allMems)) {
    for (const mem of mems) {
      if (!mem.revealDate) continue;
      // Capsule has opened (revealDate <= today) and user hasn't seen it yet
      if (mem.revealDate <= todayStr && !seen.has(mem.id)) {
        const info = roomMap[roomId] || { roomName: roomId, roomIcon: "", wingId: "" };
        results.push({
          mem,
          roomId,
          roomName: info.roomName,
          roomIcon: info.roomIcon,
          wingId: info.wingId,
        });
      }
    }
  }
  return results;
}

interface TimeCapsuleRevealProps {
  onNavigateToRoom: (wingId: string, roomId: string) => void;
}

export default function TimeCapsuleReveal({ onNavigateToRoom }: TimeCapsuleRevealProps) {
  const isMobile = useIsMobile();
  const { t } = useTranslation("timeCapsule");
  const { t: tc } = useTranslation("common");
  const { userMems } = useMemoryStore();
  const { getWings, getWingRooms } = useRoomStore();
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid flash
  const [visible, setVisible] = useState(false);
  const [reminderDismissed, setReminderDismissed] = useState(true);
  const [reminderVisible, setReminderVisible] = useState(false);

  // Merge userMems with ROOM_MEMS defaults
  const allMems = useMemo(() => {
    const merged: Record<string, Mem[]> = { ...ROOM_MEMS };
    for (const [k, v] of Object.entries(userMems)) {
      merged[k] = v;
    }
    return merged;
  }, [userMems]);

  const revealed = useMemo(
    () => getNewlyRevealed(allMems, getWings, getWingRooms),
    [allMems, getWings, getWingRooms],
  );

  const resolutionReminders = useMemo(
    () => getUpcomingResolutions(allMems, getWings, getWingRooms),
    [allMems, getWings, getWingRooms],
  );

  useEffect(() => {
    if (revealed.length > 0) {
      setDismissed(false);
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, [revealed.length]);

  useEffect(() => {
    if (resolutionReminders.length > 0 && dismissed) {
      setReminderDismissed(false);
      const t = setTimeout(() => setReminderVisible(true), 1200);
      return () => clearTimeout(t);
    }
  }, [resolutionReminders.length, dismissed]);

  const showReveals = !dismissed && revealed.length > 0;
  const showReminders = !reminderDismissed && resolutionReminders.length > 0;
  if (!showReveals && !showReminders) return null;

  const shown = revealed.slice(0, 3);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(() => {
      markSeen(revealed.map((r) => r.mem.id));
      setDismissed(true);
    }, 300);
  };

  const handleView = (r: RevealedMem) => {
    // Mark this one as seen immediately
    markSeen([r.mem.id]);
    onNavigateToRoom(r.wingId, r.roomId);
  };

  const handleDismissReminders = () => {
    setReminderVisible(false);
    setTimeout(() => {
      markReminderSeen(resolutionReminders.map((r) => r.mem.id));
      setReminderDismissed(true);
    }, 300);
  };

  return (
    <>
    {/* Atrium token: reduced-motion gate for card entrances + row hovers */}
    <style>{`@media (prefers-reduced-motion: reduce){ .tcr-anim { transition: none !important; } }`}</style>
    {/* Resolution reminders card */}
    {showReminders && <div
      className="tcr-anim"
      style={{
        position: "absolute",
        bottom: isMobile ? (showReveals ? "17.5rem" : "5rem") : (showReveals ? "17rem" : "4.5rem"),
        right: isMobile ? "0.75rem" : "1.5rem",
        zIndex: 39,
        width: isMobile ? "calc(100% - 1.5rem)" : "21.25rem",
        background: `linear-gradient(135deg, ${T.color.linen}f5, ${T.color.warmStone}f5)`,
        backdropFilter: "blur(16px)",
        borderRadius: "1rem",
        border: "0.0625rem solid #E3D6BC", // Atrium token: opaque hairline
        boxShadow: "0 0.5rem 1.5rem rgba(64,59,54,0.14), inset 0 0.0625rem 0 rgba(255,255,255,0.5)", // Atrium token: S2 warm ink + top highlight
        padding: 0,
        overflow: "hidden",
        opacity: reminderVisible ? 1 : 0,
        transform: reminderVisible ? "translateY(0)" : "translateY(1.25rem)",
        transition: "opacity 0.3s ease, transform 0.3s ease",
        pointerEvents: reminderVisible ? "auto" : "none",
      }}
    >
      <div style={{ height: "0.1875rem", background: "linear-gradient(90deg, #56683C, #7A8C64)" /* Atrium token: sage, gold reserved for the palace */ }} />
      <div style={{ padding: "0.875rem 1.125rem 0.5rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h4 style={{ fontFamily: T.font.display, fontSize: "1.0625rem", fontWeight: 600, color: "#56683C", margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {t("resolutionReminder")}
          </h4>
          <p style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E", margin: "0.1875rem 0 0" }}>
            {resolutionReminders.length} {resolutionReminders.length === 1 ? t("goalSingular") : t("goalPlural")} {resolutionReminders.length === 1 ? t("deadlineSingular") : t("deadlinePlural")}
          </p>
        </div>
        <button onClick={handleDismissReminders} aria-label={tc("dismiss")} style={{ width: "1.625rem", height: "1.625rem", borderRadius: "0.8125rem", border: "0.0625rem solid #E3D6BC", background: "rgba(86,104,60,0.16)", color: "#716A5E", fontSize: "0.8125rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{"\u2715"}</button>
      </div>
      <div style={{ padding: "0 0.875rem 0.875rem" }}>
        {resolutionReminders.slice(0, 3).map((r, i) => (
          <button key={r.mem.id} onClick={() => { markReminderSeen([r.mem.id]); onNavigateToRoom(r.wingId, r.roomId); }}
            className="tcr-anim"
            style={{ width: "100%", display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.625rem 0.5rem", borderRadius: "0.625rem", border: "none", background: "transparent", cursor: "pointer", textAlign: "left", transition: "background 0.2s ease", borderTop: i > 0 ? "0.0625rem solid #E3D6BC" : "none" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(86,104,60,0.06)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
            <div style={{ width: "2.5rem", height: "2.5rem", borderRadius: "0.625rem", background: "rgba(86,104,60,0.16)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.125rem" }}>
              {"\uD83C\uDFAF"}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600, color: "#403B36", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.mem.resolution?.goal}</div>
              <div style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E", marginTop: "0.0625rem" }}>
                {r.daysLeft} {r.daysLeft === 1 ? t("daySingular") : t("dayPlural")} {r.roomIcon} {r.roomName}
              </div>
            </div>
            <div style={{ background: "#56683C", color: "#FCFAF5", fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600, padding: "0.3125rem 0.75rem", borderRadius: "2rem", whiteSpace: "nowrap", flexShrink: 0 }}>{t("view")}</div>
          </button>
        ))}
      </div>
    </div>}
    {showReveals && <div
      className="tcr-anim"
      style={{
        position: "absolute",
        bottom: isMobile ? "5rem" : "4.5rem",
        right: isMobile ? "0.75rem" : "1.5rem",
        zIndex: 40,
        width: isMobile ? "calc(100% - 1.5rem)" : "21.25rem",
        background: `linear-gradient(135deg, ${T.color.linen}f5, ${T.color.warmStone}f5)`,
        backdropFilter: "blur(16px)",
        borderRadius: "1rem",
        border: "0.0625rem solid #E3D6BC", // Atrium token: opaque hairline
        boxShadow:
          "0 0.5rem 1.5rem rgba(64,59,54,0.14), inset 0 0.0625rem 0 rgba(255,255,255,0.5)", // Atrium token: S2 warm ink + top highlight
        padding: 0,
        overflow: "hidden",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(1.25rem)",
        transition:
          "opacity 0.3s ease, transform 0.3s ease",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      {/* Accent bar */}
      <div
        style={{
          height: "0.1875rem",
          background: "linear-gradient(90deg, #9A4F2A, #B85C38)", // Atrium token: terracotta ember accent
        }}
      />

      {/* Header */}
      <div
        style={{
          padding: "1rem 1.125rem 0.625rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <h4
            style={{
              fontFamily: T.font.display,
              fontSize: "1.1875rem", // Atrium token: titleM
              fontWeight: 600,
              color: "#9A4F2A", // Atrium token: terracotta glyph
              margin: 0,
              letterSpacing: "0.01875rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <span style={{ fontSize: "1.375rem" }}>{"\u2728"}</span>
            {revealed.length === 1 ? t("capsuleOpenedSingular") : t("capsuleOpenedPlural")}
          </h4>
          <p
            style={{
              fontFamily: T.font.body,
              fontSize: "0.8125rem", // Atrium token: meta
              color: "#716A5E",
              margin: "0.1875rem 0 0",
            }}
          >
            {revealed.length === 1
              ? t("memoriesRevealedSingular", { count: String(revealed.length) })
              : t("memoriesRevealedPlural", { count: String(revealed.length) })}
          </p>
        </div>
        <button
          onClick={handleDismiss}
          style={{
            width: "1.625rem",
            height: "1.625rem",
            borderRadius: "0.8125rem",
            border: "0.0625rem solid #E3D6BC", // Atrium token: hairline
            background: "rgba(154,79,42,0.11)", // Atrium token: terracotta medallion tint
            color: "#716A5E",
            fontSize: "0.8125rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {"\u2715"}
        </button>
      </div>

      {/* Revealed memories list */}
      <div style={{ padding: "0 0.875rem 0.875rem" }}>
        {shown.map((r, i) => (
          <button
            key={r.mem.id}
            onClick={() => handleView(r)}
            className="tcr-anim"
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "0.625rem 0.5rem",
              borderRadius: "0.625rem",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              textAlign: "left",
              transition: "background 0.2s ease",
              borderTop: i > 0 ? "0.0625rem solid #E3D6BC" : "none", // Atrium token: hairline
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                "rgba(154,79,42,0.06)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
            }}
          >
            {/* Memory color swatch */}
            <div
              style={{
                width: "2.5rem",
                height: "2.5rem",
                borderRadius: "0.625rem",
                background: `linear-gradient(135deg, hsl(${r.mem.hue},${r.mem.s}%,${r.mem.l}%), hsl(${r.mem.hue},${Math.max(0, r.mem.s - 10)}%,${Math.max(0, r.mem.l - 10)}%))`,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0.25rem 1rem rgba(64,59,54,0.07)", // Atrium token: S1 warm ink
                position: "relative",
                overflow: "hidden",
              }}
            >
              {r.mem.dataUrl ? (
                <Image
                  src={r.mem.dataUrl!}
                  alt=""
                  width={40} height={40}
                  style={{
                    borderRadius: "0.625rem",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <span style={{ fontSize: "1.125rem" }}>{"\uD83D\uDD13"}</span>
              )}
            </div>

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: T.font.body,
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  color: "#403B36", // Atrium token: ink
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {r.mem.title}
              </div>
              <div
                style={{
                  fontFamily: T.font.body,
                  fontSize: "0.8125rem", // Atrium token: meta
                  color: "#716A5E",
                  marginTop: "0.0625rem",
                }}
              >
                {r.roomIcon} {r.roomName}
              </div>
            </div>

            {/* View button */}
            <div
              style={{
                background: "#B85C38", // Atrium token: ember
                color: "#FCFAF5",
                fontFamily: T.font.body,
                fontSize: "0.8125rem", // Atrium token: meta
                fontWeight: 600,
                padding: "0.3125rem 0.75rem",
                borderRadius: "2rem", // Atrium token: pill
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {t("view")}
            </div>
          </button>
        ))}
      </div>

      {/* Show more hint */}
      {revealed.length > 3 && (
        <div
          style={{
            padding: "0 1.125rem 0.75rem",
            fontFamily: T.font.body,
            fontSize: "0.8125rem", // Atrium token: meta
            color: "#9A4F2A", // Atrium token: terracotta glyph
            textAlign: "center",
          }}
        >
          {revealed.length - 3 === 1
            ? t("moreCapsulesSingular", { count: String(revealed.length - 3) })
            : t("moreCapsulePlural", { count: String(revealed.length - 3) })}
        </div>
      )}
    </div>}
    </>
  );
}
