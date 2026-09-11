import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseClient } from "./audit";

export type ImageValidationResult = { ok: true } | { ok: false; reason: string };

export function validateImageFile(
  file: Pick<File, "name" | "type" | "size">,
  allowedTypes: Set<string>,
  maxBytes: number,
): ImageValidationResult {
  if (!allowedTypes.has(file.type)) {
    const extensions = [...allowedTypes].map((type) => type.split("/")[1].toUpperCase());
    return { ok: false, reason: `Upload a ${extensions.join(", ")} image.` };
  }
  if (file.size > maxBytes) {
    return { ok: false, reason: `Image is too large — keep it under ${Math.round(maxBytes / 1e6)} MB.` };
  }
  return { ok: true };
}

export function storagePublicUrl(bucket: string, path: string): string {
  const raw = process.env.SUPABASE_URL ?? "";
  if (!raw) return "";
  try {
    const origin = new URL(raw).origin;
    return `${origin}/storage/v1/object/public/${bucket}/${path}`;
  } catch {
    return "";
  }
}

export async function ensureBucket(client: SupabaseClient, bucket: string): Promise<void> {
  const { data: existing, error: getError } = await client.storage.getBucket(bucket);
  if (existing) {
    // The bucket already exists. A pre-existing bucket may not be public, which
    // silently breaks the public object URL — force it public before uploading.
    if (!existing.public) {
      const { error } = await client.storage.updateBucket(bucket, { public: true });
      if (error) {
        console.warn(`[storage] bucket "${bucket}" is private and could not be made public:`, error);
        throw new Error(`The "${bucket}" storage bucket exists but is not public, and it could not be updated. Ask an admin to make it public.`);
      }
    }
    return;
  }
  if (getError && !/not found|does not exist|404/i.test(getError.message ?? "")) {
    throw getError;
  }
  const { error } = await client.storage.createBucket(bucket, { public: true });
  if (error && !/already exist/i.test(error.message)) {
    throw error;
  }
}

export type UploadInput = {
  bucket: string;
  path: string;
  name: string;
  type: string;
  size: number;
  data: Uint8Array;
  allowedTypes?: Set<string>;
  maxBytes?: number;
};

export type UploadResult = { ok: true; url: string } | { ok: false; reason: string };

export async function uploadToStorage(input: UploadInput): Promise<UploadResult> {
  const client = getSupabaseClient();
  if (!client) return { ok: false, reason: "Live storage is not configured." };
  const allowedTypes = input.allowedTypes ?? new Set(["image/jpeg", "image/png", "image/webp"]);
  const maxBytes = input.maxBytes ?? 5 * 1024 * 1024;
  const validation = validateImageFile({ name: input.name, type: input.type, size: input.size }, allowedTypes, maxBytes);
  if (!validation.ok) return validation;
  try {
    await ensureBucket(client, input.bucket);
    const { error } = await client.storage
      .from(input.bucket)
      .upload(input.path, input.data, { upsert: true, contentType: input.type });
    if (error) {
      console.warn(`[storage] upload failed (${input.bucket}/${input.path}):`, error.message);
      return { ok: false, reason: `Upload failed: ${error.message}` };
    }
    const url = storagePublicUrl(input.bucket, input.path);
    if (!url) return { ok: false, reason: "Live storage is not configured." };
    return { ok: true, url };
  } catch (error) {
    console.warn(`[storage] upload unavailable (${input.bucket}):`, error);
    return { ok: false, reason: "Storage is unavailable right now." };
  }
}