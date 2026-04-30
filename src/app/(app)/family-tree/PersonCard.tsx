import { memo } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import type { FamilyTreePerson } from "@/lib/auth/family-tree-actions";
import type { TreeNode } from "./tree-layout";

/* ──────────────────────────────────── SVG icons ── */

/** Stylized family tree branch icon (SVG, non-emoji) */
export function TreeBranchIcon({ size = 20, color = T.color.walnut }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: "block" }}
    >
      {/* Trunk */}
      <line x1="12" y1="22" x2="12" y2="8" />
      {/* Left branch */}
      <path d="M12 14 Q8 12 5 8" />
      <circle cx="5" cy="6" r="2" fill={color} opacity={0.3} />
      {/* Right branch */}
      <path d="M12 14 Q16 12 19 8" />
      <circle cx="19" cy="6" r="2" fill={color} opacity={0.3} />
      {/* Top */}
      <circle cx="12" cy="6" r="2.5" fill={color} opacity={0.4} />
    </svg>
  );
}

/** Close X icon */
export function CloseIcon({ size = 18, color = T.color.muted }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      style={{ display: "block" }}
    >
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  );
}

/** Compute age category from birth/death dates */
/** Strip date qualifier prefix (~, <, >) and range suffix (/…) for parsing */
function stripDateQualifier(d: string): string {
  let s = d;
  if (s.startsWith("~") || s.startsWith("<") || s.startsWith(">")) s = s.slice(1);
  // For ranges like "1850/1860", use the first date
  const slashIdx = s.indexOf("/");
  if (slashIdx > 0) s = s.slice(0, slashIdx);
  return s;
}

/** Parse a flexible date (YYYY, YYYY-MM, YYYY-MM-DD, with optional qualifier) into a Date */
function parseFlexDate(d: string): Date {
  const plain = stripDateQualifier(d);
  if (/^\d{4}$/.test(plain)) return new Date(`${plain}-01-01T00:00:00`);
  if (/^\d{4}-\d{2}$/.test(plain)) return new Date(`${plain}-01T00:00:00`);
  return new Date(`${plain}T00:00:00`);
}

export function getAgeCategory(birthDate: string | null, deathDate: string | null): "baby" | "child" | "teen" | "adult" | "elder" {
  if (!birthDate) return "adult";
  const refDate = deathDate ? parseFlexDate(deathDate) : new Date();
  const birth = parseFlexDate(birthDate);
  if (isNaN(birth.getTime())) return "adult";
  let age = refDate.getFullYear() - birth.getFullYear();
  const m = refDate.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && refDate.getDate() < birth.getDate())) age--;
  if (age < 4) return "baby";
  if (age < 13) return "child";
  if (age < 18) return "teen";
  if (age < 65) return "adult";
  return "elder";
}

/** Truncate a name string if too long */
function truncateName(name: string, maxLen: number): string {
  if (name.length > maxLen) return name.slice(0, maxLen - 1) + "\u2026";
  return name;
}

/** Return the silhouette icon paths (no wrapper) for a given gender/age */
export function genderIconPaths(gender: string | null, fillColor: string, isDead: boolean, age: "baby" | "child" | "teen" | "adult" | "elder") {
    if (age === "baby") {
      if (gender === "female") {
        /* Baby girl: round head with bow, swaddled body */
        return (
          <>
            <circle cx="12" cy="7" r="3" fill={fillColor} />
            {/* Bow on top */}
            <path d="M10 4.5 L12 3.5 L14 4.5" fill={fillColor} />
            <path d="M11 3.8 L12 3 L13 3.8" fill={fillColor} />
            <circle cx="12" cy="3.5" r="0.5" fill={fillColor} />
            {/* Swaddled body */}
            <ellipse cx="12" cy="16" rx="5" ry="6" fill={fillColor} />
          </>
        );
      }
      /* Baby boy (or unknown baby): round head, swaddled body, no bow */
      return (
        <>
          <circle cx="12" cy="7" r="3" fill={fillColor} />
          {/* Swaddled body */}
          <ellipse cx="12" cy="16" rx="5" ry="6" fill={fillColor} />
          {/* Tiny tuft of hair */}
          <ellipse cx="12" cy="4.2" rx="1" ry="0.6" fill={fillColor} />
        </>
      );
    }

    if (age === "child") {
      if (gender === "female") {
        /* Girl child: head with pigtails, triangular dress */
        return (
          <>
            <circle cx="12" cy="6.5" r="3" fill={fillColor} />
            {/* Left pigtail */}
            <ellipse cx="7.5" cy="6" rx="1.2" ry="2.5" fill={fillColor} />
            {/* Right pigtail */}
            <ellipse cx="16.5" cy="6" rx="1.2" ry="2.5" fill={fillColor} />
            {/* Triangular dress */}
            <polygon points="12,9.5 5,22 19,22" fill={fillColor} />
          </>
        );
      }
      /* Boy child: round head with flat-top hair, t-shirt & shorts */
      return (
        <>
          <circle cx="12" cy="6.5" r="3" fill={fillColor} />
          {/* Flat-top hair */}
          <rect x="9" y="3.5" width="6" height="2" rx="0.5" fill={fillColor} />
          {/* T-shirt body (rectangle, wider at shoulders) */}
          <path d="M8 9.5 L16 9.5 L16 16 L8 16 Z" fill={fillColor} />
          {/* Arms */}
          <rect x="5" y="9.5" width="3" height="3" rx="1" fill={fillColor} />
          <rect x="16" y="9.5" width="3" height="3" rx="1" fill={fillColor} />
          {/* Shorts (two legs) */}
          <rect x="8.5" y="16" width="3" height="5" rx="0.5" fill={fillColor} />
          <rect x="12.5" y="16" width="3" height="5" rx="0.5" fill={fillColor} />
        </>
      );
    }

    if (age === "teen") {
      if (gender === "female") {
        /* Teen girl: head with longer flowing hair, fitted blouse/skirt */
        return (
          <>
            <circle cx="12" cy="6" r="3" fill={fillColor} />
            {/* Long hair flowing to right */}
            <path d="M9 4 Q8 3.5 8.5 6 Q8 9 7 11 L9 10 Q9.5 7 9.5 5 Z" fill={fillColor} />
            <path d="M15 4 Q16 3.5 15.5 6 Q16 9 17 11 L15 10 Q14.5 7 14.5 5 Z" fill={fillColor} />
            {/* Fitted top */}
            <path d="M9 9 L15 9 L14.5 14 L9.5 14 Z" fill={fillColor} />
            {/* Flared skirt */}
            <polygon points="9,14 15,14 18,22 6,22" fill={fillColor} />
          </>
        );
      }
      /* Teen boy: styled hair, broader shoulders, casual outfit */
      return (
        <>
          <circle cx="12" cy="6" r="3" fill={fillColor} />
          {/* Styled hair (swept to side) */}
          <path d="M9 4 Q10 2.5 14 3 Q16 3.5 15.5 5 L9.5 4.5 Z" fill={fillColor} />
          {/* Broader shoulders, casual body */}
          <path d="M7 9 L17 9 L17 16 L7 16 Z" fill={fillColor} />
          {/* Arms */}
          <rect x="4.5" y="9" width="2.5" height="4" rx="1" fill={fillColor} />
          <rect x="17" y="9" width="2.5" height="4" rx="1" fill={fillColor} />
          {/* Pants (two legs) */}
          <rect x="7.5" y="16" width="3.5" height="6" rx="0.5" fill={fillColor} />
          <rect x="13" y="16" width="3.5" height="6" rx="0.5" fill={fillColor} />
        </>
      );
    }

    if (age === "elder") {
      if (gender === "female") {
        /* Elder woman: short curled hair, slightly stooped, shawl */
        return (
          <>
            <circle cx="11" cy="6" r="3" fill={fillColor} />
            {/* Short curled hair */}
            <path d="M8 4.5 Q8.5 3 10 2.8 Q12 2.5 13.5 3.5 Q14 4.5 13.5 5" fill={fillColor} />
            {/* Slightly stooped body + shawl */}
            <path d="M8 9 Q6 9 5 10 L4 15 L6 14 L7 11 Z" fill={fillColor} />
            <path d="M8 9 L14 9 L15 14 L7 14 Z" fill={fillColor} />
            {/* Dress / skirt (slightly asymmetric for stoop) */}
            <polygon points="6,14 15,14 17,22 4,22" fill={fillColor} />
            {/* Shawl drape across shoulders */}
            <path d="M5 10 Q8 8 11 9 Q14 8 16 10" fill={fillColor} opacity="0.6" />
          </>
        );
      }
      /* Elder man: receding hair/bald, slightly stooped, walking stick */
      return (
        <>
          <circle cx="11" cy="6" r="3" fill={fillColor} />
          {/* Receding hairline — just a small arc on top */}
          <path d="M10 3.5 Q11 3 12.5 3.5" fill={fillColor} />
          {/* Slightly stooped body */}
          <path d="M7.5 9 L14.5 9 L15 16 L7 16 Z" fill={fillColor} />
          {/* Arms (one forward, holding stick) */}
          <rect x="4.5" y="9" width="3" height="3.5" rx="1" fill={fillColor} />
          <rect x="14.5" y="9" width="3" height="3.5" rx="1" fill={fillColor} />
          {/* Pants */}
          <rect x="7.5" y="16" width="3.2" height="6" rx="0.5" fill={fillColor} />
          <rect x="11.3" y="16" width="3.2" height="6" rx="0.5" fill={fillColor} />
          {/* Walking stick */}
          <rect x="18" y="8" width="1" height="14" rx="0.5" fill={fillColor} />
          <ellipse cx="18.5" cy="8" rx="1.2" ry="0.8" fill={fillColor} />
        </>
      );
    }

    /* Adult (default age) */
    if (gender === "female") {
      /* Adult woman: styled hair with bun, elegant dress with waist */
      return (
        <>
          <circle cx="12" cy="6" r="3.2" fill={fillColor} />
          {/* Hair bun on top */}
          <circle cx="12" cy="3" r="1.5" fill={fillColor} />
          {/* Elegant dress — narrow waist, flared skirt */}
          <path d="M9 9.2 L15 9.2 L14 13 L10 13 Z" fill={fillColor} />
          {/* Flared skirt from waist */}
          <polygon points="9.5,13 14.5,13 19,22 5,22" fill={fillColor} />
          {/* Shoulders / sleeves hint */}
          <path d="M9 9.2 Q7 9.5 6 11 L8 11 Z" fill={fillColor} />
          <path d="M15 9.2 Q17 9.5 18 11 L16 11 Z" fill={fillColor} />
        </>
      );
    }

    if (gender === "male") {
      /* Adult man: short hair, broad shoulders, suit/toga */
      return (
        <>
          <circle cx="12" cy="6" r="3.2" fill={fillColor} />
          {/* Short cropped hair */}
          <path d="M8.8 4 Q10 2.5 12 2.5 Q14 2.5 15.2 4" fill={fillColor} />
          {/* Broad shoulders + torso */}
          <path d="M5 10 L19 10 L18 16 L6 16 Z" fill={fillColor} />
          {/* Shoulder epaulettes for strong shoulder line */}
          <rect x="4" y="9.5" width="4" height="2.5" rx="1" fill={fillColor} />
          <rect x="16" y="9.5" width="4" height="2.5" rx="1" fill={fillColor} />
          {/* Pants (two legs) */}
          <rect x="6.5" y="16" width="4.5" height="6" rx="0.5" fill={fillColor} />
          <rect x="13" y="16" width="4.5" height="6" rx="0.5" fill={fillColor} />
        </>
      );
    }

    /* Other/Unknown: head-and-shoulders with question mark */
    return (
      <>
        <circle cx="12" cy="6.5" r="3" fill={fillColor} />
        {/* Shoulders silhouette */}
        <path d="M4 22 Q4 14 12 12 Q20 14 20 22 Z" fill={fillColor} />
        {/* Question mark */}
        <text
          x="12"
          y="20"
          textAnchor="middle"
          fontSize="6"
          fontWeight="bold"
          fill={isDead ? T.color.warmStone : T.color.warmStone}
          opacity="0.8"
        >
          ?
        </text>
      </>
    );
}

/** Distinct age/gender silhouette icon for empty photo — standalone <svg> version */
function GenderIcon({ gender, size, color, birthDate, deathDate }: {
  gender: string | null; size: number; color: string;
  birthDate?: string | null; deathDate?: string | null;
}) {
  const age = getAgeCategory(birthDate || null, deathDate || null);
  const isDead = !!deathDate;
  const fillColor = isDead ? T.color.muted : color;
  const fillOpacity = isDead ? 0.3 : 0.5;

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" opacity={fillOpacity} style={{ display: "block" }}>
      {genderIconPaths(gender, fillColor, isDead, age)}
    </svg>
  );
}

/** Inline SVG <g> version of gender icon — renders natively inside an SVG context */
function GenderIconGroup({ gender, cx, cy, size, color, birthDate, deathDate }: {
  gender: string | null; cx: number; cy: number; size: number; color: string;
  birthDate?: string | null; deathDate?: string | null;
}) {
  const age = getAgeCategory(birthDate || null, deathDate || null);
  const isDead = !!deathDate;
  const fillColor = isDead ? T.color.muted : color;
  const fillOpacity = isDead ? 0.3 : 0.5;
  const scale = size / 24;
  const tx = cx - size / 2;
  const ty = cy - size / 2;

  return (
    <g transform={`translate(${tx}, ${ty}) scale(${scale})`} opacity={fillOpacity}>
      {genderIconPaths(gender, fillColor, isDead, age)}
    </g>
  );
}

/* ──────────────────────────────────── CompletionRing ── */

/** Tiny arc badge showing % completeness of person data */
function CompletionRing({ person, x, y, size = 16 }: {
  person: FamilyTreePerson;
  x: number;
  y: number;
  size?: number;
}) {
  const isDeceased = !!person.death_date || !!person.death_place;
  const photoSkipped = person.photo_path === "__none__";
  let maxScore = isDeceased ? 100 : 80;
  let score = 0;
  if (person.first_name && person.first_name !== "?") score += 20;
  if (person.photo_path && !photoSkipped) score += 20;
  if (person.birth_date) score += 20;
  if (person.birth_place) score += 20;
  if (isDeceased) {
    if (person.death_date) score += 10;
    if (person.death_place) score += 10;
  }
  if (photoSkipped) maxScore -= 20;

  const color = (score / maxScore * 100) >= 80 ? T.color.sage : (score / maxScore * 100) >= 40 ? "#D4A840" : T.color.error;
  const r = size / 2 - 1.5;
  const cx = x + size / 2;
  const cy = y + size / 2;
  const pct = maxScore > 0 ? score / maxScore : 1;
  const angle = pct * 360;
  const rad = (angle - 90) * (Math.PI / 180);
  const largeArc = angle > 180 ? 1 : 0;
  const ex = cx + r * Math.cos(rad);
  const ey = cy + r * Math.sin(rad);

  return (
    <g>
      {/* Background track */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={T.color.sandstone} strokeWidth={2} opacity={0.3} />
      {/* Progress arc */}
      {score > 0 && score < maxScore && (
        <path
          d={`M ${cx} ${cy - r} A ${r} ${r} 0 ${largeArc} 1 ${ex} ${ey}`}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
        />
      )}
      {score >= maxScore && (
        <circle cx={cx} cy={cy} r={r} fill={color} stroke={color} strokeWidth={1} opacity={0.85} />
      )}
    </g>
  );
}

/* ──────────────────────────────────── SVG person card ── */

/** Render a single person card at (0,0) -- caller translates */
export const PersonCard = memo(function PersonCard({
  person,
  onSelect,
  nodeWPx,
  nodeHPx,
  isSelf,
  onQuickAdd,
  relCount,
  isFocused,
}: {
  person: FamilyTreePerson;
  onSelect: (p: FamilyTreePerson) => void;
  nodeWPx: number;
  nodeHPx: number;
  isSelf?: boolean;
  onQuickAdd?: (person: FamilyTreePerson, x: number, y: number) => void;
  relCount?: number;
  isFocused?: boolean;
}) {
  const { t } = useTranslation("familyTree");
  const firstName = truncateName(person.first_name || "", 14);
  const lastName = truncateName(person.last_name || "", 16);
  const year = (d: string | null) => {
    if (!d) return "";
    // Strip qualifier prefix and extract year with qualifier display
    let prefix = "";
    let s = d;
    if (s.startsWith("~")) { prefix = t("datePrefixCirca"); s = s.slice(1); }
    else if (s.startsWith("<")) { prefix = t("datePrefixBefore"); s = s.slice(1); }
    else if (s.startsWith(">")) { prefix = t("datePrefixAfter"); s = s.slice(1); }
    // Range: "1850/1860" → "1850-1860"
    const rangeMatch = s.match(/^(\d{4})(?:-\d{2}(?:-\d{2})?)?\/(\d{4})/);
    if (rangeMatch) return `${rangeMatch[1]}-${rangeMatch[2]}`;
    // Handle YYYY, YYYY-MM, YYYY-MM-DD formats
    const m = s.match(/^(\d{4})/);
    if (m) return `${prefix}${m[1]}`;
    return "";
  };
  const birthYear = year(person.birth_date);
  const deathYear = year(person.death_date);
  const lifespan =
    person.birth_date || person.death_date
      ? `${birthYear || "?"}\u2013${deathYear || ""}`
      : "";

  const photoR = nodeHPx * 0.26; // larger photo circle
  const photoCx = nodeHPx * 0.44;
  const textX = nodeHPx * 0.82;
  const firstNameY = nodeHPx * 0.36;
  const lastNameY = nodeHPx * 0.52;
  const lifespanY = nodeHPx * 0.68;
  const borderR = 16; // px -- equivalent to ~1rem

  const genderColor =
    person.gender === "female"
      ? "#D4A0A0"
      : person.gender === "male"
        ? "#A0B8D4"
        : T.color.sandstone;

  const isDead = !!person.death_date;
  const goldBorder = T.color.gold;
  const strokeColor = isSelf ? goldBorder : T.color.cream;
  const strokeW = isSelf ? 2.5 : 1.5;

  // Unique gradient ID per card
  const gradId = `card-bg-${person.id}`;

  return (
    <g
      style={{ cursor: "pointer" }}
      role="button"
      tabIndex={0}
      aria-label={`${person.first_name}${person.last_name ? ` ${person.last_name}` : ""}`}
      onClick={() => onSelect(person)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(person);
        }
      }}
    >
      <defs>
        {/* Warm gradient background per card */}
        <linearGradient id={gradId} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor={isSelf ? "#FDF8EC" : isDead ? "#F5F2EE" : "#FDFCFA"} stopOpacity={isSelf ? 0.98 : 0.95} />
          <stop offset="100%" stopColor={isSelf ? "#F3E8C8" : isDead ? "#EDE8E2" : "#F7F0E6"} stopOpacity={isSelf ? 0.96 : 0.92} />
        </linearGradient>
        {/* Self node: radial gold glow filter */}
        {isSelf && (
          <filter id={`self-glow-${person.id}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feFlood floodColor={goldBorder} floodOpacity="0.18" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        )}
        {/* Decorative photo frame ring */}
        <radialGradient id={`photo-ring-${person.id}`}>
          <stop offset="70%" stopColor={genderColor} stopOpacity={0.35} />
          <stop offset="100%" stopColor={genderColor} stopOpacity={0.08} />
        </radialGradient>
      </defs>

      {/* Keyboard focus ring */}
      {isFocused && (
        <rect
          x={-4}
          y={-4}
          width={nodeWPx + 8}
          height={nodeHPx + 8}
          rx={borderR + 4}
          ry={borderR + 4}
          fill="none"
          stroke={T.color.terracotta}
          strokeWidth={2.5}
          strokeDasharray="6 3"
          opacity={0.85}
        />
      )}

      {/* Card shadow — deeper, warmer */}
      <rect
        x={1}
        y={2.5}
        width={nodeWPx}
        height={nodeHPx}
        rx={borderR}
        ry={borderR}
        fill="rgba(139,115,85,.10)"
      />
      <rect
        x={0.5}
        y={1.5}
        width={nodeWPx}
        height={nodeHPx}
        rx={borderR}
        ry={borderR}
        fill="rgba(44,44,42,.06)"
      />

      {/* Warm gradient background */}
      <rect
        width={nodeWPx}
        height={nodeHPx}
        rx={borderR}
        ry={borderR}
        fill={`url(#${gradId})`}
        stroke={strokeColor}
        strokeWidth={strokeW}
      />

      {/* Self node: outer gold glow + double border */}
      {isSelf && (
        <>
          {/* Soft gold glow halo */}
          <rect
            x={-5}
            y={-5}
            width={nodeWPx + 10}
            height={nodeHPx + 10}
            rx={borderR + 5}
            ry={borderR + 5}
            fill="none"
            stroke={goldBorder}
            strokeWidth={2}
            opacity={0.15}
            filter={`url(#self-glow-${person.id})`}
          />
          {/* Inner gold ring */}
          <rect
            x={-2}
            y={-2}
            width={nodeWPx + 4}
            height={nodeHPx + 4}
            rx={borderR + 2}
            ry={borderR + 2}
            fill="none"
            stroke={goldBorder}
            strokeWidth={1.5}
            opacity={0.55}
          />
          {/* Corner laurel ornaments (top-left and top-right) */}
          <g opacity={0.3}>
            <path d={`M ${borderR + 2} 1 Q ${borderR / 2} -2 2 ${borderR / 2}`} fill="none" stroke={goldBorder} strokeWidth="1" />
            <path d={`M ${nodeWPx - borderR - 2} 1 Q ${nodeWPx - borderR / 2} -2 ${nodeWPx - 2} ${borderR / 2}`} fill="none" stroke={goldBorder} strokeWidth="1" />
          </g>
        </>
      )}

      {/* Deceased: subtle vignette overlay */}
      {isDead && (
        <rect
          width={nodeWPx}
          height={nodeHPx}
          rx={borderR}
          ry={borderR}
          fill="rgba(116,107,96,.06)"
        />
      )}

      {/* Top accent bar — thicker, with rounded cap */}
      <rect
        y={0}
        width={nodeWPx}
        height={4}
        rx={borderR}
        ry={borderR}
        fill={isSelf ? goldBorder : genderColor}
        opacity={isSelf ? 0.85 : 0.55}
      />
      {/* Fade below accent */}
      <rect
        x={nodeWPx * 0.1}
        y={4}
        width={nodeWPx * 0.8}
        height={3}
        fill={isSelf ? goldBorder : genderColor}
        opacity={0.1}
        rx={1.5}
      />

      {/* Completion ring */}
      <CompletionRing person={person} x={4} y={nodeHPx - 22} size={18} />

      {/* Photo: decorative outer ring */}
      <circle
        cx={photoCx}
        cy={nodeHPx / 2 + 2}
        r={photoR + 3.5}
        fill={`url(#photo-ring-${person.id})`}
      />
      {/* Photo circle border */}
      <circle
        cx={photoCx}
        cy={nodeHPx / 2 + 2}
        r={photoR + 1.5}
        fill="none"
        stroke={genderColor}
        strokeWidth={1}
        opacity={0.3}
      />
      <circle
        cx={photoCx}
        cy={nodeHPx / 2 + 2}
        r={photoR}
        fill={T.color.warmStone}
      />
      {person.photo_path && person.photo_path !== "__none__" ? (
        <>
          <clipPath id={`clip-${person.id}`}>
            <circle cx={photoCx} cy={nodeHPx / 2 + 2} r={photoR - 1} />
          </clipPath>
          <image
            href={person.photo_path}
            x={photoCx - photoR + 1}
            y={nodeHPx / 2 + 2 - photoR + 1}
            width={(photoR - 1) * 2}
            height={(photoR - 1) * 2}
            clipPath={`url(#clip-${person.id})`}
            preserveAspectRatio="xMidYMid slice"
          />
        </>
      ) : (
        <GenderIconGroup
          gender={person.gender}
          cx={photoCx}
          cy={nodeHPx / 2 + 2}
          size={photoR * 1.2}
          color={T.color.walnut}
          birthDate={person.birth_date}
          deathDate={person.death_date}
        />
      )}

      {/* First name */}
      <text
        x={textX}
        y={firstNameY}
        fontFamily={T.font.display}
        fontSize={nodeHPx * 0.145}
        fontWeight={600}
        fill={isDead ? T.color.muted : T.color.charcoal}
      >
        {firstName}
      </text>

      {/* Last name (smaller, second line) */}
      {lastName && (
        <text
          x={textX}
          y={lastNameY}
          fontFamily={T.font.display}
          fontSize={nodeHPx * 0.12}
          fontWeight={400}
          fill={T.color.muted}
        >
          {lastName}
        </text>
      )}

      {/* Lifespan */}
      {lifespan && (
        <text
          x={textX}
          y={lifespanY}
          fontFamily={T.font.body}
          fontSize={nodeHPx * 0.11}
          fill={T.color.muted}
        >
          {lifespan}
        </text>
      )}

      {/* Missing birth date indicator */}
      {!person.birth_date && (
        <text
          x={textX}
          y={lifespanY}
          fontFamily={T.font.body}
          fontSize={nodeHPx * 0.1}
          fill={T.color.sandstone}
          opacity={0.6}
        >
          ?
        </text>
      )}

      {/* "You" label for self — laurel wreath badge */}
      {isSelf && (
        <g>
          {/* Badge background pill */}
          <rect
            x={nodeWPx - 48}
            y={nodeHPx - 20}
            width={44}
            height={16}
            rx={8}
            fill={goldBorder}
            opacity={0.15}
          />
          {/* Mini laurel wreath icon */}
          <g transform={`translate(${nodeWPx - 44}, ${nodeHPx - 18})`}>
            <path d="M3 10 Q1 7 2 4 Q3 2 5 1.5" fill="none" stroke={goldBorder} strokeWidth="0.8" opacity="0.7" />
            <path d="M9 10 Q11 7 10 4 Q9 2 7 1.5" fill="none" stroke={goldBorder} strokeWidth="0.8" opacity="0.7" />
            <path d="M3 10 L6 11 L9 10" fill="none" stroke={goldBorder} strokeWidth="0.6" opacity="0.5" />
            {/* Small leaves */}
            <path d="M2 6 Q3.5 5.5 3.5 4" fill="none" stroke={goldBorder} strokeWidth="0.5" opacity="0.5" />
            <path d="M10 6 Q8.5 5.5 8.5 4" fill="none" stroke={goldBorder} strokeWidth="0.5" opacity="0.5" />
          </g>
          {/* "YOU" text next to wreath */}
          <text
            x={nodeWPx - 16}
            y={nodeHPx - 9}
            textAnchor="middle"
            fontFamily={T.font.display}
            fontSize={8}
            fontWeight={700}
            fill={goldBorder}
            opacity={0.9}
            letterSpacing="0.08em"
          >
            {t("youLabel").toUpperCase()}
          </text>
        </g>
      )}

      {/* Death indicator — SVG cross */}
      {person.death_date && (
        <g opacity={0.5}>
          <line x1={nodeWPx - 16} y1={8} x2={nodeWPx - 16} y2={18} stroke={T.color.muted} strokeWidth={1.2} strokeLinecap="round" />
          <line x1={nodeWPx - 20} y1={11} x2={nodeWPx - 12} y2={11} stroke={T.color.muted} strokeWidth={1.2} strokeLinecap="round" />
        </g>
      )}

      {/* Quick-add (+) button with relationship count badge */}
      {onQuickAdd && (
        <g
          style={{ cursor: "pointer" }}
          onClick={(e) => {
            e.stopPropagation();
            const svg = (e.target as SVGElement).closest("svg");
            const rect = svg?.getBoundingClientRect();
            if (rect) {
              onQuickAdd(person, e.clientX, e.clientY);
            } else {
              onQuickAdd(person, 0, 0);
            }
          }}
        >
          <circle
            cx={nodeWPx - 12}
            cy={nodeHPx - 12}
            r={10}
            fill={T.color.sage}
            opacity={0.85}
          />
          <text
            x={nodeWPx - 12}
            y={nodeHPx - 8}
            textAnchor="middle"
            fontFamily={T.font.body}
            fontSize={14}
            fontWeight={700}
            fill={T.color.white}
          >
            +
          </text>
          {/* Relationship count badge */}
          {relCount !== undefined && relCount > 0 && (
            <>
              <circle
                cx={nodeWPx - 2}
                cy={nodeHPx - 22}
                r={7}
                fill={T.color.terracotta}
              />
              <text
                x={nodeWPx - 2}
                y={nodeHPx - 19}
                textAnchor="middle"
                fontFamily={T.font.body}
                fontSize={8}
                fontWeight={700}
                fill={T.color.white}
              >
                {relCount > 9 ? "9+" : relCount}
              </text>
            </>
          )}
        </g>
      )}
    </g>
  );
});

/* ──────────────────────────────────── Couple node ── */

/** Renders a couple (person + optional current spouse) side by side */
export const CoupleNode = memo(function CoupleNode({
  x,
  y,
  node,
  onSelect,
  nodeWPx,
  nodeHPx,
  spouseGapPx,
  onQuickAdd,
  relCountMap,
  focusedNodeId,
}: {
  x: number;
  y: number;
  node: TreeNode;
  onSelect: (p: FamilyTreePerson) => void;
  nodeWPx: number;
  nodeHPx: number;
  spouseGapPx: number;
  onQuickAdd?: (person: FamilyTreePerson, x: number, y: number) => void;
  relCountMap?: Map<string, number>;
  focusedNodeId?: string | null;
}) {
  const hasSpouse = !!node.spouse;
  const totalW = hasSpouse ? nodeWPx * 2 + spouseGapPx : nodeWPx;

  return (
    <g transform={`translate(${x - totalW / 2}, ${y - nodeHPx / 2})`}>
      {/* Primary person */}
      <g>
        <PersonCard
          person={node.person}
          onSelect={onSelect}
          nodeWPx={nodeWPx}
          nodeHPx={nodeHPx}
          isSelf={node.isSelf}
          onQuickAdd={onQuickAdd}
          relCount={relCountMap?.get(node.person.id)}
          isFocused={focusedNodeId === node.person.id}
        />
      </g>

      {/* Spouse bond line + spouse card (current spouses only) */}
      {node.spouse && (
        <>
          {/* Heart icon between spouse cards */}
          {(() => {
            const cx = nodeWPx + spouseGapPx / 2;
            const cy = nodeHPx / 2;
            const s = 7; // heart half-size
            return (
              <path
                d={`M ${cx} ${cy + s * 0.6} C ${cx - s * 0.1} ${cy + s * 0.3} ${cx - s} ${cy + s * 0.1} ${cx - s} ${cy - s * 0.3} C ${cx - s} ${cy - s * 0.8} ${cx - s * 0.4} ${cy - s} ${cx} ${cy - s * 0.45} C ${cx + s * 0.4} ${cy - s} ${cx + s} ${cy - s * 0.8} ${cx + s} ${cy - s * 0.3} C ${cx + s} ${cy + s * 0.1} ${cx + s * 0.1} ${cy + s * 0.3} ${cx} ${cy + s * 0.6} Z`}
                fill={T.color.terracotta}
                opacity={0.6}
              />
            );
          })()}
          <g transform={`translate(${nodeWPx + spouseGapPx}, 0)`}>
            <PersonCard
              person={node.spouse}
              onSelect={onSelect}
              nodeWPx={nodeWPx}
              nodeHPx={nodeHPx}
              onQuickAdd={onQuickAdd}
              relCount={relCountMap?.get(node.spouse.id)}
              isFocused={focusedNodeId === node.spouse.id}
            />
          </g>
        </>
      )}
    </g>
  );
});
