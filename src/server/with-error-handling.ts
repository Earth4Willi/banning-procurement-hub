import type { NextRequest } from "next/server";
import { HttpError, toErrorResponse } from "./http-error";

type Handler = (request: NextRequest) => Promise<Response>;

/**
 * Wraps a route handler so every outcome becomes a structured JSON error.
 * Unhandled exceptions map to a generic 500 with no stack or message leak.
 */
export function withErrorHandling(handler: Handler): Handler {
  return async (request: NextRequest) => {
    try {
      return await handler(request);
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      const code = error instanceof HttpError ? error.code : "internal";
      const url = new URL(request.url);
      const ip = (request.headers.get("x-forwarded-for") ?? "unknown").split(",")[0]?.trim();
      console.error(`[api] ${status} ${code} ${request.method} ${url.pathname} ip=${ip}`);
      return toErrorResponse(error);
    }
  };
}