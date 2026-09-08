import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./passwords";

describe("passwords", () => {
  it("hashes and verifies a password", async () => {
    const hash = await hashPassword("correct horse", 4);
    expect(hash).not.toContain("correct horse");
    await expect(verifyPassword("correct horse", hash)).resolves.toBe(true);
    await expect(verifyPassword("wrong horse", hash)).resolves.toBe(false);
  });
});