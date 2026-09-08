import { randomBytes } from "node:crypto";
import type { Redis } from "@upstash/redis";
import { getEnv } from "./env";

export type OwnerPrincipal = { id: string; role: "owner"; email: string };
export type SessionRecord = { principal: OwnerPrincipal; lastSeen: number };

export interface SessionStore {
  create(sessionId: string, record: SessionRecord, absTtlSeconds: number): Promise<void>;
  read(sessionId: string): Promise<SessionRecord | null>;
  touch(sessionId: string, lastSeen: number): Promise<void>;
  delete(sessionId: string): Promise<void>;
}

export const SESSION_COOKIE = "bph_session";

export function newSessionId(): string {
  return randomBytes(32).toString("base64url");
}

export class RedisSessionStore implements SessionStore {
  private readonly prefix: string;

  constructor(
    private readonly redis: Redis,
    opts: { prefix?: string } = {},
  ) {
    this.prefix = opts.prefix ?? "session:";
  }

  private key(sessionId: string): string {
    return `${this.prefix}${sessionId}`;
  }

  async create(sessionId: string, record: SessionRecord, absTtlSeconds: number): Promise<void> {
    await this.redis.hset(this.key(sessionId), record as unknown as Record<string, unknown>);
    await this.redis.expire(this.key(sessionId), absTtlSeconds);
  }

  async read(sessionId: string): Promise<SessionRecord | null> {
    const record = await this.redis.hgetall<SessionRecord>(this.key(sessionId));
    return record && Object.keys(record).length > 0 ? record : null;
  }

  async touch(sessionId: string, lastSeen: number): Promise<void> {
    await this.redis.hset(this.key(sessionId), { lastSeen });
  }

  async delete(sessionId: string): Promise<void> {
    await this.redis.del(this.key(sessionId));
  }
}

/**
 * Absolute expiry is enforced by the Redis TTL set once at creation. Idle
 * expiry is enforced here: reads older than the idle window delete the session.
 * Touching only slides lastSeen, it never re-arms the absolute TTL.
 */
export async function createSession(store: SessionStore, principal: OwnerPrincipal): Promise<string> {
  const sessionId = newSessionId();
  const env = getEnv();
  await store.create(sessionId, { principal, lastSeen: Date.now() }, env.SESSION_ABS_TTL_SECONDS);
  return sessionId;
}

export async function readSession(
  store: SessionStore,
  sessionId: string | null | undefined,
): Promise<OwnerPrincipal | null> {
  if (!sessionId) return null;
  const env = getEnv();
  const record = await store.read(sessionId);
  if (!record) return null;
  if (Date.now() - record.lastSeen > env.SESSION_IDLE_TTL_SECONDS * 1000) {
    await store.delete(sessionId);
    return null;
  }
  await store.touch(sessionId, Date.now());
  return record.principal;
}

export async function rotateSession(
  store: SessionStore,
  oldSessionId: string | null | undefined,
  principal: OwnerPrincipal,
): Promise<string> {
  const newId = await createSession(store, principal);
  if (oldSessionId) await store.delete(oldSessionId);
  return newId;
}

export async function revokeSession(
  store: SessionStore,
  sessionId: string | null | undefined,
): Promise<void> {
  if (sessionId) await store.delete(sessionId);
}

export type SessionCookieConfig = {
  name: string;
  value: string;
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  maxAge: number;
  path: "/";
};

export function sessionCookieConfig(sessionId: string): SessionCookieConfig {
  const env = getEnv();
  return {
    name: SESSION_COOKIE,
    value: sessionId,
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: env.SESSION_ABS_TTL_SECONDS,
    path: "/",
  };
}