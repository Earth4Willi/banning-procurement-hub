export type Session = {
  status: "loading" | "signed-out" | "signed-in";
  email?: string;
  avatarUrl?: string;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

export const STATUSES = ["new", "reviewed", "won", "lost"] as const;
export type Status = (typeof STATUSES)[number];

export type QuoteItem = { slug: string; label: string; quantity: number };

export type QuoteRow = {
  id: string;
  reference: string;
  name: string;
  phone: string;
  email: string | null;
  area: string;
  note: string | null;
  items: QuoteItem[];
  status: Status;
  source?: "web" | "whatsapp" | "contact";
  created_at: string;
};

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

export function formatItems(items: QuoteItem[]): string {
  return items.map((item) => `${item.label} ×${item.quantity}`).join(" · ");
}

export function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

export function buildCsv(rows: QuoteRow[], filename: string): void {
  const header = ["reference", "created_at", "status", "name", "phone", "email", "area", "items", "note"];
  const data = rows.map((quote) => [
    quote.reference,
    quote.created_at,
    quote.status,
    quote.name,
    quote.phone,
    quote.email ?? "",
    quote.area,
    formatItems(quote.items),
    quote.note ?? "",
  ]);
  const escape = (value: string) => `"${value.replaceAll('"', '""')}"`;
  const lines = [header, ...data].map((row) => row.map(escape).join(","));
  const blob = new Blob([`\uFEFF${lines.join("\r\n")}\r\n`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function statusPill(status: string): string {
  switch (status) {
    case "won":
      return "bg-emerald-600/15 text-emerald-700";
    case "reviewed":
      return "bg-sky-600/15 text-sky-700";
    case "lost":
      return "bg-rose-600/15 text-rose-700";
    default:
      return "bg-accent/20 text-accent-dark";
  }
}

export async function api<T>(url: string, init?: RequestInit): Promise<T & { error?: { message?: string } }> {
  const res = await fetch(url, {
    credentials: "same-origin",
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const data = (await res.json().catch(() => null)) as (T & { error?: { message?: string } }) | null;
  if (!res.ok) {
    throw new Error(data?.error?.message ?? `Request failed (${res.status})`);
  }
  return (data ?? {}) as T & { error?: { message?: string } };
}