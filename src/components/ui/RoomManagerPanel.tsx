"use client";
import { useEffect, useState } from "react";
import { T } from "@/lib/theme";
import { useIsMobile, useIsTablet } from "@/lib/hooks/useIsMobile";
import { useRoomStore, MAX_ROOMS_PER_WING } from "@/lib/stores/roomStore";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import type { Wing } from "@/lib/constants/wings";
import { translateWingName } from "@/lib/constants/wings";
import { RoomIcon, WingIcon, GenericRoomIcon, resolveRoomIconId, ROOM_ICON_MAP } from "./WingRoomIcons";

interface RoomManagerPanelProps {
  wing: Wing;
  /** When provided, a wing selector lets the user re-scope the whole panel
   *  (room list + add-room target) to any wing — used by the Library's
   *  "Create a Gallery" flow. Omitted = single-wing behavior, unchanged. */
  wings?: Wing[];
  onClose: () => void;
  onEnterRoom?: (roomId: string) => void;
}

/**
 * Renders a room's icon — always a crafted line-art SVG, never an emoji.
 * `icon` (the SVG picker stores standard room ids) resolves first, then the
 * room's own id (default rooms carry an emoji in `icon` but a standard id);
 * anything unresolved (custom rooms, legacy emoji picks) renders the
 * GenericRoomIcon door-frame fallback.
 */
function RoomGlyph({ roomId, icon, wingId, size, color }: { roomId: string; icon?: string; wingId: string; size: number; color: string }) {
  const resolved = resolveRoomIconId(roomId, icon);
  if (resolved) {
    return <RoomIcon roomId={resolved} wingId={wingId} size={size} color={color} />;
  }
  return <GenericRoomIcon size={size} color={color} />;
}

export default function RoomManagerPanel({ wing, wings, onClose, onEnterRoom }: RoomManagerPanelProps) {
  const { t } = useTranslation("room");
  const { t: tc } = useTranslation("common");
  const { t: tLib } = useTranslation("library");
  const { t: tWings } = useTranslation("wings");
  const isMobile = useIsMobile();
  // Treat tablet-touch (iPad portrait) as mobile for SIZING so controls meet the
  // 2.75rem touch floor and the panel goes full-width.
  const isTablet = useIsTablet();
  const touch = isMobile || isTablet;
  const { containerRef, handleKeyDown } = useFocusTrap(true);
  // Actions are stable method references that never change, so read them once
  // from getState() instead of subscribing. Only subscribe to the reactive
  // slice that actually drives the rendered list (this wing's custom rooms),
  // so unrelated store mutations (other wings, wing customizations, cross-device
  // syncs mid-edit) no longer re-render the whole panel + full room list.
  const { getWingRooms, renameRoom, changeRoomIcon, addRoom, deleteRoom, reorderRoom } = useRoomStore.getState();
  // Cross-wing scope: with a `wings` list the panel can be re-pointed at any
  // wing via the selector chips; otherwise it stays locked to the `wing` prop.
  const [activeWingId, setActiveWingId] = useState(wing.id);
  const activeWing = wings?.find(w => w.id === activeWingId) || wing;
  // Subscribe narrowly: re-render only when the ACTIVE wing's room array
  // identity changes. getWingRooms falls back to WING_ROOMS defaults when
  // there's no custom entry, preserving the exact same result.
  useRoomStore(s => s.customRooms[activeWing.id]);
  const rooms = getWingRooms(activeWing.id);
  const accent = activeWing.accent;

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [pickingIconId, setPickingIconId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("ro1");
  const [showNewIconPicker, setShowNewIconPicker] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const canAdd = rooms.length < MAX_ROOMS_PER_WING;

  const startEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditName(name);
    setPickingIconId(null);
    setAdding(false);
  };

  const saveEdit = (id: string) => {
    // Guard against double-commit: Enter fires the form submit AND the input's
    // onBlur. Early-return once editing has already been cleared.
    if (editingId !== id) return;
    if (editName.trim()) renameRoom(activeWing.id, id, editName);
    setEditingId(null);
  };

  const handleAdd = () => {
    if (!newName.trim()) return;
    addRoom(activeWing.id, newName, newIcon);
    setAdding(false);
    setNewName("");
    setNewIcon("ro1");
    setShowNewIconPicker(false);
  };

  const handleDelete = (roomId: string) => {
    deleteRoom(activeWing.id, roomId);
    setConfirmDelete(null);
  };

  const STANDARD_ROOM_IDS = Object.keys(ROOM_ICON_MAP);

  // roomId / "wingSlug:roomName" → published, fetched once on mount from the
  // same server action the Publish modal uses. On fetch failure the map stays
  // empty and the badge gracefully falls back to shared/private.
  const [publishedMap, setPublishedMap] = useState<Record<string, boolean>>({});
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { getMyPublishableContent } = await import("@/lib/social/share-actions");
        const content = await getMyPublishableContent();
        if (cancelled) return;
        const map: Record<string, boolean> = {};
        for (const w of content) {
          for (const r of w.rooms) {
            if (r.published) {
              // Key by the returned id (local room id when never DB-backed) AND
              // by wing-scoped name (covers DB-backed rooms whose id is a uuid).
              map[r.id] = true;
              map[`${w.slug}:${r.name}`] = true;
            }
          }
        }
        setPublishedMap(map);
      } catch { /* keep empty map — badge falls back to shared/private */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const isRoomPublished = (room: { id: string; name: string }) =>
    !!(publishedMap[room.id] || publishedMap[`${activeWing.id}:${room.name}`]);

  // Switching wings drops all transient edit state so nothing (rename field,
  // icon picker, delete confirm, half-typed new room) leaks across wings.
  const switchWing = (id: string) => {
    if (id === activeWingId) return;
    setActiveWingId(id);
    setEditingId(null);
    setPickingIconId(null);
    setAdding(false);
    setNewName("");
    setNewIcon("ro1");
    setShowNewIconPicker(false);
    setConfirmDelete(null);
  };

  const iconPicker = (currentIcon: string, onPick: (icon: string) => void) => (
    <div role="radiogroup" aria-label={t("changeIcon")} style={{ background: T.color.white, borderRadius: "0.75rem", border: `1px solid ${T.color.hairline}`, padding: touch ? "0.5rem" : "0.625rem", marginTop: "0.375rem" }}>
      {/* Standard SVG room icons — the full (and only) set; unresolved icons
          (custom rooms, legacy emoji picks) render the GenericRoomIcon door frame */}
      <div>
        <span style={{ fontSize: "0.75rem", color: T.color.ink, fontWeight: 600, letterSpacing: "0.03em" }}>{t("standardIcons")}</span>
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.375rem", flexWrap: "wrap" }}>
          {STANDARD_ROOM_IDS.map(id => (
            <button key={id} onClick={() => onPick(id)} role="radio" aria-checked={currentIcon === id}
              style={{ width: touch ? "3rem" : "2.5rem", height: touch ? "3rem" : "2.5rem", borderRadius: "0.5rem", border: currentIcon === id ? `2px solid ${accent}` : `1px solid ${T.color.hairline}`, background: currentIcon === id ? `${accent}15` : T.color.warmStone, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s" }}>
              <RoomIcon roomId={id} wingId={activeWing.id} size={touch ? 22 : 20} color={currentIcon === id ? accent : T.color.walnut} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(64,59,54,.4)", backdropFilter: "blur(8px)", zIndex: 55, animation: "fadeIn .2s ease" }}>
      <div ref={containerRef} role="dialog" aria-modal="true" aria-label={t("manageRooms")} onClick={e => e.stopPropagation()} onKeyDown={(e) => { if (e.key === "Escape") onClose(); handleKeyDown(e); }} style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: touch ? "100%" : "min(400px, 92vw)", background: `${T.color.linen}f8`, backdropFilter: "blur(20px)", borderLeft: touch ? "none" : `1px solid ${T.color.hairline}`, padding: touch ? "1.25rem 1rem" : "1.75rem 1.5rem", overflowY: "auto", animation: "slideInRight .3s cubic-bezier(.23,1,.32,1)" }}>
        <style>{`@keyframes slideInRight{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}@media (prefers-reduced-motion: reduce){[role=dialog]{animation:none !important}}`}</style>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <div>
            <h3 style={{ fontFamily: T.font.display, fontSize: "1.375rem", fontWeight: 500, color: T.color.ink, margin: 0 }}>{t("manageRooms")}</h3>
            <p style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.inkMuted, margin: "0.25rem 0 0", display: "flex", alignItems: "center", gap: "0.375rem" }}>
              <span aria-hidden style={{ width: "0.5rem", height: "0.5rem", borderRadius: "50%", background: accent, flexShrink: 0 }} />
              {t("wingLabel", { name: translateWingName(activeWing, tWings) })}
            </p>
          </div>
          <button onClick={onClose} aria-label={tc("close")} style={{ width: touch ? "2.75rem" : "2rem", height: touch ? "2.75rem" : "2rem", borderRadius: touch ? "1.375rem" : "1rem", border: `1px solid ${T.color.hairline}`, background: T.color.warmStone, color: T.color.inkMuted, fontSize: touch ? "1rem" : "0.875rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", minWidth: "2.75rem", minHeight: "2.75rem" }}>{"\u2715"}</button>
        </div>

        {/* Wing selector — only when the caller opens the panel palace-wide */}
        {wings && wings.length > 1 && (
          <div style={{ marginBottom: "1rem" }}>
            <span style={{ fontFamily: T.font.body, fontSize: "0.625rem", color: T.color.inkMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{tLib("wingLabel")}</span>
            <div role="radiogroup" aria-label={tLib("wingLabel")} style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap", marginTop: "0.375rem" }}>
              {wings.map(w => {
                const on = w.id === activeWing.id;
                return (
                  <button key={w.id} role="radio" aria-checked={on} onClick={() => switchWing(w.id)}
                    style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", minHeight: "2.75rem", padding: "0 0.75rem", borderRadius: "2rem", border: on ? `2px solid ${w.accent}` : `1px solid ${T.color.hairline}`, background: on ? `${w.accent}15` : T.color.white, color: on ? w.accent : T.color.inkMuted, fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", transition: "all .15s" }}>
                    <WingIcon wingId={w.id} size={16} color={on ? w.accent : T.color.inkMuted} />
                    {translateWingName(w, tWings)}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Room count */}
        <div style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.inkMuted, marginBottom: "1rem" }}>
          {t("roomCount", { current: String(rooms.length), max: String(MAX_ROOMS_PER_WING) })}
          <div style={{ height: "0.1875rem", background: T.color.hairline, borderRadius: "0.125rem", marginTop: "0.375rem" }}>
            <div style={{ height: "100%", background: accent, borderRadius: "0.125rem", width: `${(rooms.length / MAX_ROOMS_PER_WING) * 100}%`, transition: "width .3s" }} />
          </div>
        </div>

        {/* Room list */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.25rem" }}>
          {rooms.map((room, i) => (
            <div key={room.id} style={{ background: T.color.white, borderRadius: "0.75rem", border: `1px solid ${T.color.hairline}`, padding: "0.75rem 0.875rem", transition: "all .15s" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                {/* Icon button */}
                <button onClick={() => { setPickingIconId(pickingIconId === room.id ? null : room.id); setEditingId(null); setAdding(false); }}
                  aria-label={t("changeIcon")}
                  style={{ width: touch ? "2.75rem" : "2.375rem", height: touch ? "2.75rem" : "2.375rem", borderRadius: "0.625rem", border: `1px solid ${T.color.hairline}`, background: pickingIconId === room.id ? `${accent}12` : T.color.warmStone, fontSize: "1.25rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all .15s" }}
                  title={t("changeIcon")}>
                  <RoomGlyph roomId={room.id} icon={room.icon} wingId={activeWing.id} size={22} color={accent} />
                </button>

                {/* Name */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {editingId === room.id ? (
                    <form onSubmit={e => { e.preventDefault(); saveEdit(room.id); }} style={{ display: "flex", gap: "0.375rem" }}>
                      <input value={editName} onChange={e => setEditName(e.target.value)} autoFocus
                        onBlur={() => saveEdit(room.id)}
                        style={{ flex: 1, padding: "0.375rem 0.625rem", borderRadius: "0.5rem", border: `1.5px solid ${accent}`, background: T.color.white, fontFamily: T.font.body, fontSize: "1rem", color: T.color.ink, outline: "none" }} />
                    </form>
                  ) : (
                    <div role="button" tabIndex={0} onClick={() => startEdit(room.id, room.name)}
                      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); startEdit(room.id, room.name); } }}
                      style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.ink, cursor: "text", padding: touch ? "0.5rem 0" : "0.25rem 0", display: "flex", alignItems: "center", minHeight: touch ? "2.75rem" : undefined }}
                      title={t("clickToRename")}>
                      {room.name}
                    </div>
                  )}
                  <div style={{ fontFamily: T.font.body, fontSize: "0.625rem", color: isRoomPublished(room) ? T.color.goldDark : T.color.inkMuted, fontWeight: isRoomPublished(room) ? 600 : 400, marginTop: "0.0625rem" }}>
                    {isRoomPublished(room) ? t("published") : room.shared ? t("shared", { count: String(room.sharedWith.length) }) : t("private")}
                  </div>
                </div>

                {/* Reorder buttons \u2014 full 2.75rem tap targets on touch */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.125rem" }}>
                  <button onClick={() => reorderRoom(activeWing.id, room.id, -1)} disabled={i === 0} aria-label={tc("moveUp")}
                    style={{ minWidth: touch ? "2.75rem" : undefined, minHeight: touch ? "2.75rem" : undefined, width: touch ? "2.75rem" : "1.375rem", height: touch ? "2.75rem" : "1.125rem", borderRadius: "0.25rem", border: "none", background: i === 0 ? "transparent" : T.color.warmStone, color: i === 0 ? T.color.hairline : T.color.inkMuted, fontSize: touch ? "0.6875rem" : "0.5625rem", cursor: i === 0 ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{"\u25B2"}</button>
                  <button onClick={() => reorderRoom(activeWing.id, room.id, 1)} disabled={i === rooms.length - 1} aria-label={tc("moveDown")}
                    style={{ minWidth: touch ? "2.75rem" : undefined, minHeight: touch ? "2.75rem" : undefined, width: touch ? "2.75rem" : "1.375rem", height: touch ? "2.75rem" : "1.125rem", borderRadius: "0.25rem", border: "none", background: i === rooms.length - 1 ? "transparent" : T.color.warmStone, color: i === rooms.length - 1 ? T.color.hairline : T.color.inkMuted, fontSize: touch ? "0.6875rem" : "0.5625rem", cursor: i === rooms.length - 1 ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{"\u25BC"}</button>
                </div>

                {/* Enter room */}
                {onEnterRoom && (
                  <button onClick={() => { onEnterRoom(room.id); onClose(); }}
                    style={{ width: touch ? "2.75rem" : "1.875rem", height: touch ? "2.75rem" : "1.875rem", borderRadius: "0.5rem", border: `1px solid ${T.color.hairline}`, background: T.color.warmStone, color: T.color.inkMuted, fontSize: touch ? "0.875rem" : "0.75rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", minWidth: "2.75rem", minHeight: "2.75rem" }}
                    title={t("enterRoom")} aria-label={t("enterRoom")}>{"\u279C"}</button>
                )}

                {/* Delete button */}
                {rooms.length > 1 && (
                  <button onClick={() => setConfirmDelete(confirmDelete === room.id ? null : room.id)}
                    aria-label={t("deleteRoom")}
                    style={{ width: touch ? "2.75rem" : "1.875rem", height: touch ? "2.75rem" : "1.875rem", borderRadius: "0.5rem", border: confirmDelete === room.id ? `1px solid ${T.color.error}80` : `1px solid ${T.color.hairline}`, background: confirmDelete === room.id ? `${T.color.error}10` : "transparent", color: confirmDelete === room.id ? T.color.error : T.color.inkMuted, fontSize: touch ? "0.875rem" : "0.75rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", minWidth: "2.75rem", minHeight: "2.75rem" }}
                    title={t("deleteRoom")}><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 7 H20" /><path d="M9 7 V5 a1 1 0 0 1 1-1 h4 a1 1 0 0 1 1 1 V7" /><path d="M6 7 L7 19 a2 2 0 0 0 2 2 h6 a2 2 0 0 0 2-2 L18 7" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg></button>
                )}
              </div>

              {/* Icon picker (expanded) */}
              {pickingIconId === room.id && iconPicker(room.icon, (icon) => {
                changeRoomIcon(activeWing.id, room.id, icon);
                setPickingIconId(null);
              })}

              {/* Delete confirmation */}
              {confirmDelete === room.id && (
                <div style={{ marginTop: "0.5rem", padding: "0.5rem 0.625rem", background: `${T.color.error}12`, borderRadius: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.error, flex: 1 }}>{t("deleteConfirm", { name: room.name })}</span>
                  <button onClick={() => handleDelete(room.id)}
                    style={{ padding: "0.3125rem 0.75rem", borderRadius: "0.375rem", border: "none", background: T.color.error, color: "#FFF", fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 600, cursor: "pointer", minHeight: "2.75rem" }}>{tc("delete")}</button>
                  <button onClick={() => setConfirmDelete(null)}
                    style={{ padding: "0.3125rem 0.625rem", borderRadius: "0.375rem", border: `1px solid ${T.color.hairline}`, background: T.color.white, color: T.color.inkMuted, fontFamily: T.font.body, fontSize: "0.6875rem", cursor: "pointer", minHeight: "2.75rem" }}>{tc("cancel")}</button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add room section */}
        {adding ? (
          <div style={{ background: T.color.white, borderRadius: "0.75rem", border: `1.5px solid ${accent}40`, padding: "1rem" }}>
            <div style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.inkMuted, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: "0.625rem" }}>{t("newRoom")}</div>

            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.75rem" }}>
              <button onClick={() => setShowNewIconPicker(!showNewIconPicker)}
                style={{ width: "2.75rem", height: "2.75rem", borderRadius: "0.625rem", border: `1px solid ${T.color.hairline}`, background: T.color.warmStone, fontSize: "1.375rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                title={t("chooseIcon")}>
                {/* newIcon is always a standard id from the SVG picker ("ro1" default) */}
                <RoomGlyph roomId={newIcon} icon={newIcon} wingId={activeWing.id} size={24} color={accent} />
              </button>
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder={t("roomNamePlaceholder")} autoFocus
                onKeyDown={e => { if (e.key === "Enter") handleAdd(); }}
                style={{ flex: 1, padding: "0.625rem 0.875rem", borderRadius: "0.625rem", border: `1px solid ${T.color.hairline}`, background: T.color.white, fontFamily: T.font.body, fontSize: "1rem", color: T.color.ink, outline: "none" }} />
            </div>

            {showNewIconPicker && iconPicker(newIcon, (icon) => { setNewIcon(icon); setShowNewIconPicker(false); })}

            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
              <button onClick={() => { setAdding(false); setNewName(""); setShowNewIconPicker(false); }}
                style={{ flex: 1, padding: "0.625rem", borderRadius: "0.625rem", border: `1px solid ${T.color.hairline}`, background: "transparent", fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.inkMuted, cursor: "pointer", minHeight: "2.75rem" }}>{tc("cancel")}</button>
              <button onClick={handleAdd} disabled={!newName.trim()}
                style={{ flex: 2, padding: "0.625rem", borderRadius: "0.625rem", border: "none", background: newName.trim() ? accent : `${T.color.sandstone}40`, color: newName.trim() ? "#FFF" : T.color.inkMuted, fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 600, cursor: newName.trim() ? "pointer" : "default", minHeight: "2.75rem" }}>{t("addRoomButton")}</button>
            </div>
          </div>
        ) : canAdd ? (
          <button onClick={() => { setAdding(true); setEditingId(null); setPickingIconId(null); setConfirmDelete(null); }}
            style={{ width: "100%", padding: "0.875rem", borderRadius: "0.75rem", border: `1.5px dashed ${accent}50`, background: `${accent}06`, color: accent, fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.375rem", transition: "all .15s", minHeight: "2.75rem" }}>
            {t("addRoom")}
          </button>
        ) : (
          <div style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.inkMuted, textAlign: "center", padding: "0.75rem" }}>
            {t("maxRoomsReached", { max: String(MAX_ROOMS_PER_WING) })}
          </div>
        )}
      </div>
    </div>
  );
}
