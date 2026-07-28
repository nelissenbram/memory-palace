"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useAccessibility } from "@/components/providers/AccessibilityProvider";
import type { PublishableWing } from "@/lib/social/share-actions";

export default function SharingPage() {
  const { t } = useTranslation("social");
  const { t: ts } = useTranslation("settings");
  const { scale } = useAccessibility();

  const [loading, setLoading] = useState(true);
  const [wings, setWings] = useState<PublishableWing[]>([]);
  const [selectedWings, setSelectedWings] = useState<Set<string>>(new Set());
  const [selectedRooms, setSelectedRooms] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
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

  // Load content on mount (flush settings first so room names are fresh)
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
      const { publishWing, unpublishWing, publishRoom, unpublishRoom } = await import("@/lib/social/share-actions");
      const ops: Promise<unknown>[] = [];
      for (const w of wings) {
        if (selectedWings.has(w.id) && !w.published) {
          ops.push(publishWing({ wingId: w.id }));
        } else if (!selectedWings.has(w.id) && w.published) {
          ops.push(unpublishWing(w.id));
        }
        for (const r of w.rooms) {
          if (selectedRooms.has(r.id) && !r.published) {
            ops.push(publishRoom({ roomId: r.id, wingId: w.id }));
          } else if (!selectedRooms.has(r.id) && r.published) {
            ops.push(unpublishRoom(r.id));
          }
        }
      }
      await Promise.all(ops);
      // Update local state
      setWings((prev) => prev.map((w) => ({
        ...w,
        published: selectedWings.has(w.id),
        rooms: w.rooms.map((r) => ({ ...r, published: selectedRooms.has(r.id) })),
      })));
      showToast(t("publishSuccess"), "success");
    });
  };

  const hasChanges = wings.some((w) => {
    if (w.published !== selectedWings.has(w.id)) return true;
    return w.rooms.some((r) => r.published !== selectedRooms.has(r.id));
  });

  return (
    <>
      {/* Toast */}
      {toast && (
        <div className="sharing-toast" style={{
          position: "fixed", top: "1rem", right: "1rem", zIndex: 9999,
          padding: "0.875rem 1.25rem", borderRadius: "0.75rem",
          background: toast.type === "success" ? "#56683C" /* Atrium token: sage */ : "#C05050",
          color: T.color.white, fontFamily: T.font.body, fontSize: `${0.9375 * scale}rem`,
          fontWeight: 500, boxShadow: "0 0.5rem 1.5rem rgba(64,59,54,0.14)", // Atrium token: S2
          animation: "fadeIn .2s ease",
        }}>
          {toast.message}
          <style>{`@media (prefers-reduced-motion: reduce){ .sharing-toast{ animation: none; } }`}</style>
        </div>
      )}

      {/* Published Content Card */}
      <div style={{
        background: T.color.white,
        borderRadius: "1rem",
        border: "0.0625rem solid #E3D6BC" /* Atrium token: hairline */,
        padding: `${1.75 * scale}rem ${2 * scale}rem`,
        boxShadow: "0 0.25rem 1rem rgba(64,59,54,0.07)", // Atrium token: S1
        marginBottom: "1.5rem",
      }}>
        <div style={{ marginBottom: "1.25rem" }}>
          <h3 style={{
            fontFamily: T.font.display, fontSize: `${1.1875 * scale}rem`, fontWeight: 600, lineHeight: 1.15,
            color: "#403B36", margin: "0 0 0.375rem",
          }}>
            {t("publishManage")}
          </h3>
          <p style={{
            fontFamily: T.font.body, fontSize: `${0.8125 * scale}rem`, color: "#716A5E",
            margin: 0, lineHeight: 1.4,
          }}>
            {t("publishManageHint")}
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "2.5rem 1rem" }}>
            <div className="sharing-spin" style={{
              width: "2.5rem", height: "2.5rem", margin: "0 auto 1rem",
              border: "0.1875rem solid #E3D6BC", // Atrium token: hairline
              borderTopColor: "#B85C38", // Atrium token: ember
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }} />
            <p style={{ fontFamily: T.font.body, fontSize: `${0.8125 * scale}rem`, color: "#716A5E", margin: 0 }}>
              {ts("loadingWings")}
            </p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } } @media (prefers-reduced-motion: reduce){ .sharing-spin{ animation: none; } }`}</style>
          </div>
        ) : wings.length === 0 ? (
          <div style={{
            padding: "1.5rem 1.25rem", borderRadius: "0.75rem",
            background: T.color.linen, border: "0.0625rem solid #E3D6BC" /* Atrium token: hairline */,
            textAlign: "center",
            fontFamily: T.font.body, fontSize: `${0.9375 * scale}rem`, color: "#716A5E",
          }}>
            {ts("noWingsYet")}
          </div>
        ) : (
          <>
            {/* Select / Deselect all */}
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
              <button
                onClick={selectAll}
                style={{
                  fontFamily: T.font.body, fontSize: `${0.8125 * scale}rem`, fontWeight: 500,
                  padding: "0.375rem 0.75rem", borderRadius: "2rem", // Atrium token: pill
                  border: "0.0625rem solid #E3D6BC" /* Atrium token: hairline */, background: "transparent",
                  color: "#716A5E", cursor: "pointer",
                }}
              >
                {t("selectAll")}
              </button>
              <button
                onClick={deselectAll}
                style={{
                  fontFamily: T.font.body, fontSize: `${0.8125 * scale}rem`, fontWeight: 500,
                  padding: "0.375rem 0.75rem", borderRadius: "2rem", // Atrium token: pill
                  border: "0.0625rem solid #E3D6BC" /* Atrium token: hairline */, background: "transparent",
                  color: "#716A5E", cursor: "pointer",
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
                  style={{
                    border: `0.0625rem solid ${selectedWings.has(wing.id) ? "#B85C38" /* Atrium token: ember */ : "#E3D6BC" /* hairline */}`,
                    borderRadius: "0.75rem",
                    overflow: "hidden",
                    background: selectedWings.has(wing.id) ? "#FBF2EC" /* Atrium: premixed terracotta wash */ : T.color.linen,
                    transition: "border-color 0.2s ease, background 0.2s ease",
                  }}
                >
                  {/* Wing row */}
                  <label style={{
                    display: "flex", alignItems: "center", gap: "0.625rem",
                    padding: "0.875rem 1rem", cursor: "pointer",
                    borderBottom: wing.rooms.length > 0 ? "0.0625rem solid #E3D6BC" /* Atrium token: hairline */ : "none",
                  }}>
                    <input
                      type="checkbox"
                      checked={selectedWings.has(wing.id)}
                      onChange={() => toggleWing(wing.id)}
                      style={{ accentColor: "#B85C38" /* Atrium token: ember */, width: "1rem", height: "1rem", flexShrink: 0 }}
                    />
                    <span style={{
                      fontFamily: T.font.body, fontSize: `${0.9375 * scale}rem`, fontWeight: 500,
                      color: "#403B36", flex: 1,
                    }}>
                      {wing.name}
                    </span>
                    <span style={{
                      fontFamily: T.font.body, fontSize: `${0.6875 * scale}rem`, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", // Atrium: the one small-caps voice
                      color: wing.published ? "#9A4F2A" /* Atrium token: terracotta glyph */ : "#716A5E",
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
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedRooms.has(room.id)}
                            onChange={() => toggleRoom(room.id, wing.id)}
                            style={{ accentColor: "#B85C38" /* Atrium token: ember */, width: "0.875rem", height: "0.875rem", flexShrink: 0 }}
                          />
                          <span style={{ fontSize: `${1 * scale}rem` }}>{room.icon}</span>
                          <span style={{
                            fontFamily: T.font.body, fontSize: `${0.8125 * scale}rem`,
                            color: "#403B36",
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
                style={{
                  fontFamily: T.font.body, fontSize: `${0.9375 * scale}rem`, fontWeight: 600,
                  padding: "0.75rem 1.75rem", borderRadius: "0.75rem", border: "none",
                  background: hasChanges
                    ? "linear-gradient(135deg, #B85C38, #9A4F2A)" /* Atrium: ember → terracotta */
                    : T.color.sandstone,
                  color: T.color.cream,
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
      <PasscodeSection scale={scale} />

      {/* Family wing permissions (moved here from Settings > Family — change 20) */}
      <FamilyWingSharingSection scale={scale} />
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

function FamilyWingSharingSection({ scale }: { scale: number }) {
  const { t: tf } = useTranslation("familySettings");

  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<{ id: string; email: string }[]>([]);
  const [wingOptions, setWingOptions] = useState<{ id: string; slug: string; name: string }[]>([]);
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
        const [{ getAllFamilyGroups }, { getMyPublishableContent }] = await Promise.all([
          import("@/lib/auth/family-actions"),
          import("@/lib/social/share-actions"),
        ]);
        const [groupsRes, content] = await Promise.all([
          getAllFamilyGroups(),
          getMyPublishableContent(),
        ]);
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
        // Real wing list (fixes the hardcoded 5-wing list — 18-room era)
        const opts = content.map((w) => ({ id: w.id, slug: w.slug, name: w.name }));
        setWingOptions(opts);
        if (opts.length > 0) setShareWingSlug(opts[0].slug);
      } catch {
        /* section stays usable with what loaded */
      }
      await loadShares();
      setLoading(false);
    })();
  }, [loadShares]);

  const wingLabel = (wingSlug: string) => {
    const wing = wingOptions.find((w) => w.slug === wingSlug || w.id === wingSlug);
    return wing ? wing.name : wingSlug;
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
    color: "#716A5E",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    display: "block",
    marginBottom: "0.5rem",
  };

  return (
    <div style={{
      background: T.color.white,
      borderRadius: "1rem",
      border: "0.0625rem solid #E3D6BC" /* Atrium token: hairline */,
      padding: `${1.75 * scale}rem ${2 * scale}rem`,
      boxShadow: "0 0.25rem 1rem rgba(64,59,54,0.07)", // Atrium token: S1
      marginBottom: "1.5rem",
    }}>
      {/* Toast (section-local) */}
      {toast && (
        <div className="sharing-toast" role={toast.type === "success" ? "status" : "alert"} style={{
          position: "fixed", top: "1rem", right: "1rem", zIndex: 9999,
          padding: "0.875rem 1.25rem", borderRadius: "0.75rem",
          background: toast.type === "success" ? "#56683C" /* Atrium token: sage */ : "#C05050",
          color: T.color.white, fontFamily: T.font.body, fontSize: `${0.9375 * scale}rem`,
          fontWeight: 500, boxShadow: "0 0.5rem 1.5rem rgba(64,59,54,0.14)", // Atrium token: S2
        }}>
          {toast.message}
        </div>
      )}

      <h3 style={{
        fontFamily: T.font.display, fontSize: `${1.1875 * scale}rem`, fontWeight: 600, lineHeight: 1.15,
        color: "#403B36", margin: "0 0 0.375rem",
      }}>
        {tf("wingSharing")}
      </h3>
      <p style={{
        fontFamily: T.font.body, fontSize: `${0.8125 * scale}rem`, color: "#716A5E",
        margin: "0 0 1.25rem", lineHeight: 1.4,
      }}>
        {tf("wingSharingDesc")}
      </p>

      {loading ? (
        <div style={{ padding: "1rem", textAlign: "center", color: "#716A5E", fontFamily: T.font.body }}>...</div>
      ) : (
        <>
          {/* Share a wing form */}
          {members.length > 0 && wingOptions.length > 0 && (
            <div style={{
              padding: "1.25rem 1.375rem",
              background: T.color.linen,
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
                    style={{
                      padding: "0.5rem 1rem",
                      minHeight: "2.75rem",
                      borderRadius: "0.75rem",
                      border: `0.0625rem solid ${shareWingSlug === wing.slug ? "#B85C38" /* Atrium ember */ : "#E3D6BC"}`,
                      background: shareWingSlug === wing.slug ? "#FBF2EC" /* premixed terracotta wash */ : T.color.white,
                      cursor: "pointer",
                      fontFamily: T.font.body,
                      fontSize: "0.8125rem",
                      color: shareWingSlug === wing.slug ? "#9A4F2A" : "#716A5E",
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
                  border: "0.0625rem solid #E3D6BC" /* Atrium hairline */, background: T.color.white,
                  color: "#403B36", outline: "none",
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
                    style={{
                      padding: "0.5rem 1rem",
                      minHeight: "2.75rem",
                      borderRadius: "0.75rem",
                      border: `0.0625rem solid ${sharePermission === perm ? "#B85C38" /* Atrium ember */ : "#E3D6BC"}`,
                      background: sharePermission === perm ? "#FBF2EC" : T.color.white,
                      cursor: "pointer",
                      fontFamily: T.font.body,
                      fontSize: "0.8125rem",
                      color: sharePermission === perm ? "#9A4F2A" : "#716A5E",
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
                style={{
                  padding: "0.75rem 1.75rem",
                  minHeight: "2.75rem",
                  borderRadius: "0.75rem",
                  border: "none",
                  background: !shareMemberEmail || sharing
                    ? T.color.sandstone
                    : "linear-gradient(135deg, #B85C38, #9A4F2A)", /* Atrium: ember → terracotta */
                  color: !shareMemberEmail || sharing ? "#716A5E" : "#FFF",
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
              background: T.color.linen,
              borderRadius: "0.75rem",
              border: "0.0625rem solid #E3D6BC", /* Atrium hairline */
              marginBottom: "1.5rem",
            }}>
              <p style={{
                fontFamily: T.font.body, fontSize: `${0.9375 * scale}rem`, color: "#716A5E",
                margin: 0, lineHeight: 1.5,
              }}>
                {tf("inviteToShare")}
              </p>
            </div>
          )}

          {members.length > 0 && myShares.length === 0 && sharedWithMe.length === 0 && (
            <p style={{
              fontFamily: T.font.body, fontSize: `${0.8125 * scale}rem`, color: "#716A5E",
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
                    background: T.color.linen,
                    border: "0.0625rem solid #E3D6BC", /* Atrium hairline */
                    gap: "0.625rem", flexWrap: "wrap",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", minWidth: 0, flex: 1 }}>
                      <span style={{
                        display: "inline-block",
                        padding: "0.1875rem 0.625rem",
                        borderRadius: "2rem",
                        background: "rgba(154,79,42,0.11)",
                        color: "#9A4F2A", /* Atrium terracotta glyph */
                        fontFamily: T.font.body,
                        fontSize: "0.8125rem",
                        fontWeight: 600,
                        flexShrink: 0,
                      }}>
                        {wingLabel(share.wing_id)}
                      </span>
                      <span style={{
                        fontFamily: T.font.body, fontSize: "0.8125rem", color: "#403B36",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0,
                      }}>
                        {share.shared_with_email}
                      </span>
                      <span style={{
                        fontFamily: T.font.body, fontSize: "0.6875rem", color: "#716A5E",
                        padding: "0.125rem 0.5rem", borderRadius: "0.25rem",
                        background: "rgba(113,106,94,0.12)",
                        flexShrink: 0,
                      }}>
                        {share.permission === "view" ? tf("viewOnly") : tf("canContribute")}
                      </span>
                    </div>
                    {confirmUnshareId === share.id ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", flexShrink: 0 }}>
                        <span style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "#403B36" }}>
                          {tf("confirmUnshareShort")}
                        </span>
                        <button
                          onClick={() => handleUnshareWing(share.id)}
                          style={{
                            padding: "0.375rem 0.75rem", borderRadius: "0.375rem",
                            minHeight: "2.75rem",
                            border: "none", background: "#C05050", color: "#FFF",
                            fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 600,
                            cursor: "pointer", transition: "all .2s ease",
                          }}
                        >
                          {tf("confirmYes")}
                        </button>
                        <button
                          onClick={() => setConfirmUnshareId(null)}
                          style={{
                            padding: "0.375rem 0.75rem", borderRadius: "0.375rem",
                            minHeight: "2.75rem",
                            border: "0.0625rem solid #E3D6BC", /* Atrium hairline */ background: T.color.white,
                            color: "#716A5E", fontFamily: T.font.body, fontSize: "0.6875rem",
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
                        style={{
                          borderRadius: "0.75rem",
                          border: "0.0625rem solid #E3D6BC", /* Atrium hairline */
                          background: "transparent",
                          color: "#716A5E",
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
                      color: "#56683C", /* Atrium sage */
                      fontFamily: T.font.body,
                      fontSize: "0.8125rem",
                      fontWeight: 600,
                      flexShrink: 0,
                    }}>
                      {wingLabel(share.wing_id)}
                    </span>
                    <span style={{
                      fontFamily: T.font.body, fontSize: "0.8125rem", color: "#403B36",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0,
                    }}>
                      {tf("from")} {share.owner_email}
                    </span>
                    <span style={{
                      fontFamily: T.font.body, fontSize: "0.6875rem", color: "#716A5E",
                      padding: "0.125rem 0.5rem", borderRadius: "0.25rem",
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

function PasscodeSection({ scale }: { scale: number }) {
  const { t } = useTranslation("social");
  const { t: ts } = useTranslation("settings");
  const [codes, setCodes] = useState<{ id: string; passcode: string; expiresAt: string; wingId: string | null; roomId: string | null; createdAt: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [wings, setWings] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [selectedWingId, setSelectedWingId] = useState("");
  const [hours, setHours] = useState(24);

  useEffect(() => {
    (async () => {
      const [{ getMyPasscodes }, { getMyPublishableContent }] = await Promise.all([
        import("@/lib/social/passcode-actions"),
        import("@/lib/social/share-actions"),
      ]);
      const [codeResult, content] = await Promise.all([
        getMyPasscodes(),
        getMyPublishableContent(),
      ]);
      if (codeResult.ok) setCodes(codeResult.shares);
      setWings(content.map((w) => ({ id: w.id, name: w.name, slug: w.slug })));
      if (content.length > 0) setSelectedWingId(content[0].id);
      setLoading(false);
    })();
  }, []);

  const handleCreate = async () => {
    if (!selectedWingId) return;
    setCreating(true);
    const { createPasscode } = await import("@/lib/social/passcode-actions");
    const result = await createPasscode({ wingId: selectedWingId, expiresInHours: hours });
    if (result.ok && result.share) {
      setCodes((prev) => [result.share!, ...prev]);
    }
    setCreating(false);
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
      background: T.color.white,
      borderRadius: "1rem",
      border: "0.0625rem solid #E3D6BC" /* Atrium token: hairline */,
      padding: `${1.75 * scale}rem ${2 * scale}rem`,
      boxShadow: "0 0.25rem 1rem rgba(64,59,54,0.07)", // Atrium token: S1
      marginBottom: "1.5rem",
    }}>
      <h3 style={{
        fontFamily: T.font.display, fontSize: `${1.1875 * scale}rem`, fontWeight: 600, lineHeight: 1.15,
        color: "#403B36", margin: "0 0 0.375rem",
      }}>
        {t("passcodeAction")}
      </h3>
      <p style={{
        fontFamily: T.font.body, fontSize: `${0.8125 * scale}rem`, color: "#716A5E",
        margin: "0 0 1.25rem", lineHeight: 1.4,
      }}>
        {t("passcodeDesc") || "Create temporary visiting codes so others can access your palace without publishing."}
      </p>

      {loading ? (
        <div style={{ padding: "1rem", textAlign: "center", color: "#716A5E", fontFamily: T.font.body }}>...</div>
      ) : (
        <>
          {/* Create new code */}
          <div style={{
            display: "flex", gap: "0.5rem", alignItems: "flex-end", flexWrap: "wrap",
            marginBottom: codes.length > 0 ? "1.25rem" : 0,
          }}>
            <div style={{ flex: 1, minWidth: "8rem" }}>
              <label style={{ fontFamily: T.font.body, fontSize: `${0.8125 * scale}rem`, color: "#716A5E", display: "block", marginBottom: "0.25rem" }}>
                Wing
              </label>
              <select
                value={selectedWingId}
                onChange={(e) => setSelectedWingId(e.target.value)}
                style={{
                  width: "100%", fontFamily: T.font.body, fontSize: `${0.8125 * scale}rem`,
                  padding: "0.5rem 0.625rem", borderRadius: "0.75rem", // Atrium: small-control radius
                  border: "0.0625rem solid #E3D6BC" /* Atrium token: hairline */, background: T.color.linen,
                  color: "#403B36", outline: "none",
                }}
              >
                {wings.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
            <div style={{ minWidth: "5rem" }}>
              <label style={{ fontFamily: T.font.body, fontSize: `${0.8125 * scale}rem`, color: "#716A5E", display: "block", marginBottom: "0.25rem" }}>
                {t("passcodeExpiry") || "Duration"}
              </label>
              <select
                value={hours}
                onChange={(e) => setHours(Number(e.target.value))}
                style={{
                  width: "100%", fontFamily: T.font.body, fontSize: `${0.8125 * scale}rem`,
                  padding: "0.5rem 0.625rem", borderRadius: "0.75rem", // Atrium: small-control radius
                  border: "0.0625rem solid #E3D6BC" /* Atrium token: hairline */, background: T.color.linen,
                  color: "#403B36", outline: "none",
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
              style={{
                fontFamily: T.font.body, fontSize: `${0.8125 * scale}rem`, fontWeight: 600,
                padding: "0.5rem 1rem", borderRadius: "0.75rem", border: "none", // Atrium: small-control radius
                background: "linear-gradient(135deg, #B85C38, #9A4F2A)", // Atrium: ember → terracotta
                color: T.color.cream, cursor: creating ? "wait" : "pointer",
                opacity: creating ? 0.6 : 1, whiteSpace: "nowrap",
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
                      background: T.color.linen, border: "0.0625rem solid #E3D6BC" /* Atrium token: hairline */,
                      gap: "0.75rem", flexWrap: "wrap",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1, minWidth: 0 }}>
                      <code style={{
                        fontFamily: "monospace", fontSize: `${1 * scale}rem`, fontWeight: 700,
                        color: "#9A4F2A" /* Atrium token: terracotta glyph */, letterSpacing: "0.1em",
                        background: "rgba(154,79,42,0.11)", padding: "0.25rem 0.625rem",
                        borderRadius: "0.375rem",
                      }}>
                        {code.passcode.toUpperCase()}
                      </code>
                      <span style={{ fontFamily: T.font.body, fontSize: `${0.8125 * scale}rem`, color: "#716A5E" }}>
                        {wing?.name || "—"} · {formatExpiry(code.expiresAt)}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRevoke(code.id)}
                      style={{
                        fontFamily: T.font.body, fontSize: `${0.8125 * scale}rem`,
                        padding: "0.25rem 0.625rem", borderRadius: "0.75rem", // Atrium: small-control radius
                        border: `0.0625rem solid #C0505030`, background: "transparent",
                        color: "#C05050", cursor: "pointer",
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
