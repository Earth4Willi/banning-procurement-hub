const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
const AVATAR_LIMIT_BYTES = 3 * 1024 * 1024;

function validateImageClient(file: File): string | null {
  if (!AVATAR_TYPES.includes(file.type)) return "Upload a JPEG, PNG, or WebP image.";
  if (file.size > AVATAR_LIMIT_BYTES) return "Image is too large — keep it under 3 MB.";
  return null;
}

function readImageSize(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("unreadable image"));
    };
    image.src = url;
  });
}

export { AVATAR_TYPES, AVATAR_LIMIT_BYTES, validateImageClient, readImageSize };