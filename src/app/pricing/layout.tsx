import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing - The Memory Palace",
  description: "Choose your plan for The Memory Palace. Free, Premium, and Family options to preserve and share your most precious memories.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
