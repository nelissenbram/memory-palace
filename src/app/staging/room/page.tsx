import { notFound } from "next/navigation";
import StagingRoomClient from "./StagingRoomClient";

/**
 * Dev-only room staging viewer. Mounts the real InteriorScene (W3 prod room)
 * fullscreen so the fireplace/mantelpiece + wall detail can be reviewed in
 * isolation — it's the hero shot in every clip + App Store screenshot.
 *
 * Reads InteriorScene's own URL knobs: ?rcam=door|hearth|bookcase (camera pose),
 * ?wallcount=N (enfilade tier), ?heroUrl=&heroTitle=&heroYear= (hang a specific
 * photo over the mantel). Hard-disabled in production builds (Apple Guideline
 * 2.2), same gate as /flythrough.
 */
export default function StagingRoomPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <StagingRoomClient />;
}
