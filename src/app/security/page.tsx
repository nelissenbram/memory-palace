"use client";

import Link from "next/link";
import { T } from "@/lib/theme";
import { useIsMobile, useIsSmall } from "@/lib/hooks/useIsMobile";

const F = T.font;
const C = T.color;

const SECTIONS = [
  {
    icon: "🏛️",
    title: "Hosting & Infrastructure",
    items: [
      {
        icon: "🌍",
        label: "Hosted on Vercel",
        detail:
          "Your Memory Palace runs on Vercel, a world-class hosting platform with a global content delivery network (CDN). Every page loads fast, and every connection is automatically secured with HTTPS.",
      },
      {
        icon: "🇪🇺",
        label: "Database in the EU",
        detail:
          "All your data is stored on Supabase PostgreSQL in Frankfurt, Germany — safely within the European Union. This means your memories are protected by strict EU data protection laws (GDPR).",
      },
      {
        icon: "📋",
        label: "Fully GDPR compliant",
        detail:
          "We follow the General Data Protection Regulation to the letter. Your personal data is processed lawfully and transparently, and only for the purposes you have agreed to.",
      },
    ],
  },
  {
    icon: "🔐",
    title: "Encryption",
    items: [
      {
        icon: "🔒",
        label: "Encrypted in transit (TLS 1.3)",
        detail:
          "Every connection between your device and our servers uses TLS 1.3, the latest and strongest transport encryption. Nobody can read your data as it travels over the internet.",
      },
      {
        icon: "💾",
        label: "Encrypted at rest (AES-256)",
        detail:
          "Your database is encrypted with AES-256, the same standard used by banks and governments. Even if someone accessed the physical servers, your data would be unreadable.",
      },
      {
        icon: "📁",
        label: "Encrypted file storage",
        detail:
          "Your photos, videos, and documents are stored in Supabase Storage, which is also encrypted at rest. Files are only accessible through authenticated, time-limited links.",
      },
      {
        icon: "🔑",
        label: "Secure password hashing",
        detail:
          "Your password is never stored in plain text. It is hashed using bcrypt through Supabase Auth, making it practically impossible to reverse-engineer.",
      },
    ],
  },
  {
    icon: "🛡️",
    title: "Authentication & Access",
    items: [
      {
        icon: "✉️",
        label: "Email & password login",
        detail:
          "Sign in securely with your email address and password. Your credentials are handled by Supabase Auth, a battle-tested authentication system.",
      },
      {
        icon: "🔗",
        label: "Social login (Google, Apple)",
        detail:
          "Prefer to sign in with Google or Apple? We support OAuth 2.0 social login — your password is never shared with us when you use these options.",
      },
      {
        icon: "📱",
        label: "Two-factor authentication",
        detail:
          "For extra peace of mind, you can enable two-factor authentication (2FA) using a TOTP app like Google Authenticator. This adds a second layer of protection to your account.",
      },
      {
        icon: "👤",
        label: "Row Level Security",
        detail:
          "Every database table is protected by Row Level Security (RLS). This means you can only ever access your own data — this is enforced at the database level, not just in our code.",
      },
      {
        icon: "🎫",
        label: "JWT session management",
        detail:
          "Your login sessions use JSON Web Tokens (JWT), which are short-lived and cryptographically signed. Sessions expire automatically, keeping your account safe even if you forget to log out.",
      },
    ],
  },
  {
    icon: "🎛️",
    title: "Privacy Controls",
    items: [
      {
        icon: "📥",
        label: "Full data export",
        detail:
          "You can download everything — all your memories, stories, and photos — as a JSON file with a ZIP of your media. Your data always belongs to you.",
      },
      {
        icon: "🗑️",
        label: "Complete account deletion",
        detail:
          "If you choose to delete your account, all your data is permanently removed. Deletion cascades through every table — nothing is left behind.",
      },
      {
        icon: "🍪",
        label: "Cookie consent",
        detail:
          "We ask for your permission before setting any non-essential cookies. You can change your preferences at any time through our cookie consent controls.",
      },
      {
        icon: "🚫",
        label: "No tracking, no ads, no data selling",
        detail:
          "We will never sell your data, show you advertisements, or track you across the web. Your memories are private, and that is a promise.",
      },
      {
        icon: "🕊️",
        label: "Legacy contacts",
        detail:
          "You can designate trusted family members as legacy contacts for digital inheritance. When the time comes, your memories can be passed on to the people you choose.",
      },
    ],
  },
  {
    icon: "🔄",
    title: "Backup & Redundancy",
    items: [
      {
        icon: "💾",
        label: "Daily automated backups",
        detail:
          "Your data is backed up automatically every day. In the unlikely event of a problem, we can restore your palace to its most recent state.",
      },
      {
        icon: "⏱️",
        label: "Point-in-time recovery",
        detail:
          "Our database supports point-in-time recovery, meaning we can restore data to any moment within the retention window — not just the last backup.",
      },
      {
        icon: "🌐",
        label: "Replicated storage",
        detail:
          "Files are stored with redundancy across multiple availability zones. Even if one data center has issues, your memories remain safe and accessible.",
      },
    ],
  },
];

export default function SecurityPage() {
  const isMobile = useIsMobile();
  const isSmall = useIsSmall();

  return (
    <div
      style={{
        width: "100vw",
        minHeight: "100vh",
        overflowX: "hidden",
        background: C.linen,
        fontFamily: F.body,
        color: C.charcoal,
      }}
    >
      {/* ─── Nav ─── */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 clamp(20px, 5vw, 60px)",
          height: 64,
          background: "rgba(250,250,247,0.92)",
          backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${C.sandstone}40`,
        }}
      >
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
          }}
        >
          <span style={{ fontSize: 22 }}>🏛️</span>
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
        <Link
          href="/register"
          style={{
            fontFamily: F.body,
            fontSize: 14,
            fontWeight: 600,
            color: C.white,
            textDecoration: "none",
            padding: isMobile ? "10px 18px" : "8px 20px",
            borderRadius: 10,
            background: `linear-gradient(135deg, ${C.terracotta}, ${C.walnut})`,
          }}
        >
          Get Started
        </Link>
      </nav>

      {/* ─── Hero ─── */}
      <section
        style={{
          textAlign: "center",
          padding: isMobile ? "60px 20px 50px" : "80px clamp(20px, 5vw, 60px) 60px",
          background: `radial-gradient(ellipse at 50% 30%, ${C.warmStone}, ${C.linen} 70%)`,
        }}
      >
        <span style={{ fontSize: 56, display: "block", marginBottom: 20 }}>
          🛡️
        </span>
        <h1
          style={{
            fontFamily: F.display,
            fontSize: "clamp(32px, 5vw, 56px)",
            fontWeight: 300,
            lineHeight: 1.15,
            color: C.charcoal,
            marginBottom: 16,
          }}
        >
          Your data is safe
        </h1>
        <p
          style={{
            fontSize: "clamp(17px, 2.2vw, 20px)",
            color: C.walnut,
            maxWidth: 600,
            margin: "0 auto",
            lineHeight: 1.7,
          }}
        >
          We understand that your memories are irreplaceable. Here is exactly how
          we protect them — with transparency, care, and the highest standards.
        </p>
      </section>

      {/* ─── Sections ─── */}
      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
          padding: isMobile
            ? "40px 20px 60px"
            : "60px clamp(20px, 5vw, 60px) 80px",
        }}
      >
        {SECTIONS.map((section, si) => (
          <div key={si} style={{ marginBottom: 56 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 24,
              }}
            >
              <span style={{ fontSize: 28 }}>{section.icon}</span>
              <h2
                style={{
                  fontFamily: F.display,
                  fontSize: "clamp(24px, 3vw, 32px)",
                  fontWeight: 400,
                  color: C.charcoal,
                  margin: 0,
                }}
              >
                {section.title}
              </h2>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  isSmall
                    ? "1fr"
                    : section.items.length === 2
                    ? "repeat(2, 1fr)"
                    : "repeat(auto-fit, minmax(250px, 1fr))",
                gap: isMobile ? 16 : 20,
              }}
            >
              {section.items.map((item, ii) => (
                <div
                  key={ii}
                  style={{
                    background: C.white,
                    borderRadius: 16,
                    padding: isMobile ? "24px 20px" : "28px 24px",
                    border: `1px solid ${C.sandstone}50`,
                  }}
                >
                  <span
                    style={{
                      fontSize: 28,
                      display: "block",
                      marginBottom: 12,
                    }}
                  >
                    {item.icon}
                  </span>
                  <h3
                    style={{
                      fontFamily: F.display,
                      fontSize: "clamp(18px, 2vw, 22px)",
                      fontWeight: 500,
                      color: C.charcoal,
                      marginBottom: 8,
                    }}
                  >
                    {item.label}
                  </h3>
                  <p
                    style={{
                      fontSize: "clamp(15px, 1.6vw, 17px)",
                      color: C.walnut,
                      lineHeight: 1.7,
                      margin: 0,
                    }}
                  >
                    {item.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* ─── Commitment ─── */}
        <div
          style={{
            background: `linear-gradient(135deg, ${C.charcoal}, #3D3D3A)`,
            borderRadius: 20,
            padding: isMobile ? "36px 24px" : "48px 40px",
            textAlign: "center",
            marginTop: 20,
          }}
        >
          <span style={{ fontSize: 40, display: "block", marginBottom: 16 }}>
            🕊️
          </span>
          <h2
            style={{
              fontFamily: F.display,
              fontSize: "clamp(24px, 3vw, 34px)",
              fontWeight: 300,
              fontStyle: "italic",
              color: C.linen,
              lineHeight: 1.3,
              maxWidth: 600,
              margin: "0 auto 16px",
            }}
          >
            Your memories are meant to last generations.
            <br />
            We take that responsibility seriously.
          </h2>
          <p
            style={{
              fontSize: "clamp(15px, 1.6vw, 17px)",
              color: C.muted,
              lineHeight: 1.7,
              maxWidth: 520,
              margin: "0 auto",
            }}
          >
            If you have questions about how we handle your data, or if you want
            to exercise any of your rights under GDPR, please contact us at{" "}
            <a
              href="mailto:privacy@thememorypalace.ai"
              style={{ color: C.terracotta, textDecoration: "none" }}
            >
              privacy@thememorypalace.ai
            </a>
            . We are here to help.
          </p>
        </div>
      </div>

      {/* ─── CTA ─── */}
      <section
        style={{
          padding: isMobile ? "40px 20px 60px" : "60px clamp(20px, 5vw, 60px) 80px",
          textAlign: "center",
          background: C.warmStone,
        }}
      >
        <h2
          style={{
            fontFamily: F.display,
            fontSize: "clamp(24px, 3.5vw, 38px)",
            fontWeight: 300,
            color: C.charcoal,
            marginBottom: 16,
            lineHeight: 1.2,
          }}
        >
          Ready to start preserving?
        </h2>
        <p
          style={{
            fontSize: "clamp(15px, 1.8vw, 17px)",
            color: C.walnut,
            maxWidth: 480,
            margin: "0 auto 32px",
            lineHeight: 1.6,
          }}
        >
          Your memories deserve a safe, beautiful home. Get started for free —
          no credit card required.
        </p>
        <Link
          href="/register"
          style={{
            display: "inline-block",
            fontFamily: F.body,
            fontSize: 16,
            fontWeight: 600,
            color: C.white,
            textDecoration: "none",
            padding: "16px 36px",
            borderRadius: 14,
            background: `linear-gradient(135deg, ${C.terracotta}, ${C.walnut})`,
            boxShadow: "0 4px 20px rgba(193,127,89,0.3)",
          }}
        >
          Create Your Memory Palace
        </Link>
      </section>

      {/* ─── Footer ─── */}
      <footer
        style={{
          padding: "28px clamp(20px, 5vw, 60px)",
          borderTop: `1px solid ${C.sandstone}40`,
          background: C.charcoal,
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>
          &copy; {new Date().getFullYear()} The Memory Palace. Preserve your
          memories for eternity.
        </p>
      </footer>
    </div>
  );
}
