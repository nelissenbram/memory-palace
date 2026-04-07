import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing - The Memory Palace",
  description: "Choose your plan for The Memory Palace. Free, Premium, and Family options to preserve and share your most precious memories.",
  openGraph: {
    title: "Pricing - The Memory Palace",
    description: "Choose your plan for The Memory Palace. Free, Premium, and Family options to preserve and share your most precious memories.",
    url: "https://thememorypalace.ai/pricing",
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
    title: "Pricing - The Memory Palace",
    description: "Choose your plan for The Memory Palace. Free, Premium, and Family options to preserve and share your most precious memories.",
    images: ["https://thememorypalace.ai/palace-hero.jpg"],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
