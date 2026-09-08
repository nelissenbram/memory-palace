import { notFound } from "next/navigation";
import StagingClipsClient from "./StagingClipsClient";

/**
 * Dev-only review surface for the finished social clips.
 *
 * They live in socials-kit/clips-v2, which is gitignored and outside public/, so
 * reviewing them used to mean opening ten files by hand. Each card also shows
 * what that clip is meant to prove, because a clip is judged against its
 * catalogue hypothesis, not against how pretty the footage is.
 *
 * Hard-disabled in production builds (Apple Guideline 2.2), same gate as the
 * other /staging routes.
 */
export default function StagingClipsPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <StagingClipsClient />;
}
