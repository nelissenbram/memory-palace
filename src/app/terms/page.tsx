"use client";

import Link from "next/link";
import { T } from "@/lib/theme";

const F = T.font;
const C = T.color;

export default function TermsOfServicePage() {
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
          Terms of Service
        </h1>
        <p style={{ fontSize: 14, color: C.muted, marginBottom: 48 }}>
          Last updated: March 15, 2026
        </p>

        <Section title="1. Acceptance of Terms">
          <P>
            By creating an account or using The Memory Palace (&quot;the Service&quot;),
            you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do
            not agree to these Terms, please do not use the Service.
          </P>
          <P>
            The Service is operated by Memory Palace, a company based in Belgium.
            These Terms are governed by Belgian law and the laws of the European
            Union.
          </P>
        </Section>

        <Section title="2. Account Responsibilities">
          <P>To use the Service, you must:</P>
          <Ul>
            <Li>Be at least 16 years of age.</Li>
            <Li>Provide accurate and complete registration information.</Li>
            <Li>Keep your login credentials secure and confidential.</Li>
            <Li>
              Notify us immediately at{" "}
              <a href="mailto:support@memorypalace.app" style={linkStyle}>
                support@memorypalace.app
              </a>{" "}
              if you suspect unauthorized access to your account.
            </Li>
          </Ul>
          <P>
            You are responsible for all activity that occurs under your account.
            We are not liable for losses arising from unauthorized use of your
            account.
          </P>
        </Section>

        <Section title="3. Acceptable Use">
          <P>You agree not to use the Service to:</P>
          <Ul>
            <Li>
              Upload, store, or share content that is illegal, abusive, defamatory,
              or infringes on the rights of others.
            </Li>
            <Li>
              Distribute malware, viruses, or any harmful code through the platform.
            </Li>
            <Li>
              Attempt to gain unauthorized access to other users&apos; accounts,
              data, or any part of our infrastructure.
            </Li>
            <Li>
              Use automated tools (bots, scrapers) to access the Service without
              our written permission.
            </Li>
            <Li>
              Use the Service for commercial purposes without our prior consent.
            </Li>
          </Ul>
          <P>
            We reserve the right to suspend or terminate accounts that violate
            these terms without prior notice.
          </P>
        </Section>

        <Section title="4. Your Content & Intellectual Property">
          <P>
            You retain full ownership of all content you upload to The Memory
            Palace, including photos, videos, text, and audio recordings
            (&quot;Your Content&quot;).
          </P>
          <P>
            By uploading content, you grant us a limited, non-exclusive license to
            store, process, and display Your Content solely for the purpose of
            providing the Service to you and any users you explicitly share it with.
          </P>
          <P>
            We do not claim any ownership over Your Content. We will not use Your
            Content for advertising, training AI models, or any purpose other than
            delivering the Service.
          </P>
        </Section>

        <Section title="5. Service Availability">
          <P>
            We strive to keep The Memory Palace available at all times, but we do
            not guarantee uninterrupted access. The Service may be temporarily
            unavailable due to maintenance, updates, or circumstances beyond our
            control.
          </P>
          <P>
            We may modify, suspend, or discontinue features of the Service at any
            time. In the event of a permanent shutdown, we will provide at least 90
            days&apos; notice and a way to export your data.
          </P>
        </Section>

        <Section title="6. Limitation of Liability">
          <P>
            To the maximum extent permitted by applicable law, Memory Palace and
            its officers, employees, and affiliates shall not be liable for:
          </P>
          <Ul>
            <Li>
              Any indirect, incidental, special, consequential, or punitive damages.
            </Li>
            <Li>
              Loss of data, profits, or goodwill arising from your use of the
              Service.
            </Li>
            <Li>
              Any unauthorized access to or alteration of your content or data.
            </Li>
          </Ul>
          <P>
            Our total liability for any claims related to the Service shall not
            exceed the amount you paid us in the 12 months preceding the claim, or
            EUR 100, whichever is greater.
          </P>
        </Section>

        <Section title="7. Indemnification">
          <P>
            You agree to indemnify and hold harmless Memory Palace from any claims,
            damages, or expenses arising from your use of the Service, your
            violation of these Terms, or your violation of any rights of a third
            party.
          </P>
        </Section>

        <Section title="8. Termination">
          <P>
            You may delete your account at any time through the Settings page. Upon
            deletion, all your data will be permanently removed within 30 days.
          </P>
          <P>
            We may terminate or suspend your account if you violate these Terms.
            In cases of severe or repeated violations, termination may be immediate
            and without notice.
          </P>
          <P>
            Sections relating to intellectual property, limitation of liability,
            indemnification, and governing law survive termination.
          </P>
        </Section>

        <Section title="9. Changes to These Terms">
          <P>
            We may update these Terms from time to time. We will notify you of
            material changes via email or a notice within the application at least
            30 days before they take effect.
          </P>
          <P>
            Continued use of the Service after changes take effect constitutes
            acceptance of the updated Terms. If you do not agree with the changes,
            you should stop using the Service and delete your account.
          </P>
        </Section>

        <Section title="10. Governing Law & Disputes">
          <P>
            These Terms are governed by the laws of Belgium. Any disputes arising
            from these Terms or your use of the Service shall be submitted to the
            courts of Belgium.
          </P>
          <P>
            If you are a consumer in the EU, you may also use the European
            Commission&apos;s Online Dispute Resolution platform at{" "}
            <a
              href="https://ec.europa.eu/consumers/odr"
              target="_blank"
              rel="noopener noreferrer"
              style={linkStyle}
            >
              https://ec.europa.eu/consumers/odr
            </a>
            .
          </P>
        </Section>

        <Section title="11. Contact">
          <P>
            For questions about these Terms of Service, contact us:
          </P>
          <Ul>
            <Li>
              Email:{" "}
              <a href="mailto:support@memorypalace.app" style={linkStyle}>
                support@memorypalace.app
              </a>
            </Li>
            <Li>Company: Memory Palace, Belgium</Li>
          </Ul>
        </Section>

        <div style={{ marginTop: 48, paddingTop: 24, borderTop: `1px solid ${C.sandstone}40` }}>
          <Link
            href="/privacy"
            style={{ ...linkStyle, fontSize: 14, marginRight: 24 }}
          >
            Privacy Policy
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
