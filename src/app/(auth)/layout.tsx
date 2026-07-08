import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: {
    template: "%s - The Memory Palace",
    default: "Sign In - The Memory Palace",
  },
  description:
    "Sign in or create an account to preserve your most precious memories in The Memory Palace.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Skip auth check if Supabase isn't configured yet
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    const supabase = await createClient();
    // S3 fix: time-box getUser. App Router withholds ALL html above this await, so
    // a slow/hung Supabase call on a flaky WKWebView network blocks the whole
    // /login document — only the root #mp-loading veil paints, then its 4s backstop
    // fades it to a blank cream screen. Middleware (4s) and the (app) layout (3.5s)
    // were hardened for this; this segment was missed. Fail OPEN on timeout: render
    // the public login form (no private data here; middleware guards real routes).
    const result = await Promise.race([
      supabase.auth.getUser().then((r) => r.data.user ?? null).catch(() => null),
      new Promise<"timeout">((resolve) => setTimeout(() => resolve("timeout"), 3500)),
    ]);

    if (result !== "timeout" && result) {
      redirect("/atrium");
    }
  }

  return (
    <div
      className="mp-scroll"
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(165deg, #FAFAF7 0%, #F2EDE7 50%, #D4C5B2 100%)",
        fontFamily: "'Manrope', -apple-system, BlinkMacSystemFont, sans-serif",
        position: "relative",
        overflowX: "hidden",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
        paddingBottom: "max(1.5rem, env(safe-area-inset-bottom, 0px))",
      }}
    >
      {/* Decorative blobs */}
      <div
        style={{
          position: "absolute",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(198,107,61,0.08) 0%, transparent 70%)",
          top: -100,
          right: -100,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 300,
          height: 300,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(74,103,65,0.06) 0%, transparent 70%)",
          bottom: -80,
          left: -80,
          pointerEvents: "none",
        }}
      />

      <main
        id="main-content"
        style={{
          width: "100%",
          maxWidth: 440,
          padding: "40px 36px",
          background: "rgba(250,250,247,0.85)",
          backdropFilter: "blur(20px)",
          borderRadius: 20,
          border: "1px solid #EEEAE3",
          boxShadow: "0 8px 32px rgba(44,44,42,0.12)",
          position: "relative",
          zIndex: 1,
          margin: "20px",
        }}
      >
        {children}
      </main>
    </div>
  );
}
