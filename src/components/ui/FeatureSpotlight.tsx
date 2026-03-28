"use client";
import { useState, useEffect } from "react";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useTranslation } from "@/lib/hooks/useTranslation";

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
    title: "importTitle",
    description: "importDesc",
    cta: "importCta",
  },
  {
    id: "record_story",
    icon: "\u{1F3A4}",
    title: "interviewTitle",
    description: "interviewDesc",
    cta: "interviewCta",
  },
  {
    id: "time_capsule",
    icon: "\u{1F4E6}",
    title: "capsuleTitle",
    description: "capsuleDesc",
    cta: "capsuleCta",
  },
  {
    id: "share_family",
    icon: "\u{1F91D}",
    title: "shareTitle",
    description: "shareDesc",
    cta: "shareCta",
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
  const { t } = useTranslation("featureSpotlight");
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
          borderRadius: "1.5rem",
          padding: isMobile ? "2rem 1.5rem 1.5rem" : "2.5rem 2.25rem 1.75rem",
          maxWidth: "26.25rem",
          width: isMobile ? "calc(100% - 2.5rem)" : "90%",
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
            top: "1rem",
            right: "1.25rem",
            fontFamily: T.font.body,
            fontSize: "0.75rem",
            color: T.color.muted,
          }}
        >
          {cardIndex + 1} / {CARDS.length}
        </div>

        {/* Icon */}
        <div
          style={{
            fontSize: "3rem",
            marginBottom: "1rem",
            lineHeight: 1,
          }}
        >
          {currentCard.icon}
        </div>

        {/* Title */}
        <h2
          style={{
            fontFamily: T.font.display,
            fontSize: isMobile ? "1.5rem" : "1.75rem",
            fontWeight: 500,
            color: T.color.charcoal,
            marginBottom: "0.75rem",
            lineHeight: 1.2,
          }}
        >
          {t(currentCard.title)}
        </h2>

        {/* Description */}
        <p
          style={{
            fontFamily: T.font.body,
            fontSize: isMobile ? "0.9375rem" : "1rem",
            lineHeight: 1.7,
            color: T.color.muted,
            marginBottom: "1.75rem",
            maxWidth: "21.25rem",
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          {t(currentCard.description)}
        </p>

        {/* Action button */}
        <button
          onClick={handleAction}
          style={{
            fontFamily: T.font.body,
            fontSize: isMobile ? "1.0625rem" : "1rem",
            fontWeight: 600,
            padding: isMobile ? "0.9375rem 2.25rem" : "0.8125rem 2.25rem",
            borderRadius: "0.75rem",
            border: "none",
            background: `linear-gradient(135deg, ${T.color.terracotta}, ${T.color.walnut})`,
            color: "#FFF",
            cursor: "pointer",
            boxShadow: `0 4px 16px rgba(193, 127, 89, 0.3)`,
            transition: "transform 0.15s, box-shadow 0.15s",
            minHeight: "3rem",
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
          {t(currentCard.cta)}
        </button>

        {/* Skip */}
        <div style={{ marginTop: "1rem" }}>
          <button
            onClick={dismiss}
            style={{
              fontFamily: T.font.body,
              fontSize: "0.875rem",
              color: T.color.muted,
              background: "none",
              border: "none",
              cursor: "pointer",
              textDecoration: "underline",
              textUnderlineOffset: "0.1875rem",
              padding: "0.5rem 1rem",
            }}
          >
            {remaining <= 1 ? t("close") : t("skipShowNext")}
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
