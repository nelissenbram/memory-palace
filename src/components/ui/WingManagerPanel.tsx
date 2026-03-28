"use client";
import { useState } from "react";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useRoomStore } from "@/lib/stores/roomStore";

const EMOJI_PRESETS = [
  // Home & Family
  "\u{1F468}\u200D\u{1F469}\u200D\u{1F467}\u200D\u{1F466}","\u{1F3E0}","\u{1F384}","\u{1F382}","\u{1F476}","\u{1F46A}","\u2764\uFE0F","\u{1F370}",
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

const ACCENT_PALETTE = [
  { color: "#C17F59", nameKey: "terracotta" },
  { color: "#4A6741", nameKey: "forest" },
  { color: "#B8926A", nameKey: "sand" },
  { color: "#8B7355", nameKey: "walnut" },
  { color: "#9B6B8E", nameKey: "mauve" },
  { color: "#5A7898", nameKey: "slateBlue" },
  { color: "#7A5A3A", nameKey: "bronze" },
  { color: "#6A8848", nameKey: "olive" },
  { color: "#B85A5A", nameKey: "brick" },
  { color: "#5A6A8A", nameKey: "steel" },
  { color: "#8A6A4A", nameKey: "cognac" },
  { color: "#6A5A7A", nameKey: "plum" },
  { color: "#4A8A7A", nameKey: "teal" },
  { color: "#AA7A4A", nameKey: "amber" },
  { color: "#7A4A5A", nameKey: "wine" },
  { color: "#5A8A5A", nameKey: "sage" },
];

interface WingManagerPanelProps {
  onClose: () => void;
}

export default function WingManagerPanel({ onClose }: WingManagerPanelProps) {
  const isMobile = useIsMobile();
  const { t } = useTranslation("wingManager");
  const { getWings, renameWing, changeWingIcon, changeWingAccent } = useRoomStore();
  const wings = getWings();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [pickingIconId, setPickingIconId] = useState<string | null>(null);
  const [pickingColorId, setPickingColorId] = useState<string | null>(null);

  const startEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditName(name);
    setPickingIconId(null);
    setPickingColorId(null);
  };

  const saveEdit = (id: string) => {
    if (editName.trim()) renameWing(id, editName);
    setEditingId(null);
  };

  const iconPicker = (currentIcon: string, onPick: (icon: string) => void) => (
    <div style={{ background: T.color.white, borderRadius: 12, border: `1px solid ${T.color.cream}`, padding: isMobile ? 8 : 10, display: "grid", gridTemplateColumns: isMobile ? "repeat(6,1fr)" : "repeat(8,1fr)", gap: isMobile ? 6 : 4, maxHeight: isMobile ? 200 : 160, overflowY: "auto", marginTop: 6 }}>
      {EMOJI_PRESETS.map((e, i) => (
        <button key={i} onClick={() => onPick(e)}
          style={{ width: isMobile ? 40 : 32, height: isMobile ? 40 : 32, borderRadius: 6, border: e === currentIcon ? `2px solid ${T.color.terracotta}` : "1px solid transparent", background: e === currentIcon ? `${T.color.terracotta}15` : "transparent", fontSize: isMobile ? 20 : 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {e}
        </button>
      ))}
    </div>
  );

  const colorPicker = (currentColor: string, onPick: (color: string) => void) => (
    <div style={{ background: T.color.white, borderRadius: 12, border: `1px solid ${T.color.cream}`, padding: isMobile ? 8 : 10, display: "grid", gridTemplateColumns: isMobile ? "repeat(6,1fr)" : "repeat(8,1fr)", gap: isMobile ? 8 : 6, marginTop: 6 }}>
      {ACCENT_PALETTE.map((p, i) => (
        <button key={i} onClick={() => onPick(p.color)} title={t(p.nameKey)}
          style={{
            width: isMobile ? 38 : 32, height: isMobile ? 38 : 32, borderRadius: isMobile ? 19 : 16, border: p.color === currentColor ? "3px solid #3A2818" : "2px solid transparent",
            background: p.color, cursor: "pointer", boxShadow: p.color === currentColor ? `0 0 0 2px ${T.color.white}, 0 2px 8px ${p.color}60` : "0 1px 4px rgba(0,0,0,.12)",
            transition: "all .15s",
          }}
        />
      ))}
    </div>
  );

  return (
    <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(42,34,24,.4)", backdropFilter: "blur(8px)", zIndex: 55, animation: "fadeIn .2s ease" }}>
      <div onClick={e => e.stopPropagation()} style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: isMobile ? "100%" : 420, background: `${T.color.linen}f8`, backdropFilter: "blur(20px)", borderLeft: isMobile ? "none" : `1px solid ${T.color.cream}`, padding: isMobile ? "20px 16px" : "28px 24px", overflowY: "auto", animation: "slideInRight .3s cubic-bezier(.23,1,.32,1)" }}>
        <style>{`@keyframes slideInRight{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}`}</style>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h3 style={{ fontFamily: T.font.display, fontSize: 22, fontWeight: 500, color: T.color.charcoal, margin: 0 }}>{t("title")}</h3>
            <p style={{ fontFamily: T.font.body, fontSize: 12, color: T.color.muted, margin: "4px 0 0" }}>{t("description")}</p>
          </div>
          <button onClick={onClose} style={{ width: isMobile ? 40 : 32, height: isMobile ? 40 : 32, borderRadius: isMobile ? 20 : 16, border: `1px solid ${T.color.cream}`, background: T.color.warmStone, color: T.color.muted, fontSize: isMobile ? 16 : 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", minWidth: 44, minHeight: 44 }}>{"\u2715"}</button>
        </div>

        {/* Wing list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {wings.map(wing => (
            <div key={wing.id} style={{ background: T.color.white, borderRadius: 14, border: `1px solid ${T.color.cream}`, padding: "14px 16px", transition: "all .15s" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {/* Icon button */}
                <button onClick={() => { setPickingIconId(pickingIconId === wing.id ? null : wing.id); setEditingId(null); setPickingColorId(null); }}
                  style={{
                    width: 44, height: 44, borderRadius: 12, border: `1.5px solid ${pickingIconId === wing.id ? wing.accent : T.color.cream}`,
                    background: pickingIconId === wing.id ? `${wing.accent}12` : T.color.warmStone,
                    fontSize: 22, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all .15s",
                  }}
                  title={t("changeIcon")}>
                  {wing.icon}
                </button>

                {/* Name */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {editingId === wing.id ? (
                    <form onSubmit={e => { e.preventDefault(); saveEdit(wing.id); }} style={{ display: "flex", gap: 6 }}>
                      <input value={editName} onChange={e => setEditName(e.target.value)} autoFocus
                        onBlur={() => saveEdit(wing.id)}
                        style={{ flex: 1, padding: "6px 10px", borderRadius: 8, border: `1.5px solid ${wing.accent}`, background: T.color.white, fontFamily: T.font.body, fontSize: 14, color: T.color.charcoal, outline: "none" }} />
                    </form>
                  ) : (
                    <div onClick={() => startEdit(wing.id, wing.name)}
                      style={{ fontFamily: T.font.display, fontSize: 15, fontWeight: 500, color: T.color.charcoal, cursor: "text", padding: "2px 0" }}
                      title={t("clickToRename")}>
                      {wing.name} {t("wing")}
                    </div>
                  )}
                  <div style={{ fontFamily: T.font.body, fontSize: 10, color: T.color.muted, marginTop: 2 }}>
                    {wing.desc} {"\u00B7"} {wing.id}
                  </div>
                </div>

                {/* Accent color swatch */}
                <button onClick={() => { setPickingColorId(pickingColorId === wing.id ? null : wing.id); setPickingIconId(null); setEditingId(null); }}
                  style={{
                    width: 28, height: 28, borderRadius: 14, border: pickingColorId === wing.id ? "2px solid #3A2818" : `2px solid ${T.color.cream}`,
                    background: wing.accent, cursor: "pointer", flexShrink: 0, transition: "all .15s",
                    boxShadow: pickingColorId === wing.id ? `0 0 0 2px ${T.color.white}, 0 2px 8px ${wing.accent}60` : `0 1px 4px ${wing.accent}30`,
                  }}
                  title={t("changeAccent")} />
              </div>

              {/* Icon picker (expanded) */}
              {pickingIconId === wing.id && iconPicker(wing.icon, (icon) => {
                changeWingIcon(wing.id, icon);
                setPickingIconId(null);
              })}

              {/* Color picker (expanded) */}
              {pickingColorId === wing.id && colorPicker(wing.accent, (color) => {
                changeWingAccent(wing.id, color);
                setPickingColorId(null);
              })}
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <div style={{ marginTop: 20, padding: "12px 16px", background: `${T.color.warmStone}80`, borderRadius: 10, fontFamily: T.font.body, fontSize: 11, color: T.color.muted, lineHeight: 1.5 }}>
          {t("hint")}
        </div>
      </div>
    </div>
  );
}
