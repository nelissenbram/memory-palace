import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - The Memory Palace",
  description: "Learn how The Memory Palace protects your personal data and memories. GDPR-compliant privacy practices with full transparency.",
  openGraph: {
    title: "Privacy Policy - The Memory Palace",
    description: "Learn how The Memory Palace protects your personal data and memories. GDPR-compliant privacy practices with full transparency.",
    url: "https://thememorypalace.ai/privacy",
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
    title: "Privacy Policy - The Memory Palace",
    description: "Learn how The Memory Palace protects your personal data and memories. GDPR-compliant privacy practices with full transparency.",
    images: ["https://thememorypalace.ai/palace-hero.jpg"],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
