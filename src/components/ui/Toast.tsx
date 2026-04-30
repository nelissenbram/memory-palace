"use client";

import { useEffect } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";

export interface ToastData {
  message: string;
  type: "success" | "error" | "warning";
}

interface ToastProps {
  message: string;
  type: "success" | "error" | "warning";
  onDismiss: () => void;
}

const BG: Record<ToastData["type"], string> = {
  success: T.color.sage,
  error: T.color.error,
  warning: T.color.terracotta,
};

const FG: Record<ToastData["type"], string> = {
  success: "#FFF",
  error: "#FFF",
  warning: T.color.charcoal,
};

const ICON: Record<ToastData["type"], string> = {
  success: "\u2713",
  error: "\u26A0",
  warning: "\u26A0",
};

export default function Toast({ message, type, onDismiss }: ToastProps) {
  const { t: tc } = useTranslation("common");

  // Auto-dismiss after 4 seconds (errors persist until manually dismissed)
  useEffect(() => {
    if (type === "error") return;
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss, type]);

  const isError = type === "error";

  return (
    <>
      <div
        role={isError ? "alert" : "status"}
        aria-live="polite"
        style={{
          position: "fixed",
          top: "1.5rem",
          right: "1.5rem",
          zIndex: 100,
          padding: "0.875rem 1.25rem",
          borderRadius: "0.75rem",
          background: BG[type],
          color: FG[type],
          fontFamily: T.font.body,
          fontSize: "0.875rem",
          fontWeight: 500,
          boxShadow: "0 0.5rem 1.5rem rgba(0,0,0,.15)",
          animation: "toastFadeIn .2s ease",
          display: "flex",
          alignItems: "center",
          gap: "0.625rem",
        }}
      >
        <span aria-hidden="true">{ICON[type]}</span>
        {message}
        <button
          onClick={onDismiss}
          aria-label={tc("close")}
          style={{
            background: "none",
            border: "none",
            color: FG[type],
            fontSize: "0.875rem",
            cursor: "pointer",
            marginLeft: "0.5rem",
            opacity: 0.7,
            minWidth: "2.75rem",
            minHeight: "2.75rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
          }}
        >
          {"\u2715"}
        </button>
      </div>
      <style>{`
        @keyframes toastFadeIn { from { opacity: 0; transform: translateY(-0.5rem); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </>
  );
}
