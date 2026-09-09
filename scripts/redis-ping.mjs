#!/usr/bin/env node
// Verifies the Upstash REST credentials in .env.local with a PING + SET/GET.
// Run: npm run redis:ping

import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

try {
  const pong = await redis.ping();
  console.log(`✓ PING → ${pong}`);

  const key = `dvr:${Date.now()}`;
  await redis.set(key, "ok", { ex: 60 });
  const value = await redis.get(key);
  await redis.del(key);
  console.log(`✓ SET/GET ${key} → ${value}`);

  console.log("Upstash Redis is reachable and writable.");
} catch (err) {
  console.error(`✗ ${err?.message ?? err}`);
  process.exit(1);
}