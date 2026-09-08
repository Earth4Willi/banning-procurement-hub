import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getEnv } from "./env";

let supabase: SupabaseClient | null = null;
let warned = false;

const DEFAULT_HEADERS = { "x-client-info": "bph-backend" };

export function getSupabaseClient(): SupabaseClient {
  if (supabase) return supabase;
  const env = getEnv();
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
    const { error } = await getSupabaseClient()
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