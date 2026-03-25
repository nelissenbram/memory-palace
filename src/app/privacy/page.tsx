"use client";

import Link from "next/link";
import { T } from "@/lib/theme";

const F = T.font;
const C = T.color;

export default function PrivacyPolicyPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.linen,
        fontFamily: F.body,
        color: C.charcoal,
      }}
    >
      {/* Header */}
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
      </nav>

      {/* Content */}
      <main
        style={{
          maxWidth: 760,
          margin: "0 auto",
          padding: "60px clamp(20px, 5vw, 40px) 100px",
        }}
      >
        <p
          style={{
            fontFamily: F.body,
            fontSize: 12,
            letterSpacing: "2px",
            textTransform: "uppercase",
            color: C.terracotta,
            fontWeight: 600,
            marginBottom: 12,
          }}
        >
          Legal
        </p>
        <h1
          style={{
            fontFamily: F.display,
            fontSize: "clamp(32px, 5vw, 48px)",
            fontWeight: 300,
            lineHeight: 1.2,
            color: C.charcoal,
            marginBottom: 8,
          }}
        >
          Privacy Policy
        </h1>
        <p style={{ fontSize: 14, color: C.muted, marginBottom: 48 }}>
          Last updated: March 25, 2026
        </p>

        <Section title="1. Who We Are">
          <P>
            The Memory Palace is operated from Belgium. We built this app to help
            you preserve and share your most precious memories — safely and
            privately. We are committed to protecting your personal data in full
            compliance with the General Data Protection Regulation (GDPR) and
            applicable Belgian and EU law.
          </P>
          <P>
            For any privacy-related questions, you can always reach us at:{" "}
            <a href="mailto:privacy@thememorypalace.ai" style={linkStyle}>
              privacy@thememorypalace.ai
            </a>
          </P>
        </Section>

        <Section title="2. What We Collect">
          <P>
            We only collect what we need to provide you with a great experience.
            Here is what we gather:
          </P>
          <Ul>
            <Li>
              <strong>Profile information:</strong> your name, email address, and
              profile photo when you create an account.
            </Li>
            <Li>
              <strong>Your memories:</strong> the photos, videos, stories, and
              other content you upload to your Memory Palace. This is the heart
              of the service.
            </Li>
            <Li>
              <strong>Minimal usage analytics:</strong> we collect anonymized
              data about how you use the app (such as which features are popular)
              to help us improve it. This data cannot be traced back to you
              personally.
            </Li>
            <Li>
              <strong>Device information:</strong> basic details like your
              browser type and screen size, so we can make the app look and work
              its best on your device.
            </Li>
          </Ul>
        </Section>

        <Section title="3. How We Use Your Data">
          <P>
            We use your data solely to provide and improve The Memory Palace.
            Specifically:
          </P>
          <Ul>
            <Li>
              To store, organize, and display your memories in your palace.
            </Li>
            <Li>
              To authenticate your account and keep it secure.
            </Li>
            <Li>
              To send you important service-related messages (such as email
              confirmations, security alerts, or legacy notifications).
            </Li>
            <Li>
              To improve the app based on anonymized usage patterns.
            </Li>
          </Ul>
          <P>
            We will <strong>never</strong> use your data for advertising, and we
            will <strong>never</strong> sell it to anyone.
          </P>
        </Section>

        <Section title="4. Where We Store Your Data">
          <P>
            All your data is stored within the European Union:
          </P>
          <Ul>
            <Li>
              <strong>Database:</strong> Supabase PostgreSQL, hosted in{" "}
              <strong>Frankfurt, Germany (EU)</strong>. Your memories, profile
              data, and account information all live here, encrypted at rest with
              AES-256.
            </Li>
            <Li>
              <strong>Application hosting:</strong> Vercel, with servers in the
              EU. All connections are encrypted with TLS 1.3.
            </Li>
            <Li>
              <strong>File storage:</strong> Supabase Storage (EU region),
              encrypted at rest. Your photos and media are only accessible
              through authenticated, time-limited links.
            </Li>
          </Ul>
          <P>
            Because everything is hosted in the EU, your data is fully protected
            by European data protection laws.
          </P>
        </Section>

        <Section title="5. Who We Share Your Data With">
          <P>
            We do <strong>not</strong> sell, rent, or trade your personal data.
            Period. We only share data with a small number of trusted service
            providers who help us run The Memory Palace:
          </P>
          <Ul>
            <Li>
              <strong>Supabase</strong> — database hosting, file storage, and
              authentication.
            </Li>
            <Li>
              <strong>Vercel</strong> — application hosting and content delivery.
            </Li>
            <Li>
              <strong>Resend</strong> — sending transactional emails (such as
              password resets and notifications).
            </Li>
            <Li>
              <strong>Stripe</strong> — processing payments securely. We never
              see or store your credit card details.
            </Li>
          </Ul>
          <P>
            All these providers are bound by data processing agreements and
            comply with GDPR. Beyond these providers, your data is only shared
            when:
          </P>
          <Ul>
            <Li>
              <strong>You choose to share:</strong> when you invite family
              members to view rooms or memories, the shared content becomes
              accessible to those people.
            </Li>
            <Li>
              <strong>The law requires it:</strong> we may disclose data if
              required by law or valid legal process.
            </Li>
          </Ul>
        </Section>

        <Section title="6. Your Rights">
          <P>
            Under the GDPR (Articles 15-20 and beyond), you have strong rights
            over your personal data. Here is what you can do:
          </P>
          <Ul>
            <Li>
              <strong>Access your data:</strong> request a complete copy of
              everything we hold about you.
            </Li>
            <Li>
              <strong>Export your data:</strong> download all your memories,
              stories, and photos as a JSON file with a ZIP of your media —
              directly from your account settings.
            </Li>
            <Li>
              <strong>Correct your data:</strong> update or fix any information
              that is inaccurate or incomplete.
            </Li>
            <Li>
              <strong>Delete your data:</strong> request complete deletion of
              your account and all associated data. When you delete your account,
              everything is permanently removed.
            </Li>
            <Li>
              <strong>Data portability:</strong> receive your data in a
              structured, machine-readable format that you can take to another
              service.
            </Li>
            <Li>
              <strong>Object to processing:</strong> opt out of analytics at any
              time through your cookie preferences.
            </Li>
            <Li>
              <strong>Withdraw consent:</strong> change your mind about analytics
              cookies or other optional processing at any time.
            </Li>
          </Ul>
          <P>
            To exercise any of these rights, email us at{" "}
            <a href="mailto:privacy@thememorypalace.ai" style={linkStyle}>
              privacy@thememorypalace.ai
            </a>
            . We will respond within 30 days, as required by law.
          </P>
        </Section>

        <Section title="7. Data Retention">
          <P>
            Your data is kept for as long as your account is active. You are in
            control:
          </P>
          <Ul>
            <Li>
              <strong>Active account:</strong> your memories and data stay safely
              stored for as long as you use The Memory Palace.
            </Li>
            <Li>
              <strong>Account deletion:</strong> when you delete your account,
              all personal data and uploaded content is permanently removed
              within 30 days. Backup copies are purged within 90 days.
            </Li>
            <Li>
              <strong>Legacy delivery:</strong> if you have set up legacy
              contacts, your memories will be delivered to your chosen family
              members according to your settings. This is entirely optional and
              under your control.
            </Li>
            <Li>
              <strong>Anonymized analytics:</strong> aggregated, non-personal
              analytics data may be retained for up to 12 months after account
              deletion to help us improve the service.
            </Li>
          </Ul>
        </Section>

        <Section title="8. Cookies">
          <P>
            We keep cookies to a minimum:
          </P>
          <Ul>
            <Li>
              <strong>Essential cookies:</strong> required for logging in and
              core functionality. These cannot be disabled, as the app would not
              work without them.
            </Li>
            <Li>
              <strong>Optional analytics cookies:</strong> help us understand how
              people use the app so we can improve it. These are only set with
              your explicit consent, and you can change your preference at any
              time through the cookie consent banner.
            </Li>
          </Ul>
          <P>
            We do <strong>not</strong> use advertising cookies or trackers of any
            kind.
          </P>
        </Section>

        <Section title="9. Children's Privacy">
          <P>
            The Memory Palace is designed for adults and is not intended for
            children under the age of 16. We do not knowingly collect personal
            data from anyone under 16. If you believe a child has provided us
            with personal data, please contact us and we will promptly remove it.
          </P>
        </Section>

        <Section title="10. Changes to This Policy">
          <P>
            We may update this privacy policy from time to time. When we make
            significant changes, we will notify you by email or with a clear
            notice inside the app. Your continued use of The Memory Palace after
            any changes means you accept the updated policy.
          </P>
        </Section>

        <Section title="11. Contact Us">
          <P>
            If you have questions about this privacy policy, want to exercise
            your rights, or simply want to know more about how we protect your
            data, we would love to hear from you:
          </P>
          <Ul>
            <Li>
              Email:{" "}
              <a href="mailto:privacy@thememorypalace.ai" style={linkStyle}>
                privacy@thememorypalace.ai
              </a>
            </Li>
            <Li>Company: The Memory Palace, Belgium</Li>
          </Ul>
          <P>
            You also have the right to lodge a complaint with the Belgian Data
            Protection Authority (Gegevensbeschermingsautoriteit) if you believe
            your rights have been violated.
          </P>
        </Section>

        <div style={{ marginTop: 48, paddingTop: 24, borderTop: `1px solid ${C.sandstone}40` }}>
          <Link
            href="/security"
            style={{ ...linkStyle, fontSize: 14, marginRight: 24 }}
          >
            Security
          </Link>
          <Link
            href="/terms"
            style={{ ...linkStyle, fontSize: 14, marginRight: 24 }}
          >
            Terms of Service
          </Link>
          <Link href="/" style={{ ...linkStyle, fontSize: 14 }}>
            Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}

/* ─── Reusable styled sub-components ─── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 40 }}>
      <h2
        style={{
          fontFamily: F.display,
          fontSize: 24,
          fontWeight: 500,
          color: C.charcoal,
          marginBottom: 14,
          lineHeight: 1.3,
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: 15,
        lineHeight: 1.75,
        color: C.walnut,
        marginBottom: 12,
      }}
    >
      {children}
    </p>
  );
}

function Ul({ children }: { children: React.ReactNode }) {
  return (
    <ul
      style={{
        paddingLeft: 20,
        marginBottom: 12,
      }}
    >
      {children}
    </ul>
  );
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li
      style={{
        fontSize: 15,
        lineHeight: 1.75,
        color: C.walnut,
        marginBottom: 6,
      }}
    >
      {children}
    </li>
  );
}

const linkStyle: React.CSSProperties = {
  color: C.terracotta,
  textDecoration: "none",
  fontWeight: 500,
};
