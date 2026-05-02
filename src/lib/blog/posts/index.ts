export type BlogPost = {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  keywords: string;
  author: string;
  content: string;
};

export type BlogLocale = "en" | "nl" | "de" | "es" | "fr";

import enPosts from "./en";

const postsByLocale: Record<BlogLocale, BlogPost[]> = {
  en: enPosts,
  nl: [], // lazy-loaded below
  de: [],
  es: [],
  fr: [],
};

let loaded: Partial<Record<BlogLocale, boolean>> = { en: true };

async function loadLocale(locale: BlogLocale): Promise<BlogPost[]> {
  if (loaded[locale]) return postsByLocale[locale];
  try {
    const mod = await import(`./${locale}`);
    postsByLocale[locale] = mod.default;
    loaded[locale] = true;
    return mod.default;
  } catch {
    loaded[locale] = true;
    return [];
  }
}

function readingTime(content: string): number {
  const words = content.replace(/<[^>]*>/g, "").split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function getReadingTime(post: BlogPost): number {
  return readingTime(post.content);
}

export function getAllPosts(locale: BlogLocale = "en"): BlogPost[] {
  const posts = postsByLocale[locale].length > 0 ? postsByLocale[locale] : enPosts;
  return [...posts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

export function getPostBySlug(slug: string, locale: BlogLocale = "en"): BlogPost | undefined {
  const posts = postsByLocale[locale].length > 0 ? postsByLocale[locale] : enPosts;
  return posts.find((p) => p.slug === slug);
}

export async function getAllPostsAsync(locale: BlogLocale = "en"): Promise<BlogPost[]> {
  const posts = await loadLocale(locale);
  const resolved = posts.length > 0 ? posts : enPosts;
  return [...resolved].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

export async function getPostBySlugAsync(slug: string, locale: BlogLocale = "en"): Promise<BlogPost | undefined> {
  const posts = await loadLocale(locale);
  const resolved = posts.length > 0 ? posts : enPosts;
  return resolved.find((p) => p.slug === slug);
}
