import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  // Sanitize and limit length
  const safeTitle = (searchParams.get("title") || "Memory Palace").slice(0, 80).replace(/[<>&"']/g, "");
  const safeSubtitle = (searchParams.get("subtitle") || "").slice(0, 120).replace(/[<>&"']/g, "");
  const safeOwner = (searchParams.get("owner") || "").slice(0, 40).replace(/[<>&"']/g, "");
  const type = searchParams.get("type") || "palace";

  // Palace-themed colors
  const gold = "#D4AF37";
  const charcoal = "#1F1B1A";
  const cream = "#FCFAF5";
  const linen = "#F2EDE4";
  const walnut = "#8B7355";

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200",
          height: "630",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: `linear-gradient(135deg, ${linen} 0%, ${cream} 50%, ${linen} 100%)`,
          fontFamily: "Georgia, serif",
          position: "relative",
        }}
      >
        {/* Gold top border */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "6px",
            background: `linear-gradient(90deg, transparent, ${gold}, transparent)`,
          }}
        />

        {/* Type badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "16px",
            padding: "6px 20px",
            borderRadius: "20px",
            background: `${gold}20`,
            border: `1px solid ${gold}40`,
            color: walnut,
            fontSize: "18px",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          {type === "wing" ? "Wing" : type === "room" ? "Room" : type === "profile" ? "Profile" : "Palace"}
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: "56px",
            fontWeight: 700,
            color: charcoal,
            textAlign: "center",
            maxWidth: "900px",
            lineHeight: 1.2,
            marginBottom: "12px",
          }}
        >
          {safeTitle}
        </div>

        {/* Subtitle */}
        {safeSubtitle && (
          <div
            style={{
              fontSize: "24px",
              color: walnut,
              textAlign: "center",
              maxWidth: "700px",
              lineHeight: 1.4,
              marginBottom: "16px",
            }}
          >
            {safeSubtitle}
          </div>
        )}

        {/* Owner */}
        {safeOwner && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginTop: "8px",
              fontSize: "20px",
              color: walnut,
            }}
          >
            by {safeOwner}
          </div>
        )}

        {/* Gold accent line */}
        <div
          style={{
            width: "80px",
            height: "3px",
            background: `linear-gradient(90deg, ${gold}, transparent)`,
            borderRadius: "2px",
            marginTop: "24px",
          }}
        />

        {/* Branding */}
        <div
          style={{
            position: "absolute",
            bottom: "24px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "16px",
            color: `${walnut}80`,
            letterSpacing: "0.05em",
          }}
        >
          thememorypalace.ai
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    }
  );
}
