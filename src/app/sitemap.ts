import type { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/blog/posts";

const BASE_URL = "https://thememorypalace.ai";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const publicPages = [
    { path: "/", priority: 1.0, changeFrequency: "weekly" as const },
    { path: "/login", priority: 0.6, changeFrequency: "monthly" as const },
    { path: "/register", priority: 0.7, changeFrequency: "monthly" as const },
    { path: "/pricing", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/privacy", priority: 0.3, changeFrequency: "yearly" as const },
    { path: "/terms", priority: 0.3, changeFrequency: "yearly" as const },
    { path: "/security", priority: 0.3, changeFrequency: "yearly" as const },
    { path: "/blog", priority: 0.7, changeFrequency: "weekly" as const },
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

  return [...staticEntries, ...blogEntries];
}
