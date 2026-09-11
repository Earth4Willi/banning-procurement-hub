import { beforeEach, describe, expect, it, vi } from "vitest";
import { emailConfigured, emailFrom, quoteStatusForCustomer, quoteSubmittedForCustomer, sendEmail } from "./notify";
import { resetEnvCache } from "./env";
import { setTestEnv } from "./testing/env-fixture";

const base = { reference: "BQ-0001", name: "Ama", area: "Accra", itemCount: 3 };

beforeEach(() => {
  setTestEnv();
});

describe("email configuration", () => {
  it("reports not configured when RESEND_API_KEY is absent", () => {
    delete process.env.RESEND_API_KEY;
    resetEnvCache();
    expect(emailConfigured()).toBe(false);
  });

  it("reports configured when RESEND_API_KEY is present", () => {
    process.env.RESEND_API_KEY = "re_test_key";
    resetEnvCache();
    expect(emailConfigured()).toBe(true);
  });

  it("falls back to the site email as the sender", () => {
    expect(emailFrom()).toBe("banning173@gmail.com");
  });
});

describe("sendEmail", () => {
  it("short-circuits to false without a key", async () => {
    delete process.env.RESEND_API_KEY;
    resetEnvCache();
    await expect(sendEmail({ to: "a@b.com", subject: "s", html: "h" })).resolves.toBe(false);
  });

  it("posts to the Resend API and resolves true on 2xx", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    resetEnvCache();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => "" });
    vi.stubGlobal("fetch", fetchMock);
    const ok = await sendEmail({ to: "a@b.com", subject: "s", html: "h" });
    expect(ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer re_test_key" }),
        body: expect.stringContaining("a@b.com"),
      }),
    );
  });

  it("resolves false on a non-2xx response without throwing", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    resetEnvCache();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 422, text: async () => "bad" }),
    );
    await expect(sendEmail({ to: "a@b.com", subject: "s", html: "h" })).resolves.toBe(false);
  });

  it("resolves false when fetch itself rejects", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    resetEnvCache();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    await expect(sendEmail({ to: "a@b.com", subject: "s", html: "h" })).resolves.toBe(false);
  });
});

describe("quote email templates", () => {
  it("builds a customer-submitted message with recipient and reference", () => {
    const msg = quoteSubmittedForCustomer("ama@example.com", base);
    expect(msg.to).toBe("ama@example.com");
    expect(msg.subject).toContain("received your quote request");
    expect(msg.html).toContain("BQ-0001");
    expect(msg.html).toContain("055 885 0667");
  });

  it("builds a status message with the public doc link", () => {
    const msg = quoteStatusForCustomer("ama@example.com", { ...base, status: "won", docUrl: "https://x/q/t" });
    expect(msg.to).toBe("ama@example.com");
    expect(msg.html).toContain("https://x/q/t");
    expect(msg.html).toMatch(/accepted/i);
  });
});