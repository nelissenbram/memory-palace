import type {
  FamilyTreePerson,
  FamilyTreeRelationship,
} from "@/lib/auth/family-tree-actions";

/* ──────────────────────────────────── GEDCOM types ── */

export interface ParsedIndi {
  id: string;
  first_name: string;
  last_name: string;
  birth_date?: string;
  death_date?: string;
  birth_place?: string;
  death_place?: string;
  gender?: "male" | "female" | "other";
  notes?: string;
}

export interface ParsedFam {
  husb?: string;
  wife?: string;
  children: string[];
  divorced?: boolean;
}

/* ──────────────────────────────────── GEDCOM helpers ── */

/** Format a plain (unqualified) date to GEDCOM format */
function formatPlainGedcomDate(d: string): string {
  // Year-only: return as-is (valid GEDCOM)
  if (/^\d{4}$/.test(d)) return d;
  // Year-month: "MAR 1850"
  if (/^\d{4}-\d{2}$/.test(d)) {
    const months = [
      "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
      "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
    ];
    const [year, month] = d.split("-");
    const mi = parseInt(month, 10) - 1;
    return `${months[mi] || "JAN"} ${year}`;
  }
  // Full date
  try {
    const dt = new Date(d + "T00:00:00");
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

export function formatGedcomDate(d: string): string {
  // Range: "1850/1860" → "BET 1850 AND 1860"
  const rangeMatch = d.match(/^(\d{4}(?:-\d{2}(?:-\d{2})?)?)\/(\d{4}(?:-\d{2}(?:-\d{2})?)?)$/);
  if (rangeMatch) {
    return `BET ${formatPlainGedcomDate(rangeMatch[1])} AND ${formatPlainGedcomDate(rangeMatch[2])}`;
  }
  // Approximately: "~1850" → "ABT 1850"
  if (d.startsWith("~")) {
    return `ABT ${formatPlainGedcomDate(d.slice(1))}`;
  }
  // Before: "<1850" → "BEF 1850"
  if (d.startsWith("<")) {
    return `BEF ${formatPlainGedcomDate(d.slice(1))}`;
  }
  // After: ">1850" → "AFT 1850"
  if (d.startsWith(">")) {
    return `AFT ${formatPlainGedcomDate(d.slice(1))}`;
  }
  return formatPlainGedcomDate(d);
}

/** Parse a plain GEDCOM date (no qualifier prefix) into internal format */
function parsePlainGedcomDate(s: string): string | undefined {
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
    return `${year}-${month}`;
  }
  if (parts.length === 1 && /^\d{4}$/.test(parts[0])) {
    return parts[0]; // year-only
  }
  return undefined;
}

export function parseGedcomDate(s: string): string | undefined {
  if (!s || !s.trim()) return undefined;
  const trimmed = s.trim();
  const upper = trimmed.toUpperCase();

  // BET … AND … → "startDate/endDate"
  const betMatch = upper.match(/^BET\s+(.+?)\s+AND\s+(.+)$/);
  if (betMatch) {
    const start = parsePlainGedcomDate(betMatch[1]);
    const end = parsePlainGedcomDate(betMatch[2]);
    if (start && end) return `${start}/${end}`;
    return undefined;
  }

  // FROM … TO … → "startDate/endDate"
  const fromMatch = upper.match(/^FROM\s+(.+?)\s+TO\s+(.+)$/);
  if (fromMatch) {
    const start = parsePlainGedcomDate(fromMatch[1]);
    const end = parsePlainGedcomDate(fromMatch[2]);
    if (start && end) return `${start}/${end}`;
    return undefined;
  }

  // ABT / EST → "~date"
  const abtMatch = upper.match(/^(?:ABT|EST)\s+(.+)$/);
  if (abtMatch) {
    const d = parsePlainGedcomDate(abtMatch[1]);
    return d ? `~${d}` : undefined;
  }

  // BEF → "<date"
  const befMatch = upper.match(/^BEF\s+(.+)$/);
  if (befMatch) {
    const d = parsePlainGedcomDate(befMatch[1]);
    return d ? `<${d}` : undefined;
  }

  // AFT → ">date"
  const aftMatch = upper.match(/^AFT\s+(.+)$/);
  if (aftMatch) {
    const d = parsePlainGedcomDate(aftMatch[1]);
    return d ? `>${d}` : undefined;
  }

  // CAL (calculated) → treat same as ABT
  const calMatch = upper.match(/^CAL\s+(.+)$/);
  if (calMatch) {
    const d = parsePlainGedcomDate(calMatch[1]);
    return d ? `~${d}` : undefined;
  }

  // Plain date (no qualifier)
  return parsePlainGedcomDate(trimmed);
}

export function exportGedcom(
  persons: FamilyTreePerson[],
  rels: FamilyTreeRelationship[]
): string {
  const lines: string[] = [];
  lines.push("0 HEAD");
  lines.push("1 SOUR MemoryPalace");
  lines.push("1 GEDC");
  lines.push("2 VERS 7.0");

  // Build familyMap first so INDI records can reference FAM via FAMC/FAMS
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

  // Build stable FAM id mapping (familyMap iteration order -> F1, F2, …)
  const famIds: string[] = [];
  for (const [,] of familyMap) {
    famIds.push(`F${famIds.length + 1}`);
  }

  // Build per-person FAMC / FAMS lookups
  const famcMap = new Map<string, string[]>(); // person id -> FAM ids where they are a child
  const famsMap = new Map<string, string[]>(); // person id -> FAM ids where they are a spouse/parent
  {
    let idx = 0;
    for (const [, fam] of familyMap) {
      const famId = famIds[idx];
      for (const pid of fam.parents) {
        if (!famsMap.has(pid)) famsMap.set(pid, []);
        famsMap.get(pid)!.push(famId);
      }
      for (const cid of fam.children) {
        if (!famcMap.has(cid)) famcMap.set(cid, []);
        famcMap.get(cid)!.push(famId);
      }
      idx++;
    }
  }

  for (const p of persons) {
    lines.push(`0 @I${p.id}@ INDI`);
    lines.push(`1 NAME ${p.first_name} /${p.last_name || ""}/`);
    if (p.birth_date || p.birth_place) {
      lines.push("1 BIRT");
      if (p.birth_date) lines.push(`2 DATE ${formatGedcomDate(p.birth_date)}`);
      if (p.birth_place) lines.push(`2 PLAC ${p.birth_place}`);
    }
    if (p.death_date || p.death_place) {
      lines.push("1 DEAT");
      if (p.death_date) lines.push(`2 DATE ${formatGedcomDate(p.death_date)}`);
      if (p.death_place) lines.push(`2 PLAC ${p.death_place}`);
    }
    if (p.gender) {
      lines.push(`1 SEX ${p.gender === "male" ? "M" : p.gender === "female" ? "F" : "U"}`);
    }
    if (p.notes) {
      lines.push(`1 NOTE ${p.notes}`);
    }
    // GEDCOM FAMC/FAMS cross-references
    for (const famId of famsMap.get(p.id) || []) {
      lines.push(`1 FAMS @${famId}@`);
    }
    for (const famId of famcMap.get(p.id) || []) {
      lines.push(`1 FAMC @${famId}@`);
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
        lines.push(`1 WIFE @I${pid}@`);
      } else {
        lines.push(`1 HUSB @I${pid}@`);
      }
    }
    for (const cid of fam.children) {
      lines.push(`1 CHIL @I${cid}@`);
    }
    if (fam.isExSpouse) {
      lines.push("1 DIV Y");
    }
  }

  lines.push("0 TRLR");
  return lines.join("\n");
}

export function parseGedcom(text: string): { indis: ParsedIndi[]; fams: ParsedFam[]; errors: string[] } {
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
      } else if (tag === "PLAC" && value) {
        if (currentTag === "BIRT") currentIndi.birth_place = value;
        else if (currentTag === "DEAT") currentIndi.death_place = value;
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
