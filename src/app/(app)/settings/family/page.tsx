"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
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
import {
  shareWing,
  unshareWing,
  getMyWingShares,
  getWingsSharedWithMe,
} from "@/lib/auth/sharing-actions";

const WING_OPTION_IDS = ["family", "travel", "childhood", "career", "creativity"] as const;

const WING_LABEL_KEYS: Record<string, string> = {
  family: "wingFamily",
  travel: "wingTravel",
  childhood: "wingChildhood",
  career: "wingCareer",
  creativity: "wingCreativity",
};

interface WingShare {
  id: string;
  wing_id: string;
  permission: string;
  shared_with_id?: string;
  shared_with_email?: string;
  owner_id?: string;
  owner_email?: string;
  created_at: string;
}

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

/* ── visual step data for "How it works" ── */
const STEP_ICONS = ["\u2160", "\u2161", "\u2162", "\u2163"]; // Roman numerals I-IV

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
  const { t: tp } = useTranslation("palace");
  const isMobile = useIsMobile();
  // Multi-group state
  const [groups, setGroups] = useState<FamilyGroupEntry[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInviteEntry[]>([]);
  const [userEmail, setUserEmail] = useState<string>("");
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [confirmRemoveMember, setConfirmRemoveMember] = useState<{ groupId: string; userId: string; email: string } | null>(null);
  const [confirmUnshareId, setConfirmUnshareId] = useState<string | null>(null);
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

  // Wing sharing state
  const [myWingShares, setMyWingShares] = useState<WingShare[]>([]);
  const [sharedWithMe, setSharedWithMe] = useState<WingShare[]>([]);
  const [shareWingId, setShareWingId] = useState("family");
  const [shareMemberEmail, setShareMemberEmail] = useState("");
  const [sharePermission, setSharePermission] = useState<"view" | "contribute">("view");
  const [sharingWing, setSharingWing] = useState(false);

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

  const loadWingShares = useCallback(async () => {
    try {
      const [myRes, withMeRes] = await Promise.all([
        getMyWingShares(),
        getWingsSharedWithMe(),
      ]);
      setMyWingShares((myRes.shares || []) as WingShare[]);
      setSharedWithMe((withMeRes.shares || []) as WingShare[]);
    } catch {
      showToast(t("loadWingSharesError"), "error");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { loadGroups(); }, [loadGroups]);
  useEffect(() => { loadWingShares(); }, [loadWingShares]);

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

  const handleShareWing = async () => {
    if (!shareMemberEmail.trim() || !shareMemberEmail.includes("@")) {
      if (shareMemberEmail.trim()) showToast(t("inviteInvalidEmail"), "error");
      return;
    }
    setSharingWing(true);
    const result = await shareWing(shareWingId, shareMemberEmail.trim(), sharePermission);
    setSharingWing(false);
    if (result.error) {
      showToast(result.error, "error");
    } else {
      showToast(t("wingSharedSuccess", { email: shareMemberEmail.trim() }), "success");
      setShareMemberEmail("");
      loadWingShares();
    }
  };

  const handleUnshareWing = async (shareId: string) => {
    const result = await unshareWing(shareId);
    setConfirmUnshareId(null);
    if (result.error) {
      showToast(result.error, "error");
    } else {
      showToast(t("wingShareRemoved"), "success");
      loadWingShares();
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

  // Collect all active members across all groups for wing sharing
  const allOtherActiveMembers = groups.flatMap((g) =>
    (g.members as FamilyMember[]).filter((m) => m.status === "active" && m.email.toLowerCase() !== userEmail.toLowerCase())
  );
  // Deduplicate by email
  const uniqueOtherMembers = allOtherActiveMembers.filter(
    (m, i, arr) => arr.findIndex((x) => x.email.toLowerCase() === m.email.toLowerCase()) === i
  );

  const roleColor = (role: string) => {
    if (role === "owner") return T.color.terracotta;
    if (role === "admin") return T.color.walnut;
    return T.color.sage;
  };

  const wingLabel = (wingId: string) => {
    const key = WING_LABEL_KEYS[wingId];
    return key ? tp(key) : wingId;
  };

  if (loading) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", fontFamily: T.font.body, fontSize: "1rem", color: T.color.muted }}>
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
        border: isExpanded ? `2px solid ${T.color.gold}40` : `1px solid ${T.color.cream}`,
        boxShadow: "0 2px 8px rgba(44,44,42,.04)",
        marginBottom: "1rem",
        overflow: "hidden",
        transition: "border-color .2s",
      }}>
        {/* Delete confirmation dialog */}
        {showDeleteConfirm === grp.id && (
          <div style={{
            padding: "1.25rem 1.5rem",
            background: `${T.color.error}08`,
            borderBottom: `1px solid ${T.color.error}20`,
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem",
            flexWrap: "wrap",
          }}>
            <p style={{
              fontFamily: T.font.body, fontSize: "0.875rem", color: T.color.charcoal,
              margin: 0, lineHeight: 1.5, flex: 1,
            }}>
              {t("deleteGroupConfirm")}
            </p>
            <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "0.5rem",
                  border: `1px solid ${T.color.cream}`,
                  background: T.color.white,
                  color: T.color.muted,
                  fontFamily: T.font.body,
                  fontSize: "0.8125rem",
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "all .15s",
                }}
              >
                {t("cancel")}
              </button>
              <button
                onClick={() => handleDeleteGroup(grp.id, grp.name)}
                disabled={deletingGroupId === grp.id}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "0.5rem",
                  border: "none",
                  background: deletingGroupId === grp.id ? `${T.color.error}60` : T.color.error,
                  color: "#FFF",
                  fontFamily: T.font.body,
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  cursor: deletingGroupId === grp.id ? "default" : "pointer",
                  transition: "all .15s",
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
            background: `${T.color.gold}06`,
            borderBottom: `1px solid ${T.color.gold}20`,
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
                borderRadius: "0.625rem",
                border: "none",
                background: !editGroupName.trim() || renamingSaving
                  ? `${T.color.sandstone}60`
                  : T.color.terracotta,
                color: !editGroupName.trim() || renamingSaving ? T.color.muted : "#FFF",
                fontFamily: T.font.body,
                fontSize: "0.8125rem",
                fontWeight: 600,
                cursor: !editGroupName.trim() || renamingSaving ? "default" : "pointer",
                transition: "all .15s",
                flexShrink: 0,
              }}
            >
              {renamingSaving ? t("renaming") : t("save")}
            </button>
            <button
              onClick={() => { setEditingGroupId(null); setEditGroupName(""); }}
              style={{
                padding: "0.625rem 1rem",
                borderRadius: "0.625rem",
                border: `1px solid ${T.color.cream}`,
                background: "transparent",
                color: T.color.muted,
                fontFamily: T.font.body,
                fontSize: "0.8125rem",
                fontWeight: 500,
                cursor: "pointer",
                transition: "all .15s",
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
            background: `linear-gradient(135deg, ${T.color.gold}25, ${T.color.terracotta}15)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            border: `2px solid ${T.color.gold}30`,
            flexShrink: 0,
            color: T.color.terracotta,
          }}>
            <FamilyIcon name="palace" size={22} color={T.color.terracotta} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{
              fontFamily: T.font.display, fontSize: "1.25rem", fontWeight: 500,
              color: T.color.charcoal, margin: 0,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {grp.name}
            </h3>
            <div style={{
              fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.muted, marginTop: "0.125rem",
              display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap",
            }}>
              <span>{mems.length !== 1 ? t("membersCount", { count: String(mems.length) }) : t("memberCount", { count: String(mems.length) })}</span>
              <span style={{ color: T.color.cream }}>{"\u00B7"}</span>
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
                  width: "2.25rem", height: "2.25rem", borderRadius: "0.5rem",
                  border: `1px solid ${T.color.cream}`,
                  background: `${T.color.gold}08`,
                  color: T.color.walnut,
                  cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all .15s",
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
                    width: "2.25rem", height: "2.25rem", borderRadius: "0.5rem",
                    border: `1px solid ${T.color.cream}`,
                    background: `${T.color.error}06`,
                    color: T.color.error,
                    cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all .15s",
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
            fill="none" stroke={T.color.muted} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
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
                background: `linear-gradient(135deg, ${T.color.gold}08, ${T.color.terracotta}06)`,
                borderRadius: "0.875rem",
                border: `1.5px dashed ${T.color.gold}40`,
                marginBottom: "1.25rem",
                textAlign: "center",
              }}>
                <p style={{
                  fontFamily: T.font.body, fontSize: "0.9375rem", color: T.color.walnut,
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
                    borderRadius: "0.75rem",
                    border: "none",
                    background: `linear-gradient(135deg, ${T.color.gold}, ${T.color.terracotta})`,
                    color: "#FFF",
                    fontFamily: T.font.body,
                    fontSize: "0.875rem",
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
                background: T.color.linen,
                borderRadius: "0.875rem",
                border: `1px solid ${T.color.cream}`,
                marginBottom: "1.25rem",
              }}>
                <label htmlFor={`invite-email-${grp.id}`} style={labelStyle}>{t("inviteMember")}</label>
                <p style={{
                  fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.muted,
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
                      borderRadius: "0.75rem",
                      border: "none",
                      background: !inviteEmail.trim() || inviting
                        ? `${T.color.sandstone}60`
                        : T.color.terracotta,
                      color: !inviteEmail.trim() || inviting ? T.color.muted : "#FFF",
                      fontFamily: T.font.body,
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      cursor: !inviteEmail.trim() || inviting ? "default" : "pointer",
                      transition: "all .15s",
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
                        borderRadius: "0.5rem",
                        border: `1px solid ${inviteRole === r ? T.color.terracotta + "40" : T.color.cream}`,
                        background: inviteRole === r ? `${T.color.terracotta}10` : T.color.white,
                        cursor: "pointer",
                        fontFamily: T.font.body,
                        fontSize: "0.8125rem",
                        color: inviteRole === r ? T.color.terracotta : T.color.muted,
                        fontWeight: inviteRole === r ? 600 : 400,
                        transition: "all .15s",
                        textAlign: "left",
                        flex: 1,
                      }}
                    >
                      <div style={{ fontWeight: 600, marginBottom: "0.125rem" }}>
                        {r === "member" ? t("roleMember") : t("roleAdmin")}
                      </div>
                      <div style={{
                        fontSize: "0.75rem", fontWeight: 400,
                        color: inviteRole === r ? T.color.terracotta : T.color.muted,
                        opacity: 0.85,
                      }}>
                        {r === "member" ? t("roleMemberDesc") : t("roleAdminDesc")}
                      </div>
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => handleCopyInviteLink(grp.id)}
                  style={{
                    padding: "0.5rem 1rem",
                    borderRadius: "0.5rem",
                    border: `1px solid ${T.color.cream}`,
                    background: T.color.white,
                    cursor: "pointer",
                    fontFamily: T.font.body,
                    fontSize: "0.8125rem",
                    color: T.color.walnut,
                    fontWeight: 500,
                    transition: "all .15s",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.375rem",
                  }}
                >
                  <FamilyIcon name="link" size={14} color={T.color.walnut} />
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
                      background: `${T.color.terracotta}06`,
                      border: `1px dashed ${T.color.terracotta}25`,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", minWidth: 0 }}>
                        <div style={{
                          width: "2.25rem", height: "2.25rem", borderRadius: "1.125rem",
                          background: `${T.color.terracotta}15`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: 600,
                          color: T.color.terracotta,
                        }}>
                          {member.email.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{
                            fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: 500,
                            color: T.color.charcoal,
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}>
                            {member.email}
                          </div>
                          <div style={{
                            fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.muted,
                            display: "flex", alignItems: "center", gap: "0.375rem", marginTop: "0.125rem",
                          }}>
                            <span style={{
                              display: "inline-block", width: "0.375rem", height: "0.375rem",
                              borderRadius: "50%", background: T.color.terracotta, opacity: 0.6,
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
                              borderRadius: "0.5rem",
                              border: `1px solid ${T.color.terracotta}30`,
                              background: T.color.white,
                              color: T.color.terracotta,
                              fontFamily: T.font.body,
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              cursor: resendingId === member.id ? "default" : "pointer",
                              transition: "all .15s",
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
                              width: "2rem", height: "2rem", borderRadius: "0.5rem",
                              border: `1px solid ${T.color.cream}`,
                              background: "transparent",
                              color: T.color.muted,
                              fontSize: "0.75rem",
                              cursor: "pointer",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              transition: "all .15s",
                              minWidth: "2.5rem", minHeight: "2.5rem",
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
                fontFamily: T.font.body, fontSize: "0.875rem", color: T.color.muted,
                margin: "0 0 1rem", lineHeight: 1.5, fontStyle: "italic",
                padding: "1rem 1.25rem",
                background: T.color.linen,
                borderRadius: "0.75rem",
                border: `1px solid ${T.color.cream}`,
              }}>
                {t("noActiveMembers")}
              </p>
            )}
            <div role="list" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {activeMembers.map((member) => (
                <div key={member.id} role="listitem" style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "0.875rem 1.125rem", borderRadius: "0.75rem",
                  background: T.color.linen,
                  border: `1px solid ${T.color.cream}`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div style={{
                      width: "2.5rem", height: "2.5rem", borderRadius: "1.25rem",
                      background: `linear-gradient(135deg, ${roleColor(member.role)}25, ${roleColor(member.role)}10)`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: T.font.display, fontSize: "1rem", fontWeight: 600,
                      color: roleColor(member.role),
                      border: `1.5px solid ${roleColor(member.role)}20`,
                    }}>
                      {member.email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{
                        fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: 500,
                        color: T.color.charcoal,
                      }}>
                        {member.email}
                        {member.email.toLowerCase() === userEmail.toLowerCase() && (
                          <span style={{
                            fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.muted,
                            marginLeft: "0.375rem", fontStyle: "italic",
                          }}>({t("youLabel")})</span>
                        )}
                      </div>
                      <div style={{
                        fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.muted,
                        display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.125rem",
                      }}>
                        <span style={{
                          display: "inline-block",
                          padding: "1px 0.5rem",
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
                          borderRadius: "0.5rem",
                          border: `1px solid ${T.color.sage}30`,
                          background: `${T.color.sage}08`,
                          color: T.color.sage,
                          fontFamily: T.font.body,
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          textDecoration: "none",
                          cursor: "pointer",
                          transition: "all .15s",
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
                          padding: "0.375rem 0.625rem", borderRadius: "0.5rem",
                          border: `1px solid ${T.color.terracotta}30`,
                          background: T.color.white,
                          color: T.color.terracotta,
                          fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 600,
                          cursor: "pointer", transition: "all .15s",
                          minHeight: "2.75rem",
                        }}
                      >
                        {member.role === "admin" ? t("makeMember") : t("makeAdmin")}
                      </button>
                    )}
                    {canManage && member.role !== "owner" && member.user_id && (
                      confirmRemoveMember?.userId === member.user_id && confirmRemoveMember?.groupId === grp.id ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                          <span style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.charcoal }}>
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
                              transition: "all .15s",
                            }}
                          >
                            {removingMemberId === member.user_id ? t("removing") : t("confirmYes")}
                          </button>
                          <button
                            onClick={() => setConfirmRemoveMember(null)}
                            style={{
                              padding: "0.25rem 0.625rem", borderRadius: "0.375rem",
                              border: `1px solid ${T.color.cream}`, background: T.color.white,
                              color: T.color.muted, fontFamily: T.font.body, fontSize: "0.6875rem",
                              fontWeight: 500, cursor: "pointer", transition: "all .15s",
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
                            width: "2rem", height: "2rem", borderRadius: "0.5rem",
                            border: `1px solid ${T.color.cream}`,
                            background: "transparent",
                            color: T.color.muted,
                            fontSize: "0.8125rem",
                            cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            transition: "all .15s",
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
          background: toast.type === "success" ? T.color.sage : T.color.error,
          color: "#FFF",
          fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: 500,
          boxShadow: "0 8px 24px rgba(0,0,0,.15)",
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
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          {!isMobile && (
          <div style={{ flex: 1 }}>
            <h2 style={{
              fontFamily: T.font.display, fontSize: "1.75rem", fontWeight: 500,
              color: T.color.charcoal, margin: "0 0 0.5rem",
            }}>
              {t("title")}
            </h2>
            <p style={{
              fontFamily: T.font.body, fontSize: "0.9375rem", color: T.color.muted,
              margin: 0, lineHeight: 1.5,
            }}>
              {t("description")}
            </p>
          </div>
          )}
          <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
            <Link href="/family-tree" style={{
              display: "inline-flex", alignItems: "center", gap: "0.5rem",
              padding: "0.625rem 1.25rem",
              borderRadius: "0.75rem",
              border: `1.5px solid ${T.color.sage}40`,
              background: `${T.color.sage}08`,
              color: T.color.sage,
              fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: 600,
              textDecoration: "none",
              transition: "all .2s",
            }}>
              <svg width="1.125rem" height="1.125rem" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                <path d="M5 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                <path d="M19 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                <path d="M12 5v4" />
                <path d="M5 16v-3a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v3" />
              </svg>
              {t("viewFamilyTree")}
            </Link>
          </div>
        </div>
        {/* Inclusive note */}
        <p style={{
          fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.walnut,
          margin: "0.75rem 0 0", lineHeight: 1.5, fontStyle: "italic",
        }}>
          {t("inclusiveNote")}
        </p>
      </div>

      {/* Pending invites (user was invited by someone else) */}
      {pendingInvites.map((inv) => {
        const invGroup = inv.group as FamilyGroup;
        return (
          <div key={invGroup.id} style={{
            background: `${T.color.terracotta}08`,
            borderRadius: "1rem",
            border: `2px solid ${T.color.terracotta}30`,
            padding: "1.75rem 2rem",
            boxShadow: "0 2px 8px rgba(44,44,42,.04)",
            marginBottom: "1rem",
          }}>
            <h3 style={{
              fontFamily: T.font.display, fontSize: "1.25rem", fontWeight: 500,
              color: T.color.charcoal, margin: "0 0 0.5rem",
            }}>
              {t("invitedTitle")}
            </h3>
            <p style={{
              fontFamily: T.font.body, fontSize: "0.9375rem", color: T.color.walnut,
              margin: "0 0 1.25rem", lineHeight: 1.5,
            }}>
              {t("invitedDescription", { name: invGroup.name })}
            </p>
            <button
              onClick={() => handleAcceptInvite(invGroup.id)}
              disabled={saving}
              style={{
                padding: "0.875rem 2rem",
                borderRadius: "0.75rem",
                border: "none",
                background: saving ? `${T.color.sandstone}60` : `linear-gradient(135deg, ${T.color.terracotta}, ${T.color.walnut})`,
                color: saving ? T.color.muted : "#FFF",
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

      {/* ═══ NO GROUPS AT ALL: Warm CTA + benefits + how-it-works ═══ */}
      {!hasGroups && !hasPendingInvites && (
        <>
          {/* Warm welcome CTA */}
          <div style={{
            background: `linear-gradient(135deg, ${T.color.gold}08, ${T.color.terracotta}06)`,
            borderRadius: "1rem",
            border: `2px solid ${T.color.gold}25`,
            padding: "2rem 2rem 1.75rem",
            marginBottom: "1.5rem",
            textAlign: "center",
          }}>
            <div style={{
              width: "4rem", height: "4rem", borderRadius: "50%",
              background: `linear-gradient(135deg, ${T.color.gold}25, ${T.color.terracotta}15)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 1.25rem",
              border: `2px solid ${T.color.gold}30`,
            }}>
              <svg width="1.75rem" height="1.75rem" viewBox="0 0 24 24" fill="none" stroke={T.color.gold} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <h3 style={{
              fontFamily: T.font.display, fontSize: "1.375rem", fontWeight: 500,
              color: T.color.charcoal, margin: "0 0 0.5rem",
            }}>
              {t("noGroupTitle")}
            </h3>
            <p style={{
              fontFamily: T.font.body, fontSize: "0.9375rem", color: T.color.walnut,
              margin: "0 0 1.5rem", lineHeight: 1.6, maxWidth: "28rem", marginLeft: "auto", marginRight: "auto",
            }}>
              {t("noGroupDesc")}
            </p>
          </div>

          {/* Benefits section */}
          <div style={{
            background: `${T.color.gold}08`,
            borderRadius: "1rem",
            border: `1px solid ${T.color.gold}20`,
            padding: "1.75rem 2rem",
            marginBottom: "1.5rem",
          }}>
            <h3 style={{
              fontFamily: T.font.display, fontSize: "1.25rem", fontWeight: 500,
              color: T.color.charcoal, margin: "0 0 1rem",
            }}>
              {t("benefitsTitle")}
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {(["benefit1", "benefit2", "benefit3", "benefit4"] as const).map((key) => (
                <div key={key} style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                  <span style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    width: "1.5rem", height: "1.5rem", borderRadius: "50%",
                    background: `${T.color.gold}20`, color: T.color.gold,
                    fontSize: "0.75rem", fontWeight: 700, flexShrink: 0, marginTop: "0.0625rem",
                  }}>{"\u2713"}</span>
                  <span style={{
                    fontFamily: T.font.body, fontSize: "0.9375rem", color: T.color.walnut, lineHeight: 1.5,
                  }}>
                    {t(key)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* How it works steps */}
          <div style={{
            background: T.color.white,
            borderRadius: "1rem",
            border: `1px solid ${T.color.cream}`,
            padding: "1.75rem 2rem",
            boxShadow: "0 2px 8px rgba(44,44,42,.04)",
            marginBottom: "1.5rem",
          }}>
            <h3 style={{
              fontFamily: T.font.display, fontSize: "1.25rem", fontWeight: 500,
              color: T.color.charcoal, margin: "0 0 1.25rem",
            }}>
              {t("stepsTitle")}
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(8.5rem, 1fr))", gap: "1rem" }}>
              {([
                { titleKey: "step1Title", descKey: "step1Desc" },
                { titleKey: "step2Title", descKey: "step2Desc" },
                { titleKey: "step3Title", descKey: "step3Desc" },
                { titleKey: "step4Title", descKey: "step4Desc" },
              ] as const).map((step, i) => (
                <div key={step.titleKey} style={{
                  textAlign: "center", padding: "1rem 0.75rem",
                  borderRadius: "0.875rem",
                  background: T.color.linen,
                  border: `1px solid ${T.color.cream}`,
                }}>
                  <div style={{
                    width: "2.5rem", height: "2.5rem", borderRadius: "50%",
                    background: `linear-gradient(135deg, ${T.color.gold}30, ${T.color.terracotta}20)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    margin: "0 auto 0.75rem",
                    fontFamily: T.font.display, fontSize: "1.125rem", fontWeight: 600,
                    color: T.color.gold,
                  }}>
                    {STEP_ICONS[i]}
                  </div>
                  <div style={{
                    fontFamily: T.font.display, fontSize: "0.9375rem", fontWeight: 600,
                    color: T.color.charcoal, marginBottom: "0.25rem",
                  }}>
                    {t(step.titleKey)}
                  </div>
                  <div style={{
                    fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.muted, lineHeight: 1.4,
                  }}>
                    {t(step.descKey)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ═══ CREATE GROUP CARD (shown always — either as initial CTA or as "+ add another") ═══ */}
      {(!hasGroups || showCreateForm) && (
        <div style={{
          background: T.color.white,
          borderRadius: "1rem",
          border: `1px solid ${T.color.cream}`,
          padding: "1.75rem 2rem",
          boxShadow: "0 2px 8px rgba(44,44,42,.04)",
          marginBottom: "1.5rem",
        }}>
          <h3 style={{
            fontFamily: T.font.display, fontSize: "1.25rem", fontWeight: 500,
            color: T.color.charcoal, margin: "0 0 0.375rem",
          }}>
            {t("createGroup")}
          </h3>
          <p style={{
            fontFamily: T.font.body, fontSize: "0.875rem", color: T.color.muted,
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
                borderRadius: "0.75rem",
                border: "none",
                background: !groupName.trim() || saving
                  ? `${T.color.sandstone}60`
                  : `linear-gradient(135deg, ${T.color.terracotta}, ${T.color.walnut})`,
                color: !groupName.trim() || saving ? T.color.muted : "#FFF",
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
                style={{
                  padding: "0.875rem 1.5rem",
                  borderRadius: "0.75rem",
                  border: `1px solid ${T.color.cream}`,
                  background: "transparent",
                  color: T.color.muted,
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
                  borderRadius: "0.625rem",
                  border: `1.5px solid ${T.color.terracotta}40`,
                  background: `${T.color.terracotta}08`,
                  color: T.color.terracotta,
                  fontFamily: T.font.body,
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all .15s",
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
              background: `linear-gradient(135deg, ${T.color.sage}08, ${T.color.gold}06)`,
              borderRadius: "1rem",
              border: `1.5px solid ${T.color.sage}25`,
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
                <svg width="1.25rem" height="1.25rem" viewBox="0 0 24 24" fill="none" stroke={T.color.sage} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                  <path d="M5 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                  <path d="M19 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                  <path d="M12 5v4" />
                  <path d="M5 16v-3a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v3" />
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontFamily: T.font.display, fontSize: "1.0625rem", fontWeight: 500,
                  color: T.color.charcoal, marginBottom: "0.125rem",
                }}>
                  {t("viewFamilyTree")}
                </div>
                <div style={{
                  fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.muted, lineHeight: 1.4,
                }}>
                  {t("familyTreeDesc")}
                </div>
              </div>
              <svg width="1.25rem" height="1.25rem" viewBox="0 0 24 24" fill="none" stroke={T.color.muted} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="m9 18 6-6-6-6" />
              </svg>
            </div>
          </Link>

          {/* ═══ WING SHARING SECTION ═══ */}
          <div style={{
            background: T.color.white,
            borderRadius: "1rem",
            border: `1px solid ${T.color.cream}`,
            padding: "1.75rem 2rem",
            boxShadow: "0 2px 8px rgba(44,44,42,.04)",
            marginBottom: "1.5rem",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
              <div style={{
                width: "2.5rem", height: "2.5rem", borderRadius: "0.625rem",
                background: `linear-gradient(135deg, ${T.color.sage}20, ${T.color.sage}10)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: T.color.sage,
              }}>
                <FamilyIcon name="palace" size={18} color={T.color.sage} />
              </div>
              <div>
                <h3 style={{
                  fontFamily: T.font.display, fontSize: "1.25rem", fontWeight: 500,
                  color: T.color.charcoal, margin: 0,
                }}>
                  {t("wingSharing")}
                </h3>
                <div style={{
                  fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.muted, marginTop: "0.125rem",
                }}>
                  {t("wingSharingDesc")}
                </div>
              </div>
            </div>

            {/* Share a wing form */}
            {uniqueOtherMembers.length > 0 && (
              <div style={{
                padding: "1.25rem 1.375rem",
                background: T.color.linen,
                borderRadius: "0.875rem",
                border: `1px solid ${T.color.cream}`,
                marginBottom: "1.5rem",
              }}>
                <label style={labelStyle}>{t("shareAWing")}</label>

                <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.875rem", flexWrap: "wrap" }}>
                  {WING_OPTION_IDS.map((wingId) => (
                    <button
                      key={wingId}
                      onClick={() => setShareWingId(wingId)}
                      aria-pressed={shareWingId === wingId}
                      style={{
                        padding: "0.5rem 1rem",
                        borderRadius: "0.5rem",
                        border: `1px solid ${shareWingId === wingId ? T.color.sage + "60" : T.color.cream}`,
                        background: shareWingId === wingId ? `${T.color.sage}15` : T.color.white,
                        cursor: "pointer",
                        fontFamily: T.font.body,
                        fontSize: "0.8125rem",
                        color: shareWingId === wingId ? T.color.sage : T.color.muted,
                        fontWeight: shareWingId === wingId ? 600 : 400,
                        transition: "all .15s",
                      }}
                    >
                      {tp(WING_LABEL_KEYS[wingId])}
                    </button>
                  ))}
                </div>

                <label htmlFor="family-share-member" style={{ ...labelStyle, marginTop: "0.5rem" }}>{t("familyMember")}</label>
                <select
                  id="family-share-member"
                  value={shareMemberEmail}
                  onChange={(e) => setShareMemberEmail(e.target.value)}
                  style={{
                    ...inputStyle,
                    marginBottom: "0.875rem",
                    cursor: "pointer",
                    appearance: "auto" as React.CSSProperties["appearance"],
                  }}
                >
                  <option value="">{t("selectMember")}</option>
                  {uniqueOtherMembers.map((m) => (
                    <option key={m.id} value={m.email}>{m.email}</option>
                  ))}
                </select>

                <label style={{ ...labelStyle, marginTop: "0.25rem" }}>{t("permission")}</label>
                <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
                  {(["view", "contribute"] as const).map((perm) => (
                    <button
                      key={perm}
                      onClick={() => setSharePermission(perm)}
                      aria-pressed={sharePermission === perm}
                      style={{
                        padding: "0.5rem 1rem",
                        borderRadius: "0.5rem",
                        border: `1px solid ${sharePermission === perm ? T.color.sage + "60" : T.color.cream}`,
                        background: sharePermission === perm ? `${T.color.sage}15` : T.color.white,
                        cursor: "pointer",
                        fontFamily: T.font.body,
                        fontSize: "0.8125rem",
                        color: sharePermission === perm ? T.color.sage : T.color.muted,
                        fontWeight: sharePermission === perm ? 600 : 400,
                        transition: "all .15s",
                      }}
                    >
                      {perm === "view" ? t("viewOnly") : t("canContribute")}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleShareWing}
                  disabled={!shareMemberEmail || sharingWing}
                  style={{
                    padding: "0.75rem 1.75rem",
                    borderRadius: "0.75rem",
                    border: "none",
                    background: !shareMemberEmail || sharingWing
                      ? `${T.color.sandstone}60`
                      : T.color.sage,
                    color: !shareMemberEmail || sharingWing ? T.color.muted : "#FFF",
                    fontFamily: T.font.body,
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    cursor: !shareMemberEmail || sharingWing ? "default" : "pointer",
                    transition: "all .15s",
                  }}
                >
                  {sharingWing ? t("sharing") : t("shareWing")}
                </button>
              </div>
            )}

            {uniqueOtherMembers.length === 0 && (
              <div style={{
                padding: "1rem 1.25rem",
                background: T.color.linen,
                borderRadius: "0.75rem",
                border: `1px solid ${T.color.cream}`,
                marginBottom: "1.5rem",
              }}>
                <p style={{
                  fontFamily: T.font.body, fontSize: "0.875rem", color: T.color.muted,
                  margin: 0, lineHeight: 1.5,
                }}>
                  {t("inviteToShare")}
                </p>
              </div>
            )}

            {uniqueOtherMembers.length > 0 && myWingShares.length === 0 && sharedWithMe.length === 0 && (
              <p style={{
                fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.muted,
                margin: "0 0 1rem", lineHeight: 1.5, fontStyle: "italic",
              }}>
                {t("noWingSharesYet")}
              </p>
            )}

            {myWingShares.length > 0 && (
              <>
                <label style={labelStyle}>{t("wingsShared")}</label>
                <div role="list" style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.5rem" }}>
                  {myWingShares.map((share) => (
                    <div key={share.id} role="listitem" style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "0.75rem 1rem", borderRadius: "0.75rem",
                      background: T.color.linen,
                      border: `1px solid ${T.color.cream}`,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", minWidth: 0 }}>
                        <span style={{
                          display: "inline-block",
                          padding: "0.1875rem 0.625rem",
                          borderRadius: "0.375rem",
                          background: `${T.color.sage}15`,
                          color: T.color.sage,
                          fontFamily: T.font.body,
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          flexShrink: 0,
                        }}>
                          {wingLabel(share.wing_id)}
                        </span>
                        <span style={{
                          fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.charcoal,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0,
                        }}>
                          {share.shared_with_email}
                        </span>
                        <span style={{
                          fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.muted,
                          padding: "0.125rem 0.5rem", borderRadius: "0.25rem",
                          background: `${T.color.sandstone}30`,
                        }}>
                          {share.permission === "view" ? t("viewOnly") : t("canContribute")}
                        </span>
                      </div>
                      {confirmUnshareId === share.id ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", flexShrink: 0 }}>
                          <span style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.charcoal }}>
                            {t("confirmUnshareShort")}
                          </span>
                          <button
                            onClick={() => handleUnshareWing(share.id)}
                            style={{
                              padding: "0.25rem 0.625rem", borderRadius: "0.375rem",
                              border: "none", background: T.color.error, color: "#FFF",
                              fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 600,
                              cursor: "pointer", transition: "all .15s",
                            }}
                          >
                            {t("confirmYes")}
                          </button>
                          <button
                            onClick={() => setConfirmUnshareId(null)}
                            style={{
                              padding: "0.25rem 0.625rem", borderRadius: "0.375rem",
                              border: `1px solid ${T.color.cream}`, background: T.color.white,
                              color: T.color.muted, fontFamily: T.font.body, fontSize: "0.6875rem",
                              fontWeight: 500, cursor: "pointer", transition: "all .15s",
                            }}
                          >
                            {t("cancel")}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmUnshareId(share.id)}
                          aria-label={t("removeShare", { email: share.shared_with_email || "" })}
                          style={{
                            width: "1.75rem", height: "1.75rem", borderRadius: "0.4375rem",
                            border: `1px solid ${T.color.cream}`,
                            background: "transparent",
                            color: T.color.muted,
                            fontSize: "0.75rem",
                            cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            transition: "all .15s",
                            minWidth: "2.75rem", minHeight: "2.75rem",
                          }}
                        >
                          {"\u2715"}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {sharedWithMe.length > 0 && (
              <>
                <label style={labelStyle}>{t("sharedWithMe")}</label>
                <div role="list" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {sharedWithMe.map((share) => (
                    <div key={share.id} role="listitem" style={{
                      display: "flex", alignItems: "center",
                      padding: "0.75rem 1rem", borderRadius: "0.75rem",
                      background: `${T.color.sage}06`,
                      border: `1px solid ${T.color.sage}20`,
                      gap: "0.625rem",
                    }}>
                      <span style={{
                        display: "inline-block",
                        padding: "0.1875rem 0.625rem",
                        borderRadius: "0.375rem",
                        background: `${T.color.sage}15`,
                        color: T.color.sage,
                        fontFamily: T.font.body,
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        flexShrink: 0,
                      }}>
                        {wingLabel(share.wing_id)}
                      </span>
                      <span style={{
                        fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.charcoal,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0,
                      }}>
                        {t("from")} {share.owner_email}
                      </span>
                      <span style={{
                        fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.muted,
                        padding: "0.125rem 0.5rem", borderRadius: "0.25rem",
                        background: `${T.color.sandstone}30`,
                      }}>
                        {share.permission === "view" ? t("viewOnly") : t("canContribute")}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Info footer */}
          <div style={{
            padding: "1rem 1.25rem",
            background: `${T.color.warmStone}80`,
            borderRadius: "0.75rem",
            border: `1px solid ${T.color.cream}`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.375rem" }}>
              <FamilyIcon name="lock" size={14} color={T.color.walnut} />
              <span style={{ fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600, color: T.color.charcoal }}>
                {t("howItWorks")}
              </span>
            </div>
            <p style={{
              fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.muted,
              lineHeight: 1.6, margin: 0,
            }}>
              {t("howItWorksDesc")}
            </p>
          </div>
        </>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        ${settingsFocusStyle}
      `}</style>
    </div>
  );
}

// Shared styles
const labelStyle: React.CSSProperties = {
  fontFamily: T.font.body,
  fontSize: "0.8125rem",
  fontWeight: 600,
  color: T.color.walnut,
  letterSpacing: ".3px",
  textTransform: "uppercase",
  display: "block",
  marginBottom: "0.5rem",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.875rem 1.125rem",
  borderRadius: "0.75rem",
  border: `1.5px solid ${T.color.sandstone}`,
  background: T.color.white,
  fontFamily: T.font.body,
  fontSize: "0.9375rem",
  color: T.color.charcoal,
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color .2s, box-shadow .2s",
};

/* ── Global focus-visible ring for settings inputs ── */
const settingsFocusStyle = `
  .mp-settings-input:focus-visible {
    outline: 0.125rem solid ${T.color.terracotta};
    outline-offset: 0.0625rem;
    border-color: ${T.color.terracotta};
  }
`;
