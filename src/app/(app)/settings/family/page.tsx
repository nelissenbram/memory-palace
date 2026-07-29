"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { SettingsPageHeader } from "../_SettingsChrome";
import {
  createFamilyGroup,
  inviteFamilyMember,
  acceptFamilyInvite,
  removeFamilyMember,
  cancelFamilyInvite,
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

export default function FamilyPage() {
  const { t } = useTranslation("familySettings");
  const isMobile = useIsMobile();
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
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [saving, setSaving] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editGroupName, setEditGroupName] = useState("");
  const [renamingSaving, setRenamingSaving] = useState(false);
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
  }, []);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(t);
    }
  }, [toast]);

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

  const handleInvite = async (groupId: string) => {
    if (!inviteEmail.trim() || !inviteEmail.includes("@")) {
      if (inviteEmail.trim()) showToast(t("inviteInvalidEmail"), "error");
      return;
    }
    setInviting(true);
    const result = await inviteFamilyMember(groupId, inviteEmail.trim(), inviteRole);
    setInviting(false);
    if (result.error) {
      showToast(result.error, "error");
    } else {
      showToast(t("inviteSent", { email: inviteEmail.trim() }), "success");
      setInviteEmail("");
      await loadGroups();
    }
  };

  const handleResendInvite = async (groupId: string, member: FamilyMember) => {
    setResendingId(member.id);
    try {
      // Remove existing invite then re-invite
      let cancelResult: { error?: string };
      if (member.user_id) {
        cancelResult = await removeFamilyMember(groupId, member.user_id);
      } else {
        // Invited members have no user_id — cancel by member row id
        cancelResult = await cancelFamilyInvite(groupId, member.id);
      }
      if (cancelResult.error) {
        showToast(cancelResult.error, "error");
        setResendingId(null);
        return;
      }
      const result = await inviteFamilyMember(groupId, member.email, member.role === "owner" ? "member" : member.role);
      if (result.error) {
        showToast(result.error, "error");
      } else {
        showToast(t("inviteResent", { email: member.email }), "success");
        await loadGroups();
      }
    } catch {
      showToast(t("loadError"), "error");
    } finally {
      setResendingId(null);
    }
  };

  const handleCopyInviteLink = async (groupId: string) => {
    const link = `${window.location.origin}/join-family?group=${groupId}`;
    try {
      await navigator.clipboard.writeText(link);
      showToast(t("inviteLinkCopied"), "success");
    } catch {
      // Clipboard write blocked by browser
      showToast(t("clipboardError"), "error");
    }
  };

  const handleAcceptInvite = async (groupId: string) => {
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
  };

  const handleCancelInvite = async (groupId: string, memberId: string, email: string) => {
    const result = await cancelFamilyInvite(groupId, memberId);
    if (result.error) {
      showToast(result.error, "error");
    } else {
      showToast(t("memberRemoved", { email }), "success");
      await loadGroups();
    }
  };

  const handleToggleRole = async (groupId: string, userId: string, currentRole: string) => {
    const newRole = currentRole === "admin" ? "member" : "admin";
    const result = await updateFamilyMemberRole(groupId, userId, newRole);
    if (result.error) {
      showToast(result.error, "error");
    } else {
      showToast(t("roleUpdated"), "success");
      await loadGroups();
    }
  };

  const handleRemoveMember = async (groupId: string, userId: string, email: string) => {
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
  };

  const handleRenameGroup = async (groupId: string) => {
    if (!editGroupName.trim()) return;
    setRenamingSaving(true);
    const result = await updateFamilyGroup(groupId, { name: editGroupName.trim() });
    setRenamingSaving(false);
    if (result.error) {
      showToast(result.error, "error");
    } else {
      showToast(t("groupRenamed", { name: editGroupName.trim() }), "success");
      setEditingGroupId(null);
      setEditGroupName("");
      await loadGroups();
    }
  };

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    setDeletingGroupId(groupId);
    const result = await deleteFamilyGroup(groupId);
    setDeletingGroupId(null);
    setShowDeleteConfirm(null);
    if (result.error) {
      showToast(result.error, "error");
    } else {
      showToast(t("groupDeleted", { name: groupName }), "success");
      if (expandedGroupId === groupId) setExpandedGroupId(null);
      await loadGroups();
    }
  };

  const roleColor = (role: string) => {
    if (role === "owner") return "#9A4F2A"; /* Atrium token: terracotta glyph */
    if (role === "admin") return "#8A6410"; /* Atrium gold-lane glyph brown */
    return "#56683C"; /* Atrium token: sage canonical */
  };

  if (loading) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", fontFamily: T.font.body, fontSize: "0.9375rem", color: "#716A5E" }}>
        {t("loading")}
      </div>
    );
  }

  const hasGroups = groups.length > 0;
  const hasPendingInvites = pendingInvites.length > 0;

  /* Helper: render a single group card (used for each group in the list) */
  const renderGroupCard = (entry: FamilyGroupEntry) => {
    const { group: g, members: gMembers, userRole: gUserRole } = entry;
    const grp = g as FamilyGroup;
    const mems = gMembers as FamilyMember[];
    const isExpanded = expandedGroupId === grp.id;
    const canManage = gUserRole === "owner" || gUserRole === "admin";
    const isCreator = gUserRole === "owner";
    const isEditing = editingGroupId === grp.id;
    const activeMembers = mems.filter((m) => m.status === "active");
    const pendingMembers = mems.filter((m) => m.status === "invited");
    const hasOnlyOwner = activeMembers.length <= 1 && pendingMembers.length === 0;

    return (
      <div key={grp.id} style={{
        background: T.color.white,
        borderRadius: "1rem",
        border: isExpanded ? "0.125rem solid #B85C38" : "0.0625rem solid #E3D6BC", /* Atrium: ember active / hairline */
        boxShadow: "0 0.25rem 1rem rgba(64,59,54,0.07), inset 0 0.0625rem 0 rgba(255,255,255,0.5)", /* Atrium token S1 + top highlight */
        marginBottom: "1rem",
        overflow: "hidden",
        transition: "border-color .2s",
      }}>
        {/* Delete confirmation dialog */}
        {showDeleteConfirm === grp.id && (
          <div style={{
            padding: "1.25rem 1.5rem",
            background: `${T.color.error}08`,
            borderBottom: `0.0625rem solid ${T.color.error}20`,
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem",
            flexWrap: "wrap",
          }}>
            <p style={{
              fontFamily: T.font.body, fontSize: "0.9375rem", color: "#403B36",
              margin: 0, lineHeight: 1.5, flex: 1,
            }}>
              {t("deleteGroupConfirm")}
            </p>
            <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="mp-fam-quiet"
                style={{
                  padding: "0.5rem 1rem",
                  minHeight: "2.75rem",
                  borderRadius: "0.75rem",
                  border: "0.0625rem solid #E3D6BC", /* Atrium hairline */
                  background: T.color.white,
                  color: "#716A5E",
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
                disabled={deletingGroupId === grp.id}
                style={{
                  padding: "0.5rem 1rem",
                  minHeight: "2.75rem",
                  borderRadius: "0.75rem",
                  border: "none",
                  background: deletingGroupId === grp.id ? `${T.color.error}60` : T.color.error,
                  color: "#FFF",
                  fontFamily: T.font.body,
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  cursor: deletingGroupId === grp.id ? "default" : "pointer",
                  transition: "all .2s ease",
                  opacity: deletingGroupId === grp.id ? 0.7 : 1,
                }}
              >
                {deletingGroupId === grp.id ? t("deleting") : t("deleteGroup")}
              </button>
            </div>
          </div>
        )}

        {/* Inline rename form */}
        {isEditing && (
          <div style={{
            padding: "1rem 1.5rem",
            background: "#FCFAF5", /* Atrium token: cream */
            borderBottom: "0.0625rem solid #E3D6BC", /* Atrium hairline */
            display: "flex", alignItems: "center", gap: "0.625rem",
          }}>
            <input
              className="mp-settings-input"
              autoFocus
              type="text"
              value={editGroupName}
              onChange={(e) => setEditGroupName(e.target.value)}
              placeholder={t("renameGroupPlaceholder")}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRenameGroup(grp.id);
                if (e.key === "Escape") { setEditingGroupId(null); setEditGroupName(""); }
              }}
              style={{ ...inputStyle, flex: 1, marginBottom: 0 }}
            />
            <button
              onClick={() => handleRenameGroup(grp.id)}
              disabled={!editGroupName.trim() || renamingSaving}
              style={{
                padding: "0.625rem 1.25rem",
                minHeight: "2.75rem",
                borderRadius: "0.75rem",
                border: "none",
                background: !editGroupName.trim() || renamingSaving
                  ? "#EEE9DF" /* Atrium disabled */
                  : "#B85C38", /* Atrium token: ember (active) */
                color: !editGroupName.trim() || renamingSaving ? "#716A5E" : "#FFF",
                fontFamily: T.font.body,
                fontSize: "0.8125rem",
                fontWeight: 600,
                cursor: !editGroupName.trim() || renamingSaving ? "default" : "pointer",
                transition: "all .2s ease",
                flexShrink: 0,
              }}
            >
              {renamingSaving ? t("renaming") : t("save")}
            </button>
            <button
              onClick={() => { setEditingGroupId(null); setEditGroupName(""); }}
              className="mp-fam-quiet"
              style={{
                padding: "0.625rem 1rem",
                minHeight: "2.75rem",
                borderRadius: "0.75rem",
                border: "0.0625rem solid #E3D6BC", /* Atrium hairline */
                background: "transparent",
                color: "#716A5E",
                fontFamily: T.font.body,
                fontSize: "0.8125rem",
                fontWeight: 500,
                cursor: "pointer",
                transition: "all .2s ease",
                flexShrink: 0,
              }}
            >
              {t("cancel")}
            </button>
          </div>
        )}

        {/* Clickable group header */}
        <button
          onClick={() => setExpandedGroupId(isExpanded ? null : grp.id)}
          style={{
            width: "100%",
            padding: "1.25rem 1.5rem",
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
            border: "0.0625rem solid #E7D9C4", /* Atrium terracotta-zone border */
            flexShrink: 0,
            color: "#9A4F2A",
          }}>
            <FamilyIcon name="palace" size={22} color={"#9A4F2A"} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{
              fontFamily: T.font.display, fontSize: "1.1875rem", fontWeight: 600,
              color: "#403B36", margin: 0,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {grp.name}
            </h3>
            <div style={{
              fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E", marginTop: "0.125rem",
              display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap",
            }}>
              <span>{mems.length !== 1 ? t("membersCount", { count: String(mems.length) }) : t("memberCount", { count: String(mems.length) })}</span>
              <span style={{ color: "#E3D6BC" }}>{"\u00B7"}</span>
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
                  setEditingGroupId(grp.id);
                  setEditGroupName(grp.name);
                }}
                aria-label={t("renameGroup")}
                title={t("renameGroup")}
                style={{
                  width: "2.25rem", height: "2.25rem", borderRadius: "0.75rem",
                  border: "0.0625rem solid #E3D6BC", /* Atrium hairline */
                  background: "rgba(154,79,42,0.06)",
                  color: "#9A4F2A",
                  cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all .2s ease",
                }}
              >
                <svg width="0.875rem" height="0.875rem" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                  <path d="m15 5 4 4" />
                </svg>
              </button>
              {/* Delete (trash) button — only creator */}
              {isCreator && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteConfirm(grp.id);
                  }}
                  aria-label={t("deleteGroup")}
                  title={t("deleteGroup")}
                  style={{
                    width: "2.25rem", height: "2.25rem", borderRadius: "0.75rem",
                    border: "0.0625rem solid #E3D6BC", /* Atrium hairline */
                    background: `${T.color.error}06`,
                    color: T.color.error,
                    cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all .2s ease",
                  }}
                >
                  <svg width="0.875rem" height="0.875rem" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18" />
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  </svg>
                </button>
              )}
            </div>
          )}

          <svg
            width="1.25rem" height="1.25rem" viewBox="0 0 24 24"
            fill="none" stroke={"#716A5E"} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
            style={{ flexShrink: 0, transform: isExpanded ? "rotate(90deg)" : "none", transition: "transform .2s" }}
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>

        {/* Expanded content */}
        {isExpanded && (
          <div style={{ padding: "0 1.5rem 1.5rem" }}>
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
                  fontFamily: T.font.body, fontSize: "0.9375rem", color: "#403B36", /* Atrium token: ink */
                  margin: "0 0 1rem", lineHeight: 1.5,
                }}>
                  {t("inviteFirstMember")}
                </p>
                <button
                  onClick={() => {
                    const el = document.getElementById(`invite-email-${grp.id}`);
                    if (el) el.focus();
                  }}
                  style={{
                    padding: "0.75rem 1.75rem",
                    minHeight: "2.75rem",
                    borderRadius: "0.75rem",
                    border: "none",
                    background: "linear-gradient(135deg, #B85C38, #9A4F2A)", /* Atrium ember register */
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
                background: "#FCFAF5", /* Atrium token: cream */
                borderRadius: "0.875rem",
                border: "0.0625rem solid #E3D6BC", /* Atrium hairline */
                marginBottom: "1.25rem",
              }}>
                <label htmlFor={`invite-email-${grp.id}`} style={labelStyle}>{t("inviteMember")}</label>
                <p style={{
                  fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E",
                  margin: "0 0 0.75rem", lineHeight: 1.5,
                }}>
                  {t("inviteExplanation")}
                </p>
                <div style={{ display: "flex", gap: "0.625rem", marginBottom: "0.75rem" }}>
                  <input
                    className="mp-settings-input"
                    id={`invite-email-${grp.id}`}
                    type="email"
                    value={expandedGroupId === grp.id ? inviteEmail : ""}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder={t("emailPlaceholder")}
                    onKeyDown={(e) => { if (e.key === "Enter") handleInvite(grp.id); }}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button
                    onClick={() => handleInvite(grp.id)}
                    disabled={!inviteEmail.trim() || !inviteEmail.includes("@") || inviting}
                    style={{
                      padding: "0.875rem 1.5rem",
                      minHeight: "2.75rem",
                      borderRadius: "0.75rem",
                      border: "none",
                      background: !inviteEmail.trim() || inviting
                        ? "#EEE9DF" /* Atrium disabled */
                        : "#B85C38", /* Atrium token: ember (active) */
                      color: !inviteEmail.trim() || inviting ? "#716A5E" : "#FFF",
                      fontFamily: T.font.body,
                      fontSize: "0.9375rem",
                      fontWeight: 600,
                      cursor: !inviteEmail.trim() || inviting ? "default" : "pointer",
                      transition: "all .2s ease",
                      flexShrink: 0,
                    }}
                  >
                    {inviting ? t("inviting") : t("invite")}
                  </button>
                </div>

                <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.875rem" }}>
                  {(["member", "admin"] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setInviteRole(r)}
                      aria-pressed={inviteRole === r}
                      style={{
                        padding: "0.5rem 1rem",
                        borderRadius: "0.75rem",
                        border: `0.0625rem solid ${inviteRole === r ? "#9A4F2A" + "40" : "#E3D6BC"}`,
                        background: inviteRole === r ? `${"#9A4F2A"}10` : T.color.white,
                        cursor: "pointer",
                        fontFamily: T.font.body,
                        fontSize: "0.8125rem",
                        color: inviteRole === r ? "#9A4F2A" : "#716A5E",
                        fontWeight: inviteRole === r ? 600 : 500,
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
                        color: inviteRole === r ? "#9A4F2A" : "#716A5E",
                      }}>
                        {r === "member" ? t("roleMemberDesc") : t("roleAdminDesc")}
                      </div>
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => handleCopyInviteLink(grp.id)}
                  className="mp-fam-quiet"
                  style={{
                    padding: "0.5rem 1rem",
                    minHeight: "2.75rem",
                    borderRadius: "0.75rem",
                    border: "0.0625rem solid #E3D6BC", /* Atrium hairline */
                    background: T.color.white,
                    cursor: "pointer",
                    fontFamily: T.font.body,
                    fontSize: "0.8125rem",
                    color: "#9A4F2A", /* Atrium: terracotta action */
                    fontWeight: 500,
                    transition: "all .2s ease",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.375rem",
                  }}
                >
                  <FamilyIcon name="link" size={14} color="#9A4F2A" />
                  {t("copyInviteLink")}
                </button>
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
                      background: `${"#9A4F2A"}06`,
                      border: `0.0625rem dashed ${"#9A4F2A"}25`,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", minWidth: 0 }}>
                        <div style={{
                          width: "2.25rem", height: "2.25rem", borderRadius: "1.125rem",
                          background: `${"#9A4F2A"}15`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontFamily: T.font.body, fontSize: "0.9375rem", fontWeight: 600,
                          color: "#9A4F2A",
                        }}>
                          {member.email.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{
                            fontFamily: T.font.body, fontSize: "0.9375rem", fontWeight: 500,
                            color: "#403B36",
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}>
                            {member.email}
                          </div>
                          <div style={{
                            fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E",
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
                              border: `0.0625rem solid ${"#9A4F2A"}30`,
                              background: T.color.white,
                              color: "#9A4F2A",
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
                            {"\u2715"}
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
                fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E",
                margin: "0 0 1rem", lineHeight: 1.5, fontStyle: "italic",
                padding: "1rem 1.25rem",
                background: "#FCFAF5", /* Atrium token: cream */
                borderRadius: "0.75rem",
                border: "0.0625rem solid #E3D6BC", /* Atrium hairline */
              }}>
                {t("noActiveMembers")}
              </p>
            )}
            <div role="list" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {activeMembers.map((member) => (
                <div key={member.id} role="listitem" style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "0.875rem 1.125rem", borderRadius: "0.75rem",
                  background: "#FCFAF5", /* Atrium token: cream */
                  border: "0.0625rem solid #E3D6BC", /* Atrium hairline */
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
                        color: "#403B36",
                      }}>
                        {member.email}
                        {member.email.toLowerCase() === userEmail.toLowerCase() && (
                          <span style={{
                            fontFamily: T.font.body, fontSize: "0.6875rem", color: "#716A5E",
                            marginLeft: "0.375rem", fontStyle: "italic",
                          }}>({t("youLabel")})</span>
                        )}
                      </div>
                      <div style={{
                        fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E",
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
                        <span style={{ color: "#56683C", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                          <span style={{
                            display: "inline-block", width: "0.375rem", height: "0.375rem",
                            borderRadius: "50%", background: "#56683C",
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
                          border: `0.0625rem solid ${"#56683C"}30`,
                          background: `${"#56683C"}08`,
                          color: "#56683C",
                          fontFamily: T.font.body,
                          fontSize: "0.8125rem",
                          fontWeight: 600,
                          textDecoration: "none",
                          cursor: "pointer",
                          transition: "all .2s ease",
                          minHeight: "2rem",
                        }}
                      >
                        <svg width="0.875rem" height="0.875rem" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
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
                          border: `0.0625rem solid ${"#9A4F2A"}30`,
                          background: T.color.white,
                          color: "#9A4F2A",
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
                          <span style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "#403B36" }}>
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
                            onClick={() => setConfirmRemoveMember(null)}
                            style={{
                              padding: "0.25rem 0.625rem", borderRadius: "0.375rem",
                              border: "0.0625rem solid #E3D6BC", /* Atrium hairline */ background: T.color.white,
                              color: "#716A5E", fontFamily: T.font.body, fontSize: "0.6875rem",
                              fontWeight: 500, cursor: "pointer", transition: "all .2s ease",
                            }}
                          >
                            {t("cancel")}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmRemoveMember({ groupId: grp.id, userId: member.user_id!, email: member.email })}
                          aria-label={t("removeMember", { email: member.email })}
                          style={{
                            width: "2rem", height: "2rem", borderRadius: "0.75rem",
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
                          {"\u2715"}
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
  };

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div role={toast.type === "success" ? "status" : "alert"} style={{
          position: "fixed", top: "1.5rem", right: "1.5rem", zIndex: 100,
          padding: "0.875rem 1.25rem", borderRadius: "0.75rem",
          background: toast.type === "success" ? "#56683C" : T.color.error,
          color: "#FFF",
          fontFamily: T.font.body, fontSize: "0.9375rem", fontWeight: 500,
          boxShadow: "0 0.5rem 1.5rem rgba(64,59,54,0.14)", /* Atrium token S2 (overlay) */
          animation: "fadeIn .2s ease",
          display: "flex", alignItems: "center", gap: "0.625rem",
        }}>
          <span aria-hidden="true">{toast.type === "success" ? "\u2713" : "\u26A0"}</span>
          {toast.message}
          <button onClick={() => setToast(null)} aria-label={t("close")} style={{
            background: "none", border: "none", color: "#FFF",
            fontSize: "1rem", cursor: "pointer", marginLeft: "0.5rem", opacity: 0.7,
          }}>{"\u2715"}</button>
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
          fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E", /* Atrium token: muted */
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
            background: `${"#9A4F2A"}08`,
            borderRadius: "1rem",
            border: `0.125rem solid ${"#9A4F2A"}30`,
            padding: "1.75rem 2rem",
            boxShadow: "0 0.25rem 1rem rgba(64,59,54,0.07), inset 0 0.0625rem 0 rgba(255,255,255,0.5)", /* Atrium token S1 + top highlight */
            marginBottom: "1rem",
          }}>
            <h3 style={{
              fontFamily: T.font.display, fontSize: "1.1875rem", fontWeight: 600,
              color: "#403B36", margin: "0 0 0.5rem",
            }}>
              {t("invitedTitle")}
            </h3>
            <p style={{
              fontFamily: T.font.body, fontSize: "0.9375rem", color: "#716A5E", /* Atrium token: muted */
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
                background: saving ? "#EEE9DF" /* Atrium disabled */ : `linear-gradient(135deg, #B85C38, #9A4F2A)`,
                color: saving ? "#716A5E" : "#FFF",
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
          fontFamily: T.font.body, fontSize: "0.9375rem", color: "#716A5E", /* Atrium token: muted */
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
          border: "0.0625rem solid #E3D6BC", /* Atrium hairline */
          padding: "1.75rem 2rem",
          boxShadow: "0 0.25rem 1rem rgba(64,59,54,0.07), inset 0 0.0625rem 0 rgba(255,255,255,0.5)", /* Atrium token S1 + top highlight */
          marginBottom: "1.5rem",
        }}>
          <h3 style={{
            fontFamily: T.font.display, fontSize: "1.1875rem", fontWeight: 600,
            color: "#403B36", margin: "0 0 0.375rem",
          }}>
            {t("createGroup")}
          </h3>
          <p style={{
            fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E",
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
                  ? "#EEE9DF" /* Atrium disabled */
                  : `linear-gradient(135deg, #B85C38, #9A4F2A)`,
                color: !groupName.trim() || saving ? "#716A5E" : "#FFF",
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
                  border: "0.0625rem solid #E3D6BC", /* Atrium hairline */
                  background: "transparent",
                  color: "#716A5E",
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
                  border: `0.09375rem solid ${"#9A4F2A"}40`,
                  background: `${"#9A4F2A"}08`,
                  color: "#9A4F2A",
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
          {groups.map((entry) => renderGroupCard(entry))}

          {/* ═══ FAMILY TREE LINK ═══ */}
          <Link href="/family-tree" style={{ textDecoration: "none", display: "block" }}>
            <div style={{
              background: "linear-gradient(135deg, rgba(86,104,60,0.07), rgba(86,104,60,0.03))", /* sage zone */
              borderRadius: "1rem",
              border: `0.09375rem solid ${"#56683C"}25`,
              padding: "1.25rem 1.5rem",
              marginBottom: "1.5rem",
              display: "flex", alignItems: "center", gap: "1rem",
              cursor: "pointer",
              transition: "all .2s",
            }}>
              <div style={{
                width: "2.75rem", height: "2.75rem", borderRadius: "0.75rem",
                background: `linear-gradient(135deg, ${"#56683C"}20, ${"#56683C"}10)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <svg width="1.25rem" height="1.25rem" viewBox="0 0 24 24" fill="none" stroke={"#56683C"} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                  <path d="M5 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                  <path d="M19 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                  <path d="M12 5v4" />
                  <path d="M5 16v-3a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v3" />
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontFamily: T.font.display, fontSize: "1.0625rem", fontWeight: 600,
                  color: "#403B36", marginBottom: "0.125rem",
                }}>
                  {t("viewFamilyTree")}
                </div>
                <div style={{
                  fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E", lineHeight: 1.4,
                }}>
                  {t("familyTreeDesc")}
                </div>
              </div>
              <svg width="1.25rem" height="1.25rem" viewBox="0 0 24 24" fill="none" stroke={"#716A5E"} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="m9 18 6-6-6-6" />
              </svg>
            </div>
          </Link>

          {/* Wing sharing moved to Settings > Sharing (change 20) — one link, one home */}
          <Link href="/settings/sharing" style={{ textDecoration: "none", display: "block" }}>
            <div style={{
              background: T.color.white,
              borderRadius: "1rem",
              border: "0.0625rem solid #E3D6BC", /* Atrium hairline */
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
                flexShrink: 0, color: "#9A4F2A",
              }}>
                <FamilyIcon name="palace" size={20} color={"#9A4F2A"} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: T.font.display, fontSize: "1.0625rem", fontWeight: 600,
                  color: "#403B36", marginBottom: "0.125rem",
                }}>
                  {t("manageWingSharing") !== "manageWingSharing" ? t("manageWingSharing") : "Manage who sees your wings"}
                </div>
                <div style={{
                  fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E", lineHeight: 1.4,
                }}>
                  {t("wingSharingDesc")}
                </div>
              </div>
              <svg width="1.25rem" height="1.25rem" viewBox="0 0 24 24" fill="none" stroke={"#716A5E"} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="m9 18 6-6-6-6" />
              </svg>
            </div>
          </Link>

          {/* Info footer */}
          <div style={{
            padding: "1rem 1.25rem",
            background: "#F6EBE3", /* Atrium token: recessed tray */
            borderRadius: "0.75rem",
            border: "0.0625rem solid #E3D6BC", /* Atrium hairline */
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.375rem" }}>
              <FamilyIcon name="lock" size={14} color="#716A5E" />
              <span style={{ fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600, color: "#403B36" }}>
                {t("howItWorks")}
              </span>
            </div>
            <p style={{
              fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E",
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
  color: "#716A5E",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  display: "block",
  marginBottom: "0.5rem",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.875rem 1.125rem",
  borderRadius: "0.75rem",
  border: "0.0625rem solid #E3D6BC", /* Atrium hairline */
  background: T.color.white,
  fontFamily: T.font.body,
  fontSize: "0.9375rem",
  color: "#403B36",
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
