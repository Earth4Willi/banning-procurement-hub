import { notFound } from "next/navigation";
import { findQuoteByToken } from "@/server/quote-store";
import { QuoteDocument } from "@/components/admin/quote-document";
import { PrintButton } from "@/components/admin/print-button";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function QuotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const quote = await findQuoteByToken(token);
  if (!quote) notFound();

  return (
    <>
      <QuoteDocument
        quote={{
          reference: quote.reference,
          name: quote.name,
          phone: quote.phone,
          email: quote.email,
          area: quote.area,
          items: quote.items,
          status: quote.status,
          created_at: quote.created_at,
          valid_until: quote.valid_until,
          accepted_at: quote.accepted_at,
          paid_at: quote.paid_at,
          payment_method: quote.payment_method,
          total_amount: quote.total_amount,
        }}
      />
      <div className="mx-auto max-w-2xl px-4 pb-8">
        <PrintButton />
      </div>
    </>
  );
}
