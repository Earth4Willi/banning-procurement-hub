// Pure inventory helpers — no I/O, no Supabase dependency.

export type StockStatusValue = "in_stock" | "limited" | "out_of_stock" | "on_request";

export type InventoryInfo = {
  tracking: boolean;
  quantity: number;
  threshold: number;
  status: StockStatusValue;
  label: string;
};

/**
 * Single source of truth for stock-status derivation.
 * Rules:
 *  - quantity <= 0             → out_of_stock
 *  - quantity <= threshold     → limited
 *  - otherwise                 → in_stock
 */
export function getStockStatus(
  quantity: number,
  threshold: number = 10,
): "in_stock" | "limited" | "out_of_stock" {
  if (quantity <= 0) return "out_of_stock";
  if (quantity <= threshold) return "limited";
  return "in_stock";
}

/**
 * Compute the human-readable label for a given status.
 */
export function stockStatusLabel(status: StockStatusValue): string {
  switch (status) {
    case "in_stock": return "In Stock";
    case "limited": return "Limited Stock";
    case "out_of_stock": return "Out of Stock";
    case "on_request": return "Available on Request";
  }
}

/**
 * Apply a quantity change, clamping to >= 0.
 * Returns the new quantity and the actual change applied.
 */
export function applyQuantityChange(
  currentQuantity: number,
  change: number,
): { newQuantity: number; quantityChanged: number } {
  const newQuantity = Math.max(0, currentQuantity + change);
  const quantityChanged = newQuantity - currentQuantity;
  return { newQuantity, quantityChanged };
}

/**
 * Build a full inventory info record from a product-like object.
 * Non-tracked products always return "on_request".
 */
export function computeProductStatus(product: {
  trackInventory: boolean;
  stockQuantity: number;
  lowStockThreshold: number;
  unit?: string;
}): InventoryInfo {
  if (!product.trackInventory) {
    return {
      tracking: false,
      quantity: 0,
      threshold: 0,
      status: "on_request",
      label: "Available on Request",
    };
  }
  const status = getStockStatus(product.stockQuantity, product.lowStockThreshold);
  return {
    tracking: true,
    quantity: product.stockQuantity,
    threshold: product.lowStockThreshold,
    status,
    label: stockStatusLabel(status),
  };
}

/**
 * A single short line: the requested product was over the available quantity.
 */
export type ShortLine = {
  name: string;
  slug: string;
  requested: number;
  available: number;
};

/**
 * Pure, shared stock-shortage check. Returns the lines where the requested
 * quantity exceeds available stock. Non-tracked/products that are unknown
 * in the catalog are never flagged (they are best-effort / on request).
 */
export function findShortLines(
  items: { slug: string; quantity: number }[],
  products: { slug: string; name: string; unit?: string; trackInventory: boolean; stockQuantity: number }[],
): ShortLine[] {
  const bySlug = new Map(products.map((p) => [p.slug, p] as const));
  const short: ShortLine[] = [];
  for (const item of items) {
    const product = bySlug.get(item.slug);
    if (!product || !product.trackInventory) continue;
    if (item.quantity > product.stockQuantity) {
      short.push({
        name: product.name,
        slug: product.slug,
        requested: item.quantity,
        available: product.stockQuantity,
      });
    }
  }
  return short;
}