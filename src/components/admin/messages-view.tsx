"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Check,
  ClipboardText,
  DownloadSimple,
  EnvelopeSimple,
  PencilSimple,
  Trash,
  WhatsappLogo,
  X,
} from "@phosphor-icons/react";
import type { MessageRecord } from "@/lib/catalog-types";
import { siteConfig } from "@/lib/site";
import type { QuoteContact } from "@/lib/validation";
import { validateQuoteContact } from "@/lib/validation";
import { buildQuoteSummary, computeTotals } from "@/lib/quote-document";
import type { QuoteRow, Session, Status } from "./helpers";
import { STATUSES, api, buildCsv, ctaToWhatsApp, formatDate, formatItems, statusPill, truncate } from "./helpers";
import { QuoteDrawer } from "./quote-drawer";

type MessagesTab = "quotes" | "contact";

const MANUAL_EMPTY: QuoteContact = { name: "", phone: "", email: "", area: "", note: "" };

export function MessagesView(props: { session: Session; tab: MessagesTab; onNeedRefresh: () => void }) {
  const { session, tab, onNeedRefresh } = props;
  const router = useRouter();
  const pathname = usePathname();

  const [active, setActive] = useState<MessagesTab>(tab);
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quotesBusyId, setQuotesBusyId] = useState<string | null>(null);
  const [messagesBusyId, setMessagesBusyId] = useState<string | null>(null);

  const [drawerQuote, setDrawerQuote] = useState<QuoteRow | null>(null);

  const [manualOpen, setManualOpen] = useState(false);
  const [manual, setManual] = useState<QuoteContact>(MANUAL_EMPTY);
  const [manualErrors, setManualErrors] = useState<Partial<Record<keyof QuoteContact, string>>>({});
  const [manualBusy, setManualBusy] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState("");

  useEffect(() => {
    setActive(tab);
  }, [tab]);

  const loadQuotes = useCallback(async () => {
    try {
      const data = await api<{ quotes: QuoteRow[] }>("/api/admin/quotes");
      setQuotes(data.quotes);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load quotes.");
    }
  }, []);

  const loadMessages = useCallback(async () => {
    try {
      const data = await api<{ messages: MessageRecord[] }>("/api/admin/messages");
      setMessages(data.messages);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load messages.");
    }
  }, []);

  useEffect(() => {
    if (session.status !== "signed-in") return;
    setLoading(true);
    void Promise.all([loadQuotes(), loadMessages()]).finally(() => setLoading(false));
  }, [session.status, loadQuotes, loadMessages]);

  const switchTab = (next: MessagesTab) => {
    setActive(next);
    const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    params.set("tab", next);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const newCount = useMemo(() => quotes.filter((quote) => quote.status === "new").length, [quotes]);
  const unreadCount = useMemo(() => messages.filter((message) => !message.read).length, [messages]);

  const refreshActive = useCallback(() => {
    void (active === "quotes" ? loadQuotes() : loadMessages());
  }, [active, loadQuotes, loadMessages]);

  const changeQuoteStatus = useCallback(
    async (quote: QuoteRow, next: Status) => {
      if (next === quote.status) return;
      setQuotesBusyId(quote.id);
      try {
        await api<{ ok: true }>("/api/admin/quotes/status", {
          method: "POST",
          body: JSON.stringify({ id: quote.id, status: next }),
        });
        setQuotes((rows) => rows.map((row) => (row.id === quote.id ? { ...row, status: next } : row)));
        onNeedRefresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not update status.");
      } finally {
        setQuotesBusyId(null);
      }
    },
    [onNeedRefresh],
  );

  const manualInput = (field: keyof QuoteContact) =>
    `w-full rounded-[10px] border bg-surface px-3 py-2 text-sm text-ink outline-none transition-colors focus:ring-2 ${
      manualErrors[field]
        ? "border-red-600 focus:border-red-600 focus:ring-red-600/40"
        : "border-primary/20 focus:border-primary focus:ring-accent/60"
    }`;

  const updateManual = (field: keyof QuoteContact, value: string) => {
    const next = { ...manual, [field]: value };
    setManual(next);
    setManualErrors((prev) => {
      const copy = { ...prev };
      if (field === "note") return copy;
      const fieldError = validateQuoteContact(next)[field];
      if (fieldError) copy[field] = fieldError;
      else delete copy[field];
      return copy;
    });
  };

  const handleManualSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors = validateQuoteContact(manual);
    setManualErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setManualBusy(true);
    setManualError(null);
    try {
      const res = await fetch("/api/admin/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          name: manual.name,
          phone: manual.phone,
          email: manual.email ?? "",
          area: manual.area,
          note: manual.note ?? "",
        }),
      });
      const data = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      if (!res.ok) {
        setManualError(data?.error?.message ?? "Could not save the quote.");
        return;
      }
      setManual(MANUAL_EMPTY);
      setManualErrors({});
      setManualOpen(false);
      void loadQuotes();
      onNeedRefresh();
    } catch {
      setManualError("Could not save the quote.");
    } finally {
      setManualBusy(false);
    }
  };

  const toggleRead = async (message: MessageRecord) => {
    setMessagesBusyId(message.id);
    try {
      await api<{ ok: true }>("/api/admin/messages", {
        method: "PUT",
        body: JSON.stringify({ id: message.id, read: !message.read }),
      });
      setMessages((rows) => rows.map((row) => (row.id === message.id ? { ...row, read: !message.read } : row)));
      onNeedRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the message.");
    } finally {
      setMessagesBusyId(null);
    }
  };

  const markAllRead = async () => {
    const unread = messages.filter((message) => !message.read);
    if (unread.length === 0) return;
    try {
      await Promise.all(
        unread.map((message) =>
          api<{ ok: true }>("/api/admin/messages", {
            method: "PUT",
            body: JSON.stringify({ id: message.id, read: true }),
          }),
        ),
      );
      setMessages((rows) => rows.map((row) => ({ ...row, read: true })));
      onNeedRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not mark messages as read.");
    }
  };

  const startEdit = (message: MessageRecord) => {
    setEditingId(message.id);
    setEditingDraft(message.message);
  };

  const saveEdit = async (id: string) => {
    try {
      await api<{ ok: true }>("/api/admin/messages", {
        method: "PUT",
        body: JSON.stringify({ id, message: editingDraft }),
      });
      setMessages((rows) => rows.map((row) => (row.id === id ? { ...row, message: editingDraft } : row)));
      setEditingId(null);
      onNeedRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the message.");
    }
  };

  const removeMessage = async (message: MessageRecord) => {
    if (!window.confirm(`Delete the message from ${message.name}?`)) return;
    setMessagesBusyId(message.id);
    try {
      await api<{ ok: true }>("/api/admin/messages", {
        method: "DELETE",
        body: JSON.stringify({ id: message.id }),
      });
      setMessages((rows) => rows.filter((row) => row.id !== message.id));
      onNeedRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the message.");
    } finally {
      setMessagesBusyId(null);
    }
  };

  const quotesCsv = () => {
    if (quotes.length === 0) return;
    buildCsv(quotes, "bph-quotes.csv");
  };

  const waSummary = useCallback((quote: QuoteRow) => {
    const priced = quote.items.some((item) => typeof item.unitPrice === "number");
    return buildQuoteSummary({
      reference: quote.reference,
      items: quote.items,
      validUntil: quote.valid_until,
      totals: priced ? computeTotals(quote.items) : null,
    });
  }, []);

  if (session.status === "loading") {
    return <p className="text-sm text-ink-muted">Checking session…</p>;
  }

  if (session.status !== "signed-in") {
    return (
      <p className="text-sm text-ink-muted">Sign in to review quotes and messages.</p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">Messages</h2>
          <p className="mt-1 text-sm text-ink-muted">Quote requests and contact messages from your site.</p>
        </div>
        <div className="flex rounded-[10px] border border-primary/10 bg-surface p-1" role="tablist" aria-label="Messages sections">
          {(
            [
              { key: "quotes", label: `Quotes${newCount > 0 ? ` (${newCount} new)` : ""}` },
              { key: "contact", label: `Contact${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}` },
            ] as { key: MessagesTab; label: string }[]
          ).map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={active === item.key}
              onClick={() => switchTab(item.key)}
              className={`rounded-[8px] px-3 py-1.5 text-sm font-semibold transition-colors ${
                active === item.key ? "bg-[#0d3d1a] text-white" : "text-ink-muted hover:text-ink"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-700" role="alert">
          {error}
        </div>
      ) : null}

      {active === "quotes" ? (
        <section aria-label="Quote inbox" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setManualOpen((open) => !open)}
                aria-expanded={manualOpen}
                className="inline-flex items-center gap-1.5 rounded-[10px] border border-primary/20 bg-surface px-3 py-2 text-xs font-semibold text-ink transition-colors hover:border-primary/40 hover:bg-surface-alt"
              >
                {manualOpen ? <X weight="duotone" size={14} aria-hidden="true" /> : <ClipboardText weight="duotone" size={14} aria-hidden="true" />}
                {manualOpen ? "Close" : "Add a WhatsApp quote"}
              </button>
              <button
                type="button"
                onClick={quotesCsv}
                disabled={quotes.length === 0}
                className="inline-flex items-center gap-1.5 rounded-[10px] border border-primary/20 bg-surface px-3 py-2 text-xs font-semibold text-ink transition-colors hover:border-primary/40 hover:bg-surface-alt disabled:opacity-50"
              >
                <DownloadSimple weight="duotone" size={14} aria-hidden="true" />
                Export CSV {quotes.length > 0 ? `(${quotes.length})` : ""}
              </button>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/10 bg-surface px-3 py-1.5 font-mono text-xs font-semibold uppercase tracking-wider text-ink-muted">
              <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
              {newCount} new
            </span>
          </div>

          {manualOpen ? (
            <div className="rounded-2xl border border-primary/10 bg-surface p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-display text-lg font-semibold tracking-tight text-ink">Add a WhatsApp quote</h3>
                  <p className="mt-1 text-sm text-ink-muted">
                    For messages you received directly on WhatsApp. The quote is saved to your inbox.
                  </p>
                </div>
                <span className="rounded-[8px] bg-accent/15 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-accent-dark">
                  Direct chat
                </span>
              </div>
              <form onSubmit={(event) => void handleManualSubmit(event)} className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" noValidate>
                <div>
                  <label htmlFor="manual-name" className="text-sm font-medium text-ink">
                    Full name <span className="text-accent-dark">*</span>
                  </label>
                  <input
                    id="manual-name"
                    type="text"
                    autoComplete="name"
                    maxLength={80}
                    value={manual.name}
                    onChange={(event) => updateManual("name", event.target.value)}
                    aria-invalid={manualErrors.name ? true : undefined}
                    className={`mt-2 ${manualInput("name")}`}
                  />
                  {manualErrors.name ? (
                    <p role="alert" className="mt-1 text-xs text-red-700">
                      {manualErrors.name}
                    </p>
                  ) : null}
                </div>
                <div>
                  <label htmlFor="manual-phone" className="text-sm font-medium text-ink">
                    Phone <span className="text-accent-dark">*</span>
                  </label>
                  <input
                    id="manual-phone"
                    type="tel"
                    autoComplete="tel"
                    value={manual.phone}
                    onChange={(event) => updateManual("phone", event.target.value)}
                    placeholder="055 885 0667"
                    aria-invalid={manualErrors.phone ? true : undefined}
                    className={`mt-2 ${manualInput("phone")}`}
                  />
                  {manualErrors.phone ? (
                    <p role="alert" className="mt-1 text-xs text-red-700">
                      {manualErrors.phone}
                    </p>
                  ) : null}
                </div>
                <div>
                  <label htmlFor="manual-area" className="text-sm font-medium text-ink">
                    Delivery area <span className="text-accent-dark">*</span>
                  </label>
                  <select
                    id="manual-area"
                    value={manual.area}
                    onChange={(event) => updateManual("area", event.target.value)}
                    aria-invalid={manualErrors.area ? true : undefined}
                    className={`mt-2 ${manualInput("area")}`}
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
                  {manualErrors.area ? (
                    <p role="alert" className="mt-1 text-xs text-red-700">
                      {manualErrors.area}
                    </p>
                  ) : null}
                </div>
                <div>
                  <label htmlFor="manual-note" className="text-sm font-medium text-ink">
                    What they asked for
                  </label>
                  <textarea
                    id="manual-note"
                    rows={1}
                    maxLength={2000}
                    value={manual.note ?? ""}
                    onChange={(event) => updateManual("note", event.target.value)}
                    className={`mt-2 ${manualInput("note")}`}
                  />
                </div>
                <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-4">
                  <button
                    type="submit"
                    disabled={manualBusy}
                    className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-accent px-5 py-2 text-sm font-semibold text-[#0d3d1a] transition-colors hover:bg-accent-light disabled:opacity-60"
                  >
                    <ClipboardText weight="duotone" size={14} aria-hidden="true" />
                    {manualBusy ? "Saving…" : "Save quote"}
                  </button>
                  {manualError ? (
                    <p role="alert" className="text-sm font-medium text-red-700">
                      {manualError}
                    </p>
                  ) : null}
                </div>
              </form>
            </div>
          ) : null}

          {loading ? (
            <p className="text-sm text-ink-muted">Loading quotes…</p>
          ) : quotes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-primary/20 bg-surface p-10 text-center text-sm text-ink-muted">
              No quotes yet. Quote requests land here the moment they come in — or add one above.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-primary/10 bg-surface">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead>
                  <tr className="border-b border-primary/10 text-xs uppercase tracking-wider text-ink-muted">
                    <th className="px-4 py-3 font-medium">Reference</th>
                    <th className="px-4 py-3 font-medium">Customer</th>
                    <th className="px-4 py-3 font-medium">Area</th>
                    <th className="px-4 py-3 font-medium">Received</th>
                    <th className="px-4 py-3 font-medium">Items</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary/10">
                  {quotes.map((quote) => (
                    <tr key={quote.id} className="align-top">
                      <td className="px-4 py-3 font-mono text-xs text-ink-muted">{quote.reference}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-ink">{quote.name}</div>
                        <div className="text-xs text-ink-muted">{quote.phone}</div>
                        {quote.email ? <div className="text-xs text-ink-muted">{quote.email}</div> : null}
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-muted">{quote.area}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-muted">{formatDate(quote.created_at)}</td>
                      <td className="max-w-[260px] px-4 py-3 text-xs text-ink-muted">
                        <div className="line-clamp-2" title={formatItems(quote.items)}>
                          {formatItems(quote.items)}
                        </div>
                        {quote.note ? (
                          <div className="mt-1 border-l-2 border-primary/20 pl-2 text-ink-muted" title={quote.note}>
                            “{truncate(quote.note, 120)}”
                          </div>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <select
                          value={quote.status}
                          disabled={quotesBusyId === quote.id}
                          onChange={(e) => void changeQuoteStatus(quote, e.target.value as Status)}
                          className={`rounded-[8px] border-0 px-2 py-1.5 text-xs font-semibold disabled:opacity-50 ${statusPill(quote.status)}`}
                        >
                          {STATUSES.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <a
                            href={ctaToWhatsApp(quote.phone, waSummary(quote))}
                            target="_blank"
                            rel="noreferrer"
                            title="Reply on WhatsApp"
                            className="inline-flex size-8 items-center justify-center rounded-[8px] border border-primary/10 text-ink-muted transition-colors hover:border-primary/40 hover:text-[#0d3d1a]"
                          >
                            <WhatsappLogo weight="duotone" size={14} aria-hidden="true" />
                          </a>
                          <button
                            type="button"
                            onClick={() => setDrawerQuote(quote)}
                            className="inline-flex items-center gap-1 rounded-[8px] border border-primary/10 px-2.5 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-primary/40 hover:bg-surface-alt"
                          >
                            <PencilSimple weight="duotone" size={13} aria-hidden="true" />
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : (
        <section aria-label="Contact messages" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-muted">
              {messages.length} message{messages.length === 1 ? "" : "s"} · {unreadCount} unread
            </p>
            <button
              type="button"
              onClick={() => void markAllRead()}
              disabled={unreadCount === 0}
              className="inline-flex items-center gap-1.5 rounded-[10px] border border-primary/20 bg-surface px-3 py-2 text-xs font-semibold text-ink transition-colors hover:border-primary/40 hover:bg-surface-alt disabled:opacity-50"
            >
              <Check weight="duotone" size={14} aria-hidden="true" />
              Mark all read
            </button>
          </div>

          {loading ? (
            <p className="text-sm text-ink-muted">Loading messages…</p>
          ) : messages.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-primary/20 bg-surface p-10 text-center text-sm text-ink-muted">
              No contact messages yet. Submissions from the contact form appear here.
            </div>
          ) : (
            <ul className="grid gap-3">
              {messages.map((message) => (
                <li
                  key={message.id}
                  className={`rounded-2xl border bg-surface p-4 ${message.read ? "border-primary/10" : "border-accent/50"}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-0.5 inline-flex size-8 items-center justify-center rounded-full ${
                          message.read ? "bg-surface-alt text-ink-muted" : "bg-accent/20 text-accent-dark"
                        }`}
                      >
                        <EnvelopeSimple weight="duotone" size={14} aria-hidden="true" />
                      </span>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-ink">{message.name}</span>
                          {!message.read ? (
                            <span className="rounded-full bg-accent/20 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-accent-dark">
                              Unread
                            </span>
                          ) : (
                            <span className="rounded-full bg-surface-alt px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                              Read
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-ink-muted">
                          {message.phone}
                          {message.area ? ` · ${message.area}` : ""} · {formatDate(message.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => void toggleRead(message)}
                        disabled={messagesBusyId === message.id}
                        className="inline-flex items-center gap-1 rounded-[8px] border border-primary/10 px-2.5 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-primary/40 hover:bg-surface-alt disabled:opacity-50"
                      >
                        <EnvelopeSimple weight="duotone" size={13} aria-hidden="true" />
                        {message.read ? "Mark unread" : "Mark read"}
                      </button>
                      <a
                        href={ctaToWhatsApp(message.phone, message.message)}
                        target="_blank"
                        rel="noreferrer"
                        title="Reply on WhatsApp"
                        className="inline-flex size-8 items-center justify-center rounded-[8px] border border-primary/10 text-ink-muted transition-colors hover:border-primary/40 hover:text-[#0d3d1a]"
                      >
                        <WhatsappLogo weight="duotone" size={14} aria-hidden="true" />
                      </a>
                      <button
                        type="button"
                        onClick={() => startEdit(message)}
                        title="Edit message"
                        className="inline-flex size-8 items-center justify-center rounded-[8px] border border-primary/10 text-ink-muted transition-colors hover:border-primary/40 hover:text-[#0d3d1a]"
                      >
                        <PencilSimple weight="duotone" size={14} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void removeMessage(message)}
                        disabled={messagesBusyId === message.id}
                        title="Delete message"
                        className="inline-flex size-8 items-center justify-center rounded-[8px] border border-primary/10 text-ink-muted transition-colors hover:border-red-500/40 hover:text-red-700 disabled:opacity-50"
                      >
                        <Trash weight="duotone" size={14} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                  {editingId === message.id ? (
                    <div className="mt-3 space-y-2">
                      <textarea
                        value={editingDraft}
                        onChange={(event) => setEditingDraft(event.target.value)}
                        rows={3}
                        maxLength={2000}
                        className="w-full rounded-[10px] border border-primary/20 bg-surface px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-accent/60"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => void saveEdit(message.id)}
                          className="inline-flex items-center gap-1.5 rounded-[10px] bg-accent px-3 py-1.5 text-xs font-semibold text-[#0d3d1a] transition-colors hover:bg-accent-light"
                        >
                          <Check weight="duotone" size={13} aria-hidden="true" />
                          Save message
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="rounded-[10px] px-3 py-1.5 text-xs font-medium text-ink-muted hover:text-ink"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-2 border-l-2 border-primary/20 pl-3 text-sm leading-relaxed text-ink">{truncate(message.message, 220)}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {drawerQuote ? (
        <QuoteDrawer
          quote={drawerQuote}
          open
          onClose={() => setDrawerQuote(null)}
          onSaved={() => void refreshActive()}
          onNeedRefresh={onNeedRefresh}
        />
      ) : null}
    </div>
  );
}