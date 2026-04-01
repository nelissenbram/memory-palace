import { Ratelimit } from "@upstash/ratelimit";
import { getRedis } from "./redis";

const limiters = new Map<string, Ratelimit>();

function getLimiter(prefix: string, limit: number, windowMs: number): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;

  const cacheKey = `${prefix}:${limit}:${windowMs}`;
  let limiter = limiters.get(cacheKey);
  if (!limiter) {
    const windowSec = Math.ceil(windowMs / 1000);
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, `${windowSec} s`),
      prefix: `ratelimit:${prefix}:${limit}:${windowSec}`,
    });
    limiters.set(cacheKey, limiter);
  }
  return limiter;
}

const isProd = process.env.NODE_ENV === "production";

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  limit: number;
  reset: number;
}

/**
 * Distributed rate limiter backed by Upstash Redis.
 * Fails open if Redis is unavailable.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const limiter = getLimiter("rl", limit, windowMs);
  if (!limiter) {
    return { success: true, remaining: limit, limit, reset: Date.now() + windowMs };
  }
  try {
    const result = await limiter.limit(key);
    return { success: result.success, remaining: result.remaining, limit: result.limit, reset: result.reset };
  } catch (err) {
    console.error("[rate-limit] Upstash error, failing open:", err);
    return { success: true, remaining: limit, limit, reset: Date.now() + windowMs };
  }
}

/**
 * Strict rate limiter for cost-sensitive routes (AI).
 * Fails CLOSED in production if Redis is unavailable.
 */
export async function rateLimitStrict(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const limiter = getLimiter("rls", limit, windowMs);
  if (!limiter) {
    if (isProd) {
      console.error("[rate-limit] Redis unavailable — blocking cost-sensitive request");
      return { success: false, remaining: 0, limit, reset: Date.now() + windowMs };
    }
    return { success: true, remaining: limit, limit, reset: Date.now() + windowMs };
  }
  try {
    const result = await limiter.limit(key);
    return { success: result.success, remaining: result.remaining, limit: result.limit, reset: result.reset };
  } catch (err) {
    console.error("[rate-limit] Upstash error:", err);
    if (isProd) return { success: false, remaining: 0, limit, reset: Date.now() + windowMs };
    return { success: true, remaining: limit, limit, reset: Date.now() + windowMs };
  }
}

/**
 * Backward-compatible wrapper. Now async — callers must await.
 */
export async function checkRateLimit(key: string, maxRequests: number, windowMs: number): Promise<boolean> {
  const { success } = await rateLimit(key, maxRequests, windowMs);
  return success;
}

/**
 * Standard rate limit response headers.
 */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "RateLimit-Limit": String(result.limit),
    "RateLimit-Remaining": String(result.remaining),
    "RateLimit-Reset": String(Math.ceil(result.reset / 1000)),
    "Retry-After": String(Math.max(0, Math.ceil((result.reset - Date.now()) / 1000))),
  };
}
