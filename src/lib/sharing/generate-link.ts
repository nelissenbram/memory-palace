const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");

export function generateInviteLink(shareId: string): string {
  return `${SITE_URL}/invite/${shareId}`;
}

export function generatePublicLink(slug: string): string {
  return `${SITE_URL}/public/${slug}`;
}
