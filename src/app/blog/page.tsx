import type { Metadata } from "next";
import Link from "next/link";
import { T } from "@/lib/theme";
import { getAllPostsAsync, getReadingTime } from "@/lib/blog/posts";
import type { BlogLocale } from "@/lib/blog/posts";
import { getServerLocale } from "@/lib/i18n/server";

const C = T.color;
const F = T.font;

const UI: Record<BlogLocale, { title: string; subtitle: string; readMore: string; minRead: string; signIn: string; getStarted: string }> = {
  en: { title: "Blog", subtitle: "Stories about memory, family, and legacy", readMore: "Read more", minRead: "min read", signIn: "Sign In", getStarted: "Get Started" },
  nl: { title: "Blog", subtitle: "Verhalen over herinnering, familie en nalatenschap", readMore: "Lees meer", minRead: "min lezen", signIn: "Inloggen", getStarted: "Aan de slag" },
  de: { title: "Blog", subtitle: "Geschichten uber Erinnerung, Familie und Vermachtnis", readMore: "Weiterlesen", minRead: "Min. Lesezeit", signIn: "Anmelden", getStarted: "Loslegen" },
  es: { title: "Blog", subtitle: "Historias sobre memoria, familia y legado", readMore: "Leer mas", minRead: "min de lectura", signIn: "Iniciar sesion", getStarted: "Comenzar" },
  fr: { title: "Blog", subtitle: "Histoires sur la memoire, la famille et l'heritage", readMore: "Lire la suite", minRead: "min de lecture", signIn: "Se connecter", getStarted: "Commencer" },
};

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Stories about memory, family, and legacy. Tips and insights on preserving what matters most.",
  openGraph: {
    title: "Blog · The Memory Palace",
    description:
      "Stories about memory, family, and legacy. Tips and insights on preserving what matters most.",
    images: [
      {
        url: "/brand/alt-social-512.png",
        width: 512,
        height: 512,
        alt: "Memory Palace",
      },
    ],
  },
};

export default async function BlogIndexPage() {
  const locale = await getServerLocale() as BlogLocale;
  const ui = UI[locale] || UI.en;
  const posts = await getAllPostsAsync(locale);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.linen,
        color: C.charcoal,
      }}
    >
      {/* Nav */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 clamp(20px, 5vw, 60px)",
          height: 64,
          background: `${C.linen}e8`,
          backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${C.sandstone}40`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link
            href="/"
            aria-label="Back to home"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              height: 32,
              borderRadius: 8,
              border: `1px solid ${C.sandstone}50`,
              background: "none",
              color: C.walnut,
              textDecoration: "none",
              transition: "border-color 0.2s",
            }}
          >
            <svg
              width={16}
              height={16}
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M10 3L5 8l5 5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              textDecoration: "none",
            }}
          >
            <span
              style={{
                fontFamily: F.display,
                fontSize: 20,
                fontWeight: 500,
                color: C.charcoal,
                letterSpacing: "-0.3px",
              }}
            >
              The Memory Palace
            </span>
          </Link>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Link
            href="/login"
            style={{
              fontFamily: F.body,
              fontSize: 14,
              color: C.walnut,
              textDecoration: "none",
              padding: "8px 16px",
            }}
          >
            {ui.signIn}
          </Link>
          <Link
            href="/register"
            style={{
              fontFamily: F.body,
              fontSize: 14,
              fontWeight: 600,
              color: C.white,
              textDecoration: "none",
              padding: "8px 20px",
              borderRadius: 10,
              background: `linear-gradient(135deg, ${C.terracotta}, ${C.walnut})`,
            }}
          >
            {ui.getStarted}
          </Link>
        </div>
      </nav>

      {/* Header */}
      <section
        style={{
          padding: "clamp(3rem, 6vw, 5rem) clamp(1.25rem, 5vw, 3.75rem) clamp(2rem, 4vw, 3rem)",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontFamily: F.display,
            fontSize: "clamp(2rem, 4vw, 3rem)",
            fontWeight: 500,
            color: C.charcoal,
            margin: "0 0 0.75rem",
            letterSpacing: "-0.5px",
          }}
        >
          {ui.title}
        </h1>
        <p
          style={{
            fontFamily: F.body,
            fontSize: "clamp(1rem, 1.5vw, 1.125rem)",
            color: C.muted,
            margin: 0,
          }}
        >
          {ui.subtitle}
        </p>
      </section>

      {/* Post Grid */}
      <section
        style={{
          maxWidth: 960,
          margin: "0 auto",
          padding: "0 clamp(1.25rem, 5vw, 3.75rem) clamp(3rem, 6vw, 5rem)",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 420px), 1fr))",
          gap: "1.5rem",
        }}
      >
        {posts.map((post) => {
          const mins = getReadingTime(post);
          return (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <article
                style={{
                  background: C.white,
                  border: `1px solid ${C.sandstone}40`,
                  borderRadius: 12,
                  padding: "clamp(1.25rem, 2vw, 1.75rem)",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                  cursor: "pointer",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                }}
                className="blog-card"
              >
                <p
                  style={{
                    fontFamily: F.body,
                    fontSize: "0.8125rem",
                    color: C.muted,
                    margin: "0 0 0.75rem",
                  }}
                >
                  {new Date(post.date).toLocaleDateString(locale, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}{" "}
                  &middot; {mins} {ui.minRead}
                </p>
                <h2
                  style={{
                    fontFamily: F.display,
                    fontSize: "clamp(1.25rem, 2vw, 1.5rem)",
                    fontWeight: 500,
                    color: C.charcoal,
                    margin: "0 0 0.75rem",
                    lineHeight: 1.3,
                  }}
                >
                  {post.title}
                </h2>
                <p
                  style={{
                    fontFamily: F.body,
                    fontSize: "0.9375rem",
                    color: C.muted,
                    margin: 0,
                    lineHeight: 1.6,
                    flex: 1,
                  }}
                >
                  {post.excerpt}
                </p>
                <span
                  style={{
                    fontFamily: F.body,
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    color: C.terracotta,
                    marginTop: "1rem",
                    display: "inline-block",
                  }}
                >
                  {ui.readMore} &rarr;
                </span>
              </article>
            </Link>
          );
        })}
      </section>

      {/* Hover styles */}
      <style>{`
        .blog-card:hover {
          border-color: ${C.terracotta}60 !important;
          box-shadow: 0 4px 16px ${C.sandstone}30;
        }
      `}</style>
    </div>
  );
}
