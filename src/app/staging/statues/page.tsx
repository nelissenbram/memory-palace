import { notFound } from "next/navigation";
import StagingStatuesClient from "./StagingStatuesClient";

/**
 * Dev-only statue comparison viewer. Each wing has its OWN centrepiece on the
 * corridor's central pedestal (roots = family tree, travel = armillary sphere,
 * nest = nest with eggs, craft = fluted obelisk, passions = classical bust), so
 * reviewing them one wing at a time means five page loads and no way to compare.
 *
 * This mounts all five corridors side by side, each framed on its statue
 * (?cam=statue), in a responsive grid. Hard-disabled in production builds
 * (Apple Guideline 2.2), same gate as /staging/room and /staging/corridor.
 */
export default function StagingStatuesPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <StagingStatuesClient />;
}
