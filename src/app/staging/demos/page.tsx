import { notFound } from "next/navigation";
import StagingDemosClient from "./StagingDemosClient";

/**
 * Dev-only contact sheet for the seeded public demo palaces.
 *
 * The app-screen library could not photograph /atrium or /library from the Apple
 * Review account: a walkthrough onboarding intercepts both, so every attempt
 * came back as an onboarding card wearing the right filename. The demo palaces
 * are public, carry real seeded content, and have no wizard over them — so this
 * is where those feature screens come from instead.
 *
 * Hard-disabled in production builds (Apple Guideline 2.2), same gate as
 * /staging/room, /staging/corridor, /staging/statues and /staging/screens.
 */
export default function StagingDemosPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <StagingDemosClient />;
}
