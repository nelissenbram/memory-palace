import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service - The Memory Palace",
  description: "Terms of Service for The Memory Palace. Understand your rights and responsibilities when using our memory preservation platform.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
