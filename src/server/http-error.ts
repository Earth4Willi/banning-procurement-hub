import { NextResponse } from "next/server";

export const EMPTY_BODY = Symbol("empty-body");

export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;
  readonly headers?: Headers;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: unknown,
    headers?: Headers,
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    this.headers = headers;
  }
}

export const badRequest = (code: string, message: string, details?: unknown) =>
  new HttpError(400, code, message, details);
export const unauthorized = (code = "unauthorized", message = "Authentication required.") =>
  new HttpError(401, code, message);
export const forbidden = (code = "forbidden", message = "You do not have permission.") =>
  new HttpError(403, code, message);
export const notFound = (code = "not_found", message = "Not found.") =>
  new HttpError(404, code, message);
export const tooManyRequests = (message = "Too many requests. Try again later.") =>
  new HttpError(429, "rate_limited", message);
export const conflict = (field: string) =>
  new HttpError(409, "conflict", `This ${field} is already in use by another account.`);

const GENERIC_MESSAGE = "Something went wrong.";

export function toErrorResponse(error: unknown): NextResponse {
  const body = { error: { code: "internal", message: GENERIC_MESSAGE } as Record<string, unknown> };
  if (error instanceof HttpError) {
    body.error = { code: error.code, message: error.message };
    if (error.details !== undefined) body.error.details = error.details;
    const response = NextResponse.json(body, { status: error.status });
    error.headers?.forEach((value, key) => response.headers.set(key, value));
    return response;
  }
  console.error("[http-error] unhandled:", error);
  return NextResponse.json(body, { status: 500 });
}