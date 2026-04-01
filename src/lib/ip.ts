/**
 * Extract the real client IP from a request.
 * On Vercel, x-forwarded-for is: "client, proxy1, proxy2".
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (!forwarded) return "unknown";

  const ips = forwarded.split(",").map((ip) => ip.trim());

  for (const ip of ips) {
    if (ip && !isPrivateIp(ip)) return ip;
  }

  return ips[0]?.trim() || `unknown-${Math.random().toString(36).slice(2, 8)}`;
}

function isPrivateIp(ip: string): boolean {
  if (
    ip.startsWith("10.") ||
    ip.startsWith("172.16.") ||
    ip.startsWith("172.17.") ||
    ip.startsWith("172.18.") ||
    ip.startsWith("172.19.") ||
    ip.startsWith("172.20.") ||
    ip.startsWith("172.21.") ||
    ip.startsWith("172.22.") ||
    ip.startsWith("172.23.") ||
    ip.startsWith("172.24.") ||
    ip.startsWith("172.25.") ||
    ip.startsWith("172.26.") ||
    ip.startsWith("172.27.") ||
    ip.startsWith("172.28.") ||
    ip.startsWith("172.29.") ||
    ip.startsWith("172.30.") ||
    ip.startsWith("172.31.") ||
    ip.startsWith("192.168.") ||
    ip === "127.0.0.1" ||
    ip === "::1"
  ) return true;

  // IPv6 checks
  const ipLower = ip.toLowerCase();
  if (
    ipLower.startsWith("fc") ||
    ipLower.startsWith("fd") ||
    ipLower.startsWith("fe80:") ||
    ipLower.startsWith("ff")
  ) return true;

  return false;
}
