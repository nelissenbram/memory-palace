"use client";

import dynamic from "next/dynamic";
import PalaceLoadingScreen from "@/components/ui/PalaceLoadingScreen";
import type { VisitorPalaceData } from "@/lib/social/visit-actions";

const VisitorPalaceWalk = dynamic(() => import("./VisitorPalaceWalk"), {
  ssr: false,
  loading: () => <PalaceLoadingScreen />,
});

export default function VisitorPalaceWalkLoader({ data }: { data: VisitorPalaceData }) {
  return <VisitorPalaceWalk data={data} />;
}
