import { money } from "@/lib/quote-document";

export type Session = {
  status: "loading" | "signed-out" | "signed-in";
  email?: string;
  avatarUrl?: string;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

export const STATUSES = ["new", "reviewed", "won", "lost"] as const;
export type Status = (typeof STATUSES)[number];

export function inputClass(hasError: boolean): string {
  return `w-full rounded-[10px] border bg-surface px-4 py-3 text-base text-ink outline-none transition-colors focus:ring-2 ${
    hasError
      ? "border-red-600 focus:border-red-600 focus:ring-red-600/40"
      : "border-primary/20 focus:border-primary focus:ring-accent/60"
  }`;
}

export type QuoteItem = { slug: string; label: string; quantity: number; unitPrice?: number };

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
  valid_until: string | null;
  accepted_at: string | null;
  paid_at: string | null;
  payment_method: string | null;
  total_amount: number | null;
  doc_token: string | null;
};

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

export function formatItems(items: QuoteItem[]): string {
  return items
    .map((item) => {
      const line = `${item.label} ×${item.quantity}`;
      return typeof item.unitPrice === "number" ? `${line} @ ${money(item.unitPrice)}` : line;
    })
    .join(" · ");
}

export function ctaToWhatsApp(phone: string, text: string): string {
  return `https://wa.me/${phone.replace(/^0/, "233").replace(/[^0-9]/g, "")}?text=${encodeURIComponent(text)}`;
}

export async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
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