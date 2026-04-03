"use client";

import { T } from "@/lib/theme";

interface TrackIconProps {
  trackId: string;
  /** rem-based size, e.g. "1.5rem" */
  size?: string;
  /** Override primary stroke color */
  primaryColor?: string;
  /** Override secondary detail color */
  secondaryColor?: string;
}

/**
 * Roman/Tuscan-themed SVG icon for each gamification track.
 * 24x24 viewBox, gold strokes, rounded caps & joins.
 */
export default function TrackIcon({
  trackId,
  size = "1.5rem",
  primaryColor = T.color.gold,
  secondaryColor = T.color.goldLight,
}: TrackIconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
  } as const;

  const s = {
    stroke: primaryColor,
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (trackId) {
    /* ── preserve: Roman scroll with wax seal ── */
    case "preserve":
      return (
        <svg {...common}>
          {/* Scroll body */}
          <path d="M7 4h10c.55 0 1 .45 1 1v14c0 .55-.45 1-1 1H7" {...s} />
          {/* Top roll */}
          <path d="M7 4c-1.1 0-2 .9-2 2s.9 2 2 2" {...s} />
          <line x1="7" y1="4" x2="7" y2="8" {...s} />
          {/* Bottom roll */}
          <path d="M7 16c-1.1 0-2 .9-2 2s.9 2 2 2" {...s} />
          <line x1="7" y1="16" x2="7" y2="20" {...s} />
          {/* Scroll body left edge */}
          <line x1="7" y1="8" x2="7" y2="16" {...s} />
          {/* Text lines */}
          <line x1="10" y1="9" x2="15" y2="9" stroke={secondaryColor} strokeWidth={1} strokeLinecap="round" />
          <line x1="10" y1="12" x2="15" y2="12" stroke={secondaryColor} strokeWidth={1} strokeLinecap="round" />
          {/* Wax seal */}
          <circle cx="14" cy="16" r="2" fill={primaryColor} opacity={0.3} stroke={primaryColor} strokeWidth={1.2} />
          <circle cx="14" cy="16" r="0.7" fill={primaryColor} opacity={0.6} />
        </svg>
      );

    /* ── enhance: Laurel wreath with sparkle ── */
    case "enhance":
      return (
        <svg {...common}>
          {/* Left laurel branch */}
          <path d="M8 19c0-3 -2-5 -2-8s1-5 4-7" {...s} fill="none" />
          <path d="M6.5 8.5c-1.2.3-1.8 1.5-1.2 2.5" stroke={secondaryColor} strokeWidth={1.2} strokeLinecap="round" fill="none" />
          <path d="M6 11.5c-1.2.3-1.8 1.5-1 2.5" stroke={secondaryColor} strokeWidth={1.2} strokeLinecap="round" fill="none" />
          <path d="M6.5 14.5c-1 .5-1.3 1.5-.7 2.3" stroke={secondaryColor} strokeWidth={1.2} strokeLinecap="round" fill="none" />
          {/* Right laurel branch */}
          <path d="M16 19c0-3 2-5 2-8s-1-5-4-7" {...s} fill="none" />
          <path d="M17.5 8.5c1.2.3 1.8 1.5 1.2 2.5" stroke={secondaryColor} strokeWidth={1.2} strokeLinecap="round" fill="none" />
          <path d="M18 11.5c1.2.3 1.8 1.5 1 2.5" stroke={secondaryColor} strokeWidth={1.2} strokeLinecap="round" fill="none" />
          <path d="M17.5 14.5c1 .5 1.3 1.5.7 2.3" stroke={secondaryColor} strokeWidth={1.2} strokeLinecap="round" fill="none" />
          {/* Central sparkle / star */}
          <path d="M12 6l.8 2.4L15.2 9l-2.4.8L12 12.2l-.8-2.4L8.8 9l2.4-.8z" fill={primaryColor} opacity={0.5} stroke={primaryColor} strokeWidth={0.8} strokeLinejoin="round" />
          {/* Tiny sparkle accents */}
          <circle cx="12" cy="9" r="0.6" fill={primaryColor} opacity={0.7} />
        </svg>
      );

    /* ── legacy: Roman temple with inheritance pillar ── */
    case "legacy":
      return (
        <svg {...common}>
          {/* Pediment (triangular roof) */}
          <path d="M3 9l9-5 9 5" {...s} />
          {/* Architrave */}
          <line x1="3" y1="9" x2="21" y2="9" {...s} />
          {/* Left column */}
          <line x1="6" y1="9.5" x2="6" y2="19" {...s} />
          <line x1="5" y1="9.5" x2="7" y2="9.5" stroke={secondaryColor} strokeWidth={1.2} strokeLinecap="round" />
          <line x1="5" y1="19" x2="7" y2="19" stroke={secondaryColor} strokeWidth={1.2} strokeLinecap="round" />
          {/* Right column */}
          <line x1="18" y1="9.5" x2="18" y2="19" {...s} />
          <line x1="17" y1="9.5" x2="19" y2="9.5" stroke={secondaryColor} strokeWidth={1.2} strokeLinecap="round" />
          <line x1="17" y1="19" x2="19" y2="19" stroke={secondaryColor} strokeWidth={1.2} strokeLinecap="round" />
          {/* Center column (thinner) */}
          <line x1="12" y1="9.5" x2="12" y2="19" stroke={secondaryColor} strokeWidth={1.2} strokeLinecap="round" />
          {/* Base / stylobate */}
          <line x1="2" y1="20" x2="22" y2="20" {...s} />
          {/* Inheritance symbol: infinity/link in pediment */}
          <path d="M10.2 6.2c-.6-.4-1.4-.2-1.6.4s.2 1.2.8 1.2c.6 0 1-.4 1.6-.4s1.2.2 1.4.8c.1.4-.2.9-.8 1" stroke={secondaryColor} strokeWidth={0.9} strokeLinecap="round" fill="none" />
        </svg>
      );

    /* ── resolutions: Roman arch gateway with path ── */
    case "resolutions":
      return (
        <svg {...common}>
          {/* Left pillar */}
          <rect x="3" y="8" width="3" height="13" rx="0.3" {...s} fill="none" />
          {/* Right pillar */}
          <rect x="18" y="8" width="3" height="13" rx="0.3" {...s} fill="none" />
          {/* Arch */}
          <path d="M6 8c0-4 4-5.5 6-5.5s6 1.5 6 5.5" {...s} />
          {/* Keystone */}
          <path d="M11 2.8h2v2h-2z" fill={primaryColor} opacity={0.3} stroke={primaryColor} strokeWidth={0.8} />
          {/* Path leading through */}
          <line x1="12" y1="12" x2="12" y2="21" stroke={secondaryColor} strokeWidth={1} strokeLinecap="round" strokeDasharray="1.5 1.5" />
          {/* Decorative dots on pillars */}
          <circle cx="4.5" cy="11" r="0.5" fill={secondaryColor} opacity={0.5} />
          <circle cx="19.5" cy="11" r="0.5" fill={secondaryColor} opacity={0.5} />
          {/* Horizon arrow at bottom */}
          <path d="M9 18l3 3 3-3" stroke={secondaryColor} strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    /* ── cocreate: Two amphoras sharing ── */
    case "cocreate":
      return (
        <svg {...common}>
          {/* Left amphora */}
          <path d="M5 8c0-1.5 1-3 2.5-3s2.5 1.5 2.5 3v2c0 2-1 4-2.5 5S5 12 5 10z" {...s} />
          <path d="M5.5 7.5c-.8-.3-1.5-1-1.5-1.5" stroke={secondaryColor} strokeWidth={1} strokeLinecap="round" />
          <path d="M9.5 7.5c.8-.3 1.5-1 1.5-1.5" stroke={secondaryColor} strokeWidth={1} strokeLinecap="round" />
          {/* Left base */}
          <line x1="6" y1="17" x2="9" y2="17" stroke={secondaryColor} strokeWidth={1} strokeLinecap="round" />
          <line x1="7.5" y1="15" x2="7.5" y2="17" stroke={secondaryColor} strokeWidth={1} strokeLinecap="round" />
          {/* Right amphora */}
          <path d="M14 8c0-1.5 1-3 2.5-3s2.5 1.5 2.5 3v2c0 2-1 4-2.5 5s-2.5-3-2.5-5z" {...s} />
          <path d="M14.5 7.5c-.8-.3-1.5-1-1.5-1.5" stroke={secondaryColor} strokeWidth={1} strokeLinecap="round" />
          <path d="M18.5 7.5c.8-.3 1.5-1 1.5-1.5" stroke={secondaryColor} strokeWidth={1} strokeLinecap="round" />
          {/* Right base */}
          <line x1="15" y1="17" x2="18" y2="17" stroke={secondaryColor} strokeWidth={1} strokeLinecap="round" />
          <line x1="16.5" y1="15" x2="16.5" y2="17" stroke={secondaryColor} strokeWidth={1} strokeLinecap="round" />
          {/* Connection arc between amphoras */}
          <path d="M10 9c.8-1.5 2.2-1.5 4 0" stroke={primaryColor} strokeWidth={1} strokeLinecap="round" strokeDasharray="1.2 1.2" opacity={0.6} />
          {/* Shared droplet */}
          <circle cx="12" cy="11" r="0.8" fill={primaryColor} opacity={0.4} />
        </svg>
      );

    /* ── visualize: Roman mosaic eye ── */
    case "visualize":
      return (
        <svg {...common}>
          {/* Outer mosaic border - diamond pattern */}
          <rect x="2" y="2" width="20" height="20" rx="2" stroke={secondaryColor} strokeWidth={1} fill="none" />
          {/* Corner mosaic tiles */}
          <rect x="3" y="3" width="2" height="2" rx="0.3" fill={primaryColor} opacity={0.15} stroke={secondaryColor} strokeWidth={0.6} />
          <rect x="19" y="3" width="2" height="2" rx="0.3" fill={primaryColor} opacity={0.15} stroke={secondaryColor} strokeWidth={0.6} />
          <rect x="3" y="19" width="2" height="2" rx="0.3" fill={primaryColor} opacity={0.15} stroke={secondaryColor} strokeWidth={0.6} />
          <rect x="19" y="19" width="2" height="2" rx="0.3" fill={primaryColor} opacity={0.15} stroke={secondaryColor} strokeWidth={0.6} />
          {/* Eye shape in center */}
          <path d="M5 12c2-3.5 5-5.5 7-5.5s5 2 7 5.5c-2 3.5-5 5.5-7 5.5s-5-2-7-5.5z" {...s} />
          {/* Iris */}
          <circle cx="12" cy="12" r="2.8" stroke={primaryColor} strokeWidth={1.3} fill={`${primaryColor}15`} />
          {/* Pupil */}
          <circle cx="12" cy="12" r="1.2" fill={primaryColor} opacity={0.5} />
          {/* Light reflection */}
          <circle cx="13" cy="11" r="0.5" fill={secondaryColor} opacity={0.7} />
        </svg>
      );

    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" stroke={primaryColor} strokeWidth={1.5} />
          <text x="12" y="16" textAnchor="middle" fill={primaryColor} fontSize="10" fontFamily="serif">?</text>
        </svg>
      );
  }
}
