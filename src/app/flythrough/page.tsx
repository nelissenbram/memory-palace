import { notFound } from "next/navigation";
import FlythroughClient from "./FlythroughClient";

/**
 * Cinematic flythrough recorder — also serves as a login-free exterior preview.
 * Hard-disabled ONLY on the real production deploy (VERCEL_ENV="production", i.e.
 * thememorypalace.ai / the iOS webview) so the dev tool never ships to App Review
 * (Apple Guideline 2.2). It stays available on local dev (VERCEL_ENV undefined)
 * and on Vercel PREVIEW/staging deploys, where the exterior can be reviewed
 * without signing in.
 */
export default function FlythroughPage() {
  if (process.env.VERCEL_ENV === "production") notFound();
  return <FlythroughClient />;
}
