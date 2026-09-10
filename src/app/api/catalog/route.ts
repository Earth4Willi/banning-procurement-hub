import { fetchCategories, fetchProducts } from "@/server/catalog-store";

export const dynamic = "force-static";
export const revalidate = 60;

function visibleOnly<T extends { visible?: boolean }>(items: T[]): T[] {
  return items.filter((item) => item.visible !== false);
}

export async function GET(request: Request) {
  const kind = new URL(request.url).searchParams.get("kind") ?? "catalog";
  if (kind !== "catalog") {
    return Response.json(
      { error: { code: "unknown_kind", message: `Unsupported catalog kind: ${kind}` } },
      { status: 400 },
    );
  }
  const [allCategories, allProducts] = await Promise.all([fetchCategories(), fetchProducts()]);
  const categories = visibleOnly(allCategories);
  const products = visibleOnly(allProducts);
  return Response.json({
    categories,
    products,
    dbAvailable: categories.length > 0 && products.length > 0,
  });
}