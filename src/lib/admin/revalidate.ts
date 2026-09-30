import "server-only";

import { revalidatePath } from "next/cache";

/**
 * After an admin changes products or stock: storefront pages show catalog data
 * with a 60-second cache, so refresh them now, along with the admin views.
 * Only call this from admin server actions.
 */
export function revalidateCatalog(productIds: string[]) {
  revalidatePath("/");
  revalidatePath("/collections/new-in");
  revalidatePath("/products/[slug]", "page");
  revalidatePath("/admin/products");
  revalidatePath("/admin/inventory");
  for (const id of new Set(productIds)) revalidatePath(`/admin/products/${id}`);
}
