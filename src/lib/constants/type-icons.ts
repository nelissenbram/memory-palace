import React from "react";

/** Shared type-to-icon mapping used in LibraryView and LibraryCards */
export const TYPE_ICONS: Record<string, string> = {
  photo: "\u{1F5BC}\uFE0F",
  video: "\u{1F3AC}",
  album: "\u{1F4D6}",
  orb: "\u{1F52E}",
  case: "\u{1F3FA}",
  voice: "\u{1F399}\uFE0F",
  interview: "\u{1F4AC}",
  document: "\u{1F4DC}",
  audio: "\u{1F3B5}",
  painting: "\u{1F3A8}",
  text: "\u{1F4DD}",
};

/** SVG icon component for media types — Tuscan line-art style */
export function TypeIcon({ type, size = 14, color = "currentColor" }: {
  type: string; size?: number; color?: string;
}) {
  const s = size;
  const props = { width: s, height: s, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  switch (type) {
    case "photo":
      return React.createElement("svg", props,
        React.createElement("rect", { x: 3, y: 3, width: 18, height: 18, rx: 2 }),
        React.createElement("circle", { cx: 8.5, cy: 8.5, r: 1.5 }),
        React.createElement("path", { d: "M21 15l-5-5L5 21" }),
      );
    case "video":
      return React.createElement("svg", props,
        React.createElement("polygon", { points: "23 7 16 12 23 17 23 7", fill: color, stroke: "none", opacity: 0.5 }),
        React.createElement("rect", { x: 1, y: 5, width: 15, height: 14, rx: 2 }),
        React.createElement("polygon", { points: "23 7 16 12 23 17 23 7" }),
      );
    case "interview":
      return React.createElement("svg", props,
        React.createElement("path", { d: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" }),
        React.createElement("line", { x1: 8, y1: 8, x2: 16, y2: 8 }),
        React.createElement("line", { x1: 8, y1: 12, x2: 13, y2: 12 }),
      );
    case "audio":
    case "voice":
      return React.createElement("svg", props,
        React.createElement("path", { d: "M9 18V5l12-2v13" }),
        React.createElement("circle", { cx: 6, cy: 18, r: 3 }),
        React.createElement("circle", { cx: 18, cy: 16, r: 3 }),
      );
    case "document":
      return React.createElement("svg", props,
        React.createElement("path", { d: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" }),
        React.createElement("path", { d: "M14 2v6h6" }),
        React.createElement("line", { x1: 8, y1: 13, x2: 16, y2: 13 }),
        React.createElement("line", { x1: 8, y1: 17, x2: 12, y2: 17 }),
      );
    case "text":
      return React.createElement("svg", props,
        React.createElement("path", { d: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" }),
        React.createElement("path", { d: "M14 2v6h6" }),
        React.createElement("line", { x1: 8, y1: 13, x2: 16, y2: 13 }),
        React.createElement("line", { x1: 8, y1: 17, x2: 16, y2: 17 }),
      );
    case "album":
      return React.createElement("svg", props,
        React.createElement("path", { d: "M4 19.5A2.5 2.5 0 016.5 17H20" }),
        React.createElement("path", { d: "M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" }),
      );
    case "painting":
      return React.createElement("svg", props,
        React.createElement("path", { d: "M12 19l7-7 3 3-7 7-3-3z" }),
        React.createElement("path", { d: "M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" }),
        React.createElement("path", { d: "M2 2l7.586 7.586" }),
        React.createElement("circle", { cx: 11, cy: 11, r: 2 }),
      );
    case "orb":
      return React.createElement("svg", props,
        React.createElement("circle", { cx: 12, cy: 12, r: 10 }),
        React.createElement("path", { d: "M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" }),
        React.createElement("line", { x1: 2, y1: 12, x2: 22, y2: 12 }),
      );
    case "case":
      return React.createElement("svg", props,
        React.createElement("path", { d: "M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" }),
        React.createElement("path", { d: "M3.27 6.96L12 12.01l8.73-5.05" }),
        React.createElement("line", { x1: 12, y1: 22.08, x2: 12, y2: 12 }),
      );
    default:
      return React.createElement("svg", props,
        React.createElement("path", { d: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" }),
        React.createElement("path", { d: "M14 2v6h6" }),
      );
  }
}
