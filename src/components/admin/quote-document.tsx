import { money, formatValidUntil } from "@/lib/quote-document";
import type { BankDetails } from "@/lib/settings-types";
import { siteConfig } from "@/lib/site";

export type { BankDetails };

export type QuoteDocumentItem = {
  label: string;
  quantity: number;
  unitPrice?: number;
};

export type QuoteDocumentQuote = {
  reference: string;
  name: string;
  phone: string;
  email: string | null;
  area: string;
  items: QuoteDocumentItem[];
  status: string;
  created_at: string;
  valid_until: string | null;
  accepted_at: string | null;
  paid_at: string | null;
  payment_method: string | null;
  total_amount: number | null;
};

function statusLabel(status: string): string {
  switch (status) {
    case "won":
      return "Accepted";
    case "lost":
      return "Declined";
    case "reviewed":
      return "Reviewed";
    default:
      return "Pending";
  }
}

export function QuoteDocument({ quote, bankDetails }: { quote: QuoteDocumentQuote; bankDetails?: BankDetails }) {
  const hasPricing = quote.items.some((item) => typeof item.unitPrice === "number");
  const showBankBlock = quote.payment_method === "bank" && bankDetails && (bankDetails.bankName || bankDetails.accountName || bankDetails.accountNumber);

  return (
    <div className="relative mx-auto max-w-2xl px-4 py-8">
      {quote.paid_at && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="-rotate-12 border-4 border-red-600/50 px-10 py-2 font-display text-5xl font-black uppercase tracking-[0.3em] text-red-600/25">
            Paid
          </span>
        </div>
      )}
      <header className="mb-8 border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-bold text-slate-900">{siteConfig.name}</h1>
        <p className="mt-1 text-sm text-slate-600">{siteConfig.address}</p>
        <p className="text-sm text-slate-600">{siteConfig.email} &middot; {siteConfig.phoneDisplay}</p>
      </header>

      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">
          {quote.paid_at ? "Receipt" : "Quotation"} {quote.reference}
        </h2>
        <span className="rounded bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
          {statusLabel(quote.status)}
        </span>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 text-sm text-slate-700">
        <div>
          <span className="font-medium">Customer:</span> {quote.name}
        </div>
        <div>
          <span className="font-medium">Phone:</span> {quote.phone}
        </div>
        {quote.email && (
          <div>
            <span className="font-medium">Email:</span> {quote.email}
          </div>
        )}
        <div>
          <span className="font-medium">Area:</span> {quote.area}
        </div>
      </div>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-slate-600">
            <th className="py-2">Item</th>
            <th className="py-2 text-right">Qty</th>
            {hasPricing && <th className="py-2 text-right">Unit Price</th>}
            {hasPricing && <th className="py-2 text-right">Line Total</th>}
          </tr>
        </thead>
        <tbody>
          {quote.items.map((item, i) => (
            <tr key={i} className="border-b border-slate-100">
              <td className="py-2 text-slate-800">{item.label}</td>
              <td className="py-2 text-right text-slate-600">{item.quantity}</td>
              {hasPricing && (
                <td className="py-2 text-right text-slate-600">
                  {typeof item.unitPrice === "number" ? money(item.unitPrice) : "—"}
                </td>
              )}
              {hasPricing && (
                <td className="py-2 text-right text-slate-800">
                  {typeof item.unitPrice === "number" ? money(item.unitPrice * item.quantity) : "—"}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {quote.total_amount != null && (
        <div className="mt-4 flex justify-end">
          <div className="w-64 text-sm">
            <div className="flex justify-between py-1 text-slate-600">
              <span>Subtotal</span>
              <span>{money(Math.round((quote.total_amount / 1.15) * 100) / 100)}</span>
            </div>
            <div className="flex justify-between py-1 text-slate-600">
              <span>VAT (15%)</span>
              <span>{money(Math.round((quote.total_amount - quote.total_amount / 1.15) * 100) / 100)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 py-1 font-semibold text-slate-900">
              <span>Total</span>
              <span>{money(quote.total_amount)}</span>
            </div>
          </div>
        </div>
      )}

      {showBankBlock && (
        <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-semibold text-slate-800">Bank Transfer</h3>
          <p className="mt-1 text-sm text-slate-600">
            Bank: {bankDetails.bankName} &middot; Account name: {bankDetails.accountName} &middot; Account number: {bankDetails.accountNumber}
          </p>
        </div>
      )}

      {quote.valid_until && (
        <p className="mt-4 text-sm text-slate-600">
          Valid until {formatValidUntil(quote.valid_until)}
        </p>
      )}

      {quote.paid_at && (
        <p className="mt-2 text-sm text-slate-600">
          Paid on {new Date(quote.paid_at).toLocaleDateString("en-GB", { dateStyle: "medium" })}
          {quote.payment_method && ` via ${quote.payment_method.replace("_", " ")}`}
        </p>
      )}
    </div>
  );
}
