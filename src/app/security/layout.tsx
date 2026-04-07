import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Security - The Memory Palace",
  description: "How The Memory Palace keeps your memories safe. EU-hosted infrastructure, end-to-end encryption, and enterprise-grade security.",
  openGraph: {
    title: "Security - The Memory Palace",
    description: "How The Memory Palace keeps your memories safe. EU-hosted infrastructure, end-to-end encryption, and enterprise-grade security.",
    url: "https://thememorypalace.ai/security",
    siteName: "The Memory Palace",
    images: [
      {
        url: "https://thememorypalace.ai/palace-hero.jpg",
        width: 1200,
        height: 630,
        alt: "The Memory Palace — a 3D palace for your life story",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Security - The Memory Palace",
    description: "How The Memory Palace keeps your memories safe. EU-hosted infrastructure, end-to-end encryption, and enterprise-grade security.",
    images: ["https://thememorypalace.ai/palace-hero.jpg"],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
