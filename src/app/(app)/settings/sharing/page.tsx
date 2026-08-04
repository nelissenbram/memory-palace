"use client";

import { useState, useEffect, useCallback, useMemo, useRef, useTransition } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useAccessibility } from "@/components/providers/AccessibilityProvider";
import { useIsMobile, useIsCompact } from "@/lib/hooks/useIsMobile";
import { EMBER, EMBER_GLYPH, HAIRLINE, CREAM, INK, MUTED, SAGE } from "@/lib/libraryTokens";
import type { PublishableWing } from "@/lib/social/share-actions";
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
                          <span aria-hidden style={{ fontSize: `${1 * scale}rem` }}>{room.icon}</span>
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

      {/* Family wing permissions (moved here from Settings > Family — change 20) */}
      <SectionOverline label={tf("sectionFamilyAccess", "Family access")} style={{ marginTop: "1.75rem" }} />
      <FamilyWingSharingSection scale={scale} wings={wingSummaries} wingsLoading={loading} />

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

/* ── Family Wing Sharing ─────────────────────────────── */
/**
 * Wing-level permissions for family members (view / contribute), relocated from
 * Settings > Family (Explore/Me revision, change 20). Sharing is now the single
 * answer to "who can see what": publish tree + passcodes + family wing permissions.
 * The wing list comes from getMyPublishableContent (real wings incl. custom
 * names), replacing the old hardcoded 5-slug list.
 */

interface WingShareEntry {
  id: string;
  wing_id: string;
  permission: string;
  shared_with_id?: string;
  shared_with_email?: string;
  owner_id?: string;
  owner_email?: string;
  created_at: string;
}

function FamilyWingSharingSection({ scale, wings, wingsLoading }: {
  scale: number;
  wings: { id: string; slug: string; name: string }[];
  wingsLoading: boolean;
}) {
  const { t: tf } = useTranslation("familySettings");
  const { t: ts } = useTranslation("settings");

  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<{ id: string; email: string }[]>([]);
  // Wing options now come from the parent (fetched once via getMyPublishableContent),
  // rather than this section re-running that heavy action itself.
  const wingOptions = wings;
  const [myShares, setMyShares] = useState<WingShareEntry[]>([]);
  const [sharedWithMe, setSharedWithMe] = useState<WingShareEntry[]>([]);
  const [shareWingSlug, setShareWingSlug] = useState("");
  const [shareMemberEmail, setShareMemberEmail] = useState("");
  const [sharePermission, setSharePermission] = useState<"view" | "contribute">("view");
  const [sharing, setSharing] = useState(false);
  const [confirmUnshareId, setConfirmUnshareId] = useState<string | null>(null);
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
      const { getMyWingShares, getWingsSharedWithMe } = await import("@/lib/auth/sharing-actions");
      const [myRes, withMeRes] = await Promise.all([getMyWingShares(), getWingsSharedWithMe()]);
      setMyShares((myRes.shares || []) as WingShareEntry[]);
      setSharedWithMe((withMeRes.shares || []) as WingShareEntry[]);
    } catch {
      showToast(tf("loadWingSharesError"), "error");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { getAllFamilyGroups } = await import("@/lib/auth/family-actions");
        const groupsRes = await getAllFamilyGroups();
        // All active family members across all groups (deduped, excluding self)
        const userEmail = (groupsRes.userEmail || "").toLowerCase();
        const groupEntries = (groupsRes.groups || []) as unknown as { members?: { id: string; email: string; status: string }[] }[];
        const all = groupEntries.flatMap((g) =>
          (g.members || []).filter((m) => m.status === "active" && m.email.toLowerCase() !== userEmail)
        );
        const unique = all.filter(
          (m, i, arr) => arr.findIndex((x) => x.email.toLowerCase() === m.email.toLowerCase()) === i
        );
        setMembers(unique.map((m) => ({ id: m.id, email: m.email })));
      } catch {
        /* section stays usable with what loaded */
      }
      await loadShares();
      setLoading(false);
    })();
  }, [loadShares]);

  // Default the selected wing to the first available option once the parent's
  // wing list arrives (was previously set inside the removed content fetch).
  useEffect(() => {
    if (wingOptions.length > 0) {
      setShareWingSlug((prev) => (prev ? prev : wingOptions[0].slug));
    }
  }, [wingOptions]);

  const wingLabel = (wingSlug: string) => {
    // wing_shares.wing_id is the canonical wing SLUG end-to-end: shareWing()
    // validates against VALID_WINGS slugs and getSharedWingData joins on
    // wings.slug. So resolve the label by slug only. If it doesn't resolve
    // (e.g. a wing that was renamed/removed), show a human label rather than
    // leaking a raw identifier into the badge.
    const wing = wingOptions.find((w) => w.slug === wingSlug);
    return wing ? wing.name : tf("unknownWing");
  };

  const handleShareWing = async () => {
    if (!shareMemberEmail.trim() || !shareMemberEmail.includes("@")) {
      if (shareMemberEmail.trim()) showToast(tf("inviteInvalidEmail"), "error");
      return;
    }
    setSharing(true);
    const { shareWing } = await import("@/lib/auth/sharing-actions");
    const result = await shareWing(shareWingSlug, shareMemberEmail.trim(), sharePermission);
    setSharing(false);
    if (result.error) {
      showToast(result.error, "error");
    } else {
      showToast(tf("wingSharedSuccess", { email: shareMemberEmail.trim() }), "success");
      setShareMemberEmail("");
      loadShares();
    }
  };

  const handleUnshareWing = async (shareId: string) => {
    const { unshareWing } = await import("@/lib/auth/sharing-actions");
    const result = await unshareWing(shareId);
    setConfirmUnshareId(null);
    if (result.error) {
      showToast(result.error, "error");
    } else {
      showToast(tf("wingShareRemoved"), "success");
      loadShares();
    }
  };

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
        {tf("wingSharing")}
      </h3>
      <p style={{
        fontFamily: T.font.body, fontSize: `${0.8125 * scale}rem`, color: MUTED,
        margin: "0 0 1.25rem", lineHeight: 1.4,
      }}>
        {tf("wingSharingDesc")}
      </p>

      {loading || wingsLoading ? (
        <SharingSpinner scale={scale} label={ts("loading")} />
      ) : (
        <>
          {/* Share a wing form */}
          {members.length > 0 && wingOptions.length > 0 && (
            <div style={{
              padding: "1.25rem 1.375rem",
              background: CREAM,
              borderRadius: "0.875rem",
              border: "0.0625rem solid #E3D6BC", /* Atrium hairline */
              marginBottom: "1.5rem",
            }}>
              <label style={labelStyle}>{tf("shareAWing")}</label>

              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.875rem", flexWrap: "wrap" }}>
                {wingOptions.map((wing) => (
                  <button
                    key={wing.slug}
                    onClick={() => setShareWingSlug(wing.slug)}
                    aria-pressed={shareWingSlug === wing.slug}
                    className="mp-sharing-pill"
                    style={{
                      padding: "0.5rem 1rem",
                      minHeight: "2.75rem",
                      borderRadius: "0.75rem",
                      border: `0.0625rem solid ${shareWingSlug === wing.slug ? EMBER /* Atrium ember */ : HAIRLINE}`,
                      background: shareWingSlug === wing.slug ? TERRACOTTA_WASH : CONTROL_BG,
                      cursor: "pointer",
                      fontFamily: T.font.body,
                      fontSize: "0.8125rem",
                      color: shareWingSlug === wing.slug ? EMBER_GLYPH : MUTED,
                      fontWeight: shareWingSlug === wing.slug ? 600 : 500,
                      transition: "all .2s ease",
                    }}
                  >
                    {wing.name}
                  </button>
                ))}
              </div>

              <label htmlFor="sharing-family-member" style={{ ...labelStyle, marginTop: "0.5rem" }}>{tf("familyMember")}</label>
              <select
                id="sharing-family-member"
                value={shareMemberEmail}
                onChange={(e) => setShareMemberEmail(e.target.value)}
                style={{
                  width: "100%", fontFamily: T.font.body, fontSize: `${0.9375 * scale}rem`,
                  padding: "0.75rem 1rem", borderRadius: "0.75rem",
                  border: "0.0625rem solid #E3D6BC" /* Atrium hairline */, background: CONTROL_BG,
                  color: INK, outline: "none",
                  marginBottom: "0.875rem",
                  minHeight: "2.75rem",
                  cursor: "pointer",
                  appearance: "auto" as React.CSSProperties["appearance"],
                }}
              >
                <option value="">{tf("selectMember")}</option>
                {members.map((m) => (
                  <option key={m.id} value={m.email}>{m.email}</option>
                ))}
              </select>

              <label style={{ ...labelStyle, marginTop: "0.25rem" }}>{tf("permission")}</label>
              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
                {(["view", "contribute"] as const).map((perm) => (
                  <button
                    key={perm}
                    onClick={() => setSharePermission(perm)}
                    aria-pressed={sharePermission === perm}
                    className="mp-sharing-pill"
                    style={{
                      padding: "0.5rem 1rem",
                      minHeight: "2.75rem",
                      borderRadius: "0.75rem",
                      border: `0.0625rem solid ${sharePermission === perm ? EMBER /* Atrium ember */ : HAIRLINE}`,
                      background: sharePermission === perm ? TERRACOTTA_WASH : CONTROL_BG,
                      cursor: "pointer",
                      fontFamily: T.font.body,
                      fontSize: "0.8125rem",
                      color: sharePermission === perm ? EMBER_GLYPH : MUTED,
                      fontWeight: sharePermission === perm ? 600 : 500,
                      transition: "all .2s ease",
                    }}
                  >
                    {perm === "view" ? tf("viewOnly") : tf("canContribute")}
                  </button>
                ))}
              </div>

              <button
                onClick={handleShareWing}
                disabled={!shareMemberEmail || sharing}
                className="mp-sharing-cta"
                style={{
                  padding: "0.75rem 1.75rem",
                  minHeight: "2.75rem",
                  borderRadius: "0.75rem",
                  border: "none",
                  background: !shareMemberEmail || sharing ? DISABLED_BG : EMBER_GRADIENT,
                  color: !shareMemberEmail || sharing ? MUTED : CREAM,
                  fontFamily: T.font.body,
                  fontSize: "0.9375rem",
                  fontWeight: 600,
                  cursor: !shareMemberEmail || sharing ? "default" : "pointer",
                  transition: "all .2s ease",
                }}
              >
                {sharing ? tf("sharing") : tf("shareWing")}
              </button>
            </div>
          )}

          {members.length === 0 && (
            <div style={{
              padding: "1rem 1.25rem",
              background: CREAM,
              borderRadius: "0.75rem",
              border: "0.0625rem solid #E3D6BC", /* Atrium hairline */
              marginBottom: "1.5rem",
            }}>
              <p style={{
                fontFamily: T.font.body, fontSize: `${0.9375 * scale}rem`, color: MUTED,
                margin: 0, lineHeight: 1.5,
              }}>
                {tf("inviteToShare")}
              </p>
            </div>
          )}

          {members.length > 0 && myShares.length === 0 && sharedWithMe.length === 0 && (
            <p style={{
              fontFamily: T.font.body, fontSize: `${0.8125 * scale}rem`, color: MUTED,
              margin: "0 0 1rem", lineHeight: 1.5, fontStyle: "italic",
            }}>
              {tf("noWingSharesYet")}
            </p>
          )}

          {myShares.length > 0 && (
            <>
              <label style={labelStyle}>{tf("wingsShared")}</label>
              <div role="list" style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: sharedWithMe.length > 0 ? "1.5rem" : 0 }}>
                {myShares.map((share) => (
                  <div key={share.id} role="listitem" style={{
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
                        {wingLabel(share.wing_id)}
                      </span>
                      <span style={{
                        fontFamily: T.font.body, fontSize: "0.8125rem", color: INK,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0,
                      }}>
                        {share.shared_with_email}
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
                    {confirmUnshareId === share.id ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", flexShrink: 0 }}>
                        <span style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: INK }}>
                          {tf("confirmUnshareShort")}
                        </span>
                        <button
                          onClick={() => handleUnshareWing(share.id)}
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
                          onClick={() => setConfirmUnshareId(null)}
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
                        onClick={() => setConfirmUnshareId(share.id)}
                        aria-label={tf("removeShare", { email: share.shared_with_email || "" })}
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

          {sharedWithMe.length > 0 && (
            <>
              <label style={labelStyle}>{tf("sharedWithMe")}</label>
              <div role="list" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {sharedWithMe.map((share) => (
                  <div key={share.id} role="listitem" style={{
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
                      {wingLabel(share.wing_id)}
                    </span>
                    <span style={{
                      fontFamily: T.font.body, fontSize: "0.8125rem", color: INK,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0,
                    }}>
                      {tf("from")} {share.owner_email}
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
