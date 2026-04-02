import React from "react";

// ---------------------------------------------------------------------------
// Shared types & defaults
// ---------------------------------------------------------------------------

interface IconProps {
  size?: number;
  color?: string;
}

interface WingIconProps extends IconProps {
  wingId: string;
}

interface RoomIconProps extends IconProps {
  roomId: string;
  wingId?: string;
}

const DEFAULT_SIZE = 24;
const DEFAULT_COLOR = "currentColor";

const svgProps = (size: number, color: string): React.SVGProps<SVGSVGElement> => ({
  xmlns: "http://www.w3.org/2000/svg",
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: color,
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

// ===========================================================================
// WING ICONS
// ===========================================================================

/** Roman domus / house silhouette */
const FamilyIcon: React.FC<IconProps> = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }) => (
  <svg {...svgProps(size, color)}>
    {/* Triangular pediment */}
    <polyline points="3,14 12,4 21,14" />
    {/* Two columns */}
    <line x1="6" y1="14" x2="6" y2="20" />
    <line x1="18" y1="14" x2="18" y2="20" />
    {/* Base step */}
    <line x1="3" y1="20" x2="21" y2="20" />
    {/* Doorway arch */}
    <path d="M10,20 L10,16 Q12,13 14,16 L14,20" />
  </svg>
);

/** Compass rose */
const TravelIcon: React.FC<IconProps> = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }) => (
  <svg {...svgProps(size, color)}>
    {/* Outer circle */}
    <circle cx="12" cy="12" r="9" />
    {/* Cardinal points — elongated diamond shapes */}
    <polygon points="12,3 13,10 12,11 11,10" fill={color} fillOpacity={0.15} stroke={color} />
    <polygon points="12,21 11,14 12,13 13,14" fill={color} fillOpacity={0.08} stroke={color} />
    <polygon points="3,12 10,11 11,12 10,13" fill={color} fillOpacity={0.08} stroke={color} />
    <polygon points="21,12 14,13 13,12 14,11" fill={color} fillOpacity={0.08} stroke={color} />
    {/* Centre dot */}
    <circle cx="12" cy="12" r="1" fill={color} fillOpacity={0.3} />
  </svg>
);

/** Spinning top (classical) */
const ChildhoodIcon: React.FC<IconProps> = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }) => (
  <svg {...svgProps(size, color)}>
    {/* Handle / stick */}
    <line x1="12" y1="3" x2="12" y2="7" />
    {/* Top body — an inverted rounded triangle */}
    <path d="M7,9 Q7,7 12,7 Q17,7 17,9 L12,20 Z" fill={color} fillOpacity={0.06} />
    {/* Equator line */}
    <ellipse cx="12" cy="10" rx="5" ry="1.5" />
    {/* Tip */}
    <circle cx="12" cy="20" r="0.6" fill={color} fillOpacity={0.25} />
  </svg>
);

/** Laurel wreath — Roman achievement */
const CareerIcon: React.FC<IconProps> = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }) => (
  <svg {...svgProps(size, color)}>
    {/* Left branch */}
    <path d="M10,20 Q4,16 4,10 Q4,6 8,4" fill="none" />
    <path d="M6,14 Q8,13 8,11" />
    <path d="M5,11 Q7,10.5 7.5,8.5" />
    <path d="M5.5,8 Q7.5,7.5 8,5.5" />
    {/* Right branch */}
    <path d="M14,20 Q20,16 20,10 Q20,6 16,4" fill="none" />
    <path d="M18,14 Q16,13 16,11" />
    <path d="M19,11 Q17,10.5 16.5,8.5" />
    <path d="M18.5,8 Q16.5,7.5 16,5.5" />
    {/* Ribbon / tie at bottom */}
    <path d="M10,20 L12,21 L14,20" />
  </svg>
);

/** Lyre — Roman musical instrument */
const CreativityIcon: React.FC<IconProps> = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }) => (
  <svg {...svgProps(size, color)}>
    {/* Base / yoke */}
    <path d="M8,20 L8,18 Q8,16 10,15 L14,15 Q16,16 16,18 L16,20" />
    <line x1="7" y1="20" x2="17" y2="20" />
    {/* Arms curving outward */}
    <path d="M8,18 Q5,14 6,8 Q6.5,5 9,4" fill="none" />
    <path d="M16,18 Q19,14 18,8 Q17.5,5 15,4" fill="none" />
    {/* Crossbar */}
    <line x1="7" y1="7" x2="17" y2="7" />
    {/* Strings */}
    <line x1="10" y1="7" x2="10" y2="15" />
    <line x1="12" y1="7" x2="12" y2="15" />
    <line x1="14" y1="7" x2="14" y2="15" />
  </svg>
);

/** Amphora / vessel */
const AtticIcon: React.FC<IconProps> = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }) => (
  <svg {...svgProps(size, color)}>
    {/* Rim */}
    <ellipse cx="12" cy="5" rx="3" ry="1" />
    {/* Neck */}
    <path d="M9,5 Q9,8 8,9" fill="none" />
    <path d="M15,5 Q15,8 16,9" fill="none" />
    {/* Body */}
    <path d="M8,9 Q5,12 6,16 Q7,20 12,21 Q17,20 18,16 Q19,12 16,9" fill={color} fillOpacity={0.05} />
    {/* Handles */}
    <path d="M8,9 Q4,10 5.5,14" fill="none" />
    <path d="M16,9 Q20,10 18.5,14" fill="none" />
  </svg>
);

// ===========================================================================
// ROOM ICONS
// ===========================================================================

/** Wreath (smaller / simpler variant for rooms) — fr1 */
const WreathIcon: React.FC<IconProps> = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }) => (
  <svg {...svgProps(size, color)}>
    <circle cx="12" cy="12" r="7" fill="none" />
    <path d="M9,18 Q8,15 8,12 Q8,8 10,6" />
    <path d="M15,18 Q16,15 16,12 Q16,8 14,6" />
    {/* Leaves along the ring */}
    <path d="M7,10 Q9,9 9,7" />
    <path d="M17,10 Q15,9 15,7" />
    <path d="M6,14 Q8,13 8.5,11" />
    <path d="M18,14 Q16,13 15.5,11" />
    {/* Bottom tie */}
    <path d="M10,18.5 L12,20 L14,18.5" />
  </svg>
);

/** Amphora (cake/amphora) — fr2 */
const CakeAmphoraIcon: React.FC<IconProps> = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }) => (
  <svg {...svgProps(size, color)}>
    {/* Small amphora / chalice */}
    <ellipse cx="12" cy="6" rx="2.5" ry="0.8" />
    <path d="M9.5,6 Q9,9 8,10" fill="none" />
    <path d="M14.5,6 Q15,9 16,10" fill="none" />
    <path d="M8,10 Q6,13 7,16 Q8,19 12,20 Q16,19 17,16 Q18,13 16,10" fill={color} fillOpacity={0.05} />
    {/* Decorative band */}
    <ellipse cx="12" cy="14" rx="4.5" ry="1" />
  </svg>
);

/** Cradle — fr3 */
const CradleIcon: React.FC<IconProps> = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }) => (
  <svg {...svgProps(size, color)}>
    {/* Cradle body — curved base */}
    <path d="M5,14 Q5,18 12,18 Q19,18 19,14" />
    {/* Blanket / interior line */}
    <path d="M7,14 Q7,16 12,16 Q17,16 17,14" fill={color} fillOpacity={0.05} />
    {/* Hood/canopy */}
    <path d="M5,14 Q4,10 7,8 Q9,7 10,8" fill="none" />
    {/* Rockers */}
    <path d="M4,19 Q8,21 12,19 Q16,21 20,19" />
  </svg>
);

/** Column (classical Roman) — tr1 */
const ColumnIcon: React.FC<IconProps> = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }) => (
  <svg {...svgProps(size, color)}>
    {/* Capital */}
    <path d="M7,6 L17,6 L16,4 L8,4 Z" fill={color} fillOpacity={0.06} />
    {/* Shaft with fluting */}
    <line x1="9" y1="6" x2="9.5" y2="18" />
    <line x1="14.5" y1="6" x2="15" y2="18" />
    <line x1="12" y1="6" x2="12" y2="18" />
    {/* Base */}
    <rect x="8" y="18" width="8" height="2" rx="0.5" fill={color} fillOpacity={0.06} />
    {/* Abacus top */}
    <line x1="6" y1="4" x2="18" y2="4" />
  </svg>
);

/** Torii gate — tr2 */
const ToriiIcon: React.FC<IconProps> = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }) => (
  <svg {...svgProps(size, color)}>
    {/* Top beam (kasagi) — slightly curved */}
    <path d="M3,6 Q12,4 21,6" />
    {/* Lower beam (nuki) */}
    <line x1="5" y1="9" x2="19" y2="9" />
    {/* Left pillar */}
    <line x1="7" y1="6" x2="7" y2="21" />
    {/* Right pillar */}
    <line x1="17" y1="6" x2="17" y2="21" />
  </svg>
);

/** Triumphal arch — tr3 */
const ArchIcon: React.FC<IconProps> = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }) => (
  <svg {...svgProps(size, color)}>
    {/* Outer rectangle */}
    <rect x="4" y="5" width="16" height="16" rx="0.5" fill="none" />
    {/* Entablature */}
    <line x1="4" y1="7" x2="20" y2="7" />
    {/* Arch opening */}
    <path d="M8,21 L8,14 Q8,10 12,10 Q16,10 16,14 L16,21" fill={color} fillOpacity={0.04} />
    {/* Keystone accent */}
    <circle cx="12" cy="10.5" r="0.5" fill={color} fillOpacity={0.2} />
  </svg>
);

/** Mountain — tr4 */
const MountainIcon: React.FC<IconProps> = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }) => (
  <svg {...svgProps(size, color)}>
    {/* Main peak */}
    <polyline points="2,20 9,6 16,20" fill={color} fillOpacity={0.04} />
    {/* Secondary peak */}
    <polyline points="10,20 16,10 22,20" fill={color} fillOpacity={0.03} />
    {/* Snow cap */}
    <polyline points="7.5,9 9,6 10.5,9" />
    {/* Base */}
    <line x1="2" y1="20" x2="22" y2="20" />
  </svg>
);

/** Tools (hammer & chisel, classical) — cr1 */
const ToolsIcon: React.FC<IconProps> = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }) => (
  <svg {...svgProps(size, color)}>
    {/* Hammer handle */}
    <line x1="5" y1="19" x2="12" y2="10" />
    {/* Hammer head */}
    <rect x="10" y="7" width="6" height="3" rx="0.5" transform="rotate(-40 13 8.5)" fill={color} fillOpacity={0.08} />
    {/* Chisel handle */}
    <line x1="19" y1="19" x2="14" y2="10" />
    {/* Chisel blade */}
    <path d="M13,10 L15,10 L14.5,7 L13.5,7 Z" fill={color} fillOpacity={0.08} />
  </svg>
);

/** Scroll — cr2 */
const ScrollIcon: React.FC<IconProps> = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }) => (
  <svg {...svgProps(size, color)}>
    {/* Top roll */}
    <ellipse cx="12" cy="5" rx="7" ry="1.5" />
    {/* Scroll body */}
    <line x1="5" y1="5" x2="5" y2="18" />
    <line x1="19" y1="5" x2="19" y2="18" />
    {/* Bottom roll */}
    <ellipse cx="12" cy="18" rx="7" ry="1.5" />
    {/* Text lines */}
    <line x1="8" y1="9" x2="16" y2="9" />
    <line x1="8" y1="11.5" x2="16" y2="11.5" />
    <line x1="8" y1="14" x2="14" y2="14" />
  </svg>
);

/** Torch — kr1 */
const TorchIcon: React.FC<IconProps> = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }) => (
  <svg {...svgProps(size, color)}>
    {/* Handle */}
    <line x1="12" y1="21" x2="12" y2="11" />
    {/* Cup / holder */}
    <path d="M9,11 L15,11 L14,9 L10,9 Z" fill={color} fillOpacity={0.08} />
    {/* Flame — outer */}
    <path d="M10,9 Q9,6 12,3 Q15,6 14,9" fill={color} fillOpacity={0.06} />
    {/* Flame — inner */}
    <path d="M11,9 Q10.5,7 12,5 Q13.5,7 13,9" fill={color} fillOpacity={0.1} />
    {/* Grip rings */}
    <line x1="11" y1="14" x2="13" y2="14" />
    <line x1="11" y1="16" x2="13" y2="16" />
  </svg>
);

/** Speaking podium / rostrum — kr2 */
const PodiumIcon: React.FC<IconProps> = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }) => (
  <svg {...svgProps(size, color)}>
    {/* Podium front face */}
    <path d="M6,10 L18,10 L17,20 L7,20 Z" fill={color} fillOpacity={0.04} />
    {/* Top surface */}
    <line x1="5" y1="10" x2="19" y2="10" />
    {/* Decorative panel */}
    <rect x="9" y="12" width="6" height="5" rx="0.5" fill="none" />
    {/* Laurel accent on panel */}
    <path d="M10.5,14 Q12,12.5 13.5,14" />
    {/* Base */}
    <line x1="7" y1="20" x2="17" y2="20" />
  </svg>
);

/** Artist palette — rr1 */
const PaletteIcon: React.FC<IconProps> = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }) => (
  <svg {...svgProps(size, color)}>
    {/* Palette shape */}
    <path
      d="M12,3 Q20,3 21,10 Q22,17 16,20 Q13,21 10,20 Q4,18 3,12 Q2,6 8,4 Q10,3 12,3 Z"
      fill={color}
      fillOpacity={0.04}
    />
    {/* Thumb hole */}
    <ellipse cx="9" cy="15" rx="2" ry="2.2" />
    {/* Paint dabs */}
    <circle cx="10" cy="7" r="1" fill={color} fillOpacity={0.15} />
    <circle cx="14" cy="6" r="1" fill={color} fillOpacity={0.12} />
    <circle cx="17" cy="9" r="1" fill={color} fillOpacity={0.1} />
    <circle cx="16" cy="13" r="0.8" fill={color} fillOpacity={0.12} />
  </svg>
);

/** Lyre (room variant, slightly smaller detail) — rr2 */
const LyreRoomIcon: React.FC<IconProps> = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }) => (
  <svg {...svgProps(size, color)}>
    {/* Base */}
    <path d="M9,20 L9,17 Q9,15 11,14.5 L13,14.5 Q15,15 15,17 L15,20" />
    <line x1="8" y1="20" x2="16" y2="20" />
    {/* Arms */}
    <path d="M9,17 Q6,13 7,8 Q7.5,5 10,4" fill="none" />
    <path d="M15,17 Q18,13 17,8 Q16.5,5 14,4" fill="none" />
    {/* Crossbar */}
    <line x1="8" y1="7.5" x2="16" y2="7.5" />
    {/* Strings */}
    <line x1="11" y1="7.5" x2="11" y2="14.5" />
    <line x1="13" y1="7.5" x2="13" y2="14.5" />
  </svg>
);

/** Amphora room variant — at1 */
const AmphoraRoomIcon: React.FC<IconProps> = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }) => (
  <svg {...svgProps(size, color)}>
    <ellipse cx="12" cy="5" rx="2.5" ry="0.8" />
    <path d="M9.5,5 Q9,8 8,9" fill="none" />
    <path d="M14.5,5 Q15,8 16,9" fill="none" />
    <path d="M8,9 Q5.5,12 6.5,16 Q7.5,19.5 12,20.5 Q16.5,19.5 17.5,16 Q18.5,12 16,9" fill={color} fillOpacity={0.05} />
    <path d="M8,9 Q4.5,10 6,14" fill="none" />
    <path d="M16,9 Q19.5,10 18,14" fill="none" />
    {/* Decorative band */}
    <ellipse cx="12" cy="13" rx="4" ry="0.8" />
  </svg>
);

// ===========================================================================
// MAPS
// ===========================================================================

export const WING_ICON_MAP: Record<string, React.FC<IconProps>> = {
  family: FamilyIcon,
  travel: TravelIcon,
  childhood: ChildhoodIcon,
  career: CareerIcon,
  creativity: CreativityIcon,
  attic: AtticIcon,
};

export const ROOM_ICON_MAP: Record<string, React.FC<IconProps>> = {
  // Family
  fr1: WreathIcon,
  fr2: CakeAmphoraIcon,
  fr3: CradleIcon,
  // Travel
  tr1: ColumnIcon,
  tr2: ToriiIcon,
  tr3: ArchIcon,
  tr4: MountainIcon,
  // Childhood
  cr1: ToolsIcon,
  cr2: ScrollIcon,
  // Career
  kr1: TorchIcon,
  kr2: PodiumIcon,
  // Creativity
  rr1: PaletteIcon,
  rr2: LyreRoomIcon,
  // Attic
  at1: AmphoraRoomIcon,
};

// ===========================================================================
// PUBLIC COMPONENTS
// ===========================================================================

/**
 * Renders the SVG icon for a given wing.
 * Falls back to a simple diamond shape if the wingId is unknown.
 */
export const WingIcon: React.FC<WingIconProps> = ({
  wingId,
  size = DEFAULT_SIZE,
  color = DEFAULT_COLOR,
}) => {
  const Icon = WING_ICON_MAP[wingId];
  if (Icon) return <Icon size={size} color={color} />;

  // Fallback — a simple diamond
  return (
    <svg {...svgProps(size, color)}>
      <polygon points="12,3 21,12 12,21 3,12" fill={color} fillOpacity={0.05} />
    </svg>
  );
};

/**
 * Renders the SVG icon for a given room.
 * Falls back to the parent wing icon, then to a generic circle.
 */
export const RoomIcon: React.FC<RoomIconProps> = ({
  roomId,
  wingId,
  size = DEFAULT_SIZE,
  color = DEFAULT_COLOR,
}) => {
  const Icon = ROOM_ICON_MAP[roomId];
  if (Icon) return <Icon size={size} color={color} />;

  // Fall back to wing icon if available
  if (wingId) {
    const WIcon = WING_ICON_MAP[wingId];
    if (WIcon) return <WIcon size={size} color={color} />;
  }

  // Generic fallback — a simple circle
  return (
    <svg {...svgProps(size, color)}>
      <circle cx="12" cy="12" r="8" fill={color} fillOpacity={0.05} />
    </svg>
  );
};

/**
 * Helper that returns a React element for a wing icon.
 */
export function getWingIconElement(
  wingId: string,
  size?: number,
  color?: string,
): React.ReactElement {
  return <WingIcon wingId={wingId} size={size} color={color} />;
}
