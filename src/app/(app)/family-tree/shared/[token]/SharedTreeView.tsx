"use client";

import { useState, useRef, useMemo, useCallback } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import type {
  FamilyTreePerson,
  FamilyTreeRelationship,
} from "@/lib/auth/family-tree-actions";
import { hierarchy, tree as d3tree } from "d3-hierarchy";
import {
  buildForest,
  remToPx,
  NODE_W,
  NODE_H,
  SPOUSE_GAP,
  COUPLE_W,
  VERTICAL_GAP,
  HORIZONTAL_GAP,
} from "../../tree-layout";
import type { TreeNode } from "../../tree-layout";
import { CoupleNode, TreeBranchIcon } from "../../PersonCard";

const MIN_ZOOM = 0.15;
const MAX_ZOOM = 2.5;

export function SharedTreeView({
  ownerName,
  persons,
  relationships,
}: {
  ownerName: string;
  persons: FamilyTreePerson[];
  relationships: FamilyTreeRelationship[];
}) {
  const { t } = useTranslation("familyTree");
  const isMobile = useIsMobile();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [initialFitDone, setInitialFitDone] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<FamilyTreePerson | null>(
    null
  );

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

  const selfPersonId = useMemo(() => {
    const self = persons.find((p) => p.is_self);
    return self?.id;
  }, [persons]);

  const forest = useMemo(
    () => buildForest(persons, relationships, selfPersonId),
    [persons, relationships, selfPersonId]
  );

  const nodeWPx = remToPx(NODE_W);
  const nodeHPx = remToPx(NODE_H);
  const spouseGapPx = remToPx(SPOUSE_GAP);
  const coupleWPx = remToPx(COUPLE_W);
  const vertGapPx = remToPx(VERTICAL_GAP);
  const horizGapPx = remToPx(HORIZONTAL_GAP);

  const treeLayouts = useMemo(() => {
    if (forest.length === 0) return [];
    return forest.map((root) => {
      const h = hierarchy(root, (d) => d.children);
      const layout = d3tree<TreeNode>().nodeSize([
        coupleWPx + horizGapPx,
        nodeHPx + vertGapPx,
      ]);
      return layout(h);
    });
  }, [forest, coupleWPx, nodeHPx, vertGapPx, horizGapPx]);

  const fitToView = useCallback(() => {
    if (treeLayouts.length === 0 || !containerRef.current) return;
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    let offsetX = 0;
    treeLayouts.forEach((layout) => {
      layout.each((node) => {
        const nx = node.x + offsetX;
        const ny = node.y;
        const hw = (node.data.spouse ? coupleWPx : nodeWPx) / 2;
        minX = Math.min(minX, nx - hw);
        maxX = Math.max(maxX, nx + hw);
        minY = Math.min(minY, ny - nodeHPx / 2);
        maxY = Math.max(maxY, ny + nodeHPx / 2);
      });
      offsetX += maxX - minX + horizGapPx * 3;
    });
    const tw = maxX - minX;
    const th = maxY - minY;
    const cw = containerRef.current.clientWidth;
    const ch = containerRef.current.clientHeight;
    const pad = 60;
    const z = Math.min((cw - pad * 2) / tw, (ch - pad * 2) / th, 1.2);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    setZoom(z);
    setPan({ x: cw / 2 - cx * z, y: ch / 2 - cy * z });
  }, [treeLayouts, coupleWPx, nodeWPx, nodeHPx, horizGapPx]);

  /* Auto-fit on first render */
  if (!initialFitDone && treeLayouts.length > 0 && containerRef.current) {
    setInitialFitDone(true);
    requestAnimationFrame(fitToView);
  }

  /* ── Mouse handlers ── */
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
    setPan({
      x: dragRef.current.startPanX + (e.clientX - dragRef.current.startX),
      y: dragRef.current.startPanY + (e.clientY - dragRef.current.startY),
    });
  };
  const handleMouseUp = () => {
    dragRef.current = null;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    const newZ = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * factor));
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    setPan({
      x: mx - ((mx - pan.x) * newZ) / zoom,
      y: my - ((my - pan.y) * newZ) / zoom,
    });
    setZoom(newZ);
  };

  /* ── Touch handlers ── */
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const t0 = e.touches[0];
      touchRef.current = {
        startDist: 0,
        startZoom: zoom,
        startMidX: 0,
        startMidY: 0,
        startPanX: pan.x,
        startPanY: pan.y,
        isSingleFinger: true,
        startX: t0.clientX,
        startY: t0.clientY,
        moved: false,
      };
    } else if (e.touches.length === 2) {
      const [t0, t1] = [e.touches[0], e.touches[1]];
      const dist = Math.hypot(
        t1.clientX - t0.clientX,
        t1.clientY - t0.clientY
      );
      touchRef.current = {
        startDist: dist,
        startZoom: zoom,
        startMidX: (t0.clientX + t1.clientX) / 2,
        startMidY: (t0.clientY + t1.clientY) / 2,
        startPanX: pan.x,
        startPanY: pan.y,
        isSingleFinger: false,
        startX: 0,
        startY: 0,
        moved: false,
      };
    }
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchRef.current) return;
    if (touchRef.current.isSingleFinger && e.touches.length === 1) {
      const t0 = e.touches[0];
      const dx = t0.clientX - touchRef.current.startX;
      const dy = t0.clientY - touchRef.current.startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) touchRef.current.moved = true;
      setPan({
        x: touchRef.current.startPanX + dx,
        y: touchRef.current.startPanY + dy,
      });
    } else if (!touchRef.current.isSingleFinger && e.touches.length === 2) {
      const [t0, t1] = [e.touches[0], e.touches[1]];
      const dist = Math.hypot(
        t1.clientX - t0.clientX,
        t1.clientY - t0.clientY
      );
      const newZ = Math.max(
        MIN_ZOOM,
        Math.min(
          MAX_ZOOM,
          touchRef.current.startZoom * (dist / touchRef.current.startDist)
        )
      );
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const midX = (t0.clientX + t1.clientX) / 2;
        const midY = (t0.clientY + t1.clientY) / 2;
        const mx = midX - rect.left;
        const my = midY - rect.top;
        setPan({
          x:
            mx -
            ((mx - touchRef.current.startPanX) * newZ) /
              touchRef.current.startZoom,
          y:
            my -
            ((my - touchRef.current.startPanY) * newZ) /
              touchRef.current.startZoom,
        });
      }
      setZoom(newZ);
    }
  };
  const handleTouchEnd = () => {
    touchRef.current = null;
  };

  const handleSelectPerson = (p: FamilyTreePerson) => {
    setSelectedPerson(p);
  };

  /* ── Render SVG tree ── */
  const renderTree = () => {
    if (treeLayouts.length === 0) return null;
    const links: React.ReactNode[] = [];
    const nodes: React.ReactNode[] = [];
    let offsetX = 0;

    treeLayouts.forEach((layout, treeIdx) => {
      let treeMinX = Infinity,
        treeMaxX = -Infinity;
      layout.each((n) => {
        const hw = (n.data.spouse ? coupleWPx : nodeWPx) / 2;
        treeMinX = Math.min(treeMinX, n.x - hw);
        treeMaxX = Math.max(treeMaxX, n.x + hw);
      });

      layout.each((node) => {
        const nx = node.x + offsetX;
        const ny = node.y;
        nodes.push(
          <CoupleNode
            key={`couple-${treeIdx}-${node.data.id}`}
            x={nx}
            y={ny}
            node={node.data}
            onSelect={handleSelectPerson}
            nodeWPx={nodeWPx}
            nodeHPx={nodeHPx}
            spouseGapPx={spouseGapPx}
          />
        );

        if (node.parent) {
          const px = node.parent.x + offsetX;
          const py = node.parent.y;
          const midY = py + nodeHPx / 2 + (ny - py - nodeHPx) / 2;
          links.push(
            <path
              key={`link-${treeIdx}-${node.data.id}`}
              d={`M ${px} ${py + nodeHPx / 2} L ${px} ${midY} L ${nx} ${midY} L ${nx} ${ny - nodeHPx / 2}`}
              fill="none"
              stroke={T.color.sandstone}
              strokeWidth={1.5}
              opacity={0.5}
            />
          );
        }
      });
      offsetX += treeMaxX - treeMinX + horizGapPx * 3;
    });

    return (
      <>
        {links}
        {nodes}
      </>
    );
  };

  const lifespan = (p: FamilyTreePerson) => {
    const y = (d: string | null) => d?.match(/^[~<>]?(\d{4})/)?.[1] || "";
    const b = y(p.birth_date);
    const d = y(p.death_date);
    if (!b && !d) return "";
    return `${b || "?"}\u2013${d || ""}`;
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: T.color.linen,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: isMobile ? "0.75rem 1rem" : "1rem 1.5rem",
          background: `${T.color.white}F0`,
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: `1px solid ${T.color.sandstone}30`,
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          zIndex: 10,
        }}
      >
        <TreeBranchIcon size={24} color={T.color.terracotta} />
        <div>
          <h1
            style={{
              fontFamily: T.font.display,
              fontSize: isMobile ? "1rem" : "1.25rem",
              color: T.color.charcoal,
              margin: 0,
              fontWeight: 600,
            }}
          >
            {t("sharedTreeTitle")}
          </h1>
          <p
            style={{
              fontFamily: T.font.body,
              fontSize: "0.75rem",
              color: T.color.muted,
              margin: 0,
            }}
          >
            {t("sharedTreeBy", { name: ownerName })}
          </p>
        </div>
        <div style={{ flex: 1 }} />
        <button
          onClick={fitToView}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "0.5rem",
            border: `1px solid ${T.color.sandstone}40`,
            background: T.color.white,
            fontFamily: T.font.body,
            fontSize: "0.8125rem",
            color: T.color.walnut,
            cursor: "pointer",
          }}
        >
          {t("fitView")}
        </button>
      </div>

      {/* Tree canvas */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflow: "hidden",
          position: "relative",
          cursor: "grab",
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {persons.length === 0 ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              fontFamily: T.font.body,
              color: T.color.muted,
            }}
          >
            This tree is empty.
          </div>
        ) : (
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            style={{ display: "block" }}
          >
            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {renderTree()}
            </g>
          </svg>
        )}
      </div>

      {/* Read-only person info panel */}
      {selectedPerson && (
        <>
          <div
            onClick={() => setSelectedPerson(null)}
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              background: "rgba(0,0,0,0.2)",
              zIndex: 50,
            }}
          />
          <div
            style={{
              position: "fixed",
              top: isMobile ? "auto" : "50%",
              bottom: isMobile ? 0 : "auto",
              left: isMobile ? 0 : "50%",
              right: isMobile ? 0 : "auto",
              transform: isMobile ? undefined : "translate(-50%, -50%)",
              background: T.color.white,
              borderRadius: isMobile ? "1rem 1rem 0 0" : "1rem",
              padding: "1.5rem",
              zIndex: 51,
              minWidth: isMobile ? undefined : "20rem",
              maxWidth: isMobile ? undefined : "24rem",
              boxShadow: "0 -0.5rem 2rem rgba(44,44,42,.15)",
              fontFamily: T.font.body,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "1rem",
              }}
            >
              <div>
                <h3
                  style={{
                    fontFamily: T.font.display,
                    fontSize: "1.25rem",
                    color: T.color.charcoal,
                    margin: 0,
                    fontWeight: 600,
                  }}
                >
                  {selectedPerson.first_name}
                  {selectedPerson.last_name
                    ? ` ${selectedPerson.last_name}`
                    : ""}
                </h3>
                {lifespan(selectedPerson) && (
                  <p
                    style={{
                      color: T.color.muted,
                      fontSize: "0.875rem",
                      margin: "0.25rem 0 0",
                    }}
                  >
                    {lifespan(selectedPerson)}
                  </p>
                )}
              </div>
              <button
                onClick={() => setSelectedPerson(null)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "0.25rem",
                  fontSize: "1.25rem",
                  color: T.color.muted,
                  lineHeight: 1,
                }}
                aria-label={t("close")}
              >
                x
              </button>
            </div>
            {selectedPerson.birth_place && (
              <p
                style={{
                  fontSize: "0.8125rem",
                  color: T.color.walnut,
                  margin: "0.25rem 0",
                }}
              >
                {t("born")}: {selectedPerson.birth_place}
              </p>
            )}
            {selectedPerson.death_place && (
              <p
                style={{
                  fontSize: "0.8125rem",
                  color: T.color.walnut,
                  margin: "0.25rem 0",
                }}
              >
                {t("died")}: {selectedPerson.death_place}
              </p>
            )}
            {selectedPerson.notes && (
              <p
                style={{
                  fontSize: "0.8125rem",
                  color: T.color.muted,
                  margin: "0.75rem 0 0",
                  padding: "0.75rem",
                  background: T.color.cream,
                  borderRadius: "0.5rem",
                  whiteSpace: "pre-wrap",
                }}
              >
                {selectedPerson.notes}
              </p>
            )}

            {/* Relationships in detail panel */}
            {(() => {
              const rels = relationships.filter(
                (r) =>
                  r.person_id === selectedPerson.id ||
                  r.related_person_id === selectedPerson.id
              );
              if (!rels.length) return null;
              return (
                <div style={{ marginTop: "1rem" }}>
                  <h4
                    style={{
                      fontFamily: T.font.display,
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      color: T.color.walnut,
                      margin: "0 0 0.375rem",
                    }}
                  >
                    {t("relationships")}
                  </h4>
                  {rels.map((r) => {
                    const otherId =
                      r.person_id === selectedPerson.id
                        ? r.related_person_id
                        : r.person_id;
                    const other = persons.find((p) => p.id === otherId);
                    if (!other) return null;
                    return (
                      <div
                        key={r.id}
                        style={{
                          padding: "0.25rem 0",
                          fontSize: "0.8125rem",
                          color: T.color.charcoal,
                          borderBottom: `1px solid ${T.color.cream}`,
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>
                          {other.first_name}
                          {other.last_name ? ` ${other.last_name}` : ""}
                        </span>
                        <span
                          style={{
                            color: T.color.muted,
                            marginLeft: "0.375rem",
                            fontSize: "0.75rem",
                          }}
                        >
                          ({r.relationship_type})
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </>
      )}
    </div>
  );
}
