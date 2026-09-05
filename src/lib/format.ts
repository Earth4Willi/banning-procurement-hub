import { QuoteLine } from "./whatsapp";

export function formatItemCount(count: number): string {
  return count === 1 ? "1 item" : `${count} items`;
}

export function monetaryTotal(lines: QuoteLine[]): string {
  const total = lines.reduce((sum, line) => {
    const numeral = parseFloat(line.unitPrice.replace(/[^0-9.]/g, ""));
    return sum + (Number.isFinite(numeral) ? numeral : 0) * line.qty;
  }, 0);
  const formatted = Number.isInteger(total)
    ? total.toLocaleString("en-GH")
    : total.toLocaleString("en-GH", { maximumFractionDigits: 2 });
  return `GH₵ ${formatted}`;
}
