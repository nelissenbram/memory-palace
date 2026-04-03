import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - The Memory Palace",
  description: "Learn how The Memory Palace protects your personal data and memories. GDPR-compliant privacy practices with full transparency.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
