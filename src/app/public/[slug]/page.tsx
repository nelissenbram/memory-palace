import { Metadata } from "next";
import { createServerClient } from "@supabase/ssr";
import PublicGallery from "./PublicGallery";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getShareData(slug: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return []; },
        setAll() {},
      },
    }
  );

  const { data: share } = await supabase
    .from("public_shares")
    .select("id, room_id, wing_id, slug, created_by, is_active")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (!share) return null;

  const { data: room } = await supabase
    .from("rooms")
    .select("id, name, wing_id")
    .eq("id", share.room_id)
    .single();

  if (!room) return null;

  let wing = null;
  if (room.wing_id) {
    const { data: wingData } = await supabase
      .from("wings")
      .select("id, slug, name")
      .eq("id", room.wing_id)
      .single();
    wing = wingData;
  }

  const { data: owner } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", share.created_by)
    .single();

  return {
    roomName: room.name,
    wingSlug: wing?.slug || null,
    wingName: wing?.name || null,
    ownerName: owner?.display_name || "Someone",
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getShareData(slug);

  if (!data) {
    return {
      title: "Shared Memories — The Memory Palace",
      description: "This shared link is no longer available.",
    };
  }

  const title = `${data.ownerName}'s Memories — The Memory Palace`;
  const description = data.wingName
    ? `Explore shared memories from the ${data.wingName} wing of ${data.ownerName}'s Memory Palace.`
    : `Explore shared memories from ${data.ownerName}'s Memory Palace.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "The Memory Palace",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function PublicSharePage({ params }: PageProps) {
  const { slug } = await params;
  return <PublicGallery slug={slug} />;
}
