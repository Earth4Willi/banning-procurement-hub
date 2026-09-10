import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { audit } from "@/server/audit";
import { createProduct, deleteProduct, fetchProducts, updateProduct } from "@/server/catalog-store";
import { requireOwner } from "@/server/require-owner";
import { revalidatePublic } from "@/server/revalidate";
import { catalogItemIdSchema, parseBody, productSchema } from "@/server/validate";
import { withErrorHandling } from "@/server/with-error-handling";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function guard(request: NextRequest) {
  const principal = await requireOwner(request);
  if (!principal) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Owner sign-in required." } },
      { status: 403 },
    );
  }
  return null;
}

export const GET = withErrorHandling(async (request: NextRequest) => {
  const blocked = await guard(request);
  if (blocked) return blocked;
  const products = await fetchProducts();
  return NextResponse.json({ products, dbAvailable: products.length > 0 });
});

export const POST = withErrorHandling(async (request: NextRequest) => {
  const blocked = await guard(request);
  if (blocked) return blocked;
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
    stock: body.stock,
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
  await audit("catalog_product_created", { slug: body.slug, categoryId: body.categoryId });
  revalidatePublic();
  return NextResponse.json({ ok: true }, { status: 201 });
});

export const PUT = withErrorHandling(async (request: NextRequest) => {
  const blocked = await guard(request);
  if (blocked) return blocked;
  const body = await parseBody(request, productSchema);
  const ok = await updateProduct(body.slug, {
    categoryId: body.categoryId,
    name: body.name,
    brand: body.brand,
    unit: body.unit,
    unitPrice: body.unitPrice,
    image: body.imageUrl,
    description: body.description,
    stock: body.stock,
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
  await audit("catalog_product_updated", { slug: body.slug });
  revalidatePublic();
  return NextResponse.json({ ok: true });
});

export const DELETE = withErrorHandling(async (request: NextRequest) => {
  const blocked = await guard(request);
  if (blocked) return blocked;
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