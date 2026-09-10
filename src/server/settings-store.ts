import { SEED_SETTINGS, type SettingsKey, type SettingsMap } from "@/lib/settings-types";
import { getSupabaseClient } from "./audit";

/**
 * DB-first settings reads with the static `SEED_SETTINGS` as a transparent
 * fallback, mirroring the pattern in `catalog-store.ts`: the public site and
 * admin keep working whether or not the DB is configured (or the migration
 * applied yet). Rows are stored as full values under their settings key.
 */

const SETTINGS_TABLE = "site_settings";

function db(): ReturnType<typeof getSupabaseClient> {
  return getSupabaseClient();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function getSettings<K extends SettingsKey>(key: K): Promise<SettingsMap[K]> {
  const client = db();
  if (!client) return SEED_SETTINGS[key];
  try {
    const { data, error } = await client
      .from(SETTINGS_TABLE)
      .select("value")
      .eq("key", key)
      .maybeSingle();
    if (error || !data || !isRecord(data.value)) return SEED_SETTINGS[key];
    return { ...SEED_SETTINGS[key], ...data.value } as SettingsMap[K];
  } catch (error) {
    console.warn(`[settings-store] ${key} unavailable:`, error);
    return SEED_SETTINGS[key];
  }
}

export async function getPublicSiteSettings(): Promise<SettingsMap> {
  const [site, marquee, payments, delivery] = await Promise.all([
    getSettings("site"),
    getSettings("marquee"),
    getSettings("payments"),
    getSettings("delivery"),
  ]);
  return { site, marquee, payments, delivery };
}

export async function updateSettings<K extends SettingsKey>(key: K, value: SettingsMap[K]): Promise<boolean> {
  const client = db();
  if (!client) return false;
  const { error } = await client
    .from(SETTINGS_TABLE)
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) {
    console.warn(`[settings-store] update ${key} failed: ${error.message}`);
    return false;
  }
  return true;
}