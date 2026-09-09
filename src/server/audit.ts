import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getEnv } from "./env";

let supabase: SupabaseClient | null = null;
let warned = false;

const DEFAULT_HEADERS = { "x-client-info": "bph-backend" };

export function getSupabaseClient(): SupabaseClient | null {
  if (supabase) return supabase;
  const env = getEnv();
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    if (!warned) {
      warned = true;
      console.warn("[audit] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set; audit log skipped.");
    }
    return null;
  }
  supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: DEFAULT_HEADERS },
  });
  return supabase;
}

/**
 * Best-effort security-event log. Missing tables/projects degrade quietly with
 * a single warning so the security floor never blocks a request.
 */
export async function audit(event: string, metadata: Record<string, unknown> = {}): Promise<void> {
  try {
    const client = getSupabaseClient();
    if (!client) return;
    const { error } = await client
      .from("security_events")
      .insert({ event, metadata, created_at: new Date().toISOString() });
    if (error && !warned) {
      warned = true;
      console.warn(`[audit] insert failed: ${error.message}`);
    }
  } catch (error) {
    if (!warned) {
      warned = true;
      console.warn("[audit] unavailable:", error);
    }
  }
}

export type SecurityEventRecord = { id: number; event: string; metadata: Record<string, unknown>; created_at: string };

export async function listSecurityEvents(limit = 50): Promise<SecurityEventRecord[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  const { data, error } = await client
    .from("security_events")
    .select("id, event, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.warn(`[audit] list failed: ${error.message}`);
    return [];
  }
  return (data ?? []) as unknown as SecurityEventRecord[];
}