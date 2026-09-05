import { Metadata } from "next";
import PublicGallery from "./PublicGallery";
import { createAdminOrAnonClient } from "@/lib/supabase/server";
import { serverT, getServerLocale } from "@/lib/i18n/server";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getShareData(slug: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null;
  }

  // The slug IS the secret for a public share (no passcode gate on this route):
  // reject empty / whitespace / over-long values before touching the DB so a
  // malformed link fails closed instead of hitting the share lookup.
  const normalizedSlug = typeof slug === "string" ? slug.trim() : "";
  if (!normalizedSlug || normalizedSlug.length > 200) {
    return null;
  }

  // Service-role client (falls back to anon on Preview). Selects only non-secret
  // columns and NEVER the `passcode` column, and works after the anon SELECT
  // policy is dropped.
  const supabase = createAdminOrAnonClient();

  const { data: share } = await supabase
    .from("public_shares")
    .select("id, room_id, wing_id, slug, created_by, is_active, expires_at, scope")
    .eq("slug", normalizedSlug)
    .eq("is_active", true)
    .single();

  if (!share) return null;

  // Check expiry
  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    return null;
  }

  // Passcode-scoped shares must not leak owner/wing/room names via SSR metadata
  // (this page renders for anyone with the slug, no passcode). Return a generic
  // marker so generateMetadata shows a neutral title; the gated content is only
  // fetched client-side once a valid passcode token exists.
  if (share.scope === "passcode") {
    return { passcodeGated: true } as const;
  }

  const { data: owner } = await supabase
    .from("public_profiles")
    .select("display_name")
    .eq("id", share.created_by)
    .single();
  const ownerName =
    owner?.display_name || serverT("someone", await getServerLocale());

  // Wing-only share (room_id is null): load the wing directly instead of
  // dead-ending on a missing room lookup.
  if (!share.room_id) {
    if (!share.wing_id) return null;
    const { data: wing } = await supabase
      .from("wings")
      .select("id, slug, name")
      .eq("id", share.wing_id)
      .single();
    if (!wing) return null;
    return {
      roomName: null,
      wingSlug: wing.slug || null,
      wingName: wing.name || null,
      ownerName,
    };
  }

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

  return {
    roomName: room.name,
    wingSlug: wing?.slug || null,
    wingName: wing?.name || null,
    ownerName,
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

  // Passcode-gated share: never reveal owner/wing names in metadata to anyone
  // holding only the slug.
  if ("passcodeGated" in data) {
    return {
      title: "Passcode-Protected Memories — The Memory Palace",
      description: "This shared link is protected by a passcode.",
      robots: { index: false, follow: false },
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
