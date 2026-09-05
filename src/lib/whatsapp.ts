export type QuoteContact = { name: string; phone: string; area: string; note?: string };
export type QuoteLine = { name: string; unit: string; unitPrice: string; qty: number };

export function buildQuoteMessage(contact: QuoteContact, lines: QuoteLine[]): string {
  const parts: string[] = [];
  parts.push("Hello Banning Procurement Hub, I would like a quote.");
  parts.push(`Name: ${contact.name}`);
  parts.push(`Phone: ${contact.phone}`);
  parts.push(`Delivery area: ${contact.area}`);
  lines.forEach((line, index) => {
    parts.push(`${index + 1}. ${line.name} - ${line.qty} x ${line.unit} @ ${line.unitPrice}`);
  });
  if (contact.note && contact.note.trim()) {
    parts.push(`Note: ${contact.note.trim()}`);
  }
  return parts.join("\n");
}

export function buildWhatsAppUrl(number: string, message: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
