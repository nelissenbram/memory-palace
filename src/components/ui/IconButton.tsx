"use client";

import React from "react";
import { T } from "@/lib/theme";

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Keep the visual control its natural size but guarantee a 44pt hit area. */
  round?: boolean;
}

/**
 * Reset <button> with a guaranteed 44pt touch target, centered content. Use for icon-only
 * controls (close X, remove, toggles) so they always meet Apple's minimum on a phone.
 */
export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton({ round, style, children, ...rest }, ref) {
    return (
      <button
        ref={ref}
        {...rest}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          minWidth: T.touch,
          minHeight: T.touch,
          padding: 0,
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "inherit",
          borderRadius: round ? "50%" : T.radius.sm,
          ...style,
        }}
      >
        {children}
      </button>
    );
  },
);
