#!/usr/bin/env node
// Automates Upstash account-tier Redis provisioning via the Developer API.
// Requires an Upstash Management API key (UPSTASH_API_KEY) and the account
// email (UPSTASH_API_EMAIL) as environment variables — neither is stored in
// .env.local or committed. Creates (or reuses, if already provisioned) a
// production Redis DB named "bph-prod" in eu-west-1 (closest major region to
// Ghana), writes the credentials into .env.local, then verifies with PING and
// a SET/GET round-trip.
//
//   $env:UPSTASH_API_KEY  = "<management api key>"
//   $env:UPSTASH_API_EMAIL= "<upstash account email>"
//   node scripts/upstash-account-provision.mjs

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ENV_FILE = join(ROOT, ".env.local");
const API_BASE = "https://api.upstash.com/v2";
const DB_NAME = "bph-prod";
const REGION = "eu-west-1";
const PLATFORM = "aws";

function authHeaders() {
  const key = process.env.UPSTASH_API_KEY;
  const email = process.env.UPSTASH_API_EMAIL;
  if (!key || !email) {
    throw new Error(
      "Set UPSTASH_API_KEY (Management API key) and UPSTASH_API_EMAIL (account email) env vars first.",
    );
  }
  const token = Buffer.from(`${email}:${key}`).toString("base64");
  return { Authorization: `Basic ${token}`, Accept: "application/json", "Content-Type": "application/json" };
}

async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers: { ...authHeaders(), ...(options.headers ?? {}) } });
  if (!res.ok) {
    throw new Error(`Upstash API ${options.method ?? "GET"} ${path} → ${res.status}: ${await res.text()}`);
  }
  if (res.status === 204) return null;
  return await res.json();
}

function extractCreds(db) {
  let restUrl = db.rest_url;
  if (!restUrl && db.endpoint) {
    restUrl = db.endpoint.includes(".") ? `https://${db.endpoint}` : `https://${db.endpoint}.upstash.io`;
  }
  const restToken = db.rest_token ?? db.token ?? "";
  if (!restUrl || !restToken) {
    throw new Error(`No REST credentials in response for ${db.database_id}:\n${JSON.stringify(db, null, 2)}`);
  }
  return { url: restUrl, token: restToken };
}

function upsertEnv(lines, key, value) {
  const i = lines.findIndex((l) => l.startsWith(`${key}=`));
  if (i >= 0) lines[i] = `${key}=${value}`;
  else lines.push(`${key}=${value}`);
}

async function ping(url, token) {
  const res = await fetch(`${url}/ping`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`PING failed (${res.status}): ${await res.text()}`);
  const body = await res.json();
  return body.result;
}

async function main() {
  console.log(`§ Looking for existing "${DB_NAME}" database …`);
  const databases = await api("/redis/databases");
  const existing = databases?.find((d) => d.database_name === DB_NAME);

  let db;
  if (existing) {
    db = existing;
    console.log(`✓ Reusing ${db.database_name} (${db.database_id}, ${db.primary_region})`);
  } else {
    console.log(`§ Creating "${DB_NAME}" (${PLATFORM}/${REGION}, free plan) …`);
    db = await api("/redis/database", {
      method: "POST",
      body: JSON.stringify({
        database_name: DB_NAME,
        platform: PLATFORM,
        primary_region: REGION,
        plan: "free",
      }),
    });
    console.log(`✓ Created ${db.database_name} (${db.database_id}, ${db.primary_region})`);
  }

  try {
    extractCreds(db);
  } catch {
    console.log(`§ Fetching credentials for ${db.database_id} …`);
    db = await api(`/redis/database/${db.database_id}`);
  }
  const creds = extractCreds(db);

  const env = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, "utf8").split(/\r?\n/) : [];
  upsertEnv(env, "UPSTASH_REDIS_REST_URL", creds.url);
  upsertEnv(env, "UPSTASH_REDIS_REST_TOKEN", creds.token);
  writeFileSync(ENV_FILE, env.join("\n").trimEnd() + "\n");

  const pong = await ping(creds.url, creds.token);
  const testKey = `provision:${Date.now()}`;
  const setRes = await fetch(`${creds.url}/set/${testKey}/ok`, {
    headers: { Authorization: `Bearer ${creds.token}` },
  });
  const getRes = await fetch(`${creds.url}/get/${testKey}`, {
    headers: { Authorization: `Bearer ${creds.token}` },
  });
  await fetch(`${creds.url}/del/${testKey}`, { headers: { Authorization: `Bearer ${creds.token}` } });
  const setBody = await setRes.json();
  const getBody = await getRes.json();

  console.log(`✓ PING → ${pong}`);
  console.log(`✓ SET/GET → ${JSON.stringify(setBody)} / ${JSON.stringify(getBody)}`);
  console.log(`✓ .env.local updated:`);
  console.log(`  UPSTASH_REDIS_REST_URL=${creds.url}`);
  console.log(`  UPSTASH_REDIS_REST_TOKEN=…${creds.token.slice(-6)}`);
}

main().catch((err) => {
  console.error(`✗ ${err.message}`);
  process.exit(1);
});