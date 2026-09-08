import { describe, expect, it } from "vitest";
import { badRequest, HttpError, toErrorResponse } from "./http-error";

describe("HttpError", () => {
  it("carries status, code and optional details", () => {
    const error = badRequest("validation_failed", "Nope.", [{ field: "phone" }]);
    expect(error).toBeInstanceOf(HttpError);
    expect(error.status).toBe(400);
    expect(error.code).toBe("validation_failed");
    expect(error.details).toEqual([{ field: "phone" }]);
  });

  it("returns the structured body and status for HttpError", async () => {
    const response = toErrorResponse(badRequest("validation_failed", "Nope."));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: { code: "validation_failed", message: "Nope." } });
  });

  it("copies extra headers onto the response", async () => {
    const error = new HttpError(
      429,
      "rate_limited",
      "Slow down.",
      undefined,
      new Headers({ "Retry-After": "30" }),
    );
    const response = toErrorResponse(error);
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("30");
  });

  it("never leaks internal errors", async () => {
    const secret = "this is an internal stack trace";
    const response = toErrorResponse(new Error(secret));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error.code).toBe("internal");
    expect(JSON.stringify(body)).not.toContain(secret);
  });
});