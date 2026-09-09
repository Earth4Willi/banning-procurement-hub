import { storagePublicUrl, uploadToStorage } from "./storage";

export const PROFILE_BUCKET = "profile-images";
export const PROFILE_OBJECT = "owner/avatar";
export const MAX_AVATAR_BYTES = 3 * 1024 * 1024;
export const MIN_AVATAR_DIMENSION = 300;
export const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const ALLOWED_AVATAR_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];

/**
 * Deterministic public URL of the owner avatar. The object lives at a fixed
 * path in a public bucket, so no metadata table is needed: re-uploading
 * overwrites it and every device resolves the same URL.
 */
export function avatarPublicUrl(): string | null {
  const url = storagePublicUrl(PROFILE_BUCKET, PROFILE_OBJECT);
  return url || null;
}

export type UploadableImage = {
  name: string;
  type: string;
  size: number;
  data: Uint8Array;
};

export type UploadResult = { ok: true; url: string } | { ok: false; reason: string };

export function validateAvatarFile(file: { name: string; type: string; size: number }): string | null {
  if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
    return "Upload a JPEG, PNG, or WebP image.";
  }
  if (file.size === 0) {
    return "The uploaded file is empty.";
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return "Image is too large — keep it under 3 MB.";
  }
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext && !ALLOWED_AVATAR_EXTENSIONS.includes(ext)) {
    return "Upload a JPEG, PNG, or WebP image.";
  }
  return null;
}

export async function uploadProfileImage(file: UploadableImage): Promise<UploadResult> {
  const invalid = validateAvatarFile(file);
  if (invalid) return { ok: false, reason: invalid };
  return uploadToStorage({
    bucket: PROFILE_BUCKET,
    path: PROFILE_OBJECT,
    name: file.name,
    type: file.type,
    size: file.size,
    data: file.data,
    allowedTypes: new Set(ALLOWED_AVATAR_TYPES),
    maxBytes: MAX_AVATAR_BYTES,
  });
}