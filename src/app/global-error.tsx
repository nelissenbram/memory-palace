"use client";

import { useEffect } from "react";

/**
 * Root global error boundary. Next.js renders this (replacing the root layout)
 * only when the root layout itself throws — the one place route-level error.tsx
 * cannot cover. Must render its own <html>/<body>.
 *
 * On a stale-chunk error we reload once (guarded) to fetch fresh chunks rather
 * than show a dead screen — critical for the live-load WKWebView where a web
 * deploy can rotate chunk hashes mid-session.
 */
function isChunkError(error: unknown): boolean {
  const m = (error as Error)?.message || String(error || "");
  return /Loading chunk|Loading CSS chunk|ChunkLoadError|Failed to fetch dynamically imported module|Failed to load chunk|importing a module script failed/i.test(m);
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (isChunkError(error)) {
      try {
        const KEY = "mp_ge_chunk_reload";
        const n = parseInt(sessionStorage.getItem(KEY) || "0", 10);
        if (n < 2) {
          sessionStorage.setItem(KEY, String(n + 1));
          const f = (window as unknown as { __mpForceReload?: () => void }).__mpForceReload;
          if (f) f();
          else window.location.reload();
        }
      } catch {
        window.location.reload();
      }
    }
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          background: "#F2EDE4",
          fontFamily: "-apple-system, system-ui, sans-serif",
          color: "#5C4A32",
        }}
      >
        <div style={{ maxWidth: "26rem", textAlign: "center" }}>
          <div aria-hidden style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>
            {"⚠️"}
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0 0 0.75rem" }}>
            The Memory Palace
          </h1>
          <p style={{ fontSize: "0.9375rem", color: "#8B7355", lineHeight: 1.6, margin: "0 0 1.5rem" }}>
            Something went wrong. Please try again.
          </p>
          <button
            onClick={() => {
              const f = (window as unknown as { __mpForceReload?: () => void }).__mpForceReload;
              if (f) f();
              else reset();
            }}
            style={{
              padding: "0.75rem 1.5rem",
              borderRadius: "0.75rem",
              border: "none",
              background: "#8B7355",
              color: "#fff",
              fontSize: "0.9375rem",
              fontWeight: 600,
              cursor: "pointer",
              minHeight: "2.75rem",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
