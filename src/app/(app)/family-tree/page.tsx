"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import Toast, { type ToastData } from "@/components/ui/Toast";
import {
  getPersons,
  getRelationships,
  addPerson,
  mergePersons,
  createShareLink,
  deactivateShareLink,
  getActiveShare,
} from "@/lib/auth/family-tree-actions";
import type {
  FamilyTreePerson,
  FamilyTreeRelationship,
  FamilyTreeShare,
} from "@/lib/auth/family-tree-actions";
import { hierarchy, tree as d3tree } from "d3-hierarchy";
import PersonPanel from "./PersonPanel";
import FanChart from "./FanChart";

/* ── Extracted modules ── */
import { exportGedcom, parseGedcom } from "./gedcom";
import { buildForest, buildDescendancyTree, remToPx, NODE_W, NODE_H, SPOUSE_GAP, COUPLE_W, VERTICAL_GAP, HORIZONTAL_GAP } from "./tree-layout";
import type { TreeNode } from "./tree-layout";
import { PersonCard, CoupleNode, TreeBranchIcon, CloseIcon } from "./PersonCard";
import { AddPersonForm } from "./AddPersonForm";
import type { AddPersonData } from "./AddPersonForm";
import { TreeSearch } from "./TreeSearch";
import { FocusBanner, filterToFocus } from "./FocusBanner";
import { PersonList } from "./PersonList";
import { TreeErrorBoundary } from "./TreeErrorBoundary";
import { OnboardingWizard } from "./OnboardingWizard";
import DuplicateDetector, { findDuplicates } from "./DuplicateDetector";

const ONBOARDING_DISMISSED_KEY = "family-tree-onboarding-dismissed";

/* ──────────────────────── Zoom/pan sessionStorage ── */

const STORAGE_KEY = "family-tree-view";
const FAN_STORAGE_KEY = "family-tree-fan-view";
const VIEW_MODE_KEY = "family-tree-mode";
const ROOT_PERSON_KEY = "family-tree-root";

type ViewMode = "portrait" | "fan" | "list";

function loadViewMode(): ViewMode {
  try {
    const v = sessionStorage.getItem(VIEW_MODE_KEY);
    if (v === "fan" || v === "list") return v;
  } catch { /* ignore */ }
  return "portrait";
}

function saveViewMode(mode: ViewMode) {
  try { sessionStorage.setItem(VIEW_MODE_KEY, mode); } catch { /* ignore */ }
}

function loadRootPerson(): string | null {
  try { return sessionStorage.getItem(ROOT_PERSON_KEY); } catch { return null; }
}

function saveRootPerson(id: string | null) {
  try {
    if (id) sessionStorage.setItem(ROOT_PERSON_KEY, id);
    else sessionStorage.removeItem(ROOT_PERSON_KEY);
  } catch { /* ignore */ }
}

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

let _viewStateTimer: ReturnType<typeof setTimeout> | null = null;
function saveViewState(pan: { x: number; y: number }, zoom: number) {
  if (_viewStateTimer) clearTimeout(_viewStateTimer);
  _viewStateTimer = setTimeout(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ pan, zoom }));
    } catch {
      /* ignore */
    }
  }, 300);
}

function loadFanViewState(): { pan: { x: number; y: number }; zoom: number } | null {
  try {
    const raw = sessionStorage.getItem(FAN_STORAGE_KEY);
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

let _fanViewStateTimer: ReturnType<typeof setTimeout> | null = null;
function saveFanViewState(pan: { x: number; y: number }, zoom: number) {
  if (_fanViewStateTimer) clearTimeout(_fanViewStateTimer);
  _fanViewStateTimer = setTimeout(() => {
    try {
      sessionStorage.setItem(FAN_STORAGE_KEY, JSON.stringify({ pan, zoom }));
    } catch {
      /* ignore */
    }
  }, 300);
}

/* ──────────────────────────────────── Main page ── */

export default function FamilyTreePage({ onClose }: { onClose?: () => void } = {}) {
  const { t } = useTranslation("familyTree");
  const router = useRouter();
  const isMobile = useIsMobile();
  const [persons, setPersons] = useState<FamilyTreePerson[]>([]);
  const [relationships, setRelationships] = useState<FamilyTreeRelationship[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<FamilyTreePerson | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addFormDefaults, setAddFormDefaults] = useState<{ relationType?: string; relatedToId?: string }>({});
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [showImportExport, setShowImportExport] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [activeShare, setActiveShare] = useState<FamilyTreeShare | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [fanPan, setFanPan] = useState(() => {
    const saved = loadFanViewState();
    return saved ? saved.pan : { x: 0, y: 0 };
  });
  const [fanZoom, setFanZoom] = useState(() => {
    const saved = loadFanViewState();
    return saved ? saved.zoom : 1;
  });
  const [initialFitDone, setInitialFitDone] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("portrait");
  const [rootPersonId, setRootPersonId] = useState<string | null>(null);
  const [quickAddTarget, setQuickAddTarget] = useState<{ person: FamilyTreePerson; x: number; y: number } | null>(null);
  const [selfPersonId, setSelfPersonId] = useState<string | undefined>(undefined);
  const [onboardingDismissed, setOnboardingDismissed] = useState(() => {
    try { return sessionStorage.getItem(ONBOARDING_DISMISSED_KEY) === "true"; } catch { return false; }
  });
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

  /* ── Phase 3: Keyboard nav + Focus mode state ── */
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const [focusPersonId, setFocusPersonId] = useState<string | null>(null);
  const [descendancyRootId, setDescendancyRootId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [pRes, rRes, shareRes] = await Promise.all([getPersons(), getRelationships(), getActiveShare()]);
      setPersons(pRes.persons);
      setRelationships(rRes.relationships);
      if (shareRes.share) setActiveShare(shareRes.share);

      // Detect self: check for is_self field on any person
      const self = pRes.persons.find((p) => (p as unknown as Record<string, unknown>).is_self === true);
      if (self) setSelfPersonId(self.id);
    } catch {
      setToast({ message: t("loadError"), type: "error" });
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadData();
    setViewMode(loadViewMode());
    const savedRoot = loadRootPerson();
    if (savedRoot) setRootPersonId(savedRoot);
  }, [loadData]);

  // When data changes, update selectedPerson reference
  const selectedPersonId = selectedPerson?.id;
  useEffect(() => {
    if (selectedPersonId) {
      const updated = persons.find((p) => p.id === selectedPersonId);
      if (updated) setSelectedPerson(updated);
      else setSelectedPerson(null);
    }
  }, [persons, selectedPersonId]);

  const handleAdd = async (data: AddPersonData) => {
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
        const relResult = await addRelationship(result.person.id, data.relatedToId, data.relationType as "parent" | "child" | "spouse" | "sibling" | "ex-spouse" | "stepparent" | "stepchild" | "half-sibling");
        if (relResult && "error" in relResult && relResult.error) {
          setToast({ message: t("relationshipAddError"), type: "warning" });
        }
      } catch {
        setToast({ message: t("relationshipAddError"), type: "warning" });
      }
    }

    setShowAddForm(false);
    loadData();
  };

  /* ── Phase 3B: Focus mode filtering ── */
  const effectiveData = useMemo(() => {
    if (focusPersonId) {
      return filterToFocus(persons, relationships, focusPersonId);
    }
    return { persons, relationships };
  }, [persons, relationships, focusPersonId]);

  const focusPerson = focusPersonId ? persons.find((p) => p.id === focusPersonId) : null;

  // Build tree layout (using filtered data if focus mode is active)
  const forest = useMemo(
    () =>
      descendancyRootId
        ? buildDescendancyTree(descendancyRootId, effectiveData.persons, effectiveData.relationships, selfPersonId)
        : buildForest(effectiveData.persons, effectiveData.relationships, selfPersonId),
    [effectiveData.persons, effectiveData.relationships, selfPersonId, descendancyRootId]
  );

  /* ── Phase 2B: Relationship count map ── */
  const relCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const rel of effectiveData.relationships) {
      map.set(rel.person_id, (map.get(rel.person_id) || 0) + 1);
      map.set(rel.related_person_id, (map.get(rel.related_person_id) || 0) + 1);
    }
    return map;
  }, [effectiveData.relationships]);

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
      links: { sx: number; sy: number; tx: number; ty: number; hasSpouse: boolean; targetHasSpouse: boolean; sourceId: string; targetId: string }[];
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
      const links = laid.links().map((l) => {
        const targetHasSpouse = !!l.target.data.spouse;
        // When child has a spouse, the d3 x is the couple center.
        // The child (primary person) is on the LEFT half of the couple node,
        // so shift target x left to point at the child card, not the midpoint.
        const txAdj = targetHasSpouse
          ? l.target.x + offsetX - (nodeWPx + spouseGapPx) / 4
          : l.target.x + offsetX;
        return {
          sx: l.source.x + offsetX,
          sy: l.source.y,
          tx: txAdj,
          ty: l.target.y,
          hasSpouse: !!l.source.data.spouse,
          targetHasSpouse,
          sourceId: l.source.data.id,
          targetId: l.target.data.id,
        };
      });

      // Calculate width of this tree
      const xs = nodes.map((n) => n.x);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const treeWidth = maxX - minX + coupleWPx + horizGapPx * 3;

      layouts.push({ nodes, links });
      offsetX += treeWidth;
    }

    /* ── Y-shift trees whose children were consumed as spouses ──
     * When a person (e.g. Kirsten) is consumed as a spouse in another tree,
     * their parents (e.g. Rian & Toine) form a separate tree placed at y=0.
     * We need to shift that tree down so the parents sit one generation
     * above the child's actual y-position in the other tree.
     */
    // 1. Build a map: personId → y coordinate across all laid-out nodes
    const nodeYMap = new Map<string, { y: number; layoutIdx: number }>();
    for (let li = 0; li < layouts.length; li++) {
      for (const n of layouts[li].nodes) {
        nodeYMap.set(n.data.id, { y: n.y, layoutIdx: li });
        if (n.data.spouse) {
          nodeYMap.set(n.data.spouse.id, { y: n.y, layoutIdx: li });
        }
      }
    }

    // 2. For each tree, check if root's actual children (from relationships)
    //    ended up in a different tree (consumed as spouse)
    for (let i = 0; i < layouts.length; i++) {
      const treeRoot = forest[i];
      const rootIds = [treeRoot.id];
      if (treeRoot.spouse) rootIds.push(treeRoot.spouse.id);

      // Find children of root person(s) from raw relationship data
      const childPersonIds = new Set<string>();
      for (const rel of effectiveData.relationships) {
        if (
          rel.relationship_type === "parent" &&
          rootIds.includes(rel.person_id)
        ) {
          childPersonIds.add(rel.related_person_id);
        } else if (
          rel.relationship_type === "child" &&
          rootIds.includes(rel.related_person_id)
        ) {
          childPersonIds.add(rel.person_id);
        }
      }

      // Check if any of those children appear in a DIFFERENT tree
      for (const childId of childPersonIds) {
        const entry = nodeYMap.get(childId);
        if (!entry || entry.layoutIdx === i) continue;
        // This child is in another tree — shift current tree
        const childY = entry.y;
        const targetRootY = childY - (nodeHPx + vertGapPx);
        const currentRootY = layouts[i].nodes[0]?.y ?? 0;
        const yShift = targetRootY - currentRootY;
        if (Math.abs(yShift) < 1) break; // already aligned
        for (const node of layouts[i].nodes) {
          node.y += yShift;
        }
        for (const link of layouts[i].links) {
          link.sy += yShift;
          link.ty += yShift;
        }
        break; // Only shift once per tree
      }
    }

    return layouts;
  }, [forest, coupleWPx, nodeHPx, vertGapPx, horizGapPx, effectiveData.relationships]);

  // Compute bounding box (memoized)
  const allNodes = useMemo(() => layoutData.flatMap((l) => l.nodes), [layoutData]);
  const { contentMinX, contentMaxX, contentMinY, contentMaxY, contentW, contentH } = useMemo(() => {
    const allXs = allNodes.map((n) => n.x);
    const allYs = allNodes.map((n) => n.y);
    const padding = coupleWPx;
    const minX = allXs.length ? Math.min(...allXs) - padding : 0;
    const maxX = allXs.length ? Math.max(...allXs) + padding : 800;
    const minY = allYs.length ? Math.min(...allYs) - nodeHPx : 0;
    const maxY = allYs.length ? Math.max(...allYs) + nodeHPx * 2 : 600;
    return {
      contentMinX: minX,
      contentMaxX: maxX,
      contentMinY: minY,
      contentMaxY: maxY,
      contentW: maxX - minX,
      contentH: maxY - minY,
    };
  }, [allNodes, coupleWPx, nodeHPx]);

  // ── Ex-spouse links (dashed grey arcs) ──
  const exSpouseLinks = useMemo(() => {
    if (allNodes.length === 0) return [];
    const posMap = new Map<string, { x: number; y: number }>();
    for (const n of allNodes) {
      posMap.set(n.data.id, { x: n.x, y: n.y });
      if (n.data.spouse) posMap.set(n.data.spouse.id, { x: n.x + nodeWPx + spouseGapPx, y: n.y });
    }
    const links: { x1: number; y1: number; x2: number; y2: number }[] = [];
    const seen = new Set<string>();
    for (const rel of effectiveData.relationships) {
      if ((rel.relationship_type as string) !== "ex-spouse") continue;
      const key = [rel.person_id, rel.related_person_id].sort().join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      const p1 = posMap.get(rel.person_id);
      const p2 = posMap.get(rel.related_person_id);
      if (p1 && p2) links.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });
    }
    return links;
  }, [allNodes, effectiveData.relationships, nodeWPx, spouseGapPx]);

  // ── Extra parent-child links (parent-child relationships not in D3 tree links) ──
  const extraParentChildLinks = useMemo(() => {
    if (allNodes.length === 0 || layoutData.length === 0) return [];

    // Build a position map for all persons (including spouses)
    const posMap = new Map<string, { x: number; y: number }>();
    for (const n of allNodes) {
      posMap.set(n.data.id, { x: n.x, y: n.y });
      if (n.data.spouse) posMap.set(n.data.spouse.id, { x: n.x + nodeWPx + spouseGapPx, y: n.y });
    }

    // Collect all parent-child pairs already covered by D3 tree links
    const coveredLinks = new Set<string>();
    for (const tree of layoutData) {
      for (const link of tree.links) {
        coveredLinks.add(`${link.sourceId}|${link.targetId}`);
        // Also cover the spouse of the source (couple nodes)
        const sourceNode = allNodes.find((n) => n.data.id === link.sourceId);
        if (sourceNode?.data.spouse) {
          coveredLinks.add(`${sourceNode.data.spouse.id}|${link.targetId}`);
        }
      }
    }

    // Find parent-child relationships not covered by D3 links
    // First collect all extra parent→child pairs grouped by child
    const childToParents = new Map<string, { parentId: string; pPos: { x: number; y: number } }[]>();
    const seen = new Set<string>();
    for (const rel of effectiveData.relationships) {
      let parentId: string | null = null;
      let childId: string | null = null;
      if (rel.relationship_type === "parent" || rel.relationship_type === "stepparent") {
        parentId = rel.person_id;
        childId = rel.related_person_id;
      } else if (rel.relationship_type === "child" || rel.relationship_type === "stepchild") {
        parentId = rel.related_person_id;
        childId = rel.person_id;
      }
      if (!parentId || !childId) continue;

      const key = `${parentId}|${childId}`;
      if (seen.has(key) || coveredLinks.has(key)) continue;
      seen.add(key);

      const pPos = posMap.get(parentId);
      const cPos = posMap.get(childId);
      if (pPos && cPos) {
        if (!childToParents.has(childId)) childToParents.set(childId, []);
        childToParents.get(childId)!.push({ parentId, pPos });
      }
    }

    // Build a set of spouse pairs for quick lookup
    const spousePairs = new Set<string>();
    for (const rel of effectiveData.relationships) {
      if (rel.relationship_type === "spouse" || rel.relationship_type === "ex-spouse") {
        spousePairs.add([rel.person_id, rel.related_person_id].sort().join("|"));
      }
    }

    // Now produce links, merging couple parents into a single couple link
    const links: { sx: number; sy: number; tx: number; ty: number; hasSpouse: boolean }[] = [];
    for (const [childId, parents] of childToParents) {
      const cPos = posMap.get(childId)!;
      const matched = new Set<number>();
      // Try to pair parents that are spouses
      for (let a = 0; a < parents.length; a++) {
        if (matched.has(a)) continue;
        for (let b = a + 1; b < parents.length; b++) {
          if (matched.has(b)) continue;
          const pairKey = [parents[a].parentId, parents[b].parentId].sort().join("|");
          if (spousePairs.has(pairKey)) {
            matched.add(a);
            matched.add(b);
            links.push({
              sx: (parents[a].pPos.x + parents[b].pPos.x) / 2,
              sy: parents[a].pPos.y,
              tx: cPos.x,
              ty: cPos.y,
              hasSpouse: true,
            });
            break;
          }
        }
      }
      // Remaining unmatched parents get single links
      for (let i = 0; i < parents.length; i++) {
        if (matched.has(i)) continue;
        links.push({ sx: parents[i].pPos.x, sy: parents[i].pPos.y, tx: cPos.x, ty: cPos.y, hasSpouse: false });
      }
    }
    return links;
  }, [allNodes, layoutData, effectiveData.relationships, nodeWPx, spouseGapPx]);

  // ── Generation bars ──
  const generationBars = useMemo(() => {
    if (allNodes.length === 0) return [];
    const selfN = allNodes.find((n) => n.data.isSelf || n.data.id === selfPersonId || n.data.spouse?.id === selfPersonId);
    const selfY = selfN ? selfN.y : 0;
    const yLevels = new Set<number>();
    for (const n of allNodes) yLevels.add(n.y);
    const sorted = Array.from(yLevels).sort((a, b) => a - b);
    const step = nodeHPx + vertGapPx;
    return sorted.map((y) => {
      const gen = step > 0 ? Math.round((y - selfY) / step) : 0;
      return { y, gen };
    });
  }, [allNodes, selfPersonId, nodeHPx, vertGapPx]);

  // Find center node for auto-centering (rootPersonId takes priority over self)
  const centerTargetNode = rootPersonId
    ? allNodes.find((n) => n.data.id === rootPersonId)
    : selfPersonId
      ? allNodes.find((n) => n.data.id === selfPersonId || n.data.isSelf || n.data.spouse?.id === selfPersonId)
      : null;

  // Auto-fit on first load (center on self if possible)
  useEffect(() => {
    if (loading || initialFitDone || allNodes.length === 0) return;

    const saved = loadViewState();
    if (saved) {
      setPan(saved.pan);
      setZoom(saved.zoom);
      setInitialFitDone(true);
      return;
    }

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

    if (centerTargetNode) {
      centerX = centerTargetNode.x;
      centerY = centerTargetNode.y;
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
  }, [loading, initialFitDone, allNodes.length, contentW, contentH, contentMinX, contentMaxX, contentMinY, contentMaxY, centerTargetNode]);

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

  // Center tree on a specific person
  const centerOnPerson = useCallback((personId: string) => {
    const node = allNodes.find(
      (n) => n.data.id === personId || n.data.spouse?.id === personId
    );
    if (!node) return;
    const container = containerRef.current;
    if (!container) return;
    const cw = container.clientWidth;
    const ch = container.clientHeight;

    const newPan = {
      x: cw / 2 - node.x * zoom,
      y: ch / 2 - node.y * zoom,
    };
    setPan(newPan);
    saveViewState(newPan, zoom);
  }, [allNodes, zoom]);

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
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const scale = dist / touchRef.current.startDist;
        const newZoom = Math.max(0.15, Math.min(3, touchRef.current.startZoom * scale));

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

  // SVG export
  const handleExportSvg = () => {
    const svgEl = containerRef.current?.querySelector("svg");
    if (!svgEl) return;
    const clone = svgEl.cloneNode(true) as SVGElement;
    const mainG = clone.querySelector("g");
    if (mainG) mainG.removeAttribute("transform");
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(clone);
    const blob = new Blob([svgString], { type: "image/svg+xml" });
    const dlUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = dlUrl;
    a.download = "family-tree.svg";
    a.click();
    URL.revokeObjectURL(dlUrl);
  };

  // PNG export (2x resolution)
  const handleExportPng = () => {
    try {
      const svgEl = containerRef.current?.querySelector("svg");
      if (!svgEl) {
        setToast({ message: t("exportPngError"), type: "error" });
        return;
      }
      const clone = svgEl.cloneNode(true) as SVGSVGElement;
      // Remove pan/zoom transforms from the clone so we get the full content
      const mainG = clone.querySelector("g");
      if (mainG) mainG.removeAttribute("transform");
      // Remove any inline transform on the SVG itself (pan/zoom CSS)
      clone.style.transform = "none";

      // Compute bounds from layout data (reliable, not dependent on getBBox)
      let bx = 0, by = 0, bw = 800, bh = 600;
      if (allNodes.length > 0) {
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const n of allNodes) {
          const hw = n.data.spouse ? coupleWPx / 2 : nodeWPx / 2;
          minX = Math.min(minX, n.x - hw);
          maxX = Math.max(maxX, n.x + hw);
          minY = Math.min(minY, n.y - nodeHPx / 2);
          maxY = Math.max(maxY, n.y + nodeHPx / 2);
        }
        bx = minX;
        by = minY;
        bw = maxX - minX;
        bh = maxY - minY;
      }

      const pad = 60;
      clone.setAttribute("width", String(bw + pad));
      clone.setAttribute("height", String(bh + pad));
      clone.setAttribute("viewBox", `${bx - pad / 2} ${by - pad / 2} ${bw + pad} ${bh + pad}`);
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");

      // Inline font style so text renders correctly in the serialized SVG
      const styleEl = document.createElementNS("http://www.w3.org/2000/svg", "style");
      styleEl.textContent = `text, foreignObject * { font-family: 'Source Sans 3', 'Source Sans Pro', system-ui, sans-serif; }`;
      const defs = clone.querySelector("defs");
      if (defs) {
        defs.appendChild(styleEl);
      } else {
        clone.prepend(styleEl);
      }

      // Replace external <image> elements with placeholder rects to avoid
      // cross-origin tainted canvas errors
      const images = clone.querySelectorAll("image");
      images.forEach((img) => {
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("x", img.getAttribute("x") || "0");
        rect.setAttribute("y", img.getAttribute("y") || "0");
        rect.setAttribute("width", img.getAttribute("width") || "40");
        rect.setAttribute("height", img.getAttribute("height") || "40");
        rect.setAttribute("rx", img.getAttribute("width") ? String(Number(img.getAttribute("width")) / 2) : "20");
        rect.setAttribute("ry", img.getAttribute("height") ? String(Number(img.getAttribute("height")) / 2) : "20");
        rect.setAttribute("fill", "#C4A882");
        img.parentNode?.replaceChild(rect, img);
      });

      // Remove foreignObject elements that won't render in Image context
      const foreignObjects = clone.querySelectorAll("foreignObject");
      foreignObjects.forEach((fo) => fo.remove());

      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(clone);
      const img = new Image();
      img.crossOrigin = "anonymous";
      const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const dlUrl = URL.createObjectURL(svgBlob);

      img.onerror = () => {
        URL.revokeObjectURL(dlUrl);
        setToast({ message: t("exportPngError"), type: "error" });
      };

      img.onload = () => {
        try {
          const scale = 2;
          const canvas = document.createElement("canvas");
          canvas.width = (bw + pad) * scale;
          canvas.height = (bh + pad) * scale;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            URL.revokeObjectURL(dlUrl);
            setToast({ message: t("exportPngError"), type: "error" });
            return;
          }
          // Fill background explicitly
          ctx.fillStyle = "#FAF8F5";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.scale(scale, scale);
          ctx.drawImage(img, 0, 0, bw + pad, bh + pad);
          canvas.toBlob((blob) => {
            if (!blob) {
              setToast({ message: t("exportPngError"), type: "error" });
              return;
            }
            const pngUrl = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = pngUrl;
            a.download = "family-tree.png";
            a.click();
            URL.revokeObjectURL(pngUrl);
          }, "image/png");
          URL.revokeObjectURL(dlUrl);
        } catch {
          URL.revokeObjectURL(dlUrl);
          setToast({ message: t("exportPngError"), type: "error" });
        }
      };
      img.src = dlUrl;
    } catch {
      setToast({ message: t("exportPngError"), type: "error" });
    }
  };

  // GEDCOM import with error/success reporting
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const MAX_GEDCOM_SIZE = 10 * 1024 * 1024; // 10 MB
    if (file.size > MAX_GEDCOM_SIZE) {
      setToast({ message: t("gedcomTooLarge"), type: "error" });
      return;
    }
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
            birth_place: indi.birth_place,
            death_place: indi.death_place,
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
            await addRelationship(parentIds[0], parentIds[1], relType as "parent" | "child" | "spouse" | "sibling" | "ex-spouse" | "stepparent" | "stepchild" | "half-sibling");
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

      setInitialFitDone(false);
      await loadData();

      // Auto-show duplicate detector after import if duplicates exist
      const { persons: freshPersons } = await getPersons();
      if (findDuplicates(freshPersons).length > 0) {
        setToast({
          message: t("duplicatesAfterImport"),
          type: "warning",
        });
        setShowDuplicates(true);
      }
    } catch {
      setToast({ message: t("importError"), type: "error" });
    }
    setImporting(false);
    if (importRef.current) importRef.current.value = "";
  };

  const handleMergeDuplicate = async (keepId: string, removeId: string) => {
    const result = await mergePersons(keepId, removeId);
    if ("error" in result && result.error) {
      setToast({ message: result.error, type: "error" });
    } else {
      setToast({ message: t("mergeDuplicates"), type: "success" });
      await loadData();
    }
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
    width: isMobile ? "2rem" : "2.75rem",
    height: isMobile ? "2rem" : "2.75rem",
    borderRadius: isMobile ? "50%" : "0.75rem",
    border: `1px solid ${T.color.sandstone}40`,
    background: `${T.color.linen}E8`,
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    fontSize: isMobile ? "0.9375rem" : "1.25rem",
    cursor: "pointer",
    color: T.color.walnut,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: T.font.body,
    fontWeight: 600,
    transition: "all 0.15s ease",
    boxShadow: `0 0.125rem 0.5rem rgba(44,44,42,.08)`,
    padding: 0,
  };

  // Switch view mode
  const handleViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    saveViewMode(mode);
  };

  // Re-center tree on a specific person
  const handleRecenter = useCallback((person: FamilyTreePerson) => {
    setRootPersonId(person.id);
    saveRootPerson(person.id);
    setInitialFitDone(false);
    setToast({ message: t("recentered", { name: person.first_name }), type: "success" });
  }, [t]);

  // Quick-add: open form with pre-filled relation defaults
  const handleQuickAdd = (relationType: "parent" | "child" | "spouse", targetPerson: FamilyTreePerson) => {
    setQuickAddTarget(null);
    setAddFormDefaults({ relationType, relatedToId: targetPerson.id });
    setShowAddForm(true);
  };

  // Effective root for fan chart (selfPersonId as fallback)
  const effectiveRootId = rootPersonId || selfPersonId || persons[0]?.id;

  /* ── Phase 1A: Search handler — center tree on person + open panel ── */
  const handleSearchSelect = useCallback((person: FamilyTreePerson) => {
    setSelectedPerson(person);
    centerOnPerson(person.id);
  }, [centerOnPerson]);

  /* ── Phase 3B: Focus mode handler ── */
  const handleFocusPerson = useCallback((person: FamilyTreePerson) => {
    setFocusPersonId(person.id);
    setFocusedNodeId(person.id);
    setSelectedPerson(null);
    setInitialFitDone(false);
  }, []);

  const handleExitFocus = useCallback(() => {
    setFocusPersonId(null);
    setFocusedNodeId(null);
    setInitialFitDone(false);
  }, []);

  /* ── Descendancy view handler ── */
  const handleViewDescendants = useCallback((person: FamilyTreePerson) => {
    setDescendancyRootId(person.id);
    setSelectedPerson(null);
    setInitialFitDone(false);
  }, []);

  const handleExitDescendancy = useCallback(() => {
    setDescendancyRootId(null);
    setInitialFitDone(false);
  }, []);

  /* ── Phase 3A: Keyboard navigation ── */
  // Build adjacency map for arrow key navigation
  const adjacencyMap = useMemo(() => {
    const map: Record<string, { parents: string[]; children: string[]; siblings: string[]; spouses: string[] }> = {};
    const allPersonIds = effectiveData.persons.map((p) => p.id);
    for (const id of allPersonIds) {
      map[id] = { parents: [], children: [], siblings: [], spouses: [] };
    }
    for (const rel of effectiveData.relationships) {
      if (rel.relationship_type === "parent") {
        map[rel.related_person_id]?.parents.push(rel.person_id);
        map[rel.person_id]?.children.push(rel.related_person_id);
      } else if (rel.relationship_type === "child") {
        map[rel.person_id]?.parents.push(rel.related_person_id);
        map[rel.related_person_id]?.children.push(rel.person_id);
      } else if (rel.relationship_type === "spouse" || rel.relationship_type === "ex-spouse") {
        if (!map[rel.person_id]?.spouses.includes(rel.related_person_id)) {
          map[rel.person_id]?.spouses.push(rel.related_person_id);
        }
        if (!map[rel.related_person_id]?.spouses.includes(rel.person_id)) {
          map[rel.related_person_id]?.spouses.push(rel.person_id);
        }
      }
    }
    // Infer siblings from shared parents (O(n) via parent→children index)
    const childrenByParent = new Map<string, string[]>();
    for (const id of allPersonIds) {
      for (const pid of map[id]?.parents || []) {
        let list = childrenByParent.get(pid);
        if (!list) { list = []; childrenByParent.set(pid, list); }
        list.push(id);
      }
    }
    for (const children of childrenByParent.values()) {
      for (const childId of children) {
        const sibSet = map[childId]?.siblings;
        if (!sibSet) continue;
        for (const otherId of children) {
          if (otherId !== childId && !sibSet.includes(otherId)) {
            sibSet.push(otherId);
          }
        }
      }
    }
    return map;
  }, [effectiveData.persons, effectiveData.relationships]);

  // Flat list of person IDs in layout order (left→right, top→bottom)
  const layoutOrderIds = useMemo(() => {
    const ids: string[] = [];
    const sorted = [...allNodes].sort((a, b) => a.y - b.y || a.x - b.x);
    for (const n of sorted) {
      ids.push(n.data.id);
      if (n.data.spouse) ids.push(n.data.spouse.id);
    }
    return ids;
  }, [allNodes]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Allow keyboard nav as long as the event is inside the SVG area
    // (removed e.target !== e.currentTarget guard — child SVG elements receive events)
    const tag = (e.target as HTMLElement).tagName?.toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return;

    if (e.key === "Tab") {
      e.preventDefault();
      if (layoutOrderIds.length === 0) return;
      const currentIdx = focusedNodeId ? layoutOrderIds.indexOf(focusedNodeId) : -1;
      let nextIdx: number;
      if (e.shiftKey) {
        nextIdx = currentIdx <= 0 ? layoutOrderIds.length - 1 : currentIdx - 1;
      } else {
        nextIdx = currentIdx >= layoutOrderIds.length - 1 ? 0 : currentIdx + 1;
      }
      const nextId = layoutOrderIds[nextIdx];
      setFocusedNodeId(nextId);
      centerOnPerson(nextId);
      return;
    }

    if (e.key === "Escape") {
      setFocusedNodeId(null);
      return;
    }

    if (e.key === "Enter" && focusedNodeId) {
      const p = effectiveData.persons.find((p) => p.id === focusedNodeId);
      if (p) setSelectedPerson(p);
      return;
    }

    // F key for focus mode
    if (e.key === "f" && focusedNodeId && !e.ctrlKey && !e.metaKey) {
      const p = effectiveData.persons.find((p) => p.id === focusedNodeId);
      if (p) handleFocusPerson(p);
      return;
    }

    // Arrow keys pan the tree view (like scrolling)
    const panStep = 80 / zoom;
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const newPan = { x: pan.x, y: pan.y + panStep };
      setPan(newPan);
      saveViewState(newPan, zoom);
      return;
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const newPan = { x: pan.x, y: pan.y - panStep };
      setPan(newPan);
      saveViewState(newPan, zoom);
      return;
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      const newPan = { x: pan.x + panStep, y: pan.y };
      setPan(newPan);
      saveViewState(newPan, zoom);
      return;
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      const newPan = { x: pan.x - panStep, y: pan.y };
      setPan(newPan);
      saveViewState(newPan, zoom);
      return;
    }
  }, [focusedNodeId, layoutOrderIds, effectiveData.persons, centerOnPerson, handleFocusPerson, selfPersonId, pan, zoom]);

  // Keyboard navigation via window listener (SVG focus is unreliable)
  useEffect(() => {
    if (loading || viewMode !== "portrait") return;
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      handleKeyDown(e as unknown as React.KeyboardEvent);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [loading, viewMode, handleKeyDown]);

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

  /** Two intertwined paths from each parent to child — they cross once in the middle */
  function makeCoupleLinkPaths(link: {
    sx: number;
    sy: number;
    tx: number;
    ty: number;
  }): [string, string] {
    const halfH = nodeHPx / 2;
    const halfSpouse = (nodeWPx + spouseGapPx) / 2;
    const startY = link.sy + halfH;
    const endY = link.ty - halfH;
    const midY = (startY + endY) / 2;
    const lx = link.sx - halfSpouse * 0.4;
    const rx = link.sx + halfSpouse * 0.4;
    const pathL = `M ${lx} ${startY} C ${lx} ${midY - 20}, ${rx} ${midY + 20}, ${link.tx} ${endY}`;
    const pathR = `M ${rx} ${startY} C ${rx} ${midY - 20}, ${lx} ${midY + 20}, ${link.tx} ${endY}`;
    return [pathL, pathR];
  }

  /** Sine-wave path for ex-spouse links */
  function makeExSpouseWavyPath(x1: number, y1: number, x2: number, y2: number): string {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const waves = Math.max(3, Math.round(dist / 40));
    const amp = 8;
    let path = `M ${x1} ${y1}`;
    for (let i = 1; i <= waves * 2; i++) {
      const t = i / (waves * 2);
      const px = x1 + dx * t;
      const py = y1 + dy * t;
      // perpendicular offset for sine wave
      const perpX = -dy / dist * amp * Math.sin(i * Math.PI);
      const perpY = dx / dist * amp * Math.sin(i * Math.PI);
      const cpx = x1 + dx * ((i - 0.5) / (waves * 2));
      const cpy = y1 + dy * ((i - 0.5) / (waves * 2));
      const cpPerpX = -dy / dist * amp * Math.sin((i - 0.5) * Math.PI);
      const cpPerpY = dx / dist * amp * Math.sin((i - 0.5) * Math.PI);
      path += ` Q ${cpx + cpPerpX} ${cpy + cpPerpY}, ${px + (i < waves * 2 ? perpX * 0.3 : 0)} ${py + (i < waves * 2 ? perpY * 0.3 : 0)}`;
    }
    return path;
  }

  // Legend collapsed state (for mobile)
  const [legendExpanded, setLegendExpanded] = useState(!isMobile);

  return (
    <div
      style={{
        height: "100dvh",
        maxHeight: "100dvh",
        background: onClose
          ? `linear-gradient(165deg, ${T.color.linen} 0%, ${T.color.warmStone} 40%, ${T.color.sandstone} 70%, ${T.color.linen} 100%)`
          : `linear-gradient(165deg, ${T.color.linen} 0%, ${T.color.warmStone} 40%, ${T.color.sandstone}30 70%, ${T.color.linen} 100%)`,
        display: "flex",
        flexDirection: "column",
        ...(onClose ? { position: "fixed" as const, inset: 0, zIndex: 90 } : {}),
      }}
    >
      {/* Header — NavigationBar-style glass morphism toolbar */}
      {isMobile && <style>{`.ft-mob-scroll::-webkit-scrollbar{display:none}`}</style>}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          borderBottom: `0.0625rem solid rgba(238,234,227,0.5)`,
          background: `${T.color.linen}C7`,
          backdropFilter: "blur(1.5rem) saturate(180%)",
          WebkitBackdropFilter: "blur(1.5rem) saturate(180%)",
          boxShadow: "0 0.25rem 1.5rem rgba(44,44,42,0.07), 0 0.0625rem 0.125rem rgba(44,44,42,0.03)",
          flexShrink: 0,
        }}
      >
        {/* Row 1: Back, title, person count, view switcher */}
        <div
          style={{
            padding: isMobile ? "0.5rem 0.75rem" : "0.75rem 1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.75rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? "0.5rem" : "0.75rem" }}>
            <button
              onClick={() => onClose ? onClose() : router.back()}
              style={{
                width: "2.25rem",
                height: "2.25rem",
                borderRadius: "50%",
                background: "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: `0.0625rem solid ${T.color.cream}`,
                cursor: "pointer",
                transition: "all 0.25s cubic-bezier(0.22, 1, 0.36, 1)",
                flexShrink: 0,
                padding: 0,
              }}
              aria-label={t("backToAtrium")}
              title={t("backToAtrium")}
            >
              <CloseIcon size={14} color={T.color.walnut} />
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
              <TreeBranchIcon size={isMobile ? 18 : 22} color={T.color.walnut} />
              <div>
                <h1
                  style={{
                    fontFamily: T.font.display,
                    fontSize: isMobile ? "1.0625rem" : "1.5rem",
                    fontWeight: 500,
                    color: T.color.charcoal,
                    margin: 0,
                    lineHeight: 1.2,
                  }}
                >
                  {t("title")}
                </h1>
                {!isMobile && (
                  <p style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.muted, margin: 0 }}>
                    {persons.length === 1
                      ? t("personCount", { count: String(persons.length) })
                      : t("peopleCount", { count: String(persons.length) })}
                  </p>
                )}
              </div>
            </div>
            {isMobile && persons.length > 0 && (
              <span style={{
                fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.muted,
                background: `${T.color.cream}88`, borderRadius: "0.75rem",
                padding: "0.125rem 0.5rem", flexShrink: 0,
              }}>
                {persons.length}
              </span>
            )}
          </div>

          {/* View mode switcher — always visible in row 1 */}
          {persons.length > 0 && (
            <div style={{
              display: "flex",
              borderRadius: "1.5rem",
              border: `0.0625rem solid rgba(238,234,227,0.5)`,
              background: "rgba(255,255,255,0.35)",
              backdropFilter: "blur(0.5rem)",
              WebkitBackdropFilter: "blur(0.5rem)",
              padding: "0.125rem",
              gap: "0.125rem",
            }}>
              {(["portrait", "fan", "list"] as const).map((mode) => {
                const isActive = viewMode === mode;
                const color = isActive ? T.color.white : T.color.walnut;
                return (
                  <button
                    key={mode}
                    onClick={() => handleViewMode(mode)}
                    aria-label={t(mode === "portrait" ? "viewPortrait" : mode === "fan" ? "viewFan" : "viewList")}
                    title={t(mode === "portrait" ? "viewPortrait" : mode === "fan" ? "viewFan" : "viewList")}
                    style={{
                      width: "2.25rem",
                      height: "2.25rem",
                      border: "none",
                      borderRadius: "1.25rem",
                      background: isActive
                        ? `linear-gradient(135deg, ${T.color.terracotta}, ${T.color.gold})`
                        : "transparent",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
                      boxShadow: isActive ? "0 0.125rem 0.5rem rgba(193,127,89,0.25)" : "none",
                    }}
                  >
                    {mode === "portrait" ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
                        <line x1="12" y1="22" x2="12" y2="8" />
                        <path d="M12 14 Q8 12 5 8" />
                        <circle cx="5" cy="6" r="2" fill={color} opacity={0.3} />
                        <path d="M12 14 Q16 12 19 8" />
                        <circle cx="19" cy="6" r="2" fill={color} opacity={0.3} />
                        <circle cx="12" cy="6" r="2.5" fill={color} opacity={0.4} />
                      </svg>
                    ) : mode === "fan" ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5">
                        <path d="M12 20 A8 8 0 0 1 4 12" />
                        <path d="M12 20 A12 12 0 0 1 0 8" />
                        <path d="M12 20 A8 8 0 0 0 20 12" />
                        <path d="M12 20 A12 12 0 0 0 24 8" />
                        <circle cx="12" cy="20" r="2" fill={color} opacity={0.5} />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
                        <line x1="4" y1="6" x2="20" y2="6" />
                        <line x1="4" y1="12" x2="20" y2="12" />
                        <line x1="4" y1="18" x2="20" y2="18" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          )}

        </div>
        {/* Row 2: Actions bar — scrollable pills on mobile, flex-end on desktop */}
        <div
          className={isMobile ? "ft-mob-scroll" : undefined}
          style={{
            padding: isMobile ? "0.375rem 0.75rem 0.5rem" : "0 1.5rem 0.75rem",
            display: "flex",
            alignItems: "center",
            gap: isMobile ? "0.375rem" : "0.75rem",
            justifyContent: isMobile ? "flex-start" : "flex-end",
            ...(isMobile ? {
              overflowX: "auto",
              overflowY: "hidden",
              WebkitOverflowScrolling: "touch",
              whiteSpace: "nowrap" as const,
              scrollbarWidth: "none" as const,
              msOverflowStyle: "none" as const,
              borderTop: `0.0625rem solid ${T.color.cream}66`,
              background: `linear-gradient(180deg, ${T.color.sandstone}18 0%, ${T.color.cream}22 100%)`,
            } : {}),
          }}
        >
          {/* Search */}
          {persons.length > 0 && (
            <TreeSearch
              persons={persons}
              onSelect={handleSearchSelect}
              isMobile={isMobile}
            />
          )}

          {/* Add Person — accent pill */}
          <button
            onClick={() => { setAddFormDefaults({}); setShowAddForm(true); setShowImportExport(false); }}
            title={t("addPerson")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.25rem",
              padding: "0.375rem 0.75rem",
              borderRadius: "1rem",
              border: `0.125rem solid ${T.color.gold}`,
              background: `linear-gradient(135deg, ${T.color.terracotta}, ${T.color.gold})`,
              color: T.color.white,
              boxShadow: "0 0.125rem 0.75rem rgba(193,127,89,0.3)",
              fontFamily: T.font.body,
              fontWeight: 600,
              fontSize: "0.8125rem",
              cursor: "pointer",
              flexShrink: 0,
              minHeight: "2.125rem",
              whiteSpace: "nowrap",
              transition: "all 0.2s ease",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {t("addPerson")}
          </button>

          {/* Duplicates — glass pill */}
          <button
            onClick={() => { setShowDuplicates(true); setShowImportExport(false); setShowAddForm(false); }}
            disabled={persons.length < 2}
            title={t("checkDuplicates")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.25rem",
              padding: "0.375rem 0.75rem",
              borderRadius: "1rem",
              border: `0.0625rem solid ${T.color.cream}`,
              background: T.color.white,
              color: persons.length < 2 ? T.color.muted : T.color.charcoal,
              cursor: persons.length < 2 ? "default" : "pointer",
              fontFamily: T.font.body,
              fontWeight: 500,
              fontSize: "0.8125rem",
              flexShrink: 0,
              minHeight: "2.125rem",
              whiteSpace: "nowrap",
              transition: "all 0.2s ease",
            }}
          >
            {t("checkDuplicates")}
          </button>

          {/* Import/Export — glass pill */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <button
              onClick={() => { setShowImportExport(!showImportExport); if (!showImportExport) setShowAddForm(false); }}
              title={importing ? t("importing") : t("importExport")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.25rem",
                padding: "0.375rem 0.75rem",
                borderRadius: "1rem",
                border: `0.0625rem solid ${T.color.cream}`,
                background: T.color.white,
                color: T.color.charcoal,
                cursor: "pointer",
                fontFamily: T.font.body,
                fontWeight: 500,
                fontSize: "0.8125rem",
                flexShrink: 0,
                minHeight: "2.125rem",
                whiteSpace: "nowrap",
                transition: "all 0.2s ease",
              }}
            >
              {importing ? t("importing") : t("importExport")}
            </button>
            {showImportExport && (
              <>
                <div
                  onClick={() => setShowImportExport(false)}
                  style={{ position: "fixed", top: 0, right: 0, bottom: 0, left: 0, zIndex: 9 }}
                />
                <div
                  style={{
                    position: isMobile ? "fixed" : "absolute",
                    top: isMobile ? "auto" : "100%",
                    bottom: isMobile ? "1rem" : undefined,
                    right: isMobile ? "1rem" : 0,
                    left: isMobile ? "1rem" : undefined,
                    marginTop: isMobile ? undefined : "0.375rem",
                    background: "rgba(255,255,255,0.45)",
                    backdropFilter: "blur(1rem)",
                    WebkitBackdropFilter: "blur(1rem)",
                    borderRadius: "1rem",
                    border: `0.0625rem solid ${T.color.cream}`,
                    borderTop: `0.125rem solid ${T.color.gold}`,
                    boxShadow: "0 0.25rem 1.5rem rgba(0,0,0,0.06)",
                    padding: "0.25rem",
                    zIndex: 10,
                    minWidth: "11rem",
                  }}
                >
                  {([
                    { action: () => { setShowImportExport(false); handleExport(); }, label: t("exportFile"), disabled: persons.length === 0 },
                    { action: () => { setShowImportExport(false); handleExportSvg(); }, label: t("exportSvg"), disabled: persons.length === 0 },
                    { action: () => { setShowImportExport(false); handleExportPng(); }, label: t("exportPng"), disabled: persons.length === 0 },
                    { action: () => { setShowImportExport(false); importRef.current?.click(); }, label: t("importFile"), disabled: importing },
                  ] as const).map((item, idx) => (
                    <button
                      key={idx}
                      onClick={item.action}
                      disabled={item.disabled}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        width: "100%",
                        padding: "0.5rem 0.75rem",
                        borderRadius: "0.5rem",
                        border: "none",
                        background: "transparent",
                        fontFamily: T.font.body,
                        fontSize: "0.8125rem",
                        color: item.disabled ? T.color.muted : T.color.charcoal,
                        cursor: item.disabled ? "default" : "pointer",
                        textAlign: "left" as const,
                        minHeight: "2.25rem",
                        transition: "background 0.15s ease",
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                  <div
                    style={{
                      padding: "0.25rem 0.75rem 0.375rem",
                      fontFamily: T.font.body,
                      fontSize: "0.625rem",
                      color: T.color.muted,
                      fontStyle: "italic",
                      borderTop: `0.0625rem solid ${T.color.cream}`,
                      marginTop: "0.125rem",
                    }}
                  >
                    {t("gedcomHint")}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Share — glass pill */}
          {persons.length > 0 && (
            <button
              onClick={async () => {
                setShowShareDialog(true);
                setShowImportExport(false);
                setShowAddForm(false);
                if (!activeShare) {
                  setShareLoading(true);
                  const result = await createShareLink();
                  if (result.share) setActiveShare(result.share);
                  setShareLoading(false);
                }
              }}
              title={t("shareTree")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.25rem",
                padding: "0.375rem 0.75rem",
                borderRadius: "1rem",
                border: `0.0625rem solid ${T.color.cream}`,
                background: T.color.white,
                color: T.color.charcoal,
                cursor: "pointer",
                fontFamily: T.font.body,
                fontWeight: 500,
                fontSize: "0.8125rem",
                flexShrink: 0,
                minHeight: "2.125rem",
                whiteSpace: "nowrap",
                transition: "all 0.2s ease",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
              {t("shareTree")}
            </button>
          )}
          <input
            ref={importRef}
            type="file"
            accept=".ged,.gedcom"
            onChange={handleImport}
            style={{ display: "none" }}
          />
        </div>
      </div>

      {/* Share dialog */}
      {showShareDialog && (
        <>
          <div
            onClick={() => { setShowShareDialog(false); setLinkCopied(false); }}
            style={{ position: "fixed", top: 0, right: 0, bottom: 0, left: 0, background: "rgba(0,0,0,0.3)", zIndex: 100 }}
          />
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: T.color.white,
              borderRadius: "1rem",
              padding: "1.5rem",
              zIndex: 101,
              minWidth: isMobile ? "calc(100vw - 2rem)" : "24rem",
              maxWidth: "28rem",
              boxShadow: "0 1rem 3rem rgba(44,44,42,.2)",
              fontFamily: T.font.body,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ fontFamily: T.font.display, fontSize: "1.125rem", color: T.color.charcoal, margin: 0 }}>
                {t("shareLink")}
              </h3>
              <button
                onClick={() => { setShowShareDialog(false); setLinkCopied(false); }}
                style={{ background: "none", border: "none", cursor: "pointer", padding: "0.25rem" }}
              >
                <CloseIcon size={18} color={T.color.muted} />
              </button>
            </div>

            {shareLoading ? (
              <p style={{ color: T.color.muted, fontSize: "0.875rem" }}>...</p>
            ) : activeShare ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.5rem 0.75rem",
                  background: `${T.color.sage}15`,
                  borderRadius: "0.5rem",
                  fontSize: "0.8125rem",
                  color: T.color.sage,
                  fontWeight: 600,
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill={T.color.sage} stroke="none">
                    <circle cx="12" cy="12" r="10" opacity="0.2" />
                    <path d="M9 12l2 2 4-4" fill="none" stroke={T.color.sage} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {t("shareActive")}
                </div>
                <div style={{
                  display: "flex",
                  gap: "0.5rem",
                  alignItems: "stretch",
                }}>
                  <input
                    readOnly
                    value={`${typeof window !== "undefined" ? window.location.origin : ""}/family-tree/shared/${activeShare.share_token}`}
                    style={{
                      flex: 1,
                      padding: "0.5rem 0.75rem",
                      borderRadius: "0.5rem",
                      border: `1px solid ${T.color.sandstone}40`,
                      fontFamily: T.font.body,
                      fontSize: "0.75rem",
                      color: T.color.charcoal,
                      background: T.color.cream,
                      minWidth: 0,
                    }}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <button
                    onClick={async () => {
                      const url = `${window.location.origin}/family-tree/shared/${activeShare.share_token}`;
                      try {
                        await navigator.clipboard.writeText(url);
                        setLinkCopied(true);
                        setTimeout(() => setLinkCopied(false), 2000);
                      } catch {
                        setToast({ message: t("clipboardError"), type: "error" });
                      }
                    }}
                    style={{
                      ...btnStyle,
                      padding: "0.5rem 1rem",
                      background: linkCopied ? T.color.sage : T.color.terracotta,
                      color: T.color.white,
                      fontSize: "0.8125rem",
                      minHeight: "auto",
                    }}
                  >
                    {linkCopied ? t("linkCopied") : t("copyLink")}
                  </button>
                </div>
                <button
                  onClick={async () => {
                    setShareLoading(true);
                    const result = await deactivateShareLink(activeShare.id);
                    if (result.success) {
                      setActiveShare(null);
                      setShowShareDialog(false);
                      setToast({ message: t("shareInactive"), type: "success" });
                    }
                    setShareLoading(false);
                  }}
                  style={{
                    ...btnStyle,
                    background: "transparent",
                    color: T.color.error,
                    border: `1px solid ${T.color.error}30`,
                    fontSize: "0.8125rem",
                    justifyContent: "center",
                    minHeight: "2.25rem",
                    padding: "0.5rem 1rem",
                  }}
                >
                  {t("stopSharing")}
                </button>
              </div>
            ) : (
              <p style={{ color: T.color.muted, fontSize: "0.875rem" }}>{t("shareInactive")}</p>
            )}
          </div>
        </>
      )}

      {/* Add person form */}
      {showAddForm && (
        <AddPersonForm
          key={`${addFormDefaults.relationType || ""}-${addFormDefaults.relatedToId || ""}`}
          persons={persons}
          onAdd={handleAdd}
          onCancel={() => setShowAddForm(false)}
          isMobile={isMobile}
          defaultRelationType={addFormDefaults.relationType}
          defaultRelatedToId={addFormDefaults.relatedToId}
        />
      )}

      {/* Duplicate detector */}
      {showDuplicates && (
        <DuplicateDetector
          persons={persons}
          onMerge={handleMergeDuplicate}
          onClose={() => setShowDuplicates(false)}
          isMobile={isMobile}
        />
      )}

      {/* Phase 3B: Focus mode banner */}
      {focusPerson && (
        <FocusBanner person={focusPerson} onExit={handleExitFocus} />
      )}

      {/* Descendancy view banner */}
      {descendancyRootId && (() => {
        const dp = persons.find((p) => p.id === descendancyRootId);
        if (!dp) return null;
        const dName = `${dp.first_name}${dp.last_name ? " " + dp.last_name : ""}`;
        return (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.75rem",
              padding: "0.5rem 1rem",
              background: `${T.color.terracotta}15`,
              borderBottom: `1px solid ${T.color.terracotta}30`,
              fontFamily: T.font.body,
              fontSize: "0.875rem",
              color: T.color.charcoal,
            }}
          >
            <span style={{ fontWeight: 600 }}>
              {t("descendancyBanner", { name: dName })}
            </span>
            <button
              onClick={handleExitDescendancy}
              style={{
                padding: "0.25rem 0.75rem",
                borderRadius: "0.5rem",
                border: `1px solid ${T.color.terracotta}40`,
                background: T.color.white,
                fontFamily: T.font.body,
                fontSize: "0.8125rem",
                color: T.color.terracotta,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              {t("exitDescendancy")}
            </button>
          </div>
        );
      })()}

      {/* Tree visualization */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          minHeight: 0,
          position: "relative",
          overflow: "hidden",
          cursor: dragRef.current ? "grabbing" : "grab",
          touchAction: "none",
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
          !onboardingDismissed ? (
            <OnboardingWizard
              isMobile={isMobile}
              onStart={() => {
                setOnboardingDismissed(true);
                try { sessionStorage.setItem(ONBOARDING_DISMISSED_KEY, "true"); } catch { /* ignore */ }
                setAddFormDefaults({});
                setShowAddForm(true);
              }}
              onSkip={() => {
                setOnboardingDismissed(true);
                try { sessionStorage.setItem(ONBOARDING_DISMISSED_KEY, "true"); } catch { /* ignore */ }
              }}
            />
          ) : (
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
              onClick={() => { setAddFormDefaults({}); setShowAddForm(true); }}
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
          )
        ) : viewMode === "fan" && effectiveRootId ? (
          <TreeErrorBoundary>
          <FanChart
            persons={effectiveData.persons}
            relationships={effectiveData.relationships}
            rootPersonId={effectiveRootId}
            onSelectPerson={setSelectedPerson}
            onRootChange={(id) => { setRootPersonId(id); saveRootPerson(id); }}
            isMobile={isMobile}
            pan={fanPan}
            zoom={fanZoom}
            onPanChange={(p) => { setFanPan(p); saveFanViewState(p, fanZoom); }}
            onZoomChange={(z) => { setFanZoom(z); saveFanViewState(fanPan, z); }}
          />
          </TreeErrorBoundary>
        ) : viewMode === "list" ? (
          <PersonList
            persons={effectiveData.persons}
            relationships={effectiveData.relationships}
            onSelect={setSelectedPerson}
            isMobile={isMobile}
          />
        ) : (
          <TreeErrorBoundary>
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            style={{ minHeight: "calc(100vh - 7.5rem)", outline: "none" }}
            role="img"
            aria-label={t("treeDiagram")}
            tabIndex={0}
            onKeyDown={handleKeyDown}
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
                  stopColor={T.color.walnut}
                  stopOpacity={0.5}
                />
                <stop
                  offset="50%"
                  stopColor={T.color.sandstone}
                  stopOpacity={0.6}
                />
                <stop
                  offset="100%"
                  stopColor={T.color.walnut}
                  stopOpacity={0.4}
                />
              </linearGradient>
              {/* Couple link gradient — warmer, Tuscan feel */}
              <linearGradient
                id="couple-link-gradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor={T.color.terracotta}
                  stopOpacity={0.65}
                />
                <stop
                  offset="100%"
                  stopColor={T.color.terracotta}
                  stopOpacity={0.5}
                />
              </linearGradient>
              {/* Second parent path — gold tint */}
              <linearGradient
                id="couple-link-gradient-2"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor={T.color.gold}
                  stopOpacity={0.6}
                />
                <stop
                  offset="100%"
                  stopColor={T.color.goldLight}
                  stopOpacity={0.45}
                />
              </linearGradient>
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
              {/* Generation bar lines (labels moved to HTML overlay) */}
              {generationBars.map((bar) => (
                <line
                  key={`gen-line-${bar.gen}`}
                  x1={contentMinX}
                  y1={bar.y}
                  x2={contentMaxX}
                  y2={bar.y}
                  stroke={T.color.sandstone}
                  strokeWidth={1}
                  strokeDasharray="8 6"
                  opacity={0.25}
                />
              ))}
              {/* D3 hierarchy links */}
              {layoutData.map((tree, ti) =>
                tree.links.map((link, li) => {
                  if (link.hasSpouse) {
                    const [pathL, pathR] = makeCoupleLinkPaths(link);
                    return (
                      <g key={`link-${ti}-${li}`}>
                        <path d={pathL} fill="none" stroke={T.color.terracotta} strokeWidth={3.5} strokeLinecap="round" opacity={0.7} />
                        <path d={pathR} fill="none" stroke={T.color.gold} strokeWidth={3.5} strokeLinecap="round" opacity={0.7} />
                      </g>
                    );
                  }
                  return (
                    <path
                      key={`link-${ti}-${li}`}
                      d={makeLink(link)}
                      fill="none"
                      stroke={T.color.walnut}
                      strokeWidth={2}
                      strokeLinecap="round"
                      opacity={0.5}
                    />
                  );
                })
              )}
              {/* Ex-spouse links (wavy rose line) */}
              {exSpouseLinks.map((link, i) => (
                <path
                  key={`ex-${i}`}
                  d={makeExSpouseWavyPath(link.x1, link.y1, link.x2, link.y2)}
                  fill="none"
                  stroke="#D4838A"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  opacity={0.6}
                />
              ))}
              {/* Extra parent-child links (not in D3 tree) */}
              {extraParentChildLinks.map((link, i) => {
                if (link.hasSpouse) {
                  const [pathL, pathR] = makeCoupleLinkPaths(link);
                  return (
                    <g key={`extra-pc-${i}`}>
                      <path d={pathL} fill="none" stroke={T.color.terracotta} strokeWidth={3.5} strokeLinecap="round" opacity={0.7} />
                      <path d={pathR} fill="none" stroke={T.color.gold} strokeWidth={3.5} strokeLinecap="round" opacity={0.7} />
                    </g>
                  );
                }
                return (
                  <path key={`extra-pc-${i}`} d={makeLink(link)} fill="none" stroke={T.color.walnut} strokeWidth={2} strokeLinecap="round" opacity={0.5} />
                );
              })}
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
                    onQuickAdd={(person, cx, cy) => setQuickAddTarget({ person, x: cx, y: cy })}
                    relCountMap={relCountMap}
                    focusedNodeId={focusedNodeId}
                  />
                ))
              )}
              {/* Legend moved to HTML overlay below */}
            </g>
          </svg>
          </TreeErrorBoundary>
        )}

        {/* Generation labels — HTML overlay, sticky at left edge */}
        {persons.length > 0 && viewMode === "portrait" && generationBars.map((bar) => {
          const genLabel = (() => {
            if (bar.gen === 0) return t("genYouLabel");
            if (bar.gen === -1) return t("genParents");
            if (bar.gen === -2) return t("genGrandparents");
            if (bar.gen === -3) return t("genGreatGrandparents");
            if (bar.gen === 1) return t("genChildren");
            if (bar.gen === 2) return t("genGrandchildren");
            if (bar.gen === 3) return t("genGreatGrandchildren");
            if (bar.gen < -3) return `${t("generation")} ${bar.gen}`;
            return `${t("generation")} +${bar.gen}`;
          })();
          const screenY = bar.y * zoom + pan.y;
          return (
            <div
              key={`gen-label-${bar.gen}`}
              style={{
                position: "absolute",
                left: "0.75rem",
                top: screenY - 12,
                padding: "0.125rem 0.5rem",
                borderRadius: "0.375rem",
                background: "rgba(255,255,255,0.7)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                fontFamily: T.font.display,
                fontSize: "0.6875rem",
                fontStyle: "italic",
                color: T.color.walnut,
                pointerEvents: "none",
                zIndex: 6,
                whiteSpace: "nowrap",
                border: `1px solid rgba(238,234,227,0.4)`,
              }}
            >
              {genLabel}
            </div>
          );
        })}

        {/* Legend — HTML overlay, bottom-left */}
        {allNodes.length > 0 && viewMode === "portrait" && (
          <>
            {/* Mobile: small circular icon button that pops up the legend */}
            {isMobile ? (
              <div style={{ position: "absolute", bottom: "calc(1.25rem + env(safe-area-inset-bottom, 0rem))", left: "0.75rem", zIndex: 10 }}>
                <button
                  onClick={() => setLegendExpanded(!legendExpanded)}
                  aria-label={t("legendParentChild")}
                  style={{
                    width: "2.25rem",
                    height: "2.25rem",
                    borderRadius: "50%",
                    border: `1px solid rgba(238,234,227,0.5)`,
                    background: "rgba(255,255,255,0.85)",
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)",
                    boxShadow: "0 0.125rem 0.5rem rgba(44,44,42,0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  {/* Small legend icon — three colored lines */}
                  <svg width="16" height="16" viewBox="0 0 16 16">
                    <line x1="3" y1="4" x2="13" y2="4" stroke={T.color.walnut} strokeWidth={2} strokeLinecap="round" opacity={0.6} />
                    <line x1="3" y1="8" x2="13" y2="8" stroke={T.color.terracotta} strokeWidth={2} strokeLinecap="round" opacity={0.7} />
                    <line x1="3" y1="12" x2="13" y2="12" stroke="#D4838A" strokeWidth={2} strokeLinecap="round" opacity={0.6} strokeDasharray="2 2" />
                  </svg>
                </button>
                {/* Pop-up legend panel */}
                {legendExpanded && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: "2.75rem",
                      left: 0,
                      borderRadius: "0.75rem",
                      background: "rgba(255,255,255,0.92)",
                      backdropFilter: "blur(12px)",
                      WebkitBackdropFilter: "blur(12px)",
                      border: `1px solid rgba(238,234,227,0.5)`,
                      boxShadow: "0 0.25rem 1rem rgba(44,44,42,0.12)",
                      padding: "0.5rem 0.75rem",
                      fontFamily: T.font.body,
                      fontSize: "0.6875rem",
                      color: T.color.muted,
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.375rem",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <svg width="24" height="12" viewBox="0 0 24 12">
                        <path d="M 0 6 Q 12 0, 24 6" fill="none" stroke={T.color.walnut} strokeWidth={2} strokeLinecap="round" opacity={0.5} />
                      </svg>
                      <span>{t("legendParentChild")}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <svg width="24" height="12" viewBox="0 0 24 12">
                        <path d="M 2 2 Q 10 8, 22 6" fill="none" stroke={T.color.terracotta} strokeWidth={3.5} strokeLinecap="round" opacity={0.7} />
                        <path d="M 4 8 Q 14 2, 24 4" fill="none" stroke={T.color.gold} strokeWidth={3.5} strokeLinecap="round" opacity={0.7} />
                      </svg>
                      <span>{t("legendBothParents")}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <svg width="24" height="12" viewBox="0 0 24 12">
                        <path d="M 0 6 Q 4 2, 8 6 Q 12 10, 16 6 Q 20 2, 24 6" fill="none" stroke="#D4838A" strokeWidth={1.5} strokeLinecap="round" opacity={0.6} />
                      </svg>
                      <span>{t("legendFormerPartner")}</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Desktop: always-expanded legend */
              <div
                style={{
                  position: "absolute",
                  bottom: "1.25rem",
                  left: "1.25rem",
                  borderRadius: "0.75rem",
                  background: "rgba(255,255,255,0.8)",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                  border: `1px solid rgba(238,234,227,0.5)`,
                  boxShadow: "0 0.125rem 0.5rem rgba(44,44,42,0.06)",
                  zIndex: 10,
                  fontFamily: T.font.body,
                  fontSize: "0.6875rem",
                  color: T.color.muted,
                  padding: "0.5rem 0.75rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.375rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <svg width="24" height="12" viewBox="0 0 24 12">
                    <path d="M 0 6 Q 12 0, 24 6" fill="none" stroke={T.color.walnut} strokeWidth={2} strokeLinecap="round" opacity={0.5} />
                  </svg>
                  <span>{t("legendParentChild")}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <svg width="24" height="12" viewBox="0 0 24 12">
                    <path d="M 2 2 Q 10 8, 22 6" fill="none" stroke={T.color.terracotta} strokeWidth={3.5} strokeLinecap="round" opacity={0.7} />
                    <path d="M 4 8 Q 14 2, 24 4" fill="none" stroke={T.color.gold} strokeWidth={3.5} strokeLinecap="round" opacity={0.7} />
                  </svg>
                  <span>{t("legendBothParents")}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <svg width="24" height="12" viewBox="0 0 24 12">
                    <path d="M 0 6 Q 4 2, 8 6 Q 12 10, 16 6 Q 20 2, 24 6" fill="none" stroke="#D4838A" strokeWidth={1.5} strokeLinecap="round" opacity={0.6} />
                  </svg>
                  <span>{t("legendFormerPartner")}</span>
                </div>
              </div>
            )}
          </>
        )}

        {/* Keyboard hint — desktop only (no arrow keys on mobile) */}
        {persons.length > 0 && viewMode === "portrait" && !focusedNodeId && !isMobile && (
          <div
            style={{
              position: "absolute",
              bottom: "4rem",
              left: "50%",
              transform: "translateX(-50%)",
              padding: "0.375rem 0.875rem",
              borderRadius: "0.5rem",
              background: `${T.color.charcoal}B0`,
              color: T.color.white,
              fontFamily: T.font.body,
              fontSize: "0.75rem",
              whiteSpace: "nowrap",
              pointerEvents: "none",
              opacity: 0.6,
              zIndex: 5,
            }}
          >
            {t("keyboardHint")}
          </div>
        )}

        {/* Zoom controls — fixed on mobile (always visible), absolute on desktop */}
        {persons.length > 0 && (
          <div
            style={{
              position: isMobile ? "fixed" : "absolute",
              bottom: isMobile
                ? "calc(0.75rem + env(safe-area-inset-bottom, 0rem))"
                : "1.25rem",
              right: isMobile ? undefined : "1.25rem",
              left: isMobile ? "50%" : undefined,
              transform: isMobile ? "translateX(-50%)" : undefined,
              display: "flex",
              flexDirection: isMobile ? "row" : "column",
              gap: isMobile ? "0.5rem" : "0.375rem",
              zIndex: 40,
              pointerEvents: "auto",
            }}
          >
            {/* Home/fit — shown first (left on mobile, top on desktop) */}
            <button
              onClick={() => {
                if (viewMode === "fan") {
                  setFanPan({ x: 0, y: 0 });
                  setFanZoom(1);
                  saveFanViewState({ x: 0, y: 0 }, 1);
                } else {
                  handleFitView();
                }
              }}
              aria-label={t("fitView")}
              style={{
                ...zoomBtnStyle,
                fontSize: isMobile ? "0.8125rem" : "0.875rem",
              }}
              title={t("fitView")}
            >
              {"\u2302"}
            </button>
            <button
              onClick={() => {
                if (viewMode === "fan") {
                  const nz = Math.min(3, fanZoom + 0.2);
                  setFanZoom(nz);
                  saveFanViewState(fanPan, nz);
                } else {
                  const nz = Math.min(3, zoom + 0.2);
                  setZoom(nz);
                  saveViewState(pan, nz);
                }
              }}
              aria-label={t("zoomIn")}
              style={zoomBtnStyle}
            >
              +
            </button>
            <button
              onClick={() => {
                if (viewMode === "fan") {
                  const nz = Math.max(0.15, fanZoom - 0.2);
                  setFanZoom(nz);
                  saveFanViewState(fanPan, nz);
                } else {
                  const nz = Math.max(0.15, zoom - 0.2);
                  setZoom(nz);
                  saveViewState(pan, nz);
                }
              }}
              aria-label={t("zoomOut")}
              style={zoomBtnStyle}
            >
              {"\u2212"}
            </button>
          </div>
        )}
      </div>

      {/* Quick-add popup menu */}
      {quickAddTarget && (
        <>
          <div
            style={{ position: "fixed", top: 0, right: 0, bottom: 0, left: 0, zIndex: 98 }}
            onClick={() => setQuickAddTarget(null)}
          />
          <div
            style={{
              position: "fixed",
              left: Math.max(16, Math.min(quickAddTarget.x, (typeof window !== "undefined" ? window.innerWidth : 800) - 160)),
              top: quickAddTarget.y < 200
                ? Math.min(quickAddTarget.y + 20, (typeof window !== "undefined" ? window.innerHeight : 600) - 180)
                : Math.max(16, quickAddTarget.y),
              transform: quickAddTarget.y < 200 ? "translate(-50%, 0)" : "translate(-50%, -100%)",
              zIndex: 99,
              background: T.color.white,
              borderRadius: "0.75rem",
              border: `1px solid ${T.color.sandstone}40`,
              boxShadow: "0 0.5rem 1.5rem rgba(44,44,42,.15)",
              padding: "0.375rem",
              minWidth: "9rem",
            }}
          >
            {(["parent", "child", "spouse"] as const).map((rel) => (
              <button
                key={rel}
                onClick={() => handleQuickAdd(rel, quickAddTarget.person)}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "0.625rem 0.875rem",
                  borderRadius: "0.5rem",
                  border: "none",
                  background: "transparent",
                  fontFamily: T.font.body,
                  fontSize: "0.8125rem",
                  color: T.color.charcoal,
                  cursor: "pointer",
                  textAlign: "left",
                  minHeight: "2.75rem",
                }}
              >
                {rel === "parent" ? t("quickAddParent") : rel === "child" ? t("quickAddChild") : t("quickAddSpouse")}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Person detail panel */}
      {selectedPerson && (
        <>
          <div
            style={{
              position: "fixed",
              top: 0, right: 0, bottom: 0, left: 0,
              background: "rgba(42,34,24,.3)",
              zIndex: 99,
            }}
            onClick={() => setSelectedPerson(null)}
          />
          <PersonPanel
            key={selectedPerson.id}
            person={selectedPerson}
            allPersons={persons}
            relationships={relationships}
            onClose={() => setSelectedPerson(null)}
            onUpdate={loadData}
            onSelectPerson={setSelectedPerson}
            isMobile={isMobile}
            isCurrentUser={selectedPerson.id === selfPersonId}
            onRecenter={handleRecenter}
            onFocus={handleFocusPerson}
            onViewDescendants={handleViewDescendants}
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
