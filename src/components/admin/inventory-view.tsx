"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowClockwise, Warning } from "@phosphor-icons/react";
import type { CatalogProduct } from "@/lib/catalog-types";
import type { Session } from "./helpers";
import { api } from "./helpers";

type InventorySummary = {
  total: number;
  inStock: number;
  limited: number;
  outOfStock: number;
  onRequest: number;
};

type HistoryEntry = {
  id: string;
  product_id: string;
  productSlug: string | null;
  productName: string | null;
  previous_quantity: number;
  quantity_changed: number;
  new_quantity: number;
  change_type: string;
  reference_id: string | null;
  changed_by: string | null;
  created_at: string;
};

const CHANGE_TYPE_LABELS: Record<string, string> = {
  initial_stock: "Initial Stock",
  stock_addition: "Stock Addition",
  stock_adjustment: "Stock Adjustment",
  order: "Order",
  order_cancellation: "Order Cancellation",
  return: "Return",
  manual_correction: "Manual Correction",
};

const CHANGE_TYPE_ICONS: Record<string, string> = {
  initial_stock: "📦",
  stock_addition: "📥",
  stock_adjustment: "✏️",
  order: "🛒",
  order_cancellation: "↩️",
  return: "🔄",
  manual_correction: "🔧",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

export function InventoryView(props: { session: Session }) {
  const { session } = props;
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const loadData = useCallback(async () => {
    try {
      const data = await api<{ products: CatalogProduct[]; summary: InventorySummary }>(
        "/api/admin/inventory",
      );
      setProducts(data.products);
      setSummary(data.summary);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load inventory.");
    }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const data = await api<{ history: HistoryEntry[] }>("/api/admin/inventory/history?limit=200");
      setHistory(data.history);
    } catch {
      // history is best-effort
    }
  }, []);

  useEffect(() => {
    if (session.status !== "signed-in") return;
    setLoading(true);
    void Promise.all([loadData(), loadHistory()]).finally(() => setLoading(false));
  }, [session.status, loadData, loadHistory]);

  const filtered = useMemo(() => {
    if (filter === "all") return products;
    return products.filter((p) => {
      if (filter === "on_request") return !p.trackInventory;
      if (!p.trackInventory) return false;
      return p.stockStatus === filter;
    });
  }, [products, filter]);

  if (session.status !== "signed-in") return null;

  return (
    <section aria-label="Inventory" className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold tracking-tight text-ink">Inventory Overview</h2>
        <button
          type="button"
          onClick={() => void Promise.all([loadData(), loadHistory()])}
          className="inline-flex items-center gap-1.5 rounded-[10px] border border-primary/20 bg-surface px-3 py-2 text-xs font-semibold text-ink transition-colors hover:border-primary/40 hover:bg-surface-alt"
        >
          <ArrowClockwise weight="duotone" size={14} aria-hidden="true" />
          Refresh
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      ) : null}

      {summary ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            { label: "Total", value: summary.total, color: "text-ink" },
            { label: "In Stock", value: summary.inStock, color: "text-emerald-700" },
            { label: "Limited", value: summary.limited, color: "text-amber-700" },
            { label: "Out of Stock", value: summary.outOfStock, color: "text-rose-700" },
            { label: "On Request", value: summary.onRequest, color: "text-violet-700" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-primary/10 bg-surface p-4 text-center"
            >
              <div className={`font-mono text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="mt-1 text-xs text-ink-muted">{stat.label}</div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        {[
          { value: "all", label: "All" },
          { value: "in", label: "In Stock" },
          { value: "limited", label: "Limited" },
          { value: "out", label: "Out of Stock" },
          { value: "on_request", label: "On Request" },
        ].map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setFilter(opt.value)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              filter === opt.value
                ? "bg-accent text-[#0d3d1a]"
                : "border border-primary/20 bg-surface text-ink-muted hover:border-primary/40"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Products table */}
      {loading ? (
        <p className="text-sm text-ink-muted">Loading inventory…</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-primary/10 bg-surface">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead>
              <tr className="border-b border-primary/10 text-xs uppercase tracking-wider text-ink-muted">
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Quantity</th>
                <th className="px-4 py-3 font-medium">Threshold</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/10">
              {filtered.map((product) => (
                <tr key={product.slug} className="align-top">
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink">{product.name}</div>
                    {product.brand ? (
                      <div className="text-xs text-ink-muted">{product.brand}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-muted">{product.categoryId}</td>
                  <td className="px-4 py-3">
                    {product.trackInventory ? (
                      <span className={`rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider ${
                        product.stockStatus === "in"
                          ? "bg-emerald-600/15 text-emerald-700"
                          : product.stockStatus === "limited"
                            ? "bg-amber-600/15 text-amber-700"
                            : "bg-rose-600/15 text-rose-700"
                      }`}>
                        {product.stockStatus === "in" ? "In Stock" : product.stockStatus === "limited" ? "Limited" : "Out of Stock"}
                        {product.trackInventory && product.stockStatus === "limited" && product.stockQuantity <= product.lowStockThreshold ? (
                          <Warning weight="duotone" size={10} className="ml-1 inline" aria-hidden="true" />
                        ) : null}
                      </span>
                    ) : (
                      <span className="rounded-full bg-violet-600/15 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-violet-700">
                        On Request
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-sm">
                    {product.trackInventory ? product.stockQuantity : "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-ink-muted">
                    {product.trackInventory ? product.lowStockThreshold : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* History log */}
      <div>
        <h3 className="font-display text-base font-semibold tracking-tight text-ink">Inventory History</h3>
        {history.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">No inventory changes recorded yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-2xl border border-primary/10 bg-surface">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead>
                <tr className="border-b border-primary/10 text-xs uppercase tracking-wider text-ink-muted">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Qty Change</th>
                  <th className="px-4 py-3 font-medium">New Qty</th>
                  <th className="px-4 py-3 font-medium">Reference</th>
                  <th className="px-4 py-3 font-medium">By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/10">
                {history.map((entry) => (
                  <tr key={entry.id} className="align-top">
                    <td className="px-4 py-3 text-xs text-ink-muted">{formatDate(entry.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-ink">{entry.productName ?? entry.product_id}</div>
                      {entry.productSlug ? (
                        <div className="text-xs text-ink-muted">{entry.productSlug}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span>{CHANGE_TYPE_ICONS[entry.change_type] ?? "📝"}</span>{" "}
                      {CHANGE_TYPE_LABELS[entry.change_type] ?? entry.change_type}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      <span className={entry.quantity_changed > 0 ? "text-emerald-700" : entry.quantity_changed < 0 ? "text-rose-700" : "text-ink-muted"}>
                        {entry.quantity_changed > 0 ? "+" : ""}{entry.quantity_changed}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{entry.new_quantity}</td>
                    <td className="px-4 py-3 text-xs text-ink-muted">{entry.reference_id ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-ink-muted">{entry.changed_by ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}