import { getSupabaseClient } from "./audit";
import type { CustomerRecord } from "@/lib/catalog-types";

export type { CustomerRecord } from "@/lib/catalog-types";

const STATUS_RANK: Record<string, number> = { won: 3, reviewed: 2, new: 1, lost: 0 };

export async function upsertCustomer(phone: string, info: { name: string; email?: string }): Promise<boolean> {
  try {
    const client = getSupabaseClient();
    if (!client) return false;
    const payload: Record<string, unknown> = {
        phone,
        name: info.name,
        updated_at: new Date().toISOString(),
      };
      if (info.email) payload.email = info.email;
      const { error } = await client.from("customers").upsert(payload, { onConflict: "phone" });
    if (error) {
      console.warn(`[customer-store] upsert failed: ${error.message}`);
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[customer-store] unavailable:", error);
    return false;
  }
}

export async function countCustomers(): Promise<number> {
  const client = getSupabaseClient();
  if (!client) return 0;
  try {
    const { count } = await client
      .from("customers")
      .select("id", { count: "exact", head: true });
    return count ?? 0;
  } catch (error) {
    console.warn("[customer-store] count failed:", error);
    return 0;
  }
}

/**
 * Derived customer list: aggregates quotes and contact messages per normalized
 * phone, joined with the editable `customers` row (notes/status/name/email).
 */
export async function listCustomers(): Promise<CustomerRecord[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  try {
    const [{ data: quotes }, { data: messages }, { data: customers }] = await Promise.all([
      client.from("quotes").select("phone, source, status, created_at"),
      client.from("messages").select("phone, created_at"),
      client.from("customers").select("phone, name, email, notes, status, created_at, updated_at"),
    ]);
    if (customers === null) return [];

    const quoteGroups = new Map<string, { count: number; last: string; best: number; sources: Set<string> }>();
    for (const row of (quotes ?? []) as { phone: string; source: string | null; status: string; created_at: string }[]) {
      const group = quoteGroups.get(row.phone) ?? { count: 0, last: "", best: 0, sources: new Set<string>() };
      group.count += 1;
      if (row.created_at > group.last) group.last = row.created_at;
      const rank = STATUS_RANK[row.status] ?? 0;
      if (rank > group.best) group.best = rank;
      if (row.source) group.sources.add(row.source);
      quoteGroups.set(row.phone, group);
    }

    const messageGroups = new Map<string, { count: number; last: string }>();
    for (const row of (messages ?? []) as { phone: string; created_at: string }[]) {
      const group = messageGroups.get(row.phone) ?? { count: 0, last: "" };
      group.count += 1;
      if (row.created_at > group.last) group.last = row.created_at;
      messageGroups.set(row.phone, group);
    }

    const allPhones = new Set<string>([...quoteGroups.keys(), ...messageGroups.keys(), ...(customers ?? []).map((c) => c.phone)]);
    const records: CustomerRecord[] = [];
    for (const phone of allPhones) {
      const quotes = quoteGroups.get(phone);
      const messages = messageGroups.get(phone);
      const customer = (customers ?? []).find((c) => c.phone === phone) as
        | { name: string; email: string; notes: string; status: string; created_at: string; updated_at: string }
        | undefined;
      const sources = new Set<string>(quotes?.sources ?? []);
      if (messages) sources.add("contact");
      const lastContactAt = [quotes?.last, messages?.last].filter(Boolean).sort().pop() ?? null;
      const requestCount = (quotes?.count ?? 0) + (messages?.count ?? 0);
      const bestStatus = quotes && quotes.count > 0 ? Object.keys(STATUS_RANK).find((key) => STATUS_RANK[key] === quotes.best) ?? null : null;
      records.push({
        phone,
        name: customer?.name ?? "",
        email: customer?.email || null,
        notes: customer?.notes ?? "",
        status: customer?.status ?? "new",
        requestCount,
        lastContactAt,
        bestStatus,
        sources: [...sources],
        createdAt: customer?.created_at ?? "",
        updatedAt: customer?.updated_at ?? "",
      });
    }

    records.sort((a, b) => (b.lastContactAt ?? "").localeCompare(a.lastContactAt ?? ""));
    return records.filter((record) => record.requestCount > 0 || record.name !== "");
  } catch (error) {
    console.warn("[customer-store] list failed:", error);
    return [];
  }
}

export async function updateCustomer(
  phone: string,
  patch: { notes?: string; status?: string },
): Promise<boolean> {
  try {
    const client = getSupabaseClient();
    if (!client) return false;
    const { error } = await client
      .from("customers")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("phone", phone);
    if (error) {
      console.warn(`[customer-store] update failed: ${error.message}`);
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[customer-store] unavailable:", error);
    return false;
  }
}