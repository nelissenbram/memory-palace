"use client";

import Link from "next/link";
import { T } from "@/lib/theme";

const F = T.font;
const C = T.color;

export default function DataDeletionPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.linen,
        fontFamily: F.body,
        color: C.charcoal,
        padding: "2rem",
        maxWidth: 720,
        margin: "0 auto",
      }}
    >
      <h1 style={{ fontFamily: F.display, fontSize: "2rem", marginBottom: "1.5rem" }}>
        Data Deletion Instructions
      </h1>

      <p style={{ lineHeight: 1.7, marginBottom: "1rem" }}>
        If you want to delete your data from <strong>The Memory Palace</strong>, you have the following options:
      </p>

      <h2 style={{ fontFamily: F.display, fontSize: "1.25rem", marginTop: "1.5rem", marginBottom: "0.75rem" }}>
        Option 1: Delete your account (removes all data)
      </h2>
      <ol style={{ lineHeight: 1.8, paddingLeft: "1.5rem", marginBottom: "1rem" }}>
        <li>Log in at <a href="https://thememorypalace.ai/login" style={{ color: C.terracotta }}>thememorypalace.ai</a></li>
        <li>Go to <strong>Settings</strong> &rarr; <strong>Profile</strong></li>
        <li>Scroll to the bottom and click <strong>&quot;Delete Account&quot;</strong></li>
        <li>Confirm deletion — all your data (memories, photos, recordings, family tree, palace) will be permanently removed</li>
      </ol>

      <h2 style={{ fontFamily: F.display, fontSize: "1.25rem", marginTop: "1.5rem", marginBottom: "0.75rem" }}>
        Option 2: Delete WhatsApp Kep data only
      </h2>
      <ol style={{ lineHeight: 1.8, paddingLeft: "1.5rem", marginBottom: "1rem" }}>
        <li>Send <strong>&quot;STOP KEP&quot;</strong> in the WhatsApp conversation to stop data collection</li>
        <li>Log in and go to <strong>Palace</strong> &rarr; <strong>Keps</strong></li>
        <li>Delete any captures or the entire Kep</li>
      </ol>

      <h2 style={{ fontFamily: F.display, fontSize: "1.25rem", marginTop: "1.5rem", marginBottom: "0.75rem" }}>
        Option 3: Contact us
      </h2>
      <p style={{ lineHeight: 1.7, marginBottom: "2rem" }}>
        Email <a href="mailto:privacy@thememorypalace.ai" style={{ color: C.terracotta }}>privacy@thememorypalace.ai</a> and
        we will delete your data within 30 days.
      </p>

      <hr style={{ border: "none", borderTop: `1px solid ${C.sandstone}`, margin: "2rem 0" }} />

      <p style={{ fontSize: "0.875rem", color: C.muted }}>
        See our full <Link href="/privacy" style={{ color: C.terracotta }}>Privacy Policy</Link> for details on how we handle your data.
      </p>
    </div>
  );
}
