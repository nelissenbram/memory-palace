import { notFound } from "next/navigation";
import StagingScreensClient from "./StagingScreensClient";

/**
 * Dev-only contact sheet for the app-screen library that the clip phone-inlays
 * draw from (socials-kit/screens).
 *
 * Built after the carousel shipped two slides that "went about nothing": the
 * capture run had photographed several routes with the onboarding modal still
 * over them, so library-grid and atrium came out byte-identical, as did keps
 * and kep-landing — and one screen was caught mid-load, showing only skeleton
 * placeholders. None of that is visible in a directory listing, which is why
 * it survived. Reviewing the library now means looking at it.
 *
 * Hard-disabled in production builds (Apple Guideline 2.2), same gate as
 * /staging/room, /staging/corridor and /staging/statues.
 */
export default function StagingScreensPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <StagingScreensClient />;
}
