import type {
  FamilyTreePerson,
  FamilyTreeRelationship,
} from "@/lib/auth/family-tree-actions";

/* ──────────────────────────────────── Tree types ── */

export interface TreeNode {
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

/* ──────────────────────────────────── Layout constants ── */

export const NODE_W = 11.25; // rem -- single card width
export const NODE_H = 7; // rem -- card height (taller for two-line names)
export const SPOUSE_GAP = 0.625; // rem -- gap between spouse cards
export const COUPLE_W = NODE_W * 2 + SPOUSE_GAP; // total couple width
export const VERTICAL_GAP = 6; // rem
export const HORIZONTAL_GAP = 2.5; // rem

/* ──────────────────────────────────── Helpers ── */

/** Convert rem to px using current root font size */
export function remToPx(rem: number): number {
  if (typeof document === "undefined") return rem * 16;
  return rem * parseFloat(getComputedStyle(document.documentElement).fontSize);
}

/**
 * Build a forest of tree nodes from persons + relationships.
 * Current spouses are attached to their partner node (rendered as CoupleNode).
 * Ex-spouses are NOT merged — they appear as separate nodes.
 * Multiple children from different relationships are all attached correctly.
 * Each disconnected component becomes its own tree placed side-by-side.
 */
export function buildForest(
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
    } else if (r.relationship_type === "stepparent") {
      // person_id is the stepparent, related_person_id is the child
      const kids = parentToChild.get(r.person_id) ?? new Set<string>();
      kids.add(r.related_person_id);
      parentToChild.set(r.person_id, kids);
      const parents = childToParent.get(r.related_person_id) ?? new Set<string>();
      parents.add(r.person_id);
      childToParent.set(r.related_person_id, parents);
    } else if (r.relationship_type === "stepchild") {
      // person_id has a stepchild = related_person_id is the parent
      const kids = parentToChild.get(r.related_person_id) ?? new Set<string>();
      kids.add(r.person_id);
      parentToChild.set(r.related_person_id, kids);
      const parents = childToParent.get(r.person_id) ?? new Set<string>();
      parents.add(r.related_person_id);
      childToParent.set(r.person_id, parents);
    }
  }

  // Handle sibling / half-sibling relationships by sharing parents
  const siblingMap = new Map<string, Set<string>>();
  for (const r of rels) {
    if (r.relationship_type === "sibling" || r.relationship_type === "half-sibling") {
      const s1 = siblingMap.get(r.person_id) ?? new Set<string>();
      s1.add(r.related_person_id);
      siblingMap.set(r.person_id, s1);
      const s2 = siblingMap.get(r.related_person_id) ?? new Set<string>();
      s2.add(r.person_id);
      siblingMap.set(r.related_person_id, s2);
    }
  }

  // Propagate parent relationships to siblings
  // If sibling A has parents but sibling B doesn't, copy A's parents to B
  for (const [personId, siblings] of siblingMap) {
    const myParents = childToParent.get(personId);
    if (myParents && myParents.size > 0) {
      for (const sibId of siblings) {
        if (!childToParent.has(sibId) || childToParent.get(sibId)!.size === 0) {
          const sibParents = childToParent.get(sibId) ?? new Set<string>();
          for (const pid of myParents) {
            sibParents.add(pid);
            const pChildren = parentToChild.get(pid) ?? new Set<string>();
            pChildren.add(sibId);
            parentToChild.set(pid, pChildren);
          }
          childToParent.set(sibId, sibParents);
        }
      }
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
          visited.add(sid); // prevent duplicate rendering
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

  // Sort roots so that persons with the deepest descendant chains are processed
  // first. This prevents a spouse (who is also a root) from consuming shared
  // descendants before the actual ancestor root is built, which would collapse
  // generations (e.g. Guillaume and Albert ending up on the same level).
  function maxDescendantDepth(personId: string, seen: Set<string>): number {
    if (seen.has(personId)) return 0;
    seen.add(personId);
    let max = 0;
    // Direct children
    for (const cid of parentToChild.get(personId) ?? new Set<string>()) {
      max = Math.max(max, 1 + maxDescendantDepth(cid, new Set(seen)));
    }
    // Also count spouse's children (since spouse will be consumed)
    for (const sid of currentSpouseMap.get(personId) ?? new Set<string>()) {
      for (const cid of parentToChild.get(sid) ?? new Set<string>()) {
        max = Math.max(max, 1 + maxDescendantDepth(cid, new Set(seen)));
      }
    }
    return max;
  }

  roots.sort((a, b) => maxDescendantDepth(b.id, new Set()) - maxDescendantDepth(a.id, new Set()));

  const forest: TreeNode[] = [];

  for (const r of roots) {
    if (visited.has(r.id) || consumedAsSpouse.has(r.id)) continue;
    const node = buildNode(r.id);
    if (node) forest.push(node);
  }

  // Add any orphans not visited (skip consumed spouses)
  for (const p of persons) {
    if (!visited.has(p.id) && !consumedAsSpouse.has(p.id)) {
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

/**
 * Build a descendancy tree from a single root person downward.
 * Spouses are attached (same as buildForest), but the tree only
 * includes descendants — no ancestors or siblings of the root.
 */
export function buildDescendancyTree(
  rootPersonId: string,
  persons: FamilyTreePerson[],
  rels: FamilyTreeRelationship[],
  selfId?: string
): TreeNode[] {
  const parentToChild = new Map<string, Set<string>>();
  const currentSpouseMap = new Map<string, Set<string>>();
  const exSpouseMap = new Map<string, Set<string>>();

  for (const r of rels) {
    if (r.relationship_type === "parent") {
      const kids = parentToChild.get(r.person_id) ?? new Set<string>();
      kids.add(r.related_person_id);
      parentToChild.set(r.person_id, kids);
    } else if (r.relationship_type === "child") {
      const kids = parentToChild.get(r.related_person_id) ?? new Set<string>();
      kids.add(r.person_id);
      parentToChild.set(r.related_person_id, kids);
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
    } else if (r.relationship_type === "stepparent") {
      const kids = parentToChild.get(r.person_id) ?? new Set<string>();
      kids.add(r.related_person_id);
      parentToChild.set(r.person_id, kids);
    } else if (r.relationship_type === "stepchild") {
      const kids = parentToChild.get(r.related_person_id) ?? new Set<string>();
      kids.add(r.person_id);
      parentToChild.set(r.related_person_id, kids);
    }
  }

  const visited = new Set<string>();
  const consumedAsSpouse = new Set<string>();

  function buildNode(personId: string): TreeNode | null {
    if (visited.has(personId)) return null;
    visited.add(personId);
    const p = persons.find((x) => x.id === personId);
    if (!p) return null;

    // Attach first current spouse
    let spouse: FamilyTreePerson | undefined;
    const spouseIds = currentSpouseMap.get(personId) ?? new Set<string>();
    for (const sid of spouseIds) {
      if (!visited.has(sid) && !consumedAsSpouse.has(sid)) {
        const sp = persons.find((x) => x.id === sid);
        if (sp) {
          spouse = sp;
          consumedAsSpouse.add(sid);
          visited.add(sid);
          break;
        }
      }
    }

    // Collect ex-spouses
    const exSpouses: FamilyTreePerson[] = [];
    const exIds = exSpouseMap.get(personId) ?? new Set<string>();
    for (const eid of exIds) {
      const ep = persons.find((x) => x.id === eid);
      if (ep) exSpouses.push(ep);
    }

    // Collect children from this person, current spouse, and ex-spouses
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

  const root = buildNode(rootPersonId);
  return root ? [root] : [];
}
