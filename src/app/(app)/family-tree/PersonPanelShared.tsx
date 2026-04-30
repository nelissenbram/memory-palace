"use client";

import React from "react";
import { T } from "@/lib/theme";
import { localeDateCodes, type Locale } from "@/i18n/config";
import type { FamilyTreePerson, FamilyTreeEventType } from "@/lib/auth/family-tree-actions";
import { genderIconPaths } from "./PersonCard";

/* ── Relationship types ── */
export const REL_TYPES = ["parent", "child", "spouse", "sibling", "ex-spouse", "stepparent", "stepchild", "half-sibling"] as const;
export type RelType = (typeof REL_TYPES)[number];

/* ── Gender icon helper (Roman-inspired symbols) ── */
export function GenderIcon({ gender }: { gender: string | null }) {
  const c = T.color.walnut;
  if (gender === "male")
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        {/* Mars symbol with laurel hint */}
        <circle cx="6.5" cy="9.5" r="4" stroke={c} strokeWidth="1.5" />
        <line x1="9.5" y1="6.5" x2="14" y2="2" stroke={c} strokeWidth="1.5" />
        <line x1="11" y1="2" x2="14" y2="2" stroke={c} strokeWidth="1.5" />
        <line x1="14" y1="2" x2="14" y2="5" stroke={c} strokeWidth="1.5" />
        {/* Laurel leaf accents */}
        <path d="M3.5 7 Q4.5 6 5 7.5" stroke={c} strokeWidth="0.5" opacity="0.3" fill="none" />
        <path d="M3.5 12 Q4.5 13 5 11.5" stroke={c} strokeWidth="0.5" opacity="0.3" fill="none" />
      </svg>
    );
  if (gender === "female")
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        {/* Venus symbol with stola hint */}
        <circle cx="8" cy="6" r="4" stroke={c} strokeWidth="1.5" />
        <line x1="8" y1="10" x2="8" y2="15" stroke={c} strokeWidth="1.5" />
        <line x1="5.5" y1="12.5" x2="10.5" y2="12.5" stroke={c} strokeWidth="1.5" />
        {/* Hair wave accent */}
        <path d="M5 4 Q6 2.5 8 2.5 Q10 2.5 11 4" stroke={c} strokeWidth="0.5" opacity="0.3" fill="none" />
      </svg>
    );
  if (gender === "other")
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        {/* Column/neutral symbol */}
        <rect x="6" y="2" width="4" height="1" rx="0.3" stroke={c} strokeWidth="0.8" fill="none" />
        <rect x="6.5" y="3" width="3" height="9" rx="0.3" stroke={c} strokeWidth="1.2" fill="none" />
        <rect x="5.5" y="12" width="5" height="1" rx="0.3" stroke={c} strokeWidth="0.8" fill="none" />
        {/* Fluting lines */}
        <line x1="8" y1="3.5" x2="8" y2="11.5" stroke={c} strokeWidth="0.4" opacity="0.3" />
      </svg>
    );
  return null;
}

/* ── Mail icon ── */
export function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1.5" y="3" width="13" height="10" rx="2" stroke={T.color.sage} strokeWidth="1.3" />
      <path d="M1.5 5l6.5 4 6.5-4" stroke={T.color.sage} strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Age category helper ── */
export function getAgeCategory(birthDate: string | null, deathDate: string | null): "baby" | "child" | "teen" | "adult" | "elder" {
  if (!birthDate) return "adult";
  const refDate = deathDate ? new Date(deathDate) : new Date();
  const birth = new Date(birthDate);
  let age = refDate.getFullYear() - birth.getFullYear();
  const m = refDate.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && refDate.getDate() < birth.getDate())) age--;
  if (age < 4) return "baby";
  if (age < 13) return "child";
  if (age < 18) return "teen";
  if (age < 65) return "adult";
  return "elder";
}

/* ── Roman silhouette avatar (age/gender aware) ── */
/* Uses the same icon paths as PersonCard for visual consistency */
export function SilhouetteAvatar({ gender, size = 24, birthDate, deathDate }: {
  gender: string | null; size?: number;
  birthDate?: string | null; deathDate?: string | null;
}) {
  const age = getAgeCategory(birthDate || null, deathDate || null);
  const isDead = !!deathDate;
  const fillColor = isDead ? T.color.muted : T.color.walnut;
  const fillOpacity = isDead ? 0.3 : 0.45;

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" opacity={fillOpacity} style={{ display: "block" }}>
      {genderIconPaths(gender, fillColor, isDead, age)}
    </svg>
  );
}

/* ── Spinner ── */
export function Spinner({ size = "1rem", color = T.color.walnut }: { size?: string; color?: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        border: `2px solid ${color}30`,
        borderTopColor: color,
        borderRadius: "50%",
        animation: "panelSpin .6s linear infinite",
        verticalAlign: "middle",
      }}
    />
  );
}

/* ── Gold divider ── */
export function GoldDivider() {
  return (
    <div
      style={{
        height: "1px",
        background: `linear-gradient(90deg, transparent, ${T.color.gold}60, transparent)`,
        margin: "1.25rem 0",
      }}
    />
  );
}

/* ── Section card wrapper ── */
export function SectionCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        padding: "1rem 1.25rem",
        borderRadius: "1rem",
        background: `rgba(255,255,255,0.55)`,
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        border: `1px solid rgba(212,197,178,0.4)`,
        marginBottom: "1rem",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ── Style tokens ── */
export const glassBorder = `1px solid rgba(212,197,178,0.4)`;

export function getInputStyle(isMobile: boolean): React.CSSProperties {
  return {
    width: "100%",
    padding: isMobile ? "0.75rem 0.875rem" : "0.625rem 0.875rem",
    borderRadius: "1.25rem",
    border: `1px solid ${T.color.sandstone}`,
    background: T.color.white,
    fontFamily: T.font.body,
    fontSize: isMobile ? "1rem" : "0.875rem",
    color: T.color.charcoal,
    outline: "none",
    boxSizing: "border-box",
    minHeight: "2.75rem",
  };
}

export const labelStyle: React.CSSProperties = {
  fontFamily: T.font.body,
  fontSize: "0.75rem",
  fontWeight: 600,
  color: T.color.walnut,
  marginBottom: "0.25rem",
  display: "block",
};

export const pillBtnStyle: React.CSSProperties = {
  padding: "0.625rem 1.25rem",
  borderRadius: "999rem",
  fontFamily: T.font.body,
  fontSize: "0.875rem",
  fontWeight: 600,
  cursor: "pointer",
  border: "none",
  minHeight: "2.75rem",
  minWidth: "2.75rem",
  transition: "all .15s ease",
};

export const smallPillStyle: React.CSSProperties = {
  padding: "0.375rem 0.875rem",
  borderRadius: "999rem",
  border: `1px solid ${T.color.sandstone}`,
  background: T.color.white,
  fontFamily: T.font.body,
  fontSize: "0.75rem",
  color: T.color.walnut,
  cursor: "pointer",
  minHeight: "2.75rem",
  minWidth: "2.75rem",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "all .15s ease",
};

/* ── Reverse relationship helper ── */
export function reverseRelType(type: string): string {
  switch (type) {
    case "parent":
      return "child";
    case "child":
      return "parent";
    case "spouse":
      return "spouse";
    case "sibling":
      return "sibling";
    case "ex-spouse":
      return "ex-spouse";
    case "stepparent":
      return "stepchild";
    case "stepchild":
      return "stepparent";
    case "half-sibling":
      return "half-sibling";
    default:
      return type;
  }
}

/* ── Format a flexible date string in a human-friendly way ── */
export function formatDateHuman(d: string | null, locale: string): string {
  if (!d) return "";
  // Year-only
  if (/^\d{4}$/.test(d)) return d;
  // Year-month
  if (/^\d{4}-\d{2}$/.test(d)) {
    try {
      const date = new Date(d + "-01T00:00:00");
      return date.toLocaleDateString(localeDateCodes[locale as Locale], {
        year: "numeric",
        month: "long",
      });
    } catch {
      return d;
    }
  }
  // Full date
  try {
    const date = new Date(d + "T00:00:00");
    return date.toLocaleDateString(localeDateCodes[locale as Locale], {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return d;
  }
}

/** Validate a flexible date string: YYYY, YYYY-MM, or YYYY-MM-DD (with optional ~, <, > qualifier) */
export function isValidFlexDate(d: string): boolean {
  if (!d) return true;
  const stripped = d.replace(/^[~<>]\s*/, "");
  return /^\d{4}$/.test(stripped) || /^\d{4}-\d{2}$/.test(stripped) || /^\d{4}-\d{2}-\d{2}$/.test(stripped);
}

/* ── Rel type i18n maps ── */
export function relTypeLabel(rt: RelType | string, t: (key: string) => string): string {
  const map: Record<string, string> = {
    parent: t("relDescParent"),
    child: t("relDescChild"),
    spouse: t("relDescSpouse"),
    sibling: t("relDescSibling"),
    "ex-spouse": t("exSpouse"),
    stepparent: t("stepparent"),
    stepchild: t("stepchild"),
    "half-sibling": t("halfSibling"),
  };
  return map[rt] || rt;
}

export function getPersonName(id: string, allPersons: FamilyTreePerson[], t: (key: string) => string): string {
  const p = allPersons.find((x) => x.id === id);
  return p ? `${p.first_name}${p.last_name ? " " + p.last_name : ""}` : t("unknown");
}

/* ── Event types ── */
export const EVENT_TYPES: FamilyTreeEventType[] = [
  "marriage", "divorce", "burial", "baptism", "christening",
  "immigration", "emigration", "naturalization",
  "occupation", "education", "military", "residence",
  "retirement", "census", "other",
];

/* ── Event icon SVG helpers ── */

interface EventIconProps {
  size?: number;
  color?: string;
}

const eiSvg = (size: number, color: string): React.SVGProps<SVGSVGElement> => ({
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

/** Two interlocking Roman betrothal rings */
const MarriageIcon: React.FC<EventIconProps> = ({ size = 18, color = "currentColor" }) => (
  <svg {...eiSvg(size, color)}>
    <circle cx="9" cy="12" r="5" />
    <circle cx="15" cy="12" r="5" />
  </svg>
);

/** Broken/separated rings */
const DivorceIcon: React.FC<EventIconProps> = ({ size = 18, color = "currentColor" }) => (
  <svg {...eiSvg(size, color)}>
    <path d="M3,12 A5,5 0 1,1 8,17" />
    <path d="M21,12 A5,5 0 1,0 16,17" />
    <line x1="11" y1="8" x2="13" y2="16" />
  </svg>
);

/** Roman urn/amphora with lid */
const BurialIcon: React.FC<EventIconProps> = ({ size = 18, color = "currentColor" }) => (
  <svg {...eiSvg(size, color)}>
    <ellipse cx="12" cy="5" rx="3" ry="1" />
    <path d="M9,5 Q8,8 7,9" fill="none" />
    <path d="M15,5 Q16,8 17,9" fill="none" />
    <path d="M7,9 Q5,12 6,16 Q7,20 12,21 Q17,20 18,16 Q19,12 17,9" />
    <line x1="12" y1="3" x2="12" y2="4" />
    <line x1="10" y1="3.5" x2="14" y2="3.5" />
  </svg>
);

/** Water drops falling into a baptismal font/bowl */
const BaptismIcon: React.FC<EventIconProps> = ({ size = 18, color = "currentColor" }) => (
  <svg {...eiSvg(size, color)}>
    <path d="M6,14 Q6,18 12,18 Q18,18 18,14" />
    <line x1="12" y1="18" x2="12" y2="21" />
    <line x1="9" y1="21" x2="15" y2="21" />
    <circle cx="10" cy="10" r="0.8" fill={color} />
    <circle cx="14" cy="8" r="0.8" fill={color} />
    <circle cx="12" cy="5" r="0.8" fill={color} />
  </svg>
);

/** Simple temple/shrine with cross */
const ChristeningIcon: React.FC<EventIconProps> = ({ size = 18, color = "currentColor" }) => (
  <svg {...eiSvg(size, color)}>
    <polyline points="4,12 12,5 20,12" />
    <line x1="6" y1="12" x2="6" y2="20" />
    <line x1="18" y1="12" x2="18" y2="20" />
    <line x1="4" y1="20" x2="20" y2="20" />
    <line x1="12" y1="13" x2="12" y2="18" />
    <line x1="10" y1="15" x2="14" y2="15" />
  </svg>
);

/** Arrow pointing into a gateway/arch */
const ImmigrationIcon: React.FC<EventIconProps> = ({ size = 18, color = "currentColor" }) => (
  <svg {...eiSvg(size, color)}>
    <path d="M8,20 L8,10 Q8,5 12,5 Q16,5 16,10 L16,20" />
    <line x1="3" y1="13" x2="12" y2="13" />
    <polyline points="9,10 12,13 9,16" />
  </svg>
);

/** Arrow pointing out of a gateway/arch */
const EmigrationIcon: React.FC<EventIconProps> = ({ size = 18, color = "currentColor" }) => (
  <svg {...eiSvg(size, color)}>
    <path d="M8,20 L8,10 Q8,5 12,5 Q16,5 16,10 L16,20" />
    <line x1="12" y1="13" x2="21" y2="13" />
    <polyline points="18,10 21,13 18,16" />
  </svg>
);

/** Laurel wreath — Roman citizenship symbol */
const NaturalizationIcon: React.FC<EventIconProps> = ({ size = 18, color = "currentColor" }) => (
  <svg {...eiSvg(size, color)}>
    <path d="M10,20 Q4,16 4,10 Q4,6 8,4" fill="none" />
    <path d="M6,14 Q8,13 8,11" />
    <path d="M5,11 Q7,10.5 7.5,8.5" />
    <path d="M5.5,8 Q7.5,7.5 8,5.5" />
    <path d="M14,20 Q20,16 20,10 Q20,6 16,4" fill="none" />
    <path d="M18,14 Q16,13 16,11" />
    <path d="M19,11 Q17,10.5 16.5,8.5" />
    <path d="M18.5,8 Q16.5,7.5 16,5.5" />
    <path d="M10,20 L12,21 L14,20" />
  </svg>
);

/** Hammer and chisel — Roman craftsman tools */
const OccupationIcon: React.FC<EventIconProps> = ({ size = 18, color = "currentColor" }) => (
  <svg {...eiSvg(size, color)}>
    <line x1="5" y1="19" x2="12" y2="10" />
    <rect x="10" y="7" width="6" height="3" rx="0.5" transform="rotate(-40 13 8.5)" fill="none" />
    <line x1="19" y1="19" x2="14" y2="10" />
    <path d="M13,10 L15,10 L14.5,7 L13.5,7 Z" fill="none" />
  </svg>
);

/** Open scroll/manuscript */
const EducationIcon: React.FC<EventIconProps> = ({ size = 18, color = "currentColor" }) => (
  <svg {...eiSvg(size, color)}>
    <ellipse cx="12" cy="5" rx="7" ry="1.5" />
    <line x1="5" y1="5" x2="5" y2="18" />
    <line x1="19" y1="5" x2="19" y2="18" />
    <ellipse cx="12" cy="18" rx="7" ry="1.5" />
    <line x1="8" y1="9" x2="16" y2="9" />
    <line x1="8" y1="11.5" x2="16" y2="11.5" />
    <line x1="8" y1="14" x2="14" y2="14" />
  </svg>
);

/** Roman gladius sword with shield */
const MilitaryIcon: React.FC<EventIconProps> = ({ size = 18, color = "currentColor" }) => (
  <svg {...eiSvg(size, color)}>
    {/* Gladius */}
    <line x1="5" y1="4" x2="12" y2="14" />
    <line x1="7" y1="10" x2="10" y2="8" />
    <circle cx="5" cy="4" r="0.8" fill={color} />
    {/* Shield (clipeus) */}
    <ellipse cx="16" cy="14" rx="4.5" ry="5.5" />
    <ellipse cx="16" cy="14" rx="2" ry="2.5" />
  </svg>
);

/** Roman domus/house with columns */
const ResidenceIcon: React.FC<EventIconProps> = ({ size = 18, color = "currentColor" }) => (
  <svg {...eiSvg(size, color)}>
    <polyline points="3,12 12,4 21,12" />
    <line x1="7" y1="12" x2="7" y2="20" />
    <line x1="17" y1="12" x2="17" y2="20" />
    <line x1="4" y1="20" x2="20" y2="20" />
    <path d="M10,20 L10,16 Q12,13 14,16 L14,20" />
  </svg>
);

/** Olive branch — Roman peace symbol */
const RetirementIcon: React.FC<EventIconProps> = ({ size = 18, color = "currentColor" }) => (
  <svg {...eiSvg(size, color)}>
    <path d="M4,20 Q12,12 20,4" fill="none" />
    <ellipse cx="8" cy="15" rx="2.5" ry="1.2" transform="rotate(-40 8 15)" />
    <ellipse cx="11" cy="12" rx="2.5" ry="1.2" transform="rotate(-40 11 12)" />
    <ellipse cx="14" cy="9" rx="2.5" ry="1.2" transform="rotate(-40 14 9)" />
    <ellipse cx="17" cy="6" rx="2" ry="1" transform="rotate(-40 17 6)" />
  </svg>
);

/** Wax tablet with stylus */
const CensusIcon: React.FC<EventIconProps> = ({ size = 18, color = "currentColor" }) => (
  <svg {...eiSvg(size, color)}>
    <rect x="4" y="3" width="12" height="18" rx="1" />
    <line x1="7" y1="7" x2="13" y2="7" />
    <line x1="7" y1="10" x2="13" y2="10" />
    <line x1="7" y1="13" x2="11" y2="13" />
    <line x1="18" y1="8" x2="20" y2="3" />
    <line x1="17" y1="10" x2="18" y2="8" />
  </svg>
);

/** Simple marker/pin */
const OtherEventIcon: React.FC<EventIconProps> = ({ size = 18, color = "currentColor" }) => (
  <svg {...eiSvg(size, color)}>
    <path d="M12,2 C8,2 5,5 5,9 Q5,14 12,22 Q19,14 19,9 C19,5 16,2 12,2 Z" />
    <circle cx="12" cy="9" r="2.5" />
  </svg>
);

export const EVENT_ICONS: Record<FamilyTreeEventType, React.FC<EventIconProps>> = {
  marriage: MarriageIcon,
  divorce: DivorceIcon,
  burial: BurialIcon,
  baptism: BaptismIcon,
  christening: ChristeningIcon,
  immigration: ImmigrationIcon,
  emigration: EmigrationIcon,
  naturalization: NaturalizationIcon,
  occupation: OccupationIcon,
  education: EducationIcon,
  military: MilitaryIcon,
  residence: ResidenceIcon,
  retirement: RetirementIcon,
  census: CensusIcon,
  other: OtherEventIcon,
};
