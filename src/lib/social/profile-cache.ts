import { cache } from "react";
import { getProfile } from "./profile-actions";

/**
 * Request-scoped dedupe for getProfile. The /u/[username] route calls it once
 * in generateMetadata and once in the page body; React cache() collapses those
 * into a single query (+ single getUser) per request. Same args → one call.
 */
export const getProfileCached = cache(
  (identifier: string, by: "id" | "username" = "id") => getProfile(identifier, by),
);
