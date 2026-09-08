import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(input: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of input) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(input: string): Uint8Array {
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const letter of input.toUpperCase()) {
    if (letter === "=") break;
    const index = ALPHABET.indexOf(letter);
    if (index === -1) continue;
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Uint8Array.from(bytes);
}

export function generateSecret(): string {
  return base32Encode(randomBytes(20));
}

export type TotpOptions = {
  time?: number;
  stepSeconds?: number;
  digits?: number;
  digest?: "sha1" | "sha256" | "sha512";
};

export function totpCode(secretBase32: string, opts: TotpOptions = {}): string {
  const { time = Date.now(), stepSeconds = 30, digits = 6, digest = "sha1" } = opts;
  const counter = Math.floor(time / 1000 / stepSeconds);
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac(digest, base32Decode(secretBase32)).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1]! & 0x0f;
  const binary =
    (((hmac[offset]! & 0x7f) << 24) |
      ((hmac[offset + 1]! & 0xff) << 16) |
      ((hmac[offset + 2]! & 0xff) << 8) |
      (hmac[offset + 3]! & 0xff)) >>>
    0;
  return (binary % 10 ** digits).toString().padStart(digits, "0");
}

function constantTimeEqual(a: string, b: string): boolean {
  const max = Math.max(a.length, b.length);
  const bufA = Buffer.alloc(max, a, "utf8");
  const bufB = Buffer.alloc(max, b, "utf8");
  return timingSafeEqual(bufA, bufB);
}

export function verifyTotp(
  secretBase32: string,
  code: string,
  opts: TotpOptions & { window?: number } = {},
): boolean {
  const { window = 1, time, stepSeconds = 30, ...rest } = opts;
  const reference = time ?? Date.now();
  for (let i = -window; i <= window; i += 1) {
    const candidate = totpCode(secretBase32, {
      ...rest,
      stepSeconds,
      time: reference + i * stepSeconds * 1000,
    });
    if (constantTimeEqual(candidate, code)) return true;
  }
  return false;
}