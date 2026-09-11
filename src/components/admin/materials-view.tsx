"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Eye,
  EyeSlash,
  PencilSimple,
  Plus,
  Trash,
  UploadSimple,
  Warning,
  X,
} from "@phosphor-icons/react";
import type { CatalogCategory, CatalogProduct } from "@/lib/catalog-types";
import { money } from "@/lib/quote-document";
import {
  AFRICAN_CONSTRUCTION_BRAND_GROUPS,
  ALL_BRAND_OPTIONS,
  OTHER_BRAND,
} from "@/lib/brand-constants";
import type { Session } from "./helpers";
import { api } from "./helpers";
import { AdminTableSkeleton } from "@/components/skeletons/admin";

type MaterialsTab = "products" | "categories";

type ProductForm = {
  slug: string;
  categoryId: string;
  name: string;
  brand: string;
  unit: string;
  unitPrice: string;
  imageUrl: string;
  description: string;
  stockQuantity: number;
  lowStockThreshold: number;
  trackInventory: boolean;
  pricingMode: "fixed" | "quote";
  kind: "unit" | "measure";
  visible: boolean;
  sortOrder: number;
};

type CategoryForm = {
  id: string;
  name: string;
  short: string;
  description: string;
  imageUrl: string;
  visible: boolean;
  sortOrder: number;
};

const EMPTY_PRODUCT: ProductForm = {
  slug: "",
  categoryId: "",
  name: "",
  brand: "",
  unit: "",
  unitPrice: "",
  imageUrl: "",
  description: "",
  stockQuantity: 0,
  lowStockThreshold: 10,
  trackInventory: true,
  pricingMode: "quote",
  kind: "unit",
  visible: true,
  sortOrder: 0,
};

const EMPTY_CATEGORY: CategoryForm = {
  id: "",
  name: "",
  short: "",
  description: "",
  imageUrl: "",
  visible: true,
  sortOrder: 0,
};

function inputClass(error?: string): string {
  return `w-full rounded-[10px] border bg-surface px-3 py-2 text-sm text-ink outline-none transition-colors focus:ring-2 ${
    error
      ? "border-red-600 focus:border-red-600 focus:ring-red-600/40"
      : "border-primary/20 focus:border-primary focus:ring-accent/60"
  }`;
}

function stockStatusLabel(status: CatalogProduct["stockStatus"]): string {
  if (status === "in") return "In Stock";
  if (status === "limited") return "Limited";
  return "Out of Stock";
}

/**
 * Live thumbnail for a pasted image URL. Loads the image from the URL directly
 * so the admin sees immediately whether the link resolves, instead of having to
 * save the product first.
 */
function ImageUrlPreview({ url }: { url: string }) {
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    setState("loading");
  }, [url]);

  if (!url) return null;

  return (
    <div className="mt-2 inline-flex items-start gap-2">
      <div className="relative h-20 w-20 overflow-hidden rounded-[10px] border border-primary/15 bg-surface-alt">
        {state === "ok" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt="Image preview"
            className="h-full w-full object-cover"
            onLoad={() => setState("ok")}
            onError={() => setState("error")}
          />
        ) : state === "loading" ? (
          <span className="flex h-full w-full items-center justify-center text-[10px] text-ink-muted">Loading…</span>
        ) : (
          <span className="flex h-full w-full items-center justify-center text-[10px] text-ink-muted">No preview</span>
        )}
      </div>
      <span className="pt-1.5 text-xs text-ink-muted">
        {state === "error"
          ? "Couldn’t load that image — check the URL or upload the file instead."
          : "Image loads from this URL."}
      </span>
    </div>
  );
}

function stockPill(stockStatus: CatalogProduct["stockStatus"]): string {
  if (stockStatus === "in") return "bg-emerald-600/15 text-emerald-700";
  if (stockStatus === "limited") return "bg-amber-600/15 text-amber-700";
  return "bg-rose-600/15 text-rose-700";
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function MaterialsView(props: { session: Session; tab: MaterialsTab; onNeedRefresh: () => void }) {
  const { session, tab, onNeedRefresh } = props;
  const router = useRouter();
  const pathname = usePathname();

  const [active, setActive] = useState<MaterialsTab>(tab);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalMode, setModalMode] = useState<"product" | "category" | null>(null);
  const [editSlug, setEditSlug] = useState<string | null>(null);
  const [editCatId, setEditCatId] = useState<string | null>(null);

  const [productForm, setProductForm] = useState<ProductForm>(EMPTY_PRODUCT);
  const [categoryForm, setCategoryForm] = useState<CategoryForm>(EMPTY_CATEGORY);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formBusy, setFormBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [brandIsCustom, setBrandIsCustom] = useState(false);

  useEffect(() => {
    setActive(tab);
  }, [tab]);

  const loadCategories = useCallback(async () => {
    try {
      const data = await api<{ categories: CatalogCategory[] }>("/api/admin/catalog/categories");
      setCategories(data.categories);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load categories.");
    }
  }, []);

  const loadProducts = useCallback(async () => {
    try {
      const data = await api<{ products: CatalogProduct[] }>("/api/admin/catalog/products");
      setProducts(data.products);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load products.");
    }
  }, []);

  useEffect(() => {
    if (session.status !== "signed-in") return;
    setLoading(true);
    void Promise.all([loadCategories(), loadProducts()]).finally(() => setLoading(false));
  }, [session.status, loadCategories, loadProducts]);

  const switchTab = (next: MaterialsTab) => {
    setActive(next);
    const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    params.set("tab", next);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const catName = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of categories) map.set(c.id, c.name);
    return map;
  }, [categories]);

  const refreshAll = useCallback(() => {
    void Promise.all([loadCategories(), loadProducts()]);
  }, [loadCategories, loadProducts]);

  const openProductModal = useCallback(
    (product?: CatalogProduct) => {
      if (product) {
        setEditSlug(product.slug);
        setBrandIsCustom(product.brand ? !ALL_BRAND_OPTIONS.includes(product.brand) : false);
        setProductForm({
          slug: product.slug,
          categoryId: product.categoryId,
          name: product.name,
          brand: product.brand,
          unit: product.unit,
          unitPrice: product.unitPrice,
          imageUrl: product.imageUrl ?? product.image ?? "",
          description: product.description,
          stockQuantity: product.stockQuantity,
          lowStockThreshold: product.lowStockThreshold,
          trackInventory: product.trackInventory,
          pricingMode: product.pricingMode,
          kind: product.kind,
          visible: product.visible ?? true,
          sortOrder: product.sortOrder ?? 0,
        });
      } else {
        setEditSlug(null);
        setBrandIsCustom(false);
        setProductForm({
          ...EMPTY_PRODUCT,
          categoryId: categories.length > 0 ? categories[0].id : "",
        });
      }
      setFormErrors({});
      setFormError(null);
      setModalMode("product");
    },
    [categories],
  );

  const openCategoryModal = useCallback((category?: CatalogCategory) => {
    if (category) {
      setEditCatId(category.id);
      setCategoryForm({
        id: category.id,
        name: category.name,
        short: category.short,
        description: category.description,
        imageUrl: category.imageUrl ?? category.image ?? "",
        visible: category.visible ?? true,
        sortOrder: category.sortOrder ?? 0,
      });
    } else {
      setEditCatId(null);
      setCategoryForm(EMPTY_CATEGORY);
    }
    setFormErrors({});
    setFormError(null);
    setModalMode("category");
  }, []);

  const closeModal = () => {
    setModalMode(null);
    setEditSlug(null);
    setEditCatId(null);
    setFormErrors({});
    setFormError(null);
  };

  const handleImageUpload = useCallback(
    async (file: File, slugHint: string): Promise<string | null> => {
      const form = new FormData();
      form.append("file", file);
      if (slugHint) form.append("slug", slugHint);
      const res = await fetch("/api/admin/catalog/image", {
        method: "POST",
        credentials: "same-origin",
        body: form,
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; url?: string; error?: { message?: string } } | null;
      if (!res.ok) {
        setFormError(data?.error?.message ?? "Image upload failed.");
        return null;
      }
      return data?.url ?? null;
    },
    [],
  );

  const submitProduct = useCallback(async () => {
    setFormBusy(true);
    setFormError(null);
    setFormErrors({});
    try {
      const payload: ProductForm = { ...productForm };
      if (!payload.slug && payload.name) payload.slug = slugify(payload.name);
      const res = await fetch("/api/admin/catalog/products", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: { message?: string; issues?: { field: string; message: string }[] } } | null;
      if (!res.ok) {
        if (data?.error?.issues) {
          const errs: Record<string, string> = {};
          for (const issue of data.error.issues) errs[issue.field] = issue.message;
          setFormErrors(errs);
        } else {
          setFormError(data?.error?.message ?? "Could not save the product.");
        }
        return;
      }
      closeModal();
      refreshAll();
      onNeedRefresh();
    } catch {
      setFormError("Could not save the product.");
    } finally {
      setFormBusy(false);
    }
  }, [productForm, refreshAll, onNeedRefresh]);

  const updateProduct = useCallback(async () => {
    setFormBusy(true);
    setFormError(null);
    setFormErrors({});
    try {
      const payload: ProductForm = { ...productForm };
      const res = await fetch("/api/admin/catalog/products", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: { message?: string; issues?: { field: string; message: string }[] } } | null;
      if (!res.ok) {
        if (data?.error?.issues) {
          const errs: Record<string, string> = {};
          for (const issue of data.error.issues) errs[issue.field] = issue.message;
          setFormErrors(errs);
        } else {
          setFormError(data?.error?.message ?? "Could not update the product.");
        }
        return;
      }
      closeModal();
      refreshAll();
      onNeedRefresh();
    } catch {
      setFormError("Could not update the product.");
    } finally {
      setFormBusy(false);
    }
  }, [productForm, refreshAll, onNeedRefresh]);

  const submitCategory = useCallback(async () => {
    setFormBusy(true);
    setFormError(null);
    setFormErrors({});
    try {
      const res = await fetch("/api/admin/catalog/categories", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(categoryForm),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: { message?: string; issues?: { field: string; message: string }[] } } | null;
      if (!res.ok) {
        if (data?.error?.issues) {
          const errs: Record<string, string> = {};
          for (const issue of data.error.issues) errs[issue.field] = issue.message;
          setFormErrors(errs);
        } else {
          setFormError(data?.error?.message ?? "Could not save the category.");
        }
        return;
      }
      closeModal();
      refreshAll();
      onNeedRefresh();
    } catch {
      setFormError("Could not save the category.");
    } finally {
      setFormBusy(false);
    }
  }, [categoryForm, refreshAll, onNeedRefresh]);

  const updateCategory = useCallback(async () => {
    setFormBusy(true);
    setFormError(null);
    setFormErrors({});
    try {
      const res = await fetch("/api/admin/catalog/categories", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(categoryForm),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: { message?: string; issues?: { field: string; message: string }[] } } | null;
      if (!res.ok) {
        if (data?.error?.issues) {
          const errs: Record<string, string> = {};
          for (const issue of data.error.issues) errs[issue.field] = issue.message;
          setFormErrors(errs);
        } else {
          setFormError(data?.error?.message ?? "Could not update the category.");
        }
        return;
      }
      closeModal();
      refreshAll();
      onNeedRefresh();
    } catch {
      setFormError("Could not update the category.");
    } finally {
      setFormBusy(false);
    }
  }, [categoryForm, refreshAll, onNeedRefresh]);

  const toggleProductVisible = useCallback(
    async (product: CatalogProduct) => {
      const nextVisible = !(product.visible ?? true);
      setBusyId(product.slug);
      try {
        await api<{ ok: true }>("/api/admin/catalog/products", {
          method: "PUT",
          body: JSON.stringify({
            slug: product.slug,
            categoryId: product.categoryId,
            name: product.name,
            brand: product.brand,
            unit: product.unit,
            unitPrice: product.unitPrice,
            imageUrl: product.imageUrl ?? product.image ?? "",
            description: product.description,
            stockQuantity: product.stockQuantity,
            lowStockThreshold: product.lowStockThreshold,
            trackInventory: product.trackInventory,
            pricingMode: product.pricingMode,
            kind: product.kind,
            visible: nextVisible,
            sortOrder: product.sortOrder ?? 0,
          }),
        });
        setProducts((rows) =>
          rows.map((row) => (row.slug === product.slug ? { ...row, visible: nextVisible } : row)),
        );
        onNeedRefresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not update visibility.");
      } finally {
        setBusyId(null);
      }
    },
    [onNeedRefresh],
  );

  const deleteProduct = useCallback(
    async (product: CatalogProduct) => {
      if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
      setBusyId(product.slug);
      try {
        await api<{ ok: true }>("/api/admin/catalog/products", {
          method: "DELETE",
          body: JSON.stringify({ id: product.slug }),
        });
        setProducts((rows) => rows.filter((row) => row.slug !== product.slug));
        onNeedRefresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not delete the product.");
      } finally {
        setBusyId(null);
      }
    },
    [onNeedRefresh],
  );

  const hideCategory = useCallback(
    async (category: CatalogCategory) => {
      setBusyId(category.id);
      try {
        await api<{ ok: true }>("/api/admin/catalog/categories", {
          method: "DELETE",
          body: JSON.stringify({ id: category.id }),
        });
        setCategories((rows) => rows.map((row) => (row.id === category.id ? { ...row, visible: false } : row)));
        onNeedRefresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not hide the category.");
      } finally {
        setBusyId(null);
      }
    },
    [onNeedRefresh],
  );

  const showCategory = useCallback(
    async (category: CatalogCategory) => {
      setBusyId(category.id);
      try {
        await api<{ ok: true }>("/api/admin/catalog/categories", {
          method: "PUT",
          body: JSON.stringify({
            id: category.id,
            name: category.name,
            short: category.short,
            description: category.description,
            imageUrl: category.imageUrl ?? category.image ?? "",
            visible: true,
            sortOrder: category.sortOrder ?? 0,
          }),
        });
        setCategories((rows) => rows.map((row) => (row.id === category.id ? { ...row, visible: true } : row)));
        onNeedRefresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not show the category.");
      } finally {
        setBusyId(null);
      }
    },
    [onNeedRefresh],
  );

  if (session.status === "loading") {
    return <p className="text-sm text-ink-muted">Checking session…</p>;
  }

  if (session.status !== "signed-in") {
    return <p className="text-sm text-ink-muted">Sign in to manage materials.</p>;
  }

  const modalTitle = modalMode === "product"
    ? editSlug ? "Edit product" : "Add product"
    : editCatId ? "Edit category" : "Add category";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">Materials</h2>
          <p className="mt-1 text-sm text-ink-muted">Manage your product catalogue and categories.</p>
        </div>
        <div className="flex rounded-[10px] border border-primary/10 bg-surface p-1" role="tablist" aria-label="Materials sections">
          {(
            [
              { key: "products" as const, label: `Products${products.length > 0 ? ` (${products.length})` : ""}` },
              { key: "categories" as const, label: `Categories${categories.length > 0 ? ` (${categories.length})` : ""}` },
            ]
          ).map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={active === item.key}
              onClick={() => switchTab(item.key)}
              className={`rounded-[8px] px-3 text-sm font-semibold transition-colors ${
                active === item.key ? "bg-[#0d3d1a] text-white" : "text-ink-muted hover:text-ink"
              }`}
              style={{ minHeight: 40 }}
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

      {active === "products" ? (
        <section aria-label="Products" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-ink-muted">
              {products.length} product{products.length === 1 ? "" : "s"} · {categories.length} categor{categories.length === 1 ? "y" : "ies"}
            </span>
            <button
              type="button"
              onClick={() => openProductModal()}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-[10px] border border-primary/20 bg-surface px-3 py-2 text-sm font-semibold text-ink transition-colors hover:border-primary/40 hover:bg-surface-alt"
            >
              <Plus weight="duotone" size={14} aria-hidden="true" />
              Add product
            </button>
          </div>

          {loading ? (
            <AdminTableSkeleton columns={6} />
          ) : products.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-primary/20 bg-surface p-10 text-center text-sm text-ink-muted">
              No products yet. Add your first product above.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-primary/10 bg-surface">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead>
                  <tr className="border-b border-primary/10 text-xs uppercase tracking-wider text-ink-muted">
                    <th className="px-4 py-3 font-medium">Image</th>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium">Price</th>
                    <th className="px-4 py-3 font-medium">Inventory</th>
                    <th className="px-4 py-3 font-medium">Visible</th>
                    <th className="px-4 py-3 font-medium">Sort</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary/10">
                  {products.map((product) => (
                    <tr key={product.slug} className="align-top">
                      <td className="px-4 py-3">
                        {(product.imageUrl ?? product.image) ? (
                          <img
                            src={product.imageUrl ?? product.image}
                            alt={product.name}
                            className="size-10 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="size-10 rounded-lg border border-primary/10 bg-surface-alt" />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-ink">{product.name}</div>
                        {product.brand ? (
                          <div className="text-xs text-ink-muted">{product.brand}</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-muted">
                        {catName.get(product.categoryId) ?? product.categoryId}
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-muted">
{product.pricingMode === "fixed" && product.unitPrice && !Number.isNaN(Number(product.unitPrice))
                        ? `${money(Number(product.unitPrice))}/${product.unit || "unit"}`
                        : "Price on request"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {product.trackInventory ? (
                          <>
                            <span className={`rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider ${stockPill(product.stockStatus)}`}>
                              {stockStatusLabel(product.stockStatus)} ({product.stockQuantity})
                            </span>
                            {product.stockStatus === "limited" ? (
                              <div className="mt-1 flex items-center gap-1 text-[10px] text-amber-700">
                                <Warning weight="duotone" size={10} aria-hidden="true" />
                                {product.stockQuantity} left / {product.lowStockThreshold} threshold
                              </div>
                            ) : null}
                          </>
                        ) : (
                          <span className="rounded-full bg-violet-600/15 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-violet-700">
                            Request
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex size-2.5 rounded-full ${product.visible !== false ? "bg-emerald-600" : "bg-ink-muted/30"}`}
                          aria-label={product.visible !== false ? "Visible" : "Hidden"}
                        />
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-ink-muted">{product.sortOrder ?? 0}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openProductModal(product)}
                            title="Edit product"
                            className="inline-flex size-11 items-center justify-center rounded-[10px] border border-primary/10 text-ink-muted transition-colors hover:border-primary/40 hover:text-[#0d3d1a]"
                          >
                            <PencilSimple weight="duotone" size={14} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void toggleProductVisible(product)}
                            disabled={busyId === product.slug}
                            title={product.visible !== false ? "Hide product" : "Show product"}
                            className="inline-flex size-11 items-center justify-center rounded-[10px] border border-primary/10 text-ink-muted transition-colors hover:border-primary/40 hover:text-[#0d3d1a] disabled:opacity-50"
                          >
                            {product.visible !== false ? (
                              <Eye weight="duotone" size={14} aria-hidden="true" />
                            ) : (
                              <EyeSlash weight="duotone" size={14} aria-hidden="true" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteProduct(product)}
                            disabled={busyId === product.slug}
                            title="Delete product"
                            className="inline-flex size-11 items-center justify-center rounded-[10px] border border-primary/10 text-ink-muted transition-colors hover:border-red-500/40 hover:text-red-700 disabled:opacity-50"
                          >
                            <Trash weight="duotone" size={14} aria-hidden="true" />
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
        <section aria-label="Categories" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-ink-muted">
              {categories.length} categor{categories.length === 1 ? "y" : "ies"}
            </span>
            <button
              type="button"
              onClick={() => openCategoryModal()}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-[10px] border border-primary/20 bg-surface px-3 py-2 text-sm font-semibold text-ink transition-colors hover:border-primary/40 hover:bg-surface-alt"
            >
              <Plus weight="duotone" size={14} aria-hidden="true" />
              Add category
            </button>
          </div>

          {loading ? (
            <AdminTableSkeleton columns={4} />
          ) : categories.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-primary/20 bg-surface p-10 text-center text-sm text-ink-muted">
              No categories yet. Add your first category above.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-primary/10 bg-surface">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead>
                  <tr className="border-b border-primary/10 text-xs uppercase tracking-wider text-ink-muted">
                    <th className="px-4 py-3 font-medium">Image</th>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Short</th>
                    <th className="px-4 py-3 font-medium">Visible</th>
                    <th className="px-4 py-3 font-medium">Sort</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary/10">
                  {categories.map((category) => (
                    <tr key={category.id} className="align-top">
                      <td className="px-4 py-3">
                        {(category.imageUrl ?? category.image) ? (
                          <img
                            src={category.imageUrl ?? category.image}
                            alt={category.name}
                            className="size-10 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="size-10 rounded-lg border border-primary/10 bg-surface-alt" />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-ink">{category.name}</div>
                        <div className="font-mono text-xs text-ink-muted">{category.id}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-muted">{category.short || "—"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex size-2.5 rounded-full ${category.visible !== false ? "bg-emerald-600" : "bg-ink-muted/30"}`}
                          aria-label={category.visible !== false ? "Visible" : "Hidden"}
                        />
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-ink-muted">{category.sortOrder ?? 0}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openCategoryModal(category)}
                            title="Edit category"
                            className="inline-flex size-11 items-center justify-center rounded-[10px] border border-primary/10 text-ink-muted transition-colors hover:border-primary/40 hover:text-[#0d3d1a]"
                          >
                            <PencilSimple weight="duotone" size={14} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void (category.visible !== false ? hideCategory(category) : showCategory(category))}
                            disabled={busyId === category.id}
                            title={category.visible !== false ? "Hide category" : "Show category"}
                            className="inline-flex size-11 items-center justify-center rounded-[10px] border border-primary/10 text-ink-muted transition-colors hover:border-primary/40 hover:text-[#0d3d1a] disabled:opacity-50"
                          >
                            {category.visible !== false ? (
                              <EyeSlash weight="duotone" size={14} aria-hidden="true" />
                            ) : (
                              <Eye weight="duotone" size={14} aria-hidden="true" />
                            )}
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
      )}

      {modalMode === "product" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label={modalTitle}>
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-primary/10 bg-surface p-6 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-display text-lg font-semibold tracking-tight text-ink">{modalTitle}</h3>
              <button
                type="button"
                onClick={closeModal}
                className="inline-flex size-11 items-center justify-center rounded-[10px] border border-primary/10 text-ink-muted transition-colors hover:border-primary/40 hover:text-ink"
              >
                <X weight="duotone" size={16} aria-hidden="true" />
              </button>
            </div>

            {formError ? (
              <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-700" role="alert">
                {formError}
              </div>
            ) : null}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (editSlug) void updateProduct();
                else void submitProduct();
              }}
              className="mt-4 grid gap-4"
              noValidate
            >
              <div>
                <label htmlFor="p-name" className="text-sm font-medium text-ink">Name <span className="text-accent-dark">*</span></label>
                <input
                  id="p-name"
                  type="text"
                  maxLength={120}
                  value={productForm.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setProductForm((f) => ({ ...f, name, slug: f.slug || slugify(name) }));
                  }}
                  aria-invalid={formErrors.name ? true : undefined}
                  className={`mt-2 ${inputClass(formErrors.name)}`}
                />
                {formErrors.name ? <p role="alert" className="mt-1 text-xs text-red-700">{formErrors.name}</p> : null}
              </div>

              <div>
                <label htmlFor="p-slug" className="text-sm font-medium text-ink">Slug <span className="text-accent-dark">*</span></label>
                <input
                  id="p-slug"
                  type="text"
                  maxLength={120}
                  value={productForm.slug}
                  onChange={(e) => setProductForm((f) => ({ ...f, slug: e.target.value }))}
                  placeholder="auto-generated from name"
                  aria-invalid={formErrors.slug ? true : undefined}
                  className={`mt-2 ${inputClass(formErrors.slug)}`}
                />
                {formErrors.slug ? <p role="alert" className="mt-1 text-xs text-red-700">{formErrors.slug}</p> : null}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="p-category" className="text-sm font-medium text-ink">Category <span className="text-accent-dark">*</span></label>
                  <select
                    id="p-category"
                    value={productForm.categoryId}
                    onChange={(e) => setProductForm((f) => ({ ...f, categoryId: e.target.value }))}
                    aria-invalid={formErrors.categoryId ? true : undefined}
                    className={`mt-2 ${inputClass(formErrors.categoryId)}`}
                  >
                    <option value="" disabled>Select…</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  {formErrors.categoryId ? <p role="alert" className="mt-1 text-xs text-red-700">{formErrors.categoryId}</p> : null}
                </div>
                <div>
                  <label htmlFor="p-brand" className="text-sm font-medium text-ink">Brand</label>
                  <select
                    id="p-brand"
                    value={brandIsCustom ? OTHER_BRAND : productForm.brand || ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === OTHER_BRAND) {
                        setBrandIsCustom(true);
                        if (ALL_BRAND_OPTIONS.includes(productForm.brand)) {
                          setProductForm((f) => ({ ...f, brand: "" }));
                        }
                      } else {
                        setBrandIsCustom(false);
                        setProductForm((f) => ({ ...f, brand: value }));
                      }
                    }}
                    className={`mt-2 ${inputClass(formErrors.brand)}`}
                  >
                    <option value="" disabled>Select…</option>
                    {AFRICAN_CONSTRUCTION_BRAND_GROUPS.map((group) => (
                      <optgroup key={group.label} label={group.label}>
                        {group.brands.map((b) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </optgroup>
                    ))}
                    <option value={OTHER_BRAND}>Other (specify below)</option>
                  </select>
                  {brandIsCustom ? (
                    <input
                      type="text"
                      aria-label="Custom brand"
                      maxLength={80}
                      value={productForm.brand}
                      onChange={(e) => setProductForm((f) => ({ ...f, brand: e.target.value }))}
                      placeholder="Type a brand not listed…"
                      className={`mt-2 ${inputClass(formErrors.brand)}`}
                    />
                  ) : null}
                  {formErrors.brand ? <p role="alert" className="mt-1 text-xs text-red-700">{formErrors.brand}</p> : null}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="p-unit" className="text-sm font-medium text-ink">Unit</label>
                  <input
                    id="p-unit"
                    type="text"
                    list="unit-options"
                    maxLength={30}
                    value={productForm.unit}
                    onChange={(e) => setProductForm((f) => ({ ...f, unit: e.target.value }))}
                    placeholder="e.g. bag, kg, metre"
                    className={`mt-2 ${inputClass(formErrors.unit)}`}
                  />
                  <datalist id="unit-options">
                    <option value="Bag" />
                    <option value="Piece" />
                    <option value="Pack" />
                    <option value="Box" />
                    <option value="Roll" />
                    <option value="Metre" />
                    <option value="Bucket" />
                    <option value="Load" />
                    <option value="Truck" />
                    <option value="Ton" />
                    <option value="Other" />
                  </datalist>
                  {formErrors.unit ? <p role="alert" className="mt-1 text-xs text-red-700">{formErrors.unit}</p> : null}
                </div>
                <div>
                  <label htmlFor="p-kind" className="text-sm font-medium text-ink">Kind</label>
                  <select
                    id="p-kind"
                    value={productForm.kind}
                    onChange={(e) => setProductForm((f) => ({ ...f, kind: e.target.value as "unit" | "measure" }))}
                    className={`mt-2 ${inputClass(formErrors.kind)}`}
                  >
                    <option value="unit">Unit</option>
                    <option value="measure">Measure</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="p-pricing" className="text-sm font-medium text-ink">Pricing mode</label>
                  <select
                    id="p-pricing"
                    value={productForm.pricingMode}
                    onChange={(e) => setProductForm((f) => ({ ...f, pricingMode: e.target.value as "fixed" | "quote" }))}
                    className={`mt-2 ${inputClass(formErrors.pricingMode)}`}
                  >
                    <option value="quote">Price on request</option>
                    <option value="fixed">Fixed price</option>
                  </select>
                </div>
                {productForm.pricingMode === "fixed" ? (
                  <div>
                    <label htmlFor="p-price" className="text-sm font-medium text-ink">Unit price</label>
                    <input
                      id="p-price"
                      type="text"
                      maxLength={30}
                      value={productForm.unitPrice}
                      onChange={(e) => setProductForm((f) => ({ ...f, unitPrice: e.target.value }))}
                      placeholder="e.g. 450.00"
                      className={`mt-2 ${inputClass(formErrors.unitPrice)}`}
                    />
                    {formErrors.unitPrice ? <p role="alert" className="mt-1 text-xs text-red-700">{formErrors.unitPrice}</p> : null}
                  </div>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="inline-flex items-center gap-2 text-sm text-ink">
                    <input
                      type="checkbox"
                      checked={productForm.trackInventory}
                      onChange={(e) => setProductForm((f) => ({ ...f, trackInventory: e.target.checked }))}
                      className="size-4 rounded border-primary/30 accent-[#0d3d1a]"
                    />
                    Track inventory
                  </label>
                  <p className="mt-1 text-xs text-ink-muted">
                    {productForm.trackInventory
                      ? "Status is computed from quantity automatically."
                      : "Shown as Available on Request on the site."}
                  </p>
                </div>
                <div>
                  <label htmlFor="p-sort" className="text-sm font-medium text-ink">Sort order</label>
                  <input
                    id="p-sort"
                    type="number"
                    min={0}
                    max={9999}
                    value={productForm.sortOrder}
                    onChange={(e) => setProductForm((f) => ({ ...f, sortOrder: Number(e.target.value) || 0 }))}
                    className={`mt-2 ${inputClass(formErrors.sortOrder)}`}
                  />
                </div>
              </div>

              {productForm.trackInventory ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="p-qty" className="text-sm font-medium text-ink">Available quantity</label>
                    <input
                      id="p-qty"
                      type="number"
                      min={0}
                      value={productForm.stockQuantity}
                      onChange={(e) => setProductForm((f) => ({ ...f, stockQuantity: Math.max(0, Number(e.target.value) || 0) }))}
                      className={`mt-2 ${inputClass(formErrors.stockQuantity)}`}
                    />
                    {formErrors.stockQuantity ? <p role="alert" className="mt-1 text-xs text-red-700">{formErrors.stockQuantity}</p> : null}
                  </div>
                  <div>
                    <label htmlFor="p-threshold" className="text-sm font-medium text-ink">Low stock threshold</label>
                    <input
                      id="p-threshold"
                      type="number"
                      min={0}
                      value={productForm.lowStockThreshold}
                      onChange={(e) => setProductForm((f) => ({ ...f, lowStockThreshold: Math.max(0, Number(e.target.value) || 0) }))}
                      className={`mt-2 ${inputClass(formErrors.lowStockThreshold)}`}
                    />
                    <p className="mt-1 text-xs text-ink-muted">Default: 10. Items at or below this show as Limited.</p>
                    {formErrors.lowStockThreshold ? <p role="alert" className="mt-1 text-xs text-red-700">{formErrors.lowStockThreshold}</p> : null}
                  </div>
                </div>
              ) : null}

              <div>
                <label htmlFor="p-image" className="text-sm font-medium text-ink">Image URL</label>
                <div className="mt-2 flex gap-2">
                  <input
                    id="p-image"
                    type="url"
                    maxLength={500}
                    value={productForm.imageUrl}
                    onChange={(e) => setProductForm((f) => ({ ...f, imageUrl: e.target.value }))}
                    placeholder="https://…"
                    className={`flex-1 ${inputClass(formErrors.imageUrl)}`}
                  />
                  <label
                    className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-[10px] border border-primary/20 bg-surface px-3 py-2 text-sm font-semibold text-ink transition-colors hover:border-primary/40 hover:bg-surface-alt"
                  >
                    <UploadSimple weight="duotone" size={14} aria-hidden="true" />
                    Upload
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const url = await handleImageUpload(file, productForm.slug || productForm.name);
                        if (url) setProductForm((f) => ({ ...f, imageUrl: url }));
                      }}
                    />
                  </label>
                  {productForm.imageUrl ? (
                    <button
                      type="button"
                      onClick={() => setProductForm((f) => ({ ...f, imageUrl: "" }))}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-[10px] border border-red-500/30 bg-surface px-3 py-2 text-sm font-semibold text-red-700 transition-colors hover:border-red-500/50 hover:bg-red-500/5"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
                <ImageUrlPreview url={productForm.imageUrl} />
                {formErrors.imageUrl ? <p role="alert" className="mt-1 text-xs text-red-700">{formErrors.imageUrl}</p> : null}
              </div>

              <div>
                <label htmlFor="p-desc" className="text-sm font-medium text-ink">Description</label>
                <textarea
                  id="p-desc"
                  rows={3}
                  maxLength={2000}
                  value={productForm.description}
                  onChange={(e) => setProductForm((f) => ({ ...f, description: e.target.value }))}
                  className={`mt-2 ${inputClass(formErrors.description)}`}
                />
                {formErrors.description ? <p role="alert" className="mt-1 text-xs text-red-700">{formErrors.description}</p> : null}
              </div>

              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={productForm.visible}
                    onChange={(e) => setProductForm((f) => ({ ...f, visible: e.target.checked }))}
                    className="size-4 rounded border-primary/30 accent-[#0d3d1a]"
                  />
                  Visible on site
                </label>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={formBusy}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] bg-accent px-5 py-2 text-sm font-semibold text-[#0d3d1a] transition-colors hover:bg-accent-light disabled:opacity-60"
                >
                  {formBusy ? "Saving…" : editSlug ? "Update product" : "Add product"}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="inline-flex min-h-11 items-center rounded-[10px] px-3 py-2 text-sm font-medium text-ink-muted hover:text-ink"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {modalMode === "category" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label={modalTitle}>
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-primary/10 bg-surface p-6 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-display text-lg font-semibold tracking-tight text-ink">{modalTitle}</h3>
              <button
                type="button"
                onClick={closeModal}
                className="inline-flex size-11 items-center justify-center rounded-[10px] border border-primary/10 text-ink-muted transition-colors hover:border-primary/40 hover:text-ink"
              >
                <X weight="duotone" size={16} aria-hidden="true" />
              </button>
            </div>

            {formError ? (
              <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-700" role="alert">
                {formError}
              </div>
            ) : null}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (editCatId) void updateCategory();
                else void submitCategory();
              }}
              className="mt-4 grid gap-4"
              noValidate
            >
              <div>
                <label htmlFor="c-id" className="text-sm font-medium text-ink">ID <span className="text-accent-dark">*</span></label>
                <input
                  id="c-id"
                  type="text"
                  maxLength={60}
                  value={categoryForm.id}
                  onChange={(e) => setCategoryForm((f) => ({ ...f, id: e.target.value }))}
                  disabled={!!editCatId}
                  aria-invalid={formErrors.id ? true : undefined}
                  className={`mt-2 ${inputClass(formErrors.id)} ${editCatId ? "opacity-60" : ""}`}
                />
                {formErrors.id ? <p role="alert" className="mt-1 text-xs text-red-700">{formErrors.id}</p> : null}
              </div>

              <div>
                <label htmlFor="c-name" className="text-sm font-medium text-ink">Name <span className="text-accent-dark">*</span></label>
                <input
                  id="c-name"
                  type="text"
                  maxLength={80}
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm((f) => ({ ...f, name: e.target.value }))}
                  aria-invalid={formErrors.name ? true : undefined}
                  className={`mt-2 ${inputClass(formErrors.name)}`}
                />
                {formErrors.name ? <p role="alert" className="mt-1 text-xs text-red-700">{formErrors.name}</p> : null}
              </div>

              <div>
                <label htmlFor="c-short" className="text-sm font-medium text-ink">Short name</label>
                <input
                  id="c-short"
                  type="text"
                  maxLength={40}
                  value={categoryForm.short}
                  onChange={(e) => setCategoryForm((f) => ({ ...f, short: e.target.value }))}
                  className={`mt-2 ${inputClass(formErrors.short)}`}
                />
                {formErrors.short ? <p role="alert" className="mt-1 text-xs text-red-700">{formErrors.short}</p> : null}
              </div>

              <div>
                <label htmlFor="c-image" className="text-sm font-medium text-ink">Image URL</label>
                <div className="mt-2 flex gap-2">
                  <input
                    id="c-image"
                    type="url"
                    maxLength={500}
                    value={categoryForm.imageUrl}
                    onChange={(e) => setCategoryForm((f) => ({ ...f, imageUrl: e.target.value }))}
                    placeholder="https://…"
                    className={`flex-1 ${inputClass(formErrors.imageUrl)}`}
                  />
                  <label
                    className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-[10px] border border-primary/20 bg-surface px-3 py-2 text-sm font-semibold text-ink transition-colors hover:border-primary/40 hover:bg-surface-alt"
                  >
                    <UploadSimple weight="duotone" size={14} aria-hidden="true" />
                    Upload
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const url = await handleImageUpload(file, categoryForm.id || categoryForm.name);
                        if (url) setCategoryForm((f) => ({ ...f, imageUrl: url }));
                      }}
                    />
                  </label>
                  {categoryForm.imageUrl ? (
                    <button
                      type="button"
                      onClick={() => setCategoryForm((f) => ({ ...f, imageUrl: "" }))}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-[10px] border border-red-500/30 bg-surface px-3 py-2 text-sm font-semibold text-red-700 transition-colors hover:border-red-500/50 hover:bg-red-500/5"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
                <ImageUrlPreview url={categoryForm.imageUrl} />
                {formErrors.imageUrl ? <p role="alert" className="mt-1 text-xs text-red-700">{formErrors.imageUrl}</p> : null}
              </div>

              <div>
                <label htmlFor="c-desc" className="text-sm font-medium text-ink">Description</label>
                <textarea
                  id="c-desc"
                  rows={3}
                  maxLength={2000}
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm((f) => ({ ...f, description: e.target.value }))}
                  className={`mt-2 ${inputClass(formErrors.description)}`}
                />
                {formErrors.description ? <p role="alert" className="mt-1 text-xs text-red-700">{formErrors.description}</p> : null}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="c-sort" className="text-sm font-medium text-ink">Sort order</label>
                  <input
                    id="c-sort"
                    type="number"
                    min={0}
                    max={9999}
                    value={categoryForm.sortOrder}
                    onChange={(e) => setCategoryForm((f) => ({ ...f, sortOrder: Number(e.target.value) || 0 }))}
                    className={`mt-2 ${inputClass(formErrors.sortOrder)}`}
                  />
                </div>
                <div className="flex items-end pb-1">
                  <label className="inline-flex items-center gap-2 text-sm text-ink">
                    <input
                      type="checkbox"
                      checked={categoryForm.visible}
                      onChange={(e) => setCategoryForm((f) => ({ ...f, visible: e.target.checked }))}
                      className="size-4 rounded border-primary/30 accent-[#0d3d1a]"
                    />
                    Visible on site
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={formBusy}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] bg-accent px-5 py-2 text-sm font-semibold text-[#0d3d1a] transition-colors hover:bg-accent-light disabled:opacity-60"
                >
                  {formBusy ? "Saving…" : editCatId ? "Update category" : "Add category"}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="inline-flex min-h-11 items-center rounded-[10px] px-3 py-2 text-sm font-medium text-ink-muted hover:text-ink"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
