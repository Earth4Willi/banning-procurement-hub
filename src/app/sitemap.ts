import type { MetadataRoute } from "next";
import { categories } from "@/lib/site";

const BASE = "https://banningprocurementhub.com";
const staticRoutes = ["", "/products", "/quote", "/about", "/contact", "/privacy", "/terms"];

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = staticRoutes.map((r) => ({ url: `${BASE}${r === "" ? "/" : `${r}/`}`, lastModified: new Date() }));
  const cats = categories.map((c) => ({ url: `${BASE}/products/${c.id}/`, lastModified: new Date() }));
  return [...pages, ...cats];
}
