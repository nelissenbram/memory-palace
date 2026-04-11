"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import Toast, { type ToastData } from "@/components/ui/Toast";
import {
  getPersons,
  getRelationships,
  addPerson,
} from "@/lib/auth/family-tree-actions";
import type {
  FamilyTreePerson,
  FamilyTreeRelationship,
} from "@/lib/auth/family-tree-actions";
import { hierarchy, tree as d3tree } from "d3-hierarchy";
import PersonPanel from "./PersonPanel";

/* ────────────────────────────────────────────── helpers ── */

interface TreeNode {
  id: string;
  name: string;
  person: FamilyTreePerson;
  children: TreeNode[];
  /** Current spouse person attached to this node (rendered side-by-side) */
  spouse?: FamilyTreePerson;
  /** Ex-spouses shown separately, not merged into couple node */
  exSpouses?: FamilyTreePerson[];
  /** Whether this person is the authenticated user */
  isSelf?: boolean;
}

/**
 * Build a forest of tree nodes from persons + relationships.
 * Current spouses are attached to their partner node (rendered as CoupleNode).
 * Ex-spouses are NOT merged — they appear as separate nodes.
 * Multiple children from different relationships are all attached correctly.
 * Each disconnected component becomes its own tree placed side-by-side.
 */
function buildForest(
  persons: FamilyTreePerson[],
  rels: FamilyTreeRelationship[],
  selfId?: string
): TreeNode[] {
  const childToParent = new Map<string, Set<string>>();
  const parentToChild = new Map<string, Set<string>>();
  const currentSpouseMap = new Map<string, Set<string>>(); // id -> current spouse ids
  const exSpouseMap = new Map<string, Set<string>>(); // id -> ex-spouse ids

  for (const r of rels) {
    if (r.relationship_type === "parent") {
      const kids = parentToChild.get(r.person_id) ?? new Set<string>();
      kids.add(r.related_person_id);
      parentToChild.set(r.person_id, kids);
      const parents = childToParent.get(r.related_person_id) ?? new Set<string>();
      parents.add(r.person_id);
      childToParent.set(r.related_person_id, parents);
    } else if (r.relationship_type === "child") {
      const kids = parentToChild.get(r.related_person_id) ?? new Set<string>();
      kids.add(r.person_id);
      parentToChild.set(r.related_person_id, kids);
      const parents = childToParent.get(r.person_id) ?? new Set<string>();
      parents.add(r.related_person_id);
      childToParent.set(r.person_id, parents);
    } else if (r.relationship_type === "spouse") {
      const s1 = currentSpouseMap.get(r.person_id) ?? new Set<string>();
      s1.add(r.related_person_id);
      currentSpouseMap.set(r.person_id, s1);
      const s2 = currentSpouseMap.get(r.related_person_id) ?? new Set<string>();
      s2.add(r.person_id);
      currentSpouseMap.set(r.related_person_id, s2);
    } else if ((r.relationship_type as string) === "ex-spouse") {
      const e1 = exSpouseMap.get(r.person_id) ?? new Set<string>();
      e1.add(r.related_person_id);
      exSpouseMap.set(r.person_id, e1);
      const e2 = exSpouseMap.get(r.related_person_id) ?? new Set<string>();
      e2.add(r.person_id);
      exSpouseMap.set(r.related_person_id, e2);
    }
  }

  const allIds = new Set(persons.map((p) => p.id));
  const hasParent = new Set<string>();
  for (const [childId, parents] of childToParent) {
    for (const pid of parents) {
      if (allIds.has(pid)) {
        hasParent.add(childId);
        break;
      }
    }
  }

  // Track who is consumed as a current spouse so they don't also appear as roots
  const consumedAsSpouse = new Set<string>();
  const visited = new Set<string>();

  function buildNode(personId: string): TreeNode | null {
    if (visited.has(personId)) return null;
    visited.add(personId);
    const p = persons.find((x) => x.id === personId);
    if (!p) return null;

    // Attach first current spouse (if not already visited)
    let spouse: FamilyTreePerson | undefined;
    const spouseIds = currentSpouseMap.get(personId) ?? new Set<string>();
    for (const sid of spouseIds) {
      if (!visited.has(sid) && !consumedAsSpouse.has(sid)) {
        const sp = persons.find((x) => x.id === sid);
        if (sp) {
          spouse = sp;
          consumedAsSpouse.add(sid);
          visited.add(sid); // don't create separate node
          break;
        }
      }
    }

    // Collect ex-spouses (they are NOT consumed/merged)
    const exSpouses: FamilyTreePerson[] = [];
    const exIds = exSpouseMap.get(personId) ?? new Set<string>();
    for (const eid of exIds) {
      const ep = persons.find((x) => x.id === eid);
      if (ep) exSpouses.push(ep);
    }

    // Collect children from this person, the current spouse, AND any ex-spouses
    const childIdSet = new Set<string>();
    for (const cid of parentToChild.get(personId) ?? new Set<string>()) childIdSet.add(cid);
    if (spouse) {
      for (const cid of parentToChild.get(spouse.id) ?? new Set<string>()) childIdSet.add(cid);
    }
    for (const ex of exSpouses) {
      for (const cid of parentToChild.get(ex.id) ?? new Set<string>()) childIdSet.add(cid);
    }

    const children: TreeNode[] = [];
    for (const cid of childIdSet) {
      const node = buildNode(cid);
      if (node) children.push(node);
    }

    return {
      id: p.id,
      name: `${p.first_name}${p.last_name ? " " + p.last_name : ""}`,
      person: p,
      children,
      spouse,
      exSpouses: exSpouses.length > 0 ? exSpouses : undefined,
      isSelf: selfId ? p.id === selfId : (p as unknown as Record<string, unknown>).is_self === true,
    };
  }

  const roots = persons.filter((p) => !hasParent.has(p.id));
  const forest: TreeNode[] = [];

  for (const r of roots) {
    if (visited.has(r.id)) continue;
    const node = buildNode(r.id);
    if (node) forest.push(node);
  }

  // Add any orphans not visited
  for (const p of persons) {
    if (!visited.has(p.id)) {
      forest.push({
        id: p.id,
        name: `${p.first_name}${p.last_name ? " " + p.last_name : ""}`,
        person: p,
        children: [],
        isSelf: selfId ? p.id === selfId : (p as unknown as Record<string, unknown>).is_self === true,
      });
    }
  }

  return forest;
}

const NODE_W = 11.25; // rem -- single card width
const NODE_H = 7; // rem -- card height (taller for two-line names)
const SPOUSE_GAP = 0.625; // rem -- gap between spouse cards
const COUPLE_W = NODE_W * 2 + SPOUSE_GAP; // total couple width
const VERTICAL_GAP = 5; // rem
const HORIZONTAL_GAP = 2.5; // rem

/** Convert rem to px using current root font size */
function remToPx(rem: number): number {
  if (typeof document === "undefined") return rem * 16;
  return rem * parseFloat(getComputedStyle(document.documentElement).fontSize);
}

/* ──────────────────────────────────── GEDCOM helpers ── */

function exportGedcom(
  persons: FamilyTreePerson[],
  rels: FamilyTreeRelationship[]
): string {
  const lines: string[] = [];
  lines.push("0 HEAD");
  lines.push("1 SOUR MemoryPalace");
  lines.push("1 GEDC");
  lines.push("2 VERS 5.5");
  lines.push("1 CHAR UTF-8");

  for (const p of persons) {
    lines.push(`0 @I${p.id.slice(0, 8)}@ INDI`);
    lines.push(`1 NAME ${p.first_name} /${p.last_name || ""}/`);
    if (p.birth_date) {
      lines.push("1 BIRT");
      lines.push(`2 DATE ${formatGedcomDate(p.birth_date)}`);
    }
    if (p.death_date) {
      lines.push("1 DEAT");
      lines.push(`2 DATE ${formatGedcomDate(p.death_date)}`);
    }
    if (p.gender) {
      lines.push(`1 SEX ${p.gender === "male" ? "M" : p.gender === "female" ? "F" : "U"}`);
    }
    if (p.notes) {
      lines.push(`1 NOTE ${p.notes}`);
    }
  }

  const familyMap = new Map<string, { parents: Set<string>; children: Set<string>; isExSpouse?: boolean }>();
  for (const r of rels) {
    if (r.relationship_type === "parent") {
      const childId = r.related_person_id;
      const parentId = r.person_id;
      let found = false;
      for (const [, fam] of familyMap) {
        if (fam.children.has(childId) || fam.parents.has(parentId)) {
          fam.parents.add(parentId);
          fam.children.add(childId);
          found = true;
          break;
        }
      }
      if (!found) {
        const key = `F${familyMap.size + 1}`;
        familyMap.set(key, {
          parents: new Set([parentId]),
          children: new Set([childId]),
        });
      }
    } else if (r.relationship_type === "child") {
      const childId = r.person_id;
      const parentId = r.related_person_id;
      let found = false;
      for (const [, fam] of familyMap) {
        if (fam.children.has(childId) || fam.parents.has(parentId)) {
          fam.parents.add(parentId);
          fam.children.add(childId);
          found = true;
          break;
        }
      }
      if (!found) {
        const key = `F${familyMap.size + 1}`;
        familyMap.set(key, {
          parents: new Set([parentId]),
          children: new Set([childId]),
        });
      }
    }
  }

  // Handle spouse and ex-spouse family records
  for (const r of rels) {
    if (r.relationship_type === "spouse" || (r.relationship_type as string) === "ex-spouse") {
      const key = `F${familyMap.size + 1}`;
      familyMap.set(key, {
        parents: new Set([r.person_id, r.related_person_id]),
        children: new Set(),
        isExSpouse: (r.relationship_type as string) === "ex-spouse",
      });
    }
  }

  let famIdx = 0;
  for (const [, fam] of familyMap) {
    famIdx++;
    lines.push(`0 @F${famIdx}@ FAM`);
    const parentArr = Array.from(fam.parents);
    for (const pid of parentArr) {
      const p = persons.find((x) => x.id === pid);
      if (p?.gender === "female") {
        lines.push(`1 WIFE @I${pid.slice(0, 8)}@`);
      } else {
        lines.push(`1 HUSB @I${pid.slice(0, 8)}@`);
      }
    }
    for (const cid of fam.children) {
      lines.push(`1 CHIL @I${cid.slice(0, 8)}@`);
    }
    if (fam.isExSpouse) {
      lines.push("1 DIV Y");
    }
  }

  lines.push("0 TRLR");
  return lines.join("\n");
}

function formatGedcomDate(d: string): string {
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return d;
    const months = [
      "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
      "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
    ];
    return `${dt.getDate()} ${months[dt.getMonth()]} ${dt.getFullYear()}`;
  } catch {
    return d;
  }
}

function parseGedcomDate(s: string): string | undefined {
  if (!s || !s.trim()) return undefined;
  const months: Record<string, string> = {
    JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06",
    JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12",
  };
  const parts = s.trim().split(/\s+/);
  if (parts.length === 3) {
    const day = parts[0].padStart(2, "0");
    const month = months[parts[1].toUpperCase()] || "01";
    const year = parts[2];
    if (!/^\d{4}$/.test(year)) return undefined;
    return `${year}-${month}-${day}`;
  }
  if (parts.length === 2) {
    const month = months[parts[0].toUpperCase()] || "01";
    const year = parts[1];
    if (!/^\d{4}$/.test(year)) return undefined;
    return `${year}-${month}-01`;
  }
  if (parts.length === 1 && /^\d{4}$/.test(parts[0])) {
    return `${parts[0]}-01-01`;
  }
  return undefined;
}

interface ParsedIndi {
  id: string;
  first_name: string;
  last_name: string;
  birth_date?: string;
  death_date?: string;
  gender?: "male" | "female" | "other";
  notes?: string;
}

interface ParsedFam {
  husb?: string;
  wife?: string;
  children: string[];
  divorced?: boolean;
}

function parseGedcom(text: string): { indis: ParsedIndi[]; fams: ParsedFam[]; errors: string[] } {
  const lines = text.split(/\r?\n/);
  const indis: ParsedIndi[] = [];
  const fams: ParsedFam[] = [];
  const errors: string[] = [];
  let currentIndi: ParsedIndi | null = null;
  let currentFam: ParsedFam | null = null;
  let currentTag = "";
  let lineNum = 0;

  for (const line of lines) {
    lineNum++;
    if (!line.trim()) continue;
    const match = line.match(/^(\d+)\s+(@\S+@\s+)?(\S+)\s*(.*)?$/);
    if (!match) {
      errors.push(`Line ${lineNum}: unrecognized format`);
      continue;
    }
    const level = parseInt(match[1]);
    const tag = match[3];
    const value = (match[4] || "").trim();
    const xref = (match[2] || "").trim().replace(/@/g, "");

    if (level === 0) {
      if (currentIndi) {
        if (!currentIndi.first_name && !currentIndi.last_name) {
          errors.push(`INDI ${currentIndi.id}: empty name, skipped`);
        } else {
          indis.push(currentIndi);
        }
      }
      if (currentFam) fams.push(currentFam);
      currentIndi = null;
      currentFam = null;
      currentTag = "";

      if (tag === "INDI") {
        currentIndi = {
          id: xref,
          first_name: "",
          last_name: "",
        };
      } else if (tag === "FAM") {
        currentFam = { children: [] };
      }
    } else if (level === 1 && currentIndi) {
      currentTag = tag;
      if (tag === "NAME") {
        const nameMatch = value.match(/^(.*?)(?:\s*\/(.*?)\/)?$/);
        if (nameMatch) {
          currentIndi.first_name = (nameMatch[1] || "").trim();
          currentIndi.last_name = (nameMatch[2] || "").trim();
        }
      } else if (tag === "SEX") {
        currentIndi.gender =
          value === "M" ? "male" : value === "F" ? "female" : "other";
      } else if (tag === "NOTE") {
        currentIndi.notes = value;
      }
    } else if (level === 2 && currentIndi) {
      if (tag === "DATE") {
        const parsed = parseGedcomDate(value);
        if (parsed) {
          if (currentTag === "BIRT") currentIndi.birth_date = parsed;
          else if (currentTag === "DEAT") currentIndi.death_date = parsed;
        } else if (value) {
          errors.push(`Line ${lineNum}: malformed date "${value}"`);
        }
      }
    } else if (level === 1 && currentFam) {
      if (tag === "HUSB") {
        currentFam.husb = value.replace(/@/g, "");
      } else if (tag === "WIFE") {
        currentFam.wife = value.replace(/@/g, "");
      } else if (tag === "CHIL") {
        currentFam.children.push(value.replace(/@/g, ""));
      } else if (tag === "DIV") {
        currentFam.divorced = value === "Y" || value === "";
      }
    }
  }
  if (currentIndi) {
    if (!currentIndi.first_name && !currentIndi.last_name) {
      errors.push(`INDI ${currentIndi.id}: empty name, skipped`);
    } else {
      indis.push(currentIndi);
    }
  }
  if (currentFam) fams.push(currentFam);

  return { indis, fams, errors };
}

/* ──────────────────────────────────── SVG icons ── */

/** Stylized family tree branch icon (SVG, non-emoji) */
function TreeBranchIcon({ size = 20, color = T.color.walnut }: { size?: number; color?: string }) {
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
function CloseIcon({ size = 18, color = T.color.muted }: { size?: number; color?: string }) {
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

/** Gender silhouette icon for empty photo */
function GenderIcon({ gender, size, color }: { gender: string | null; size: number; color: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      opacity={0.5}
      style={{ display: "block" }}
    >
      {gender === "female" ? (
        <>
          <circle cx="12" cy="8" r="4" />
          <path d="M12 12 C6 12 4 17 4 20 L20 20 C20 17 18 12 12 12Z" />
        </>
      ) : gender === "male" ? (
        <>
          <circle cx="12" cy="7" r="4" />
          <path d="M12 11 C6 11 4 16 4 20 L20 20 C20 16 18 11 12 11Z" />
        </>
      ) : (
        <>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M12 11.5 C7 11.5 5 16 5 20 L19 20 C19 16 17 11.5 12 11.5Z" />
        </>
      )}
    </svg>
  );
}

/* ──────────────────────────────────── SVG person card ── */

/** Render a single person card at (0,0) -- caller translates */
function PersonCard({
  person,
  onSelect,
  nodeWPx,
  nodeHPx,
  isSelf,
}: {
  person: FamilyTreePerson;
  onSelect: (p: FamilyTreePerson) => void;
  nodeWPx: number;
  nodeHPx: number;
  isSelf?: boolean;
}) {
  const firstName = person.first_name || "";
  const lastName = person.last_name || "";
  const year = (d: string | null) => {
    if (!d) return "";
    try {
      return new Date(d).getFullYear().toString();
    } catch {
      return "";
    }
  };
  const birthYear = year(person.birth_date);
  const deathYear = year(person.death_date);
  const lifespan =
    person.birth_date || person.death_date
      ? `${birthYear || "?"}\u2013${deathYear || ""}`
      : "";

  const photoR = nodeHPx * 0.22;
  const photoCx = nodeHPx * 0.42;
  const textX = nodeHPx * 0.76;
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

  const goldBorder = T.color.gold;
  const cardBg = isSelf
    ? `${T.color.white}F0`
    : `${T.color.white}E8`;
  const strokeColor = isSelf ? goldBorder : T.color.cream;
  const strokeW = isSelf ? 2.5 : 1.5;

  return (
    <g style={{ cursor: "pointer" }} onClick={() => onSelect(person)}>
      {/* Card shadow */}
      <rect
        x={1.5}
        y={2}
        width={nodeWPx}
        height={nodeHPx}
        rx={borderR}
        ry={borderR}
        fill="rgba(44,44,42,.08)"
      />

      {/* Glass morphism background */}
      <rect
        width={nodeWPx}
        height={nodeHPx}
        rx={borderR}
        ry={borderR}
        fill={cardBg}
        stroke={strokeColor}
        strokeWidth={strokeW}
      />

      {/* Self node: gold glow */}
      {isSelf && (
        <rect
          x={-2}
          y={-2}
          width={nodeWPx + 4}
          height={nodeHPx + 4}
          rx={borderR + 2}
          ry={borderR + 2}
          fill="none"
          stroke={goldBorder}
          strokeWidth={1}
          opacity={0.4}
        />
      )}

      {/* Top gold accent line */}
      <rect
        y={0}
        width={nodeWPx}
        height={3.5}
        rx={borderR}
        ry={borderR}
        fill={isSelf ? goldBorder : genderColor}
        opacity={isSelf ? 0.8 : 0.5}
      />
      {/* Fade below accent */}
      <rect
        x={0}
        y={3.5}
        width={nodeWPx}
        height={2}
        fill={isSelf ? goldBorder : genderColor}
        opacity={0.15}
      />

      {/* Gender-based subtle glow at bottom-left */}
      <rect
        x={2}
        y={nodeHPx - 20}
        width={40}
        height={18}
        rx={9}
        ry={9}
        fill={genderColor}
        opacity={0.12}
      />

      {/* Photo circle with border */}
      <circle
        cx={photoCx}
        cy={nodeHPx / 2 + 2}
        r={photoR + 2}
        fill={genderColor}
        opacity={0.35}
      />
      <circle
        cx={photoCx}
        cy={nodeHPx / 2 + 2}
        r={photoR}
        fill={T.color.warmStone}
      />
      {person.photo_path ? (
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
        <foreignObject
          x={photoCx - photoR * 0.6}
          y={nodeHPx / 2 + 2 - photoR * 0.6}
          width={photoR * 1.2}
          height={photoR * 1.2}
        >
          <GenderIcon
            gender={person.gender}
            size={photoR * 1.2}
            color={T.color.walnut}
          />
        </foreignObject>
      )}

      {/* First name */}
      <text
        x={textX}
        y={firstNameY}
        fontFamily={T.font.display}
        fontSize={nodeHPx * 0.145}
        fontWeight={600}
        fill={T.color.charcoal}
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

      {/* "You" label for self */}
      {isSelf && (
        <text
          x={nodeWPx - 10}
          y={nodeHPx - 8}
          textAnchor="end"
          fontFamily={T.font.body}
          fontSize={9}
          fontWeight={700}
          fill={goldBorder}
          opacity={0.9}
        >
          YOU
        </text>
      )}

      {/* Death indicator */}
      {person.death_date && (
        <text
          x={nodeWPx - 12}
          y={16}
          textAnchor="end"
          fontFamily={T.font.body}
          fontSize={10}
          fill={T.color.muted}
          opacity={0.6}
        >
          {"\u271D"}
        </text>
      )}
    </g>
  );
}

/* ──────────────────────────────────── Couple node ── */

/** Renders a couple (person + optional current spouse) side by side */
function CoupleNode({
  x,
  y,
  node,
  onSelect,
  nodeWPx,
  nodeHPx,
  spouseGapPx,
}: {
  x: number;
  y: number;
  node: TreeNode;
  onSelect: (p: FamilyTreePerson) => void;
  nodeWPx: number;
  nodeHPx: number;
  spouseGapPx: number;
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
        />
      </g>

      {/* Spouse bond line + spouse card (current spouses only) */}
      {node.spouse && (
        <>
          {/* Horizontal bond line between cards */}
          <line
            x1={nodeWPx}
            y1={nodeHPx / 2}
            x2={nodeWPx + spouseGapPx}
            y2={nodeHPx / 2}
            stroke={T.color.terracotta}
            strokeWidth={2}
            strokeDasharray="4 3"
            opacity={0.7}
          />
          {/* Small bond ring on line */}
          <circle
            cx={nodeWPx + spouseGapPx / 2}
            cy={nodeHPx / 2}
            r={4}
            fill="none"
            stroke={T.color.terracotta}
            strokeWidth={1.5}
            opacity={0.6}
          />
          <g transform={`translate(${nodeWPx + spouseGapPx}, 0)`}>
            <PersonCard
              person={node.spouse}
              onSelect={onSelect}
              nodeWPx={nodeWPx}
              nodeHPx={nodeHPx}
            />
          </g>
        </>
      )}
    </g>
  );
}

/* ──────────────────────── Zoom/pan sessionStorage ── */

const STORAGE_KEY = "family-tree-view";

function loadViewState(): { pan: { x: number; y: number }; zoom: number } | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed.zoom === "number" && typeof parsed.pan?.x === "number") {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function saveViewState(pan: { x: number; y: number }, zoom: number) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ pan, zoom }));
  } catch {
    /* ignore */
  }
}

/* ──────────────────────────────────── Add Person Form ── */

function AddPersonForm({
  persons,
  onAdd,
  onCancel,
  isMobile,
}: {
  persons: FamilyTreePerson[];
  onAdd: (data: {
    first_name: string;
    last_name?: string;
    birth_date?: string;
    death_date?: string;
    gender?: "male" | "female" | "other";
    relatedToId?: string;
    relationType?: string;
  }) => void;
  onCancel: () => void;
  isMobile: boolean;
}) {
  const { t } = useTranslation("familyTree");
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [deathDate, setDeathDate] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other" | "">("");
  const [relatedTo, setRelatedTo] = useState("");
  const [relationType, setRelationType] = useState("");

  const inputStyle: React.CSSProperties = {
    padding: "0.625rem 0.875rem",
    borderRadius: "0.625rem",
    border: `1px solid ${T.color.sandstone}`,
    background: T.color.white,
    fontFamily: T.font.body,
    fontSize: "0.875rem",
    color: T.color.charcoal,
    outline: "none",
    minHeight: "2.75rem",
    boxSizing: "border-box",
  };

  const genderPills: { value: "male" | "female" | "other"; label: string }[] = [
    { value: "male", label: t("genderMale") },
    { value: "female", label: t("genderFemale") },
    { value: "other", label: t("genderOther") },
  ];

  const handleSubmit = () => {
    if (!first.trim()) return;
    onAdd({
      first_name: first.trim(),
      last_name: last.trim() || undefined,
      birth_date: birthDate || undefined,
      death_date: deathDate || undefined,
      gender: gender || undefined,
      relatedToId: relatedTo || undefined,
      relationType: relationType || undefined,
    });
  };

  return (
    <div
      style={{
        padding: isMobile ? "1rem" : "1.25rem 1.5rem",
        background: `${T.color.warmStone}E8`,
        backdropFilter: "blur(12px)",
        borderBottom: `1px solid ${T.color.cream}`,
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <h3
          style={{
            fontFamily: T.font.display,
            fontSize: "1.125rem",
            fontWeight: 600,
            color: T.color.charcoal,
            margin: 0,
          }}
        >
          {t("addPersonTitle")}
        </h3>
        <button
          onClick={onCancel}
          style={{
            width: "2.75rem",
            height: "2.75rem",
            borderRadius: "50%",
            border: `1px solid ${T.color.cream}`,
            background: "transparent",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          aria-label={t("cancel")}
        >
          <CloseIcon size={16} color={T.color.muted} />
        </button>
      </div>

      {/* Names row */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          flexWrap: "wrap",
        }}
      >
        <input
          id="family-tree-first-name"
          aria-label={t("firstName")}
          value={first}
          onChange={(e) => setFirst(e.target.value)}
          placeholder={t("firstName")}
          style={{ ...inputStyle, flex: "1 1 8.75rem" }}
          autoFocus
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />
        <input
          id="family-tree-last-name"
          aria-label={t("lastName")}
          value={last}
          onChange={(e) => setLast(e.target.value)}
          placeholder={t("lastName")}
          style={{ ...inputStyle, flex: "1 1 8.75rem" }}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />
      </div>

      {/* Dates row */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: "1 1 8.75rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <label
            htmlFor="family-tree-birth"
            style={{
              fontFamily: T.font.body,
              fontSize: "0.75rem",
              color: T.color.muted,
            }}
          >
            {t("birthDate")}
          </label>
          <input
            id="family-tree-birth"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div style={{ flex: "1 1 8.75rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <label
            htmlFor="family-tree-death"
            style={{
              fontFamily: T.font.body,
              fontSize: "0.75rem",
              color: T.color.muted,
            }}
          >
            {t("deathDate")}
          </label>
          <input
            id="family-tree-death"
            type="date"
            value={deathDate}
            onChange={(e) => setDeathDate(e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>

      {/* Gender pills */}
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
        <span
          style={{
            fontFamily: T.font.body,
            fontSize: "0.75rem",
            color: T.color.muted,
            marginRight: "0.25rem",
          }}
        >
          {t("genderPills")}
        </span>
        {genderPills.map((gp) => (
          <button
            key={gp.value}
            type="button"
            onClick={() => setGender(gender === gp.value ? "" : gp.value)}
            style={{
              padding: "0.375rem 0.875rem",
              borderRadius: "1.25rem",
              border: `1px solid ${gender === gp.value ? T.color.terracotta : T.color.sandstone}`,
              background: gender === gp.value ? `${T.color.terracotta}18` : T.color.white,
              fontFamily: T.font.body,
              fontSize: "0.8125rem",
              color: gender === gp.value ? T.color.terracotta : T.color.charcoal,
              cursor: "pointer",
              minHeight: "2.75rem",
              fontWeight: gender === gp.value ? 600 : 400,
              transition: "all 0.15s ease",
            }}
          >
            {gp.label}
          </button>
        ))}
      </div>

      {/* Relate to existing person */}
      {persons.length > 0 && (
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 10rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <label
              htmlFor="family-tree-relate"
              style={{
                fontFamily: T.font.body,
                fontSize: "0.75rem",
                color: T.color.muted,
              }}
            >
              {t("relateToExisting")}
            </label>
            <select
              id="family-tree-relate"
              value={relatedTo}
              onChange={(e) => setRelatedTo(e.target.value)}
              style={{ ...inputStyle, appearance: "auto" }}
            >
              <option value="">{t("selectRelation")}</option>
              {persons.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.first_name} {p.last_name || ""}
                </option>
              ))}
            </select>
          </div>
          {relatedTo && (
            <div style={{ flex: "1 1 8.75rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <label
                htmlFor="family-tree-rel-type"
                style={{
                  fontFamily: T.font.body,
                  fontSize: "0.75rem",
                  color: T.color.muted,
                }}
              >
                {t("relationshipType")}
              </label>
              <select
                id="family-tree-rel-type"
                value={relationType}
                onChange={(e) => setRelationType(e.target.value)}
                style={{ ...inputStyle, appearance: "auto" }}
              >
                <option value="">{t("selectRelation")}</option>
                <option value="parent">{t("relDescParent")}</option>
                <option value="child">{t("relDescChild")}</option>
                <option value="spouse">{t("relDescSpouse")}</option>
                <option value="ex-spouse">{t("relDescExSpouse")}</option>
                <option value="sibling">{t("relDescSibling")}</option>
              </select>
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
        <button
          onClick={onCancel}
          style={{
            padding: "0.625rem 1.25rem",
            borderRadius: "0.75rem",
            fontFamily: T.font.body,
            fontSize: "0.875rem",
            fontWeight: 600,
            cursor: "pointer",
            border: `1px solid ${T.color.cream}`,
            background: "transparent",
            color: T.color.muted,
            minHeight: "2.75rem",
          }}
        >
          {t("cancel")}
        </button>
        <button
          onClick={handleSubmit}
          disabled={!first.trim()}
          style={{
            padding: "0.625rem 1.25rem",
            borderRadius: "0.75rem",
            fontFamily: T.font.body,
            fontSize: "0.875rem",
            fontWeight: 600,
            cursor: first.trim() ? "pointer" : "default",
            border: "none",
            background: first.trim() ? T.color.sage : T.color.sandstone,
            color: T.color.white,
            minHeight: "2.75rem",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          {t("add")}
        </button>
      </div>
    </div>
  );
}

/* ──────────────────────────────────── Main page ── */

export default function FamilyTreePage() {
  const { t } = useTranslation("familyTree");
  const isMobile = useIsMobile();
  const [persons, setPersons] = useState<FamilyTreePerson[]>([]);
  const [relationships, setRelationships] = useState<FamilyTreeRelationship[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<FamilyTreePerson | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [initialFitDone, setInitialFitDone] = useState(false);
  const [selfPersonId, setSelfPersonId] = useState<string | undefined>(undefined);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    startPanX: number;
    startPanY: number;
  } | null>(null);
  const touchRef = useRef<{
    startDist: number;
    startZoom: number;
    startMidX: number;
    startMidY: number;
    startPanX: number;
    startPanY: number;
    isSingleFinger: boolean;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);

  const loadData = useCallback(async () => {
    const [pRes, rRes] = await Promise.all([getPersons(), getRelationships()]);
    setPersons(pRes.persons);
    setRelationships(rRes.relationships);

    // Detect self: check for is_self field on any person
    const self = pRes.persons.find((p) => (p as unknown as Record<string, unknown>).is_self === true);
    if (self) setSelfPersonId(self.id);

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // When data changes, update selectedPerson reference
  useEffect(() => {
    if (selectedPerson) {
      const updated = persons.find((p) => p.id === selectedPerson.id);
      if (updated) setSelectedPerson(updated);
      else setSelectedPerson(null);
    }
  }, [persons]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAdd = async (data: {
    first_name: string;
    last_name?: string;
    birth_date?: string;
    death_date?: string;
    gender?: "male" | "female" | "other";
    relatedToId?: string;
    relationType?: string;
  }) => {
    if (!data.first_name.trim()) return;
    const result = await addPerson({
      first_name: data.first_name,
      last_name: data.last_name,
      birth_date: data.birth_date,
      death_date: data.death_date,
      gender: data.gender,
    });
    if ("error" in result && result.error) {
      setToast({ message: result.error, type: "error" });
      return;
    }

    // If relating to existing person
    if (data.relatedToId && data.relationType && "person" in result && result.person) {
      try {
        const { addRelationship } = await import("@/lib/auth/family-tree-actions");
        await addRelationship(result.person.id, data.relatedToId, data.relationType as "parent" | "child" | "spouse" | "sibling");
      } catch {
        // Relationship creation may fail, but person is still added
      }
    }

    setShowAddForm(false);
    loadData();
  };

  // Build tree layout
  const forest = useMemo(
    () => buildForest(persons, relationships, selfPersonId),
    [persons, relationships, selfPersonId]
  );

  // Pixel dimensions
  const nodeWPx = remToPx(NODE_W);
  const nodeHPx = remToPx(NODE_H);
  const coupleWPx = remToPx(COUPLE_W);
  const spouseGapPx = remToPx(SPOUSE_GAP);
  const vertGapPx = remToPx(VERTICAL_GAP);
  const horizGapPx = remToPx(HORIZONTAL_GAP);

  const layoutData = useMemo(() => {
    if (forest.length === 0) return [];
    const layouts: {
      nodes: { x: number; y: number; data: TreeNode }[];
      links: { sx: number; sy: number; tx: number; ty: number; hasSpouse: boolean }[];
    }[] = [];
    let offsetX = 0;

    for (const root of forest) {
      const rootNode = hierarchy(root, (d) => d.children);
      // Use couple width for node sizing so spouses don't overlap
      const treeLayout = d3tree<TreeNode>().nodeSize([
        coupleWPx + horizGapPx,
        nodeHPx + vertGapPx,
      ]);
      const laid = treeLayout(rootNode);
      const descendants = laid.descendants();
      const nodes = descendants.map((d) => ({
        x: d.x + offsetX,
        y: d.y,
        data: d.data,
      }));
      const links = laid.links().map((l) => ({
        sx: l.source.x + offsetX,
        sy: l.source.y,
        tx: l.target.x + offsetX,
        ty: l.target.y,
        hasSpouse: !!l.source.data.spouse,
      }));

      // Calculate width of this tree
      const xs = nodes.map((n) => n.x);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const treeWidth = maxX - minX + coupleWPx + horizGapPx * 3;

      layouts.push({ nodes, links });
      offsetX += treeWidth;
    }

    return layouts;
  }, [forest, coupleWPx, nodeHPx, vertGapPx, horizGapPx]);

  // Compute bounding box
  const allNodes = layoutData.flatMap((l) => l.nodes);
  const allXs = allNodes.map((n) => n.x);
  const allYs = allNodes.map((n) => n.y);
  const padding = coupleWPx;
  const contentMinX = allXs.length ? Math.min(...allXs) - padding : 0;
  const contentMaxX = allXs.length ? Math.max(...allXs) + padding : 800;
  const contentMinY = allYs.length ? Math.min(...allYs) - nodeHPx : 0;
  const contentMaxY = allYs.length ? Math.max(...allYs) + nodeHPx * 2 : 600;
  const contentW = contentMaxX - contentMinX;
  const contentH = contentMaxY - contentMinY;

  // Find self node position for auto-centering
  const selfNode = selfPersonId
    ? allNodes.find((n) => n.data.id === selfPersonId || n.data.isSelf)
    : null;

  // Auto-fit on first load (center on self if possible)
  useEffect(() => {
    if (loading || initialFitDone || allNodes.length === 0) return;

    // Try to restore saved state first
    const saved = loadViewState();
    if (saved) {
      setPan(saved.pan);
      setZoom(saved.zoom);
      setInitialFitDone(true);
      return;
    }

    // Auto-fit
    const container = containerRef.current;
    if (!container) return;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    if (cw === 0 || ch === 0) return;

    const scaleX = cw / contentW;
    const scaleY = ch / contentH;
    const fitZoom = Math.min(scaleX, scaleY, 1) * 0.9;

    let centerX: number;
    let centerY: number;

    if (selfNode) {
      // Center on self node
      centerX = selfNode.x;
      centerY = selfNode.y;
    } else {
      centerX = (contentMinX + contentMaxX) / 2;
      centerY = (contentMinY + contentMaxY) / 2;
    }

    const newPan = {
      x: cw / 2 - centerX * fitZoom,
      y: ch / 2 - centerY * fitZoom,
    };

    setPan(newPan);
    setZoom(fitZoom);
    saveViewState(newPan, fitZoom);
    setInitialFitDone(true);
  }, [loading, initialFitDone, allNodes.length, contentW, contentH, contentMinX, contentMaxX, contentMinY, contentMaxY, selfNode]);

  // Fit-to-view action
  const handleFitView = useCallback(() => {
    const container = containerRef.current;
    if (!container || allNodes.length === 0) return;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    if (cw === 0 || ch === 0) return;

    const scaleX = cw / contentW;
    const scaleY = ch / contentH;
    const fitZoom = Math.min(scaleX, scaleY, 1) * 0.9;

    const centerX = (contentMinX + contentMaxX) / 2;
    const centerY = (contentMinY + contentMaxY) / 2;
    const newPan = {
      x: cw / 2 - centerX * fitZoom,
      y: ch / 2 - centerY * fitZoom,
    };

    setPan(newPan);
    setZoom(fitZoom);
    saveViewState(newPan, fitZoom);
  }, [allNodes.length, contentW, contentH, contentMinX, contentMaxX, contentMinY, contentMaxY]);

  // Pan / zoom handlers (mouse)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPanX: pan.x,
      startPanY: pan.y,
    };
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const newPan = {
      x: dragRef.current.startPanX + dx,
      y: dragRef.current.startPanY + dy,
    };
    setPan(newPan);
  };
  const handleMouseUp = () => {
    if (dragRef.current) {
      saveViewState(pan, zoom);
    }
    dragRef.current = null;
  };
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const newZoom = Math.max(0.15, Math.min(3, zoom - e.deltaY * 0.001));
    setZoom(newZoom);
    saveViewState(pan, newZoom);
  };

  // Touch handlers for mobile pinch zoom + pan
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        // Pinch zoom start
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        touchRef.current = {
          startDist: dist,
          startZoom: zoom,
          startMidX: midX,
          startMidY: midY,
          startPanX: pan.x,
          startPanY: pan.y,
          isSingleFinger: false,
          startX: midX,
          startY: midY,
          moved: false,
        };
      } else if (e.touches.length === 1) {
        // Single finger pan
        touchRef.current = {
          startDist: 0,
          startZoom: zoom,
          startMidX: 0,
          startMidY: 0,
          startPanX: pan.x,
          startPanY: pan.y,
          isSingleFinger: true,
          startX: e.touches[0].clientX,
          startY: e.touches[0].clientY,
          moved: false,
        };
      }
    },
    [pan, zoom]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!touchRef.current) return;

      if (e.touches.length === 2 && !touchRef.current.isSingleFinger) {
        // Pinch zoom
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const scale = dist / touchRef.current.startDist;
        const newZoom = Math.max(0.15, Math.min(3, touchRef.current.startZoom * scale));

        // Pan to keep midpoint stable
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        const panDx = midX - touchRef.current.startMidX;
        const panDy = midY - touchRef.current.startMidY;

        const newPan = {
          x: touchRef.current.startPanX + panDx,
          y: touchRef.current.startPanY + panDy,
        };

        setZoom(newZoom);
        setPan(newPan);
        touchRef.current.moved = true;
      } else if (e.touches.length === 1 && touchRef.current.isSingleFinger) {
        // Single finger pan
        const moveDx = e.touches[0].clientX - touchRef.current.startX;
        const moveDy = e.touches[0].clientY - touchRef.current.startY;
        if (Math.abs(moveDx) > 3 || Math.abs(moveDy) > 3) {
          touchRef.current.moved = true;
        }
        const newPan = {
          x: touchRef.current.startPanX + moveDx,
          y: touchRef.current.startPanY + moveDy,
        };
        setPan(newPan);
      }
    },
    []
  );

  const handleTouchEnd = useCallback(() => {
    if (touchRef.current) {
      saveViewState(pan, zoom);
    }
    touchRef.current = null;
  }, [pan, zoom]);

  // GEDCOM export
  const handleExport = () => {
    const content = exportGedcom(persons, relationships);
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "family-tree.ged";
    a.click();
    URL.revokeObjectURL(url);
  };

  // GEDCOM import with error/success reporting
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    let successCount = 0;
    let errorCount = 0;
    try {
      const text = await file.text();
      const { indis, fams, errors } = parseGedcom(text);
      errorCount += errors.length;

      const idMap = new Map<string, string>();
      for (const indi of indis) {
        if (!indi.first_name && !indi.last_name) {
          errorCount++;
          continue;
        }
        try {
          const result = await addPerson({
            first_name: indi.first_name || t("unknown"),
            last_name: indi.last_name || undefined,
            birth_date: indi.birth_date,
            death_date: indi.death_date,
            gender: indi.gender,
            notes: indi.notes,
          });
          if ("person" in result && result.person) {
            idMap.set(indi.id, result.person.id);
            successCount++;
          } else {
            errorCount++;
          }
        } catch {
          errorCount++;
        }
      }

      const { addRelationship } = await import("@/lib/auth/family-tree-actions");
      for (const fam of fams) {
        const parentIds = [fam.husb, fam.wife]
          .filter(Boolean)
          .map((id) => idMap.get(id!))
          .filter(Boolean) as string[];
        const childIds = fam.children
          .map((id) => idMap.get(id))
          .filter(Boolean) as string[];

        if (parentIds.length === 2) {
          try {
            const relType = fam.divorced ? "ex-spouse" : "spouse";
            await addRelationship(parentIds[0], parentIds[1], relType as "parent" | "child" | "spouse" | "sibling");
          } catch {
            errorCount++;
          }
        }
        for (const parentId of parentIds) {
          for (const childId of childIds) {
            try {
              await addRelationship(parentId, childId, "parent");
            } catch {
              errorCount++;
            }
          }
        }
      }

      // Show success/error toast
      if (errorCount > 0) {
        setToast({
          message: t("importCount", {
            success: String(successCount),
            errors: String(errorCount),
          }),
          type: "warning",
        });
      } else {
        setToast({
          message: t("importSuccess", { count: String(successCount) }),
          type: "success",
        });
      }

      setInitialFitDone(false); // re-fit after import
      await loadData();
    } catch {
      setToast({ message: t("importError"), type: "error" });
    }
    setImporting(false);
    if (importRef.current) importRef.current.value = "";
  };

  const btnStyle: React.CSSProperties = {
    padding: "0.625rem 1.25rem",
    borderRadius: "0.75rem",
    fontFamily: T.font.body,
    fontSize: "0.875rem",
    fontWeight: 600,
    cursor: "pointer",
    border: "none",
    minHeight: "2.75rem",
    display: "inline-flex",
    alignItems: "center",
    gap: "0.5rem",
    transition: "all 0.15s ease",
  };

  const zoomBtnStyle: React.CSSProperties = {
    width: "2.75rem",
    height: "2.75rem",
    borderRadius: "0.75rem",
    border: `1px solid ${T.color.sandstone}40`,
    background: `${T.color.linen}E8`,
    backdropFilter: "blur(12px)",
    fontSize: "1.25rem",
    cursor: "pointer",
    color: T.color.walnut,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: T.font.body,
    fontWeight: 600,
    transition: "all 0.15s ease",
    boxShadow: `0 0.125rem 0.5rem rgba(44,44,42,.08)`,
  };

  /** Generate a smooth cubic bezier path from parent center-bottom to child center-top */
  function makeLink(link: {
    sx: number;
    sy: number;
    tx: number;
    ty: number;
    hasSpouse: boolean;
  }): string {
    const halfH = nodeHPx / 2;
    const startY = link.sy + halfH;
    const endY = link.ty - halfH;
    const midY = (startY + endY) / 2;
    return `M ${link.sx} ${startY} C ${link.sx} ${midY}, ${link.tx} ${midY}, ${link.tx} ${endY}`;
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: `linear-gradient(165deg, ${T.color.linen} 0%, ${T.color.warmStone} 50%, ${T.color.sandstone}40 100%)`,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header -- fixed, glass morphism, doesn't zoom with tree */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          padding: isMobile ? "0.875rem 1rem" : "1.25rem 1.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "0.75rem",
          borderBottom: `1px solid ${T.color.cream}`,
          background: `${T.color.linen}E0`,
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          boxShadow: `0 0.125rem 0.5rem rgba(44,44,42,.06)`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
          {/* Close / back button (proper X, not emoji) */}
          <a
            href="/palace"
            style={{
              width: "2.75rem",
              height: "2.75rem",
              borderRadius: "0.75rem",
              background: `${T.color.warmStone}E0`,
              backdropFilter: "blur(8px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: `1px solid ${T.color.sandstone}40`,
              textDecoration: "none",
              cursor: "pointer",
              transition: "all 0.15s ease",
              boxShadow: `0 0.125rem 0.5rem rgba(44,44,42,.08)`,
            }}
            aria-label={t("backToAtrium")}
            title={t("backToAtrium")}
          >
            <CloseIcon size={18} color={T.color.walnut} />
          </a>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <TreeBranchIcon size={22} color={T.color.walnut} />
            <div>
              <h1
                style={{
                  fontFamily: T.font.display,
                  fontSize: isMobile ? "1.375rem" : "1.75rem",
                  fontWeight: 500,
                  color: T.color.charcoal,
                  margin: 0,
                  lineHeight: 1.2,
                }}
              >
                {t("title")}
              </h1>
              <p
                style={{
                  fontFamily: T.font.body,
                  fontSize: "0.8125rem",
                  color: T.color.muted,
                  margin: 0,
                }}
              >
                {persons.length === 1
                  ? t("personCount", { count: String(persons.length) })
                  : t("peopleCount", { count: String(persons.length) })}
              </p>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            onClick={() => setShowAddForm(true)}
            style={{
              ...btnStyle,
              background: T.color.terracotta,
              color: T.color.white,
              boxShadow: `0 0.125rem 0.5rem rgba(44,44,42,.12)`,
            }}
          >
            {t("addPerson")}
          </button>
          <button
            onClick={handleExport}
            disabled={persons.length === 0}
            style={{
              ...btnStyle,
              background: `${T.color.white}E0`,
              backdropFilter: "blur(8px)",
              color: T.color.walnut,
              border: `1px solid ${T.color.sandstone}40`,
              opacity: persons.length === 0 ? 0.5 : 1,
              boxShadow: `0 0.125rem 0.5rem rgba(44,44,42,.06)`,
            }}
          >
            {t("exportGedcom")}
          </button>
          <button
            onClick={() => importRef.current?.click()}
            disabled={importing}
            style={{
              ...btnStyle,
              background: `${T.color.white}E0`,
              backdropFilter: "blur(8px)",
              color: T.color.walnut,
              border: `1px solid ${T.color.sandstone}40`,
              boxShadow: `0 0.125rem 0.5rem rgba(44,44,42,.06)`,
            }}
          >
            {importing ? t("importing") : t("importGedcom")}
          </button>
          <input
            ref={importRef}
            type="file"
            accept=".ged,.gedcom"
            onChange={handleImport}
            style={{ display: "none" }}
          />
        </div>
      </div>

      {/* Add person form (comprehensive, all fields at once) */}
      {showAddForm && (
        <AddPersonForm
          persons={persons}
          onAdd={handleAdd}
          onCancel={() => setShowAddForm(false)}
          isMobile={isMobile}
        />
      )}

      {/* Tree visualization */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          position: "relative",
          overflow: "hidden",
          cursor: dragRef.current ? "grabbing" : "grab",
          touchAction: "none", // prevent browser handling of touch events
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        {loading ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              minHeight: "25rem",
              fontFamily: T.font.body,
              fontSize: "1rem",
              color: T.color.muted,
            }}
          >
            {t("loadingTree")}
          </div>
        ) : persons.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              minHeight: "25rem",
              gap: "1.25rem",
              padding: "2.5rem",
            }}
          >
            {/* SVG tree icon instead of emoji */}
            <div
              style={{
                width: "5rem",
                height: "5rem",
                borderRadius: "50%",
                background: `${T.color.warmStone}C0`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <TreeBranchIcon size={40} color={T.color.walnut} />
            </div>
            <h2
              style={{
                fontFamily: T.font.display,
                fontSize: "1.625rem",
                fontWeight: 500,
                color: T.color.charcoal,
                textAlign: "center",
                margin: 0,
                lineHeight: 1.3,
              }}
            >
              {t("emptyTitle")}
            </h2>
            <p
              style={{
                fontFamily: T.font.body,
                fontSize: "0.9375rem",
                color: T.color.muted,
                textAlign: "center",
                maxWidth: "26.25rem",
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              {t("emptyDescription")}
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              style={{
                ...btnStyle,
                background: T.color.terracotta,
                color: T.color.white,
                fontSize: "1rem",
                padding: "0.875rem 1.75rem",
                boxShadow: `0 0.25rem 1rem rgba(193,127,89,.25)`,
              }}
            >
              {t("addFirstPerson")}
            </button>
          </div>
        ) : (
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            style={{ minHeight: "calc(100dvh - 7.5rem)" }}
            role="img"
            aria-label={t("treeDiagram")}
          >
            {/* Gradient defs for links */}
            <defs>
              <linearGradient
                id="link-gradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor={T.color.sandstone}
                  stopOpacity={0.7}
                />
                <stop
                  offset="100%"
                  stopColor={T.color.walnut}
                  stopOpacity={0.35}
                />
              </linearGradient>
              {/* Glass morphism filter for cards */}
              <filter id="card-shadow" x="-5%" y="-5%" width="110%" height="115%">
                <feDropShadow
                  dx="0"
                  dy="2"
                  stdDeviation="4"
                  floodColor="rgba(44,44,42,0.08)"
                />
              </filter>
            </defs>
            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {/* Links */}
              {layoutData.map((tree, ti) =>
                tree.links.map((link, li) => (
                  <path
                    key={`link-${ti}-${li}`}
                    d={makeLink(link)}
                    fill="none"
                    stroke="url(#link-gradient)"
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                ))
              )}
              {/* Nodes (couples) */}
              {layoutData.map((tree, ti) =>
                tree.nodes.map((n, ni) => (
                  <CoupleNode
                    key={`node-${ti}-${ni}`}
                    x={n.x}
                    y={n.y}
                    node={n.data}
                    onSelect={setSelectedPerson}
                    nodeWPx={nodeWPx}
                    nodeHPx={nodeHPx}
                    spouseGapPx={spouseGapPx}
                  />
                ))
              )}
            </g>
          </svg>
        )}

        {/* Zoom controls -- FIXED position, always visible, don't zoom with tree */}
        {persons.length > 0 && (
          <div
            style={{
              position: "absolute",
              bottom: isMobile
                ? "calc(1.25rem + env(safe-area-inset-bottom, 0rem))"
                : "1.25rem",
              right: isMobile
                ? "calc(1rem + env(safe-area-inset-right, 0rem))"
                : "1.25rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.375rem",
              zIndex: 40,
            }}
          >
            <button
              onClick={() => {
                const nz = Math.min(3, zoom + 0.2);
                setZoom(nz);
                saveViewState(pan, nz);
              }}
              aria-label={t("zoomIn")}
              style={zoomBtnStyle}
            >
              +
            </button>
            <button
              onClick={() => {
                const nz = Math.max(0.15, zoom - 0.2);
                setZoom(nz);
                saveViewState(pan, nz);
              }}
              aria-label={t("zoomOut")}
              style={zoomBtnStyle}
            >
              {"\u2212"}
            </button>
            <button
              onClick={handleFitView}
              aria-label={t("fitView")}
              style={{
                ...zoomBtnStyle,
                fontSize: "0.875rem",
              }}
              title={t("fitView")}
            >
              {"\u2302"}
            </button>
          </div>
        )}
      </div>

      {/* Person detail panel */}
      {selectedPerson && (
        <>
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(42,34,24,.3)",
              zIndex: 99,
            }}
            onClick={() => setSelectedPerson(null)}
          />
          <PersonPanel
            person={selectedPerson}
            allPersons={persons}
            relationships={relationships}
            onClose={() => setSelectedPerson(null)}
            onUpdate={loadData}
            onSelectPerson={setSelectedPerson}
            isMobile={isMobile}
          />
        </>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}
