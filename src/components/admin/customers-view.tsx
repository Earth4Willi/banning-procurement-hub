"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MagnifyingGlass, WhatsappLogo } from "@phosphor-icons/react";
import type { CustomerRecord } from "@/lib/catalog-types";
import { computeTotals, buildQuoteSummary } from "@/lib/quote-document";
import type { QuoteRow, Session } from "./helpers";
import { api, ctaToWhatsApp, formatDate, formatItems, statusPill, truncate } from "./helpers";

export const CUSTOMER_STATUSES = ["new", "active", "repeat", "inactive"] as const;
type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];

export function filterCustomers(customers: CustomerRecord[], query: string): CustomerRecord[] {
  const q = query.trim().toLowerCase();
  if (!q) return customers;
  return customers.filter((customer) => {
    return customer.name.toLowerCase().includes(q) || customer.phone.toLowerCase().includes(q);
  });
}

export function CustomersView(props: { session: Session; onNeedRefresh: () => void }) {
  const { session, onNeedRefresh } = props;

  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [listDbAvailable, setListDbAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [statusDraft, setStatusDraft] = useState<string>("new");
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [history, setHistory] = useState<QuoteRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyAvailable, setHistoryAvailable] = useState(true);

  const selected = useMemo(
    () => customers.find((customer) => customer.phone === selectedPhone) ?? null,
    [customers, selectedPhone],
  );

  const loadCustomers = useCallback(async () => {
    try {
      const data = await api<{ customers: CustomerRecord[]; dbAvailable: boolean }>("/api/admin/customers");
      setCustomers(data.customers);
      setListDbAvailable(data.dbAvailable);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load customers.");
    }
  }, []);

  useEffect(() => {
    if (session.status !== "signed-in") return;
    setLoading(true);
    void loadCustomers().finally(() => setLoading(false));
  }, [session.status, loadCustomers]);

  useEffect(() => {
    if (customers.length === 0) {
      setSelectedPhone(null);
      return;
    }
    if (!selectedPhone || !customers.some((customer) => customer.phone === selectedPhone)) {
      setSelectedPhone(customers[0].phone);
    }
  }, [customers, selectedPhone]);

  const selectCustomer = useCallback(
    (phone: string) => {
      const customer = customers.find((item) => item.phone === phone);
      if (!customer) return;
      setSelectedPhone(phone);
      setNotesDraft(customer.notes);
      setStatusDraft(customer.status);
      setSaveError(null);
    },
    [customers],
  );

  const loadHistory = useCallback(async (phone: string) => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const data = await api<{ quotes: QuoteRow[]; dbAvailable: boolean }>(
        `/api/admin/quotes?phone=${encodeURIComponent(phone)}`,
      );
      setHistory(data.quotes);
      setHistoryAvailable(data.dbAvailable);
    } catch (err) {
      setHistory([]);
      setHistoryAvailable(false);
      setHistoryError(err instanceof Error ? err.message : "Could not load quote history.");
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedPhone) return;
    void loadHistory(selectedPhone);
  }, [selectedPhone, loadHistory]);

  const saveCustomer = useCallback(
    async (patch: { notes?: string; status?: string }) => {
      if (!selected) return;
      setBusy(true);
      setSaveError(null);
      try {
        const body: Record<string, string> = { phone: selected.phone };
        if (patch.notes !== undefined) body.notes = patch.notes;
        if (patch.status !== undefined) body.status = patch.status;
        await api<{ ok: true }>("/api/admin/customers", { method: "PUT", body: JSON.stringify(body) });
        setCustomers((rows) =>
          rows.map((row) =>
            row.phone === selected.phone
              ? {
                  ...row,
                  ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
                  ...(patch.status !== undefined ? { status: patch.status } : {}),
                }
              : row,
          ),
        );
        onNeedRefresh();
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : "Could not save the customer.");
      } finally {
        setBusy(false);
      }
    },
    [selected, onNeedRefresh],
  );

  const filtered = useMemo(() => filterCustomers(customers, search), [customers, search]);
  const notesDirty = selected !== null && notesDraft !== selected.notes;

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
    return <p className="text-sm text-ink-muted">Sign in to review customers.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">Customers</h2>
          <p className="mt-1 text-sm text-ink-muted">Everyone who has asked for a quote or sent a message.</p>
        </div>
        {customers.length > 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/10 bg-surface px-3 py-1.5 font-mono text-xs font-semibold uppercase tracking-wider text-ink-muted">
            <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
            {customers.length} customer{customers.length === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-700" role="alert">
          {error}
        </div>
      ) : null}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <section aria-label="Customer list" className="rounded-2xl border border-primary/10 bg-surface">
          <div className="p-3">
            <div className="relative">
              <MagnifyingGlass
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
                size={15}
                weight="duotone"
                aria-hidden="true"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name or phone…"
                aria-label="Search customers"
                className="w-full rounded-[10px] border border-primary/20 bg-surface py-2 pl-9 pr-3 text-sm text-ink outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-accent/60"
              />
            </div>
          </div>

          {loading ? (
            <p className="px-4 pb-6 pt-2 text-sm text-ink-muted">Loading customers…</p>
          ) : filtered.length === 0 ? (
            <div className="px-4 pb-6 pt-2">
              <div className="rounded-2xl border border-dashed border-primary/20 bg-surface p-8 text-center text-sm text-ink-muted">
                {search.trim()
                  ? "No customers match your search."
                  : "Customers are built automatically from quotes and messages."}
              </div>
              {!search.trim() && !listDbAvailable ? (
                <p className="mt-2 text-center text-xs text-ink-muted">
                  Live database not configured yet — customers will appear once the database is connected.
                </p>
              ) : null}
            </div>
          ) : (
            <ul className="max-h-[70vh] divide-y divide-primary/10 overflow-y-auto">
              {filtered.map((customer) => {
                const active = customer.phone === selectedPhone;
                const won = customer.bestStatus === "won";
                return (
                  <li key={customer.phone}>
                    <button
                      type="button"
                      onClick={() => selectCustomer(customer.phone)}
                      aria-current={active ? "true" : undefined}
                      className={`w-full px-4 py-3 text-left transition-colors ${
                        active ? "bg-surface-alt" : "hover:bg-surface-alt/60"
                      } ${won ? "border-l-[3px] border-emerald-600/60" : "border-l-[3px] border-transparent"}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium text-ink">
                          {customer.name.trim() ? customer.name.trim() : <span className="text-ink-muted">Unknown</span>}
                        </span>
                        {won ? (
                          <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${statusPill("won")}`}>
                            Won
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-0.5 text-xs text-ink-muted">{customer.phone}</div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1">
                        {customer.sources.map((source) => (
                          <span
                            key={source}
                            className="rounded-full border border-primary/10 bg-surface px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-ink-muted"
                          >
                            {source}
                          </span>
                        ))}
                        <span className="text-xs text-ink-muted">
                          {customer.requestCount} request{customer.requestCount === 1 ? "" : "s"}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-ink-muted">
                        Last contact {customer.lastContactAt ? formatDate(customer.lastContactAt) : "never"}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {!selected ? (
          <section
            aria-label="Customer details"
            className="rounded-2xl border border-dashed border-primary/20 bg-surface p-10 text-center text-sm text-ink-muted"
          >
            Select a customer to view their details, notes and quote history.
          </section>
        ) : (
          <section aria-label="Customer details" className="space-y-4">
            <div className="rounded-2xl border border-primary/10 bg-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-lg font-semibold tracking-tight text-ink">
                      {selected.name.trim() ? selected.name.trim() : "Unknown customer"}
                    </h3>
                    {selected.bestStatus === "won" ? (
                      <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${statusPill("won")}`}>
                        Best: won
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-ink-muted">
                    {selected.phone}
                    {selected.email ? ` · ${selected.email}` : ""}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {selected.requestCount} request{selected.requestCount === 1 ? "" : "s"}
                    {selected.lastContactAt ? ` · last contact ${formatDate(selected.lastContactAt)}` : " · never contacted"}
                  </p>
                </div>
                <a
                  href={ctaToWhatsApp(
                    selected.phone,
                    `Hello${selected.name.trim() ? ` ${selected.name.trim()}` : ""}, this is Banning Procurement Hub. How can we help you?`,
                  )}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-[10px] bg-[#0d3d1a] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-primary-700"
                >
                  <WhatsappLogo weight="duotone" size={14} aria-hidden="true" />
                  Reply on WhatsApp
                </a>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <div className="flex items-end justify-between gap-3">
                    <label htmlFor="customer-notes" className="text-sm font-medium text-ink">
                      Notes
                    </label>
                    {saveError ? (
                      <p role="alert" className="text-xs font-medium text-red-700">
                        {saveError}
                      </p>
                    ) : null}
                  </div>
                  <textarea
                    id="customer-notes"
                    rows={4}
                    maxLength={2000}
                    value={notesDraft}
                    onChange={(event) => setNotesDraft(event.target.value)}
                    placeholder="No notes yet. Jot down anything worth remembering about this customer."
                    className="mt-2 w-full rounded-[10px] border border-primary/20 bg-surface px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-accent/60"
                  />
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => void saveCustomer({ notes: notesDraft })}
                      disabled={busy || !notesDirty}
                      className="rounded-[10px] border border-primary/20 bg-surface px-3 py-2 text-xs font-semibold text-ink transition-colors hover:border-primary/40 hover:bg-surface-alt disabled:opacity-50"
                    >
                      {busy ? "Saving…" : "Save notes"}
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-primary/10 pt-4">
                  <div>
                    <label htmlFor="customer-status" className="block text-sm font-medium text-ink">
                      Status
                    </label>
                    <p className="mt-0.5 text-xs text-ink-muted">How this customer is doing overall.</p>
                  </div>
                  <select
                    id="customer-status"
                    value={statusDraft}
                    disabled={busy}
                    onChange={(event) => {
                      const next = event.target.value as CustomerStatus;
                      if (next === selected.status) {
                        setStatusDraft(next);
                        return;
                      }
                      setStatusDraft(next);
                      void saveCustomer({ status: next });
                    }}
                    className={`rounded-[8px] border-0 px-2 py-1.5 text-xs font-semibold disabled:opacity-50 ${statusPill(statusDraft)}`}
                  >
                    {CUSTOMER_STATUSES.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-primary/10 bg-surface p-5">
              <h3 className="font-display text-lg font-semibold tracking-tight text-ink">Quote history</h3>
              {historyLoading ? (
                <p className="mt-3 text-sm text-ink-muted">Loading quote history…</p>
              ) : historyError ? (
                <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-700" role="alert">
                  {historyError}
                </div>
              ) : !historyAvailable && history.length === 0 ? (
                <p className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-ink-muted">
                  Live database not configured — quote history unavailable.
                </p>
              ) : history.length === 0 ? (
                <p className="mt-3 text-sm text-ink-muted">No quotes from this customer yet.</p>
              ) : (
                <ul className="mt-3 divide-y divide-primary/10">
                  {history.map((quote) => (
                    <li key={quote.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs text-ink-muted">{quote.reference}</span>
                          <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${statusPill(quote.status)}`}>
                            {quote.status}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-ink-muted">
                          {formatDate(quote.created_at)}
                          {quote.items.length > 0 ? ` · ${truncate(formatItems(quote.items), 180)}` : ""}
                        </div>
                        {quote.note ? (
                          <div className="mt-1 border-l-2 border-primary/20 pl-2 text-xs text-ink-muted" title={quote.note}>
                            “{truncate(quote.note, 120)}”
                          </div>
                        ) : null}
                      </div>
                      <a
                        href={ctaToWhatsApp(quote.phone, waSummary(quote))}
                        target="_blank"
                        rel="noreferrer"
                        title="Reply on WhatsApp"
                        className="inline-flex size-8 items-center justify-center rounded-[8px] border border-primary/10 text-ink-muted transition-colors hover:border-primary/40 hover:text-[#0d3d1a]"
                      >
                        <WhatsappLogo weight="duotone" size={14} aria-hidden="true" />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}