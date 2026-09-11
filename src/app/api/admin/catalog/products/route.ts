import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { audit, getSupabaseClient } from "@/server/audit";
import { createProduct, deleteProduct, fetchProducts, updateProduct } from "@/server/catalog-store";
import { verifySameOrigin } from "@/server/csrf";
import type { AdminPrincipal } from "@/server/require-staff";
import { requireStaff } from "@/server/require-staff";
import { revalidatePublic } from "@/server/revalidate";
import { catalogItemIdSchema, parseBody, productSchema, productUpdateSchema } from "@/server/validate";
import { withErrorHandling } from "@/server/with-error-handling";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GuardResult = { principal: AdminPrincipal } | NextResponse;

async function guard(request: NextRequest): Promise<GuardResult> {
  const principal = await requireStaff(request, ["materials"]);
  if (!principal) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Admin sign-in required." } },
      { status: 403 },
    );
  }
  verifySameOrigin(request);
  return { principal };
}

/** Best-effort inventory_history row; failures are logged, never fatal. */
async function recordStockHistory(input: {
  slug: string;
  previousQuantity: number;
  newQuantity: number;
  changeType: "stock_adjustment" | "stock_addition";
  changedBy: string;
}): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  const { data: row } = await client.from("products").select("id").eq("slug", input.slug).maybeSingle();
  if (!row) return;
  await client.from("inventory_history").insert({
    product_id: row.id,
    previous_quantity: input.previousQuantity,
    quantity_changed: input.newQuantity - input.previousQuantity,
    new_quantity: input.newQuantity,
    change_type: input.changeType,
    reference_id: null,
    changed_by: input.changedBy,
  });
}

export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await guard(request);
  if (auth instanceof NextResponse) return auth;
  const products = await fetchProducts();
  return NextResponse.json({ products, dbAvailable: products.length > 0 });
});

export const POST = withErrorHandling(async (request: NextRequest) => {
  const auth = await guard(request);
  if (auth instanceof NextResponse) return auth;
  const principal = auth.principal;
  const body = await parseBody(request, productSchema);
  const ok = await createProduct({
    slug: body.slug,
    categoryId: body.categoryId,
    name: body.name,
    brand: body.brand,
    unit: body.unit,
    unitPrice: body.unitPrice,
    image: body.imageUrl,
    description: body.description,
    stockQuantity: body.stockQuantity,
    lowStockThreshold: body.lowStockThreshold,
    trackInventory: body.trackInventory,
    pricingMode: body.pricingMode,
    kind: body.kind,
    visible: body.visible,
    sortOrder: body.sortOrder,
  });
  if (!ok) {
    return NextResponse.json(
      { error: { code: "storage_unavailable", message: "Live database not configured — product not saved." } },
      { status: 503 },
    );
  }
  await recordStockHistory({
    slug: body.slug,
    previousQuantity: 0,
    newQuantity: body.stockQuantity ?? 0,
    changeType: "stock_adjustment",
    changedBy: principal.email ?? "owner",
  });
  await audit("catalog_product_created", { slug: body.slug, categoryId: body.categoryId });
  revalidatePublic();
  return NextResponse.json({ ok: true }, { status: 201 });
});

export const PUT = withErrorHandling(async (request: NextRequest) => {
  const auth = await guard(request);
  if (auth instanceof NextResponse) return auth;
  const principal = auth.principal;
  const body = await parseBody(request, productUpdateSchema);

  const products = await fetchProducts();
  const current = products.find((p) => p.slug === body.slug);

  const ok = await updateProduct(body.slug, {
    categoryId: body.categoryId,
    name: body.name,
    brand: body.brand,
    unit: body.unit,
    unitPrice: body.unitPrice,
    image: body.imageUrl,
    description: body.description,
    stockQuantity: body.stockQuantity,
    lowStockThreshold: body.lowStockThreshold,
    trackInventory: body.trackInventory,
    pricingMode: body.pricingMode,
    kind: body.kind,
    visible: body.visible,
    sortOrder: body.sortOrder,
  });
  if (!ok) {
    return NextResponse.json(
      { error: { code: "storage_unavailable", message: "Live database not configured — product not updated." } },
      { status: 503 },
    );
  }
  if (current && body.stockQuantity !== undefined && body.stockQuantity !== current.stockQuantity) {
    await recordStockHistory({
      slug: body.slug,
      previousQuantity: current.stockQuantity,
      newQuantity: body.stockQuantity,
      changeType: "stock_adjustment",
      changedBy: principal.email ?? "owner",
    });
  }
  await audit("catalog_product_updated", { slug: body.slug });
  revalidatePublic();
  return NextResponse.json({ ok: true });
});

export const DELETE = withErrorHandling(async (request: NextRequest) => {
  const auth = await guard(request);
  if (auth instanceof NextResponse) return auth;
  const body = await parseBody(request, catalogItemIdSchema);
  const ok = await deleteProduct(body.id);
  if (!ok) {
    return NextResponse.json(
      { error: { code: "storage_unavailable", message: "Live database not configured — product not deleted." } },
      { status: 503 },
    );
  }
  await audit("catalog_product_deleted", { slug: body.id });
  revalidatePublic();
  return NextResponse.json({ ok: true });
});