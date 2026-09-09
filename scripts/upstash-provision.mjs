#!/usr/bin/env node
// Automates Upstash Redis provisioning via Upstash's /start-redis endpoint.
// Creates a free, temporary DB (no account required), writes the credentials
// into .env.local, then pings to verify. The DB expires in ~3 days unless it
// is claimed in the Upstash console (URL is printed here).

import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const STATE_FILE = join(ROOT, ".upstash-provision.json");
const ENV_FILE = join(ROOT, ".env.local");
const AGENT = "opencode";

function loadState() {
  if (existsSync(STATE_FILE)) return JSON.parse(readFileSync(STATE_FILE, "utf8"));
  return {};
}

function saveState(state) {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

async function requestCredentials(id) {
  const res = await fetch("https://upstash.com/start-redis", {
    method: "POST",
    headers: { "Idempotency-Key": id, "User-Agent": AGENT, Accept: "text/markdown" },
  });
  if (!res.ok) {
    throw new Error(`Upstash /start-redis returned ${res.status}: ${await res.text()}`);
  }
  return await res.text();
}

function parseCredentials(markdown) {
  const text = markdown;
  const urlMatch = text.match(/https:\/\/[\w-]+\.upstash\.io/);
  const endpointMatch = text.match(/UPSTASH_REDIS_REST_URL=([\S]+)/);
  const tokenMatch = text.match(/UPSTASH_REDIS_REST_TOKEN=([\S]+)/);
  const consoleMatch =
    text.match(/https:\/\/upstash\.com\/start-redis\/console\/[\w-]+/) ??
    text.match(/https:\/\/console\.upstash\.com\/[\w/\-?=&]+/);
  const expiryMatch = text.match(/(?:expires?|expiry)[^\n]*?(date)?[:\s]*([\d-]+T[\d:.]+Z|\d{4}-\d{2}-\d{2})/i);

  let url = endpointMatch ? endpointMatch[1] : urlMatch ? urlMatch[0] : "";
  let token = tokenMatch ? tokenMatch[1] : "";

  // Fallback: a bare token is a long alphanumeric string in a code block.
  if (!token) {
    const fallback = text.match(/(?:Token|token|KEY)[^\n]*?([A-Za-z0-9_-]{32,})/);
    if (fallback) token = fallback[1];
  }

  if (!url || !token) {
    throw new Error(`Could not parse credentials from Upstash response:\n\n${markdown}`);
  }

  return {
    url,
    token,
    consoleUrl: consoleMatch ? consoleMatch[0] : "",
    expiry: expiryMatch ? expiryMatch[2] : "unknown",
  };
}

function upsertEnv(lines, key, value) {
  const i = lines.findIndex((l) => l.startsWith(`${key}=`));
  if (i >= 0) lines[i] = `${key}=${value}`;
  else lines.push(`${key}=${value}`);
}

async function ping(url, token) {
  const res = await fetch(`${url}/ping`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`PING failed (${res.status}): ${await res.text()}`);
  const body = await res.json();
  return body.result;
}

async function main() {
  const state = loadState();
  if (!state.id) {
    state.id = randomUUID();
    saveState(state);
    console.log(`§ Provisioning new Upstash database (${state.id}) …`);
  } else {
    console.log(`§ Re-fetching credentials for database ${state.id} …`);
  }

  const markdown = await requestCredentials(state.id);
  const creds = parseCredentials(markdown);
  state.url = creds.url;
  state.token = creds.token;
  saveState(state);

  const env = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, "utf8").split(/\r?\n/) : [];
  upsertEnv(env, "UPSTASH_REDIS_REST_URL", creds.url);
  upsertEnv(env, "UPSTASH_REDIS_REST_TOKEN", creds.token);
  writeFileSync(ENV_FILE, env.join("\n").trimEnd() + "\n");

  const pong = await ping(creds.url, creds.token);
  console.log(`✓ PING → ${pong}`);
  console.log(`✓ .env.local updated:`);
  console.log(`  UPSTASH_REDIS_REST_URL=${creds.url}`);
  console.log(`  UPSTASH_REDIS_REST_TOKEN=…${creds.token.slice(-6)}`);
  console.log(`⏳ Expires ~${creds.expiry} (3 days) unless claimed.`);
  if (creds.consoleUrl) {
    console.log(`✅ OPEN THIS URL AND CLICK "CLAIM" TO KEEP THE DATABASE FOREVER:\n  ${creds.consoleUrl}`);
  }
}

main().catch((err) => {
  console.error(`✗ ${err.message}`);
  process.exit(1);
});