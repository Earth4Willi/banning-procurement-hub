import { Redis } from "@upstash/redis";
import { getEnv } from "./env";

export function createRedis(): Redis {
  const env = getEnv();
  return new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  });
}