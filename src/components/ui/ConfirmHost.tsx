"use client";

import { useEffect, useState } from "react";
import { subscribeConfirm, type ConfirmRequest } from "@/lib/ui/confirm";
import { T } from "@/lib/theme";

/** Renders branded confirmation dialogs requested via confirmDialog(). Mounted once in the root layout. */
export default function ConfirmHost() {
  const [req, setReq] = useState<ConfirmRequest | null>(null);

  useEffect(() => subscribeConfirm((r) => setReq(r)), []);

  if (!req) return null;
  const { opts, resolve } = req;
  const close = (value: boolean) => { resolve(value); setReq(null); };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={() => close(false)}
      style={{
        position: "fixed", inset: 0, zIndex: 100000,
        background: "rgba(20,16,12,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1rem", paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: "24rem",
          background: T.color.linen,
          border: `1px solid ${T.color.cream}`,
          borderRadius: "1rem",
          padding: "1.5rem",
          boxShadow: "0 1rem 3rem rgba(0,0,0,0.3)",
        }}
      >
        {opts.title && (
          <h3 style={{ fontFamily: T.font.display, fontSize: "1.125rem", fontWeight: 600, color: T.color.charcoal, margin: "0 0 0.5rem" }}>
            {opts.title}
          </h3>
        )}
        <p style={{ fontFamily: T.font.body, fontSize: "0.9375rem", color: T.color.walnut, lineHeight: 1.5, margin: "0 0 1.25rem" }}>
          {opts.message}
        </p>
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
          <button
            onClick={() => close(false)}
            style={{
              fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: 600,
              padding: "0.625rem 1.25rem", borderRadius: "0.625rem", minHeight: "2.75rem",
              border: `1px solid ${T.color.sandstone}`, background: "transparent",
              color: T.color.walnut, cursor: "pointer",
            }}
          >
            {opts.cancelText || "Cancel"}
          </button>
          <button
            onClick={() => close(true)}
            style={{
              fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: 600,
              padding: "0.625rem 1.25rem", borderRadius: "0.625rem", minHeight: "2.75rem",
              border: "none",
              background: opts.destructive ? T.color.error : T.color.terracotta,
              color: T.color.white, cursor: "pointer",
            }}
          >
            {opts.confirmText || "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
