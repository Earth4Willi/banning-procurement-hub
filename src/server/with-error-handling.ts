import type { NextRequest } from "next/server";
import { HttpError, toErrorResponse } from "./http-error";
import { clientIp } from "./rate-limit";

/**
 * Wraps a route handler so every outcome becomes a structured JSON error.
 * Unhandled exceptions map to a generic 500 with no stack or message leak.
 * Next.js "not found" (NEXT_NOT_FOUND digest) is re-thrown so the framework
 * still renders its own 404 page.
 */
export function withErrorHandling(
  handler: (...args: any[]) => Promise<Response>,
): (...args: any[]) => Promise<Response> {
  return async (...args: any[]) => {
    try {
      return await handler(...args);
    } catch (error) {
      if (error instanceof Error && typeof (error as Error & { digest?: string }).digest === "string" && (error as Error & { digest: string }).digest.startsWith("NEXT_HTTP_ERROR_FALLBACK")) {
        throw error;
      }
      const status = error instanceof HttpError ? error.status : 500;
      const code = error instanceof HttpError ? error.code : "internal";
      const request = args[0] instanceof Request ? (args[0] as NextRequest) : undefined;
      const url = request ? new URL(request.url) : new URL("http://internal/unknown");
      const ip = request ? clientIp(request) : "unknown";
      const sanitizedIp = ip.replace(/[^\x20-\x7E]/g, "");
      console.error(`[api] ${status} ${code} ${request?.method ?? "?"} ${url.pathname} ip=${sanitizedIp}`);
      return toErrorResponse(error);
    }
  };
}