"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { acceptInvite } from "@/lib/auth/invite-actions";
import { createClient } from "@/lib/supabase/client";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { WINGS as DEFAULT_WINGS } from "@/lib/constants/wings";
import RoomPlacementPicker from "@/components/ui/RoomPlacementPicker";

import { T } from "@/lib/theme";

interface InviteResult {
  error?: string;
  invite?: {
    id: string;
    permission: string;
    status: string;
    message: string | null;
    createdAt: string;
    recipientEmail: string;
  };
  inviter?: { name: string; avatarUrl: string | null };
  room?: { name: string };
  wing?: { name: string; icon: string };
  memoryCount?: number;
}

export default function InviteLanding({ shareId, result }: { shareId: string; result: InviteResult }) {
  const router = useRouter();
  const { t, locale } = useTranslation("invite");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [showPlacement, setShowPlacement] = useState(false);
  const [userWings, setUserWings] = useState<Array<{ id: string; slug: string; name: string; icon: string; accent: string }>>([]);
  const [placementLoading, setPlacementLoading] = useState(false);

  // Check if user is already logged in
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setIsLoggedIn(true);
    });
  }, []);

  // If the invite was already accepted, show that
  const alreadyAccepted = result.invite?.status === "accepted";

  const fetchUserWings = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("wings")
      .select("id, slug, custom_name, accent_color, sort_order")
      .order("sort_order");

    if (data && data.length > 0) {
      return data.map((w: { id: string; slug: string; custom_name: string | null; accent_color: string | null }) => {
        const defaultWing = DEFAULT_WINGS.find((dw) => dw.id === w.slug);
        return {
          id: w.id,
          slug: w.slug,
          name: w.custom_name || defaultWing?.name || w.slug,
          icon: defaultWing?.icon || "",
          accent: w.accent_color || defaultWing?.accent || "#8B7355",
        };
      });
    }
    // Fallback: return default wings if no DB wings found
    return DEFAULT_WINGS.map((dw) => ({
      id: dw.id,
      slug: dw.id,
      name: dw.name,
      icon: dw.icon,
      accent: dw.accent,
    }));
  };

  const handleAccept = async () => {
    setAccepting(true);
    setAcceptError(null);
    try {
      const wings = await fetchUserWings();
      setUserWings(wings);
      setShowPlacement(true);
    } catch {
      setAcceptError(t("failedToLoadWings"));
    }
    setAccepting(false);
  };

  const handlePlacement = async (wingId: string) => {
    setPlacementLoading(true);
    setAcceptError(null);
    // acceptInvite signature will be updated to accept optional placedInWingId
    const res = await (acceptInvite as (sid: string, wid?: string) => Promise<unknown>)(shareId, wingId) as { error?: string; success?: boolean; alreadyAccepted?: boolean };
    if (res.error) {
      if (res.alreadyAccepted) {
        setAccepted(true);
      } else {
        setAcceptError(res.error);
      }
    } else {
      setAccepted(true);
    }
    setPlacementLoading(false);
    setShowPlacement(false);
  };

  const handleCreateSharedWing = () => {
    // For now, create a "shared" wing placement
    // This will be expanded when the shared wing creation flow is built
    handlePlacement("shared");
  };

  const handleGoToPalace = () => {
    router.push("/atrium");
  };

  const getTimeAgo = (dateStr: string): string => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t("justNow");
    if (mins < 60) return t("minutesAgo", { count: String(mins) });
    const hours = Math.floor(mins / 60);
    if (hours < 24) return t("hoursAgo", { count: String(hours) });
    const days = Math.floor(hours / 24);
    if (days === 1) return t("yesterday");
    if (days < 7) return t("daysAgo", { count: String(days) });
    return new Date(dateStr).toLocaleDateString(locale, { month: "short", day: "numeric" });
  };

  // Error state
  if (result.error) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem", textAlign: "center" }}>&#x1F3DB;&#xFE0F;</div>
          <h1 style={headingStyle}>{t("notFound")}</h1>
          <p style={bodyTextStyle}>
            {result.error === "Invitation not found"
              ? t("notFoundDesc")
              : result.error}
          </p>
          <a href="/login" style={primaryBtnStyle}>
            {t("visitPalace")}
          </a>
        </div>
        <Footer t={t} />
      </div>
    );
  }

  const { invite, inviter, room, wing, memoryCount } = result as Required<InviteResult>;
  const permLabel = invite.permission === "contribute" ? t("viewContribute") : t("view");
  const initial = inviter.name.charAt(0).toUpperCase();
  const timeAgo = getTimeAgo(invite.createdAt);

  // Accepted state
  if (accepted || alreadyAccepted) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem", textAlign: "center" }}>&#x2728;</div>
          <h1 style={headingStyle}>{t("welcome")}</h1>
          <p style={bodyTextStyle}>
            {t("accessGranted", { room: room.name, name: inviter.name })}
          </p>
          <button onClick={handleGoToPalace} style={primaryBtnStyle}>
            {t("enterPalace")}
          </button>
        </div>
        <Footer t={t} />
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @keyframes pulse{0%,100%{opacity:.4}50%{opacity:.7}}
      `}</style>

      <div style={{ ...cardStyle, animation: "fadeUp .6s ease" }}>
        {/* Decorative header */}
        <div style={{
          background: "linear-gradient(135deg, #C66B3D 0%, #8B7355 60%, #4A6741 100%)",
          margin: "-2.25rem -2rem 1.75rem",
          padding: "2.25rem 2rem 2rem",
          borderRadius: "1.25rem 1.25rem 0 0",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Subtle arch decoration */}
          <div style={{
            position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
            width: 300, height: 300, borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.08)",
            pointerEvents: "none",
          }} />
          <div style={{
            position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
            width: 240, height: 240, borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.05)",
            pointerEvents: "none",
          }} />

          <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>&#x1F3DB;&#xFE0F;</div>
          <p style={{
            fontFamily: T.font.body, fontSize: "0.75rem", color: "rgba(255,255,255,0.7)",
            textTransform: "uppercase", letterSpacing: 1.5, margin: "0 0 8px",
          }}>
            {t("youveBeenInvited")}
          </p>
          <h1 style={{
            fontFamily: T.font.display, fontSize: "1.5rem", fontWeight: 500,
            color: "#FFFFFF", margin: 0, lineHeight: 1.4,
          }}>
            {t("wantsToShare", { name: inviter.name })}
          </h1>
        </div>

        {/* Inviter info */}
        <div style={{
          display: "flex", alignItems: "center", gap: "0.875rem",
          padding: "1rem 1.125rem", background: T.color.warmStone,
          borderRadius: "0.875rem", border: `1px solid ${T.color.cream}`,
          marginBottom: "1.25rem",
        }}>
          <div style={{
            width: "3rem", height: "3rem", borderRadius: "1.5rem",
            background: `linear-gradient(135deg, ${T.color.terracotta}30, ${T.color.walnut}20)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: T.font.display, fontSize: "1.25rem", fontWeight: 600,
            color: T.color.terracotta, flexShrink: 0,
          }}>
            {initial}
          </div>
          <div>
            <div style={{ fontFamily: T.font.body, fontSize: "0.9375rem", fontWeight: 600, color: T.color.charcoal }}>
              {inviter.name}
            </div>
            <div style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.muted }}>
              {t("invitedYou", { timeAgo })}
            </div>
          </div>
        </div>

        {/* Room card */}
        <div style={{
          padding: "1.25rem", background: T.color.linen,
          borderRadius: "0.875rem", border: `1px solid ${T.color.cream}`,
          marginBottom: "1.25rem", textAlign: "center",
        }}>
          {wing.icon && <div style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>{wing.icon}</div>}
          <div style={{
            fontFamily: T.font.display, fontSize: "1.25rem", fontWeight: 600,
            color: T.color.charcoal, marginBottom: "0.25rem",
          }}>
            {room.name}
          </div>
          {wing.name && (
            <div style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.muted, marginBottom: "0.625rem" }}>
              {t("wing", { name: wing.name })}
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "center", gap: "0.75rem" }}>
            <span style={{
              padding: "0.25rem 0.75rem", borderRadius: "1.25rem",
              background: `${T.color.terracotta}15`, fontFamily: T.font.body,
              fontSize: "0.75rem", color: T.color.terracotta,
            }}>
              {memoryCount === 1
                ? t("memoryCount", { count: String(memoryCount) })
                : t("memoriesCount", { count: String(memoryCount) })}
            </span>
            <span style={{
              padding: "0.25rem 0.75rem", borderRadius: "1.25rem",
              background: invite.permission === "contribute" ? `${T.color.sage}15` : `${T.color.walnut}15`,
              fontFamily: T.font.body, fontSize: "0.75rem",
              color: invite.permission === "contribute" ? T.color.sage : T.color.walnut,
            }}>
              {t("canPermission", { permission: permLabel })}
            </span>
          </div>
        </div>

        {/* Personal message */}
        {invite.message && (
          <div style={{
            padding: "1rem 1.25rem", background: T.color.warmStone,
            borderRadius: "0.875rem", border: `1px solid ${T.color.cream}`,
            borderLeft: `3px solid ${T.color.terracotta}`,
            marginBottom: "1.25rem",
          }}>
            <p style={{
              fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.muted,
              textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 6px",
            }}>
              {t("says", { name: inviter.name })}
            </p>
            <p style={{
              fontFamily: T.font.display, fontSize: "1rem", fontStyle: "italic",
              color: T.color.charcoal, margin: 0, lineHeight: 1.6,
            }}>
              &ldquo;{invite.message}&rdquo;
            </p>
          </div>
        )}

        {/* Blurred preview teaser */}
        <div style={{
          padding: "1.75rem 1.25rem", borderRadius: "0.875rem",
          background: `linear-gradient(135deg, ${T.color.sandstone}40, ${T.color.warmStone}60)`,
          border: `1px solid ${T.color.cream}`,
          marginBottom: "1.5rem", textAlign: "center",
          position: "relative", overflow: "hidden",
        }}>
          {/* Decorative blurred "memory" blobs */}
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
            {[
              { left: "15%", top: "20%", bg: T.color.terracotta },
              { left: "55%", top: "30%", bg: T.color.sage },
              { left: "35%", top: "60%", bg: T.color.walnut },
              { left: "75%", top: "50%", bg: T.color.sandstone },
            ].map((b, i) => (
              <div key={i} style={{
                position: "absolute", left: b.left, top: b.top,
                width: 40, height: 40, borderRadius: 8,
                background: `${b.bg}25`, filter: "blur(8px)",
                animation: `pulse ${2 + i * 0.5}s ease-in-out infinite`,
              }} />
            ))}
          </div>
          <p style={{
            fontFamily: T.font.display, fontSize: "0.9375rem", fontStyle: "italic",
            color: T.color.walnut, margin: 0, position: "relative", zIndex: 1,
          }}>
            {t("memoriesWaiting")}
          </p>
        </div>

        {/* Accept error */}
        {acceptError && (
          <div role="alert" style={{
            padding: "0.625rem 0.875rem", borderRadius: "0.625rem",
            background: "#FDF2F2", border: "1px solid #FECACA",
            color: "#B91C1C", fontSize: "0.8125rem", marginBottom: "1rem",
          }}>
            {acceptError}
          </div>
        )}

        {/* CTAs */}
        {isLoggedIn ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
            <button onClick={handleAccept} disabled={accepting} style={{
              ...primaryBtnStyle,
              opacity: accepting ? 0.6 : 1,
              cursor: accepting ? "default" : "pointer",
            }}>
              {accepting ? t("accepting") : t("acceptInvitation")}
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
            <a href={`/login?redirect=/invite/${shareId}`} style={primaryBtnStyle}>
              {t("acceptAndSignIn")}
            </a>
            <a href={`/register?redirect=/invite/${shareId}`} style={secondaryBtnStyle}>
              {t("acceptAndCreate")}
            </a>
          </div>
        )}
      </div>

      <Footer t={t} />

      {showPlacement && (
        <RoomPlacementPicker
          wings={userWings}
          onSelect={handlePlacement}
          onCreateSharedWing={handleCreateSharedWing}
          onClose={() => setShowPlacement(false)}
          loading={placementLoading}
        />
      )}
    </div>
  );
}

function Footer({ t }: { t: (key: string) => string }) {
  return (
    <p style={{
      fontFamily: "'Cormorant Garamond', Georgia, serif",
      fontSize: "0.875rem", fontStyle: "italic",
      color: "#9A9183", marginTop: "1.5rem", textAlign: "center",
    }}>
      {t("tagline")}
    </p>
  );
}

// ── Styles ──

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  background: "linear-gradient(165deg, #FAFAF7 0%, #F2EDE7 50%, #D4C5B2 100%)",
  fontFamily: "'Manrope', -apple-system, BlinkMacSystemFont, sans-serif",
  padding: "1.25rem",
  position: "relative",
  overflow: "hidden",
};

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "30rem",
  padding: "2.25rem 2rem",
  background: "rgba(255,255,255,0.92)",
  backdropFilter: "blur(20px)",
  borderRadius: "1.25rem",
  border: "1px solid #EEEAE3",
  boxShadow: "0 12px 48px rgba(44,44,42,0.15)",
  position: "relative",
  zIndex: 1,
};

const headingStyle: React.CSSProperties = {
  fontFamily: "'Cormorant Garamond', Georgia, serif",
  fontSize: "1.625rem",
  fontWeight: 500,
  color: "#2C2C2A",
  margin: "0 0 0.75rem",
  textAlign: "center",
  lineHeight: 1.3,
};

const bodyTextStyle: React.CSSProperties = {
  fontFamily: "'Manrope', -apple-system, BlinkMacSystemFont, sans-serif",
  fontSize: "0.9375rem",
  color: "#9A9183",
  lineHeight: 1.6,
  textAlign: "center",
  margin: "0 0 1.5rem",
};

const primaryBtnStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "1rem 1.5rem",
  borderRadius: "0.875rem",
  border: "none",
  background: "linear-gradient(135deg, #C66B3D, #8B7355)",
  color: "#FFFFFF",
  fontFamily: "'Manrope', -apple-system, BlinkMacSystemFont, sans-serif",
  fontSize: "1rem",
  fontWeight: 600,
  cursor: "pointer",
  textAlign: "center",
  textDecoration: "none",
  boxShadow: "0 4px 16px rgba(198,107,61,0.3)",
  transition: "all 0.2s",
};

const secondaryBtnStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "0.875rem 1.5rem",
  borderRadius: "0.875rem",
  border: "1.5px solid #D4C5B2",
  background: "#FFFFFF",
  color: "#8B7355",
  fontFamily: "'Manrope', -apple-system, BlinkMacSystemFont, sans-serif",
  fontSize: "0.9375rem",
  fontWeight: 600,
  cursor: "pointer",
  textAlign: "center",
  textDecoration: "none",
  transition: "all 0.2s",
};
