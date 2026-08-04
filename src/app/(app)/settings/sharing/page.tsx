"use client";

import { useState, useEffect, useCallback, useMemo, useRef, useTransition } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useAccessibility } from "@/components/providers/AccessibilityProvider";
import { useIsMobile, useIsCompact } from "@/lib/hooks/useIsMobile";
import { EMBER, EMBER_GLYPH, HAIRLINE, CREAM, INK, MUTED, SAGE, wingAccent } from "@/lib/libraryTokens";
import { WingIcon, RoomIcon, GenericRoomIcon, resolveRoomIconId } from "@/components/ui/WingRoomIcons";
import type { PublishableWing } from "@/lib/social/share-actions";
import ReferralSection from "@/components/ui/ReferralSection";
import { SettingsPageHeader, SectionOverline } from "../_SettingsChrome";

/* Local, well-named accent constants (kept local this pass — shared token files
 * are off-limits here to avoid parallel-edit races). These name the literal
 * hexes that previously recurred inline so the accent surface reads as one
 * vocabulary instead of scattered magic strings. */
const EMBER_GRADIENT = "linear-gradient(135deg, #B85C38, #9A4F2A)"; // ember → terracotta CTA
const TERRACOTTA_WASH = "#FBF2EC"; // pre-mixed selected-tile wash
const CONTROL_BG = "#FFFFFF"; // pill / input surface
const DISABLED_BG = "#EEE9DF"; // pre-mixed sandstone (disabled CTA)
const DANGER = "#C05050"; // error toast / destructive accent

/* Shared loading spinner — one ember-topped ring for every sharing section,
 * with a reduced-motion guard, so the three cards never diverge in treatment. */
function SharingSpinner({ scale, label }: { scale: number; label: string }) {
  return (
    <div style={{ textAlign: "center", padding: "2.5rem 1rem" }}>
      <div className="sharing-spin" style={{
        width: "2.5rem", height: "2.5rem", margin: "0 auto 1rem",
        border: `0.1875rem solid ${HAIRLINE}`,
        borderTopColor: EMBER,
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }} />
      <p style={{ fontFamily: T.font.body, fontSize: `${0.8125 * scale}rem`, color: MUTED, margin: 0 }}>
        {label}
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @media (prefers-reduced-motion: reduce){ .sharing-spin{ animation: none; } }`}</style>
    </div>
  );
}

export default function SharingPage() {
  const { t } = useTranslation("social");
  const { t: ts } = useTranslation("settings");
  const { scale } = useAccessibility();
  const isMobile = useIsMobile();

  // i18n fallback helper — new keys work before the locale files land.
  const tf = (key: string, fallback: string) => {
    const v = ts(key);
    return v === key ? fallback : v;
  };

  const [loading, setLoading] = useState(true);
  const [wings, setWings] = useState<PublishableWing[]>([]);
  const [selectedWings, setSelectedWings] = useState<Set<string>>(new Set());
  const [selectedRooms, setSelectedRooms] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  // Palace description (profiles.bio) — editable here so this page's publish
  // flow and the explore/profile cards stay in sync (mirrors PublishModal).
  const [bio, setBio] = useState("");
  const [bioSavedFlash, setBioSavedFlash] = useState(false);
  const lastSavedBio = useRef<string>("");
  const bioFlashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Prefill description with the user's current bio on page load.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        const { data } = await supabase
          .from("profiles")
          .select("bio")
          .eq("id", user.id)
          .single();
        if (!cancelled && data?.bio) {
          setBio((data.bio as string).slice(0, 150));
          lastSavedBio.current = (data.bio as string).slice(0, 150);
        }
      } catch {
        // Non-fatal — description simply starts empty
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => () => {
    if (bioFlashTimer.current) clearTimeout(bioFlashTimer.current);
  }, []);

  /** Persist bio (RLS-scoped to own profile row). Returns true on success/no-op. */
  const saveBio = async (): Promise<boolean> => {
    const value = bio.slice(0, 150).trim();
    if (value === lastSavedBio.current) return true;
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      const { error: dbError } = await supabase
        .from("profiles")
        .update({ bio: value || null })
        .eq("id", user.id);
      if (dbError) return false;
      lastSavedBio.current = value;
      return true;
    } catch {
      return false;
    }
  };

  /** Save-on-blur so the description persists even without republishing. */
  const handleBioBlur = async () => {
    if (bio.slice(0, 150).trim() === lastSavedBio.current) return;
    const ok = await saveBio();
    if (ok) {
      setBioSavedFlash(true);
      if (bioFlashTimer.current) clearTimeout(bioFlashTimer.current);
      bioFlashTimer.current = setTimeout(() => setBioSavedFlash(false), 2000);
    }
  };

  // Load content on mount (flush settings first so room names are fresh)
  useEffect(() => {
    (async () => {
      try {
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
      } catch {
        showToast(ts("loadError"), "error");
      } finally {
        setLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleWing = (wingId: string) => {
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

  const handleSave = () => {
    startTransition(async () => {
      // Persist the palace description alongside publishing (blur usually
      // already saved it; this covers Enter-key saves and races) — mirrors
      // PublishModal.handlePublish.
      const bioChanged = bio.slice(0, 150).trim() !== lastSavedBio.current;
      if (bioChanged) {
        const bioOk = await saveBio();
        if (!bioOk) {
          showToast(t("publishFailed"), "error");
          return;
        }
      }
      const { publishWing, unpublishWing, publishRoom, unpublishRoom } = await import("@/lib/social/share-actions");
      // Track each op with its target so we only mark what actually succeeded.
      type OpResult = { ok?: boolean; error?: string } | unknown;
      const wingOps: { id: string; run: Promise<OpResult> }[] = [];
      const roomOps: { id: string; run: Promise<OpResult> }[] = [];
      for (const w of wings) {
        if (selectedWings.has(w.id) && !w.published) {
          wingOps.push({ id: w.id, run: publishWing({ wingId: w.id }) });
        } else if (!selectedWings.has(w.id) && w.published) {
          wingOps.push({ id: w.id, run: unpublishWing(w.id) });
        }
        for (const r of w.rooms) {
          if (selectedRooms.has(r.id) && !r.published) {
            roomOps.push({ id: r.id, run: publishRoom({ roomId: r.id, wingId: w.id }) });
          } else if (!selectedRooms.has(r.id) && r.published) {
            roomOps.push({ id: r.id, run: unpublishRoom(r.id) });
          }
        }
      }

      const isOk = (r: OpResult): boolean => {
        if (r && typeof r === "object") {
          const rec = r as { ok?: boolean; error?: string };
          if (rec.error) return false;
          if (rec.ok === false) return false;
        }
        return true;
      };

      const [wingSettled, roomSettled] = await Promise.all([
        Promise.all(wingOps.map(async (o) => ({ id: o.id, ok: isOk(await o.run.catch(() => ({ error: "failed" })) ) }))),
        Promise.all(roomOps.map(async (o) => ({ id: o.id, ok: isOk(await o.run.catch(() => ({ error: "failed" })) ) }))),
      ]);

      const failedWings = new Set(wingSettled.filter((r) => !r.ok).map((r) => r.id));
      const failedRooms = new Set(roomSettled.filter((r) => !r.ok).map((r) => r.id));
      const anyFailed = failedWings.size > 0 || failedRooms.size > 0;

      // Only apply the optimistic published flag for targets that actually succeeded;
      // failed ops keep their previous published state so the UI reflects reality.
      setWings((prev) => prev.map((w) => ({
        ...w,
        published: failedWings.has(w.id) ? w.published : selectedWings.has(w.id),
        rooms: w.rooms.map((r) => ({
          ...r,
          published: failedRooms.has(r.id) ? r.published : selectedRooms.has(r.id),
        })),
      })));

      if (anyFailed) {
        showToast(tf("publishError", "Some changes could not be saved. Please try again."), "error");
      } else {
        showToast(t("publishSuccess"), "success");
      }
    });
  };

  const hasChanges = wings.some((w) => {
    if (w.published !== selectedWings.has(w.id)) return true;
    return w.rooms.some((r) => r.published !== selectedRooms.has(r.id));
  });

  // Lightweight wing summaries (id/name/slug) shared with the Passcode and Family
  // sharing sections. Fetched once here (parent already loads getMyPublishableContent
  // after flushing settings), so the two child sections no longer re-run that heavy
  // server action independently. Memoized on the wing identity list so a save's
  // optimistic `published` flips (which don't touch id/name/slug) don't churn the
  // prop and re-render the children needlessly.
  const wingSummaries = useMemo(
    () => wings.map((w) => ({ id: w.id, name: w.name, slug: w.slug })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [wings.map((w) => `${w.id}:${w.name}:${w.slug}`).join("|")],
  );

  return (
    <>
      {/* Toast */}
      {toast && (
        <div className="sharing-toast" role={toast.type === "success" ? "status" : "alert"} aria-live={toast.type === "success" ? "polite" : "assertive"} style={{
          position: "fixed", top: "1rem", right: "1rem", zIndex: 9999,
          padding: "0.875rem 1.25rem", borderRadius: "0.75rem",
          background: toast.type === "success" ? SAGE : DANGER,
          color: CREAM, fontFamily: T.font.body, fontSize: `${0.9375 * scale}rem`,
          fontWeight: 500, boxShadow: "0 0.5rem 1.5rem rgba(64,59,54,0.14)", // Atrium token: S2
          animation: "fadeIn .2s ease",
        }}>
          {toast.message}
          <style>{`@media (prefers-reduced-motion: reduce){ .sharing-toast{ animation: none; } }`}</style>
        </div>
      )}

      {/* Page header — desktop only */}
      <SettingsPageHeader
        hidden={isMobile}
        icon="sharing"
        title={tf("sharingTitle", "Sharing")}
        subtitle={tf("sharingSubtitle", "Choose who can see your palace — publish wings, share with family, or hand out temporary visiting codes.")}
      />

      {/* Section overline — Published to your public palace */}
      <SectionOverline label={tf("sectionPublished", "Public palace")} />

      {/* Published Content Card */}
      <div style={{
        background: CREAM,
        borderRadius: "1rem",
        border: `0.0625rem solid ${HAIRLINE}`,
        padding: `${1.75 * scale}rem ${2 * scale}rem`,
        boxShadow: "0 0.25rem 1rem rgba(64,59,54,0.07), inset 0 0.0625rem 0 rgba(255,255,255,0.5)", // Atrium token: S1 + top highlight
        marginBottom: "1.5rem",
      }}>
        <div style={{ marginBottom: "1.25rem" }}>
          <h3 style={{
            fontFamily: T.font.display, fontSize: `${1.1875 * scale}rem`, fontWeight: 600, lineHeight: 1.15,
            color: INK, margin: "0 0 0.375rem",
          }}>
            {t("publishManage")}
          </h3>
          <p style={{
            fontFamily: T.font.body, fontSize: `${0.8125 * scale}rem`, color: MUTED,
            margin: 0, lineHeight: 1.4,
          }}>
            {t("publishManageHint")}
          </p>
        </div>

        {/* Palace description — shown on explore directory cards + public profile
            (mirrors PublishModal; sits above the wings/rooms selection) */}
        <div style={{ marginBottom: "1.25rem" }}>
          <label
            htmlFor="mp-sharing-palace-desc"
            style={{
              fontFamily: T.font.body,
              fontSize: `${0.6875 * scale}rem`, /* Atrium overline: the one small-caps voice */
              fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
              color: MUTED, display: "block", marginBottom: "0.375rem",
            }}
          >
            {t("palaceDescLabel")}
          </label>
          <textarea
            id="mp-sharing-palace-desc"
            value={bio}
            maxLength={150}
            rows={2}
            placeholder={t("palaceDescPlaceholder")}
            onChange={(e) => setBio(e.target.value.slice(0, 150))}
            onBlur={handleBioBlur}
            style={{
              width: "100%", boxSizing: "border-box", resize: "vertical",
              minHeight: "3.5rem",
              fontFamily: T.font.body, fontSize: `${Math.max(1, 1 * scale)}rem`, lineHeight: 1.4,
              color: INK,
              background: CREAM,
              border: `0.0625rem solid ${HAIRLINE}`,
              borderRadius: "0.625rem",
              padding: "0.625rem 0.75rem",
            }}
          />
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            gap: "0.5rem", marginTop: "0.25rem",
          }}>
            <span aria-live="polite" style={{
              fontFamily: T.font.body, fontSize: `${0.6875 * scale}rem`, color: T.color.goldDark,
              opacity: bioSavedFlash ? 1 : 0, transition: "opacity 0.2s ease",
            }}>
              {t("palaceDescSaved")}
            </span>
            <span style={{ fontFamily: T.font.body, fontSize: `${0.6875 * scale}rem`, color: MUTED }}>
              {t("palaceDescCounter", { count: String(bio.length) })}
            </span>
          </div>
        </div>

        {loading ? (
          <SharingSpinner scale={scale} label={ts("loadingWings")} />
        ) : wings.length === 0 ? (
          <div style={{
            padding: "1.5rem 1.25rem", borderRadius: "0.75rem",
            background: CREAM, border: "0.0625rem solid #E3D6BC" /* Atrium token: hairline */,
            textAlign: "center",
            fontFamily: T.font.body, fontSize: `${0.9375 * scale}rem`, color: MUTED,
          }}>
            {ts("noWingsYet")}
          </div>
        ) : (
          <>
            {/* Select / Deselect all */}
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
              <button
                onClick={selectAll}
                className="mp-sharing-ghost"
                style={{
                  fontFamily: T.font.body, fontSize: `${0.8125 * scale}rem`, fontWeight: 500,
                  padding: "0.375rem 0.75rem", borderRadius: "2rem", // Atrium token: pill
                  minHeight: "2.75rem",
                  border: "0.0625rem solid #E3D6BC" /* Atrium token: hairline */, background: "transparent",
                  color: MUTED, cursor: "pointer",
                }}
              >
                {t("selectAll")}
              </button>
              <button
                onClick={deselectAll}
                className="mp-sharing-ghost"
                style={{
                  fontFamily: T.font.body, fontSize: `${0.8125 * scale}rem`, fontWeight: 500,
                  padding: "0.375rem 0.75rem", borderRadius: "2rem", // Atrium token: pill
                  minHeight: "2.75rem",
                  border: "0.0625rem solid #E3D6BC" /* Atrium token: hairline */, background: "transparent",
                  color: MUTED, cursor: "pointer",
                }}
              >
                {t("deselectAll")}
              </button>
            </div>

            {/* Wing + Room tree */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              {wings.map((wing) => (
                <div
                  key={wing.id}
                  className="mp-sharing-anim"
                  style={{
                    border: `0.0625rem solid ${selectedWings.has(wing.id) ? EMBER : HAIRLINE}`,
                    borderRadius: "0.75rem",
                    overflow: "hidden",
                    background: selectedWings.has(wing.id) ? TERRACOTTA_WASH : CREAM,
                    transition: "border-color 0.2s ease, background 0.2s ease",
                  }}
                >
                  {/* Wing row */}
                  <label style={{
                    display: "flex", alignItems: "center", gap: "0.625rem",
                    padding: "0.875rem 1rem", cursor: "pointer",
                    minHeight: "2.75rem",
                    borderBottom: wing.rooms.length > 0 ? `0.0625rem solid ${HAIRLINE}` : "none",
                  }}>
                    <input
                      type="checkbox"
                      checked={selectedWings.has(wing.id)}
                      onChange={() => toggleWing(wing.id)}
                      style={{ accentColor: EMBER /* Atrium token: ember */, width: "1rem", height: "1rem", flexShrink: 0 }}
                    />
                    <span style={{
                      fontFamily: T.font.body, fontSize: `${0.9375 * scale}rem`, fontWeight: 500,
                      color: INK, flex: 1,
                    }}>
                      {wing.name}
                    </span>
                    <span style={{
                      fontFamily: T.font.body, fontSize: `${0.6875 * scale}rem`, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", // Atrium: the one small-caps voice
                      color: wing.published ? EMBER_GLYPH /* Atrium token: terracotta glyph */ : MUTED,
                      padding: "0.125rem 0.5rem", borderRadius: "2rem", // Atrium token: pill
                      background: wing.published ? "rgba(154,79,42,0.11)" : "rgba(113,106,94,0.12)",
                    }}>
                      {wing.published ? t("wingPublished") : t("wingUnpublished")}
                    </span>
                  </label>

                  {/* Room rows */}
                  {wing.rooms.length > 0 && (
                    <div style={{ padding: "0.375rem 0.5rem 0.625rem 2.25rem" }}>
                      {wing.rooms.map((room) => (
                        <label
                          key={room.id}
                          style={{
                            display: "flex", alignItems: "center", gap: "0.5rem",
                            padding: "0.375rem 0.5rem", cursor: "pointer",
                            borderRadius: "0.375rem",
                            minHeight: "2.75rem",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedRooms.has(room.id)}
                            onChange={() => toggleRoom(room.id, wing.id)}
                            style={{ accentColor: EMBER /* Atrium token: ember */, width: "0.875rem", height: "0.875rem", flexShrink: 0 }}
                          />
                          {/* room.icon holds a standard id when picked via the SVG
                              picker; room.id is the local room id for never-DB-backed
                              rooms (a uuid once published). Whatever resolves wins;
                              anything else (custom rooms, legacy emoji) renders the
                              GenericRoomIcon door frame — never an emoji. */}
                          <span aria-hidden style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                            {(() => {
                              const resolved = resolveRoomIconId(room.id, room.icon);
                              return resolved ? (
                                <RoomIcon roomId={resolved} wingId={wing.slug} size={16 * scale} color={wingAccent(wing.slug)} />
                              ) : (
                                <GenericRoomIcon size={16 * scale} color={wingAccent(wing.slug)} />
                              );
                            })()}
                          </span>
                          <span style={{
                            fontFamily: T.font.body, fontSize: `${0.8125 * scale}rem`,
                            color: INK,
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

            {/* Save button */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.5rem" }}>
              <button
                onClick={handleSave}
                disabled={isPending || !hasChanges}
                className="mp-sharing-cta"
                style={{
                  fontFamily: T.font.body, fontSize: `${0.9375 * scale}rem`, fontWeight: 600,
                  padding: "0.75rem 1.75rem", borderRadius: "0.75rem", border: "none",
                  minHeight: "2.75rem",
                  background: hasChanges ? EMBER_GRADIENT : DISABLED_BG,
                  color: hasChanges ? CREAM : MUTED,
                  cursor: isPending ? "wait" : hasChanges ? "pointer" : "not-allowed",
                  opacity: isPending ? 0.6 : 1,
                  transition: "all 0.2s ease",
                }}
              >
                {isPending ? ts("saving") : t("publishSelected")}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Passcode / Temp Visiting Codes */}
      <SectionOverline label={tf("sectionVisitingCodes", "Visiting codes")} style={{ marginTop: "1.75rem" }} />
      <PasscodeSection scale={scale} wings={wingSummaries} wingsLoading={loading} />

      {/* Family access — wings+rooms → email grant (needs the full tree incl. rooms) */}
      <SectionOverline label={tf("sectionFamilyAccess", "Family access")} style={{ marginTop: "1.75rem" }} />
      <FamilyWingSharingSection scale={scale} wings={wings} wingsLoading={loading} />

      {/* Refer a friend — same shared card as settings/subscription (people look
          for it under both). It carries its own SectionOverline heading, data
          fetch and iOS 3.1.1 gate, and renders nothing on iOS / without a code. */}
      <ReferralSection overlineStyle={{ marginTop: "1.75rem" }} />

      {/* Canon hover / pressed / focus states (Me-page grammar) */}
      <style>{`
        @media (hover: hover) {
          .mp-sharing-ghost:hover:not(:disabled) { background: rgba(154,79,42,0.07) !important; }
          .mp-sharing-pill:hover:not(:disabled):not([aria-pressed="true"]) { background: rgba(154,79,42,0.07) !important; }
        }
        .mp-sharing-ghost:active:not(:disabled),
        .mp-sharing-pill:active:not(:disabled) { background: rgba(154,79,42,0.12) !important; }
        .mp-sharing-ghost:focus-visible,
        .mp-sharing-pill:focus-visible,
        .mp-sharing-cta:focus-visible {
          outline: 0.1875rem solid #D4AF37;
          outline-offset: 0.125rem;
        }
        @media (prefers-reduced-motion: reduce) {
          .mp-sharing-anim,
          .mp-sharing-ghost,
          .mp-sharing-pill,
          .mp-sharing-cta { transition: none !important; }
        }
      `}</style>
    </>
  );
}

/* ── Family Access — wings+rooms → email grant ───────── */
/**
 * "Give someone access": an email input plus a compact collapsible wings→rooms
 * selection tree (same grammar as the publish tree above / LifeStoryPanel's
 * attach tree). On send, grantAccessByEmail writes the grants using the
 * mechanisms the shared-with-me reading path actually enforces: whole standard
 * wings become wing_shares rows (getSharedWingData / getAcceptedShares), all
 * other selections become room_shares rows (getSharedRoomMemories / the
 * /invite landing). The old family-group member picker is fully replaced —
 * any email can be granted access directly. The existing share lists (sent +
 * received) and revoke flow stay below, now covering room shares too via
 * getAllMyShares.
 */

interface SentWingShare {
  id: string;
  wing_id: string;
  permission: string;
  status?: string;
  shared_with_email?: string | null;
  recipientName?: string;
  wingName?: string;
}
interface SentRoomShare {
  id: string;
  room_id: string;
  permission: string;
  status?: string;
  shared_with_email?: string | null;
  recipientName?: string;
  roomName?: string;
  wingName?: string;
}
interface ReceivedWingShare {
  id: string;
  wing_id: string;
  permission: string;
  ownerName?: string;
  wingName?: string;
}
interface ReceivedRoomShare {
  id: string;
  room_id: string;
  permission: string;
  ownerName?: string;
  roomName?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function FamilyWingSharingSection({ scale, wings, wingsLoading }: {
  scale: number;
  wings: PublishableWing[];
  wingsLoading: boolean;
}) {
  const { t: tf } = useTranslation("familySettings");
  const { t: ts } = useTranslation("settings");

  // i18n fallback helper (mirrors the page-level tf) so error copy renders
  // sensibly even before a locale file carries the key.
  const tsf = (key: string, fallback: string) => {
    const v = ts(key);
    return v === key ? fallback : v;
  };

  const [loading, setLoading] = useState(true);
  const [sentWings, setSentWings] = useState<SentWingShare[]>([]);
  const [sentRooms, setSentRooms] = useState<SentRoomShare[]>([]);
  const [receivedWings, setReceivedWings] = useState<ReceivedWingShare[]>([]);
  const [receivedRooms, setReceivedRooms] = useState<ReceivedRoomShare[]>([]);
  const [grantEmail, setGrantEmail] = useState("");
  const [selectedRooms, setSelectedRooms] = useState<Set<string>>(new Set());
  const [expandedWings, setExpandedWings] = useState<Record<string, boolean>>({});
  const [sending, setSending] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState<{ id: string; type: "wing" | "room" } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const loadShares = useCallback(async () => {
    try {
      const { getAllMyShares } = await import("@/lib/auth/sharing-actions");
      const res = await getAllMyShares();
      setSentWings((res.sent?.wings || []) as SentWingShare[]);
      setSentRooms((res.sent?.rooms || []) as SentRoomShare[]);
      setReceivedWings((res.received?.wings || []) as ReceivedWingShare[]);
      setReceivedRooms((res.received?.rooms || []) as ReceivedRoomShare[]);
    } catch {
      showToast(tf("loadWingSharesError"), "error");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    (async () => {
      await loadShares();
      setLoading(false);
    })();
  }, [loadShares]);

  const wingLabel = (wingSlug: string, serverName?: string) => {
    // wing_shares.wing_id is the canonical wing SLUG end-to-end (validated
    // against VALID_WINGS, joined on wings.slug). Resolve custom names from
    // the live wing tree first, then the server-provided default name.
    const wing = wings.find((w) => w.slug === wingSlug);
    return wing ? wing.name : (serverName || tf("unknownWing"));
  };

  // ── Selection state helpers: the tree is a room-id set; a wing counts as
  //    "whole" when every one of its rooms is selected ──
  const toggleRoom = (roomId: string) => {
    setSelectedRooms((prev) => {
      const next = new Set(prev);
      if (next.has(roomId)) next.delete(roomId); else next.add(roomId);
      return next;
    });
  };

  const toggleWingAll = (wing: PublishableWing) => {
    setSelectedRooms((prev) => {
      const next = new Set(prev);
      const all = wing.rooms.length > 0 && wing.rooms.every((r) => next.has(r.id));
      for (const r of wing.rooms) {
        if (all) next.delete(r.id); else next.add(r.id);
      }
      return next;
    });
  };

  const handleSend = async () => {
    const email = grantEmail.trim();
    if (!email || !EMAIL_RE.test(email)) {
      showToast(tf("accessGrantEmailInvalid"), "error");
      return;
    }
    // Partition the selection: fully selected wings go as whole-wing grants
    // (wing_shares when the slug supports it, per-room fallback server-side);
    // partially selected wings contribute their rooms individually. Alongside,
    // collect the display names this UI already renders (custom names resolved
    // by getMyPublishableContent) keyed by the same wing slugs / room ids, so
    // the server can label grants/invites with what the sender actually saw.
    const wholeWings: { slug: string; roomIds: string[] }[] = [];
    const roomIds: string[] = [];
    const names: { wings: Record<string, string>; rooms: Record<string, string> } = { wings: {}, rooms: {} };
    for (const w of wings) {
      if (w.rooms.length === 0) continue;
      const sel = w.rooms.filter((r) => selectedRooms.has(r.id));
      if (sel.length === 0) continue;
      if (sel.length === w.rooms.length) {
        wholeWings.push({ slug: w.slug, roomIds: w.rooms.map((r) => r.id) });
        names.wings[w.slug] = w.name;
        for (const r of w.rooms) names.rooms[r.id] = r.name;
      } else {
        roomIds.push(...sel.map((r) => r.id));
        for (const r of sel) names.rooms[r.id] = r.name;
      }
    }
    if (wholeWings.length === 0 && roomIds.length === 0) {
      showToast(tf("accessGrantNothing"), "error");
      return;
    }
    setSending(true);
    try {
      const { grantAccessByEmail } = await import("@/lib/auth/sharing-actions");
      const result = await grantAccessByEmail({ email, wholeWings, roomIds, names });
      if (result.error) {
        showToast(result.error, "error");
      } else if ((result.failed || 0) > 0) {
        showToast(tsf("publishError", "Some changes could not be saved. Please try again."), "error");
        loadShares();
      } else {
        showToast(tf("accessGrantSent", { email }), "success");
        setGrantEmail("");
        setSelectedRooms(new Set());
        loadShares();
      }
    } catch {
      showToast(tsf("publishError", "Some changes could not be saved. Please try again."), "error");
    } finally {
      setSending(false);
    }
  };

  const handleRevoke = async (id: string, type: "wing" | "room") => {
    const { unshareWing, removeRoomShare } = await import("@/lib/auth/sharing-actions");
    const result = type === "wing" ? await unshareWing(id) : await removeRoomShare(id);
    setConfirmRevoke(null);
    if (result.error) {
      showToast(result.error, "error");
    } else {
      showToast(tf("wingShareRemoved"), "success");
      loadShares();
    }
  };

  // Unified row models for the lists below the grant block.
  const sentShares = [
    ...sentWings.map((s) => ({
      key: `w-${s.id}`, id: s.id, type: "wing" as const,
      label: wingLabel(s.wing_id, s.wingName),
      who: s.recipientName || s.shared_with_email || "",
      permission: s.permission,
    })),
    ...sentRooms.map((s) => ({
      key: `r-${s.id}`, id: s.id, type: "room" as const,
      label: s.roomName || tf("unknownWing"),
      who: s.recipientName || s.shared_with_email || "",
      permission: s.permission,
    })),
  ];
  const receivedShares = [
    ...receivedWings.map((s) => ({
      key: `w-${s.id}`, id: s.id,
      label: wingLabel(s.wing_id, s.wingName),
      owner: s.ownerName || "",
      permission: s.permission,
    })),
    ...receivedRooms.map((s) => ({
      key: `r-${s.id}`, id: s.id,
      label: s.roomName || tf("unknownWing"),
      owner: s.ownerName || "",
      permission: s.permission,
    })),
  ];

  const labelStyle: React.CSSProperties = {
    fontFamily: T.font.body,
    fontSize: "0.6875rem", /* Atrium overline: the one small-caps voice */
    fontWeight: 700,
    color: MUTED,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    display: "block",
    marginBottom: "0.5rem",
  };

  return (
    <div style={{
      background: CREAM,
      borderRadius: "1rem",
      border: `0.0625rem solid ${HAIRLINE}`,
      padding: `${1.75 * scale}rem ${2 * scale}rem`,
      boxShadow: "0 0.25rem 1rem rgba(64,59,54,0.07), inset 0 0.0625rem 0 rgba(255,255,255,0.5)", // Atrium token: S1 + top highlight
      marginBottom: "1.5rem",
    }}>
      {/* Toast (section-local — offset below the page-level slot to avoid collision) */}
      {toast && (
        <div className="sharing-toast" role={toast.type === "success" ? "status" : "alert"} style={{
          position: "fixed", top: "2.625rem", right: "1rem", zIndex: 9999,
          padding: "0.875rem 1.25rem", borderRadius: "0.75rem",
          background: toast.type === "success" ? SAGE /* Atrium token: sage */ : DANGER,
          color: CREAM, fontFamily: T.font.body, fontSize: `${0.9375 * scale}rem`,
          fontWeight: 500, boxShadow: "0 0.5rem 1.5rem rgba(64,59,54,0.14)", // Atrium token: S2
        }}>
          {toast.message}
        </div>
      )}

      <h3 style={{
        fontFamily: T.font.display, fontSize: `${1.1875 * scale}rem`, fontWeight: 600, lineHeight: 1.15,
        color: INK, margin: "0 0 0.375rem",
      }}>
        {tf("accessGrantTitle")}
      </h3>
      <p style={{
        fontFamily: T.font.body, fontSize: `${0.8125 * scale}rem`, color: MUTED,
        margin: "0 0 1.25rem", lineHeight: 1.4,
      }}>
        {tf("accessGrantHint")}
      </p>

      {loading || wingsLoading ? (
        <SharingSpinner scale={scale} label={ts("loading")} />
      ) : (
        <>
          {/* Grant access form — email + collapsible wings→rooms tree */}
          <div style={{
            padding: "1.25rem 1.375rem",
            background: CREAM,
            borderRadius: "0.875rem",
            border: "0.0625rem solid #E3D6BC", /* Atrium hairline */
            marginBottom: "1.5rem",
          }}>
            <label htmlFor="mp-access-grant-email" style={labelStyle}>{tf("accessGrantEmailLabel")}</label>
            <input
              id="mp-access-grant-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={grantEmail}
              onChange={(e) => setGrantEmail(e.target.value)}
              placeholder="name@example.com"
              style={{
                width: "100%", boxSizing: "border-box",
                fontFamily: T.font.body,
                fontSize: `${Math.max(1, 1 * scale)}rem`, /* ≥1rem — no iOS zoom */
                padding: "0.625rem 0.875rem", borderRadius: "0.75rem",
                border: "0.0625rem solid #E3D6BC" /* Atrium hairline */,
                background: CONTROL_BG, color: INK, outline: "none",
                minHeight: "2.75rem",
                marginBottom: "1rem",
              }}
            />

            <label style={labelStyle}>{tf("accessGrantSelect")}</label>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }}>
              {wings.map((wing) => {
                const selCount = wing.rooms.reduce((n, r) => n + (selectedRooms.has(r.id) ? 1 : 0), 0);
                const allSelected = wing.rooms.length > 0 && selCount === wing.rooms.length;
                const someSelected = selCount > 0 && !allSelected;
                const open = !!expandedWings[wing.slug];
                const accent = wingAccent(wing.slug);
                return (
                  <div
                    key={wing.id}
                    className="mp-sharing-anim"
                    style={{
                      border: `0.0625rem solid ${allSelected || someSelected ? EMBER : HAIRLINE}`,
                      borderRadius: "0.75rem",
                      overflow: "hidden",
                      background: allSelected ? TERRACOTTA_WASH : CREAM,
                      transition: "border-color 0.2s ease, background 0.2s ease",
                    }}
                  >
                    {/* Wing row: expand toggle + "Entire wing" checkbox */}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", paddingRight: "0.625rem" }}>
                      <button
                        onClick={() => setExpandedWings((prev) => ({ ...prev, [wing.slug]: !prev[wing.slug] }))}
                        aria-expanded={open}
                        className="mp-sharing-ghost"
                        style={{
                          display: "flex", alignItems: "center", gap: "0.5rem",
                          flex: 1, minWidth: 0, minHeight: "2.75rem",
                          padding: "0.5rem 0.25rem 0.5rem 0.75rem", boxSizing: "border-box",
                          background: "transparent", border: "none", cursor: "pointer", textAlign: "left",
                        }}
                      >
                        <span aria-hidden style={{ color: MUTED, fontSize: "0.75rem", width: "1rem", flexShrink: 0 }}>
                          {open ? "▾" : "▸"}
                        </span>
                        <span aria-hidden style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                          <WingIcon wingId={wing.slug} size={18} color={accent} />
                        </span>
                        <span style={{
                          fontFamily: T.font.body, fontSize: `${0.9375 * scale}rem`, fontWeight: 500,
                          color: INK, flex: 1, minWidth: 0,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {wing.name}
                        </span>
                      </button>
                      <label style={{
                        display: "inline-flex", alignItems: "center", gap: "0.375rem",
                        minHeight: "2.75rem", cursor: "pointer", flexShrink: 0, padding: "0 0.25rem",
                      }}>
                        <input
                          type="checkbox"
                          checked={allSelected}
                          ref={(el) => { if (el) el.indeterminate = someSelected; }}
                          onChange={() => toggleWingAll(wing)}
                          aria-label={`${tf("accessGrantWingAll")} — ${wing.name}`}
                          style={{ width: "1rem", height: "1rem", accentColor: EMBER /* Atrium ember */, cursor: "pointer", flexShrink: 0 }}
                        />
                        <span style={{
                          fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 500,
                          color: allSelected || someSelected ? EMBER_GLYPH : MUTED,
                        }}>
                          {tf("accessGrantWingAll")}
                        </span>
                      </label>
                    </div>

                    {/* Room rows */}
                    {open && wing.rooms.length > 0 && (
                      <div style={{ padding: "0.25rem 0.5rem 0.5rem 2.25rem", borderTop: `0.0625rem solid ${HAIRLINE}` }}>
                        {wing.rooms.map((room) => {
                          const checked = selectedRooms.has(room.id);
                          const resolved = resolveRoomIconId(room.id, room.icon);
                          return (
                            <label
                              key={room.id}
                              style={{
                                display: "flex", alignItems: "center", gap: "0.5rem",
                                padding: "0.25rem 0.5rem", minHeight: "2.75rem",
                                cursor: "pointer", borderRadius: "0.375rem",
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleRoom(room.id)}
                                style={{ accentColor: EMBER /* Atrium ember */, width: "0.875rem", height: "0.875rem", flexShrink: 0 }}
                              />
                              <span aria-hidden style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                                {resolved ? (
                                  <RoomIcon roomId={resolved} wingId={wing.slug} size={16} color={accent} />
                                ) : (
                                  <GenericRoomIcon size={16} color={accent} />
                                )}
                              </span>
                              <span style={{
                                fontFamily: T.font.body, fontSize: `${0.8125 * scale}rem`,
                                color: checked ? INK : MUTED,
                              }}>
                                {room.name}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={handleSend}
              disabled={sending || !grantEmail.trim() || selectedRooms.size === 0}
              className="mp-sharing-cta"
              style={{
                padding: "0.75rem 1.75rem",
                minHeight: "2.75rem",
                borderRadius: "0.75rem",
                border: "none",
                background: sending || !grantEmail.trim() || selectedRooms.size === 0 ? DISABLED_BG : EMBER_GRADIENT,
                color: sending || !grantEmail.trim() || selectedRooms.size === 0 ? MUTED : CREAM,
                fontFamily: T.font.body,
                fontSize: "0.9375rem",
                fontWeight: 600,
                cursor: sending ? "wait" : !grantEmail.trim() || selectedRooms.size === 0 ? "default" : "pointer",
                transition: "all .2s ease",
              }}
            >
              {sending ? tf("accessGrantSending") : tf("accessGrantSend")}
            </button>
          </div>

          {sentShares.length === 0 && receivedShares.length === 0 && (
            <p style={{
              fontFamily: T.font.body, fontSize: `${0.8125 * scale}rem`, color: MUTED,
              margin: "0 0 1rem", lineHeight: 1.5, fontStyle: "italic",
            }}>
              {tf("noWingSharesYet")}
            </p>
          )}

          {sentShares.length > 0 && (
            <>
              <label style={labelStyle}>{tf("wingsShared")}</label>
              <div role="list" style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: receivedShares.length > 0 ? "1.5rem" : 0 }}>
                {sentShares.map((share) => (
                  <div key={share.key} role="listitem" style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "0.75rem 1rem", borderRadius: "0.75rem",
                    background: CREAM,
                    border: "0.0625rem solid #E3D6BC", /* Atrium hairline */
                    gap: "0.625rem", flexWrap: "wrap",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", minWidth: 0, flex: 1 }}>
                      <span style={{
                        display: "inline-block",
                        padding: "0.1875rem 0.625rem",
                        borderRadius: "2rem",
                        background: "rgba(154,79,42,0.11)",
                        color: EMBER_GLYPH, /* Atrium terracotta glyph */
                        fontFamily: T.font.body,
                        fontSize: "0.8125rem",
                        fontWeight: 600,
                        flexShrink: 0,
                      }}>
                        {share.label}
                      </span>
                      <span style={{
                        fontFamily: T.font.body, fontSize: "0.8125rem", color: INK,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0,
                      }}>
                        {share.who}
                      </span>
                      <span style={{
                        fontFamily: T.font.body, fontSize: "0.6875rem", color: MUTED,
                        padding: "0.125rem 0.5rem", borderRadius: "2rem", // Atrium token: pill
                        background: "rgba(113,106,94,0.12)",
                        flexShrink: 0,
                      }}>
                        {share.permission === "view" ? tf("viewOnly") : tf("canContribute")}
                      </span>
                    </div>
                    {confirmRevoke?.id === share.id && confirmRevoke?.type === share.type ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", flexShrink: 0 }}>
                        <span style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: INK }}>
                          {tf("confirmUnshareShort")}
                        </span>
                        <button
                          onClick={() => handleRevoke(share.id, share.type)}
                          style={{
                            padding: "0.375rem 0.75rem", borderRadius: "0.375rem",
                            minHeight: "2.75rem",
                            border: "none", background: DANGER, color: CREAM,
                            fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 600,
                            cursor: "pointer", transition: "all .2s ease",
                          }}
                        >
                          {tf("confirmYes")}
                        </button>
                        <button
                          onClick={() => setConfirmRevoke(null)}
                          className="mp-sharing-ghost"
                          style={{
                            padding: "0.375rem 0.75rem", borderRadius: "0.375rem",
                            minHeight: "2.75rem",
                            border: "0.0625rem solid #E3D6BC", /* Atrium hairline */ background: CONTROL_BG,
                            color: MUTED, fontFamily: T.font.body, fontSize: "0.6875rem",
                            fontWeight: 500, cursor: "pointer", transition: "all .2s ease",
                          }}
                        >
                          {tf("cancel")}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmRevoke({ id: share.id, type: share.type })}
                        aria-label={tf("removeShare", { email: share.who })}
                        className="mp-sharing-ghost"
                        style={{
                          borderRadius: "0.75rem",
                          border: "0.0625rem solid #E3D6BC", /* Atrium hairline */
                          background: "transparent",
                          color: MUTED,
                          fontSize: "0.8125rem",
                          cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          transition: "all .2s ease",
                          minWidth: "2.75rem", minHeight: "2.75rem",
                        }}
                      >
                        {"✕"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {receivedShares.length > 0 && (
            <>
              <label style={labelStyle}>{tf("sharedWithMe")}</label>
              <div role="list" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {receivedShares.map((share) => (
                  <div key={share.key} role="listitem" style={{
                    display: "flex", alignItems: "center",
                    padding: "0.75rem 1rem", borderRadius: "0.75rem",
                    background: "#F2F5EA", /* Atrium sage tile wash, pre-mixed */
                    border: "0.0625rem solid #DFE3D2", /* sage-zone border */
                    gap: "0.625rem",
                  }}>
                    <span style={{
                      display: "inline-block",
                      padding: "0.1875rem 0.625rem",
                      borderRadius: "2rem",
                      background: "rgba(86,104,60,0.16)",
                      color: SAGE, /* Atrium sage */
                      fontFamily: T.font.body,
                      fontSize: "0.8125rem",
                      fontWeight: 600,
                      flexShrink: 0,
                    }}>
                      {share.label}
                    </span>
                    <span style={{
                      fontFamily: T.font.body, fontSize: "0.8125rem", color: INK,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0,
                    }}>
                      {tf("from")} {share.owner}
                    </span>
                    <span style={{
                      fontFamily: T.font.body, fontSize: "0.6875rem", color: MUTED,
                      padding: "0.125rem 0.5rem", borderRadius: "2rem", // Atrium token: pill — match adjacent permission chips
                      background: "rgba(113,106,94,0.12)",
                      flexShrink: 0,
                    }}>
                      {share.permission === "view" ? tf("viewOnly") : tf("canContribute")}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

/* ── Passcode Section ────────────────────────────────── */

function PasscodeSection({ scale, wings, wingsLoading }: {
  scale: number;
  wings: { id: string; name: string; slug: string }[];
  wingsLoading: boolean;
}) {
  const { t } = useTranslation("social");
  const { t: ts } = useTranslation("settings");
  const isCompact = useIsCompact();
  const [codes, setCodes] = useState<{ id: string; passcode: string; expiresAt: string; wingId: string | null; roomId: string | null; createdAt: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  // Wing list now comes from the parent (fetched once via getMyPublishableContent),
  // so this section no longer re-runs that heavy action just to populate the picker.
  const [selectedWingId, setSelectedWingId] = useState("");
  const [hours, setHours] = useState(24);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    (async () => {
      try {
        const { getMyPasscodes } = await import("@/lib/social/passcode-actions");
        const codeResult = await getMyPasscodes();
        if (codeResult.ok) setCodes(codeResult.shares);
      } catch {
        setToast({ message: ts("loadError"), type: "error" });
      } finally {
        setLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Default the selected wing to the first available option once the parent's
  // wing list arrives (was previously set inside the removed content fetch).
  useEffect(() => {
    if (wings.length > 0) {
      setSelectedWingId((prev) => (prev ? prev : wings[0].id));
    }
  }, [wings]);

  const handleCreate = async () => {
    if (!selectedWingId) return;
    setCreating(true);
    try {
      const { createPasscode } = await import("@/lib/social/passcode-actions");
      const result = await createPasscode({ wingId: selectedWingId, expiresInHours: hours });
      if (result.ok && result.share) {
        setCodes((prev) => [result.share!, ...prev]);
      } else {
        setToast({ message: t("passcodeCreateError"), type: "error" });
      }
    } catch {
      setToast({ message: t("passcodeCreateError"), type: "error" });
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    const { deletePasscode } = await import("@/lib/social/passcode-actions");
    await deletePasscode(id);
    setCodes((prev) => prev.filter((c) => c.id !== id));
  };

  const formatExpiry = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    if (diff <= 0) return ts("expired") || "Expired";
    const hrs = Math.floor(diff / 3600000);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  return (
    <div style={{
      background: CREAM,
      borderRadius: "1rem",
      border: `0.0625rem solid ${HAIRLINE}`,
      padding: `${1.75 * scale}rem ${2 * scale}rem`,
      boxShadow: "0 0.25rem 1rem rgba(64,59,54,0.07), inset 0 0.0625rem 0 rgba(255,255,255,0.5)", // Atrium token: S1 + top highlight
      marginBottom: "1.5rem",
    }}>
      {/* Toast (section-local) */}
      {toast && (
        <div className="sharing-toast" role={toast.type === "success" ? "status" : "alert"} style={{
          position: "fixed", top: "4.25rem", right: "1rem", zIndex: 9999,
          padding: "0.875rem 1.25rem", borderRadius: "0.75rem",
          background: toast.type === "success" ? SAGE : DANGER,
          color: CREAM, fontFamily: T.font.body, fontSize: `${0.9375 * scale}rem`,
          fontWeight: 500, boxShadow: "0 0.5rem 1.5rem rgba(64,59,54,0.14)",
        }}>
          {toast.message}
        </div>
      )}

      <h3 style={{
        fontFamily: T.font.display, fontSize: `${1.1875 * scale}rem`, fontWeight: 600, lineHeight: 1.15,
        color: INK, margin: "0 0 0.375rem",
      }}>
        {t("passcodeAction")}
      </h3>
      <p style={{
        fontFamily: T.font.body, fontSize: `${0.8125 * scale}rem`, color: MUTED,
        margin: "0 0 1.25rem", lineHeight: 1.4,
      }}>
        {t("passcodeDesc") || "Create temporary visiting codes so others can access your palace without publishing."}
      </p>

      {loading || wingsLoading ? (
        <SharingSpinner scale={scale} label={ts("loading")} />
      ) : (
        <>
          {/* Create new code — stacks full-width on compact (iPad portrait) */}
          <div style={{
            display: "flex", gap: "0.5rem",
            flexDirection: isCompact ? "column" : "row",
            alignItems: isCompact ? "stretch" : "flex-end",
            flexWrap: "wrap",
            marginBottom: codes.length > 0 ? "1.25rem" : 0,
          }}>
            <div style={{ flex: 1, minWidth: isCompact ? "auto" : "8rem" }}>
              <label style={{ fontFamily: T.font.body, fontSize: `${0.6875 * scale}rem` /* Atrium overline */, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: MUTED, display: "block", marginBottom: "0.25rem" }}>
                {t("passcodeWing")}
              </label>
              <select
                value={selectedWingId}
                onChange={(e) => setSelectedWingId(e.target.value)}
                className="mp-sharing-cta"
                style={{
                  width: "100%", fontFamily: T.font.body, fontSize: `${0.8125 * scale}rem`,
                  padding: "0.5rem 0.625rem", borderRadius: "0.75rem", // Atrium: small-control radius
                  minHeight: "2.75rem",
                  border: "0.0625rem solid #E3D6BC" /* Atrium token: hairline */, background: CREAM,
                  color: INK, outline: "none",
                }}
              >
                {wings.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
            <div style={{ minWidth: "5rem" }}>
              <label style={{ fontFamily: T.font.body, fontSize: `${0.6875 * scale}rem` /* Atrium overline */, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: MUTED, display: "block", marginBottom: "0.25rem" }}>
                {t("passcodeExpiry") || "Duration"}
              </label>
              <select
                value={hours}
                onChange={(e) => setHours(Number(e.target.value))}
                className="mp-sharing-cta"
                style={{
                  width: "100%", fontFamily: T.font.body, fontSize: `${0.8125 * scale}rem`,
                  padding: "0.5rem 0.625rem", borderRadius: "0.75rem", // Atrium: small-control radius
                  minHeight: "2.75rem",
                  border: "0.0625rem solid #E3D6BC" /* Atrium token: hairline */, background: CREAM,
                  color: INK, outline: "none",
                }}
              >
                <option value={1}>1h</option>
                <option value={4}>4h</option>
                <option value={24}>24h</option>
                <option value={72}>3d</option>
                <option value={168}>7d</option>
              </select>
            </div>
            <button
              onClick={handleCreate}
              disabled={creating || !selectedWingId}
              className="mp-sharing-cta"
              style={{
                fontFamily: T.font.body, fontSize: `${0.8125 * scale}rem`, fontWeight: 600,
                padding: "0.5rem 1rem", borderRadius: "0.75rem", border: "none", // Atrium: small-control radius
                minHeight: "2.75rem",
                // Canonical settings-shell primary-button grammar: ember→terracotta
                // gradient when actionable, pre-mixed sandstone + muted ink when not
                // (matches the Save CTA above and the profile-page Save button).
                background: creating || !selectedWingId ? DISABLED_BG : EMBER_GRADIENT,
                color: creating || !selectedWingId ? MUTED : CREAM,
                cursor: creating ? "wait" : !selectedWingId ? "not-allowed" : "pointer",
                opacity: creating ? 0.6 : 1, whiteSpace: "nowrap",
                transition: "all 0.2s ease",
              }}
            >
              {t("passcodeCreate") || "Create Code"}
            </button>
          </div>

          {/* Active codes */}
          {codes.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {codes.map((code) => {
                const wing = wings.find((w) => w.id === code.wingId);
                return (
                  <div
                    key={code.id}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "0.75rem 1rem", borderRadius: "0.75rem", // Atrium: small-control radius
                      background: CREAM, border: "0.0625rem solid #E3D6BC" /* Atrium token: hairline */,
                      gap: "0.75rem", flexWrap: "wrap",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1, minWidth: 0 }}>
                      {/* Passcodes are stored one-way hashed, so a listed (already
                          persisted) code has no recoverable cleartext — only the
                          code just created carries one. Render the chip only when
                          the cleartext is present. */}
                      {code.passcode ? (
                        <code style={{
                          fontFamily: "monospace", fontSize: `${1 * scale}rem`, fontWeight: 700,
                          color: EMBER_GLYPH /* Atrium token: terracotta glyph */, letterSpacing: "0.1em",
                          background: "rgba(154,79,42,0.11)", padding: "0.25rem 0.625rem",
                          borderRadius: "0.375rem",
                        }}>
                          {code.passcode.toUpperCase()}
                        </code>
                      ) : null}
                      <span style={{ fontFamily: T.font.body, fontSize: `${0.8125 * scale}rem`, color: MUTED }}>
                        {wing?.name || "—"} · {formatExpiry(code.expiresAt)}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRevoke(code.id)}
                      className="mp-sharing-cta"
                      style={{
                        fontFamily: T.font.body, fontSize: `${0.8125 * scale}rem`,
                        padding: "0.25rem 0.625rem", borderRadius: "0.75rem", // Atrium: small-control radius
                        minHeight: "2.75rem",
                        border: `0.0625rem solid ${DANGER}30`, background: "transparent",
                        color: DANGER, cursor: "pointer",
                      }}
                    >
                      {ts("revoke") || "Revoke"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
