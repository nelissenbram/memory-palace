"use client";
import { useState } from "react";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useRoomStore, MAX_ROOMS_PER_WING } from "@/lib/stores/roomStore";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import type { Wing } from "@/lib/constants/wings";
import { RoomIcon, ROOM_ICON_MAP } from "./WingRoomIcons";

const ERROR_BG = "#FDF0F0";

const EMOJI_PRESETS = [
  // Home & Family
  "\u{1F3E0}","\u{1F384}","\u{1F382}","\u{1F476}","\u{1F46A}","\u2764\uFE0F","\u{1F370}","\u{1F37D}\uFE0F",
  // Travel
  "\u2708\uFE0F","\u{1F1EE}\u{1F1F9}","\u{1F1EF}\u{1F1F5}","\u{1F1EB}\u{1F1F7}","\u26F0\uFE0F","\u{1F3D6}\uFE0F","\u{1F30D}","\u{1F697}",
  // Nature & Seasons
  "\u{1F33B}","\u{1F338}","\u{1F340}","\u{1F30A}","\u2744\uFE0F","\u{1F308}","\u2B50","\u{1F319}",
  // Arts & Creation
  "\u{1F3A8}","\u{1F3B8}","\u{1F4F7}","\u{1F3AC}","\u{1F3B5}","\u270F\uFE0F","\u{1F4DA}","\u{1F3AD}",
  // Career & Education
  "\u{1F4D0}","\u{1F680}","\u{1F3A4}","\u{1F393}","\u{1F4BC}","\u{1F3C6}","\u{1F4A1}","\u2699\uFE0F",
  // Activities
  "\u{1F6E0}\uFE0F","\u{1F3EB}","\u{1F3C0}","\u26BD","\u{1F3BF}","\u{1F3CA}","\u{1F6B2}","\u{1F3AE}",
  // Food & Drink
  "\u{1F377}","\u2615","\u{1F355}","\u{1F370}","\u{1F37B}","\u{1F375}","\u{1F36B}","\u{1F952}",
  // Misc
  "\u{1F48E}","\u{1F52E}","\u{1F56F}\uFE0F","\u{1F3F0}","\u{1F30C}","\u{1F3DD}\uFE0F","\u{1F9ED}","\u{1F5FA}\uFE0F",
];

interface RoomManagerPanelProps {
  wing: Wing;
  onClose: () => void;
  onEnterRoom?: (roomId: string) => void;
}

export default function RoomManagerPanel({ wing, onClose, onEnterRoom }: RoomManagerPanelProps) {
  const { t } = useTranslation("room");
  const { t: tc } = useTranslation("common");
  const isMobile = useIsMobile();
  const { containerRef, handleKeyDown } = useFocusTrap(true);
  const { getWingRooms, renameRoom, changeRoomIcon, addRoom, deleteRoom, reorderRoom } = useRoomStore();
  const rooms = getWingRooms(wing.id);
  const accent = wing.accent;

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
    if (editName.trim()) renameRoom(wing.id, id, editName);
    setEditingId(null);
  };

  const handleAdd = () => {
    if (!newName.trim()) return;
    addRoom(wing.id, newName, newIcon);
    setAdding(false);
    setNewName("");
    setNewIcon("ro1");
    setShowNewIconPicker(false);
  };

  const handleDelete = (roomId: string) => {
    deleteRoom(wing.id, roomId);
    setConfirmDelete(null);
  };

  const STANDARD_ROOM_IDS = Object.keys(ROOM_ICON_MAP);

  const [showEmoji, setShowEmoji] = useState(false);

  const iconPicker = (currentIcon: string, onPick: (icon: string) => void) => (
    <div style={{ background: T.color.white, borderRadius: "0.75rem", border: `1px solid ${T.color.cream}`, padding: isMobile ? "0.5rem" : "0.625rem", marginTop: "0.375rem" }}>
      {/* Standard SVG room icons — prominent */}
      <div style={{ marginBottom: "0.625rem" }}>
        <span style={{ fontSize: "0.75rem", color: T.color.charcoal, fontWeight: 600, letterSpacing: "0.03em" }}>{t("standardIcons")}</span>
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.375rem", flexWrap: "wrap" }}>
          {STANDARD_ROOM_IDS.map(id => (
            <button key={id} onClick={() => onPick(id)}
              style={{ width: isMobile ? "3rem" : "2.5rem", height: isMobile ? "3rem" : "2.5rem", borderRadius: "0.5rem", border: currentIcon === id ? `2px solid ${accent}` : `1px solid ${T.color.cream}`, background: currentIcon === id ? `${accent}15` : T.color.warmStone, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s" }}>
              <RoomIcon roomId={id} wingId={wing.id} size={isMobile ? 22 : 20} color={currentIcon === id ? accent : T.color.walnut} />
            </button>
          ))}
        </div>
      </div>
      {/* Custom emoji icons — collapsed by default */}
      <div>
        <button onClick={() => setShowEmoji(!showEmoji)} style={{ background: "none", border: "none", cursor: "pointer", padding: "0.125rem 0", display: "flex", alignItems: "center", gap: "0.25rem" }}>
          <span style={{ fontSize: "0.625rem", color: T.color.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{t("customEmoji")}</span>
          <span style={{ fontSize: "0.5rem", color: T.color.muted, transform: showEmoji ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .15s", display: "inline-block" }}>{"\u25BC"}</span>
        </button>
        {showEmoji && (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(6,1fr)" : "repeat(8,1fr)", gap: isMobile ? "0.375rem" : "0.25rem", maxHeight: isMobile ? "7rem" : "5rem", overflowY: "auto", marginTop: "0.25rem" }}>
            {EMOJI_PRESETS.map((e, i) => (
              <button key={i} onClick={() => onPick(e)}
                style={{ width: isMobile ? "2.25rem" : "1.75rem", height: isMobile ? "2.25rem" : "1.75rem", borderRadius: "0.375rem", border: e === currentIcon ? `2px solid ${accent}` : "1px solid transparent", background: e === currentIcon ? `${accent}15` : "transparent", fontSize: isMobile ? "1rem" : "0.875rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {e}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(42,34,24,.4)", backdropFilter: "blur(8px)", zIndex: 55, animation: "fadeIn .2s ease" }}>
      <div ref={containerRef} role="dialog" aria-modal="true" aria-label={t("manageRooms")} onClick={e => e.stopPropagation()} onKeyDown={(e) => { if (e.key === "Escape") onClose(); handleKeyDown(e); }} style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: isMobile ? "100%" : "min(400px, 92vw)", background: `${T.color.linen}f8`, backdropFilter: "blur(20px)", borderLeft: isMobile ? "none" : `1px solid ${T.color.cream}`, padding: isMobile ? "1.25rem 1rem" : "1.75rem 1.5rem", overflowY: "auto", animation: "slideInRight .3s cubic-bezier(.23,1,.32,1)" }}>
        <style>{`@keyframes slideInRight{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}`}</style>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <div>
            <h3 style={{ fontFamily: T.font.display, fontSize: "1.375rem", fontWeight: 500, color: T.color.charcoal, margin: 0 }}>{t("manageRooms")}</h3>
            <p style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: accent, margin: "0.25rem 0 0" }}>{t("wingLabel", { name: wing.name })}</p>
          </div>
          <button onClick={onClose} aria-label={tc("close")} style={{ width: isMobile ? "2.5rem" : "2rem", height: isMobile ? "2.5rem" : "2rem", borderRadius: isMobile ? "1.25rem" : "1rem", border: `1px solid ${T.color.cream}`, background: T.color.warmStone, color: T.color.muted, fontSize: isMobile ? "1rem" : "0.875rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", minWidth: "2.75rem", minHeight: "2.75rem" }}>{"\u2715"}</button>
        </div>

        {/* Room count */}
        <div style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.muted, marginBottom: "1rem" }}>
          {t("roomCount", { current: String(rooms.length), max: String(MAX_ROOMS_PER_WING) })}
          <div style={{ height: "0.1875rem", background: T.color.cream, borderRadius: "0.125rem", marginTop: "0.375rem" }}>
            <div style={{ height: "100%", background: accent, borderRadius: "0.125rem", width: `${(rooms.length / MAX_ROOMS_PER_WING) * 100}%`, transition: "width .3s" }} />
          </div>
        </div>

        {/* Room list */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.25rem" }}>
          {rooms.map((room, i) => (
            <div key={room.id} style={{ background: T.color.white, borderRadius: "0.75rem", border: `1px solid ${T.color.cream}`, padding: "0.75rem 0.875rem", transition: "all .15s" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                {/* Icon button */}
                <button onClick={() => { setPickingIconId(pickingIconId === room.id ? null : room.id); setEditingId(null); setAdding(false); }}
                  aria-label={t("changeIcon")}
                  style={{ width: "2.375rem", height: "2.375rem", borderRadius: "0.625rem", border: `1px solid ${T.color.cream}`, background: pickingIconId === room.id ? `${accent}12` : T.color.warmStone, fontSize: "1.25rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all .15s" }}
                  title={t("changeIcon")}>
                  <RoomIcon roomId={room.icon} wingId={wing.id} size={22} color={accent} />
                </button>

                {/* Name */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {editingId === room.id ? (
                    <form onSubmit={e => { e.preventDefault(); saveEdit(room.id); }} style={{ display: "flex", gap: "0.375rem" }}>
                      <input value={editName} onChange={e => setEditName(e.target.value)} autoFocus
                        onBlur={() => saveEdit(room.id)}
                        style={{ flex: 1, padding: "0.375rem 0.625rem", borderRadius: "0.5rem", border: `1.5px solid ${accent}`, background: T.color.white, fontFamily: T.font.body, fontSize: "1rem", color: T.color.charcoal, outline: "none" }} />
                    </form>
                  ) : (
                    <div role="button" tabIndex={0} onClick={() => startEdit(room.id, room.name)}
                      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); startEdit(room.id, room.name); } }}
                      style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.charcoal, cursor: "text", padding: "0.25rem 0" }}
                      title={t("clickToRename")}>
                      {room.name}
                    </div>
                  )}
                  <div style={{ fontFamily: T.font.body, fontSize: "0.625rem", color: T.color.muted, marginTop: "0.0625rem" }}>
                    {room.shared ? t("shared", { count: String(room.sharedWith.length) }) : t("private")}
                    {" \u00B7 "}{room.id}
                  </div>
                </div>

                {/* Reorder buttons */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.125rem" }}>
                  <button onClick={() => reorderRoom(wing.id, room.id, -1)} disabled={i === 0} aria-label={tc("moveUp")}
                    style={{ width: isMobile ? "2rem" : "1.375rem", height: isMobile ? "1.625rem" : "1.125rem", borderRadius: "0.25rem", border: "none", background: i === 0 ? "transparent" : T.color.warmStone, color: i === 0 ? T.color.cream : T.color.muted, fontSize: isMobile ? "0.6875rem" : "0.5625rem", cursor: i === 0 ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{"\u25B2"}</button>
                  <button onClick={() => reorderRoom(wing.id, room.id, 1)} disabled={i === rooms.length - 1} aria-label={tc("moveDown")}
                    style={{ width: isMobile ? "2rem" : "1.375rem", height: isMobile ? "1.625rem" : "1.125rem", borderRadius: "0.25rem", border: "none", background: i === rooms.length - 1 ? "transparent" : T.color.warmStone, color: i === rooms.length - 1 ? T.color.cream : T.color.muted, fontSize: isMobile ? "0.6875rem" : "0.5625rem", cursor: i === rooms.length - 1 ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{"\u25BC"}</button>
                </div>

                {/* Enter room */}
                {onEnterRoom && (
                  <button onClick={() => { onEnterRoom(room.id); onClose(); }}
                    style={{ width: isMobile ? "2.375rem" : "1.875rem", height: isMobile ? "2.375rem" : "1.875rem", borderRadius: "0.5rem", border: `1px solid ${T.color.cream}`, background: T.color.warmStone, color: T.color.muted, fontSize: isMobile ? "0.875rem" : "0.75rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", minWidth: "2.75rem", minHeight: "2.75rem" }}
                    title={t("enterRoom")} aria-label={t("enterRoom")}>{"\u279C"}</button>
                )}

                {/* Delete button */}
                {rooms.length > 1 && (
                  <button onClick={() => setConfirmDelete(confirmDelete === room.id ? null : room.id)}
                    aria-label={t("deleteRoom")}
                    style={{ width: isMobile ? "2.375rem" : "1.875rem", height: isMobile ? "2.375rem" : "1.875rem", borderRadius: "0.5rem", border: confirmDelete === room.id ? `1px solid ${T.color.error}80` : `1px solid ${T.color.cream}`, background: confirmDelete === room.id ? `${T.color.error}10` : "transparent", color: confirmDelete === room.id ? T.color.error : T.color.muted, fontSize: isMobile ? "0.875rem" : "0.75rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", minWidth: "2.75rem", minHeight: "2.75rem" }}
                    title={t("deleteRoom")}>{"\u{1F5D1}"}</button>
                )}
              </div>

              {/* Icon picker (expanded) */}
              {pickingIconId === room.id && iconPicker(room.icon, (icon) => {
                changeRoomIcon(wing.id, room.id, icon);
                setPickingIconId(null);
              })}

              {/* Delete confirmation */}
              {confirmDelete === room.id && (
                <div style={{ marginTop: "0.5rem", padding: "0.5rem 0.625rem", background: ERROR_BG, borderRadius: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.error, flex: 1 }}>{t("deleteConfirm", { name: room.name })}</span>
                  <button onClick={() => handleDelete(room.id)}
                    style={{ padding: "0.3125rem 0.75rem", borderRadius: "0.375rem", border: "none", background: T.color.error, color: "#FFF", fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 600, cursor: "pointer" }}>{tc("delete")}</button>
                  <button onClick={() => setConfirmDelete(null)}
                    style={{ padding: "0.3125rem 0.625rem", borderRadius: "0.375rem", border: `1px solid ${T.color.cream}`, background: T.color.white, color: T.color.muted, fontFamily: T.font.body, fontSize: "0.6875rem", cursor: "pointer" }}>{tc("cancel")}</button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add room section */}
        {adding ? (
          <div style={{ background: T.color.white, borderRadius: "0.75rem", border: `1.5px solid ${accent}40`, padding: "1rem" }}>
            <div style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.muted, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: "0.625rem" }}>{t("newRoom")}</div>

            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.75rem" }}>
              <button onClick={() => setShowNewIconPicker(!showNewIconPicker)}
                style={{ width: "2.625rem", height: "2.625rem", borderRadius: "0.625rem", border: `1px solid ${T.color.cream}`, background: T.color.warmStone, fontSize: "1.375rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                title={t("chooseIcon")}>
                <RoomIcon roomId={newIcon} wingId={wing.id} size={24} color={accent} />
              </button>
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder={t("roomNamePlaceholder")} autoFocus
                onKeyDown={e => { if (e.key === "Enter") handleAdd(); }}
                style={{ flex: 1, padding: "0.625rem 0.875rem", borderRadius: "0.625rem", border: `1px solid ${T.color.cream}`, background: T.color.white, fontFamily: T.font.body, fontSize: "1rem", color: T.color.charcoal, outline: "none" }} />
            </div>

            {showNewIconPicker && iconPicker(newIcon, (icon) => { setNewIcon(icon); setShowNewIconPicker(false); })}

            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
              <button onClick={() => { setAdding(false); setNewName(""); setShowNewIconPicker(false); }}
                style={{ flex: 1, padding: "0.625rem", borderRadius: "0.625rem", border: `1px solid ${T.color.cream}`, background: "transparent", fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.muted, cursor: "pointer" }}>{tc("cancel")}</button>
              <button onClick={handleAdd} disabled={!newName.trim()}
                style={{ flex: 2, padding: "0.625rem", borderRadius: "0.625rem", border: "none", background: newName.trim() ? accent : `${T.color.sandstone}40`, color: newName.trim() ? "#FFF" : T.color.muted, fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 600, cursor: newName.trim() ? "pointer" : "default" }}>{t("addRoomButton")}</button>
            </div>
          </div>
        ) : canAdd ? (
          <button onClick={() => { setAdding(true); setEditingId(null); setPickingIconId(null); setConfirmDelete(null); }}
            style={{ width: "100%", padding: "0.875rem", borderRadius: "0.75rem", border: `1.5px dashed ${accent}50`, background: `${accent}06`, color: accent, fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.375rem", transition: "all .15s" }}>
            {t("addRoom")}
          </button>
        ) : (
          <div style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.muted, textAlign: "center", padding: "0.75rem" }}>
            {t("maxRoomsReached", { max: String(MAX_ROOMS_PER_WING) })}
          </div>
        )}
      </div>
    </div>
  );
}
