"use client";

import dynamic from "next/dynamic";
import PalaceLoadingScreen from "@/components/ui/PalaceLoadingScreen";
import type { VisitorWingData } from "@/lib/social/visit-actions";

const VisitorPalace = dynamic(() => import("./VisitorPalace"), {
  ssr: false,
  loading: () => <PalaceLoadingScreen />,
});

export default function VisitorPalaceLoader({ data }: { data: VisitorWingData }) {
  return <VisitorPalace data={data} />;
}
