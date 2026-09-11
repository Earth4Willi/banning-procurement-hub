"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Minus, Plus, Trash } from "@phosphor-icons/react";
import { siteConfig } from "@/lib/site";
import { useCatalog } from "@/lib/catalog-context";
import { useQuote } from "@/lib/quote-context";
import { buildQuoteMessage, buildWhatsAppUrl } from "@/lib/whatsapp";
import type { QuoteContact } from "@/lib/whatsapp";
import { validateQuoteContact } from "@/lib/validation";
import { submitViaWeb3Forms, web3FormsConfigured } from "@/lib/forms";
import { formatItemCount, monetaryTotal } from "@/lib/format";

const EMPTY: QuoteContact = { name: "", phone: "", email: "", area: "", note: "" };
const FIELD_LABEL: Record<string, string> = {
  name: "Full name",
  phone: "Phone",
  email: "Email",
  area: "Delivery area",
  note: "Note (optional)",
};

function formatMoney(value: number): string {
  const formatted = Number.isInteger(value)
    ? value.toLocaleString("en-GH")
    : value.toLocaleString("en-GH", { maximumFractionDigits: 2 });
  return `GH₵ ${formatted}`;
}

export function QuoteBuilder() {
  const { items, count, remove, setQty, clear } = useQuote();
  const { products: catalogProducts } = useCatalog();
  const [contact, setContact] = useState<QuoteContact>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof QuoteContact, string>>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const areaRef = useRef<HTMLSelectElement>(null);

  const lines = useMemo(
    () =>
      items
        .map((item) => {
          const product = catalogProducts.find((p) => p.slug === item.productId);
          return product ? { ...item, product } : null;
        })
        .filter((line): line is NonNullable<typeof line> => line !== null),
    [items, catalogProducts]
  );

  if (count === 0) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center lg:py-24">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-accent-dark">
          Quote
        </p>
        <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink">
          Your quote is empty
        </h2>
        <p className="mx-auto mt-4 max-w-[55ch] text-base leading-relaxed text-ink-muted">
          Browse the catalogue and add materials, or message us directly on WhatsApp.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/products"
            className="inline-flex rounded-[10px] bg-accent px-7 py-3 text-sm font-semibold text-[#0d3d1a] transition-colors hover:bg-accent-light active:scale-[0.98]"
          >
            Browse Materials
          </Link>
          <a
            href={`tel:${siteConfig.phoneIntl}`}
            className="inline-flex rounded-[10px] border border-primary/20 px-7 py-3 text-sm font-semibold text-ink transition-colors hover:border-primary/40 hover:bg-surface-alt active:scale-[0.98]"
          >
            Call {siteConfig.phoneDisplay}
          </a>
        </div>
      </div>
    );
  }

  const baseLines = lines.map((l) => ({
    name: l.product.name,
    unit: l.product.unit,
    unitPrice: l.product.pricingMode === "fixed" ? l.product.unitPrice : "",
    qty: l.qty,
  }));
  const total = monetaryTotal(baseLines);

  const updateContact = (field: keyof QuoteContact, value: string) => {
    const next = { ...contact, [field]: value };
    setContact(next);
    const nextErrors = validateQuoteContact(next);
    setErrors((prev) => {
      const copy = { ...prev };
      if (field === "note") return copy;
      if (nextErrors[field as keyof typeof nextErrors]) {
        copy[field as keyof typeof nextErrors] = nextErrors[field as keyof typeof nextErrors];
      } else {
        delete copy[field as keyof typeof nextErrors];
      }
      return copy;
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateQuoteContact(contact);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      if (nextErrors.name && nameRef.current) nameRef.current.focus();
      else if (nextErrors.phone && phoneRef.current) phoneRef.current.focus();
      else if (nextErrors.email && emailRef.current) emailRef.current.focus();
      else if (nextErrors.area && areaRef.current) areaRef.current.focus();
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    setStatus("Saving your request…");

    let reference: string | null = null;
    let storageError: string | null = null;
    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          name: contact.name,
          phone: contact.phone,
          email: contact.email ?? "",
          area: contact.area,
          note: contact.note ?? "",
          items: lines.map((line) => ({
            slug: line.product.slug,
            label: line.product.name,
            quantity: line.qty,
          })),
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | { reference?: string; error?: { message?: string } }
        | null;
      if (res.ok && data?.reference) {
        reference = data.reference;
      } else if (!res.ok) {
        // A structured server rejection (e.g. stock unavailable or invalid
        // input) must NOT fall through to the WhatsApp handoff.
        storageError =
          data?.error?.message ??
          "Your request could not be saved. Check your details and try again.";
      }
    } catch {
      // Network failure — persistence is best-effort, the WhatsApp handoff still proceeds.
    } finally {
      setSubmitting(false);
    }

    if (storageError) {
      setStatus(storageError);
      return;
    }

    const message = buildQuoteMessage(contact, baseLines, reference ?? undefined);
    const url = buildWhatsAppUrl(siteConfig.whatsappNumber, message);
    let emailed = false;
    if (web3FormsConfigured()) {
      const result = await submitViaWeb3Forms({
        name: contact.name,
        phone: contact.phone,
        email: contact.email,
        area: contact.area,
        message: message,
        subject: "Quote request — Banning Procurement Hub",
      });
      emailed = result.ok;
    }
    setStatus(
      reference
        ? `Your request is saved (Ref: ${reference}). Opening WhatsApp with your message…`
        : emailed
          ? "Request sent to us by email and opened in WhatsApp."
          : "Opening WhatsApp with your request…"
    );
    window.open(url, "_blank", "noopener");
  };

  const handleCopy = async () => {
    const message = buildQuoteMessage(contact, baseLines);
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleClear = () => {
    if (window.confirm("Remove all items from your quote?")) {
      clear();
      setContact(EMPTY);
      setErrors({});
      setStatus(null);
    }
  };

  const errorText = (field: keyof QuoteContact) => errors[field] ?? undefined;
  const errorId = (field: keyof QuoteContact) => (errorText(field) ? `${field}-error` : undefined);

  const inputClass = (field: keyof QuoteContact) =>
    `w-full rounded-[10px] border bg-surface px-4 py-3 text-base text-ink outline-none transition-colors focus:ring-2 ${
      errorText(field)
        ? "border-red-600 focus:border-red-600 focus:ring-red-600/40"
        : "border-primary/20 focus:border-primary focus:ring-accent/60"
    }`;

  return (
    <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:gap-14">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
            Your quote
          </h2>
          <p className="font-mono text-xs uppercase tracking-wider text-ink-muted">
            {formatItemCount(count)} • {total}
          </p>
        </div>

        <ul className="mt-6 space-y-4">
          {lines.map((line) => {
            const isFixed = line.product.pricingMode === "fixed";
            const numeral = isFixed ? parseFloat(line.product.unitPrice.replace(/[^0-9.]/g, "")) : NaN;
            const lineTotal = Number.isFinite(numeral) ? numeral * line.qty : 0;
            const label = `Quantity of ${line.product.name}`;
            return (
              <li
                key={line.product.slug}
                className="flex flex-col gap-3 rounded-xl border border-primary/10 bg-surface-alt p-3 sm:flex-row sm:items-center sm:rounded-[16px] sm:p-4"
              >
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg sm:h-16 sm:w-16 sm:rounded-[10px]">
                  <img
                    src={line.product.image}
                    alt=""
                    width={160}
                    height={160}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-xs font-semibold uppercase tracking-wider text-accent-dark">
                    {line.product.brand}
                  </p>
                  <h3 className="truncate font-display text-base font-semibold text-ink">
                    {line.product.name}
                  </h3>
                  <p className="mt-0.5 text-sm text-ink-muted">
                    {line.product.unitPrice} <span className="text-xs">{line.product.unit}</span>
                  </p>
                </div>
                <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                  <div role="group" aria-label={label} className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label={`Decrease ${label}`}
                      onClick={() => setQty(line.product.slug, line.qty - 1)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] border border-primary/20 bg-surface text-ink transition-colors hover:border-primary/40 hover:bg-surface-alt active:scale-[0.95] sm:h-9 sm:w-9"
                    >
                      <Minus weight="duotone" size={16} aria-hidden="true" />
                    </button>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      aria-label={label}
                      value={line.qty}
                      onChange={(event) => {
                        const next = Number.parseInt(event.target.value, 10);
                        if (Number.isNaN(next)) return;
                        setQty(line.product.slug, next);
                      }}
                      className="h-8 w-12 rounded-[10px] border border-primary/20 bg-surface text-center font-mono text-sm text-ink outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-accent/60 sm:h-9 sm:w-14"
                    />
                    <button
                      type="button"
                      aria-label={`Increase ${label}`}
                      onClick={() => setQty(line.product.slug, line.qty + 1)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] border border-primary/20 bg-surface text-ink transition-colors hover:border-primary/40 hover:bg-surface-alt active:scale-[0.95] sm:h-9 sm:w-9"
                    >
                      <Plus weight="duotone" size={16} aria-hidden="true" />
                    </button>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-sm font-semibold text-ink">
                      {isFixed ? formatMoney(lineTotal) : "On request"}
                    </span>
                    <button
                      type="button"
                      aria-label={`Remove ${line.product.name}`}
                      onClick={() => remove(line.product.slug)}
                      className="inline-flex items-center gap-1.5 rounded-[10px] border border-primary/20 px-3 py-2 text-xs font-semibold text-ink-muted transition-colors hover:border-red-600/40 hover:text-red-700 active:scale-[0.95]"
                    >
                      <Trash weight="duotone" size={14} aria-hidden="true" />
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-primary/10 pt-6">
          <span className="text-sm font-medium text-ink-muted">Estimated total</span>
          <span className="font-mono text-lg font-semibold text-ink">{total}</span>
        </div>

        <div className="mt-6">
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center gap-1.5 rounded-[10px] border border-primary/20 px-4 py-2 text-sm font-semibold text-ink-muted transition-colors hover:border-red-600/40 hover:text-red-700 active:scale-[0.98]"
          >
            <Trash weight="duotone" size={14} aria-hidden="true" />
            Clear quote
          </button>
        </div>
      </div>

      <aside>
        <form onSubmit={handleSubmit} className="rounded-[16px] border border-primary/10 bg-surface-alt p-6" noValidate>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
            Your details
          </h2>
          <p className="mt-2 text-sm text-ink-muted">
            We confirm pricing and delivery within 24 hours.
          </p>

          <div className="mt-6 space-y-5">
            <div>
              <label htmlFor="name" className="text-sm font-medium text-ink">
                {FIELD_LABEL.name}
                <span className="text-accent-dark"> *</span>
              </label>
              <input
                ref={nameRef}
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                maxLength={80}
                value={contact.name}
                onChange={(event) => updateContact("name", event.target.value)}
                aria-required="true"
                aria-describedby={errorId("name")}
                aria-invalid={errorText("name") ? true : undefined}
                className={`mt-2 ${inputClass("name")}`}
              />
              {errorText("name") ? (
                <p id="name-error" role="alert" className="mt-2 text-sm text-red-700">
                  {errorText("name")}
                </p>
              ) : null}
            </div>

            <div>
              <label htmlFor="phone" className="text-sm font-medium text-ink">
                {FIELD_LABEL.phone}
                <span className="text-accent-dark"> *</span>
              </label>
              <input
                ref={phoneRef}
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                value={contact.phone}
                onChange={(event) => updateContact("phone", event.target.value)}
                aria-required="true"
                aria-describedby={errorId("phone") ?? "phone-helper"}
                aria-invalid={errorText("phone") ? true : undefined}
                placeholder="055 885 0667"
                className={`mt-2 ${inputClass("phone")}`}
              />
              {!errorText("phone") ? (
                <p id="phone-helper" className="mt-2 text-xs text-ink-muted">
                  Use 0XX or +233.
                </p>
              ) : null}
              {errorText("phone") ? (
                <p id="phone-error" role="alert" className="mt-2 text-sm text-red-700">
                  {errorText("phone")}
                </p>
              ) : null}
            </div>

            <div>
              <label htmlFor="email" className="text-sm font-medium text-ink">
                {FIELD_LABEL.email}
                <span className="text-ink-muted"> (optional)</span>
              </label>
              <input
                ref={emailRef}
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={contact.email ?? ""}
                onChange={(event) => updateContact("email", event.target.value)}
                aria-describedby={errorId("email")}
                aria-invalid={errorText("email") ? true : undefined}
                className={`mt-2 ${inputClass("email")}`}
              />
              {errorText("email") ? (
                <p id="email-error" role="alert" className="mt-2 text-sm text-red-700">
                  {errorText("email")}
                </p>
              ) : null}
            </div>

            <div>
              <label htmlFor="area" className="text-sm font-medium text-ink">
                {FIELD_LABEL.area}
                <span className="text-accent-dark"> *</span>
              </label>
              <select
                ref={areaRef}
                id="area"
                name="area"
                value={contact.area}
                onChange={(event) => updateContact("area", event.target.value)}
                aria-required="true"
                aria-describedby={errorId("area")}
                aria-invalid={errorText("area") ? true : undefined}
                className={`mt-2 ${inputClass("area")}`}
              >
                <option value="" disabled>
                  Select your area…
                </option>
                {siteConfig.deliveryAreas.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
              {errorText("area") ? (
                <p id="area-error" role="alert" className="mt-2 text-sm text-red-700">
                  {errorText("area")}
                </p>
              ) : null}
            </div>

            <div>
              <label htmlFor="note" className="text-sm font-medium text-ink">
                {FIELD_LABEL.note}
              </label>
              <textarea
                id="note"
                name="note"
                rows={4}
                maxLength={500}
                value={contact.note ?? ""}
                onChange={(event) => updateContact("note", event.target.value)}
                className={inputClass("note")}
              />
              <p className="mt-2 text-xs text-ink-muted">
                Optional. Add delivery dates, site notes or anything else we should know.
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-[10px] bg-accent px-6 py-3 text-sm font-semibold text-[#0d3d1a] transition-colors hover:bg-accent-light active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
          >
            {submitting ? "Sending…" : "Send request"}
          </button>

          {status ? (
            <p role="status" aria-live="polite" className="mt-4 text-center text-sm font-medium text-primary-700">
              {status}
            </p>
          ) : null}

          <div className="mt-6 rounded-[10px] border border-primary/10 bg-surface p-4">
            <p className="font-mono text-xs font-semibold uppercase tracking-wider text-accent-dark">
              Review before sending
            </p>
            <p className="mt-2 text-xs text-ink-muted">
              The estimated total covers fixed-price items only. Quote-only items are priced on
              request.
            </p>
            <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-[10px] bg-surface-alt p-3 font-mono text-xs leading-relaxed text-ink-muted">
              {buildQuoteMessage(contact, baseLines)}
            </pre>
            <button
              type="button"
              onClick={handleCopy}
              className="mt-3 inline-flex rounded-[10px] border border-primary/20 px-4 py-2 text-xs font-semibold text-ink transition-colors hover:border-primary/40 hover:bg-surface-alt active:scale-[0.98]"
            >
              {copied ? "Copied" : "Copy message"}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
