import { describe, expect, it } from "vitest";
import { validateQuoteContact } from "./validation";

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
