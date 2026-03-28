"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
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
}

/** Build a forest of tree nodes from persons + parent-child relationships */
function buildForest(
  persons: FamilyTreePerson[],
  rels: FamilyTreeRelationship[]
): TreeNode[] {
  const childToParent = new Map<string, string[]>();
  const parentToChild = new Map<string, string[]>();

  for (const r of rels) {
    if (r.relationship_type === "parent") {
      // person_id is parent OF related_person_id
      const kids = parentToChild.get(r.person_id) || [];
      kids.push(r.related_person_id);
      parentToChild.set(r.person_id, kids);
      const parents = childToParent.get(r.related_person_id) || [];
      parents.push(r.person_id);
      childToParent.set(r.related_person_id, parents);
    } else if (r.relationship_type === "child") {
      // person_id is child OF related_person_id
      const kids = parentToChild.get(r.related_person_id) || [];
      kids.push(r.person_id);
      parentToChild.set(r.related_person_id, kids);
      const parents = childToParent.get(r.person_id) || [];
      parents.push(r.related_person_id);
      childToParent.set(r.person_id, parents);
    }
  }

  // Find roots: persons with no parent
  const allIds = new Set(persons.map((p) => p.id));
  const hasParent = new Set<string>();
  for (const [, parents] of childToParent) {
    for (const pid of parents) {
      if (allIds.has(pid)) {
        // the *children* have parents — mark the child
      }
    }
  }
  for (const [childId, parents] of childToParent) {
    if (parents.some((pid) => allIds.has(pid))) {
      hasParent.add(childId);
    }
  }

  const roots = persons.filter((p) => !hasParent.has(p.id));
  const visited = new Set<string>();

  function buildNode(personId: string): TreeNode | null {
    if (visited.has(personId)) return null;
    visited.add(personId);
    const p = persons.find((x) => x.id === personId);
    if (!p) return null;
    const childIds = parentToChild.get(personId) || [];
    const children: TreeNode[] = [];
    for (const cid of childIds) {
      const node = buildNode(cid);
      if (node) children.push(node);
    }
    return {
      id: p.id,
      name: `${p.first_name}${p.last_name ? " " + p.last_name : ""}`,
      person: p,
      children,
    };
  }

  const forest: TreeNode[] = [];
  for (const r of roots) {
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
      });
    }
  }

  return forest;
}

const NODE_W = 160;
const NODE_H = 80;
const VERTICAL_GAP = 120;
const HORIZONTAL_GAP = 40;

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

  // Individuals
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

  // Families: group by parent pairs
  const familyMap = new Map<string, { parents: Set<string>; children: Set<string> }>();
  for (const r of rels) {
    if (r.relationship_type === "parent") {
      // person_id is parent of related_person_id
      const childId = r.related_person_id;
      const parentId = r.person_id;
      // Find or create family that contains this child
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

  // Spouse relationships as separate families
  for (const r of rels) {
    if (r.relationship_type === "spouse") {
      const key = `F${familyMap.size + 1}`;
      familyMap.set(key, {
        parents: new Set([r.person_id, r.related_person_id]),
        children: new Set(),
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
  }

  lines.push("0 TRLR");
  return lines.join("\n");
}

function formatGedcomDate(d: string): string {
  try {
    const dt = new Date(d);
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
  const months: Record<string, string> = {
    JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06",
    JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12",
  };
  // Format: "1 JAN 2000" or "JAN 2000" or "2000"
  const parts = s.trim().split(/\s+/);
  if (parts.length === 3) {
    const day = parts[0].padStart(2, "0");
    const month = months[parts[1].toUpperCase()] || "01";
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }
  if (parts.length === 2) {
    const month = months[parts[0].toUpperCase()] || "01";
    const year = parts[1];
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
}

function parseGedcom(text: string): { indis: ParsedIndi[]; fams: ParsedFam[] } {
  const lines = text.split(/\r?\n/);
  const indis: ParsedIndi[] = [];
  const fams: ParsedFam[] = [];
  let currentIndi: ParsedIndi | null = null;
  let currentFam: ParsedFam | null = null;
  let currentTag = "";

  for (const line of lines) {
    const match = line.match(/^(\d+)\s+(@\S+@\s+)?(\S+)\s*(.*)?$/);
    if (!match) continue;
    const level = parseInt(match[1]);
    const tag = match[3];
    const value = (match[4] || "").trim();
    const xref = (match[2] || "").trim().replace(/@/g, "");

    if (level === 0) {
      if (currentIndi) indis.push(currentIndi);
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
        // Parse "FirstName /LastName/"
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
        }
      }
    } else if (level === 1 && currentFam) {
      if (tag === "HUSB") {
        currentFam.husb = value.replace(/@/g, "");
      } else if (tag === "WIFE") {
        currentFam.wife = value.replace(/@/g, "");
      } else if (tag === "CHIL") {
        currentFam.children.push(value.replace(/@/g, ""));
      }
    }
  }
  if (currentIndi) indis.push(currentIndi);
  if (currentFam) fams.push(currentFam);

  return { indis, fams };
}

/* ──────────────────────────────────── SVG tree node ── */

function TreeNodeCard({
  x,
  y,
  node,
  onSelect,
  spouseRels,
  allPersons,
}: {
  x: number;
  y: number;
  node: TreeNode;
  onSelect: (p: FamilyTreePerson) => void;
  spouseRels: FamilyTreeRelationship[];
  allPersons: FamilyTreePerson[];
}) {
  const p = node.person;
  const year = (d: string | null) => {
    if (!d) return "";
    try { return new Date(d).getFullYear().toString(); } catch { return ""; }
  };
  const lifespan =
    p.birth_date || p.death_date
      ? `${year(p.birth_date) || "?"}\u2013${year(p.death_date) || ""}`
      : "";

  // Check spouse
  const spouseIds = spouseRels
    .filter((r) => r.person_id === p.id || r.related_person_id === p.id)
    .map((r) => (r.person_id === p.id ? r.related_person_id : r.person_id));
  const spouse = spouseIds.length > 0 ? allPersons.find((x) => x.id === spouseIds[0]) : null;

  return (
    <g transform={`translate(${x - NODE_W / 2}, ${y - NODE_H / 2})`}>
      <rect
        width={NODE_W}
        height={NODE_H}
        rx={14}
        ry={14}
        fill={T.color.linen}
        stroke={T.color.walnut}
        strokeWidth={2}
        style={{ cursor: "pointer", filter: "drop-shadow(0 2px 8px rgba(44,44,42,.12))" }}
        onClick={() => onSelect(p)}
      />
      {/* Photo circle */}
      <circle
        cx={30}
        cy={NODE_H / 2}
        r={18}
        fill={T.color.warmStone}
        stroke={T.color.sandstone}
        strokeWidth={1.5}
        style={{ cursor: "pointer" }}
        onClick={() => onSelect(p)}
      />
      {p.photo_path ? (
        <clipPath id={`clip-${p.id}`}>
          <circle cx={30} cy={NODE_H / 2} r={17} />
        </clipPath>
      ) : null}
      {p.photo_path ? (
        <image
          href={p.photo_path}
          x={13}
          y={NODE_H / 2 - 17}
          width={34}
          height={34}
          clipPath={`url(#clip-${p.id})`}
          style={{ cursor: "pointer" }}
          onClick={() => onSelect(p)}
        />
      ) : (
        <text
          x={30}
          y={NODE_H / 2 + 5}
          textAnchor="middle"
          fontSize={16}
          style={{ cursor: "pointer" }}
          onClick={() => onSelect(p)}
        >
          {p.gender === "female" ? "\u{1F469}" : p.gender === "male" ? "\u{1F468}" : "\u{1F9D1}"}
        </text>
      )}
      {/* Name */}
      <text
        x={56}
        y={NODE_H / 2 - (lifespan ? 6 : 0)}
        fontFamily={T.font.display}
        fontSize={14}
        fontWeight={600}
        fill={T.color.charcoal}
        style={{ cursor: "pointer" }}
        onClick={() => onSelect(p)}
      >
        {node.name.length > 14 ? node.name.slice(0, 13) + "\u2026" : node.name}
      </text>
      {lifespan && (
        <text
          x={56}
          y={NODE_H / 2 + 12}
          fontFamily={T.font.body}
          fontSize={11}
          fill={T.color.muted}
          style={{ cursor: "pointer" }}
          onClick={() => onSelect(p)}
        >
          {lifespan}
        </text>
      )}
      {/* Spouse indicator */}
      {spouse && (
        <text
          x={56}
          y={NODE_H / 2 + (lifespan ? 26 : 14)}
          fontFamily={T.font.body}
          fontSize={10}
          fill={T.color.terracotta}
          style={{ cursor: "pointer" }}
          onClick={() => onSelect(spouse)}
        >
          {"\u2764\uFE0F"} {spouse.first_name}
        </text>
      )}
    </g>
  );
}

/* ──────────────────────────────────── Main page ── */

export default function FamilyTreePage() {
  const { t } = useTranslation("familyTree");
  const [persons, setPersons] = useState<FamilyTreePerson[]>([]);
  const [relationships, setRelationships] = useState<FamilyTreeRelationship[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<FamilyTreePerson | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newFirst, setNewFirst] = useState("");
  const [newLast, setNewLast] = useState("");
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const dragRef = useRef<{ startX: number; startY: number; startPanX: number; startPanY: number } | null>(null);

  const loadData = useCallback(async () => {
    const [pRes, rRes] = await Promise.all([getPersons(), getRelationships()]);
    setPersons(pRes.persons);
    setRelationships(rRes.relationships);
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

  const handleAdd = async () => {
    if (!newFirst.trim()) return;
    const result = await addPerson({ first_name: newFirst, last_name: newLast || undefined });
    if (result?.error) { alert(result.error); return; }
    setNewFirst("");
    setNewLast("");
    setShowAddForm(false);
    loadData();
  };

  const spouseRels = useMemo(
    () => relationships.filter((r) => r.relationship_type === "spouse"),
    [relationships]
  );

  // Build tree layout
  const forest = useMemo(
    () => buildForest(persons, relationships),
    [persons, relationships]
  );

  const layoutData = useMemo(() => {
    if (forest.length === 0) return [];
    const layouts: { nodes: { x: number; y: number; data: TreeNode }[]; links: { sx: number; sy: number; tx: number; ty: number }[] }[] = [];
    let offsetX = 0;

    for (const root of forest) {
      const rootNode = hierarchy(root, (d) => d.children);
      const treeLayout = d3tree<TreeNode>().nodeSize([
        NODE_W + HORIZONTAL_GAP,
        NODE_H + VERTICAL_GAP,
      ]);
      const laid = treeLayout(rootNode);
      const nodes = laid.descendants().map((d) => ({
        x: d.x + offsetX,
        y: d.y,
        data: d.data,
      }));
      const links = laid.links().map((l) => ({
        sx: l.source.x + offsetX,
        sy: l.source.y,
        tx: l.target.x + offsetX,
        ty: l.target.y,
      }));

      // Calculate width of this tree
      const xs = nodes.map((n) => n.x);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const treeWidth = maxX - minX + NODE_W + HORIZONTAL_GAP * 2;

      layouts.push({ nodes, links });
      offsetX += treeWidth;
    }

    return layouts;
  }, [forest]);

  // SVG viewBox
  const allNodes = layoutData.flatMap((l) => l.nodes);
  const allXs = allNodes.map((n) => n.x);
  const allYs = allNodes.map((n) => n.y);
  const svgMinX = allXs.length ? Math.min(...allXs) - NODE_W : 0;
  const svgMaxX = allXs.length ? Math.max(...allXs) + NODE_W : 800;
  const svgMinY = allYs.length ? Math.min(...allYs) - NODE_H : 0;
  const svgMaxY = allYs.length ? Math.max(...allYs) + NODE_H * 2 : 600;
  const svgW = svgMaxX - svgMinX + 100;
  const svgH = svgMaxY - svgMinY + 100;

  // Pan / zoom handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    dragRef.current = { startX: e.clientX, startY: e.clientY, startPanX: pan.x, startPanY: pan.y };
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPan({ x: dragRef.current.startPanX + dx, y: dragRef.current.startPanY + dy });
  };
  const handleMouseUp = () => { dragRef.current = null; };
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.max(0.2, Math.min(3, z - e.deltaY * 0.001)));
  };

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

  // GEDCOM import
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const { indis, fams } = parseGedcom(text);

      // Create persons
      const idMap = new Map<string, string>(); // gedcom id -> new id
      for (const indi of indis) {
        if (!indi.first_name && !indi.last_name) continue;
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
        }
      }

      // Create relationships from families
      const { addRelationship } = await import("@/lib/auth/family-tree-actions");
      for (const fam of fams) {
        const parentIds = [fam.husb, fam.wife].filter(Boolean).map((id) => idMap.get(id!)).filter(Boolean) as string[];
        const childIds = fam.children.map((id) => idMap.get(id)).filter(Boolean) as string[];

        // Spouse relationship
        if (parentIds.length === 2) {
          await addRelationship(parentIds[0], parentIds[1], "spouse");
        }
        // Parent-child relationships
        for (const parentId of parentIds) {
          for (const childId of childIds) {
            await addRelationship(parentId, childId, "parent");
          }
        }
      }

      await loadData();
    } catch {
      // ignore parse errors
    }
    setImporting(false);
    if (importRef.current) importRef.current.value = "";
  };

  const inputStyle: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: 10,
    border: `1px solid ${T.color.sandstone}`,
    background: T.color.white,
    fontFamily: T.font.body,
    fontSize: 14,
    color: T.color.charcoal,
    outline: "none",
  };

  const btnStyle: React.CSSProperties = {
    padding: "10px 20px",
    borderRadius: 12,
    fontFamily: T.font.body,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    border: "none",
    minHeight: 44,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: `linear-gradient(165deg, ${T.color.linen} 0%, ${T.color.warmStone} 50%, ${T.color.sandstone}40 100%)`,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "20px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          borderBottom: `1px solid ${T.color.cream}`,
          background: `${T.color.linen}e0`,
          backdropFilter: "blur(12px)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <a
            href="/palace"
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: `linear-gradient(135deg, ${T.color.warmStone}, ${T.color.sandstone})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              border: `1px solid ${T.color.sandstone}`,
              textDecoration: "none",
            }}
          >
            {"\u{1F3DB}\uFE0F"}
          </a>
          <div>
            <h1
              style={{
                fontFamily: T.font.display,
                fontSize: 28,
                fontWeight: 500,
                color: T.color.charcoal,
                margin: 0,
              }}
            >
              {t("title")}
            </h1>
            <p
              style={{
                fontFamily: T.font.body,
                fontSize: 13,
                color: T.color.muted,
                margin: 0,
              }}
            >
              {persons.length === 1 ? t("personCount", { count: String(persons.length) }) : t("peopleCount", { count: String(persons.length) })}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={() => setShowAddForm(true)}
            style={{
              ...btnStyle,
              background: T.color.terracotta,
              color: T.color.white,
            }}
          >
            {t("addPerson")}
          </button>
          <button
            onClick={handleExport}
            disabled={persons.length === 0}
            style={{
              ...btnStyle,
              background: T.color.white,
              color: T.color.walnut,
              border: `1px solid ${T.color.sandstone}`,
              opacity: persons.length === 0 ? 0.5 : 1,
            }}
          >
            {t("exportGedcom")}
          </button>
          <button
            onClick={() => importRef.current?.click()}
            disabled={importing}
            style={{
              ...btnStyle,
              background: T.color.white,
              color: T.color.walnut,
              border: `1px solid ${T.color.sandstone}`,
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

      {/* Add person form */}
      {showAddForm && (
        <div
          style={{
            padding: "16px 24px",
            background: T.color.warmStone,
            borderBottom: `1px solid ${T.color.cream}`,
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <input
            id="family-tree-first-name"
            aria-label={t("firstName")}
            value={newFirst}
            onChange={(e) => setNewFirst(e.target.value)}
            placeholder={t("firstName")}
            style={{ ...inputStyle, flex: "1 1 140px" }}
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <input
            id="family-tree-last-name"
            aria-label={t("lastName")}
            value={newLast}
            onChange={(e) => setNewLast(e.target.value)}
            placeholder={t("lastName")}
            style={{ ...inputStyle, flex: "1 1 140px" }}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <button
            onClick={handleAdd}
            disabled={!newFirst.trim()}
            style={{
              ...btnStyle,
              background: newFirst.trim() ? T.color.sage : T.color.sandstone,
              color: T.color.white,
            }}
          >
            {t("add")}
          </button>
          <button
            onClick={() => {
              setShowAddForm(false);
              setNewFirst("");
              setNewLast("");
            }}
            style={{
              ...btnStyle,
              background: "transparent",
              color: T.color.muted,
              border: `1px solid ${T.color.cream}`,
            }}
          >
            {t("cancel")}
          </button>
        </div>
      )}

      {/* Tree visualization */}
      <div
        style={{
          flex: 1,
          position: "relative",
          overflow: "hidden",
          cursor: dragRef.current ? "grabbing" : "grab",
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        {loading ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              minHeight: 400,
              fontFamily: T.font.body,
              fontSize: 16,
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
              minHeight: 400,
              gap: 16,
              padding: 40,
            }}
          >
            <div style={{ fontSize: 64 }}>{"\u{1F333}"}</div>
            <h2
              style={{
                fontFamily: T.font.display,
                fontSize: 26,
                fontWeight: 500,
                color: T.color.charcoal,
                textAlign: "center",
                margin: 0,
              }}
            >
              {t("emptyTitle")}
            </h2>
            <p
              style={{
                fontFamily: T.font.body,
                fontSize: 15,
                color: T.color.muted,
                textAlign: "center",
                maxWidth: 420,
                lineHeight: 1.6,
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
                fontSize: 16,
                padding: "14px 28px",
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
            style={{ minHeight: "calc(100dvh - 120px)" }}
            viewBox={`${svgMinX - 50} ${svgMinY - 50} ${svgW} ${svgH}`}
            role="img"
            aria-label={t("treeDiagram")}
          >
            <g transform={`translate(${pan.x / zoom}, ${pan.y / zoom}) scale(${zoom})`}>
              {/* Links */}
              {layoutData.map((tree, ti) =>
                tree.links.map((link, li) => (
                  <path
                    key={`link-${ti}-${li}`}
                    d={`M ${link.sx} ${link.sy + NODE_H / 2} C ${link.sx} ${(link.sy + link.ty) / 2 + NODE_H / 4}, ${link.tx} ${(link.sy + link.ty) / 2 + NODE_H / 4}, ${link.tx} ${link.ty - NODE_H / 2}`}
                    fill="none"
                    stroke={T.color.sandstone}
                    strokeWidth={2}
                    strokeDasharray="none"
                  />
                ))
              )}
              {/* Nodes */}
              {layoutData.map((tree, ti) =>
                tree.nodes.map((n, ni) => (
                  <TreeNodeCard
                    key={`node-${ti}-${ni}`}
                    x={n.x}
                    y={n.y}
                    node={n.data}
                    onSelect={setSelectedPerson}
                    spouseRels={spouseRels}
                    allPersons={persons}
                  />
                ))
              )}
            </g>
          </svg>
        )}

        {/* Zoom controls */}
        {persons.length > 0 && (
          <div
            style={{
              position: "absolute",
              bottom: 20,
              right: 20,
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <button
              onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                border: `1px solid ${T.color.sandstone}`,
                background: `${T.color.linen}e0`,
                fontSize: 20,
                cursor: "pointer",
                color: T.color.walnut,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              +
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(0.2, z - 0.2))}
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                border: `1px solid ${T.color.sandstone}`,
                background: `${T.color.linen}e0`,
                fontSize: 20,
                cursor: "pointer",
                color: T.color.walnut,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {"\u2212"}
            </button>
            <button
              onClick={() => { setPan({ x: 0, y: 0 }); setZoom(1); }}
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                border: `1px solid ${T.color.sandstone}`,
                background: `${T.color.linen}e0`,
                fontSize: 14,
                cursor: "pointer",
                color: T.color.walnut,
                fontFamily: T.font.body,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              title={t("resetView")}
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
          />
        </>
      )}
    </div>
  );
}
