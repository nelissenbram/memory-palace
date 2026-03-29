"use client";

import { useState, useEffect, useCallback } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import {
  createFamilyGroup,
  inviteFamilyMember,
  acceptFamilyInvite,
  removeFamilyMember,
  getFamilyGroup,
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

export default function FamilyPage() {
  const { t } = useTranslation("familySettings");
  const { t: tp } = useTranslation("palace");
  const [group, setGroup] = useState<FamilyGroup | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [userRole, setUserRole] = useState<string>("");
  const [pendingInvite, setPendingInvite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [groupName, setGroupName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [saving, setSaving] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

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

  const loadGroup = useCallback(async () => {
    const result = await getFamilyGroup();
    setGroup(result.group || null);
    setMembers((result.members || []) as FamilyMember[]);
    setUserRole(result.userRole || "");
    setPendingInvite(!!result.pendingInvite);
    setLoading(false);
  }, []);

  const loadWingShares = useCallback(async () => {
    const [myRes, withMeRes] = await Promise.all([
      getMyWingShares(),
      getWingsSharedWithMe(),
    ]);
    setMyWingShares((myRes.shares || []) as WingShare[]);
    setSharedWithMe((withMeRes.shares || []) as WingShare[]);
  }, []);

  useEffect(() => { loadGroup(); }, [loadGroup]);
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
      loadGroup();
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !inviteEmail.includes("@") || !group) return;
    setInviting(true);
    const result = await inviteFamilyMember(group.id, inviteEmail.trim(), inviteRole);
    setInviting(false);
    if (result.error) {
      showToast(result.error, "error");
    } else {
      showToast(t("inviteSent", { email: inviteEmail.trim() }), "success");
      setInviteEmail("");
      loadGroup();
    }
  };

  const handleAcceptInvite = async () => {
    if (!group) return;
    setSaving(true);
    const result = await acceptFamilyInvite(group.id);
    setSaving(false);
    if (result.error) {
      showToast(result.error, "error");
    } else {
      showToast(t("joinedSuccess"), "success");
      loadGroup();
    }
  };

  const handleRemoveMember = async (userId: string, email: string) => {
    if (!group) return;
    const result = await removeFamilyMember(group.id, userId);
    if (result.error) {
      showToast(result.error, "error");
    } else {
      showToast(t("memberRemoved", { email }), "success");
      loadGroup();
    }
  };

  const handleShareWing = async () => {
    if (!shareMemberEmail.trim() || !shareMemberEmail.includes("@")) return;
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
    if (result.error) {
      showToast(result.error, "error");
    } else {
      showToast(t("wingShareRemoved"), "success");
      loadWingShares();
    }
  };

  const canManage = userRole === "owner" || userRole === "admin";

  const activeMembers = members.filter((m) => m.status === "active");

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
          <button onClick={() => setToast(null)} aria-label="Close"  style={{
            background: "none", border: "none", color: "#FFF",
            fontSize: "1rem", cursor: "pointer", marginLeft: "0.5rem", opacity: 0.7,
          }}>{"\u2715"}</button>
        </div>
      )}

      {/* Page header */}
      <div style={{ marginBottom: "2rem" }}>
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

      {/* Pending invite */}
      {pendingInvite && group && (
        <div style={{
          background: `${T.color.terracotta}08`,
          borderRadius: "1rem",
          border: `2px solid ${T.color.terracotta}30`,
          padding: "1.75rem 2rem",
          boxShadow: "0 2px 8px rgba(44,44,42,.04)",
          marginBottom: "1.5rem",
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
            {t("invitedDescription", { name: group.name })}
          </p>
          <button
            onClick={handleAcceptInvite}
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
      )}

      {/* Create group (if no group) */}
      {!group && !pendingInvite && (
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
              id="family-group-name"
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder={t("groupNamePlaceholder")}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreateGroup(); }}
              style={inputStyle}
            />
          </div>

          <button
            onClick={handleCreateGroup}
            disabled={!groupName.trim() || saving}
            style={{
              marginTop: "1.25rem",
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
        </div>
      )}

      {/* Group info & members */}
      {group && !pendingInvite && (
        <>
          {/* Group card */}
          <div style={{
            background: T.color.white,
            borderRadius: "1rem",
            border: `1px solid ${T.color.cream}`,
            padding: "1.75rem 2rem",
            boxShadow: "0 2px 8px rgba(44,44,42,.04)",
            marginBottom: "1.5rem",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <div style={{
                  width: "3.25rem", height: "3.25rem", borderRadius: "0.875rem",
                  background: `linear-gradient(135deg, ${T.color.terracotta}20, ${T.color.walnut}15)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "1.5rem",
                }}>
                  {"\u{1F3E0}"}
                </div>
                <div>
                  <h3 style={{
                    fontFamily: T.font.display, fontSize: "1.375rem", fontWeight: 500,
                    color: T.color.charcoal, margin: 0,
                  }}>
                    {group.name}
                  </h3>
                  <div style={{
                    fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.muted, marginTop: "0.25rem",
                  }}>
                    {members.length !== 1 ? t("membersCount", { count: String(members.length) }) : t("memberCount", { count: String(members.length) })} &middot; {t("yourRole", { role: userRole })}
                  </div>
                </div>
              </div>
            </div>

            {/* Invite section (owner/admin only) */}
            {canManage && (
              <div style={{
                padding: "1.25rem 1.375rem",
                background: T.color.linen,
                borderRadius: "0.875rem",
                border: `1px solid ${T.color.cream}`,
                marginBottom: "1.5rem",
              }}>
                <label htmlFor="family-invite-email" style={labelStyle}>{t("inviteMember")}</label>
                <div style={{ display: "flex", gap: "0.625rem", marginBottom: "0.75rem" }}>
                  <input
                    id="family-invite-email"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder={t("emailPlaceholder")}
                    onKeyDown={(e) => { if (e.key === "Enter") handleInvite(); }}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button
                    onClick={handleInvite}
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
                {/* Role selector */}
                <div style={{ display: "flex", gap: "0.5rem" }}>
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
                      }}
                    >
                      {r === "member" ? t("roleMember") : t("roleAdmin")}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Members list */}
            <label style={labelStyle}>{t("members")}</label>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {members.map((member) => (
                <div key={member.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "0.875rem 1.125rem", borderRadius: "0.75rem",
                  background: T.color.linen,
                  border: `1px solid ${T.color.cream}`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div style={{
                      width: "2.25rem", height: "2.25rem", borderRadius: "1.125rem",
                      background: `${roleColor(member.role)}20`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: 600,
                      color: roleColor(member.role),
                    }}>
                      {member.email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{
                        fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: 500,
                        color: T.color.charcoal,
                      }}>
                        {member.email}
                      </div>
                      <div style={{
                        fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.muted,
                        display: "flex", alignItems: "center", gap: "0.5rem", marginTop: 2,
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
                        <span style={{
                          color: member.status === "active" ? T.color.sage : T.color.muted,
                        }}>
                          {member.status === "active" ? t("statusActive") : t("statusInvited")}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Remove button (owner/admin, can't remove owner) */}
                  {canManage && member.role !== "owner" && member.user_id && (
                    <button
                      onClick={() => handleRemoveMember(member.user_id!, member.email)}
                      style={{
                        width: "2rem", height: "2rem", borderRadius: "0.5rem",
                        border: `1px solid ${T.color.cream}`,
                        background: "transparent",
                        color: T.color.muted,
                        fontSize: "0.8125rem",
                        cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "all .15s",
                      }}
                    >
                      {"\u2715"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

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
                fontSize: "1.125rem",
              }}>
                {"\u{1F3DB}"}
              </div>
              <div>
                <h3 style={{
                  fontFamily: T.font.display, fontSize: "1.25rem", fontWeight: 500,
                  color: T.color.charcoal, margin: 0,
                }}>
                  {t("wingSharing")}
                </h3>
                <div style={{
                  fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.muted, marginTop: 2,
                }}>
                  {t("wingSharingDesc")}
                </div>
              </div>
            </div>

            {/* Share a wing form */}
            {activeMembers.length > 1 && (
              <div style={{
                padding: "1.25rem 1.375rem",
                background: T.color.linen,
                borderRadius: "0.875rem",
                border: `1px solid ${T.color.cream}`,
                marginBottom: "1.5rem",
              }}>
                <label style={labelStyle}>{t("shareAWing")}</label>

                {/* Wing selector */}
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

                {/* Family member selector */}
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
                  {activeMembers
                    .filter((m) => m.role !== "owner" || m.user_id !== group?.created_by)
                    .map((m) => (
                      <option key={m.id} value={m.email}>{m.email}</option>
                    ))}
                </select>

                {/* Permission selector */}
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

            {activeMembers.length <= 1 && (
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

            {/* My shared wings */}
            {myWingShares.length > 0 && (
              <>
                <label style={labelStyle}>{t("wingsShared")}</label>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.5rem" }}>
                  {myWingShares.map((share) => (
                    <div key={share.id} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "0.75rem 1rem", borderRadius: "0.75rem",
                      background: T.color.linen,
                      border: `1px solid ${T.color.cream}`,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                        <span style={{
                          display: "inline-block",
                          padding: "3px 0.625rem",
                          borderRadius: "0.375rem",
                          background: `${T.color.sage}15`,
                          color: T.color.sage,
                          fontFamily: T.font.body,
                          fontSize: "0.75rem",
                          fontWeight: 600,
                        }}>
                          {wingLabel(share.wing_id)}
                        </span>
                        <span style={{
                          fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.charcoal,
                        }}>
                          {share.shared_with_email}
                        </span>
                        <span style={{
                          fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.muted,
                          padding: "2px 0.5rem", borderRadius: "0.25rem",
                          background: `${T.color.sandstone}30`,
                        }}>
                          {share.permission === "view" ? t("viewOnly") : t("canContribute")}
                        </span>
                      </div>
                      <button
                        onClick={() => handleUnshareWing(share.id)}
                        style={{
                          width: "1.75rem", height: "1.75rem", borderRadius: "0.4375rem",
                          border: `1px solid ${T.color.cream}`,
                          background: "transparent",
                          color: T.color.muted,
                          fontSize: "0.75rem",
                          cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          transition: "all .15s",
                        }}
                      >
                        {"\u2715"}
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Shared with me */}
            {sharedWithMe.length > 0 && (
              <>
                <label style={labelStyle}>{t("sharedWithMe")}</label>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {sharedWithMe.map((share) => (
                    <div key={share.id} style={{
                      display: "flex", alignItems: "center",
                      padding: "0.75rem 1rem", borderRadius: "0.75rem",
                      background: `${T.color.sage}06`,
                      border: `1px solid ${T.color.sage}20`,
                      gap: "0.625rem",
                    }}>
                      <span style={{
                        display: "inline-block",
                        padding: "3px 0.625rem",
                        borderRadius: "0.375rem",
                        background: `${T.color.sage}15`,
                        color: T.color.sage,
                        fontFamily: T.font.body,
                        fontSize: "0.75rem",
                        fontWeight: 600,
                      }}>
                        {wingLabel(share.wing_id)}
                      </span>
                      <span style={{
                        fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.charcoal,
                      }}>
                        {t("from")} {share.owner_email}
                      </span>
                      <span style={{
                        fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.muted,
                        padding: "2px 0.5rem", borderRadius: "0.25rem",
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

          {/* Info */}
          <div style={{
            padding: "1rem 1.25rem",
            background: `${T.color.warmStone}80`,
            borderRadius: "0.75rem",
            border: `1px solid ${T.color.cream}`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.375rem" }}>
              <span style={{ fontSize: "0.875rem" }}>{"\u{1F512}"}</span>
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
  transition: "border-color .2s",
};
