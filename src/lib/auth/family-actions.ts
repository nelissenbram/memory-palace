"use server";

import { createClient } from "@/lib/supabase/server";
import { sendFamilyInviteEmail } from "@/lib/email/send-invite";

export async function createFamilyGroup(name: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { error: "Supabase not configured" };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  if (!name.trim()) return { error: "Group name is required" };

  // Create the group
  const { data: group, error } = await supabase
    .from("family_groups")
    .insert({ name: name.trim(), created_by: user.id })
    .select()
    .single();
  if (error) return { error: error.message };

  // Add creator as owner member
  const memberEmail = user.email || "";
  const joinedAt = new Date().toISOString();
  const { data: member, error: memberError } = await supabase
    .from("family_members")
    .insert({
      group_id: group.id,
      user_id: user.id,
      email: memberEmail,
      role: "owner",
      status: "active",
      joined_at: joinedAt,
    })
    .select()
    .single();
  if (memberError) return { error: memberError.message };

  // Return full data so the UI can update immediately without re-fetching
  return {
    group,
    members: [member],
    userRole: "owner" as const,
    userEmail: memberEmail,
  };
}

export async function inviteFamilyMember(groupId: string, email: string, role: "admin" | "member" = "member") {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { error: "Supabase not configured" };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  if (!email.trim() || !email.includes("@")) return { error: "Valid email is required" };
  const normalizedEmail = email.trim().toLowerCase();

  // Check user has permission (owner or admin)
  const { data: callerMember } = await supabase
    .from("family_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single();

  // Fallback: if the membership row is missing or RLS blocked the SELECT,
  // check if the user is the group creator (created_by) on family_groups.
  // The owner should always be able to invite members.
  let isGroupCreator = false;
  if (!callerMember || !["owner", "admin"].includes(callerMember.role)) {
    const { data: group } = await supabase
      .from("family_groups")
      .select("id")
      .eq("id", groupId)
      .eq("created_by", user.id)
      .single();
    isGroupCreator = !!group;
  }

  if (!callerMember || (!["owner", "admin"].includes(callerMember.role) && !isGroupCreator)) {
    // If the user is the group creator but their membership row is missing,
    // auto-repair it before proceeding.
    if (isGroupCreator) {
      const memberEmail = user.email || "";
      await supabase
        .from("family_members")
        .insert({
          group_id: groupId,
          user_id: user.id,
          email: memberEmail,
          role: "owner",
          status: "active",
          joined_at: new Date().toISOString(),
        });
    } else {
      return { error: "You do not have permission to invite members" };
    }
  }

  // Check if already a member
  const { data: existingMember } = await supabase
    .from("family_members")
    .select("id")
    .eq("group_id", groupId)
    .eq("email", normalizedEmail)
    .single();
  if (existingMember) return { error: "This person is already in the group" };

  // Look up if invitee has an account
  const { data: inviteeProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", normalizedEmail)
    .single();

  const validRole = ["admin", "member"].includes(role) ? role : "member";

  const { data: member, error } = await supabase
    .from("family_members")
    .insert({
      group_id: groupId,
      user_id: inviteeProfile?.id || null,
      email: normalizedEmail,
      role: validRole,
      status: inviteeProfile?.id ? "active" : "invited",
      joined_at: inviteeProfile?.id ? new Date().toISOString() : null,
    })
    .select()
    .single();
  if (error) return { error: error.message };

  // Send invitation email (non-blocking: log but don't fail the action)
  try {
    const { data: group } = await supabase
      .from("family_groups")
      .select("name")
      .eq("id", groupId)
      .single();
    const { data: inviterProfile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single();
    const inviterName =
      (inviterProfile?.display_name as string | undefined) ||
      user.email?.split("@")[0] ||
      "A friend";
    const result = await sendFamilyInviteEmail({
      inviterName,
      recipientEmail: normalizedEmail,
      groupName: (group?.name as string | undefined) || "Family",
      role: validRole,
    });
    if (!result.success) {
      console.error("[inviteFamilyMember] Email send failed:", result.error);
    }
  } catch (e) {
    console.error("[inviteFamilyMember] Email send exception:", e);
  }

  return { member };
}

export async function acceptFamilyInvite(groupId: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { error: "Supabase not configured" };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Find the invite by email
  const { data: invite } = await supabase
    .from("family_members")
    .select("id, email")
    .eq("group_id", groupId)
    .eq("email", user.email?.toLowerCase() || "")
    .eq("status", "invited")
    .single();

  if (!invite) return { error: "No pending invite found" };

  const { error } = await supabase
    .from("family_members")
    .update({
      user_id: user.id,
      status: "active",
      joined_at: new Date().toISOString(),
    })
    .eq("id", invite.id);

  if (error) return { error: error.message };
  return { success: true };
}

export async function removeFamilyMember(groupId: string, userId: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { error: "Supabase not configured" };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Check caller has permission (owner or admin)
  const { data: callerMember } = await supabase
    .from("family_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single();

  // Fallback: check if user is the group creator
  let isCreatorForRemove = false;
  if (!callerMember || !["owner", "admin"].includes(callerMember.role)) {
    const { data: group } = await supabase
      .from("family_groups")
      .select("id")
      .eq("id", groupId)
      .eq("created_by", user.id)
      .single();
    isCreatorForRemove = !!group;
  }

  if (!userId) return { error: "Invalid user ID" };

  // Allow self-removal or owner/admin removal
  const isSelf = userId === user.id;
  const isPrivileged = callerMember && ["owner", "admin"].includes(callerMember.role);
  if (!isSelf && !isPrivileged && !isCreatorForRemove) {
    return { error: "You do not have permission to remove members" };
  }

  // Prevent owner from being removed
  const { data: targetMember } = await supabase
    .from("family_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .single();
  if (targetMember?.role === "owner" && !isSelf) {
    return { error: "Cannot remove the group owner" };
  }

  const { error } = await supabase
    .from("family_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", userId);

  if (error) return { error: error.message };

  // Clean up wing_shares scoped to this family group:
  // Only remove shares where the other party is still a member of this group.
  const { data: remainingMembers } = await supabase
    .from("family_members")
    .select("user_id")
    .eq("group_id", groupId)
    .not("user_id", "is", null);

  const remainingUserIds = (remainingMembers || [])
    .map((m) => m.user_id)
    .filter((id): id is string => !!id);

  if (remainingUserIds.length > 0) {
    // Delete shares where removed user owned a wing shared with remaining group members
    await supabase
      .from("wing_shares")
      .delete()
      .eq("owner_id", userId)
      .in("shared_with_id", remainingUserIds);

    // Delete shares where remaining group members shared a wing with the removed user
    await supabase
      .from("wing_shares")
      .delete()
      .eq("shared_with_id", userId)
      .in("owner_id", remainingUserIds);
  }

  return { success: true };
}

export async function updateFamilyGroup(groupId: string, updates: { name: string }) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { error: "Supabase not configured" };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  if (!updates.name?.trim()) return { error: "Group name is required" };

  // Check caller has permission (owner or admin)
  const { data: callerMember } = await supabase
    .from("family_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single();

  // Fallback: check if user is the group creator
  let isCreator = false;
  if (!callerMember || !["owner", "admin"].includes(callerMember.role)) {
    const { data: group } = await supabase
      .from("family_groups")
      .select("id")
      .eq("id", groupId)
      .eq("created_by", user.id)
      .single();
    isCreator = !!group;
  }

  if (!callerMember || (!["owner", "admin"].includes(callerMember.role) && !isCreator)) {
    return { error: "You do not have permission to rename this group" };
  }

  const { error } = await supabase
    .from("family_groups")
    .update({ name: updates.name.trim() })
    .eq("id", groupId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function deleteFamilyGroup(groupId: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { error: "Supabase not configured" };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Only the creator can delete the group
  const { data: group } = await supabase
    .from("family_groups")
    .select("id, created_by")
    .eq("id", groupId)
    .eq("created_by", user.id)
    .single();

  if (!group) {
    return { error: "Only the group creator can delete this group" };
  }

  // Delete all family_members rows for this group first
  const { error: membersError } = await supabase
    .from("family_members")
    .delete()
    .eq("group_id", groupId);

  if (membersError) return { error: membersError.message };

  // Delete the group itself
  const { error } = await supabase
    .from("family_groups")
    .delete()
    .eq("id", groupId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function getFamilyGroup() {
  // Legacy single-group getter — returns the first group found.
  // Prefer getAllFamilyGroups() for multi-group support.
  const result = await getAllFamilyGroups();
  if (result.groups.length === 0 && result.pendingInvites.length === 0) {
    return { group: null, members: [], pendingInvite: false, userRole: "", userEmail: result.userEmail };
  }
  if (result.groups.length > 0) {
    const first = result.groups[0];
    return {
      group: first.group,
      members: first.members,
      userRole: first.userRole,
      userEmail: result.userEmail,
    };
  }
  // Only pending invites, no active groups
  const firstInvite = result.pendingInvites[0];
  return {
    group: firstInvite.group,
    members: [],
    pendingInvite: true,
    userRole: firstInvite.userRole,
    userEmail: result.userEmail,
  };
}

export async function getAllFamilyGroups() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { groups: [], pendingInvites: [], userEmail: "" };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { groups: [], pendingInvites: [], userEmail: "" };

  const userEmail = user.email || "";

  // Find all active memberships for this user
  const { data: memberships } = await supabase
    .from("family_members")
    .select("group_id, role")
    .eq("user_id", user.id)
    .eq("status", "active");

  // Find all pending invites by email
  const { data: invites } = await supabase
    .from("family_members")
    .select("group_id, role, status")
    .eq("email", userEmail.toLowerCase())
    .eq("status", "invited");

  // Auto-repair: check for owned groups where user has no membership row
  const { data: ownedGroups } = await supabase
    .from("family_groups")
    .select("*")
    .eq("created_by", user.id);

  const membershipGroupIds = new Set((memberships || []).map((m) => m.group_id));
  const inviteGroupIds = new Set((invites || []).map((i) => i.group_id));

  // Auto-repair orphaned owned groups
  for (const ownedGroup of (ownedGroups || [])) {
    if (!membershipGroupIds.has(ownedGroup.id) && !inviteGroupIds.has(ownedGroup.id)) {
      await supabase
        .from("family_members")
        .insert({
          group_id: ownedGroup.id,
          user_id: user.id,
          email: userEmail,
          role: "owner",
          status: "active",
          joined_at: new Date().toISOString(),
        });
      membershipGroupIds.add(ownedGroup.id);
      if (!memberships) {
        // This shouldn't happen, but just in case
      } else {
        memberships.push({ group_id: ownedGroup.id, role: "owner" });
      }
    }
  }

  // Fetch full group + members data for all active memberships
  const groups: { group: Record<string, unknown>; members: Record<string, unknown>[]; userRole: string }[] = [];

  for (const membership of (memberships || [])) {
    const { data: group } = await supabase
      .from("family_groups")
      .select("*")
      .eq("id", membership.group_id)
      .single();

    if (!group) continue;

    const { data: members } = await supabase
      .from("family_members")
      .select("*")
      .eq("group_id", group.id)
      .order("joined_at", { ascending: true });

    groups.push({
      group,
      members: members || [],
      userRole: membership.role,
    });
  }

  // Fetch pending invite groups
  const pendingInvites: { group: Record<string, unknown>; userRole: string }[] = [];
  for (const invite of (invites || [])) {
    // Skip invites for groups where the user is already an active member
    if (membershipGroupIds.has(invite.group_id)) continue;

    const { data: group } = await supabase
      .from("family_groups")
      .select("*")
      .eq("id", invite.group_id)
      .single();

    if (group) {
      pendingInvites.push({ group, userRole: invite.role });
    }
  }

  return { groups, pendingInvites, userEmail };
}

/** Cancel a pending invite by its family_members row id (for invited members without a user_id). */
export async function cancelFamilyInvite(groupId: string, memberId: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { error: "Supabase not configured" };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Check caller has permission (owner or admin)
  const { data: callerMember } = await supabase
    .from("family_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single();

  // Fallback: check if user is the group creator
  let isCreator = false;
  if (!callerMember || !["owner", "admin"].includes(callerMember.role)) {
    const { data: group } = await supabase
      .from("family_groups")
      .select("id")
      .eq("id", groupId)
      .eq("created_by", user.id)
      .single();
    isCreator = !!group;
  }
  if (!callerMember || (!["owner", "admin"].includes(callerMember.role) && !isCreator)) {
    return { error: "You do not have permission to cancel invites" };
  }

  // Verify the target is actually a pending invite
  const { data: target } = await supabase
    .from("family_members")
    .select("id, status")
    .eq("id", memberId)
    .eq("group_id", groupId)
    .single();
  if (!target) return { error: "Invite not found" };
  if (target.status !== "invited") return { error: "Member is already active, use remove instead" };

  const { error } = await supabase
    .from("family_members")
    .delete()
    .eq("id", memberId)
    .eq("group_id", groupId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function getFamilyMembers(groupId: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { members: [] };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { members: [] };

  // Verify caller is a member
  const { data: callerMember } = await supabase
    .from("family_members")
    .select("id")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single();
  if (!callerMember) return { members: [] };

  const { data: members } = await supabase
    .from("family_members")
    .select("*")
    .eq("group_id", groupId)
    .order("joined_at", { ascending: true });

  return { members: members || [] };
}

// Privacy control: update allow_download on a room share
export async function updateShareDownloadPermission(shareId: string, allowDownload: boolean) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { error: "Supabase not configured" };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("room_shares")
    .update({ allow_download: allowDownload })
    .eq("id", shareId)
    .eq("owner_id", user.id);

  if (error) return { error: error.message };
  return { success: true };
}

// Privacy control: update show_public on a room
export async function updateRoomPublicVisibility(localRoomId: string, showPublic: boolean) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { error: "Supabase not configured" };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: room } = await supabase
    .from("rooms")
    .select("id")
    .eq("user_id", user.id)
    .eq("name", localRoomId)
    .single();
  if (!room) return { error: "Room not found" };

  const { error } = await supabase
    .from("rooms")
    .update({ show_public: showPublic })
    .eq("id", room.id);

  if (error) return { error: error.message };
  return { success: true };
}

// Privacy control: update a share's permission level
export async function updateSharePermission(shareId: string, permission: "view" | "contribute" | "admin") {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { error: "Supabase not configured" };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const validPermission = ["view", "contribute", "admin"].includes(permission) ? permission : "view";

  const { error } = await supabase
    .from("room_shares")
    .update({ permission: validPermission })
    .eq("id", shareId)
    .eq("owner_id", user.id);

  if (error) return { error: error.message };
  return { success: true };
}
