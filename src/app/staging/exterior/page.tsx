import { notFound } from "next/navigation";
import StagingExteriorClient from "./StagingExteriorClient";

/**
 * Dev-only exterior staging viewer — the third of the /staging review viewers,
 * alongside /staging/room and /staging/corridor.
 *
 * Added because the exterior was the one scene with no clean review route: the
 * only login-free way to see it was /flythrough, which paints its recorder UI
 * ("Palace Flythrough Recorder", Record button, scene buttons) over the canvas,
 * so captures taken there are unusable as deliverables. Driving the logged-in app
 * instead proved slow and unreliable. A purpose-built viewer sidesteps both.
 *
 * Hard-disabled in production builds (Apple Guideline 2.2), same gate as the
 * other staging viewers.
 */
export default function StagingExteriorPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <StagingExteriorClient />;
}
