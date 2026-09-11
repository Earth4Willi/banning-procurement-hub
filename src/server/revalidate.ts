import { revalidatePath } from "next/cache";

/**
 * Invalidates the public pages that draw from the DB-backed catalog and
 * settings, so admin writes (settings + catalog) appear without a rebuild.
 * Called from write route handlers only.
 */
export function revalidatePublic(): void {
  revalidatePath("/", "layout");
  revalidatePath("/products", "layout");
  // The client catalog fetch is ISR-stale up to 60s; poke it too so admin
  // writes appear immediately in the quote builder and contact form.
  revalidatePath("/api/catalog");
}
