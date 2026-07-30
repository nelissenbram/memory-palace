"use client";
import { useState } from "react";
import { T } from "@/lib/theme";
import { confirmDialog } from "@/lib/ui/confirm";
import { useIsMobile, useIsTablet } from "@/lib/hooks/useIsMobile";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import { useRoomStore } from "@/lib/stores/roomStore";
import { WINGS } from "@/lib/constants/wings";
import { WingIcon, WING_ICON_MAP } from "./WingRoomIcons";

// Canonical emoji for each standard SVG-icon key (roots/nest/craft/...). Wing
// icons are stored across the whole app as the raw emoji string ({wing.icon}),
// so the "Standard" icon buttons must persist the matching emoji — never the
// SVG-map key — or every other surface would render the literal text "roots".
const WING_KEY_TO_EMOJI: Record<string, string> = Object.fromEntries(
  Object.keys(WING_ICON_MAP)
    .map(key => [key, WINGS.find(w => w.id === key)?.icon])
    .filter((e): e is [string, string] => Boolean(e[1])),
);

// Reverse lookup: canonical emoji -> SVG-map key, so the standard glyph renders
// even though wing.icon is stored as the emoji.
const EMOJI_TO_WING_KEY: Record<string, string> = Object.fromEntries(
  Object.entries(WING_KEY_TO_EMOJI).map(([key, emoji]) => [emoji, key]),
);

/**
 * Renders a wing icon. If the stored value is a standard SVG-map key (or the
 * emoji that maps back to one) it draws the crafted glyph; otherwise it renders
 * the raw emoji character, so a user's custom emoji is shown faithfully.
 */
function WingGlyph({ icon, size, color }: { icon: string; size: number; color: string }) {
  if (WING_ICON_MAP[icon]) {
    return <WingIcon wingId={icon} size={size} color={color} />;
  }
  const svgKey = EMOJI_TO_WING_KEY[icon];
  if (svgKey) {
    return <WingIcon wingId={svgKey} size={size} color={color} />;
  }
  return (
    <span aria-hidden style={{ fontSize: `${size / 16}rem`, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {icon}
    </span>
  );
}

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
  { color: "#C66B3D", nameKey: "terracotta" },
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
  // Treat tablet-touch (iPad portrait 768–1024, coarse pointer) as mobile for
  // SIZING so controls meet the 2.75rem touch floor and the panel goes wide.
  const isTablet = useIsTablet();
  const touch = isMobile || isTablet;
  const { t } = useTranslation("wingManager");
  const { t: tc } = useTranslation("common");
  const { containerRef, handleKeyDown } = useFocusTrap(true);
  const { getWings, renameWing, changeWingIcon, changeWingAccent, changeWingDesc, addWing, deleteWing, extraWings } = useRoomStore();
  const wings = getWings();
  const extraWingIds = new Set(extraWings.map(w => w.id));

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [pickingIconId, setPickingIconId] = useState<string | null>(null);
  const [pickingColorId, setPickingColorId] = useState<string | null>(null);
  const [newWingName, setNewWingName] = useState("");

  const STANDARD_WING_IDS = Object.keys(WING_ICON_MAP);
  // Count non-attic wings for the limit
  const wingCount = wings.filter(w => w.id !== "attic").length;
  const canAddWing = wingCount < 7;

  const startEdit = (id: string, name: string, desc?: string) => {
    setEditingId(id);
    setEditName(name);
    setEditDesc(desc || "");
    setPickingIconId(null);
    setPickingColorId(null);
  };

  const saveEdit = (id: string) => {
    // Guard against double-commit (input onBlur can fire alongside form submit
    // or the icon/color-swatch click that also commits).
    if (editingId !== id) return;
    if (editName.trim()) renameWing(id, editName);
    changeWingDesc(id, editDesc);
    setEditingId(null);
  };

  const [showEmoji, setShowEmoji] = useState(false);

  const iconPicker = (currentIcon: string, onPick: (icon: string) => void) => (
    <div role="radiogroup" aria-label={t("changeIcon")} style={{ background: T.color.white, borderRadius: "0.75rem", border: `1px solid ${T.color.hairline}`, padding: touch ? "0.5rem" : "0.625rem", marginTop: "0.375rem" }}>
      {/* Standard SVG wing icons — prominent */}
      <div style={{ marginBottom: "0.625rem" }}>
        <span style={{ fontSize: "0.75rem", color: T.color.ink, fontWeight: 600, letterSpacing: "0.03em" }}>{t("standardIcons")}</span>
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.375rem", flexWrap: "wrap" }}>
          {STANDARD_WING_IDS.map(id => {
            // Persist the canonical emoji (fall back to the key only if no emoji
            // is mapped) so every other surface — which renders wing.icon as a
            // raw string — shows the icon correctly. Selection matches either
            // representation.
            const emoji = WING_KEY_TO_EMOJI[id];
            const selected = currentIcon === id || (emoji != null && currentIcon === emoji);
            return (
              <button key={id} onClick={() => onPick(emoji ?? id)} role="radio" aria-checked={selected}
                style={{ width: touch ? "3rem" : "2.5rem", height: touch ? "3rem" : "2.5rem", borderRadius: "0.5rem", border: selected ? `2px solid ${T.color.ember}` : `1px solid ${T.color.hairline}`, background: selected ? `${T.color.ember}15` : T.color.warmStone, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s" }}>
                <WingIcon wingId={id} size={touch ? 22 : 20} color={selected ? T.color.ember : T.color.walnut} />
              </button>
            );
          })}
        </div>
      </div>
      {/* Custom emoji icons — collapsed by default */}
      <div>
        <button onClick={() => setShowEmoji(!showEmoji)} aria-expanded={showEmoji} style={{ background: "none", border: "none", cursor: "pointer", padding: "0.125rem 0", display: "flex", alignItems: "center", gap: "0.25rem" }}>
          <span style={{ fontSize: "0.625rem", color: T.color.inkMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{t("customEmoji")}</span>
          <span style={{ fontSize: "0.5rem", color: T.color.inkMuted, transform: showEmoji ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .15s", display: "inline-block" }}>{"\u25BC"}</span>
        </button>
        {showEmoji && (
          <div style={{ display: "grid", gridTemplateColumns: touch ? "repeat(5,1fr)" : "repeat(8,1fr)", gap: touch ? "0.375rem" : "0.25rem", maxHeight: touch ? "9rem" : "5rem", overflowY: "auto", marginTop: "0.25rem" }}>
            {EMOJI_PRESETS.map((e, i) => (
              <button key={i} onClick={() => onPick(e)} role="radio" aria-checked={e === currentIcon}
                style={{ width: touch ? "2.75rem" : "1.75rem", height: touch ? "2.75rem" : "1.75rem", borderRadius: "0.375rem", border: e === currentIcon ? `2px solid ${T.color.ember}` : "1px solid transparent", background: e === currentIcon ? `${T.color.ember}15` : "transparent", fontSize: touch ? "1rem" : "0.875rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {e}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const colorPicker = (currentColor: string, onPick: (color: string) => void) => (
    <div role="radiogroup" aria-label={t("changeAccent")} style={{ background: T.color.white, borderRadius: "0.75rem", border: `1px solid ${T.color.hairline}`, padding: touch ? "0.5rem" : "0.625rem", display: "grid", gridTemplateColumns: touch ? "repeat(6,1fr)" : "repeat(8,1fr)", gap: touch ? "0.5rem" : "0.375rem", marginTop: "0.375rem" }}>
      {ACCENT_PALETTE.map((p, i) => (
        <button key={i} onClick={() => onPick(p.color)} title={t(p.nameKey)} role="radio" aria-checked={p.color === currentColor} aria-label={t(p.nameKey)}
          style={{
            width: touch ? "2.75rem" : "2rem", height: touch ? "2.75rem" : "2rem", borderRadius: touch ? "1.375rem" : "1rem", border: p.color === currentColor ? `3px solid ${T.color.ink}` : "2px solid transparent",
            background: p.color, cursor: "pointer", boxShadow: p.color === currentColor ? `0 0 0 2px ${T.color.white}, 0 2px 8px ${p.color}60` : "0 1px 4px rgba(64,59,54,.12)",
            transition: "all .15s",
          }}
        />
      ))}
    </div>
  );

  return (
    <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(42,34,24,.4)", backdropFilter: "blur(8px)", zIndex: 55, animation: "fadeIn .2s ease" }}>
      <div ref={containerRef} className="mp-scroll" role="dialog" aria-modal="true" aria-label={t("title")} onKeyDown={(e) => { if (e.key === "Escape") onClose(); handleKeyDown(e); }} onClick={e => e.stopPropagation()} style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: touch ? "100%" : "26.25rem", background: `${T.color.linen}f8`, backdropFilter: "blur(20px)", borderLeft: touch ? "none" : `1px solid ${T.color.hairline}`, paddingTop: `max(${touch ? "1.25rem" : "1.75rem"}, env(safe-area-inset-top, 0px))`, paddingBottom: `max(${touch ? "1.25rem" : "1.75rem"}, env(safe-area-inset-bottom, 0px))`, paddingLeft: `max(${touch ? "1rem" : "1.5rem"}, env(safe-area-inset-left, 0px))`, paddingRight: `max(${touch ? "1rem" : "1.5rem"}, env(safe-area-inset-right, 0px))`, overflowY: "auto", animation: "slideInRight .3s cubic-bezier(.23,1,.32,1)" }}>
        <style>{`@keyframes slideInRight{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}@media (prefers-reduced-motion: reduce){[role=dialog]{animation:none !important}}`}</style>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <div>
            <h3 style={{ fontFamily: T.font.display, fontSize: "1.375rem", fontWeight: 500, color: T.color.ink, margin: 0 }}>{t("title")}</h3>
            <p style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.inkMuted, margin: "0.25rem 0 0" }}>{t("description")}</p>
          </div>
          <button onClick={onClose} aria-label={tc("close")} style={{ width: touch ? "2.75rem" : "2rem", height: touch ? "2.75rem" : "2rem", borderRadius: touch ? "1.375rem" : "1rem", border: `1px solid ${T.color.hairline}`, background: T.color.warmStone, color: T.color.inkMuted, fontSize: touch ? "1rem" : "0.875rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", minWidth: "2.75rem", minHeight: "2.75rem" }}>{"\u2715"}</button>
        </div>

        {/* Wing list */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
          {wings.filter(w => w.id !== "attic").map(wing => (
            <div key={wing.id} style={{ background: T.color.white, borderRadius: "0.875rem", border: `1px solid ${T.color.hairline}`, padding: "0.875rem 1rem", transition: "all .15s" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                {/* Icon button */}
                <button onClick={() => { if (editingId === wing.id) saveEdit(wing.id); setPickingIconId(pickingIconId === wing.id ? null : wing.id); setEditingId(null); setPickingColorId(null); }}
                  aria-label={t("changeIcon")}
                  style={{
                    width: "2.75rem", height: "2.75rem", borderRadius: "0.75rem", border: `1.5px solid ${pickingIconId === wing.id ? wing.accent : T.color.hairline}`,
                    background: pickingIconId === wing.id ? `${wing.accent}12` : T.color.warmStone,
                    fontSize: "1.375rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all .15s",
                  }}
                  title={t("changeIcon")}>
                  <WingGlyph icon={wing.icon} size={24} color={wing.accent} />
                </button>

                {/* Name */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {editingId === wing.id ? (
                    <form onSubmit={e => { e.preventDefault(); saveEdit(wing.id); }} style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                      <input value={editName} onChange={e => setEditName(e.target.value)} autoFocus
                        onBlur={() => { if (editingId === wing.id) saveEdit(wing.id); }}
                        style={{ flex: 1, padding: "0.375rem 0.625rem", borderRadius: "0.5rem", border: `1.5px solid ${wing.accent}`, background: T.color.white, fontFamily: T.font.body, fontSize: "1rem", color: T.color.ink, outline: "none" }} />
                      <div>
                        <label htmlFor={`wing-subtitle-${wing.id}`} style={{ fontFamily: T.font.body, fontSize: "0.625rem", color: T.color.inkMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{t("editSubtitle")}</label>
                        <textarea id={`wing-subtitle-${wing.id}`} value={editDesc} onChange={e => setEditDesc(e.target.value)}
                          onBlur={() => saveEdit(wing.id)}
                          placeholder={t("subtitlePlaceholder")}
                          rows={2}
                          style={{ width: "100%", padding: "0.375rem 0.625rem", borderRadius: "0.5rem", border: `1px solid ${T.color.hairline}`, background: T.color.white, fontFamily: T.font.body, fontSize: "1rem", color: T.color.ink, outline: "none", resize: "none", marginTop: "0.125rem" }} />
                      </div>
                    </form>
                  ) : (
                    <div role="button" tabIndex={0} onClick={() => startEdit(wing.id, wing.name, wing.desc)}
                      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); startEdit(wing.id, wing.name, wing.desc); } }}
                      style={{ fontFamily: T.font.display, fontSize: "0.9375rem", fontWeight: 500, color: T.color.ink, cursor: "text", padding: "0.125rem 0" }}
                      title={t("clickToRename")}>
                      {wing.name} {t("wing")}
                    </div>
                  )}
                  <div style={{ fontFamily: T.font.body, fontSize: "0.625rem", color: T.color.inkMuted, marginTop: "0.125rem" }}>
                    {wing.desc} {"\u00B7"} {wing.id}
                  </div>
                </div>

                {/* Accent color swatch — 2.75rem tap area with a smaller colored dot inside */}
                <button onClick={() => { if (editingId === wing.id) saveEdit(wing.id); setPickingColorId(pickingColorId === wing.id ? null : wing.id); setPickingIconId(null); setEditingId(null); }}
                  aria-label={t("changeAccent")}
                  style={{
                    minWidth: "2.75rem", minHeight: "2.75rem", width: "2.75rem", height: "2.75rem", borderRadius: "1.375rem", border: "none", padding: 0,
                    background: "transparent", cursor: "pointer", flexShrink: 0, transition: "all .15s",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                  title={t("changeAccent")}>
                  <span style={{
                    width: "1.75rem", height: "1.75rem", borderRadius: "0.875rem", display: "block",
                    border: pickingColorId === wing.id ? `2px solid ${T.color.ink}` : `2px solid ${T.color.hairline}`,
                    background: wing.accent,
                    boxShadow: pickingColorId === wing.id ? `0 0 0 2px ${T.color.white}, 0 2px 8px ${wing.accent}60` : `0 1px 4px ${wing.accent}30`,
                  }} />
                </button>
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

              {/* Delete button for custom wings */}
              {extraWingIds.has(wing.id) && (
                <button
                  onClick={async () => { if (await confirmDialog({ message: t("deleteConfirm"), destructive: true })) deleteWing(wing.id); }}
                  style={{
                    marginTop: "0.5rem", padding: "0.375rem 0.75rem",
                    borderRadius: "0.5rem", border: `1px solid ${T.color.error}30`,
                    background: `${T.color.error}08`, color: T.color.error,
                    fontSize: "0.6875rem", fontWeight: 600, fontFamily: T.font.body,
                    cursor: "pointer", width: "100%",
                    transition: "all .15s",
                  }}
                >
                  {t("deleteWing")}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Add Wing section */}
        {canAddWing ? (
          <div style={{
            marginTop: "1rem", padding: "1rem",
            background: T.color.white, borderRadius: "0.875rem",
            border: `1.5px dashed ${T.color.ember}55`,
          }}>
            <div style={{
              fontFamily: T.font.display, fontSize: "0.875rem", fontWeight: 600,
              color: T.color.ink, marginBottom: "0.5rem",
            }}>
              {t("addWingTitle")}
            </div>
            <form onSubmit={e => {
              e.preventDefault();
              if (!newWingName.trim()) return;
              addWing(newWingName.trim(), "\uD83C\uDFDB\uFE0F", ACCENT_PALETTE[Math.floor(Math.random() * ACCENT_PALETTE.length)].color);
              setNewWingName("");
            }} style={{ display: "flex", gap: "0.5rem" }}>
              <input
                value={newWingName}
                onChange={e => setNewWingName(e.target.value)}
                placeholder={t("newWingPlaceholder")}
                style={{
                  flex: 1, padding: "0.5rem 0.75rem",
                  borderRadius: "0.5rem", border: `1.5px solid ${T.color.hairline}`,
                  background: T.color.linen, fontFamily: T.font.body,
                  fontSize: "1rem", color: T.color.ink, outline: "none",
                }}
              />
              <button type="submit" disabled={!newWingName.trim()} style={{
                padding: "0.5rem 1rem", borderRadius: "0.5rem", minHeight: "2.75rem",
                border: "none", background: newWingName.trim() ? T.color.ember : T.color.cream,
                color: newWingName.trim() ? T.color.cream : T.color.inkMuted,
                fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600,
                cursor: newWingName.trim() ? "pointer" : "default",
                transition: "all .15s",
              }}>
                {tc("add")}
              </button>
            </form>
            <div style={{
              fontFamily: T.font.body, fontSize: "0.625rem", color: T.color.inkMuted,
              marginTop: "0.375rem",
            }}>
              {t("wingLimit", { current: String(wingCount), max: "7" })}
            </div>
          </div>
        ) : (
          <div style={{
            marginTop: "1rem", padding: "0.75rem 1rem",
            background: `${T.color.warmStone}80`, borderRadius: "0.875rem",
            fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.inkMuted,
            textAlign: "center",
          }}>
            {t("maxWingsReached", { max: "7" })}
          </div>
        )}

        {/* Footer hint */}
        <div style={{ marginTop: "1.25rem", padding: "0.75rem 1rem", background: `${T.color.warmStone}80`, borderRadius: "0.625rem", fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.inkMuted, lineHeight: 1.5 }}>
          {t("hint")}
        </div>
      </div>
    </div>
  );
}
