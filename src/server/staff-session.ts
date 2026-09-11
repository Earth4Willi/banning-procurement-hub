import { getEnv } from "./env";
import { createRedis } from "./redis";
import { createSession, readSession, RedisSessionStore, revokeSession, type StaffPrincipal } from "./session";

const INDEX_PREFIX = "sidx:staff:";

/**
 * Per-staff session index so an owner can see and revoke every active session
 * of a staff member. Sessions themselves live under the standard `session:`
 * keys; the index is a Redis SET of those ids whose entries mirror the staff
 * member's session TTL.
 */
export async function createStaffSession(principal: StaffPrincipal): Promise<string> {
  const redis = createRedis();
  const store = new RedisSessionStore(redis);
  const sessionId = await createSession(store, principal);
  const env = getEnv();
  await redis.sadd(indexKey(principal.id), sessionId);
  await redis.expire(indexKey(principal.id), env.SESSION_ABS_TTL_SECONDS);
  return sessionId;
}

function indexKey(staffId: string): string {
  return `${INDEX_PREFIX}${staffId}`;
}

export type StaffSessionInfo = {
  sessionId: string;
  email: string;
  name: string;
  lastSeen: number;
};

/**
 * Lists a staff member's active sessions (up to the index size). Entries whose
 * session record has already expired are skipped.
 */
export async function listStaffSessions(staffId: string): Promise<StaffSessionInfo[]> {
  const redis = createRedis();
  const store = new RedisSessionStore(redis);
  const ids = await redis.smembers(indexKey(staffId));
  const out: StaffSessionInfo[] = [];
  for (const sessionId of ids) {
    const record = await store.read(sessionId);
    const principal = record?.principal;
    if (principal && principal.role === "staff" && principal.id === staffId) {
      out.push({ sessionId, email: principal.email, name: principal.name, lastSeen: record.lastSeen });
    }
  }
  return out;
}

/** Revokes every active session of a staff member; returns how many were live. */
export async function revokeAllStaffSessions(staffId: string): Promise<number> {
  const redis = createRedis();
  const store = new RedisSessionStore(redis);
  const ids = await redis.smembers(indexKey(staffId));
  let revoked = 0;
  for (const sessionId of ids) {
    const principal = await readSession(store, sessionId);
    if (principal && principal.role === "staff" && principal.id === staffId) {
      await revokeSession(store, sessionId);
      revoked += 1;
    }
  }
  await redis.del(indexKey(staffId));
  return revoked;
}

/** Revokes one specific staff session; drops it from the index too. */
export async function revokeStaffSession(staffId: string, sessionId: string): Promise<boolean> {
  const redis = createRedis();
  const store = new RedisSessionStore(redis);
  await revokeSession(store, sessionId);
  await redis.srem(indexKey(staffId), sessionId);
  return true;
}