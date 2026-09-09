import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { audit } from "@/server/audit";
import { createCategory, deleteCategory, fetchCategories, updateCategory } from "@/server/catalog-store";
import { requireOwner } from "@/server/require-owner";
import { catalogItemIdSchema, categorySchema, parseBody } from "@/server/validate";
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
  const categories = await fetchCategories();
  return NextResponse.json({ categories, dbAvailable: categories.length > 0 });
});

export const POST = withErrorHandling(async (request: NextRequest) => {
  const blocked = await guard(request);
  if (blocked) return blocked;
  const body = await parseBody(request, categorySchema);
  const ok = await createCategory({
    id: body.id,
    name: body.name,
    short: body.short,
    description: body.description,
    image_url: body.imageUrl,
    sortOrder: body.sortOrder,
    visible: body.visible,
  });
  if (!ok) {
    return NextResponse.json(
      { error: { code: "storage_unavailable", message: "Live database not configured — category not saved." } },
      { status: 503 },
    );
  }
  await audit("catalog_category_created", { id: body.id });
  return NextResponse.json({ ok: true }, { status: 201 });
});

export const PUT = withErrorHandling(async (request: NextRequest) => {
  const blocked = await guard(request);
  if (blocked) return blocked;
  const body = await parseBody(request, categorySchema);
  const ok = await updateCategory(body.id, {
    name: body.name,
    short: body.short,
    description: body.description,
    image_url: body.imageUrl,
    sortOrder: body.sortOrder,
    visible: body.visible,
  });
  if (!ok) {
    return NextResponse.json(
      { error: { code: "storage_unavailable", message: "Live database not configured — category not updated." } },
      { status: 503 },
    );
  }
  await audit("catalog_category_updated", { id: body.id });
  return NextResponse.json({ ok: true });
});

export const DELETE = withErrorHandling(async (request: NextRequest) => {
  const blocked = await guard(request);
  if (blocked) return blocked;
  const body = await parseBody(request, catalogItemIdSchema);
  const ok = await deleteCategory(body.id);
  if (!ok) {
    return NextResponse.json(
      { error: { code: "storage_unavailable", message: "Live database not configured — category not hidden." } },
      { status: 503 },
    );
  }
  await audit("catalog_category_deleted", { id: body.id });
  return NextResponse.json({ ok: true });
});