import { cookies, headers } from "next/headers";
import LandingClient from "./LandingClient";

/**
 * Server wrapper for the landing page. Detects the iOS app request the same way
 * as isIOSRequest() in plan-limits.ts (mp_platform=ios cookie set by NativeInit
 * + the MemoryPalace-iOS UA marker) and seeds it into the client so the raw SSR
 * HTML never carries paid CTAs / upgrade copy on iOS (Apple Guideline 3.1.1).
 */
export default async function Page() {
  const cookieStore = await cookies();
  const h = await headers();
  const initialIosApp =
    cookieStore.get("mp_platform")?.value === "ios" ||
    (h.get("user-agent") || "").includes("MemoryPalace-iOS");

  return <LandingClient initialIosApp={initialIosApp} />;
}
