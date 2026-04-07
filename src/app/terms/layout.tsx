import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service - The Memory Palace",
  description: "Terms of Service for The Memory Palace. Understand your rights and responsibilities when using our memory preservation platform.",
  openGraph: {
    title: "Terms of Service - The Memory Palace",
    description: "Terms of Service for The Memory Palace. Understand your rights and responsibilities when using our memory preservation platform.",
    url: "https://thememorypalace.ai/terms",
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
    title: "Terms of Service - The Memory Palace",
    description: "Terms of Service for The Memory Palace. Understand your rights and responsibilities when using our memory preservation platform.",
    images: ["https://thememorypalace.ai/palace-hero.jpg"],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
