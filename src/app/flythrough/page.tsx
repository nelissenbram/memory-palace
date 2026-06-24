import { notFound } from "next/navigation";
import FlythroughClient from "./FlythroughClient";

/**
 * Dev-only cinematic flythrough recorder. Server wrapper hard-disables it in
 * production builds so the dev tool never ships to App Review (Apple Guideline 2.2).
 */
export default function FlythroughPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <FlythroughClient />;
}
