"use client";

import { useState, useEffect, useCallback } from "react";
import { T } from "@/lib/theme";
import {
  createFamilyGroup,
  inviteFamilyMember,
  acceptFamilyInvite,
  removeFamilyMember,
  getFamilyGroup,
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

export default function FamilyPage() {
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

  useEffect(() => { loadGroup(); }, [loadGroup]);

  const handleCreateGroup = async () => {
    if (!groupName.trim()) return;
    setSaving(true);
    const result = await createFamilyGroup(groupName.trim());
    setSaving(false);
    if (result.error) {
      showToast(result.error, "error");
    } else {
      showToast("Family group created!", "success");
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
      showToast(`Invitation sent to ${inviteEmail.trim()}`, "success");
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
      showToast("You have joined the family group!", "success");
      loadGroup();
    }
  };

  const handleRemoveMember = async (userId: string, email: string) => {
    if (!group) return;
    const result = await removeFamilyMember(group.id, userId);
    if (result.error) {
      showToast(result.error, "error");
    } else {
      showToast(`${email} has been removed`, "success");
      loadGroup();
    }
  };

  const canManage = userRole === "owner" || userRole === "admin";

  const roleColor = (role: string) => {
    if (role === "owner") return T.color.terracotta;
    if (role === "admin") return T.color.walnut;
    return T.color.sage;
  };

  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: "center", fontFamily: T.font.body, fontSize: 16, color: T.color.muted }}>
        Loading family settings...
      </div>
    );
  }

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 24, right: 24, zIndex: 100,
          padding: "14px 20px", borderRadius: 12,
          background: toast.type === "success" ? T.color.sage : T.color.error,
          color: "#FFF",
          fontFamily: T.font.body, fontSize: 14, fontWeight: 500,
          boxShadow: "0 8px 24px rgba(0,0,0,.15)",
          animation: "fadeIn .2s ease",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span>{toast.type === "success" ? "\u2713" : "\u26A0"}</span>
          {toast.message}
          <button onClick={() => setToast(null)} style={{
            background: "none", border: "none", color: "#FFF",
            fontSize: 16, cursor: "pointer", marginLeft: 8, opacity: 0.7,
          }}>{"\u2715"}</button>
        </div>
      )}

      {/* Page header */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{
          fontFamily: T.font.display, fontSize: 28, fontWeight: 500,
          color: T.color.charcoal, margin: "0 0 8px",
        }}>
          Family Sharing
        </h2>
        <p style={{
          fontFamily: T.font.body, fontSize: 15, color: T.color.muted,
          margin: 0, lineHeight: 1.5,
        }}>
          Create a family group to share your memory palace wings and rooms with loved ones.
        </p>
      </div>

      {/* Pending invite */}
      {pendingInvite && group && (
        <div style={{
          background: `${T.color.terracotta}08`,
          borderRadius: 16,
          border: `2px solid ${T.color.terracotta}30`,
          padding: "28px 32px",
          boxShadow: "0 2px 8px rgba(44,44,42,.04)",
          marginBottom: 24,
        }}>
          <h3 style={{
            fontFamily: T.font.display, fontSize: 20, fontWeight: 500,
            color: T.color.charcoal, margin: "0 0 8px",
          }}>
            You have been invited!
          </h3>
          <p style={{
            fontFamily: T.font.body, fontSize: 15, color: T.color.walnut,
            margin: "0 0 20px", lineHeight: 1.5,
          }}>
            You have been invited to join the family group &ldquo;{group.name}&rdquo;.
            Joining will give you access to shared wings and rooms from family members.
          </p>
          <button
            onClick={handleAcceptInvite}
            disabled={saving}
            style={{
              padding: "14px 32px",
              borderRadius: 12,
              border: "none",
              background: saving ? `${T.color.sandstone}60` : `linear-gradient(135deg, ${T.color.terracotta}, ${T.color.walnut})`,
              color: saving ? T.color.muted : "#FFF",
              fontFamily: T.font.body,
              fontSize: 15,
              fontWeight: 600,
              cursor: saving ? "default" : "pointer",
              transition: "all .2s",
            }}
          >
            {saving ? "Joining..." : "Accept Invite"}
          </button>
        </div>
      )}

      {/* Create group (if no group) */}
      {!group && !pendingInvite && (
        <div style={{
          background: T.color.white,
          borderRadius: 16,
          border: `1px solid ${T.color.cream}`,
          padding: "28px 32px",
          boxShadow: "0 2px 8px rgba(44,44,42,.04)",
          marginBottom: 24,
        }}>
          <h3 style={{
            fontFamily: T.font.display, fontSize: 20, fontWeight: 500,
            color: T.color.charcoal, margin: "0 0 6px",
          }}>
            Create a Family Group
          </h3>
          <p style={{
            fontFamily: T.font.body, fontSize: 14, color: T.color.muted,
            margin: "0 0 22px", lineHeight: 1.5,
          }}>
            Start a family group and invite your loved ones. Family members automatically
            get view access to shared wings and rooms.
          </p>

          <div>
            <label style={labelStyle}>Group Name</label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g. The Van Dijk Family"
              onKeyDown={(e) => { if (e.key === "Enter") handleCreateGroup(); }}
              style={inputStyle}
            />
          </div>

          <button
            onClick={handleCreateGroup}
            disabled={!groupName.trim() || saving}
            style={{
              marginTop: 20,
              padding: "14px 32px",
              borderRadius: 12,
              border: "none",
              background: !groupName.trim() || saving
                ? `${T.color.sandstone}60`
                : `linear-gradient(135deg, ${T.color.terracotta}, ${T.color.walnut})`,
              color: !groupName.trim() || saving ? T.color.muted : "#FFF",
              fontFamily: T.font.body,
              fontSize: 15,
              fontWeight: 600,
              cursor: !groupName.trim() || saving ? "default" : "pointer",
              transition: "all .2s",
            }}
          >
            {saving ? "Creating..." : "Create Group"}
          </button>
        </div>
      )}

      {/* Group info & members */}
      {group && !pendingInvite && (
        <>
          {/* Group card */}
          <div style={{
            background: T.color.white,
            borderRadius: 16,
            border: `1px solid ${T.color.cream}`,
            padding: "28px 32px",
            boxShadow: "0 2px 8px rgba(44,44,42,.04)",
            marginBottom: 24,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 14,
                  background: `linear-gradient(135deg, ${T.color.terracotta}20, ${T.color.walnut}15)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 24,
                }}>
                  {"\u{1F3E0}"}
                </div>
                <div>
                  <h3 style={{
                    fontFamily: T.font.display, fontSize: 22, fontWeight: 500,
                    color: T.color.charcoal, margin: 0,
                  }}>
                    {group.name}
                  </h3>
                  <div style={{
                    fontFamily: T.font.body, fontSize: 13, color: T.color.muted, marginTop: 4,
                  }}>
                    {members.length} member{members.length !== 1 ? "s" : ""} &middot; Your role: {userRole}
                  </div>
                </div>
              </div>
            </div>

            {/* Invite section (owner/admin only) */}
            {canManage && (
              <div style={{
                padding: "20px 22px",
                background: T.color.linen,
                borderRadius: 14,
                border: `1px solid ${T.color.cream}`,
                marginBottom: 24,
              }}>
                <label style={labelStyle}>Invite a Family Member</label>
                <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="name@example.com"
                    onKeyDown={(e) => { if (e.key === "Enter") handleInvite(); }}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button
                    onClick={handleInvite}
                    disabled={!inviteEmail.trim() || !inviteEmail.includes("@") || inviting}
                    style={{
                      padding: "14px 24px",
                      borderRadius: 12,
                      border: "none",
                      background: !inviteEmail.trim() || inviting
                        ? `${T.color.sandstone}60`
                        : T.color.terracotta,
                      color: !inviteEmail.trim() || inviting ? T.color.muted : "#FFF",
                      fontFamily: T.font.body,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: !inviteEmail.trim() || inviting ? "default" : "pointer",
                      transition: "all .15s",
                      flexShrink: 0,
                    }}
                  >
                    {inviting ? "Inviting..." : "Invite"}
                  </button>
                </div>
                {/* Role selector */}
                <div style={{ display: "flex", gap: 8 }}>
                  {(["member", "admin"] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setInviteRole(r)}
                      style={{
                        padding: "8px 16px",
                        borderRadius: 8,
                        border: `1px solid ${inviteRole === r ? T.color.terracotta + "40" : T.color.cream}`,
                        background: inviteRole === r ? `${T.color.terracotta}10` : T.color.white,
                        cursor: "pointer",
                        fontFamily: T.font.body,
                        fontSize: 13,
                        color: inviteRole === r ? T.color.terracotta : T.color.muted,
                        fontWeight: inviteRole === r ? 600 : 400,
                        transition: "all .15s",
                      }}
                    >
                      {r === "member" ? "Member" : "Admin"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Members list */}
            <label style={labelStyle}>Members</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {members.map((member) => (
                <div key={member.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "14px 18px", borderRadius: 12,
                  background: T.color.linen,
                  border: `1px solid ${T.color.cream}`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 18,
                      background: `${roleColor(member.role)}20`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: T.font.body, fontSize: 14, fontWeight: 600,
                      color: roleColor(member.role),
                    }}>
                      {member.email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{
                        fontFamily: T.font.body, fontSize: 14, fontWeight: 500,
                        color: T.color.charcoal,
                      }}>
                        {member.email}
                      </div>
                      <div style={{
                        fontFamily: T.font.body, fontSize: 12, color: T.color.muted,
                        display: "flex", alignItems: "center", gap: 8, marginTop: 2,
                      }}>
                        <span style={{
                          display: "inline-block",
                          padding: "1px 8px",
                          borderRadius: 6,
                          background: `${roleColor(member.role)}15`,
                          color: roleColor(member.role),
                          fontSize: 11,
                          fontWeight: 600,
                          textTransform: "capitalize",
                        }}>
                          {member.role}
                        </span>
                        <span style={{
                          color: member.status === "active" ? T.color.sage : T.color.muted,
                        }}>
                          {member.status === "active" ? "Active" : "Invited"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Remove button (owner/admin, can't remove owner) */}
                  {canManage && member.role !== "owner" && member.user_id && (
                    <button
                      onClick={() => handleRemoveMember(member.user_id!, member.email)}
                      style={{
                        width: 32, height: 32, borderRadius: 8,
                        border: `1px solid ${T.color.cream}`,
                        background: "transparent",
                        color: T.color.muted,
                        fontSize: 13,
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

          {/* Info */}
          <div style={{
            padding: "16px 20px",
            background: `${T.color.warmStone}80`,
            borderRadius: 12,
            border: `1px solid ${T.color.cream}`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 14 }}>{"\u{1F512}"}</span>
              <span style={{ fontFamily: T.font.body, fontSize: 13, fontWeight: 600, color: T.color.charcoal }}>
                How Family Sharing Works
              </span>
            </div>
            <p style={{
              fontFamily: T.font.body, fontSize: 13, color: T.color.muted,
              lineHeight: 1.6, margin: 0,
            }}>
              Family members automatically get view access to wings and rooms you share with the
              &ldquo;family&rdquo; visibility setting. Each member&apos;s private memories remain private.
              Owners and admins can invite or remove members.
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
  fontSize: 13,
  fontWeight: 600,
  color: T.color.walnut,
  letterSpacing: ".3px",
  textTransform: "uppercase",
  display: "block",
  marginBottom: 8,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 18px",
  borderRadius: 12,
  border: `1.5px solid ${T.color.sandstone}`,
  background: T.color.white,
  fontFamily: T.font.body,
  fontSize: 15,
  color: T.color.charcoal,
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color .2s",
};
