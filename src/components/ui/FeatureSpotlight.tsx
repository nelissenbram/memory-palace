"use client";
import { useState, useEffect } from "react";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";

const STORAGE_KEY = "mp_feature_spotlight";

interface SpotlightCard {
  id: string;
  icon: string;
  title: string;
  description: string;
  cta: string;
}

const CARDS: SpotlightCard[] = [
  {
    id: "import_photos",
    icon: "\u{1F4F7}",
    title: "Import Your Photos",
    description:
      "Bring in photos from your phone or computer. Upload one by one, or use Mass Import to add entire folders at once.",
    cta: "Open Import",
  },
  {
    id: "record_story",
    icon: "\u{1F3A4}",
    title: "Record Your Story",
    description:
      "Our AI interviewer guides you through your life story with thoughtful questions. Just talk — we turn it into memories.",
    cta: "Start Interview",
  },
  {
    id: "time_capsule",
    icon: "\u{1F4E6}",
    title: "Create a Time Capsule",
    description:
      "Fill a room with messages, photos, and videos for someone special. Set it to open on a future date.",
    cta: "Create One",
  },
  {
    id: "share_family",
    icon: "\u{1F91D}",
    title: "Share with Family",
    description:
      "Invite loved ones to view your rooms or contribute their own memories. Building a palace is better together.",
    cta: "Share a Room",
  },
];

function getSeenCards(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function markCardSeen(id: string) {
  try {
    const seen = getSeenCards();
    if (!seen.includes(id)) {
      seen.push(id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seen));
    }
  } catch {}
}

interface FeatureSpotlightProps {
  onImport: () => void;
  onInterview: () => void;
  onTimeCapsule: () => void;
  onShare: () => void;
}

export default function FeatureSpotlight({
  onImport,
  onInterview,
  onTimeCapsule,
  onShare,
}: FeatureSpotlightProps) {
  const isMobile = useIsMobile();
  const [currentCard, setCurrentCard] = useState<SpotlightCard | null>(null);
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    // Show after a short delay to let the palace load
    const timer = setTimeout(() => {
      const seen = getSeenCards();
      const unseen = CARDS.find((c) => !seen.includes(c.id));
      if (unseen) {
        setCurrentCard(unseen);
        setVisible(true);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    if (!currentCard) return;
    setExiting(true);
    markCardSeen(currentCard.id);
    setTimeout(() => {
      setExiting(false);
      // Find next unseen card
      const seen = getSeenCards();
      const next = CARDS.find((c) => !seen.includes(c.id));
      if (next) {
        setCurrentCard(next);
      } else {
        setVisible(false);
        setCurrentCard(null);
      }
    }, 350);
  };

  const handleAction = () => {
    if (!currentCard) return;
    const actionMap: Record<string, () => void> = {
      import_photos: onImport,
      record_story: onInterview,
      time_capsule: onTimeCapsule,
      share_family: onShare,
    };
    markCardSeen(currentCard.id);
    setVisible(false);
    actionMap[currentCard.id]?.();
  };

  if (!visible || !currentCard) return null;

  const cardIndex = CARDS.findIndex((c) => c.id === currentCard.id);
  const remaining = CARDS.length - getSeenCards().length;

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 85,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(42, 34, 24, 0.4)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        animation: exiting ? "fadeOut .3s ease forwards" : "fadeIn .4s ease",
      }}
      onClick={dismiss}
    >
      <style>{`@keyframes fadeOut{from{opacity:1}to{opacity:0}}@keyframes slideUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: T.color.linen,
          borderRadius: 24,
          padding: isMobile ? "32px 24px 24px" : "40px 36px 28px",
          maxWidth: 420,
          width: isMobile ? "calc(100% - 40px)" : "90%",
          boxShadow: "0 24px 80px rgba(44, 44, 42, 0.35)",
          border: `2px solid ${T.color.cream}`,
          animation: exiting
            ? "fadeOut .3s ease forwards"
            : "slideUp .5s ease",
          textAlign: "center",
          position: "relative",
        }}
      >
        {/* Progress indicator */}
        <div
          style={{
            position: "absolute",
            top: 16,
            right: 20,
            fontFamily: T.font.body,
            fontSize: 12,
            color: T.color.muted,
          }}
        >
          {cardIndex + 1} / {CARDS.length}
        </div>

        {/* Icon */}
        <div
          style={{
            fontSize: 48,
            marginBottom: 16,
            lineHeight: 1,
          }}
        >
          {currentCard.icon}
        </div>

        {/* Title */}
        <h2
          style={{
            fontFamily: T.font.display,
            fontSize: isMobile ? 24 : 28,
            fontWeight: 500,
            color: T.color.charcoal,
            marginBottom: 12,
            lineHeight: 1.2,
          }}
        >
          {currentCard.title}
        </h2>

        {/* Description */}
        <p
          style={{
            fontFamily: T.font.body,
            fontSize: isMobile ? 15 : 16,
            lineHeight: 1.7,
            color: T.color.muted,
            marginBottom: 28,
            maxWidth: 340,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          {currentCard.description}
        </p>

        {/* Action button */}
        <button
          onClick={handleAction}
          style={{
            fontFamily: T.font.body,
            fontSize: isMobile ? 17 : 16,
            fontWeight: 600,
            padding: isMobile ? "15px 36px" : "13px 36px",
            borderRadius: 12,
            border: "none",
            background: `linear-gradient(135deg, ${T.color.terracotta}, ${T.color.walnut})`,
            color: "#FFF",
            cursor: "pointer",
            boxShadow: `0 4px 16px rgba(193, 127, 89, 0.3)`,
            transition: "transform 0.15s, box-shadow 0.15s",
            minHeight: 48,
            display: "inline-block",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.transform = "scale(1.03)";
            (e.currentTarget as HTMLElement).style.boxShadow =
              "0 6px 24px rgba(193, 127, 89, 0.45)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.transform = "none";
            (e.currentTarget as HTMLElement).style.boxShadow =
              "0 4px 16px rgba(193, 127, 89, 0.3)";
          }}
        >
          {currentCard.cta}
        </button>

        {/* Skip */}
        <div style={{ marginTop: 16 }}>
          <button
            onClick={dismiss}
            style={{
              fontFamily: T.font.body,
              fontSize: 14,
              color: T.color.muted,
              background: "none",
              border: "none",
              cursor: "pointer",
              textDecoration: "underline",
              textUnderlineOffset: 3,
              padding: "8px 16px",
            }}
          >
            {remaining <= 1 ? "Close" : "Skip — show me the next one"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Check whether all spotlight cards have been seen */
export function allSpotlightsSeen(): boolean {
  const seen = getSeenCards();
  return CARDS.every((c) => seen.includes(c.id));
}
