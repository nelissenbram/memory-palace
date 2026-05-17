import { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPublishedRooms, recordVisit } from "@/lib/social/visit-actions";
import { getProfile } from "@/lib/social/profile-actions";
import { getComments, getReactions } from "@/lib/social/comment-actions";
import VisitPageClient from "./VisitPageClient";

interface Props {
  params: Promise<{ userId: string; wingSlug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { userId, wingSlug } = await params;
  const supabase = await createClient();

  const { data: wing } = await supabase
    .from("wings")
    .select("custom_name, slug, publish_description")
    .eq("user_id", userId)
    .eq("slug", wingSlug)
    .not("published_at", "is", null)
    .single();

  if (!wing) return { title: "Not Found" };

  const profile = await getProfile(userId);
  const name = wing.custom_name || wing.slug;
  const ownerName = profile?.display_name || "Someone";

  return {
    title: `${name} — ${ownerName}'s Palace | Memory Palace`,
    description: wing.publish_description || `Visit ${name} in ${ownerName}'s Memory Palace`,
    openGraph: {
      title: `${name} — ${ownerName}'s Palace`,
      description: wing.publish_description || undefined,
      images: [{ url: `/api/og?title=${encodeURIComponent(name)}&owner=${encodeURIComponent(ownerName)}&type=wing` }],
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function VisitPage({ params }: Props) {
  const { userId, wingSlug } = await params;
  const supabase = await createClient();

  // Get the published wing
  const { data: wing } = await supabase
    .from("wings")
    .select("id, slug, custom_name, accent_color, publish_description, published_at, user_id")
    .eq("user_id", userId)
    .eq("slug", wingSlug)
    .not("published_at", "is", null)
    .single();

  if (!wing) notFound();

  const [profile, rooms, comments, reactions] = await Promise.all([
    getProfile(userId),
    getPublishedRooms(wing.id),
    getComments("wing", wing.id),
    getReactions("wing", wing.id),
  ]);

  // Get current user for comment ownership
  const { data: { user: currentUser } } = await supabase.auth.getUser();

  // Record visit (fire & forget)
  recordVisit({ ownerId: userId, wingId: wing.id }).catch(() => {});

  return (
    <VisitPageClient
      wing={{
        id: wing.id,
        slug: wing.slug,
        name: wing.custom_name || wing.slug,
        accentColor: wing.accent_color,
        description: wing.publish_description,
      }}
      owner={
        profile
          ? {
              id: profile.id,
              name: profile.display_name,
              username: profile.username,
              avatarUrl: profile.avatar_url,
            }
          : null
      }
      rooms={rooms}
      initialComments={comments}
      initialReactions={reactions}
      currentUserId={currentUser?.id}
    />
  );
}
