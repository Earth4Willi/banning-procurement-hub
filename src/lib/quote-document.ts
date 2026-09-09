export const VAT_RATE = 0.15;

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

export function money(n: number): string {
  return `GH₵ ${n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function computeTotals(lines: { quantity: number; unitPrice?: number }[]): { subtotal: number; vat: number; total: number } {
  const subtotal = round2(lines.reduce((sum, line) => sum + (line.unitPrice ?? 0) * line.quantity, 0));
  const vat = round2(subtotal * VAT_RATE);
  return { subtotal, vat, total: round2(subtotal + vat) };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatValidUntil(dateText: string): string {
  const [y, m, d] = dateText.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export type SummaryQuote = {
  reference: string;
  items: { label: string; quantity: number; unitPrice?: number }[];
  validUntil?: string | null;
  totals: { subtotal: number; vat: number; total: number } | null;
};

export function buildQuoteSummary(q: SummaryQuote): string {
  const lines = q.items.map((item) => {
    if (typeof item.unitPrice === "number") {
      return `${item.quantity} × ${item.label} @ ${money(item.unitPrice)}`;
    }
    return `${item.quantity} × ${item.label}`;
  });
  const header = [`Quote ${q.reference}`, ...lines].join("\n");
  if (!q.totals) return header;
  const tail = [
    "",
    `Subtotal: ${money(q.totals.subtotal)}`,
    `VAT (15%): ${money(q.totals.vat)}`,
    `Total: ${money(q.totals.total)}`,
  ];
  if (q.validUntil) tail.push(`Valid until ${formatValidUntil(q.validUntil)}`);
  return `${header}\n${tail.join("\n")}`;
}
