"use client";
import { useState } from "react";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useRoomStore, MAX_ROOMS_PER_WING } from "@/lib/stores/roomStore";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import type { Wing } from "@/lib/constants/wings";

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
  const [newIcon, setNewIcon] = useState("\u{1F3E0}");
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
    setNewIcon("\u{1F3E0}");
    setShowNewIconPicker(false);
  };

  const handleDelete = (roomId: string) => {
    deleteRoom(wing.id, roomId);
    setConfirmDelete(null);
  };

  const iconPicker = (currentIcon: string, onPick: (icon: string) => void) => (
    <div style={{ background: T.color.white, borderRadius: 12, border: `1px solid ${T.color.cream}`, padding: isMobile ? 8 : 10, display: "grid", gridTemplateColumns: isMobile ? "repeat(6,1fr)" : "repeat(8,1fr)", gap: isMobile ? 6 : 4, maxHeight: isMobile ? 200 : 160, overflowY: "auto", marginTop: 6 }}>
      {EMOJI_PRESETS.map((e, i) => (
        <button key={i} onClick={() => onPick(e)}
          style={{ width: isMobile ? 40 : 32, height: isMobile ? 40 : 32, borderRadius: 6, border: e === currentIcon ? `2px solid ${accent}` : "1px solid transparent", background: e === currentIcon ? `${accent}15` : "transparent", fontSize: isMobile ? 20 : 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {e}
        </button>
      ))}
    </div>
  );

  return (
    <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(42,34,24,.4)", backdropFilter: "blur(8px)", zIndex: 55, animation: "fadeIn .2s ease" }}>
      <div onClick={e => e.stopPropagation()} style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: isMobile ? "100%" : "min(400px, 92vw)", background: `${T.color.linen}f8`, backdropFilter: "blur(20px)", borderLeft: isMobile ? "none" : `1px solid ${T.color.cream}`, padding: isMobile ? "20px 16px" : "28px 24px", overflowY: "auto", animation: "slideInRight .3s cubic-bezier(.23,1,.32,1)" }}>
        <style>{`@keyframes slideInRight{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}`}</style>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h3 style={{ fontFamily: T.font.display, fontSize: 22, fontWeight: 500, color: T.color.charcoal, margin: 0 }}>{t("manageRooms")}</h3>
            <p style={{ fontFamily: T.font.body, fontSize: 12, color: accent, margin: "4px 0 0" }}>{t("wingLabel", { icon: wing.icon, name: wing.name })}</p>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ width: isMobile ? 40 : 32, height: isMobile ? 40 : 32, borderRadius: isMobile ? 20 : 16, border: `1px solid ${T.color.cream}`, background: T.color.warmStone, color: T.color.muted, fontSize: isMobile ? 16 : 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", minWidth: 44, minHeight: 44 }}>{"\u2715"}</button>
        </div>

        {/* Room count */}
        <div style={{ fontFamily: T.font.body, fontSize: 11, color: T.color.muted, marginBottom: 16 }}>
          {t("roomCount", { current: String(rooms.length), max: String(MAX_ROOMS_PER_WING) })}
          <div style={{ height: 3, background: T.color.cream, borderRadius: 2, marginTop: 6 }}>
            <div style={{ height: "100%", background: accent, borderRadius: 2, width: `${(rooms.length / MAX_ROOMS_PER_WING) * 100}%`, transition: "width .3s" }} />
          </div>
        </div>

        {/* Room list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
          {rooms.map((room, i) => (
            <div key={room.id} style={{ background: T.color.white, borderRadius: 12, border: `1px solid ${T.color.cream}`, padding: "12px 14px", transition: "all .15s" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {/* Icon button */}
                <button onClick={() => { setPickingIconId(pickingIconId === room.id ? null : room.id); setEditingId(null); setAdding(false); }}
                  style={{ width: 38, height: 38, borderRadius: 10, border: `1px solid ${T.color.cream}`, background: pickingIconId === room.id ? `${accent}12` : T.color.warmStone, fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all .15s" }}
                  title={t("changeIcon")}>
                  {room.icon}
                </button>

                {/* Name */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {editingId === room.id ? (
                    <form onSubmit={e => { e.preventDefault(); saveEdit(room.id); }} style={{ display: "flex", gap: 6 }}>
                      <input value={editName} onChange={e => setEditName(e.target.value)} autoFocus
                        onBlur={() => saveEdit(room.id)}
                        style={{ flex: 1, padding: "6px 10px", borderRadius: 8, border: `1.5px solid ${accent}`, background: T.color.white, fontFamily: T.font.body, fontSize: 13, color: T.color.charcoal, outline: "none" }} />
                    </form>
                  ) : (
                    <div onClick={() => startEdit(room.id, room.name)}
                      style={{ fontFamily: T.font.body, fontSize: 13, color: T.color.charcoal, cursor: "text", padding: "4px 0" }}
                      title={t("clickToRename")}>
                      {room.name}
                    </div>
                  )}
                  <div style={{ fontFamily: T.font.body, fontSize: 10, color: T.color.muted, marginTop: 1 }}>
                    {room.shared ? t("shared", { count: String(room.sharedWith.length) }) : t("private")}
                    {" \u00B7 "}{room.id}
                  </div>
                </div>

                {/* Reorder buttons */}
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <button onClick={() => reorderRoom(wing.id, room.id, -1)} disabled={i === 0} aria-label="Move up"
                    style={{ width: isMobile ? 32 : 22, height: isMobile ? 26 : 18, borderRadius: 4, border: "none", background: i === 0 ? "transparent" : T.color.warmStone, color: i === 0 ? T.color.cream : T.color.muted, fontSize: isMobile ? 11 : 9, cursor: i === 0 ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{"\u25B2"}</button>
                  <button onClick={() => reorderRoom(wing.id, room.id, 1)} disabled={i === rooms.length - 1} aria-label="Move down"
                    style={{ width: isMobile ? 32 : 22, height: isMobile ? 26 : 18, borderRadius: 4, border: "none", background: i === rooms.length - 1 ? "transparent" : T.color.warmStone, color: i === rooms.length - 1 ? T.color.cream : T.color.muted, fontSize: isMobile ? 11 : 9, cursor: i === rooms.length - 1 ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{"\u25BC"}</button>
                </div>

                {/* Enter room */}
                {onEnterRoom && (
                  <button onClick={() => { onEnterRoom(room.id); onClose(); }}
                    style={{ width: isMobile ? 38 : 30, height: isMobile ? 38 : 30, borderRadius: 8, border: `1px solid ${T.color.cream}`, background: T.color.warmStone, color: T.color.muted, fontSize: isMobile ? 14 : 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", minWidth: 44, minHeight: 44 }}
                    title={t("enterRoom")} aria-label={t("enterRoom")}>{"\u279C"}</button>
                )}

                {/* Delete button */}
                {rooms.length > 1 && (
                  <button onClick={() => setConfirmDelete(confirmDelete === room.id ? null : room.id)}
                    style={{ width: isMobile ? 38 : 30, height: isMobile ? 38 : 30, borderRadius: 8, border: confirmDelete === room.id ? "1px solid #D0606080" : `1px solid ${T.color.cream}`, background: confirmDelete === room.id ? "#D0606010" : "transparent", color: confirmDelete === room.id ? "#C05050" : T.color.muted, fontSize: isMobile ? 14 : 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", minWidth: 44, minHeight: 44 }}
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
                <div style={{ marginTop: 8, padding: "8px 10px", background: "#FDF0F0", borderRadius: 8, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: T.font.body, fontSize: 11, color: "#C05050", flex: 1 }}>{t("deleteConfirm", { name: room.name })}</span>
                  <button onClick={() => handleDelete(room.id)}
                    style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: "#C05050", color: "#FFF", fontFamily: T.font.body, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{tc("delete")}</button>
                  <button onClick={() => setConfirmDelete(null)}
                    style={{ padding: "5px 10px", borderRadius: 6, border: `1px solid ${T.color.cream}`, background: T.color.white, color: T.color.muted, fontFamily: T.font.body, fontSize: 11, cursor: "pointer" }}>{tc("cancel")}</button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add room section */}
        {adding ? (
          <div style={{ background: T.color.white, borderRadius: 12, border: `1.5px solid ${accent}40`, padding: 16 }}>
            <div style={{ fontFamily: T.font.body, fontSize: 11, color: T.color.muted, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 10 }}>{t("newRoom")}</div>

            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
              <button onClick={() => setShowNewIconPicker(!showNewIconPicker)}
                style={{ width: 42, height: 42, borderRadius: 10, border: `1px solid ${T.color.cream}`, background: T.color.warmStone, fontSize: 22, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                title={t("chooseIcon")}>
                {newIcon}
              </button>
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder={t("roomNamePlaceholder")} autoFocus
                onKeyDown={e => { if (e.key === "Enter") handleAdd(); }}
                style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: `1px solid ${T.color.cream}`, background: T.color.white, fontFamily: T.font.body, fontSize: 14, color: T.color.charcoal, outline: "none" }} />
            </div>

            {showNewIconPicker && iconPicker(newIcon, (icon) => { setNewIcon(icon); setShowNewIconPicker(false); })}

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button onClick={() => { setAdding(false); setNewName(""); setShowNewIconPicker(false); }}
                style={{ flex: 1, padding: 10, borderRadius: 10, border: `1px solid ${T.color.cream}`, background: "transparent", fontFamily: T.font.body, fontSize: 12, color: T.color.muted, cursor: "pointer" }}>{tc("cancel")}</button>
              <button onClick={handleAdd} disabled={!newName.trim()}
                style={{ flex: 2, padding: 10, borderRadius: 10, border: "none", background: newName.trim() ? accent : `${T.color.sandstone}40`, color: newName.trim() ? "#FFF" : T.color.muted, fontFamily: T.font.body, fontSize: 12, fontWeight: 600, cursor: newName.trim() ? "pointer" : "default" }}>{t("addRoomButton")}</button>
            </div>
          </div>
        ) : canAdd ? (
          <button onClick={() => { setAdding(true); setEditingId(null); setPickingIconId(null); setConfirmDelete(null); }}
            style={{ width: "100%", padding: 14, borderRadius: 12, border: `1.5px dashed ${accent}50`, background: `${accent}06`, color: accent, fontFamily: T.font.body, fontSize: 13, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "all .15s" }}>
            {t("addRoom")}
          </button>
        ) : (
          <div style={{ fontFamily: T.font.body, fontSize: 11, color: T.color.muted, textAlign: "center", padding: 12 }}>
            {t("maxRoomsReached", { max: String(MAX_ROOMS_PER_WING) })}
          </div>
        )}
      </div>
    </div>
  );
}
