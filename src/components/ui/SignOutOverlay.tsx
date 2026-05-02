"use client";
import { T } from "@/lib/theme";

export default function SignOutOverlay() {
  return (
    <div role="alert" aria-live="assertive" style={{
      position: "fixed", inset: 0, zIndex: 99999,
      background: "rgba(26,25,23,0.92)",
      backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: "1.5rem",
    }}>
      <style>{`
        @keyframes mp-signout-spin { to { transform: rotate(360deg) } }
        @keyframes mp-signout-bar { 0% { width: 0% } 100% { width: 100% } }
      `}</style>
      {/* Spinner */}
      <div style={{
        width: "2.5rem", height: "2.5rem",
        border: `3px solid rgba(255,255,255,0.1)`,
        borderTopColor: T.color.terracotta,
        borderRadius: "50%",
        animation: "mp-signout-spin 0.8s linear infinite",
      }} />
      <p style={{
        fontFamily: T.font.display, fontSize: "1.125rem", fontWeight: 500,
        color: "#F2EDE7", letterSpacing: "0.04em", margin: 0,
      }}>
        Signing out&hellip;
      </p>
      {/* Progress bar */}
      <div style={{
        width: "12rem", height: "3px", borderRadius: "2px",
        background: "rgba(255,255,255,0.08)", overflow: "hidden",
      }}>
        <div style={{
          height: "100%", borderRadius: "2px",
          background: `linear-gradient(90deg, ${T.color.terracotta}, ${T.color.gold})`,
          animation: "mp-signout-bar 2.5s ease-out forwards",
        }} />
      </div>
    </div>
  );
}
