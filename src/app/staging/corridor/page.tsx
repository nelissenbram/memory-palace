import { notFound } from "next/navigation";
import StagingCorridorClient from "./StagingCorridorClient";

/**
 * Dev-only corridor staging viewer. Mounts the real CorridorScene fullscreen so
 * the garden greenery (topiary / hedgerows / planters visible beyond the
 * colonnade) and the central statue can be reviewed in isolation — they carry a
 * large share of the corridor's "exterior material" read and show up in every
 * flythrough clip.
 *
 * Reads CorridorScene's own URL knobs: ?wing=roots|nest|craft|travel|passions
 * (which wing's corridor + statue), ?cam=portal|door|terminus (fixed review
 * angles), ?walk=1|left|right (scripted forward dolly). Hard-disabled in
 * production builds (Apple Guideline 2.2), same gate as /staging/room.
 */
export default function StagingCorridorPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <StagingCorridorClient />;
}
