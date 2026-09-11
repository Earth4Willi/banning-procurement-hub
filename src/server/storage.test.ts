import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureBucket, storagePublicUrl, validateImageFile } from "./storage";

describe("validateImageFile", () => {
  it("accepts an allowed type within size", () => {
    const result = validateImageFile({ name: "a.jpg", type: "image/jpeg", size: 1_000 }, new Set(["image/jpeg"]), 3_000_000);
    expect(result).toEqual({ ok: true });
  });

  it("rejects a disallowed type", () => {
    const file = { name: "a.txt", type: "text/plain", size: 10 };
    const result = validateImageFile(file, new Set(["image/jpeg", "image/png"]), 3_000_000);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain("JPEG");
  });

  it("rejects an oversized file", () => {
    const file = { name: "a.jpg", type: "image/jpeg", size: 4_000_000 };
    const result = validateImageFile(file, new Set(["image/jpeg"]), 3_000_000);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain("3 MB");
  });
});

describe("storagePublicUrl", () => {
  it("builds the public object URL", () => {
    vi.stubEnv("SUPABASE_URL", "https://project.supabase.co/");
    expect(storagePublicUrl("catalog-images", "products/cement.jpg")).toBe(
      "https://project.supabase.co/storage/v1/object/public/catalog-images/products/cement.jpg",
    );
  });

  it("returns empty when env missing", () => {
    vi.stubEnv("SUPABASE_URL", "");
    expect(storagePublicUrl("catalog-images", "x.jpg")).toBe("");
  });
});

function mockStorageClient(getBucketResult?: {
  data?: { public: boolean } | null;
  error?: { message: string } | null;
}) {
  const calls = { createBucket: 0, updateBucket: 0 };
  const client = {
    storage: {
      getBucket: vi.fn(async (name: string) => ({
        data: getBucketResult?.data ?? null,
        error: getBucketResult?.error ?? null,
      })),
      createBucket: vi.fn(async (_name: string, _opts: { public: boolean }) => {
        calls.createBucket += 1;
        return { data: {}, error: null };
      }),
      updateBucket: vi.fn(async (_name: string, _opts: { public: boolean }) => {
        calls.updateBucket += 1;
        return { data: {}, error: null };
      }),
    },
  };
  return { client: client as unknown as SupabaseClient, calls };
}

describe("ensureBucket", () => {
  it("creates a public bucket when it does not exist", async () => {
    const { client, calls } = mockStorageClient({ error: { message: "The resource was not found" } });
    await ensureBucket(client, "catalog-images");
    expect(client.storage.createBucket).toHaveBeenCalledWith("catalog-images", { public: true });
    expect(calls.updateBucket).toBe(0);
  });

  it("leaves an existing public bucket alone", async () => {
    const { client, calls } = mockStorageClient({ data: { public: true } });
    await ensureBucket(client, "catalog-images");
    expect(calls.createBucket).toBe(0);
    expect(calls.updateBucket).toBe(0);
  });

  it("forces an existing private bucket public before upload", async () => {
    const { client, calls } = mockStorageClient({ data: { public: false } });
    await ensureBucket(client, "catalog-images");
    expect(calls.createBucket).toBe(0);
    expect(client.storage.updateBucket).toHaveBeenCalledWith("catalog-images", { public: true });
  });

  it("throws a clear error when a private bucket cannot be made public", async () => {
    const client = {
      storage: {
        getBucket: vi.fn(async () => ({ data: { public: false }, error: null })),
        createBucket: vi.fn(async () => ({ data: {}, error: null })),
        updateBucket: vi.fn(async () => ({ data: {}, error: { message: "permission denied" } })),
      },
    } as unknown as SupabaseClient;
    await expect(ensureBucket(client, "catalog-images")).rejects.toThrow(/not public/);
  });

  it("rethrows a non-missing bucket read error", async () => {
    const { client } = mockStorageClient({ error: { message: "permission denied listing buckets" } });
    await expect(ensureBucket(client, "catalog-images")).rejects.toThrow(/permission denied/);
  });
});