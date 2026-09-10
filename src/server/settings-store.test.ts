import { describe, expect, it, vi } from "vitest";
import { getPublicSiteSettings, getSettings, updateSettings } from "./settings-store";
import { SEED_SETTINGS } from "@/lib/settings-types";

vi.mock("./audit", () => ({ getSupabaseClient: () => null }));

describe("settings-store", () => {
  it("getSettings falls back to SEED_SETTINGS when the DB is unavailable", async () => {
    const site = await getSettings("site");
    expect(site.name).toBe(SEED_SETTINGS.site.name);
    expect(site.email).toBe(SEED_SETTINGS.site.email);
  });

  it("getPublicSiteSettings returns every section via the seed fallback", async () => {
    const all = await getPublicSiteSettings();
    expect(all.site.tagline).toBe(SEED_SETTINGS.site.tagline);
    expect(all.marquee.messages.length).toBeGreaterThan(0);
    expect(all.delivery.areas.length).toBeGreaterThan(0);
    expect(all.payments.methods).toContain("bank");
  });

  it("updateSettings returns false (best-effort) with no DB client", async () => {
    const ok = await updateSettings("marquee", { messages: ["Test"] });
    expect(ok).toBe(false);
  });
});