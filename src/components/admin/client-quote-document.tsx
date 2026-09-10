"use client";

import { useState } from "react";
import { Copy } from "@phosphor-icons/react";
import { QuoteDocument, type BankDetails, type QuoteDocumentQuote } from "./quote-document";
import { PrintButton } from "./print-button";
import { api, copyText } from "./helpers";

export type ClientQuoteDocumentQuote = QuoteDocumentQuote & { id: string };

export function ClientQuoteDocument({ quote, bankDetails }: { quote: ClientQuoteDocumentQuote; bankDetails?: BankDetails }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copyLink = async () => {
    setError(null);
    try {
      const data = await api<{ token: string }>(`/api/admin/quotes/token?id=${encodeURIComponent(quote.id)}`);
      if (!data.token) {
        setError("Could not mint a share link. Try saving with prices first.");
        return;
      }
      const ok = await copyText(`${window.location.origin}/quote/${data.token}`);
      setCopied(ok);
      if (!ok) setError("Copy blocked by the browser — copy the link manually instead.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create a share link.");
    }
  };

  return (
    <div className="print-area">
      <QuoteDocument quote={quote} bankDetails={bankDetails} />
      <div className="no-print mt-6 flex flex-wrap items-center gap-3">
        <PrintButton />
        <button
          type="button"
          onClick={() => void copyLink()}
          className="inline-flex items-center gap-2 rounded bg-slate-100 px-6 py-2 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-200"
        >
          <Copy weight="duotone" size={15} aria-hidden="true" />
          {copied ? "Link copied" : "Copy link"}
        </button>
      </div>
      {error ? (
        <p role="alert" className="no-print mt-3 text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}