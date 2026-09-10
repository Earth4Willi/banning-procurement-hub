"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Money, Plus, Trash, WhatsappLogo, X } from "@phosphor-icons/react";
import type { QuoteRow, Status } from "./helpers";
import { STATUSES, api, copyText, ctaToWhatsApp } from "./helpers";
import { buildQuoteSummary, computeTotals, formatValidUntil, money } from "@/lib/quote-document";
import { ClientQuoteDocument, type ClientQuoteDocumentQuote } from "./client-quote-document";
import type { BankDetails } from "./quote-document";

const PAYMENT_METHODS = ["cash", "mobile_money", "bank", "other"] as const;
const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  mobile_money: "Mobile money",
  bank: "Bank transfer",
  other: "Other",
};

type Props = {
  quote: QuoteRow;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  onNeedRefresh: () => void;
};

type DraftItem = { slug: string; label: string; quantity: number; price: string };

type DraftForm = { name: string; phone: string; email: string; area: string; note: string; validUntil: string };

function slugify(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const inputClass = (error?: string) =>
  `w-full rounded-[10px] border bg-surface px-3 py-2 text-sm text-ink outline-none transition-colors focus:ring-2 ${
    error ? "border-red-600 focus:border-red-600 focus:ring-red-600/40" : "border-primary/20 focus:border-primary focus:ring-accent/60"
  }`;

export function QuoteDrawer({ quote, open, onClose, onSaved, onNeedRefresh }: Props) {
  const [form, setForm] = useState<DraftForm>({ name: "", phone: "", email: "", area: "", note: "", validUntil: "" });
  const [items, setItems] = useState<DraftItem[]>([]);
  const [status, setStatus] = useState<Status>("new");
  const [paidAt, setPaidAt] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [paidBusy, setPaidBusy] = useState(false);
  const [paidOpen, setPaidOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [bankDetails, setBankDetails] = useState<BankDetails | undefined>(undefined);

  useEffect(() => {
    if (!open) return;
    setForm({
      name: quote.name,
      phone: quote.phone,
      email: quote.email ?? "",
      area: quote.area,
      note: quote.note ?? "",
      validUntil: quote.valid_until ?? "",
    });
    setItems(
      quote.items.map((item) => ({
        slug: item.slug,
        label: item.label,
        quantity: item.quantity,
        price: typeof item.unitPrice === "number" ? String(item.unitPrice) : "",
      })),
    );
    setStatus(quote.status);
    setPaidAt(quote.paid_at);
    setPaymentMethod(quote.payment_method);
    setPaidOpen(false);
    setPreviewOpen(false);
    setError(null);
    setNotice(null);
  }, [open, quote.id]);

  useEffect(() => {
    if (!open) return;
    api<{ payments: { bank: BankDetails } }>("/api/admin/settings?key=payments")
      .then((data) => setBankDetails(data.payments?.bank))
      .catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !previewOpen) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, previewOpen, onClose]);

  const updateForm = (field: keyof DraftForm, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const updateItem = (index: number, patch: Partial<DraftItem>) =>
    setItems((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const removeItem = (index: number) => setItems((rows) => rows.filter((_, i) => i !== index));

  const addItem = () => setItems((rows) => [...rows, { slug: "", label: "", quantity: 1, price: "" }]);

  const anyPriced = useMemo(() => items.some((item) => item.price !== "" && Number.isFinite(Number(item.price))), [items]);

  const docItems = useMemo(
    () =>
      items.map((item) => ({
        label: item.label,
        quantity: item.quantity,
        unitPrice: item.price !== "" && Number.isFinite(Number(item.price)) ? Number(item.price) : undefined,
      })),
    [items],
  );

  const totals = useMemo(() => computeTotals(docItems), [docItems]);

  const saveEdits = async () => {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await api<{ ok: true }>("/api/admin/quotes", {
        method: "PUT",
        body: JSON.stringify({
          id: quote.id,
          name: form.name,
          phone: form.phone,
          email: form.email,
          area: form.area,
          note: form.note,
          validUntil: form.validUntil,
          items: items.map((item) => ({
            slug: item.slug || slugify(item.label),
            label: item.label,
            quantity: item.quantity,
            ...(item.price !== "" && Number.isFinite(Number(item.price)) ? { unitPrice: Number(item.price) } : {}),
          })),
        }),
      });
      setNotice("Saved. Pricing triggers the shareable document link.");
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the quote.");
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (next: Status) => {
    if (next === status) return;
    setStatusBusy(true);
    setError(null);
    try {
      await api<{ ok: true }>("/api/admin/quotes/status", {
        method: "POST",
        body: JSON.stringify({ id: quote.id, status: next }),
      });
      setStatus(next);
      onNeedRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update status.");
    } finally {
      setStatusBusy(false);
    }
  };

  const markPaid = async (method: (typeof PAYMENT_METHODS)[number]) => {
    setPaidBusy(true);
    setError(null);
    setNotice(null);
    try {
      await api<{ ok: true }>("/api/admin/quotes/paid", {
        method: "POST",
        body: JSON.stringify({ id: quote.id, method }),
      });
      setPaidAt(new Date().toISOString());
      setPaymentMethod(method);
      setPaidOpen(false);
      setNotice(`Marked as paid via ${METHOD_LABELS[method]}. The document now shows as a receipt.`);
      onNeedRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not mark the quote as paid.");
    } finally {
      setPaidBusy(false);
    }
  };

  const copyLink = async () => {
    setError(null);
    setNotice(null);
    try {
      const data = await api<{ token: string }>(`/api/admin/quotes/token?id=${encodeURIComponent(quote.id)}`);
      if (!data.token) {
        setError("Could not mint a share link. Try saving with prices first.");
        return;
      }
      const ok = await copyText(`${window.location.origin}/quote/${data.token}`);
      if (ok) setNotice("Share link copied. It opens the live /quote page.");
      else setError("Copy blocked by the browser — copy the link manually.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create a share link.");
    }
  };

  const replyUrl = useMemo(() => {
    const text = buildQuoteSummary({
      reference: quote.reference,
      items: docItems,
      validUntil: form.validUntil || null,
      totals: anyPriced ? totals : null,
    });
    return ctaToWhatsApp(form.phone || quote.phone, text);
  }, [quote.reference, quote.phone, docItems, anyPriced, totals, form.validUntil, form.phone]);

  const previewQuote: ClientQuoteDocumentQuote = useMemo(
    () => ({
      id: quote.id,
      reference: quote.reference,
      name: form.name || quote.name,
      phone: form.phone || quote.phone,
      email: form.email ? form.email : null,
      area: form.area || quote.area,
      items: docItems,
      status,
      created_at: quote.created_at,
      valid_until: form.validUntil || null,
      accepted_at: quote.accepted_at,
      paid_at: paidAt,
      payment_method: paymentMethod,
      total_amount: anyPriced ? totals.total : null,
    }),
    [quote, form, docItems, status, paidAt, paymentMethod, anyPriced, totals],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={`Edit quote ${quote.reference}`}>
      <button
        type="button"
        aria-label="Close quote editor"
        onClick={onClose}
        className="backdrop-in absolute inset-0 z-0 w-full bg-[#0d3d1a]/40"
      />
      <div className="dialog-in absolute inset-y-0 right-0 z-10 flex w-full max-w-xl flex-col overflow-y-auto border-l border-primary/10 bg-surface shadow-2xl">
        <header className="sticky top-0 z-10 border-b border-primary/10 bg-surface/95 px-5 py-4 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-accent-dark">
                Quote editor
              </p>
              <h2 className="font-display text-lg font-semibold tracking-tight text-ink">
                {quote.reference}
                {paidAt ? <span className="ml-2 rounded bg-emerald-600/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">Paid</span> : null}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="inline-flex size-9 items-center justify-center rounded-[10px] border border-primary/10 text-ink-muted transition-colors hover:bg-surface-alt hover:text-ink"
            >
              <X weight="duotone" size={16} aria-hidden="true" />
            </button>
          </div>
          {error ? (
            <p role="alert" className="mt-3 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs font-medium text-red-700">
              {error}
            </p>
          ) : null}
          {notice ? (
            <p role="status" className="mt-3 rounded-lg border border-primary/15 bg-accent/10 px-3 py-2 text-xs font-medium text-ink">
              {notice}
            </p>
          ) : null}
        </header>

        <div className="flex-1 space-y-8 px-5 py-6">
          <section aria-label="Customer details">
            <h3 className="font-display text-sm font-semibold tracking-tight text-ink">Customer</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-medium text-ink-muted">Name</span>
                <input type="text" value={form.name} onChange={(e) => updateForm("name", e.target.value)} maxLength={80} className={`mt-1 ${inputClass()}`} />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-ink-muted">Phone</span>
                <input type="tel" value={form.phone} onChange={(e) => updateForm("phone", e.target.value)} maxLength={20} className={`mt-1 ${inputClass()}`} />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-ink-muted">Email</span>
                <input type="email" value={form.email} onChange={(e) => updateForm("email", e.target.value)} maxLength={254} className={`mt-1 ${inputClass()}`} />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-ink-muted">Delivery area</span>
                <input type="text" value={form.area} onChange={(e) => updateForm("area", e.target.value)} maxLength={120} className={`mt-1 ${inputClass()}`} />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-xs font-medium text-ink-muted">Note</span>
                <textarea value={form.note} onChange={(e) => updateForm("note", e.target.value)} rows={2} maxLength={2000} className={`mt-1 ${inputClass()}`} />
              </label>
            </div>
          </section>

          <section aria-label="Quote lines">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-semibold tracking-tight text-ink">Items</h3>
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center gap-1 rounded-[10px] border border-primary/20 px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-primary/40 hover:bg-surface-alt"
              >
                <Plus weight="duotone" size={13} aria-hidden="true" />
                Add line
              </button>
            </div>
            <div className="mt-3 space-y-3">
              {items.length === 0 ? (
                <p className="rounded-xl border border-dashed border-primary/20 p-4 text-center text-xs text-ink-muted">
                  No lines yet. Add the materials the customer asked for.
                </p>
              ) : (
                items.map((item, index) => (
                  <div key={index} className="grid grid-cols-[1fr_3.5rem_5.5rem_auto] items-end gap-2">
                    <label className="block">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-ink-muted">Item</span>
                      <input
                        type="text"
                        value={item.label}
                        onChange={(e) => updateItem(index, { label: e.target.value })}
                        maxLength={120}
                        placeholder="e.g. Ghacem Supacem 42.5R"
                        className={`mt-1 ${inputClass()}`}
                      />
                    </label>
                    <label className="block">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-ink-muted">Qty</span>
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => updateItem(index, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                        className={`mt-1 ${inputClass()}`}
                      />
                    </label>
                    <label className="block">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-ink-muted">Price GH₵</span>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={item.price}
                        onChange={(e) => updateItem(index, { price: e.target.value })}
                        placeholder="blank = unpriced"
                        className={`mt-1 ${inputClass()}`}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      aria-label={`Remove ${item.label || "line"}`}
                      className="inline-flex size-9 items-center justify-center rounded-[10px] border border-primary/10 text-ink-muted transition-colors hover:border-red-500/40 hover:text-red-700"
                    >
                      <Trash weight="duotone" size={15} aria-hidden="true" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>

          <section aria-label="Totals preview" className="rounded-2xl border border-primary/10 bg-surface-alt p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-semibold tracking-tight text-ink">Totals</h3>
              <span className="rounded-full bg-accent/20 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-accent-dark">
                Live preview
              </span>
            </div>
            {anyPriced ? (
              <dl className="mt-3 space-y-1 text-sm">
                <div className="flex justify-between text-ink-muted">
                  <dt>Subtotal</dt>
                  <dd className="font-mono text-ink">{money(totals.subtotal)}</dd>
                </div>
                <div className="flex justify-between text-ink-muted">
                  <dt>VAT (15%)</dt>
                  <dd className="font-mono text-ink">{money(totals.vat)}</dd>
                </div>
                <div className="mt-2 flex justify-between border-t border-primary/15 pt-2 font-semibold text-ink">
                  <dt>Total</dt>
                  <dd className="font-mono">{money(totals.total)}</dd>
                </div>
              </dl>
            ) : (
              <p className="mt-2 text-xs text-ink-muted">Enter at least one price to see the totals — nothing is saved until you press Save edits.</p>
            )}
          </section>

          <section aria-label="Document and status">
            <h3 className="font-display text-sm font-semibold tracking-tight text-ink">Document &amp; status</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-medium text-ink-muted">Valid until</span>
                <input type="date" value={form.validUntil} onChange={(e) => updateForm("validUntil", e.target.value)} className={`mt-1 ${inputClass()}`} />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-ink-muted">Status</span>
                <select
                  value={status}
                  disabled={statusBusy}
                  onChange={(e) => void changeStatus(e.target.value as Status)}
                  className={`mt-1 ${inputClass()}`}
                >
                  {STATUSES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={statusBusy || status === "won"}
                onClick={() => void changeStatus("won")}
                className="inline-flex items-center gap-2 rounded-[10px] bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
              >
                <Check weight="duotone" size={15} aria-hidden="true" />
                {status === "won" ? "Accepted" : "Mark accepted"}
              </button>
              {paidAt ? (
                <span className="inline-flex items-center gap-2 rounded-[10px] border border-emerald-600/30 bg-emerald-600/10 px-4 py-2 text-sm font-semibold text-emerald-700">
                  <Check weight="duotone" size={15} aria-hidden="true" />
                  Paid{paymentMethod ? ` · ${METHOD_LABELS[paymentMethod]}` : ""}
                </span>
              ) : paidOpen ? (
                <div className="inline-flex flex-wrap items-center gap-2">
                  {PAYMENT_METHODS.map((method) => (
                    <button
                      key={method}
                      type="button"
                      disabled={paidBusy}
                      onClick={() => void markPaid(method)}
                      className="inline-flex items-center gap-1.5 rounded-[10px] border border-primary/20 bg-surface px-3 py-2 text-xs font-semibold text-ink transition-colors hover:border-primary/40 hover:bg-surface-alt disabled:opacity-50"
                    >
                      <Money weight="duotone" size={14} aria-hidden="true" />
                      {METHOD_LABELS[method]}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPaidOpen(false)}
                    className="rounded-[10px] px-3 py-2 text-xs font-medium text-ink-muted hover:text-ink"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setPaidOpen(true)}
                  className="inline-flex items-center gap-2 rounded-[10px] border border-primary/20 bg-surface px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-primary/40 hover:bg-surface-alt"
                >
                  <Money weight="duotone" size={15} aria-hidden="true" />
                  Mark paid
                </button>
              )}
            </div>
          </section>
        </div>

        <footer className="no-print sticky bottom-0 z-10 border-t border-primary/10 bg-surface/95 px-5 py-4 backdrop-blur">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveEdits()}
              className="inline-flex items-center gap-2 rounded-[10px] bg-accent px-4 py-2 text-sm font-semibold text-[#0d3d1a] transition-colors hover:bg-accent-light disabled:opacity-60"
            >
              <Check weight="duotone" size={15} aria-hidden="true" />
              {saving ? "Saving…" : "Save edits"}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => setPreviewOpen(true)}
              className="inline-flex items-center gap-2 rounded-[10px] border border-primary/20 bg-surface px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-primary/40 hover:bg-surface-alt disabled:opacity-60"
            >
              <Copy weight="duotone" size={15} aria-hidden="true" />
              Preview &amp; print
            </button>
            <a
              href={replyUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-[10px] border border-primary/20 bg-surface px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-primary/40 hover:bg-surface-alt"
            >
              <WhatsappLogo weight="duotone" size={15} aria-hidden="true" />
              Reply on WhatsApp
            </a>
            <button
              type="button"
              onClick={() => void copyLink()}
              className="ml-auto inline-flex items-center gap-2 rounded-[10px] px-3 py-2 text-sm font-medium text-accent-dark transition-colors hover:text-ink"
            >
              <Copy weight="duotone" size={14} aria-hidden="true" />
              Copy link
            </button>
          </div>
        </footer>
      </div>

      {previewOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#0d3d1a]/50 p-4 sm:p-8">
          <button
            type="button"
            aria-label="Close preview"
            onClick={() => setPreviewOpen(false)}
            className="backdrop-in absolute inset-0 z-0"
          />
          <div className="dialog-in relative z-10 mb-8 w-full max-w-3xl rounded-2xl border border-primary/10 bg-white p-2 shadow-2xl sm:p-4">
            <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-3">
              <h3 className="font-display text-base font-semibold tracking-tight text-slate-900">
                {paidAt ? "Receipt preview" : "Quote document preview"}
              </h3>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                aria-label="Close preview"
                className="inline-flex size-9 items-center justify-center rounded-[10px] border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100"
              >
                <X weight="duotone" size={16} aria-hidden="true" />
              </button>
            </div>
            <ClientQuoteDocument quote={previewQuote} bankDetails={bankDetails} />
            {form.validUntil ? (
              <p className="no-print px-4 pb-2 text-center text-xs text-slate-500">Valid until {formatValidUntil(form.validUntil)} is set on the document when saved.</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}