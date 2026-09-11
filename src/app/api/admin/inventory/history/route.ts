import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/server/audit";
import { requireStaff } from "@/server/require-staff";
import { withErrorHandling } from "@/server/with-error-handling";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET — inventory change history, newest first */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const principal = await requireStaff(request, ["inventory"]);
  if (!principal) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Admin sign-in required." } },
      { status: 403 },
    );
  }

  const client = getSupabaseClient();
  if (!client) {
    return NextResponse.json({ history: [] });
  }

  const url = new URL(request.url);
  const productId = url.searchParams.get("product_id");
  const rawLimit = Number(url.searchParams.get("limit") ?? "100");
  const limit = Math.min(Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 100, 500);

  let query = client
    .from("inventory_history")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (productId) {
    query = query.eq("product_id", productId);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ history: [] });
  }

  // Enrich with product slug/name so the UI never needs a slug↔uuid join.
  const { data: productRows } = await client
    .from("products")
    .select("id, slug, name");
  const productById = new Map<string, { slug: string; name: string }>(
    (productRows ?? []).map((row) => [
      String(row.id),
      { slug: String(row.slug), name: String(row.name) },
    ]),
  );

  const history = (data ?? []).map((row) => {
    const product = productById.get(String((row as { product_id?: unknown }).product_id ?? ""));
    return {
      ...row,
      productSlug: product?.slug ?? null,
      productName: product?.name ?? null,
    };
  });

  return NextResponse.json({ history });
});