import { describe, expect, it } from "vitest";
import {
  base32Decode,
  base32Encode,
  generateSecret,
  totpCode,
  verifyTotp,
} from "./totp";

describe("base32", () => {
  it("round trips arbitrary bytes", () => {
    const bytes = new TextEncoder().encode("Banning Procurement Hub!");
    expect(Array.from(base32Decode(base32Encode(bytes)))).toEqual(Array.from(bytes));
  });

  it("generates a 32 char secret (160 bits)", () => {
    const secret = generateSecret();
    expect(secret).toMatch(/^[A-Z2-7]{32}$/);
    expect(Array.from(base32Decode(secret))).toHaveLength(20);
  });
});

describe("totp", () => {
  // RFC 6238 SHA1 test vector: key "12345678901234567890", counter 1, 8 digits.
  const rfcKey = base32Encode(new TextEncoder().encode("12345678901234567890"));

  it("matches the RFC 6238 vector (94287082 at T=59)", () => {
    expect(totpCode(rfcKey, { time: 59000, digits: 8, digest: "sha1" })).toBe("94287082");
  });

  it("produces a 6-digit code by default", () => {
    const code = totpCode(generateSecret(), { time: Date.now() });
    expect(code).toMatch(/^\d{6}$/);
  });

  it("accepts the current, previous and next step and rejects a wrong code", () => {
    const secret = generateSecret();
    const code = totpCode(secret);
    expect(verifyTotp(secret, code)).toBe(true);
    expect(verifyTotp(secret, "000000")).toBe(false);
    const next = totpCode(secret, { time: Date.now() + 90_000 });
    expect(verifyTotp(secret, next, { window: 3 })).toBe(true);
  });
});