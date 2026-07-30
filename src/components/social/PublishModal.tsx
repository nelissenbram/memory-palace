"use client";

import React, { useState, useTransition, useEffect } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import type { PublishableWing } from "@/lib/social/share-actions";

interface PublishModalProps {
  onClose: () => void;
  onPublished?: () => void;
}

export default function PublishModal({
  onClose,
  onPublished,
}: PublishModalProps) {
  const { t } = useTranslation("social");
  const isMobile = useIsMobile();
  const { containerRef, handleKeyDown } = useFocusTrap(true);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [wings, setWings] = useState<PublishableWing[]>([]);
  const [selectedWings, setSelectedWings] = useState<Set<string>>(new Set());
  const [selectedRooms, setSelectedRooms] = useState<Set<string>>(new Set());

  // Flush settings then load content
  useEffect(() => {
    (async () => {
      try {
        const { flushSettingsToServer } = await import("@/lib/stores/settingsSync");
        await flushSettingsToServer();
      } catch {}
      const { getMyPublishableContent } = await import("@/lib/social/share-actions");
      const content = await getMyPublishableContent();
      setWings(content);
      const preWings = new Set<string>();
      const preRooms = new Set<string>();
      for (const w of content) {
        if (w.published) preWings.add(w.id);
        for (const r of w.rooms) {
          if (r.published || w.published) preRooms.add(r.id);
        }
      }
      setSelectedWings(preWings);
      setSelectedRooms(preRooms);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape" && !isPending) onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isPending, onClose]);

  const toggleWing = (wingId: string) => {
    if (error) setError(null);
    const next = new Set(selectedWings);
    const wing = wings.find((w) => w.id === wingId);
    if (!wing) return;
    if (next.has(wingId)) {
      next.delete(wingId);
      const nextRooms = new Set(selectedRooms);
      for (const r of wing.rooms) nextRooms.delete(r.id);
      setSelectedRooms(nextRooms);
    } else {
      next.add(wingId);
      const nextRooms = new Set(selectedRooms);
      for (const r of wing.rooms) nextRooms.add(r.id);
      setSelectedRooms(nextRooms);
    }
    setSelectedWings(next);
  };

  const toggleRoom = (roomId: string, wingId: string) => {
    if (error) setError(null);
    const next = new Set(selectedRooms);
    if (next.has(roomId)) {
      next.delete(roomId);
      const wing = wings.find((w) => w.id === wingId);
      if (wing && wing.rooms.every((r) => !next.has(r.id))) {
        const nw = new Set(selectedWings);
        nw.delete(wingId);
        setSelectedWings(nw);
      }
    } else {
      next.add(roomId);
      if (!selectedWings.has(wingId)) {
        setSelectedWings(new Set(selectedWings).add(wingId));
      }
    }
    setSelectedRooms(next);
  };

  const selectAll = () => {
    setSelectedWings(new Set(wings.map((w) => w.id)));
    setSelectedRooms(new Set(wings.flatMap((w) => w.rooms.map((r) => r.id))));
  };

  const deselectAll = () => {
    setSelectedWings(new Set());
    setSelectedRooms(new Set());
  };

  const hasSelection = selectedRooms.size > 0;

  const handlePublish = () => {
    startTransition(async () => {
      setError(null);
      const { publishWing, unpublishWing, publishRoom, unpublishRoom } = await import("@/lib/social/share-actions");
      const wingOps: Promise<{ ok: boolean; error?: string }>[] = [];
      const roomOps: (() => Promise<{ ok: boolean; error?: string }>)[] = [];
      for (const w of wings) {
        if (selectedWings.has(w.id) && !w.published) {
          wingOps.push(publishWing({ wingId: w.id }));
        } else if (!selectedWings.has(w.id) && w.published) {
          wingOps.push(unpublishWing(w.id));
        }
        for (const r of w.rooms) {
          if (selectedRooms.has(r.id) && !r.published) {
            roomOps.push(() => publishRoom({ roomId: r.id, wingId: w.id }));
          } else if (!selectedRooms.has(r.id) && r.published) {
            roomOps.push(() => unpublishRoom(r.id));
          }
        }
      }
      // The current selection already matches the server state — nothing to do.
      // Surface this instead of silently flashing "success" so the user isn't
      // left wondering whether their intended change was applied.
      if (wingOps.length === 0 && roomOps.length === 0) {
        setError(t("publishNoChanges"));
        return;
      }
      try {
        // Publish/unpublish WINGS first so a never-published wing's DB row exists
        // before its rooms try to attach to it (rooms.wing_id FK). Running them in
        // one parallel batch raced and left rooms in never-published wings unattached.
        const wingResults = await Promise.all(wingOps);
        const roomResults = await Promise.all(roomOps.map((op) => op()));
        if ([...wingResults, ...roomResults].some((r) => r && r.ok === false)) {
          setError(t("publishFailed"));
          return;
        }
      } catch {
        setError(t("publishFailed"));
        return;
      }
      setDone(true);
      setTimeout(() => { onPublished?.(); onClose(); }, 1200);
    });
  };

  return (
    <div
      role="dialog" aria-modal="true" aria-labelledby="publish-title"
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(42,34,24,.5)", backdropFilter: "blur(0.25rem)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget && !isPending) onClose(); }}
    >
      <div ref={containerRef} onKeyDown={handleKeyDown} className="mp-scroll" style={{
        width: "min(32rem, 92vw)", maxHeight: "90dvh", overflow: "auto",
        background: T.color.cream, borderRadius: "1rem", padding: isMobile ? "1.25rem" : "1.75rem",
        paddingBottom: "max(1.75rem, env(safe-area-inset-bottom, 0px))",
        boxShadow: "0 0.5rem 2rem rgba(64,59,54,0.18)",
      }}>
        <h2 id="publish-title" style={{
          fontFamily: T.font.display, fontSize: "1.375rem", fontWeight: 600,
          color: T.color.inkSoft, margin: "0 0 0.25rem",
        }}>
          {t("publishSelectContent")}
        </h2>
        <p style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.muted, margin: "0 0 1.25rem" }}>
          {t("publishSelectHint")}
        </p>

        {done ? (
          <div style={{ textAlign: "center", padding: "2rem 0" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>&#10003;</div>
            <p style={{ fontFamily: T.font.body, fontSize: "1rem", color: T.color.inkSoft }}>
              {t("publishSuccess")}
            </p>
          </div>
        ) : loading ? (
          <div style={{ textAlign: "center", padding: "2.5rem 1rem" }}>
            <div style={{
              width: "2.5rem", height: "2.5rem", margin: "0 auto 1rem",
              border: `3px solid ${T.color.sandstone}40`,
              borderTopColor: T.color.gold,
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }} />
            <p style={{ fontFamily: T.font.body, fontSize: "0.875rem", color: T.color.muted, margin: 0 }}>
              {t("loadingContent")}
            </p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } } @media (prefers-reduced-motion: reduce) { .mp-scroll [style*="animation"] { animation: none !important; } }`}</style>
          </div>
        ) : (
          <>
            {/* Select/Deselect all */}
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
              <button
                onClick={selectAll}
                style={{
                  fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 500,
                  padding: "0.375rem 0.75rem", borderRadius: "1rem",
                  border: `1px solid ${T.color.sandstone}`, background: "transparent",
                  color: T.color.walnut, cursor: "pointer",
                }}
              >
                {t("selectAll")}
              </button>
              <button
                onClick={deselectAll}
                style={{
                  fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 500,
                  padding: "0.375rem 0.75rem", borderRadius: "1rem",
                  border: `1px solid ${T.color.sandstone}`, background: "transparent",
                  color: T.color.walnut, cursor: "pointer",
                }}
              >
                {t("deselectAll")}
              </button>
            </div>

            {/* Wing + Room tree */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {wings.map((wing) => (
                <div
                  key={wing.id}
                  style={{
                    border: `1px solid ${selectedWings.has(wing.id) ? T.color.ember : T.color.sandstone}`,
                    borderRadius: "0.75rem",
                    overflow: "hidden",
                    background: selectedWings.has(wing.id) ? `${T.color.ember}0D` : "transparent",
                    transition: "border-color 0.15s ease, background 0.15s ease",
                  }}
                >
                  {/* Wing row */}
                  <label style={{
                    display: "flex", alignItems: "center", gap: "0.625rem",
                    padding: "0.75rem 1rem", cursor: "pointer",
                    borderBottom: wing.rooms.length > 0 ? `1px solid ${T.color.lineFaint}` : "none",
                  }}>
                    <input
                      type="checkbox"
                      checked={selectedWings.has(wing.id)}
                      onChange={() => toggleWing(wing.id)}
                      style={{ accentColor: T.color.ember, width: "1rem", height: "1rem", flexShrink: 0 }}
                    />
                    <span style={{
                      fontFamily: T.font.display, fontSize: "0.9375rem", fontWeight: 600,
                      color: T.color.inkSoft, flex: 1,
                    }}>
                      {wing.name}
                    </span>
                    <span style={{
                      fontFamily: T.font.body, fontSize: "0.6875rem",
                      color: wing.published ? T.color.goldDark : T.color.muted,
                      padding: "0.125rem 0.5rem", borderRadius: "1rem",
                      background: wing.published ? `${T.color.gold}15` : `${T.color.sandstone}30`,
                    }}>
                      {wing.published ? t("wingPublished") : t("wingUnpublished")}
                    </span>
                  </label>

                  {/* Room rows */}
                  {wing.rooms.length > 0 && (
                    <div style={{ padding: "0.375rem 0.5rem 0.5rem 2.25rem" }}>
                      {wing.rooms.map((room) => (
                        <label
                          key={room.id}
                          style={{
                            display: "flex", alignItems: "center", gap: "0.5rem",
                            padding: "0.375rem 0.5rem", cursor: "pointer",
                            borderRadius: "0.375rem",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedRooms.has(room.id)}
                            onChange={() => toggleRoom(room.id, wing.id)}
                            style={{ accentColor: T.color.ember, width: "0.875rem", height: "0.875rem", flexShrink: 0 }}
                          />
                          <span style={{ fontSize: "1rem" }}>{room.icon}</span>
                          <span style={{
                            fontFamily: T.font.body, fontSize: "0.8125rem",
                            color: T.color.inkSoft,
                          }}>
                            {room.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {error && <p style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.error, margin: "1rem 0 0" }}>{error}</p>}

            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "1.5rem" }}>
              <button
                onClick={onClose} disabled={isPending}
                style={{
                  fontFamily: T.font.body, fontSize: "0.875rem", padding: "0.625rem 1.25rem",
                  borderRadius: "0.625rem", border: `1px solid ${T.color.sandstone}`,
                  background: "transparent", color: T.color.walnut, cursor: "pointer", minHeight: T.touch,
                }}
              >
                {t("cancel")}
              </button>
              <button
                onClick={handlePublish} disabled={isPending || !hasSelection}
                style={{
                  fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: 600,
                  padding: "0.625rem 1.5rem", borderRadius: "0.625rem", border: "none",
                  background: hasSelection
                    ? `linear-gradient(135deg, ${T.color.ember}, ${T.color.rustDeep})`
                    : T.color.sandstone,
                  color: T.color.cream, cursor: isPending ? "wait" : hasSelection ? "pointer" : "not-allowed",
                  opacity: isPending ? 0.6 : 1, minHeight: T.touch,
                }}
              >
                {isPending ? t("publishing") : t("publishSelected")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
