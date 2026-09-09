import { fetchCategories, fetchProducts } from "@/server/catalog-store";

export const dynamic = "force-static";
export const revalidate = 60;

export async function GET() {
  const [categories, products] = await Promise.all([fetchCategories(), fetchProducts()]);
  return Response.json({
    categories,
    products,
    dbAvailable: categories.length > 0 && products.length > 0,
  });
}