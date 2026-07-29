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
          "linear-gradient(165deg, #FCFAF5 0%, #F2EDE4 50%, #E5DDD0 100%)",
        fontFamily: "'Source Sans 3', -apple-system, BlinkMacSystemFont, sans-serif",
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
          maxWidth: "27.5rem",
          padding: "2.5rem 2.25rem",
          background: "rgba(252,250,245,0.85)",
          backdropFilter: "blur(20px)",
          borderRadius: "1.25rem",
          border: "1px solid #E3D6BC",
          boxShadow: "0 0.5rem 1.5rem rgba(64,59,54,0.14)",
          position: "relative",
          zIndex: 1,
          margin: "1.25rem",
        }}
      >
        {children}
      </main>
    </div>
  );
}
