import { randomBytes } from "node:crypto";
import type { Redis } from "@upstash/redis";

export type PendingLogin = { email: string; ip: string; createdAt: number };

export interface PendingLoginStore {
  create(id: string, record: PendingLogin, ttlSeconds: number): Promise<void>;
  consume(id: string): Promise<PendingLogin | null>;
}

export function newPendingId(): string {
  return randomBytes(24).toString("base64url");
}

/**
 * Short-lived, one-shot backing for the second (TOTP) login step. `getdel`
 * makes consume atomic, so a pending login can be redeemed exactly once even
 * under concurrent guesses — combined with a per-IP rate limit the code step
 * cannot be replayed or brute-forced.
 */
export class RedisPendingLoginStore implements PendingLoginStore {
  private readonly prefix: string;

  constructor(
    private readonly redis: Redis,
    opts: { prefix?: string } = {},
  ) {
    this.prefix = opts.prefix ?? "login:pending:";
  }

  private key(id: string): string {
    return `${this.prefix}${id}`;
  }

  async create(id: string, record: PendingLogin, ttlSeconds: number): Promise<void> {
    await this.redis.set(this.key(id), JSON.stringify(record), { ex: ttlSeconds });
  }

  async consume(id: string): Promise<PendingLogin | null> {
    const raw = await this.redis.getdel(this.key(id));
    if (typeof raw !== "string" || raw.length === 0) return null;
    try {
      const record = JSON.parse(raw) as PendingLogin;
      return typeof record.email === "string" && typeof record.ip === "string" ? record : null;
    } catch {
      return null;
    }
  }
}