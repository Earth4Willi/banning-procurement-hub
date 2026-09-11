import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { HttpError } from "./http-error";
import { setTestEnv } from "./testing/env-fixture";
import { withErrorHandling } from "./with-error-handling";

const REQ = (url = "https://example.com/api/x") => new NextRequest(url);

describe("withErrorHandling", () => {
  it("converts an HttpError into its structured response", async () => {
    setTestEnv();
    const handler = async () => {
      throw new HttpError(400, "validation_failed", "Nope.");
    };
    const res = await withErrorHandling(handler)(REQ());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: { code: "validation_failed", message: "Nope." } });
  });

  it("forwards extra arguments (e.g. params) to the handler", async () => {
    setTestEnv();
    const handler = async (_request: NextRequest, ctx: { params: Promise<{ token: string }> }) => {
      const { token } = await ctx.params;
      return NextResponse.json({ token });
    };
    const res = await withErrorHandling(handler)(REQ("https://example.com/api/q/x/document"), {
      params: Promise.resolve({ token: "abc" }),
    });
    expect(await res.json()).toEqual({ token: "abc" });
  });

  it("re-throws the Next.js not-found digest so the framework renders its own 404", async () => {
    setTestEnv();
    const handler = async () => {
      const err = new Error("404") as Error & { digest?: string };
      err.digest = "NEXT_HTTP_ERROR_FALLBACK;404";
      throw err;
    };
    await expect(withErrorHandling(handler)(REQ())).rejects.toThrow(/404/);
  });

  it("never leaks internal errors", async () => {
    setTestEnv();
    const handler = async () => {
      throw new Error("secret stack trace");
    };
    const res = await withErrorHandling(handler)(REQ());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe("internal");
    expect(JSON.stringify(body)).not.toContain("secret stack trace");
  });
});