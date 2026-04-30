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

/** Seedling / tree — origins & roots */
const RootsIcon: React.FC<IconProps> = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }) => (
  <svg {...svgProps(size, color)}>
    {/* Trunk */}
    <line x1="12" y1="21" x2="12" y2="12" />
    {/* Left branch */}
    <path d="M12,14 Q8,12 6,8" fill="none" />
    {/* Right branch */}
    <path d="M12,12 Q16,10 18,7" fill="none" />
    {/* Canopy — rounded crown */}
    <path d="M5,10 Q5,3 12,3 Q19,3 19,10 Q19,14 12,14 Q5,14 5,10 Z" fill={color} fillOpacity={0.06} />
    {/* Roots below ground */}
    <path d="M12,21 Q9,21 7,22" fill="none" />
    <path d="M12,21 Q15,21 17,22" fill="none" />
    {/* Ground line */}
    <line x1="4" y1="21" x2="20" y2="21" />
  </svg>
);

/** Bird nest with eggs — home & family */
const NestIcon: React.FC<IconProps> = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }) => (
  <svg {...svgProps(size, color)}>
    {/* Nest bowl — woven texture */}
    <path d="M4,14 Q4,20 12,20 Q20,20 20,14" fill={color} fillOpacity={0.05} />
    <path d="M5,15 Q5,19 12,19 Q19,19 19,15" fill="none" />
    <path d="M6,16 Q8,18 12,18 Q16,18 18,16" fill="none" />
    {/* Three eggs */}
    <ellipse cx="9" cy="14" rx="2" ry="2.5" fill={color} fillOpacity={0.08} />
    <ellipse cx="12.5" cy="13.5" rx="1.8" ry="2.3" fill={color} fillOpacity={0.08} />
    <ellipse cx="15.5" cy="14" rx="1.8" ry="2.3" fill={color} fillOpacity={0.08} />
    {/* Twig ends sticking up */}
    <path d="M4,14 Q3,12 4,10" fill="none" />
    <path d="M20,14 Q21,12 20,10" fill="none" />
  </svg>
);

/** Hammer & anvil — building & craft */
const CraftIcon: React.FC<IconProps> = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }) => (
  <svg {...svgProps(size, color)}>
    {/* Anvil body */}
    <path d="M6,16 L4,16 L4,20 L20,20 L20,16 L18,16" fill="none" />
    <path d="M6,16 Q6,14 8,14 L16,14 Q18,14 18,16" fill={color} fillOpacity={0.06} />
    {/* Anvil horn */}
    <path d="M8,14 Q6,13 4,13" fill="none" />
    {/* Hammer — handle diagonal */}
    <line x1="10" y1="12" x2="6" y2="4" />
    {/* Hammer head */}
    <rect x="3" y="3" width="7" height="3" rx="0.5" transform="rotate(-15 6.5 4.5)" fill={color} fillOpacity={0.1} />
  </svg>
);

/** Compass rose — travel & exploration */
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

/** Heart with spark — passions & love */
const PassionsIcon: React.FC<IconProps> = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }) => (
  <svg {...svgProps(size, color)}>
    {/* Heart shape */}
    <path
      d="M12,20 L4,13 Q1,9 4,6 Q7,3 10,6 L12,8 L14,6 Q17,3 20,6 Q23,9 20,13 Z"
      fill={color}
      fillOpacity={0.06}
    />
    {/* Spark / flame in centre */}
    <path d="M12,11 Q11,13 12,15 Q13,13 12,11" fill={color} fillOpacity={0.12} />
    <path d="M11.5,13 Q12,10 12.5,13" fill="none" />
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
// ROOM ICONS — Roots wing
// ===========================================================================

/** Mirror / looking glass — ro1: Me Over Time */
const MirrorIcon: React.FC<IconProps> = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }) => (
  <svg {...svgProps(size, color)}>
    {/* Oval mirror frame */}
    <ellipse cx="12" cy="10" rx="6" ry="7.5" fill={color} fillOpacity={0.04} />
    <ellipse cx="12" cy="10" rx="4.5" ry="6" fill={color} fillOpacity={0.04} />
    {/* Reflection glint */}
    <path d="M9,7 Q10,5 11,7" fill="none" />
    {/* Stand / handle */}
    <line x1="12" y1="17.5" x2="12" y2="21" />
    <line x1="9" y1="21" x2="15" y2="21" />
  </svg>
);

/** Dining table with plates — ro2: Sunday Lunches */
const DiningIcon: React.FC<IconProps> = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }) => (
  <svg {...svgProps(size, color)}>
    {/* Table top */}
    <line x1="3" y1="12" x2="21" y2="12" />
    {/* Table legs */}
    <line x1="5" y1="12" x2="4" y2="20" />
    <line x1="19" y1="12" x2="20" y2="20" />
    {/* Left plate */}
    <ellipse cx="8" cy="10.5" rx="2.5" ry="0.8" />
    {/* Right plate */}
    <ellipse cx="16" cy="10.5" rx="2.5" ry="0.8" />
    {/* Centre dish / bowl */}
    <path d="M10.5,9 Q12,7 13.5,9" fill="none" />
    <line x1="10.5" y1="9" x2="13.5" y2="9" />
    {/* Fork left */}
    <line x1="5" y1="8" x2="5" y2="11" />
    {/* Knife right */}
    <line x1="19" y1="8" x2="19" y2="11" />
  </svg>
);

/** Wrench / spanner — ro3: Dad's Garage */
const WrenchIcon: React.FC<IconProps> = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }) => (
  <svg {...svgProps(size, color)}>
    {/* Wrench shape */}
    <path d="M6,4 Q4,4 3,6 Q2,8 4,9 L5,9 L14,18" fill="none" />
    <path d="M14,18 Q15,20 17,20 Q19,20 20,18 Q21,16 19,15 L18,15 L9,6" fill="none" />
    {/* Open jaw top */}
    <path d="M6,4 Q7,3 9,4 L9,6 Q8,7 6,6" fill={color} fillOpacity={0.06} />
    {/* Open jaw bottom */}
    <path d="M17,20 Q18,21 20,20 L19,15 Q20,14 18,14" fill={color} fillOpacity={0.06} />
    {/* Handle */}
    <line x1="8" y1="7" x2="16" y2="17" />
  </svg>
);

/** Backpack / satchel — ro4: School Days */
const BackpackIcon: React.FC<IconProps> = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }) => (
  <svg {...svgProps(size, color)}>
    {/* Main body */}
    <path d="M6,8 L6,19 Q6,21 8,21 L16,21 Q18,21 18,19 L18,8" fill={color} fillOpacity={0.04} />
    {/* Top flap / rounded top */}
    <path d="M6,8 Q6,4 12,4 Q18,4 18,8" fill="none" />
    {/* Handle loop */}
    <path d="M10,4 Q10,2 12,2 Q14,2 14,4" fill="none" />
    {/* Front pocket */}
    <rect x="8" y="13" width="8" height="5" rx="1" fill={color} fillOpacity={0.06} />
    {/* Buckle */}
    <line x1="11" y1="13" x2="13" y2="13" />
    {/* Straps */}
    <path d="M8,8 L7,10" fill="none" />
    <path d="M16,8 L17,10" fill="none" />
  </svg>
);

// ===========================================================================
// ROOM ICONS — Nest wing
// ===========================================================================

/** Baby rattle — ne1: Baby's First Year */
const RattleIcon: React.FC<IconProps> = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }) => (
  <svg {...svgProps(size, color)}>
    {/* Rattle head — circle */}
    <circle cx="12" cy="8" r="5" fill={color} fillOpacity={0.06} />
    {/* Rattle beads inside */}
    <circle cx="10.5" cy="7" r="0.7" fill={color} fillOpacity={0.15} />
    <circle cx="13.5" cy="7" r="0.7" fill={color} fillOpacity={0.15} />
    <circle cx="12" cy="9.5" r="0.7" fill={color} fillOpacity={0.15} />
    {/* Handle */}
    <line x1="12" y1="13" x2="12" y2="20" />
    {/* Handle grip rings */}
    <line x1="11" y1="16" x2="13" y2="16" />
    <line x1="11" y1="18" x2="13" y2="18" />
    {/* Bottom cap */}
    <circle cx="12" cy="20.5" r="0.8" fill={color} fillOpacity={0.1} />
  </svg>
);

/** Cake with candle — ne2: Birthdays at Home */
const CakeIcon: React.FC<IconProps> = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }) => (
  <svg {...svgProps(size, color)}>
    {/* Cake body */}
    <rect x="5" y="12" width="14" height="8" rx="1" fill={color} fillOpacity={0.05} />
    {/* Frosting wave */}
    <path d="M5,12 Q8,10 11,12 Q14,14 17,12 L19,12" fill="none" />
    {/* Plate / base */}
    <line x1="3" y1="20" x2="21" y2="20" />
    {/* Centre candle */}
    <line x1="12" y1="8" x2="12" y2="12" />
    {/* Flame */}
    <path d="M11.3,8 Q12,5.5 12.7,8" fill={color} fillOpacity={0.1} />
    {/* Side candles */}
    <line x1="8" y1="9" x2="8" y2="12" />
    <path d="M7.5,9 Q8,7 8.5,9" fill={color} fillOpacity={0.08} />
    <line x1="16" y1="9" x2="16" y2="12" />
    <path d="M15.5,9 Q16,7 16.5,9" fill={color} fillOpacity={0.08} />
  </svg>
);

/** House with chimney — ne3: House on Elm Street */
const HouseIcon: React.FC<IconProps> = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }) => (
  <svg {...svgProps(size, color)}>
    {/* Roof */}
    <polyline points="3,12 12,4 21,12" fill={color} fillOpacity={0.04} />
    {/* Walls */}
    <rect x="5" y="12" width="14" height="9" fill={color} fillOpacity={0.03} />
    {/* Door */}
    <rect x="10" y="15" width="4" height="6" rx="0.5" fill="none" />
    {/* Door knob */}
    <circle cx="13" cy="18" r="0.4" fill={color} fillOpacity={0.3} />
    {/* Window left */}
    <rect x="6.5" y="14" width="2.5" height="2.5" rx="0.3" fill="none" />
    {/* Window right */}
    <rect x="15" y="14" width="2.5" height="2.5" rx="0.3" fill="none" />
    {/* Chimney */}
    <rect x="16" y="5" width="2.5" height="5" fill="none" />
  </svg>
);

/** Rings — ne4: Our Wedding */
const RingsIcon: React.FC<IconProps> = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }) => (
  <svg {...svgProps(size, color)}>
    {/* Left ring */}
    <circle cx="9.5" cy="13" r="5" fill={color} fillOpacity={0.04} />
    {/* Right ring — interlocked */}
    <circle cx="14.5" cy="13" r="5" fill={color} fillOpacity={0.04} />
    {/* Diamond on top of right ring */}
    <polygon points="14.5,6 13,8 14.5,7.5 16,8" fill={color} fillOpacity={0.12} stroke={color} />
    {/* Ring band thickness hint */}
    <circle cx="9.5" cy="13" r="3.8" fill="none" strokeOpacity={0.3} />
    <circle cx="14.5" cy="13" r="3.8" fill="none" strokeOpacity={0.3} />
  </svg>
);

// ===========================================================================
// ROOM ICONS — Craft wing
// ===========================================================================

/** Notebook / first job badge — cf1: My First Job */
const NotebookIcon: React.FC<IconProps> = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }) => (
  <svg {...svgProps(size, color)}>
    {/* Notebook body */}
    <rect x="6" y="3" width="13" height="18" rx="1" fill={color} fillOpacity={0.04} />
    {/* Spine */}
    <line x1="6" y1="3" x2="6" y2="21" />
    {/* Ring bindings */}
    <circle cx="6" cy="7" r="1" fill="none" />
    <circle cx="6" cy="12" r="1" fill="none" />
    <circle cx="6" cy="17" r="1" fill="none" />
    {/* Text lines */}
    <line x1="9" y1="8" x2="16" y2="8" />
    <line x1="9" y1="11" x2="16" y2="11" />
    <line x1="9" y1="14" x2="14" y2="14" />
  </svg>
);

/** Trophy / cup — cf2: Big Project 2019 */
const TrophyIcon: React.FC<IconProps> = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }) => (
  <svg {...svgProps(size, color)}>
    {/* Cup body */}
    <path d="M7,4 L7,10 Q7,14 12,14 Q17,14 17,10 L17,4" fill={color} fillOpacity={0.06} />
    {/* Rim */}
    <line x1="6" y1="4" x2="18" y2="4" />
    {/* Left handle */}
    <path d="M7,6 Q3,6 3,9 Q3,12 7,12" fill="none" />
    {/* Right handle */}
    <path d="M17,6 Q21,6 21,9 Q21,12 17,12" fill="none" />
    {/* Stem */}
    <line x1="12" y1="14" x2="12" y2="18" />
    {/* Base */}
    <line x1="8" y1="18" x2="16" y2="18" />
    <line x1="9" y1="20" x2="15" y2="20" />
    <line x1="8" y1="18" x2="9" y2="20" />
    <line x1="16" y1="18" x2="15" y2="20" />
  </svg>
);

/** Graduation cap — cf3: Diploma Day */
const GradCapIcon: React.FC<IconProps> = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }) => (
  <svg {...svgProps(size, color)}>
    {/* Mortarboard — diamond top */}
    <polygon points="12,4 22,10 12,14 2,10" fill={color} fillOpacity={0.06} />
    {/* Cap body / band */}
    <path d="M6,11 L6,16 Q6,18 12,19 Q18,18 18,16 L18,11" fill="none" />
    {/* Tassel */}
    <line x1="22" y1="10" x2="22" y2="16" />
    <circle cx="22" cy="17" r="0.8" fill={color} fillOpacity={0.15} />
    {/* Centre line on cap */}
    <line x1="12" y1="10" x2="12" y2="14" />
  </svg>
);

// ===========================================================================
// ROOM ICONS — Travel wing
// ===========================================================================

/** Torii gate — tv1: Tokyo 2023 */
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

/** Mountain peaks — tv2: Patagonia 2022 */
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

/** Triumphal arch / Colosseum — tv3: Rome 2024 */
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

/** Winding road — tv4: Coast Road 2021 */
const RoadIcon: React.FC<IconProps> = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }) => (
  <svg {...svgProps(size, color)}>
    {/* Road — winding path receding into distance */}
    <path d="M8,21 Q6,16 10,13 Q14,10 10,7 Q8,5 10,3" fill="none" />
    <path d="M16,21 Q14,16 16,13 Q18,10 14,7 Q12,5 13,3" fill="none" />
    {/* Dashed centre line */}
    <line x1="12" y1="20" x2="12" y2="18" strokeDasharray="1 1.5" strokeOpacity={0.4} />
    <line x1="13" y1="14" x2="12" y2="12" strokeDasharray="1 1.5" strokeOpacity={0.4} />
    <line x1="12" y1="8" x2="11" y2="6" strokeDasharray="1 1.5" strokeOpacity={0.4} />
    {/* Sun on horizon */}
    <circle cx="18" cy="4" r="2" fill={color} fillOpacity={0.08} />
  </svg>
);

// ===========================================================================
// ROOM ICONS — Passions wing
// ===========================================================================

/** Saxophone — pa1: Saxophone Years */
const SaxophoneIcon: React.FC<IconProps> = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }) => (
  <svg {...svgProps(size, color)}>
    {/* Mouthpiece */}
    <line x1="7" y1="3" x2="10" y2="6" />
    {/* Neck */}
    <path d="M10,6 Q12,7 12,10" fill="none" />
    {/* Body — curved tube */}
    <path d="M12,10 L12,15 Q12,19 16,20 Q19,20 19,17" fill="none" />
    {/* Bell */}
    <path d="M19,17 Q20,20 17,21 Q14,22 14,19" fill={color} fillOpacity={0.06} />
    {/* Keys */}
    <circle cx="11" cy="11" r="0.6" fill={color} fillOpacity={0.15} />
    <circle cx="11.5" cy="13" r="0.6" fill={color} fillOpacity={0.15} />
    <circle cx="12" cy="15" r="0.6" fill={color} fillOpacity={0.15} />
  </svg>
);

/** Chef hat — pa2: In the Kitchen */
const ChefHatIcon: React.FC<IconProps> = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }) => (
  <svg {...svgProps(size, color)}>
    {/* Hat band */}
    <rect x="6" y="14" width="12" height="3" rx="0.5" fill={color} fillOpacity={0.06} />
    {/* Puffy top */}
    <path d="M6,14 Q4,14 4,11 Q4,8 7,7 Q7,4 10,4 Q12,3 14,4 Q17,4 17,7 Q20,8 20,11 Q20,14 18,14" fill={color} fillOpacity={0.04} />
    {/* Vertical pleats */}
    <line x1="9" y1="8" x2="9" y2="14" strokeOpacity={0.3} />
    <line x1="12" y1="7" x2="12" y2="14" strokeOpacity={0.3} />
    <line x1="15" y1="8" x2="15" y2="14" strokeOpacity={0.3} />
    {/* Apron strings hint */}
    <line x1="6" y1="17" x2="6" y2="20" />
    <line x1="18" y1="17" x2="18" y2="20" />
  </svg>
);

/** Football / soccer ball — pa3: Saturday Football */
const FootballIcon: React.FC<IconProps> = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }) => (
  <svg {...svgProps(size, color)}>
    {/* Ball */}
    <circle cx="12" cy="12" r="8" fill={color} fillOpacity={0.04} />
    {/* Pentagon pattern */}
    <polygon points="12,6 15,9 14,13 10,13 9,9" fill={color} fillOpacity={0.1} />
    {/* Panel lines radiating from pentagon */}
    <line x1="12" y1="6" x2="12" y2="4" />
    <line x1="15" y1="9" x2="18" y2="7" />
    <line x1="14" y1="13" x2="17" y2="16" />
    <line x1="10" y1="13" x2="7" y2="16" />
    <line x1="9" y1="9" x2="6" y2="7" />
  </svg>
);

// ===========================================================================
// ROOM ICONS — Attic
// ===========================================================================

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
  roots: RootsIcon,
  nest: NestIcon,
  craft: CraftIcon,
  travel: TravelIcon,
  passions: PassionsIcon,
  attic: AtticIcon,
};

export const ROOM_ICON_MAP: Record<string, React.FC<IconProps>> = {
  // Roots — Where I come from
  ro1: MirrorIcon,      // Me Over Time
  ro2: DiningIcon,      // Sunday Lunches
  ro3: WrenchIcon,      // Dad's Garage
  ro4: BackpackIcon,    // School Days
  // Nest — The home I've made
  ne1: RattleIcon,      // Baby's First Year
  ne2: CakeIcon,        // Birthdays at Home
  ne3: HouseIcon,       // House on Elm Street
  ne4: RingsIcon,       // Our Wedding
  // Craft — What I've built and learned
  cf1: NotebookIcon,    // My First Job
  cf2: TrophyIcon,      // Big Project 2019
  cf3: GradCapIcon,     // Diploma Day
  // Travel — Places I've been
  tv1: ToriiIcon,       // Tokyo 2023
  tv2: MountainIcon,    // Patagonia 2022
  tv3: ArchIcon,        // Rome 2024
  tv4: RoadIcon,        // Coast Road 2021
  // Passions — What I do for love
  pa1: SaxophoneIcon,   // Saxophone Years
  pa2: ChefHatIcon,     // In the Kitchen
  pa3: FootballIcon,    // Saturday Football
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
