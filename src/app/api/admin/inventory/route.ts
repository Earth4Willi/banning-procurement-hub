import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { audit, getSupabaseClient } from "@/server/audit";
import { fetchProducts, updateProduct } from "@/server/catalog-store";
import { verifySameOrigin } from "@/server/csrf";
import { requireStaff } from "@/server/require-staff";
import { revalidatePublic } from "@/server/revalidate";
import { withErrorHandling } from "@/server/with-error-handling";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const adjustSchema = z
  .object({
    slug: z.string().trim().min(1).max(120),
    quantity: z.number().int().min(0),
    changeType: z.enum(["stock_addition", "stock_adjustment", "manual_correction"]),
    referenceId: z.string().trim().max(120).optional(),
    note: z.string().trim().max(500).optional(),
  })
  .strict();

/** GET — inventory summary + all products with inventory fields */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const principal = await requireStaff(request, ["inventory"]);
  if (!principal) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Admin sign-in required." } },
      { status: 403 },
    );
  }

  const products = await fetchProducts();
  const summary = {
    total: products.length,
    inStock: products.filter((p) => p.trackInventory && p.stockStatus === "in").length,
    limited: products.filter((p) => p.trackInventory && p.stockStatus === "limited").length,
    outOfStock: products.filter((p) => p.trackInventory && p.stockStatus === "out").length,
    onRequest: products.filter((p) => !p.trackInventory).length,
  };

  return NextResponse.json({ products, summary });
});

/** PATCH — manual inventory adjustment */
export const PATCH = withErrorHandling(async (request: NextRequest) => {
  const principal = await requireStaff(request, ["inventory"]);
  if (!principal) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Admin sign-in required." } },
      { status: 403 },
    );
  }
  verifySameOrigin(request);

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return NextResponse.json(
      { error: { code: "invalid_encoding", message: "Request body could not be read." } },
      { status: 400 },
    );
  }

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return NextResponse.json(
      { error: { code: "invalid_json", message: "Expected a JSON body." } },
      { status: 400 },
    );
  }

  const parsed = adjustSchema.safeParse(value);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "validation_failed",
          message: "One or more fields are invalid.",
          details: parsed.error.issues.map((issue) => ({
            field: issue.path.join(".") || "(root)",
            message: issue.message,
          })),
        },
      },
      { status: 400 },
    );
  }

  const { slug, quantity, changeType, referenceId, note } = parsed.data;

  // Look up current product
  const products = await fetchProducts();
  const product = products.find((p) => p.slug === slug);
  if (!product) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Product not found." } },
      { status: 404 },
    );
  }

  if (!product.trackInventory) {
    return NextResponse.json(
      { error: { code: "invalid_operation", message: "Cannot adjust inventory for non-tracked products." } },
      { status: 400 },
    );
  }

  const previousQuantity = product.stockQuantity;
  const quantityChanged = quantity - previousQuantity;
  const newQuantity = quantity;

  if (newQuantity < 0) {
    return NextResponse.json(
      { error: { code: "validation_failed", message: "Quantity cannot be negative." } },
      { status: 400 },
    );
  }

  // Update product
  const ok = await updateProduct(slug, {
    stockQuantity: newQuantity,
  });

  if (!ok) {
    return NextResponse.json(
      { error: { code: "storage_unavailable", message: "Live database not configured — inventory not updated." } },
      { status: 503 },
    );
  }

  // Write history
  const client = getSupabaseClient();
  if (client) {
    // Resolve product UUID
    const { data: row } = await client
      .from("products")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (row) {
      await client.from("inventory_history").insert({
        product_id: row.id,
        previous_quantity: previousQuantity,
        quantity_changed: quantityChanged,
        new_quantity: newQuantity,
        change_type: changeType,
        reference_id: referenceId ?? null,
        changed_by: principal.email ?? "owner",
      });
    }
  }

  await audit("inventory_adjusted", { slug, previousQuantity, newQuantity, changeType });
  revalidatePublic();

  return NextResponse.json({ ok: true, previousQuantity, newQuantity });
});