"use client";
import type { CSSProperties, ReactNode } from "react";

/**
 * OPS-052 (owner-besluit 11-09: harde confirm): submit-knop voor destructieve
 * moderatie-acties. De pagina is een server component met form actions, dus de
 * bevestiging leeft in dit kleine client-eiland; annuleren voorkomt de submit.
 * Admin-only oppervlak (ADMIN_EMAILS) — bewust Engels, net als de rest van de
 * pagina; ook de knoppen groeien hiermee naar het 44px-touch-minimum.
 */
export default function ConfirmButton({
  confirmText,
  style,
  children,
}: {
  confirmText: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      style={{ minHeight: "2.75rem", ...style }}
      onClick={(e) => {
        if (!window.confirm(confirmText)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
