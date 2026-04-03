import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Security - The Memory Palace",
  description: "How The Memory Palace keeps your memories safe. EU-hosted infrastructure, end-to-end encryption, and enterprise-grade security.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
