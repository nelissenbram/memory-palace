"use client";

import { useState, useEffect, useCallback, memo } from "react";
import Link from "next/link";
import { T } from "@/lib/theme";
import { INK, MUTED, EMBER, EMBER_GLYPH, HAIRLINE, CREAM, TRAY, CARD_BORDER, RT } from "@/lib/libraryTokens";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useIsMobile, useIsTablet } from "@/lib/hooks/useIsMobile";
import { SettingsPageHeader } from "../_SettingsChrome";

/* ── Surface-local neutral (canon-derived) ── */
const DISABLED = "#EEE9DF"; // muted disabled fill — sandstone neutral
import {
  createFamilyGroup,
  inviteFamilyMember,
  acceptFamilyInvite,
  removeFamilyMember,
  cancelFamilyInvite,
  resendFamilyInvite,
  updateFamilyMemberRole,
  getAllFamilyGroups,
  updateFamilyGroup,
  deleteFamilyGroup,
} from "@/lib/auth/family-actions";

interface FamilyMember {
  id: string;
  group_id: string;
  user_id: string | null;
  email: string;
  role: "owner" | "admin" | "member";
  status: "invited" | "active";
  joined_at: string | null;
}

interface FamilyGroup {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
}

/* ── Inline SVG icons (Roman/Tuscan aesthetic) ── */
function FamilyIcon({ name, size = 20, color = "currentColor" }: { name: "palace" | "link" | "lock"; size?: number; color?: string }) {
  const s = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "palace":
      return (
        <svg {...s}>
          <path d="M3 10l9-6 9 6" />
          <path d="M5 10v10h14V10" />
          <path d="M9 20v-6h2v6M13 20v-6h2v6" />
          <path d="M3 20h18" />
        </svg>
      );
    case "link":
      return (
        <svg {...s}>
          <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
        </svg>
      );
    case "lock":
      return (
        <svg {...s}>
          <rect x="4" y="11" width="16" height="10" rx="2" />
          <path d="M8 11V8a4 4 0 018 0v3" />
        </svg>
      );
  }
}

interface FamilyGroupEntry {
  group: FamilyGroup;
  members: FamilyMember[];
  userRole: string;
}

interface PendingInviteEntry {
  group: FamilyGroup;
  userRole: string;
}

/* Pure, dependency-free — hoisted to module scope so it's a stable reference for
   both the page header and the memoized GroupCard. */
const roleColor = (role: string) => {
  if (role === "owner") return EMBER_GLYPH; /* terracotta glyph */
  if (role === "admin") return MUTED; /* warm walnut neutral — NOT gold (gold is ceremonial-only) */
  return T.color.sage; /* canon sage */
};

/* ─────────────────────────────────────────────────────────────────────────────
   GroupCard — one family-group card.

   PERF: extracted from an inline `renderGroupCard()` closure into a real
   React.memo component. Previously every keystroke in ANY invite/rename input
   re-rendered the whole page and rebuilt the JSX (and all inline style objects)
   for every group card + member row. Now:
     • The invite email/role and the rename text live in LOCAL state here, so a
       keystroke re-renders only the active card, not its siblings.
     • All parent handlers are useCallback-stable and per-card flags are booleans,
       so memo bails out for every card that didn't actually change.
   Behaviour is unchanged: the invite section only mounts while the card is
   expanded (unmount clears local state — same effect as the old expand-reset),
   and a successful invite clears the local fields via the boolean returned by
   handleInvite.
   ──────────────────────────────────────────────────────────────────────────── */
interface GroupCardProps {
  entry: FamilyGroupEntry;
  isExpanded: boolean;
  isEditing: boolean;
  isDeleteConfirmOpen: boolean;
  isDeleting: boolean;
  renamingSaving: boolean;
  isInviting: boolean;
  resendingId: string | null;
  removingMemberId: string | null;
  confirmRemoveMember: { groupId: string; userId: string; email: string } | null;
  userEmail: string;
  isMobile: boolean;
  isTablet: boolean;
  t: (key: string, vars?: Record<string, string>) => string;
  onToggleExpand: (id: string) => void;
  onStartEdit: (id: string) => void;
  onCancelEdit: () => void;
  onShowDelete: (id: string) => void;
  onHideDelete: () => void;
  onSetConfirmRemove: (v: { groupId: string; userId: string; email: string } | null) => void;
  handleDeleteGroup: (groupId: string, groupName: string) => void | Promise<void>;
  handleRenameGroup: (groupId: string, name: string) => void | Promise<void>;
  handleInvite: (groupId: string, email: string, role: "admin" | "member") => Promise<boolean>;
  handleResendInvite: (groupId: string, member: FamilyMember) => void | Promise<void>;
  handleCancelInvite: (groupId: string, memberId: string, email: string) => void | Promise<void>;
  handleToggleRole: (groupId: string, userId: string, currentRole: string) => void | Promise<void>;
  handleRemoveMember: (groupId: string, userId: string, email: string) => void | Promise<void>;
}

const GroupCard = memo(function GroupCard({
  entry,
  isExpanded,
  isEditing,
  isDeleteConfirmOpen,
  isDeleting,
  renamingSaving,
  isInviting,
  resendingId,
  removingMemberId,
  confirmRemoveMember,
  userEmail,
  isMobile,
  isTablet,
  t,
  onToggleExpand,
  onStartEdit,
  onCancelEdit,
  onShowDelete,
  onHideDelete,
  onSetConfirmRemove,
  handleDeleteGroup,
  handleRenameGroup,
  handleInvite,
  handleResendInvite,
  handleCancelInvite,
  handleToggleRole,
  handleRemoveMember,
}: GroupCardProps) {
  const { group: g, members: gMembers, userRole: gUserRole } = entry;
  const grp = g as FamilyGroup;
  const mems = gMembers as FamilyMember[];
  const canManage = gUserRole === "owner" || gUserRole === "admin";
  const isCreator = gUserRole === "owner";
  const activeMembers = mems.filter((m) => m.status === "active");
  const pendingMembers = mems.filter((m) => m.status === "invited");
  const hasOnlyOwner = activeMembers.length <= 1 && pendingMembers.length === 0;

  // Local, per-card form state — a keystroke here re-renders only THIS card.
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [editName, setEditName] = useState(grp.name);

  // When the parent opens the rename form for this card, seed the local field
  // with the current group name (mirrors the old setEditGroupName(grp.name)).
  useEffect(() => {
    if (isEditing) setEditName(grp.name);
  }, [isEditing, grp.name]);

  // Single source of truth for the invite button's enabled state (styling + disabled agree).
  const inviteDisabled = !inviteEmail.trim() || !inviteEmail.includes("@") || isInviting;

  const submitInvite = async () => {
    const ok = await handleInvite(grp.id, inviteEmail, inviteRole);
    if (ok) {
      setInviteEmail("");
      setInviteRole("member");
    }
  };

  return (
    <div style={{
      background: T.color.white,
      borderRadius: "1rem",
      border: isExpanded ? `0.125rem solid ${EMBER}` : `0.0625rem solid ${HAIRLINE}`, /* ember active / hairline */
      boxShadow: "0 0.25rem 1rem rgba(64,59,54,0.07), inset 0 0.0625rem 0 rgba(255,255,255,0.5)", /* Atrium token S1 + top highlight */
      marginBottom: "1rem",
      overflow: "hidden",
      transition: "border-color .2s",
    }}>
      {/* Delete confirmation dialog */}
      {isDeleteConfirmOpen && (
        <div style={{
          padding: "1.25rem 1.5rem",
          background: `${T.color.error}08`,
          borderBottom: `0.0625rem solid ${T.color.error}20`,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem",
          flexWrap: "wrap",
        }}>
          <p style={{
            fontFamily: T.font.body, fontSize: "0.9375rem", color: INK,
            margin: 0, lineHeight: 1.5, flex: 1,
          }}>
            {t("deleteGroupConfirm")}
          </p>
          <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
            <button
              onClick={onHideDelete}
              className="mp-fam-quiet"
              style={{
                padding: "0.5rem 1rem",
                minHeight: "2.75rem",
                borderRadius: "0.75rem",
                border: `0.0625rem solid ${HAIRLINE}`,
                background: T.color.white,
                color: MUTED,
                fontFamily: T.font.body,
                fontSize: "0.8125rem",
                fontWeight: 500,
                cursor: "pointer",
                transition: "all .2s ease",
              }}
            >
              {t("cancel")}
            </button>
            <button
              onClick={() => handleDeleteGroup(grp.id, grp.name)}
              disabled={isDeleting}
              style={{
                padding: "0.5rem 1rem",
                minHeight: "2.75rem",
                borderRadius: "0.75rem",
                border: "none",
                background: isDeleting ? `${T.color.error}60` : T.color.error,
                color: "#FFF",
                fontFamily: T.font.body,
                fontSize: "0.8125rem",
                fontWeight: 600,
                cursor: isDeleting ? "default" : "pointer",
                transition: "all .2s ease",
                opacity: isDeleting ? 0.7 : 1,
              }}
            >
              {isDeleting ? t("deleting") : t("deleteGroup")}
            </button>
          </div>
        </div>
      )}

      {/* Inline rename form */}
      {isEditing && (
        <div style={{
          padding: "1rem 1.5rem",
          background: CREAM,
          borderBottom: `0.0625rem solid ${HAIRLINE}`,
          display: "flex", flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "stretch" : "center", gap: "0.625rem",
        }}>
          <input
            className="mp-settings-input"
            autoFocus
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder={t("renameGroupPlaceholder")}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRenameGroup(grp.id, editName);
              if (e.key === "Escape") { onCancelEdit(); }
            }}
            style={{ ...inputStyle, flex: 1, marginBottom: 0 }}
          />
          <button
            onClick={() => handleRenameGroup(grp.id, editName)}
            disabled={!editName.trim() || renamingSaving}
            style={{
              padding: "0.625rem 1.25rem",
              minHeight: "2.75rem",
              borderRadius: "0.75rem",
              border: "none",
              background: !editName.trim() || renamingSaving
                ? DISABLED
                : EMBER,
              color: !editName.trim() || renamingSaving ? MUTED : "#FFF",
              fontFamily: T.font.body,
              fontSize: "0.8125rem",
              fontWeight: 600,
              cursor: !editName.trim() || renamingSaving ? "default" : "pointer",
              transition: "all .2s ease",
              flexShrink: 0,
              width: isMobile ? "100%" : undefined,
            }}
          >
            {renamingSaving ? t("renaming") : t("save")}
          </button>
          <button
            onClick={onCancelEdit}
            className="mp-fam-quiet"
            style={{
              padding: "0.625rem 1rem",
              minHeight: "2.75rem",
              borderRadius: "0.75rem",
              border: `0.0625rem solid ${HAIRLINE}`,
              background: "transparent",
              color: MUTED,
              fontFamily: T.font.body,
              fontSize: "0.8125rem",
              fontWeight: 500,
              cursor: "pointer",
              transition: "all .2s ease",
              flexShrink: 0,
              width: isMobile ? "100%" : undefined,
            }}
          >
            {t("cancel")}
          </button>
        </div>
      )}

      {/* Clickable group header — a non-interactive row so the edit/delete buttons
          can be REAL siblings (never nest interactive controls inside a button). */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-controls={`fam-group-panel-${grp.id}`}
        onClick={() => onToggleExpand(isExpanded ? "" : grp.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggleExpand(isExpanded ? "" : grp.id);
          }
        }}
        className="mp-fam-header"
        style={{
          width: "100%",
          padding: isMobile ? "1.25rem 1rem" : isTablet ? "1.375rem 1.75rem" : "1.25rem 1.5rem",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          display: "flex", alignItems: "center", gap: "1rem",
          textAlign: "left",
        }}
      >
        <div style={{
          width: "3rem", height: "3rem", borderRadius: "0.875rem",
          background: `linear-gradient(135deg, rgba(154,79,42,0.14), rgba(154,79,42,0.07))`,
          display: "flex", alignItems: "center", justifyContent: "center",
          border: `0.0625rem solid ${CARD_BORDER}`, /* warm card edge */
          flexShrink: 0,
          color: EMBER_GLYPH,
        }}>
          <FamilyIcon name="palace" size={22} color={EMBER_GLYPH} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{
            fontFamily: T.font.display, fontSize: RT.titleM, fontWeight: 600,
            color: INK, margin: 0,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {grp.name}
          </h3>
          <div style={{
            fontFamily: T.font.body, fontSize: "0.8125rem", color: MUTED, marginTop: "0.125rem",
            display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap",
          }}>
            <span>{mems.length !== 1 ? t("membersCount", { count: String(mems.length) }) : t("memberCount", { count: String(mems.length) })}</span>
            <span style={{ color: HAIRLINE }}>{"·"}</span>
            <span style={{
              display: "inline-block",
              padding: "0.125rem 0.5rem",
              borderRadius: "0.375rem",
              background: `${roleColor(gUserRole)}15`,
              color: roleColor(gUserRole),
              fontSize: "0.6875rem",
              fontWeight: 600,
              textTransform: "capitalize",
            }}>
              {gUserRole === "owner" ? t("roleOwner") : gUserRole === "admin" ? t("roleAdmin") : t("roleMember")}
            </span>
          </div>
        </div>

        {/* Edit & Delete buttons (shown for owner/admin) */}
        {canManage && (
          <div
            style={{ display: "flex", gap: "0.375rem", flexShrink: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Edit (pencil) button — owner or admin */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStartEdit(grp.id);
              }}
              aria-label={t("renameGroup")}
              title={t("renameGroup")}
              style={{
                width: "2.25rem", height: "2.25rem", borderRadius: "0.75rem",
                border: `0.0625rem solid ${HAIRLINE}`,
                background: "rgba(154,79,42,0.06)",
                color: EMBER_GLYPH,
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all .2s ease",
              }}
            >
              <svg style={{ width: "0.875rem", height: "0.875rem" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                <path d="m15 5 4 4" />
              </svg>
            </button>
            {/* Delete (trash) button — only creator */}
            {isCreator && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onShowDelete(grp.id);
                }}
                aria-label={t("deleteGroup")}
                title={t("deleteGroup")}
                style={{
                  width: "2.25rem", height: "2.25rem", borderRadius: "0.75rem",
                  border: `0.0625rem solid ${HAIRLINE}`,
                  background: `${T.color.error}06`,
                  color: T.color.error,
                  cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all .2s ease",
                }}
              >
                <svg style={{ width: "0.875rem", height: "0.875rem" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </svg>
              </button>
            )}
          </div>
        )}

        <svg
          viewBox="0 0 24 24"
          fill="none" stroke={MUTED} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
          style={{ width: "1.25rem", height: "1.25rem", flexShrink: 0, transform: isExpanded ? "rotate(90deg)" : "none", transition: "transform .2s" }}
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div id={`fam-group-panel-${grp.id}`} style={{ padding: isMobile ? "0 1rem 1.25rem" : "0 1.5rem 1.5rem" }}>
          {/* Invite first member CTA */}
          {hasOnlyOwner && canManage && (
            <div style={{
              padding: "1.25rem 1.5rem",
              background: `linear-gradient(135deg, rgba(154,79,42,0.06), rgba(154,79,42,0.03))`,
              borderRadius: "0.875rem",
              border: "0.09375rem dashed rgba(154,79,42,0.4)",
              marginBottom: "1.25rem",
              textAlign: "center",
            }}>
              <p style={{
                fontFamily: T.font.body, fontSize: "0.9375rem", color: INK, /* Atrium token: ink */
                margin: "0 0 1rem", lineHeight: 1.5,
              }}>
                {t("inviteFirstMember")}
              </p>
              <button
                onClick={() => {
                  const el = document.getElementById(`invite-email-${grp.id}`);
                  if (el) {
                    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
                    el.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
                    el.focus();
                  }
                }}
                style={{
                  padding: "0.75rem 1.75rem",
                  minHeight: "2.75rem",
                  borderRadius: "0.75rem",
                  border: "none",
                  background: `linear-gradient(135deg, ${EMBER}, ${EMBER_GLYPH})`, /* ember register */
                  color: "#FFF",
                  fontFamily: T.font.body,
                  fontSize: "0.9375rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all .2s",
                }}
              >
                {t("inviteFirstMemberCta")}
              </button>
            </div>
          )}

          {/* Invite section */}
          {canManage && (
            <div style={{
              padding: "1.25rem 1.375rem",
              background: CREAM,
              borderRadius: "0.875rem",
              border: `0.0625rem solid ${HAIRLINE}`,
              marginBottom: "1.25rem",
            }}>
              <label htmlFor={`invite-email-${grp.id}`} style={labelStyle}>{t("inviteMember")}</label>
              <p style={{
                fontFamily: T.font.body, fontSize: "0.8125rem", color: MUTED,
                margin: "0 0 0.75rem", lineHeight: 1.5,
              }}>
                {t("inviteExplanation")}
              </p>
              <div style={{
                display: "flex", flexDirection: isMobile ? "column" : "row",
                gap: "0.625rem", marginBottom: "0.75rem",
              }}>
                <input
                  className="mp-settings-input"
                  id={`invite-email-${grp.id}`}
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder={t("emailPlaceholder")}
                  onKeyDown={(e) => { if (e.key === "Enter") submitInvite(); }}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  onClick={submitInvite}
                  disabled={inviteDisabled}
                  style={{
                    padding: "0.875rem 1.5rem",
                    minHeight: "2.75rem",
                    borderRadius: "0.75rem",
                    border: "none",
                    background: inviteDisabled ? DISABLED : EMBER,
                    color: inviteDisabled ? MUTED : "#FFF",
                    fontFamily: T.font.body,
                    fontSize: "0.9375rem",
                    fontWeight: 600,
                    cursor: inviteDisabled ? "default" : "pointer",
                    transition: "all .2s ease",
                    flexShrink: 0,
                    width: isMobile ? "100%" : undefined,
                  }}
                >
                  {isInviting ? t("inviting") : t("invite")}
                </button>
              </div>

              <div
                role="radiogroup"
                aria-label={t("inviteMember")}
                style={{ display: "flex", gap: "0.5rem", marginBottom: "0.875rem" }}
              >
                {(["member", "admin"] as const).map((r) => {
                  const selected = inviteRole === r;
                  return (
                  <button
                    key={r}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    tabIndex={selected ? 0 : -1}
                    onClick={() => setInviteRole(r)}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowUp") {
                        e.preventDefault();
                        setInviteRole((prev) => (prev === "member" ? "admin" : "member"));
                      }
                    }}
                    style={{
                      padding: "0.5rem 1rem",
                      minHeight: "2.75rem",
                      borderRadius: "0.75rem",
                      border: `0.0625rem solid ${selected ? EMBER_GLYPH + "40" : HAIRLINE}`,
                      background: selected ? `${EMBER_GLYPH}10` : T.color.white,
                      cursor: "pointer",
                      fontFamily: T.font.body,
                      fontSize: "0.8125rem",
                      color: selected ? EMBER_GLYPH : MUTED,
                      fontWeight: selected ? 600 : 500,
                      transition: "all .2s ease",
                      textAlign: "left",
                      flex: 1,
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: "0.125rem" }}>
                      {r === "member" ? t("roleMember") : t("roleAdmin")}
                    </div>
                    <div style={{
                      fontSize: "0.8125rem", fontWeight: 500,
                      color: selected ? EMBER_GLYPH : MUTED,
                    }}>
                      {r === "member" ? t("roleMemberDesc") : t("roleAdminDesc")}
                    </div>
                  </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pending invites */}
          {pendingMembers.length > 0 && (
            <div style={{ marginBottom: "1.25rem" }}>
              <label style={labelStyle}>{t("pendingInvites")}</label>
              <div role="list" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {pendingMembers.map((member) => (
                  <div key={member.id} role="listitem" style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "0.75rem 1rem", borderRadius: "0.75rem",
                    background: `${EMBER_GLYPH}06`,
                    border: `0.0625rem dashed ${EMBER_GLYPH}25`,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", minWidth: 0 }}>
                      <div style={{
                        width: "2.25rem", height: "2.25rem", borderRadius: "1.125rem",
                        background: `${EMBER_GLYPH}15`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontFamily: T.font.body, fontSize: "0.9375rem", fontWeight: 600,
                        color: EMBER_GLYPH,
                      }}>
                        {member.email.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{
                          fontFamily: T.font.body, fontSize: "0.9375rem", fontWeight: 500,
                          color: INK,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {member.email}
                        </div>
                        <div style={{
                          fontFamily: T.font.body, fontSize: "0.8125rem", color: MUTED,
                          display: "flex", alignItems: "center", gap: "0.375rem", marginTop: "0.125rem",
                        }}>
                          <span style={{
                            display: "inline-block", width: "0.375rem", height: "0.375rem",
                            borderRadius: "50%", background: "rgba(154,79,42,0.6)", /* pre-mixed, no double-dimming */
                          }} />
                          {t("statusInvited")}
                        </div>
                      </div>
                    </div>
                    {canManage && (
                      <div style={{ display: "flex", gap: "0.375rem", flexShrink: 0 }}>
                        <button
                          onClick={() => handleResendInvite(grp.id, member)}
                          disabled={resendingId === member.id}
                          style={{
                            padding: "0.375rem 0.75rem",
                            minHeight: "2.75rem",
                            borderRadius: "0.75rem",
                            border: `0.0625rem solid ${EMBER_GLYPH}30`,
                            background: T.color.white,
                            color: EMBER_GLYPH,
                            fontFamily: T.font.body,
                            fontSize: "0.8125rem",
                            fontWeight: 600,
                            cursor: resendingId === member.id ? "default" : "pointer",
                            transition: "all .2s ease",
                            opacity: resendingId === member.id ? 0.5 : 1,
                          }}
                        >
                          {resendingId === member.id ? t("resending") : t("resend")}
                        </button>
                        <button
                          onClick={() => handleCancelInvite(grp.id, member.id, member.email)}
                          aria-label={t("removeMember", { email: member.email })}
                          title={t("cancelInvite")}
                          style={{
                            width: "2rem", height: "2rem", borderRadius: "0.75rem",
                            border: `0.0625rem solid ${HAIRLINE}`,
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
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active members list */}
          <label style={labelStyle}>{t("members")}</label>
          {activeMembers.length === 0 && (
            <p style={{
              fontFamily: T.font.body, fontSize: "0.8125rem", color: MUTED,
              margin: "0 0 1rem", lineHeight: 1.5, fontStyle: "italic",
              padding: "1rem 1.25rem",
              background: CREAM,
              borderRadius: "0.75rem",
              border: `0.0625rem solid ${HAIRLINE}`,
            }}>
              {t("noActiveMembers")}
            </p>
          )}
          <div role="list" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {activeMembers.map((member) => (
              <div key={member.id} role="listitem" style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "0.875rem 1.125rem", borderRadius: "0.75rem",
                background: CREAM,
                border: `0.0625rem solid ${HAIRLINE}`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div style={{
                    width: "2.5rem", height: "2.5rem", borderRadius: "1.25rem",
                    background: `linear-gradient(135deg, ${roleColor(member.role)}25, ${roleColor(member.role)}10)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: T.font.display, fontSize: "1.0625rem", fontWeight: 600,
                    color: roleColor(member.role),
                    border: `0.09375rem solid ${roleColor(member.role)}20`,
                  }}>
                    {member.email.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{
                      fontFamily: T.font.body, fontSize: "0.9375rem", fontWeight: 500,
                      color: INK,
                    }}>
                      {member.email}
                      {member.email.toLowerCase() === userEmail.toLowerCase() && (
                        <span style={{
                          fontFamily: T.font.body, fontSize: "0.6875rem", color: MUTED,
                          marginLeft: "0.375rem", fontStyle: "italic",
                        }}>({t("youLabel")})</span>
                      )}
                    </div>
                    <div style={{
                      fontFamily: T.font.body, fontSize: "0.8125rem", color: MUTED,
                      display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.125rem",
                    }}>
                      <span style={{
                        display: "inline-block",
                        padding: "0.0625rem 0.5rem",
                        borderRadius: "0.375rem",
                        background: `${roleColor(member.role)}15`,
                        color: roleColor(member.role),
                        fontSize: "0.6875rem",
                        fontWeight: 600,
                        textTransform: "capitalize",
                      }}>
                        {member.role === "owner" ? t("roleOwner") : member.role === "admin" ? t("roleAdmin") : t("roleMember")}
                      </span>
                      <span style={{ color: T.color.sage, display: "flex", alignItems: "center", gap: "0.25rem" }}>
                        <span style={{
                          display: "inline-block", width: "0.375rem", height: "0.375rem",
                          borderRadius: "50%", background: T.color.sage,
                        }} />
                        {t("statusActive")}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", flexShrink: 0 }}>
                  {member.email.toLowerCase() !== userEmail.toLowerCase() && (
                    <a
                      href={`mailto:${member.email}`}
                      aria-label={t("sendEmail", { email: member.email })}
                      title={t("sendEmail", { email: member.email })}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: "0.375rem",
                        padding: "0.375rem 0.75rem",
                        borderRadius: "0.75rem",
                        border: `0.0625rem solid ${T.color.sage}30`,
                        background: `${T.color.sage}08`,
                        color: T.color.sage,
                        fontFamily: T.font.body,
                        fontSize: "0.8125rem",
                        fontWeight: 600,
                        textDecoration: "none",
                        cursor: "pointer",
                        transition: "all .2s ease",
                        minHeight: "2rem",
                      }}
                    >
                      <svg style={{ width: "0.875rem", height: "0.875rem" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                        <rect width="20" height="16" x="2" y="4" rx="2" />
                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                      </svg>
                      {t("contactMember")}
                    </a>
                  )}
                  {canManage && member.role !== "owner" && member.user_id && (
                    <button
                      onClick={() => handleToggleRole(grp.id, member.user_id!, member.role)}
                      title={member.role === "admin" ? t("makeMember") : t("makeAdmin")}
                      style={{
                        padding: "0.375rem 0.625rem", borderRadius: "0.75rem",
                        border: `0.0625rem solid ${EMBER_GLYPH}30`,
                        background: T.color.white,
                        color: EMBER_GLYPH,
                        fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 600,
                        cursor: "pointer", transition: "all .2s ease",
                        minHeight: "2.75rem",
                      }}
                    >
                      {member.role === "admin" ? t("makeMember") : t("makeAdmin")}
                    </button>
                  )}
                  {canManage && member.role !== "owner" && member.user_id && (
                    confirmRemoveMember?.userId === member.user_id && confirmRemoveMember?.groupId === grp.id ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                        <span style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: INK }}>
                          {t("confirmRemoveShort")}
                        </span>
                        <button
                          onClick={() => handleRemoveMember(grp.id, member.user_id!, member.email)}
                          disabled={removingMemberId === member.user_id}
                          style={{
                            padding: "0.25rem 0.625rem", borderRadius: "0.375rem",
                            border: "none", background: T.color.error, color: "#FFF",
                            fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 600,
                            cursor: removingMemberId === member.user_id ? "default" : "pointer",
                            opacity: removingMemberId === member.user_id ? 0.7 : 1,
                            transition: "all .2s ease",
                          }}
                        >
                          {removingMemberId === member.user_id ? t("removing") : t("confirmYes")}
                        </button>
                        <button
                          onClick={() => onSetConfirmRemove(null)}
                          style={{
                            padding: "0.25rem 0.625rem", borderRadius: "0.375rem",
                            border: `0.0625rem solid ${HAIRLINE}`, background: T.color.white,
                            color: MUTED, fontFamily: T.font.body, fontSize: "0.6875rem",
                            fontWeight: 500, cursor: "pointer", transition: "all .2s ease",
                          }}
                        >
                          {t("cancel")}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => onSetConfirmRemove({ groupId: grp.id, userId: member.user_id!, email: member.email })}
                        aria-label={t("removeMember", { email: member.email })}
                        style={{
                          width: "2rem", height: "2rem", borderRadius: "0.75rem",
                          border: `0.0625rem solid ${HAIRLINE}`,
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
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

export default function FamilyPage() {
  const { t } = useTranslation("familySettings");
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  // Multi-group state
  const [groups, setGroups] = useState<FamilyGroupEntry[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInviteEntry[]>([]);
  const [userEmail, setUserEmail] = useState<string>("");
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [confirmRemoveMember, setConfirmRemoveMember] = useState<{ groupId: string; userId: string; email: string } | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [groupName, setGroupName] = useState("");
  const [saving, setSaving] = useState(false);
  const [invitingGroupId, setInvitingGroupId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [renamingSaving, setRenamingSaving] = useState(false);
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Per-invite email/role now live locally inside each GroupCard, so there is no
  // shared field to reset — a collapsed card unmounts its invite section (and thus
  // its local state), guaranteeing role/email never leak across groups.

  const loadGroups = useCallback(async () => {
    try {
      const result = await getAllFamilyGroups();
      setGroups((result.groups || []) as unknown as FamilyGroupEntry[]);
      setPendingInvites((result.pendingInvites || []) as unknown as PendingInviteEntry[]);
      setUserEmail(result.userEmail || "");
      // Auto-expand the first group if only one exists
      if (result.groups.length === 1 && !expandedGroupId) {
        setExpandedGroupId((result.groups[0].group as unknown as FamilyGroup).id);
      }
    } catch {
      showToast(t("loadError"), "error");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { loadGroups(); }, [loadGroups]);

  const handleCreateGroup = async () => {
    if (!groupName.trim()) return;
    setSaving(true);
    const result = await createFamilyGroup(groupName.trim());
    setSaving(false);
    if (result.error) {
      showToast(result.error, "error");
    } else {
      showToast(t("groupCreated"), "success");
      setGroupName("");
      setShowCreateForm(false);
      if (result.group) {
        setExpandedGroupId(result.group.id);
      }
      await loadGroups();
    }
  };

  // Returns true when the invite succeeded so the calling GroupCard can clear its
  // local email/role fields (behaviour identical to the old global-state reset).
  const handleInvite = useCallback(async (groupId: string, email: string, role: "admin" | "member"): Promise<boolean> => {
    if (!email.trim() || !email.includes("@")) {
      if (email.trim()) showToast(t("inviteInvalidEmail"), "error");
      return false;
    }
    setInvitingGroupId(groupId);
    const result = await inviteFamilyMember(groupId, email.trim(), role);
    setInvitingGroupId(null);
    if (result.error) {
      showToast(result.error, "error");
      return false;
    } else {
      showToast(t("inviteSent", { email: email.trim() }), "success");
      await loadGroups();
      return true;
    }
  }, [showToast, t, loadGroups]);

  const handleResendInvite = useCallback(async (groupId: string, member: FamilyMember) => {
    setResendingId(member.id);
    // Idempotent resend: the server re-sends the email for the EXISTING invite row and
    // never deletes it, so a failure can never drop the invite. On error the row is still
    // intact and the user can simply retry.
    try {
      const result = await resendFamilyInvite(groupId, member.id);
      if (result.error) {
        showToast(result.error, "error");
      } else {
        showToast(t("inviteResent", { email: member.email }), "success");
      }
    } catch {
      showToast(t("resendFailed"), "error");
    } finally {
      setResendingId(null);
      // Refresh so the UI reflects the true server state.
      await loadGroups();
    }
  }, [showToast, t, loadGroups]);

  const handleAcceptInvite = useCallback(async (groupId: string) => {
    setSaving(true);
    const result = await acceptFamilyInvite(groupId);
    setSaving(false);
    if (result.error) {
      showToast(result.error, "error");
    } else {
      showToast(t("joinedSuccess"), "success");
      setExpandedGroupId(groupId);
      await loadGroups();
    }
  }, [showToast, t, loadGroups]);

  const handleCancelInvite = useCallback(async (groupId: string, memberId: string, email: string) => {
    const result = await cancelFamilyInvite(groupId, memberId);
    if (result.error) {
      showToast(result.error, "error");
    } else {
      showToast(t("memberRemoved", { email }), "success");
      await loadGroups();
    }
  }, [showToast, t, loadGroups]);

  const handleToggleRole = useCallback(async (groupId: string, userId: string, currentRole: string) => {
    const newRole = currentRole === "admin" ? "member" : "admin";
    const result = await updateFamilyMemberRole(groupId, userId, newRole);
    if (result.error) {
      showToast(result.error, "error");
    } else {
      showToast(t("roleUpdated"), "success");
      await loadGroups();
    }
  }, [showToast, t, loadGroups]);

  const handleRemoveMember = useCallback(async (groupId: string, userId: string, email: string) => {
    setRemovingMemberId(userId);
    const result = await removeFamilyMember(groupId, userId);
    setRemovingMemberId(null);
    setConfirmRemoveMember(null);
    if (result.error) {
      showToast(result.error, "error");
    } else {
      showToast(t("memberRemoved", { email }), "success");
      await loadGroups();
    }
  }, [showToast, t, loadGroups]);

  // Accepts the new name from the card's local edit field (was global editGroupName).
  const handleRenameGroup = useCallback(async (groupId: string, name: string) => {
    if (!name.trim()) return;
    setRenamingSaving(true);
    const result = await updateFamilyGroup(groupId, { name: name.trim() });
    setRenamingSaving(false);
    if (result.error) {
      showToast(result.error, "error");
    } else {
      showToast(t("groupRenamed", { name: name.trim() }), "success");
      setEditingGroupId(null);
      await loadGroups();
    }
  }, [showToast, t, loadGroups]);

  const handleDeleteGroup = useCallback(async (groupId: string, groupNameArg: string) => {
    setDeletingGroupId(groupId);
    const result = await deleteFamilyGroup(groupId);
    setDeletingGroupId(null);
    setShowDeleteConfirm(null);
    if (result.error) {
      showToast(result.error, "error");
    } else {
      showToast(t("groupDeleted", { name: groupNameArg }), "success");
      setExpandedGroupId((prev) => (prev === groupId ? null : prev));
      await loadGroups();
    }
  }, [showToast, t, loadGroups]);

  // Stable card handlers (identity never changes → memo can bail for untouched cards).
  const onToggleExpand = useCallback((id: string) => {
    // "" means "collapse the currently-open card" (the card passes "" when it's the open one).
    setExpandedGroupId(id === "" ? null : id);
  }, []);
  const onStartEdit = useCallback((id: string) => { setEditingGroupId(id); }, []);
  const onCancelEdit = useCallback(() => { setEditingGroupId(null); }, []);
  const onShowDelete = useCallback((id: string) => { setShowDeleteConfirm(id); }, []);
  const onHideDelete = useCallback(() => { setShowDeleteConfirm(null); }, []);

  if (loading) {
    return (
      <div>
        <div style={{ marginBottom: "2rem" }}>
          <SettingsPageHeader
            hidden={isMobile}
            icon="family"
            title={t("title")}
            subtitle={t("description")}
          />
        </div>
        <div
          role="status"
          aria-live="polite"
          style={{
            background: T.color.white,
            borderRadius: "1rem",
            border: `0.0625rem solid ${HAIRLINE}`,
            padding: isMobile ? "1.75rem 1.25rem" : "1.75rem 2rem",
            boxShadow: "0 0.25rem 1rem rgba(64,59,54,0.07), inset 0 0.0625rem 0 rgba(255,255,255,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem",
            minHeight: "8rem",
            fontFamily: T.font.body, fontSize: "0.9375rem", color: MUTED,
          }}
        >
          <span
            aria-hidden="true"
            className="mp-fam-spinner"
            style={{
              width: "1.25rem", height: "1.25rem", borderRadius: "50%",
              border: `0.1875rem solid ${HAIRLINE}`,
              borderTopColor: EMBER,
              display: "inline-block",
            }}
          />
          {t("loading")}
          <style>{`
            @keyframes mpFamSpin { to { transform: rotate(360deg); } }
            .mp-fam-spinner { animation: mpFamSpin 0.8s linear infinite; }
            @media (prefers-reduced-motion: reduce) { .mp-fam-spinner { animation: none; } }
          `}</style>
        </div>
      </div>
    );
  }

  const hasGroups = groups.length > 0;
  const hasPendingInvites = pendingInvites.length > 0;

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div role={toast.type === "success" ? "status" : "alert"} style={{
          position: "fixed", top: "1.5rem",
          right: isMobile ? "1rem" : "1.5rem",
          left: isMobile ? "1rem" : "auto",
          zIndex: 100,
          maxWidth: isMobile ? undefined : "24rem",
          padding: "0.875rem 1.25rem", borderRadius: "0.75rem",
          background: toast.type === "success" ? T.color.success : T.color.error,
          color: "#FFF",
          fontFamily: T.font.body, fontSize: "0.9375rem", fontWeight: 500,
          boxShadow: "0 0.5rem 1.5rem rgba(64,59,54,0.14)", /* Atrium token S2 (overlay) */
          animation: "fadeIn .2s ease",
          display: "flex", alignItems: "center", gap: "0.625rem",
        }}>
          <span aria-hidden="true">{toast.type === "success" ? "✓" : "⚠"}</span>
          {toast.message}
          <button onClick={() => setToast(null)} aria-label={t("close")} style={{
            background: "none", border: "none", color: "#FFF",
            fontSize: "1rem", cursor: "pointer", marginLeft: "0.5rem", opacity: 0.7,
          }}>{"✕"}</button>
        </div>
      )}

      {/* Page header — desktop only */}
      <div style={{ marginBottom: "2rem" }}>
        <SettingsPageHeader
          hidden={isMobile}
          icon="family"
          title={t("title")}
          subtitle={t("description")}
        />
        {/* Inclusive note */}
        <p style={{
          fontFamily: T.font.body, fontSize: "0.8125rem", color: MUTED, /* Atrium token: muted */
          margin: isMobile ? 0 : "-1rem 0 0", lineHeight: 1.5, fontStyle: "italic",
        }}>
          {t("inclusiveNote")}
        </p>
      </div>

      {/* Pending invites (user was invited by someone else) */}
      {pendingInvites.map((inv) => {
        const invGroup = inv.group as FamilyGroup;
        return (
          <div key={invGroup.id} style={{
            background: `${EMBER_GLYPH}08`,
            borderRadius: "1rem",
            border: `0.125rem solid ${EMBER_GLYPH}30`,
            padding: isMobile ? "1.5rem 1.25rem" : "1.75rem 2rem",
            boxShadow: "0 0.25rem 1rem rgba(64,59,54,0.07), inset 0 0.0625rem 0 rgba(255,255,255,0.5)", /* Atrium token S1 + top highlight */
            marginBottom: "1rem",
          }}>
            <h3 style={{
              fontFamily: T.font.display, fontSize: RT.titleM, fontWeight: 600,
              color: INK, margin: "0 0 0.5rem",
            }}>
              {t("invitedTitle")}
            </h3>
            <p style={{
              fontFamily: T.font.body, fontSize: "0.9375rem", color: MUTED, /* Atrium token: muted */
              margin: "0 0 1.25rem", lineHeight: 1.5,
            }}>
              {t("invitedDescription", { name: invGroup.name })}
            </p>
            <button
              onClick={() => handleAcceptInvite(invGroup.id)}
              disabled={saving}
              style={{
                padding: "0.875rem 2rem",
                minHeight: "2.75rem",
                borderRadius: "0.75rem",
                border: "none",
                background: saving ? DISABLED : `linear-gradient(135deg, ${EMBER}, ${EMBER_GLYPH})`,
                color: saving ? MUTED : "#FFF",
                fontFamily: T.font.body,
                fontSize: "0.9375rem",
                fontWeight: 600,
                cursor: saving ? "default" : "pointer",
                transition: "all .2s",
              }}
            >
              {saving ? t("joining") : t("acceptInvite")}
            </button>
          </div>
        );
      })}

      {/* NO GROUPS: one muted sentence above the create-group form (change 19) */}
      {!hasGroups && !hasPendingInvites && (
        <p style={{
          fontFamily: T.font.body, fontSize: "0.9375rem", color: MUTED, /* Atrium token: muted */
          margin: "0 0 1.25rem", lineHeight: 1.6, maxWidth: "34rem",
        }}>
          {t("noGroupDesc")}
        </p>
      )}

      {/* ═══ CREATE GROUP CARD (shown always — either as initial CTA or as "+ add another") ═══ */}
      {(!hasGroups || showCreateForm) && (
        <div style={{
          background: T.color.white,
          borderRadius: "1rem",
          border: `0.0625rem solid ${HAIRLINE}`,
          padding: isMobile ? "1.5rem 1.25rem" : "1.75rem 2rem",
          boxShadow: "0 0.25rem 1rem rgba(64,59,54,0.07), inset 0 0.0625rem 0 rgba(255,255,255,0.5)", /* Atrium token S1 + top highlight */
          marginBottom: "1.5rem",
        }}>
          <h3 style={{
            fontFamily: T.font.display, fontSize: RT.titleM, fontWeight: 600,
            color: INK, margin: "0 0 0.375rem",
          }}>
            {t("createGroup")}
          </h3>
          <p style={{
            fontFamily: T.font.body, fontSize: "0.8125rem", color: MUTED,
            margin: "0 0 1.375rem", lineHeight: 1.5,
          }}>
            {t("createGroupDesc")}
          </p>

          <div>
            <label htmlFor="family-group-name" style={labelStyle}>{t("groupName")}</label>
            <input
              className="mp-settings-input"
              id="family-group-name"
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder={t("groupNamePlaceholder")}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreateGroup(); }}
              style={inputStyle}
            />
          </div>

          <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.25rem" }}>
            <button
              onClick={handleCreateGroup}
              disabled={!groupName.trim() || saving}
              style={{
                padding: "0.875rem 2rem",
                minHeight: "2.75rem",
                borderRadius: "0.75rem",
                border: "none",
                background: !groupName.trim() || saving
                  ? DISABLED
                  : `linear-gradient(135deg, ${EMBER}, ${EMBER_GLYPH})`,
                color: !groupName.trim() || saving ? MUTED : "#FFF",
                fontFamily: T.font.body,
                fontSize: "0.9375rem",
                fontWeight: 600,
                cursor: !groupName.trim() || saving ? "default" : "pointer",
                transition: "all .2s",
              }}
            >
              {saving ? t("creating") : t("createGroupButton")}
            </button>
            {hasGroups && (
              <button
                onClick={() => { setShowCreateForm(false); setGroupName(""); }}
                className="mp-fam-quiet"
                style={{
                  padding: "0.875rem 1.5rem",
                  minHeight: "2.75rem",
                  borderRadius: "0.75rem",
                  border: `0.0625rem solid ${HAIRLINE}`,
                  background: "transparent",
                  color: MUTED,
                  fontFamily: T.font.body,
                  fontSize: "0.9375rem",
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "all .2s",
                }}
              >
                {t("close")}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ═══ GROUPS LIST ═══ */}
      {hasGroups && (
        <>
          {/* Group count + add button */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: "1rem",
          }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>
              {t("yourGroups", { count: String(groups.length) })}
            </label>
            {!showCreateForm && (
              <button
                onClick={() => setShowCreateForm(true)}
                style={{
                  padding: "0.5rem 1rem",
                  minHeight: "2.75rem",
                  borderRadius: "0.75rem",
                  border: `0.09375rem solid ${EMBER_GLYPH}40`,
                  background: `${EMBER_GLYPH}08`,
                  color: EMBER_GLYPH,
                  fontFamily: T.font.body,
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all .2s ease",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.375rem",
                }}
              >
                <span style={{ fontSize: "1rem", lineHeight: 1 }}>+</span>
                {t("addGroup")}
              </button>
            )}
          </div>

          {/* Render each group card */}
          {groups.map((entry) => {
            const gid = (entry.group as FamilyGroup).id;
            return (
              <GroupCard
                key={gid}
                entry={entry}
                isExpanded={expandedGroupId === gid}
                isEditing={editingGroupId === gid}
                isDeleteConfirmOpen={showDeleteConfirm === gid}
                isDeleting={deletingGroupId === gid}
                renamingSaving={renamingSaving}
                isInviting={invitingGroupId === gid}
                resendingId={resendingId}
                removingMemberId={removingMemberId}
                confirmRemoveMember={confirmRemoveMember}
                userEmail={userEmail}
                isMobile={isMobile}
                isTablet={isTablet}
                t={t}
                onToggleExpand={onToggleExpand}
                onStartEdit={onStartEdit}
                onCancelEdit={onCancelEdit}
                onShowDelete={onShowDelete}
                onHideDelete={onHideDelete}
                onSetConfirmRemove={setConfirmRemoveMember}
                handleDeleteGroup={handleDeleteGroup}
                handleRenameGroup={handleRenameGroup}
                handleInvite={handleInvite}
                handleResendInvite={handleResendInvite}
                handleCancelInvite={handleCancelInvite}
                handleToggleRole={handleToggleRole}
                handleRemoveMember={handleRemoveMember}
              />
            );
          })}

          {/* ═══ FAMILY TREE LINK ═══ */}
          <Link href="/family-tree" style={{ textDecoration: "none", display: "block" }}>
            <div style={{
              background: `linear-gradient(135deg, ${T.color.sage}12, ${T.color.sage}08)`, /* sage zone */
              borderRadius: "1rem",
              border: `0.09375rem solid ${T.color.sage}25`,
              padding: "1.25rem 1.5rem",
              marginBottom: "1.5rem",
              display: "flex", alignItems: "center", gap: "1rem",
              cursor: "pointer",
              transition: "all .2s",
            }}>
              <div style={{
                width: "2.75rem", height: "2.75rem", borderRadius: "0.75rem",
                background: `linear-gradient(135deg, ${T.color.sage}20, ${T.color.sage}10)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <svg style={{ width: "1.25rem", height: "1.25rem" }} viewBox="0 0 24 24" fill="none" stroke={T.color.sage} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                  <path d="M5 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                  <path d="M19 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                  <path d="M12 5v4" />
                  <path d="M5 16v-3a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v3" />
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontFamily: T.font.display, fontSize: RT.titleS, fontWeight: 600,
                  color: INK, marginBottom: "0.125rem",
                }}>
                  {t("viewFamilyTree")}
                </div>
                <div style={{
                  fontFamily: T.font.body, fontSize: "0.8125rem", color: MUTED, lineHeight: 1.4,
                }}>
                  {t("familyTreeDesc")}
                </div>
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={{ width: "1.25rem", height: "1.25rem", flexShrink: 0 }}>
                <path d="m9 18 6-6-6-6" />
              </svg>
            </div>
          </Link>

          {/* Wing sharing moved to Settings > Sharing (change 20) — one link, one home */}
          <Link href="/settings/sharing" style={{ textDecoration: "none", display: "block" }}>
            <div style={{
              background: T.color.white,
              borderRadius: "1rem",
              border: `0.0625rem solid ${HAIRLINE}`,
              padding: "1.25rem 1.5rem",
              boxShadow: "0 0.25rem 1rem rgba(64,59,54,0.07), inset 0 0.0625rem 0 rgba(255,255,255,0.5)", /* Atrium token S1 + top highlight */
              marginBottom: "1.5rem",
              display: "flex", alignItems: "center", gap: "1rem",
              minHeight: "2.75rem",
              cursor: "pointer",
            }}>
              <div style={{
                width: "2.75rem", height: "2.75rem", borderRadius: "0.75rem",
                background: "rgba(154,79,42,0.11)", /* Atrium terracotta medallion */
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, color: EMBER_GLYPH,
              }}>
                <FamilyIcon name="palace" size={20} color={EMBER_GLYPH} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: T.font.display, fontSize: RT.titleS, fontWeight: 600,
                  color: INK, marginBottom: "0.125rem",
                }}>
                  {t("manageWingSharing") !== "manageWingSharing" ? t("manageWingSharing") : "Manage who sees your wings"}
                </div>
                <div style={{
                  fontFamily: T.font.body, fontSize: "0.8125rem", color: MUTED, lineHeight: 1.4,
                }}>
                  {t("wingSharingDesc")}
                </div>
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={{ width: "1.25rem", height: "1.25rem", flexShrink: 0 }}>
                <path d="m9 18 6-6-6-6" />
              </svg>
            </div>
          </Link>

          {/* Info footer */}
          <div style={{
            padding: "1rem 1.25rem",
            background: TRAY,
            borderRadius: "0.75rem",
            border: `0.0625rem solid ${HAIRLINE}`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.375rem" }}>
              <FamilyIcon name="lock" size={14} color={MUTED} />
              <span style={{ fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600, color: INK }}>
                {t("howItWorks")}
              </span>
            </div>
            <p style={{
              fontFamily: T.font.body, fontSize: "0.8125rem", color: MUTED,
              lineHeight: 1.6, margin: 0,
            }}>
              {t("howItWorksDesc")}
            </p>
          </div>
        </>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-0.5rem); } to { opacity: 1; transform: translateY(0); } }
        @media (prefers-reduced-motion: reduce) { [role="status"], [role="alert"] { animation: none; } }
        @media (hover: hover) {
          .mp-fam-quiet:hover { background: rgba(154,79,42,0.07) !important; }
        }
        .mp-fam-quiet:active { background: rgba(154,79,42,0.12) !important; }
        .mp-fam-quiet:focus-visible {
          outline: 0.1875rem solid #D4AF37; /* Atrium token: gold focus ring */
          outline-offset: 0.1875rem;
        }
        .mp-fam-header:focus-visible {
          outline: 0.1875rem solid #D4AF37; /* Atrium token: gold focus ring */
          outline-offset: -0.1875rem; /* inset so the ring stays within the card radius */
          border-radius: 1rem;
        }
        ${settingsFocusStyle}
      `}</style>
    </div>
  );
}

// Shared styles
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

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.875rem 1.125rem",
  borderRadius: "0.75rem",
  border: `0.0625rem solid ${HAIRLINE}`,
  background: T.color.white,
  fontFamily: T.font.body,
  fontSize: "1rem", /* >=1rem prevents iOS focus-zoom */
  color: INK,
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color .2s, box-shadow .2s",
};

/* ── Global focus-visible ring for settings inputs ── */
const settingsFocusStyle = `
  .mp-settings-input:focus-visible {
    outline: 0.1875rem solid #D4AF37; /* Atrium token: gold focus ring */
    outline-offset: 0.1875rem;
    border-color: #D4AF37;
  }
`;
