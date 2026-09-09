import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectUrl = process.env.SUPABASE_URL;
const dbPassword = process.env.SUPABASE_DB_PASSWORD;

if (!projectUrl) {
  console.error("SUPABASE_URL is required (from .env.local).");
  process.exit(1);
}
if (!dbPassword) {
  console.error("SUPABASE_DB_PASSWORD is required (the postgres password set at project creation).");
  process.exit(1);
}

const { hostname } = new URL(projectUrl);
const dbHost = `db.${hostname}`;

const client = new pg.Client({
  host: dbHost,
  port: 5432,
  database: "postgres",
  user: "postgres",
  password: dbPassword,
  ssl: { rejectUnauthorized: false },
});

const migrationPath = resolve(__dirname, "..", "supabase", "migrations", "0001_init.sql");
const sql = readFileSync(migrationPath, "utf8");

try {
  await client.connect();
  await client.query(sql);
  const quotes = await client.query("select count(*)::int as n from public.quotes");
  const events = await client.query("select count(*)::int as n from public.security_events");
  console.log(
    `Migration applied. quotes=${quotes.rows[0].n} security_events=${events.rows[0].n}`,
  );
} finally {
  await client.end();
}