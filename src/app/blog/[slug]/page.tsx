import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { T } from "@/lib/theme";
import { getAllPosts, getPostBySlug, getReadingTime } from "@/lib/blog/posts";

const C = T.color;
const F = T.font;

/* ── Static params for ISR ── */
export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

/* ── Dynamic metadata ── */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};

  return {
    title: post.title,
    description: post.excerpt,
    keywords: post.keywords,
    openGraph: {
      title: `${post.title} · The Memory Palace`,
      description: post.excerpt,
      type: "article",
      publishedTime: post.date,
      authors: [post.author],
      images: [
        {
          url: "/brand/alt-social-512.png",
          width: 512,
          height: 512,
          alt: "Memory Palace",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: ["/brand/alt-social-512.png"],
    },
  };
}

/* ── Page ── */
export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const mins = getReadingTime(post);

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
            href="/blog"
            aria-label="Back to blog"
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
            Sign In
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
            Get Started
          </Link>
        </div>
      </nav>

      {/* Article */}
      <article
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding:
            "clamp(2.5rem, 5vw, 4rem) clamp(1.25rem, 5vw, 2rem) clamp(3rem, 6vw, 5rem)",
        }}
      >
        {/* Back link */}
        <Link
          href="/blog"
          style={{
            fontFamily: F.body,
            fontSize: "0.875rem",
            color: C.terracotta,
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            marginBottom: "2rem",
          }}
        >
          <svg
            width={14}
            height={14}
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
          All posts
        </Link>

        {/* Header */}
        <header style={{ marginBottom: "2rem" }}>
          <h1
            style={{
              fontFamily: F.display,
              fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
              fontWeight: 400,
              color: C.charcoal,
              margin: "0 0 1rem",
              lineHeight: 1.25,
              letterSpacing: "-0.5px",
            }}
          >
            {post.title}
          </h1>
          <p
            style={{
              fontFamily: F.body,
              fontSize: "0.875rem",
              color: C.muted,
              margin: 0,
            }}
          >
            {new Date(post.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}{" "}
            &middot; {mins} min read &middot; {post.author}
          </p>
        </header>

        {/* Content */}
        <div
          className="blog-content"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* CTA */}
        <section
          style={{
            marginTop: "3rem",
            padding: "2rem",
            background: C.white,
            border: `1px solid ${C.sandstone}40`,
            borderRadius: 12,
            textAlign: "center",
          }}
        >
          <h3
            style={{
              fontFamily: F.display,
              fontSize: "1.5rem",
              fontWeight: 400,
              color: C.charcoal,
              margin: "0 0 0.75rem",
            }}
          >
            Start preserving your family&apos;s memories today
          </h3>
          <p
            style={{
              fontFamily: F.body,
              fontSize: "0.9375rem",
              color: C.muted,
              margin: "0 0 1.25rem",
              lineHeight: 1.6,
            }}
          >
            Build a beautiful, private Memory Palace for your family&apos;s
            stories, photos, and legacy.
          </p>
          <Link
            href="/register"
            style={{
              display: "inline-block",
              fontFamily: F.body,
              fontSize: "0.9375rem",
              fontWeight: 600,
              color: C.white,
              textDecoration: "none",
              padding: "0.75rem 2rem",
              borderRadius: 10,
              background: `linear-gradient(135deg, ${C.terracotta}, ${C.walnut})`,
              transition: "opacity 0.2s",
            }}
          >
            Get Started Free
          </Link>
        </section>
      </article>

      {/* Content styles */}
      <style>{`
        .blog-content {
          font-family: ${F.body};
          font-size: 1.0625rem;
          line-height: 1.75;
          color: ${C.charcoal};
        }
        .blog-content h2 {
          font-family: ${F.display};
          font-size: 1.5rem;
          font-weight: 500;
          color: ${C.charcoal};
          margin: 2rem 0 0.75rem;
          letter-spacing: -0.3px;
        }
        .blog-content p {
          margin: 0 0 1.25rem;
        }
        .blog-content ol,
        .blog-content ul {
          margin: 0 0 1.25rem;
          padding-left: 1.5rem;
        }
        .blog-content li {
          margin-bottom: 0.5rem;
        }
        .blog-content strong {
          font-weight: 600;
          color: ${C.charcoal};
        }
        .blog-content em {
          color: ${C.walnut};
        }
        .blog-content a {
          color: ${C.terracotta};
          text-decoration: underline;
          text-underline-offset: 2px;
        }
      `}</style>
    </div>
  );
}
