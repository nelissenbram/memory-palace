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
          Last updated: March 15, 2026
        </p>

        <Section title="1. Who We Are">
          <P>
            Memory Palace is operated by Memory Palace, a company based in Belgium.
            We are committed to protecting the privacy and security of your personal
            data in compliance with the General Data Protection Regulation (GDPR) and
            applicable Belgian law.
          </P>
          <P>
            For any privacy-related inquiries, you can contact us at:{" "}
            <a href="mailto:privacy@memorypalace.app" style={linkStyle}>
              privacy@memorypalace.app
            </a>
          </P>
        </Section>

        <Section title="2. Data We Collect">
          <P>We collect the following categories of personal data:</P>
          <Ul>
            <Li>
              <strong>Account information:</strong> name, email address, and password
              (hashed) when you create an account.
            </Li>
            <Li>
              <strong>Content:</strong> photos, videos, stories, and other media you
              upload to your Memory Palace.
            </Li>
            <Li>
              <strong>Usage data:</strong> anonymized analytics about how you use the
              application, collected via PostHog (see Cookies section below).
            </Li>
            <Li>
              <strong>Device information:</strong> browser type, operating system, and
              screen resolution for optimizing your experience.
            </Li>
          </Ul>
        </Section>

        <Section title="3. How We Store Your Data">
          <P>
            Your data is stored securely on Supabase infrastructure hosted in{" "}
            <strong>Frankfurt, Germany (EU)</strong>. This means your data remains
            within the European Union and is subject to EU data protection laws.
          </P>
          <P>
            We use bank-grade encryption to protect your data: all data in transit
            is encrypted via TLS 1.2+, and all data at rest is encrypted using
            AES-256 encryption on our database servers.
          </P>
        </Section>

        <Section title="4. How We Use Your Data">
          <P>We use your personal data to:</P>
          <Ul>
            <Li>Provide and maintain the Memory Palace service.</Li>
            <Li>Authenticate your account and enable secure access.</Li>
            <Li>
              Process and organize your uploaded content (photos, videos, stories).
            </Li>
            <Li>
              Send service-related communications (e.g., email confirmations,
              security alerts).
            </Li>
            <Li>
              Improve the application based on anonymized usage analytics.
            </Li>
          </Ul>
        </Section>

        <Section title="5. Data Sharing">
          <P>
            We do not sell, rent, or trade your personal data to third parties.
            Your data may be shared only in the following limited circumstances:
          </P>
          <Ul>
            <Li>
              <strong>Service providers:</strong> we use Supabase (hosting and
              database), Vercel (application hosting), and PostHog (analytics) as
              sub-processors, all bound by data processing agreements.
            </Li>
            <Li>
              <strong>Sharing features:</strong> when you explicitly share rooms or
              memories with other users or generate public links, the shared content
              becomes accessible to the invited parties.
            </Li>
            <Li>
              <strong>Legal obligations:</strong> we may disclose data if required by
              law or valid legal process.
            </Li>
          </Ul>
        </Section>

        <Section title="6. Cookies & Analytics">
          <P>
            We use cookies and similar technologies for the following purposes:
          </P>
          <Ul>
            <Li>
              <strong>Essential cookies:</strong> required for authentication and
              core functionality. These cannot be disabled.
            </Li>
            <Li>
              <strong>Analytics cookies (PostHog):</strong> used to understand how
              visitors interact with our application. These are only set with your
              explicit consent. PostHog data is anonymized and does not track you
              across other websites.
            </Li>
          </Ul>
          <P>
            You can manage your cookie preferences at any time through the cookie
            consent banner or by contacting us.
          </P>
        </Section>

        <Section title="7. Your Rights">
          <P>
            Under the GDPR, you have the following rights regarding your personal
            data:
          </P>
          <Ul>
            <Li>
              <strong>Right of access:</strong> request a copy of all personal data
              we hold about you.
            </Li>
            <Li>
              <strong>Right to rectification:</strong> request correction of
              inaccurate or incomplete data.
            </Li>
            <Li>
              <strong>Right to erasure:</strong> request deletion of your personal
              data and account.
            </Li>
            <Li>
              <strong>Right to data portability:</strong> receive your data in a
              structured, machine-readable format.
            </Li>
            <Li>
              <strong>Right to object:</strong> object to processing of your data
              for analytics purposes.
            </Li>
            <Li>
              <strong>Right to withdraw consent:</strong> withdraw your consent for
              analytics cookies at any time.
            </Li>
          </Ul>
          <P>
            To exercise any of these rights, contact us at{" "}
            <a href="mailto:privacy@memorypalace.app" style={linkStyle}>
              privacy@memorypalace.app
            </a>
            . We will respond within 30 days.
          </P>
        </Section>

        <Section title="8. Data Retention">
          <P>
            We retain your personal data for as long as your account is active. If
            you delete your account, we will permanently delete all your data,
            including uploaded content, within 30 days. Anonymized analytics data
            may be retained for up to 12 months after deletion.
          </P>
          <P>
            Backup copies are automatically purged within 90 days of account
            deletion.
          </P>
        </Section>

        <Section title="9. Children's Privacy">
          <P>
            Memory Palace is not directed at children under 16. We do not knowingly
            collect personal data from children. If you believe a child has provided
            us with personal data, please contact us to have it removed.
          </P>
        </Section>

        <Section title="10. Changes to This Policy">
          <P>
            We may update this privacy policy from time to time. We will notify you
            of material changes via email or a prominent notice within the
            application. Continued use of the service after changes constitutes
            acceptance of the updated policy.
          </P>
        </Section>

        <Section title="11. Contact">
          <P>
            If you have questions about this privacy policy or wish to exercise your
            rights, contact us:
          </P>
          <Ul>
            <Li>
              Email:{" "}
              <a href="mailto:privacy@memorypalace.app" style={linkStyle}>
                privacy@memorypalace.app
              </a>
            </Li>
            <Li>Company: Memory Palace, Belgium</Li>
          </Ul>
          <P>
            You also have the right to lodge a complaint with the Belgian Data
            Protection Authority (Gegevensbeschermingsautoriteit) if you believe
            your rights have been violated.
          </P>
        </Section>

        <div style={{ marginTop: 48, paddingTop: 24, borderTop: `1px solid ${C.sandstone}40` }}>
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
