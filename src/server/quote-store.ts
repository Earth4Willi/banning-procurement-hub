import { getSupabaseClient } from "./audit";
import type { QuoteSource } from "@/lib/catalog-types";

export type QuoteStatus = "new" | "reviewed" | "won" | "lost";

export type QuoteItem = { slug: string; label: string; quantity: number };

export type QuoteRecord = {
  id: string;
  reference: string;
  name: string;
  phone: string;
  email: string | null;
  area: string;
  note: string | null;
  items: QuoteItem[];
  status: QuoteStatus;
  source: QuoteSource;
  created_at: string;
};

export type QuoteInput = {
  reference: string;
  name: string;
  phone: string;
  email?: string;
  area: string;
  note?: string;
  items: QuoteItem[];
  source?: QuoteSource;
};

export type EventRecord = {
  id: number;
  event: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export function isQuoteStoreAvailable(): boolean {
  return getSupabaseClient() !== null;
}

/**
 * Best-effort quote persistence, mirroring the audit module's contract:
 * without a live Supabase project the route still answers (202 + reference)
 * and the WhatsApp handoff still works — the store just degrades quietly.
 */
export async function persistQuote(input: QuoteInput): Promise<boolean> {
  try {
    const client = getSupabaseClient();
    if (!client) return false;
    const { error } = await client.from("quotes").insert({
      reference: input.reference,
      name: input.name,
      phone: input.phone,
      email: input.email ?? null,
      area: input.area,
      note: input.note ?? null,
      items: input.items,
      source: input.source ?? "web",
    });
    if (error) {
      console.warn(`[quote-store] insert failed: ${error.message}`);
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[quote-store] unavailable:", error);
    return false;
  }
}

export async function listQuotes(limit = 100, phone?: string): Promise<QuoteRecord[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  let query = client.from("quotes").select("*");
  if (phone) query = query.eq("phone", phone);
  const { data, error } = await query.order("created_at", { ascending: false }).limit(limit);
  if (error) {
    console.warn(`[quote-store] list failed: ${error.message}`);
    return [];
  }
  return (data ?? []) as unknown as QuoteRecord[];
}

export async function updateQuote(
  id: string,
  patch: Partial<Pick<QuoteRecord, "name" | "phone" | "email" | "area" | "note" | "items" | "status" | "source">>,
): Promise<boolean> {
  try {
    const client = getSupabaseClient();
    if (!client) return false;
    const { error } = await client.from("quotes").update(patch).eq("id", id);
    if (error) {
      console.warn(`[quote-store] update failed: ${error.message}`);
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[quote-store] unavailable:", error);
    return false;
  }
}

export async function setQuoteStatus(id: string, status: QuoteStatus): Promise<boolean> {
  try {
    const client = getSupabaseClient();
    if (!client) return false;
    const { error } = await client.from("quotes").update({ status }).eq("id", id);
    if (error) {
      console.warn(`[quote-store] update failed: ${error.message}`);
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[quote-store] unavailable:", error);
    return false;
  }
}

export async function listEvents(limit = 100): Promise<EventRecord[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  const { data, error } = await client
    .from("security_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.warn(`[quote-store] events failed: ${error.message}`);
    return [];
  }
  return (data ?? []) as unknown as EventRecord[];
}