"use client";

import { T } from "@/lib/theme";

export default function NotificationsPage() {
  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{
          fontFamily: T.font.display, fontSize: 28, fontWeight: 500,
          color: T.color.charcoal, margin: "0 0 8px",
        }}>
          Notifications
        </h2>
        <p style={{
          fontFamily: T.font.body, fontSize: 15, color: T.color.muted,
          margin: 0, lineHeight: 1.5,
        }}>
          Choose how and when you would like to be notified.
        </p>
      </div>

      {/* Coming soon card */}
      <div style={{
        background: T.color.white,
        borderRadius: 16,
        border: `1px solid ${T.color.cream}`,
        padding: "48px 32px",
        boxShadow: "0 2px 8px rgba(44,44,42,.04)",
        textAlign: "center",
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>{"\u{1F514}"}</div>
        <h3 style={{
          fontFamily: T.font.display, fontSize: 22, fontWeight: 500,
          color: T.color.charcoal, margin: "0 0 10px",
        }}>
          Coming Soon
        </h3>
        <p style={{
          fontFamily: T.font.body, fontSize: 15, color: T.color.muted,
          margin: 0, maxWidth: 400, marginLeft: "auto", marginRight: "auto",
          lineHeight: 1.6,
        }}>
          Notification preferences will be available here soon. You will be able to control
          reminders, sharing alerts, and weekly memory prompts.
        </p>
      </div>
    </div>
  );
}
