"use server";

import { createClient } from "@/lib/supabase/server";

export async function createFamilyGroup(name: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { error: "Supabase not configured" };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  if (!name.trim()) return { error: "Group name is required" };

  // Check if user already owns a family group
  const { data: existing } = await supabase
    .from("family_groups")
    .select("id")
    .eq("created_by", user.id)
    .single();
  if (existing) return { error: "You already have a family group" };

  // Create the group
  const { data: group, error } = await supabase
    .from("family_groups")
    .insert({ name: name.trim(), created_by: user.id })
    .select()
    .single();
  if (error) return { error: error.message };

  // Get user email
  const { data: profile } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", user.id)
    .single();

  // Add creator as owner member
  const { error: memberError } = await supabase
    .from("family_members")
    .insert({
      group_id: group.id,
      user_id: user.id,
      email: profile?.email || user.email || "",
      role: "owner",
      status: "active",
      joined_at: new Date().toISOString(),
    });
  if (memberError) return { error: memberError.message };

  return { group };
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
  if (!callerMember || !["owner", "admin"].includes(callerMember.role)) {
    return { error: "You do not have permission to invite members" };
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

  // Allow self-removal or owner/admin removal
  const isSelf = userId === user.id;
  const isPrivileged = callerMember && ["owner", "admin"].includes(callerMember.role);
  if (!isSelf && !isPrivileged) {
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

  if (!userId) return { error: "Invalid user ID" };

  const { error } = await supabase
    .from("family_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", userId);

  if (error) return { error: error.message };

  // Clean up orphaned wing_shares involving this user
  await supabase.from("wing_shares").delete().eq("owner_id", userId);
  await supabase.from("wing_shares").delete().eq("shared_with_id", userId);

  return { success: true };
}

export async function getFamilyGroup() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { group: null, members: [] };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { group: null, members: [] };

  // Find the family group the user belongs to
  const { data: membership } = await supabase
    .from("family_members")
    .select("group_id, role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  if (!membership) {
    // Also check by email for pending invites
    const { data: invite } = await supabase
      .from("family_members")
      .select("group_id, role, status")
      .eq("email", user.email?.toLowerCase() || "")
      .eq("status", "invited")
      .single();

    if (invite) {
      const { data: group } = await supabase
        .from("family_groups")
        .select("*")
        .eq("id", invite.group_id)
        .single();
      return { group, members: [], pendingInvite: true, userRole: invite.role };
    }

    return { group: null, members: [] };
  }

  const { data: group } = await supabase
    .from("family_groups")
    .select("*")
    .eq("id", membership.group_id)
    .single();

  if (!group) return { group: null, members: [] };

  const { data: members } = await supabase
    .from("family_members")
    .select("*")
    .eq("group_id", group.id)
    .order("joined_at", { ascending: true });

  return { group, members: members || [], userRole: membership.role, userEmail: user.email || "" };
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
