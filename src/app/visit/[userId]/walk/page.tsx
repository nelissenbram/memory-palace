import { notFound } from "next/navigation";
import { getVisitorPalaceData, recordVisit } from "@/lib/social/visit-actions";
import VisitorPalaceWalkLoader from "./VisitorPalaceWalkLoader";

interface Props {
  params: Promise<{ userId: string }>;
}

export default async function VisitorPalaceWalkPage({ params }: Props) {
  const { userId } = await params;

  const data = await getVisitorPalaceData(userId);
  if (!data) notFound();

  // Record visit (fire & forget)
  recordVisit({ ownerId: userId }).catch(() => {});

  return <VisitorPalaceWalkLoader data={data} />;
}
