import { notFound } from "next/navigation";
import { getVisitorWingData } from "@/lib/social/visit-actions";
import { recordVisit } from "@/lib/social/visit-actions";
import VisitorPalaceLoader from "./VisitorPalaceLoader";

interface Props {
  params: Promise<{ userId: string; wingSlug: string }>;
}

export default async function VisitorWalkPage({ params }: Props) {
  const { userId, wingSlug } = await params;

  const data = await getVisitorWingData(userId, wingSlug);
  if (!data) notFound();

  // Record visit (fire & forget)
  recordVisit({ ownerId: userId, wingId: data.wing.id }).catch(() => {});

  return <VisitorPalaceLoader data={data} />;
}
