import { describe, expect, it } from "vitest";
import { isGhanaMobile, validateQuoteContact } from "./validation";

describe("isGhanaMobile", () => {
  it("accepts compact 0, 233, +233, and spaced formats", () => {
    expect(isGhanaMobile("0551234567")).toBe(true);
    expect(isGhanaMobile("055 885 0667")).toBe(true);
    expect(isGhanaMobile("233551234567")).toBe(true);
    expect(isGhanaMobile("+233551234567")).toBe(true);
    expect(isGhanaMobile("0246123456")).toBe(true);
    expect(isGhanaMobile("0209123456")).toBe(true);
    expect(isGhanaMobile("0543123456")).toBe(true);
  });
  it("rejects landlines, too-short, too-long, and non-Ghana prefixes", () => {
    expect(isGhanaMobile("0302123456")).toBe(false);
    expect(isGhanaMobile("05512345")).toBe(false);
    expect(isGhanaMobile("0551234567890")).toBe(false);
    expect(isGhanaMobile("0551a23456")).toBe(false);
    expect(isGhanaMobile("+447911123456")).toBe(false);
    expect(isGhanaMobile("")).toBe(false);
  });
});

describe("validateQuoteContact", () => {
  it("accepts a valid contact", () => {
    expect(validateQuoteContact({ name: "Nana", phone: "0551234567", area: "East Legon" })).toEqual({});
  });
  it("flags missing name and area", () => {
    const errors = validateQuoteContact({ name: "", phone: "0551234567", area: "" });
    expect(errors.name).toBeDefined();
    expect(errors.area).toBeDefined();
  });
  it("rejects invalid Ghana phone numbers and accepts +233 / 233 / 0 forms", () => {
    expect(validateQuoteContact({ name: "a", phone: "12345", area: "x" }).phone).toBeDefined();
    expect(validateQuoteContact({ name: "a", phone: "+233551234567", area: "x" }).phone).toBeUndefined();
    expect(validateQuoteContact({ name: "a", phone: "233551234567", area: "x" }).phone).toBeUndefined();
    expect(validateQuoteContact({ name: "a", phone: "055551234567890", area: "x" }).phone).toBeDefined();
  });
  it("accepts email when present and flags malformed or missing-domain addresses", () => {
    expect(validateQuoteContact({ name: "a", phone: "0551234567", area: "x" }).email).toBeUndefined();
    expect(validateQuoteContact({ name: "a", phone: "0551234567", area: "x", email: "nana@banning.com" }).email).toBeUndefined();
    expect(validateQuoteContact({ name: "a", phone: "0551234567", area: "x", email: "not-an-email" }).email).toBeDefined();
    expect(validateQuoteContact({ name: "a", phone: "0551234567", area: "x", email: "nana@" }).email).toBeDefined();
  });
});
