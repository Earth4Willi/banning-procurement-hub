import { categories as staticCategories, products as staticProducts } from "@/lib/site";
import type { CatalogCategory, CatalogProduct } from "@/lib/catalog-types";
import { getSupabaseClient } from "./audit";

/**
 * DB-first catalog reads with the static `site.ts` data as a transparent
 * fallback, so the public site and quote builder keep working whether or not
 * the DB is configured (or the migration applied yet).
 */

function mapCategory(row: Record<string, unknown>): CatalogCategory {
  return {
    id: String(row.id),
    name: String(row.name),
    short: String(row.short ?? ""),
    description: String(row.description ?? ""),
    image: String(row.image_url ?? ""),
    imageUrl: row.image_url ? String(row.image_url) : undefined,
    sortOrder: Number(row.sort_order ?? 0),
    visible: row.visible === null || row.visible === undefined ? true : Boolean(row.visible),
  };
}

function mapProduct(row: Record<string, unknown>): CatalogProduct {
  const stock = row.stock?.toString();
  const pricingMode = row.pricing_mode?.toString();
  const kind = row.kind?.toString();
  const visible = row.visible === null || row.visible === undefined ? true : Boolean(row.visible);
  return {
    slug: String(row.slug),
    categoryId: String(row.category_id),
    name: String(row.name),
    brand: String(row.brand ?? ""),
    unit: String(row.unit ?? ""),
    unitPrice: String(row.unit_price ?? ""),
    image: String(row.image_url ?? ""),
    imageUrl: row.image_url ? String(row.image_url) : undefined,
    description: String(row.description ?? ""),
    stock: stock === "limited" || stock === "out" ? stock : "in",
    pricingMode: pricingMode === "fixed" ? "fixed" : "quote",
    kind: kind === "measure" ? "measure" : "unit",
    visible,
    sortOrder: Number(row.sort_order ?? 0),
  };
}

export async function fetchCategories(): Promise<CatalogCategory[]> {
  const client = getSupabaseClient();
  if (!client) return staticCategories;
  try {
    const { data, error } = await client
      .from("categories")
      .select("id, name, short, description, image_url, sort_order, visible")
      .order("sort_order", { ascending: true });
    if (error || !data || data.length === 0) return staticCategories;
    return (data as unknown as Record<string, unknown>[]).map(mapCategory);
  } catch (error) {
    console.warn("[catalog-store] categories unavailable:", error);
    return staticCategories;
  }
}

export async function fetchProducts(): Promise<CatalogProduct[]> {
  const client = getSupabaseClient();
  if (!client) return staticProducts;
  try {
    const { data, error } = await client
      .from("products")
      .select("slug, category_id, name, brand, unit, unit_price, image_url, description, stock, pricing_mode, kind, visible, sort_order")
      .order("sort_order", { ascending: true });
    if (error || !data || data.length === 0) return staticProducts;
    return (data as unknown as Record<string, unknown>[]).map(mapProduct);
  } catch (error) {
    console.warn("[catalog-store] products unavailable:", error);
    return staticProducts;
  }
}

function db(): ReturnType<typeof getSupabaseClient> {
  return getSupabaseClient();
}

export type CategoryInput = {
  id: string;
  name: string;
  short?: string;
  description?: string;
  image_url?: string | null;
  sortOrder?: number;
  visible?: boolean;
};

export type ProductInput = {
  slug: string;
  categoryId: string;
  name: string;
  brand?: string;
  unit?: string;
  unitPrice?: string;
  image?: string;
  description?: string;
  stock?: CatalogProduct["stock"];
  pricingMode?: CatalogProduct["pricingMode"];
  kind?: CatalogProduct["kind"];
  visible?: boolean;
  sortOrder?: number;
};

export async function createCategory(input: CategoryInput): Promise<boolean> {
  const client = db();
  if (!client) return false;
  const { error } = await client.from("categories").insert({
    id: input.id,
    name: input.name,
    short: input.short ?? "",
    description: input.description ?? "",
    image_url: input.image_url ?? "",
    sort_order: input.sortOrder,
    visible: input.visible ?? true,
  });
  if (error) {
    console.warn(`[catalog-store] create category failed: ${error.message}`);
    return false;
  }
  return true;
}

export async function updateCategory(id: string, patch: Partial<CategoryInput>): Promise<boolean> {
  const client = db();
  if (!client) return false;
  const { error } = await client.from("categories").update({
    name: patch.name,
    short: patch.short ?? undefined,
    description: patch.description ?? undefined,
    image_url: patch.image_url ?? undefined,
    sort_order: patch.sortOrder,
    visible: patch.visible,
  }).eq("id", id);
  if (error) {
    console.warn(`[catalog-store] update category failed: ${error.message}`);
    return false;
  }
  return true;
}

export async function deleteCategory(id: string): Promise<boolean> {
  const client = db();
  if (!client) return false;
  const { error } = await client.from("categories").update({ visible: false }).eq("id", id);
  if (error) {
    console.warn(`[catalog-store] delete category failed: ${error.message}`);
    return false;
  }
  return true;
}

export async function createProduct(input: ProductInput): Promise<boolean> {
  const client = db();
  if (!client) return false;
  const { error } = await client.from("products").insert({
    slug: input.slug,
    category_id: input.categoryId,
    name: input.name,
    brand: input.brand ?? "",
    unit: input.unit ?? "",
    unit_price: input.unitPrice ?? "",
    image_url: input.image ?? "",
    description: input.description ?? "",
    stock: input.stock,
    pricing_mode: input.pricingMode,
    kind: input.kind,
    visible: input.visible ?? true,
    sort_order: input.sortOrder ?? 0,
  });
  if (error) {
    console.warn(`[catalog-store] create product failed: ${error.message}`);
    return false;
  }
  return true;
}

export async function updateProduct(slug: string, patch: Partial<ProductInput>): Promise<boolean> {
  const client = db();
  if (!client) return false;
  const { error } = await client.from("products").update({
    category_id: patch.categoryId,
    name: patch.name,
    brand: patch.brand ?? undefined,
    unit: patch.unit ?? undefined,
    unit_price: patch.unitPrice ?? undefined,
    image_url: patch.image ?? undefined,
    description: patch.description ?? undefined,
    stock: patch.stock,
    pricing_mode: patch.pricingMode,
    kind: patch.kind,
    visible: patch.visible,
    sort_order: patch.sortOrder,
  }).eq("slug", slug);
  if (error) {
    console.warn(`[catalog-store] update product failed: ${error.message}`);
    return false;
  }
  return true;
}

export async function deleteProduct(slug: string): Promise<boolean> {
  const client = db();
  if (!client) return false;
  const { error } = await client.from("products").delete().eq("slug", slug);
  if (error) {
    console.warn(`[catalog-store] delete product failed: ${error.message}`);
    return false;
  }
  return true;
}