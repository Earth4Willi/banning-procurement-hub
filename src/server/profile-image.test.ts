import { beforeEach, describe, expect, it } from "vitest";
import { resetEnvCache } from "./env";
import { avatarPublicUrl, validateAvatarFile } from "./profile-image";

const valid = { name: "avatar.jpg", type: "image/jpeg", size: 1024 };

describe("validateAvatarFile", () => {
  it("accepts jpeg/png/webp within the size limit", () => {
    expect(
      validateAvatarFile({ name: "a.jpg", type: "image/jpeg", size: 512 }),
    ).toBeNull();
    expect(
      validateAvatarFile({ name: "a.png", type: "image/png", size: 512 }),
    ).toBeNull();
    expect(
      validateAvatarFile({ name: "a.webp", type: "image/webp", size: 512 }),
    ).toBeNull();
  });

  it("rejects unsupported content types", () => {
    expect(validateAvatarFile({ ...valid, type: "image/gif" })).toMatch(/JPEG, PNG, or WebP/);
    expect(validateAvatarFile({ ...valid, type: "" })).toMatch(/JPEG, PNG, or WebP/);
  });

  it("rejects empty uploads", () => {
    expect(validateAvatarFile({ ...valid, size: 0 })).toMatch(/empty/);
  });

  it("rejects files over 3MB", () => {
    expect(validateAvatarFile({ ...valid, size: 3 * 1024 * 1024 + 1 })).toMatch(/too large/);
  });

  it("rejects misleading extensions that do not match the whitelist", () => {
    expect(validateAvatarFile({ ...valid, name: "avatar.gif" })).toMatch(/JPEG, PNG, or WebP/);
  });
});

describe("avatarPublicUrl", () => {
  beforeEach(() => {
    delete process.env.SUPABASE_URL;
    resetEnvCache();
  });

  it("is null without a configured Supabase URL", () => {
    expect(avatarPublicUrl()).toBeNull();
  });

  it("builds the deterministic public object URL", () => {
    process.env.SUPABASE_URL = "https://qubjxqbkipvokrbpxbqt.supabase.co";
    expect(avatarPublicUrl()).toBe(
      "https://qubjxqbkipvokrbpxbqt.supabase.co/storage/v1/object/public/profile-images/owner/avatar",
    );
  });
});