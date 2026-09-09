import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { requireOwner } from "./require-owner";

describe("requireOwner", () => {
  it("returns null when no session cookie is present", async () => {
    const request = new NextRequest("https://example.com/api/admin/quotes");
    await expect(requireOwner(request)).resolves.toBeNull();
  });
});