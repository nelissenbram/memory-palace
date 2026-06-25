"use client";

import React from "react";
import { T } from "@/lib/theme";

interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Convenience: sets inputMode/autoComplete/autoCapitalize for email fields. */
  email?: boolean;
}

/**
 * Shared text input that bakes in the mobile ergonomics components keep forgetting:
 * 16px font (no iOS zoom), correct inputMode/autoComplete/autoCapitalize for email, and an
 * enterKeyHint pass-through. Visual styling matches the warm theme but can be overridden.
 */
export const TextField = React.forwardRef<HTMLInputElement, TextFieldProps>(
  function TextField({ email, style, type = "text", ...rest }, ref) {
    const emailProps = email
      ? { inputMode: "email" as const, autoComplete: rest.autoComplete ?? "email", autoCapitalize: "none", autoCorrect: "off", spellCheck: false }
      : {};
    return (
      <input
        ref={ref}
        type={email ? "email" : type}
        {...emailProps}
        {...rest}
        style={{
          width: "100%",
          fontFamily: T.font.body,
          fontSize: "16px",
          padding: "0.75rem 1rem",
          borderRadius: T.radius.md,
          border: `1px solid ${T.color.sandstone}`,
          background: T.color.white,
          color: T.color.charcoal,
          outline: "none",
          boxSizing: "border-box",
          minHeight: T.touch,
          ...style,
        }}
      />
    );
  },
);
