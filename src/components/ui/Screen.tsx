"use client";

import React from "react";
import { T } from "@/lib/theme";

interface ScreenProps {
  children: React.ReactNode;
  /** Reserve space for a fixed bottom nav bar in addition to the safe-area inset. */
  bottomNav?: boolean;
  /** Constrain content width and center it. */
  maxWidth?: string;
  style?: React.CSSProperties;
  className?: string;
}

/**
 * Scrollable page container that honors the top/bottom safe-area and a responsive gutter, so
 * content never renders under the Dynamic Island or home indicator. Use for document-flow
 * pages (public/visit/profile/legal/pricing/settings content) — especially logged-out share
 * landings that otherwise get no top inset.
 */
export function Screen({ children, bottomNav, maxWidth, style, className }: ScreenProps) {
  return (
    <div
      className={`mp-scroll ${className || ""}`}
      style={{
        minHeight: "100dvh",
        paddingTop: `max(${T.space.lg}, ${T.safe.top})`,
        paddingLeft: `max(${T.layout.gutter}, ${T.safe.left})`,
        paddingRight: `max(${T.layout.gutter}, ${T.safe.right})`,
        paddingBottom: bottomNav
          ? `calc(${T.layout.bottomBarH} + ${T.space.lg} + ${T.safe.bottom})`
          : `max(${T.space.lg}, ${T.safe.bottom})`,
        boxSizing: "border-box",
        ...style,
      }}
    >
      <div style={{ maxWidth: maxWidth || "64rem", marginLeft: "auto", marginRight: "auto", width: "100%" }}>
        {children}
      </div>
    </div>
  );
}
