"use client";

import { useTranslation } from "@/lib/hooks/useTranslation";

export default function OfflinePage() {
  const { t } = useTranslation("offline");
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#FAFAF7",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      {/* Decorative arch icon */}
      <div
        style={{
          width: 80,
          height: 100,
          border: "3px solid #C66B3D",
          borderRadius: "40px 40px 0 0",
          marginBottom: "2rem",
          position: "relative",
          opacity: 0.7,
        }}
      >
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: 2,
            height: 40,
            backgroundColor: "#C66B3D",
            opacity: 0.4,
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 20,
            left: "50%",
            transform: "translateX(-50%)",
            width: 6,
            height: 6,
            borderRadius: "50%",
            backgroundColor: "#C66B3D",
            opacity: 0.6,
          }}
        />
      </div>

      <h1
        style={{
          fontFamily: "var(--font-display), 'Cormorant Garamond', serif",
          fontSize: "clamp(1.75rem, 5vw, 2.5rem)",
          fontWeight: 500,
          color: "#1a1a1a",
          marginBottom: "0.75rem",
          letterSpacing: "-0.01em",
        }}
      >
        {t("title")}
      </h1>

      <p
        style={{
          fontFamily: "var(--font-body), 'Manrope', -apple-system, BlinkMacSystemFont, sans-serif",
          fontSize: "1.1rem",
          fontWeight: 500,
          color: "#666",
          maxWidth: 420,
          lineHeight: 1.6,
          marginBottom: "0.5rem",
        }}
      >
        {t("message")}
      </p>

      <p
        style={{
          fontFamily: "var(--font-body), 'Manrope', -apple-system, BlinkMacSystemFont, sans-serif",
          fontSize: "1rem",
          fontWeight: 500,
          color: "#888",
          maxWidth: 400,
          lineHeight: 1.6,
          marginBottom: "2.5rem",
        }}
      >
        {t("reassurance")}
      </p>

      <button
        onClick={() => window.location.reload()}
        style={{
          fontFamily: "var(--font-body), 'Manrope', -apple-system, BlinkMacSystemFont, sans-serif",
          fontSize: "0.95rem",
          fontWeight: 500,
          color: "#FAFAF7",
          backgroundColor: "#C66B3D",
          border: "none",
          borderRadius: 8,
          padding: "0.75rem 2rem",
          cursor: "pointer",
          letterSpacing: "0.02em",
          transition: "opacity 0.2s ease",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
      >
        {t("retry")}
      </button>

      <p
        style={{
          fontFamily: "var(--font-body), 'Manrope', -apple-system, BlinkMacSystemFont, sans-serif",
          fontSize: "0.8rem",
          color: "#aaa",
          marginTop: "3rem",
        }}
      >
        {t("brand")}
      </p>
    </div>
  );
}
