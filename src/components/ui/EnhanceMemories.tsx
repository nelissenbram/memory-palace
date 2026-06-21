"use client";

import React, { useRef, useCallback } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { navigateInApp } from "@/lib/native/platform";
import TuscanCard from "./TuscanCard";
import { TuscanSectionHeader } from "./TuscanCard";
import { EASE } from "./TuscanStyles";

/* ─────────────────────────────────────────────
   EnhanceMemories — CTA cards to enrich memories
   ───────────────────────────────────────────── */

export interface EnhanceMemoriesProps {
  onUploadPhotos: () => void;
  onAIEnhance: () => void;
  onAddDescription: () => void;
  onOrganize: () => void;
  onSetupGallery: () => void;
  onCreateFamilyGroup: () => void;
  onCreateTimeCapsule: () => void;
  onSendViaWhatsApp: () => void;
  onPublishExplore: () => void;
  isMobile: boolean;
}

/* ── Custom SVG Icons (24×24 viewBox, thin strokes) ── */

function IconUpload() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Film frame outline */}
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <line x1="3" y1="8" x2="21" y2="8" />
      <line x1="3" y1="16" x2="21" y2="16" />
      <line x1="7" y1="4" x2="7" y2="8" />
      <line x1="17" y1="4" x2="17" y2="8" />
      <line x1="7" y1="16" x2="7" y2="20" />
      <line x1="17" y1="16" x2="17" y2="20" />
      {/* Camera lens circle */}
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

function IconAIEnhance() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Magic wand */}
      <line x1="4" y1="20" x2="14" y2="10" />
      <rect x="12.6" y="8.6" width="4" height="2" rx="0.5" transform="rotate(-45 14.6 9.6)" />
      {/* Sparkle dots */}
      <circle cx="18" cy="4" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="20" cy="8" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="15" cy="3" r="0.5" fill="currentColor" stroke="none" />
      {/* Neural connection lines */}
      <line x1="18" y1="4" x2="20" y2="8" />
      <line x1="15" y1="3" x2="18" y2="4" />
      <line x1="18" y1="4" x2="21" y2="5" />
      <circle cx="21" cy="5" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconWrite() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Paper */}
      <path d="M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <polyline points="14 3 14 7 18 7" />
      {/* Pen writing */}
      <line x1="8" y1="12" x2="14" y2="12" />
      <line x1="8" y1="15" x2="12" y2="15" />
      <line x1="8" y1="18" x2="10" y2="18" />
    </svg>
  );
}

function IconOrganize() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Folder */}
      <path d="M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6z" />
      {/* Sort lines / arrow */}
      <line x1="8" y1="12" x2="16" y2="12" />
      <line x1="8" y1="15" x2="14" y2="15" />
      <polyline points="14 10 16 12 14 14" />
    </svg>
  );
}

function IconGallery() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Back frame */}
      <rect x="6" y="2" width="15" height="13" rx="1.5" />
      {/* Front frame */}
      <rect x="3" y="6" width="15" height="13" rx="1.5" />
      {/* Mountain landscape in front frame */}
      <polyline points="3 16 8 11 12 15 15 12 18 16" />
      {/* Sun */}
      <circle cx="7" cy="10" r="1.5" />
    </svg>
  );
}

function IconFamilyGroup() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Two people */}
      <circle cx="9" cy="7" r="3" />
      <circle cx="17" cy="8" r="2.5" />
      <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
      <path d="M17 11.5a3 3 0 0 1 3 3V21" />
    </svg>
  );
}

function IconBlog() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
      <line x1="7" y1="9" x2="17" y2="9" />
      <line x1="7" y1="13" x2="14" y2="13" />
      <line x1="7" y1="17" x2="11" y2="17" />
    </svg>
  );
}

function IconTimeCapsule() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Hourglass top and bottom caps */}
      <line x1="6" y1="2" x2="18" y2="2" />
      <line x1="6" y1="22" x2="18" y2="22" />
      {/* Hourglass body */}
      <path d="M7 2v4a1 1 0 0 0 .3.7L12 12l-4.7 5.3a1 1 0 0 0-.3.7v4" />
      <path d="M17 2v4a1 1 0 0 1-.3.7L12 12l4.7 5.3a1 1 0 0 1 .3.7v4" />
      {/* Sand grains */}
      <circle cx="12" cy="12" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="11" cy="18" r="0.4" fill="currentColor" stroke="none" />
      <circle cx="13" cy="19" r="0.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="20" r="0.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconWhatsApp() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {/* Phone/chat bubble */}
      <path d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-6l-4 4v-4H5a2 2 0 0 1-2-2V5z" />
      {/* Camera icon inside */}
      <rect x="9" y="7" width="6" height="4.5" rx="0.5" />
      <circle cx="12" cy="9.25" r="1.2" />
      {/* Green dot accent */}
      <circle cx="19" cy="5" r="2" fill="#25D366" stroke="none" />
    </svg>
  );
}

function IconPublishExplore() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {/* Globe */}
      <circle cx="12" cy="12" r="9" />
      <ellipse cx="12" cy="12" rx="4" ry="9" />
      <line x1="3" y1="12" x2="21" y2="12" />
      {/* People dots */}
      <circle cx="18" cy="6" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="6" cy="18" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconHelp() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <circle cx="12" cy="17" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconContribute() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
    </svg>
  );
}

/* ── Action card config ── */

interface ActionCardConfig {
  icon: React.ReactNode;
  titleKey: string;
  descKey: string;
  accent: string;
  onClick: () => void;
}

/* ── Main component ── */

export default function EnhanceMemories({
  onUploadPhotos,
  onAIEnhance,
  onAddDescription,
  onOrganize,
  onSetupGallery,
  onCreateFamilyGroup,
  onCreateTimeCapsule,
  onSendViaWhatsApp,
  onPublishExplore,
  isMobile,
}: EnhanceMemoriesProps) {
  const { t } = useTranslation("enhance");

  const cards: ActionCardConfig[] = [
    {
      icon: <IconUpload />,
      titleKey: "uploadTitle",
      descKey: "uploadDesc",
      accent: T.color.terracotta,
      onClick: onUploadPhotos,
    },
    {
      icon: <IconAIEnhance />,
      titleKey: "aiTitle",
      descKey: "aiDesc",
      accent: T.color.gold,
      onClick: onAIEnhance,
    },
    {
      icon: <IconWrite />,
      titleKey: "writeTitle",
      descKey: "writeDesc",
      accent: T.color.walnut,
      onClick: onAddDescription,
    },
    {
      icon: <IconOrganize />,
      titleKey: "organizeTitle",
      descKey: "organizeDesc",
      accent: T.color.sage,
      onClick: onOrganize,
    },
    {
      icon: <IconGallery />,
      titleKey: "galleryTitle",
      descKey: "galleryDesc",
      accent: T.color.terracotta,
      onClick: onSetupGallery,
    },
    {
      icon: <IconFamilyGroup />,
      titleKey: "familyGroupTitle",
      descKey: "familyGroupDesc",
      accent: T.color.walnut,
      onClick: onCreateFamilyGroup,
    },
    {
      icon: <IconTimeCapsule />,
      titleKey: "timeCapsuleTitle",
      descKey: "timeCapsuleDesc",
      accent: T.color.gold,
      onClick: onCreateTimeCapsule,
    },
    {
      icon: <IconBlog />,
      titleKey: "blogTitle",
      descKey: "blogDesc",
      accent: T.color.inkSoft || "#403B36",
      onClick: () => navigateInApp("/blog"),
    },
    {
      icon: <IconWhatsApp />,
      titleKey: "whatsappTitle",
      descKey: "whatsappDesc",
      accent: "#25D366",
      onClick: onSendViaWhatsApp,
    },
    {
      icon: <IconPublishExplore />,
      titleKey: "publishTitle",
      descKey: "publishDesc",
      accent: "#7B6B8E",
      onClick: onPublishExplore,
    },
    {
      icon: <IconHelp />,
      titleKey: "helpTitle",
      descKey: "helpDesc",
      accent: T.color.sandstone,
      onClick: () => navigateInApp("/help"),
    },
    {
      icon: <IconContribute />,
      titleKey: "contributeTitle",
      descKey: "contributeDesc",
      accent: "#FF4500",
      onClick: () => window.open("https://www.reddit.com/r/TheMemoryPalace/", "_blank"),
    },
  ];

  return (
    <section style={{ width: "100%" }}>
      <TuscanSectionHeader>{t("sectionTitle")}</TuscanSectionHeader>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile
            ? "repeat(2, 1fr)"
            : "repeat(auto-fit, minmax(10rem, 1fr))",
          gap: "1rem",
        }}
      >
        {cards.map((card, i) => (
          <EnhanceCard
            key={card.titleKey}
            icon={card.icon}
            title={t(card.titleKey)}
            description={t(card.descKey)}
            accent={card.accent}
            onClick={card.onClick}
            delay={i * 0.08}
          />
        ))}
      </div>
    </section>
  );
}

/* ── Individual action card ── */

interface EnhanceCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  accent: string;
  onClick: () => void;
  delay: number;
}

function EnhanceCard({
  icon,
  title,
  description,
  accent,
  onClick,
  delay,
}: EnhanceCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = useCallback(() => {
    const el = cardRef.current;
    if (!el) return;
    el.style.transform = "translateY(-0.25rem)";
    el.style.boxShadow =
      "0 0.75rem 2rem rgba(0,0,0,0.1), 0 0.125rem 0.5rem rgba(0,0,0,0.04)";
    /* Accent line glow */
    const line = el.querySelector<HTMLElement>("[data-accent-line]");
    if (line) {
      line.style.boxShadow = `0 0 0.5rem ${accent}55`;
      line.style.opacity = "1";
    }
  }, [accent]);

  const handleMouseLeave = useCallback(() => {
    const el = cardRef.current;
    if (!el) return;
    el.style.transform = "";
    el.style.boxShadow = "";
    const line = el.querySelector<HTMLElement>("[data-accent-line]");
    if (line) {
      line.style.boxShadow = "";
      line.style.opacity = "0.7";
    }
  }, []);

  return (
    <TuscanCard
      variant="elevated"
      padding="0"
      style={{
        cursor: "pointer",
        animationDelay: `${delay}s`,
        transition: `transform 0.3s ${EASE}, box-shadow 0.3s ${EASE}`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <div
        ref={cardRef}
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick();
          }
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "1.25rem 1rem 1.5rem",
          transition: `transform 0.3s ${EASE}, box-shadow 0.3s ${EASE}`,
          borderRadius: "1rem",
        }}
      >
        {/* Accent top line */}
        <div
          data-accent-line=""
          style={{
            position: "absolute",
            top: 0,
            left: "1rem",
            right: "1rem",
            height: "0.1875rem",
            borderRadius: "0 0 0.125rem 0.125rem",
            background: accent,
            opacity: 0.7,
            transition: `opacity 0.3s ${EASE}, box-shadow 0.3s ${EASE}`,
          }}
        />

        {/* Icon */}
        <div
          style={{
            color: accent,
            marginBottom: "0.75rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "2.75rem",
            height: "2.75rem",
            borderRadius: "0.75rem",
            background: `${accent}12`,
          }}
        >
          {icon}
        </div>

        {/* Title */}
        <h4
          style={{
            fontFamily: T.font.display,
            fontSize: "1rem",
            fontWeight: 600,
            color: T.color.charcoal,
            margin: 0,
            marginBottom: "0.375rem",
            textAlign: "center",
            letterSpacing: "0.01em",
          }}
        >
          {title}
        </h4>

        {/* Description */}
        <p
          style={{
            fontFamily: T.font.body,
            fontSize: "0.8125rem",
            color: T.color.muted,
            margin: 0,
            textAlign: "center",
            lineHeight: 1.4,
          }}
        >
          {description}
        </p>
      </div>
    </TuscanCard>
  );
}
