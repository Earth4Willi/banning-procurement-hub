import { randomBytes } from "node:crypto";
import type { Redis } from "@upstash/redis";

export type PendingLogin = {
  email: string;
  ip: string;
  createdAt: number;
  /** Owner when absent (legacy records + owner path); "staff" for staff logins. */
  kind?: "owner" | "staff";
  staffId?: string;
};

export interface PendingLoginStore {
  create(id: string, record: PendingLogin, ttlSeconds: number): Promise<void>;
  consume(id: string): Promise<PendingLogin | null>;
  /** Non-destructive peek, used by the verify route to pick owner vs staff flow. */
  peek(id: string): Promise<PendingLogin | null>;
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
    return this.parse(raw);
  }

  async peek(id: string): Promise<PendingLogin | null> {
    const raw = await this.redis.get(this.key(id));
    return this.parse(raw);
  }

  private parse(raw: unknown): PendingLogin | null {
    if (raw === null || raw === undefined) return null;
    let record: PendingLogin;
    if (typeof raw === "string") {
      if (raw.length === 0) return null;
      try {
        record = JSON.parse(raw) as PendingLogin;
      } catch {
        return null;
      }
    } else {
      record = raw as PendingLogin;
    }
    return typeof record.email === "string" && typeof record.ip === "string" ? record : null;
  }
}