/* eslint-disable no-console */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv(file) {
  const out = {};
  if (!existsSync(file)) return out;
  for (const line of readFileSync(file, "utf-8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) {
      let v = m[2];
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      out[m[1]] = v;
    }
  }
  return out;
}

const env = { ...loadEnv(resolve(".env.production")), ...loadEnv(resolve(".env.local")) };
const url = env.SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;
if (!url || !key) {
  console.log("NO_CREDENTIALS");
  process.exit(2);
}
const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

const [messages, customers, quotes] = await Promise.all([
  sb.from("messages").select("*").order("created_at", { ascending: true }),
  sb.from("customers").select("*").order("created_at", { ascending: true }),
  sb.from("quotes").select("id, customer_name, name, phone, created_at, status").order("created_at", { ascending: true }),
]);

console.log("=== HOST ===");
console.log(url);
console.log("=== MESSAGES (count:" + (messages.data?.length ?? 0) + ") ===");
for (const r of messages.data ?? []) {
  console.log(JSON.stringify({ id: r.id, created_at: r.created_at, name: r.name, phone: r.phone, email: r.email, area: r.area, message: (r.message ?? "").slice(0, 80) }));
}
console.log("=== CUSTOMERS (count:" + (customers.data?.length ?? 0) + ") ===");
for (const r of customers.data ?? []) {
  console.log(JSON.stringify({ phone: r.phone, name: r.name, email: r.email, status: r.status, notes: (r.notes ?? "").slice(0, 80), created_at: r.created_at }));
}
console.log("=== QUOTES (count:" + (quotes.data?.length ?? 0) + ") ===");
for (const r of quotes.data ?? []) {
  console.log(JSON.stringify({ id: r.id, name: r.customer_name ?? r.name, phone: r.phone, status: r.status, created_at: r.created_at }));
}
console.log("=== ERRORS ===");
if (messages.error) console.log("messages err:", messages.error.message);
if (customers.error) console.log("customers err:", customers.error.message);
if (quotes.error) console.log("quotes err:", quotes.error.message);