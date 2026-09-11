import { isIP } from "node:net";
import { Ratelimit } from "@upstash/ratelimit";
import type { NextRequest } from "next/server";
import { HttpError } from "./http-error";
import { createRedis } from "./redis";

let warned = false;

function validIp(ip: string): string {
  return isIP(ip) ? ip : "unknown";
}

function toIso(reset: number): string {
  const ms = reset < 1e12 ? reset * 1000 : reset;
  return new Date(ms).toISOString();
}

/**
 * Sliding-window limiter. Default is fail-open (if the Redis store is
 * unreachable we log once and let traffic through instead of bricking the
 * site); pass failClosed: true for auth/session-critical budgets where an
 * outage should reject rather than admit unknown traffic.
 */
export async function rateLimit(options: {
  prefix: string;
  identifier: string;
  limit: number;
  windowSeconds: number;
  failClosed?: boolean;
}): Promise<{ success: boolean; headers: Headers }> {
  const headers = new Headers({ "X-RateLimit-Limit": String(options.limit) });
  const limiter = new Ratelimit({
    redis: createRedis(),
    limiter: Ratelimit.slidingWindow(options.limit, `${options.windowSeconds} s`),
    prefix: options.prefix,
  });
  try {
    const result = await limiter.limit(options.identifier);
    headers.set("X-RateLimit-Remaining", String(result.remaining));
    headers.set("X-RateLimit-Reset", toIso(result.reset));
    return { success: result.success, headers };
  } catch (error) {
    if (options.failClosed) {
      headers.set("X-RateLimit-Remaining", "0");
      return { success: false, headers };
    }
    if (!warned) {
      warned = true;
      console.warn("[rate-limit] Redis unavailable, letting request through:", error);
    }
    return { success: true, headers };
  }
}

export function clientIp(request: NextRequest): string {
  // Platform-set headers are trusted (set by the edge, not the caller). XFF
  // remains fallback only because it is client-spoofable; when present we use
  // the last entry (closest trusted hop) and validate it.
  const platformIp =
    request.headers.get("x-vercel-forwarded-ip") ?? request.headers.get("cf-connecting-ip");
  if (platformIp) return validIp(platformIp);
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const last = forwarded.split(",").pop()?.trim();
    if (last) return validIp(last);
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Returns the rate-limit headers, or throws 429 (with Retry-After) when the
 * budget is exhausted. Calls rateLimit() for graceful degradation.
 */
export async function enforceRateLimit(
  request: NextRequest,
  options: { prefix: string; identifier: string; limit: number; windowSeconds: number; failClosed?: boolean },
): Promise<Headers> {
  const result = await rateLimit(options);
  if (!result.success) {
    const reset = result.headers.get("X-RateLimit-Reset");
    const retryAfter = reset
      ? String(Math.max(1, Math.ceil((Date.parse(reset) - Date.now()) / 1000)))
      : undefined;
    const headers = new Headers();
    if (retryAfter) headers.set("Retry-After", retryAfter);
    throw new HttpError(429, "rate_limited", "Too many requests. Try again later.", undefined, headers);
  }
  return result.headers;
}