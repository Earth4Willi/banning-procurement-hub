import { readFileSync, readdirSync } from "node:fs";
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

const migrationsDir = resolve(__dirname, "..", "supabase", "migrations");
const onlyPrefix = process.argv[2];
const files = readdirSync(migrationsDir)
  .filter((name) => name.endsWith(".sql"))
  .sort()
  .filter((name) => !onlyPrefix || name.startsWith(onlyPrefix));

const tablesToCount = {
  "0001_init.sql": ["quotes", "security_events"],
  "0002_cms.sql": ["categories", "products", "messages", "customers"],
  "0003_quote_documents.sql": [],
  "0004_phase3.sql": ["users", "site_settings"],
};

try {
  await client.connect();
  for (const file of files) {
    const sql = readFileSync(resolve(migrationsDir, file), "utf8");
    await client.query(sql);
    const counts = [];
    for (const table of tablesToCount[file] ?? []) {
      const { rows } = await client.query(
        `select to_regclass('public.${table}') is not null as exists, count(*)::int as n from public.${table}`,
      );
      counts.push(`${table}=${rows[0].n}`);
    }
    if (file.startsWith("0003")) {
      const { rows } = await client.query(
        "select count(*)::int as n from information_schema.columns where table_schema = 'public' and table_name = 'quotes' and column_name = 'doc_token'",
      );
      counts.push(`quotes.doc_token=${rows[0].n}`);
    }
    console.log(`applied ${file}${counts.length ? ` (${counts.join(", ")})` : ""}`);
  }
  console.log(`Migration run complete (${files.length} file${files.length === 1 ? "" : "s"}).`);
} finally {
  await client.end();
}