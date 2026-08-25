import type { MetadataRoute } from "next";
import { createAdminOrAnonClient } from "@/lib/supabase/server";
import { getAllPosts } from "@/lib/blog/posts";

const BASE_URL = "https://thememorypalace.ai";

// Re-generate at most once a day; public-profile churn is slow.
export const revalidate = 86400;

async function getPublicProfileEntries(): Promise<MetadataRoute.Sitemap> {
  try {
    // Cookie-less client — the sitemap runs outside a request context, so the
    // cookie-bound server client is unusable here. public_profiles is a view
    // GRANTed to anon that only exposes public columns; the wings query needs
    // the service key on prod (wings RLS has no anon published-read policy —
    // same reason getPublishedWings uses the admin client) and degrades to
    // zero /visit entries on preview deploys where that key is absent.
    const supabase = createAdminOrAnonClient();

    // Every public profile with a username → /u/<username>
    const { data: profiles } = await supabase
      .from("public_profiles")
      .select("id, username, created_at")
      .eq("is_public", true)
      .not("username", "is", null)
      .limit(5000);

    if (!profiles || profiles.length === 0) return [];

    const entries: MetadataRoute.Sitemap = profiles.map((p) => ({
      url: `${BASE_URL}/u/${encodeURIComponent(p.username as string)}`,
      lastModified: p.created_at ? new Date(p.created_at) : new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));

    // Profiles that also have at least one published wing → /visit/<userId>
    // (the /visit overview 404s without published wings, so filter first).
    const ids = profiles.map((p) => p.id);
    const { data: wings } = await supabase
      .from("wings")
      .select("user_id")
      .in("user_id", ids)
      .not("published_at", "is", null);

    const visitable = new Set((wings || []).map((w) => w.user_id));
    for (const p of profiles) {
      if (visitable.has(p.id)) {
        entries.push({
          url: `${BASE_URL}/visit/${p.id}`,
          lastModified: p.created_at ? new Date(p.created_at) : new Date(),
          changeFrequency: "weekly" as const,
          priority: 0.5,
        });
      }
    }

    return entries;
  } catch {
    // Never let a Supabase hiccup break the whole sitemap — static pages still ship.
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const publicPages = [
    { path: "/", priority: 1.0, changeFrequency: "weekly" as const },
    { path: "/explore", priority: 0.8, changeFrequency: "daily" as const },
    { path: "/pricing", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/blog", priority: 0.7, changeFrequency: "weekly" as const },
    { path: "/help", priority: 0.5, changeFrequency: "monthly" as const },
    { path: "/press", priority: 0.5, changeFrequency: "monthly" as const },
    { path: "/register", priority: 0.7, changeFrequency: "monthly" as const },
    { path: "/login", priority: 0.6, changeFrequency: "monthly" as const },
    { path: "/privacy", priority: 0.3, changeFrequency: "yearly" as const },
    { path: "/terms", priority: 0.3, changeFrequency: "yearly" as const },
    { path: "/security", priority: 0.3, changeFrequency: "yearly" as const },
    { path: "/data-deletion", priority: 0.3, changeFrequency: "yearly" as const },
  ];

  const staticEntries = publicPages.map(({ path, priority, changeFrequency }) => ({
    url: `${BASE_URL}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));

  const blogEntries = getAllPosts().map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  const profileEntries = await getPublicProfileEntries();

  return [...staticEntries, ...blogEntries, ...profileEntries];
}
