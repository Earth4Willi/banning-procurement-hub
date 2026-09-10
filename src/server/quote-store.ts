import { randomBytes } from "node:crypto";
import { getSupabaseClient } from "./audit";
import { applyQuantityChange, findShortLines } from "./inventory";
import type { QuoteSource } from "@/lib/catalog-types";

export type QuoteStatus = "new" | "reviewed" | "won" | "lost";

export type QuoteItem = { slug: string; label: string; quantity: number; unitPrice?: number };

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
  valid_until: string | null;
  accepted_at: string | null;
  paid_at: string | null;
  payment_method: string | null;
  total_amount: number | null;
  doc_token: string | null;
  user_id: string | null;
  delivery_address: string | null;
  intended_payment_method: string | null;
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
  userId?: string | null;
  deliveryAddress?: string;
  intendedPaymentMethod?: string;
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
      user_id: input.userId ?? null,
      delivery_address: input.deliveryAddress ?? "",
      intended_payment_method: input.intendedPaymentMethod ?? "",
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
  return (data ?? []).map((row) => coerceQuote(row as Record<string, unknown>));
}

export async function updateQuote(
  id: string,
  patch: Partial<Pick<QuoteRecord, "name" | "phone" | "email" | "area" | "note" | "items" | "status" | "source"> & { validUntil?: string | null; totalAmount?: number | null; docToken?: string | null }>,
): Promise<boolean> {
  try {
    const client = getSupabaseClient();
    if (!client) return false;
    const dbPatch: Record<string, unknown> = { ...patch };
    if ("validUntil" in patch) {
      dbPatch.valid_until = patch.validUntil;
      delete dbPatch.validUntil;
    }
    if ("totalAmount" in patch) {
      dbPatch.total_amount = patch.totalAmount;
      delete dbPatch.totalAmount;
    }
    if ("docToken" in patch) {
      dbPatch.doc_token = patch.docToken;
      delete dbPatch.docToken;
    }
    const { error } = await client.from("quotes").update(dbPatch).eq("id", id);
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

function coerceQuote(row: Record<string, unknown>): QuoteRecord {
  return {
    ...row,
    user_id: row.user_id == null ? null : String(row.user_id),
    delivery_address: row.delivery_address == null ? null : String(row.delivery_address),
    intended_payment_method: row.intended_payment_method == null ? null : String(row.intended_payment_method),
    total_amount: row.total_amount == null ? null : Number(row.total_amount),
  } as unknown as QuoteRecord;
}

export async function listQuotesByUser(userId: string, limit = 100): Promise<QuoteRecord[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  const { data, error } = await client
    .from("quotes")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.warn(`[quote-store] user list failed: ${error.message}`);
    return [];
  }
  return (data ?? []).map((row) => coerceQuote(row as Record<string, unknown>));
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

export async function getQuote(id: string): Promise<QuoteRecord | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data, error } = await client.from("quotes").select("*").eq("id", id).maybeSingle();
  if (error || !data) return null;
  return coerceQuote(data as Record<string, unknown>);
}

export async function ensureQuoteToken(id: string): Promise<string | null> {
  const existing = await getQuote(id);
  if (existing?.doc_token) return existing.doc_token;
  const docToken = randomBytes(16).toString("hex");
  const ok = await updateQuote(id, { docToken });
  return ok ? docToken : null;
}

export async function setQuoteAccepted(id: string): Promise<boolean> {
  try {
    const client = getSupabaseClient();
    if (!client) return false;
    const { error } = await client
      .from("quotes")
      .update({ accepted_at: new Date().toISOString(), status: "won" })
      .eq("id", id);
    if (error) {
      console.warn(`[quote-store] accept failed: ${error.message}`);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export type AcceptResult =
  | { ok: true }
  | { ok: false; error: string; shortLines?: string[] };

/**
 * Accept a quote and deduct inventory for tracked items.
 * Returns { ok: false, error, shortLines } if any tracked product has
 * insufficient stock — no partial deductions are applied.
 */
export async function acceptQuoteWithInventory(
  id: string,
  changedBy: string = "system",
): Promise<AcceptResult> {
  const client = getSupabaseClient();
  if (!client) return { ok: false, error: "Database not available." };

  // 1. Load the quote
  const quote = await getQuote(id);
  if (!quote) return { ok: false, error: "Quote not found." };
  if (quote.status === "won") return { ok: true }; // already accepted

  // 2. Load products (raw rows include the UUID id for history) and build lookup
  const { data: productRows } = await client
    .from("products")
    .select("id, slug, name, unit, stock_quantity, track_inventory")
    .order("sort_order", { ascending: true });
  const rawProducts = productRows ?? [];

  // 3. Pre-check with the same pure rule as the quote submission route.
  //    Non-tracked items are never flagged; unknown slugs are best-effort.
  const shortages = findShortLines(
    quote.items,
    rawProducts.map((p) => ({
      slug: String(p.slug),
      name: String(p.name),
      unit: String(p.unit ?? ""),
      trackInventory: Boolean(p.track_inventory),
      stockQuantity: Number(p.stock_quantity ?? 0),
    })),
  );

  if (shortages.length > 0) {
    const shortLines = shortages.map((s) => {
      const raw = rawProducts.find((r) => String(r.slug) === s.slug);
      const unit = String(raw?.unit || "units");
      return `${s.name}: ${s.available} ${unit} available, quote needs ${s.requested}`;
    });
    return {
      ok: false,
      error: `Cannot accept: insufficient stock for ${shortLines.length} item(s).`,
      shortLines,
    };
  }

  // 4. All clear — deduct inventory and log history
  const productMap = new Map(rawProducts.map((p) => [String(p.slug), p]));
  for (const item of quote.items) {
    const product = productMap.get(item.slug);
    if (!product || !product.track_inventory) continue;
    if (item.quantity <= 0) continue;

    const previousQuantity = Number(product.stock_quantity ?? 0);
    const { newQuantity, quantityChanged } = applyQuantityChange(
      previousQuantity,
      -item.quantity,
    );

    // Update product stock
    await client
      .from("products")
      .update({ stock_quantity: newQuantity })
      .eq("slug", item.slug);

    // Write inventory history (product_id is the UUID)
    await client.from("inventory_history").insert({
      product_id: String(product.id),
      previous_quantity: previousQuantity,
      quantity_changed: quantityChanged,
      new_quantity: newQuantity,
      change_type: "order",
      reference_id: id,
      changed_by: changedBy,
    });
  }

  // 5. Mark quote as won
  const { error } = await client
    .from("quotes")
    .update({ accepted_at: new Date().toISOString(), status: "won" })
    .eq("id", id);

  if (error) {
    console.warn(`[quote-store] accept failed: ${error.message}`);
    return { ok: false, error: "Failed to update quote status." };
  }

  return { ok: true };
}

export async function setQuotePaid(id: string, method: string): Promise<boolean> {
  try {
    const client = getSupabaseClient();
    if (!client) return false;
    const { error } = await client
      .from("quotes")
      .update({ paid_at: new Date().toISOString(), payment_method: method })
      .eq("id", id);
    if (error) {
      console.warn(`[quote-store] paid failed: ${error.message}`);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function findQuoteByToken(token: string): Promise<QuoteRecord | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data, error } = await client.from("quotes").select("*").eq("doc_token", token).maybeSingle();
  if (error || !data) return null;
  return coerceQuote(data as Record<string, unknown>);
}