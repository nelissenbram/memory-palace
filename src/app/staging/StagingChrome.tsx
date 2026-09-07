"use client";

/**
 * App chrome overlay for the /staging review viewers (`?chrome=1`).
 *
 * The landing carousel's "Explore all the Views" promises app views, so a bare
 * 3D render reads as a picture of the engine rather than a screenshot of the
 * product. The previous shots were real in-app captures, but reproducing them
 * meant driving the logged-in app — slow, fragile, and it twice overwrote real
 * deliverables with the wrong screen.
 *
 * Rendering the chrome here instead keeps the whole shot login-free and
 * reproducible. Matched against the original shot-2 (commit 19899b4): cream
 * compass bar with PALACE › WING, a lock and share button, the walk joystick,
 * and the Media pill. Deliberately presentational — no stores, no auth.
 */
export default function StagingChrome({
  wing,
  room,
  showJoystick = true,
  showMedia = true,
}: {
  /** Omit on the exterior — there is no wing yet, so no "› WING" segment. */
  wing?: string;
  room?: string;
  showJoystick?: boolean;
  showMedia?: boolean;
}) {
  const CREAM = "#F3EDE1";
  const INK = "#4A4038";
  const EMBER = "#B8642F";

  const roundBtn: React.CSSProperties = {
    width: 44, height: 44, borderRadius: "50%", background: CREAM,
    display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: "0 2px 8px rgba(0,0,0,.18)",
  };

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 5 }}>
      {/* compass bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 46, background: CREAM,
        display: "flex", alignItems: "center", gap: 7, padding: "0 14px",
        fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 13.5, letterSpacing: 1.1,
        color: INK, boxShadow: "0 1px 6px rgba(0,0,0,.10)",
      }}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth="1.6">
          <path d="M3 21h18M4 21V10m16 11V10M2 10l10-6 10 6M8 21v-6h3v6m5 0v-6h-3" />
        </svg>
        <span style={{ fontWeight: 600 }}>PALACE</span>
        {wing && (<>
          <span style={{ opacity: 0.45 }}>›</span>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={EMBER} strokeWidth="1.7">
            <circle cx="12" cy="9" r="4" /><path d="M12 13v8M8 21h8" />
          </svg>
          <span style={{ color: EMBER, fontWeight: 700 }}>{wing}</span>
        </>)}
        {room && (<><span style={{ opacity: 0.45 }}>›</span><span style={{ color: EMBER, fontWeight: 700 }}>{room}</span></>)}
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth="1.8"
             style={{ marginLeft: "auto", opacity: 0.6 }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>

      {/* lock + share */}
      <div style={{ position: "absolute", top: 62, right: 14, display: "flex", gap: 10 }}>
        <div style={roundBtn}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth="1.7">
            <rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 018 0v4" />
          </svg>
        </div>
        <div style={roundBtn}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={EMBER} strokeWidth="1.7">
            <path d="M12 16V4M8 8l4-4 4 4M5 15v4a2 2 0 002 2h10a2 2 0 002-2v-4" />
          </svg>
        </div>
      </div>

      {/* walk joystick */}
      {showJoystick && (
        <div style={{
          position: "absolute", left: 18, bottom: 26, width: 96, height: 96, borderRadius: "50%",
          background: "rgba(28,24,20,.42)", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(240,234,222,.85)" }} />
        </div>
      )}

      {/* media pill */}
      {showMedia && (
        <div style={{
          position: "absolute", right: 16, bottom: 40, background: CREAM, borderRadius: 999,
          padding: "9px 16px", display: "flex", alignItems: "center", gap: 8,
          boxShadow: "0 2px 8px rgba(0,0,0,.18)",
          fontFamily: "system-ui, sans-serif", fontSize: 14, color: INK,
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill={EMBER}>
            <rect x="3" y="3" width="8" height="8" rx="1.5" /><rect x="13" y="3" width="8" height="8" rx="1.5" />
            <rect x="3" y="13" width="8" height="8" rx="1.5" /><rect x="13" y="13" width="8" height="8" rx="1.5" />
          </svg>
          Media
        </div>
      )}
    </div>
  );
}
