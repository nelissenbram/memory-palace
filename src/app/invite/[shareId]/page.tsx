import { Metadata } from "next";
import { getInviteDetails } from "@/lib/auth/invite-actions";
import InviteLanding from "./InviteLanding";

interface PageProps {
  params: Promise<{ shareId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { shareId } = await params;
  const result = await getInviteDetails(shareId);

  if (result.error || !result.invite) {
    return {
      title: "Invitation — The Memory Palace",
      description: "You've been invited to explore a Memory Palace.",
    };
  }

  const { inviter, room, wing } = result;
  const title = `${inviter.name} invited you to explore their Memory Palace`;
  const description = `${inviter.name} wants to share "${room.name}"${wing.name ? ` in their ${wing.name} wing` : ""} with you. Open to view their precious memories.`;

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

export default async function InvitePage({ params }: PageProps) {
  const { shareId } = await params;
  const result = await getInviteDetails(shareId);

  return <InviteLanding shareId={shareId} result={result} />;
}
