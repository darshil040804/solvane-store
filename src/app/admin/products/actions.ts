"use server";

import { type AdminResult, isId } from "@/lib/admin/action";
import {
  type CatalogWriteError,
  insertProduct,
  setStockQuantities,
  updateProduct as saveProduct,
} from "@/lib/admin/catalog";
import {
  parseInitialStock,
  parseProductFields,
  parseStockChanges,
} from "@/lib/admin/product-input";
import { revalidateCatalog } from "@/lib/admin/revalidate";
import { getAdminSession } from "@/lib/auth/session";

// Admin product mutations. Each one checks the admin role before anything else
// (these are reachable by direct POST, whatever the page does), validates every
// input on the server, and returns a result instead of throwing.

const writeErrors: Record<CatalogWriteError, Record<string, string>> = {
  "slug-taken": { slug: "Another product already uses this slug." },
  "category-missing": { categoryId: "That category no longer exists. Choose another." },
};

export async function createProduct(input: unknown): Promise<AdminResult<{ id: string }>> {
  if (!(await getAdminSession())) return { status: "forbidden" };

  const { fields: fieldsInput, stock: stockInput } = (input ?? {}) as {
    fields?: unknown;
    stock?: unknown;
  };
  const fields = parseProductFields(fieldsInput);
  const stock = parseInitialStock(stockInput);
  if (!fields.ok || !stock.ok) {
    return {
      status: "invalid",
      errors: { ...(fields.ok ? {} : fields.errors), ...(stock.ok ? {} : stock.errors) },
    };
  }

  const result = await insertProduct(fields.value, stock.value);
  if (!result.ok) return { status: "invalid", errors: writeErrors[result.error] };
  revalidateCatalog([result.id]);
  return { status: "ok", id: result.id };
}

/** Saves a product's details, category, price and images. */
export async function updateProduct(productId: unknown, fields: unknown): Promise<AdminResult> {
  if (!(await getAdminSession())) return { status: "forbidden" };
  if (!isId(productId)) return { status: "not-found" };

  const parsed = parseProductFields(fields);
  if (!parsed.ok) return { status: "invalid", errors: parsed.errors };

  const result = await saveProduct(productId, parsed.value);
  if (!result.ok) {
    if (result.error === "not-found") return { status: "not-found" };
    return { status: "invalid", errors: writeErrors[result.error] };
  }
  revalidateCatalog([productId]);
  return { status: "ok" };
}

/**
 * Sets available quantities per size. Sizes that changed since the admin
 * loaded the page (a checkout reserved or released stock) are left alone and
 * reported back as `stale`, so a concurrent change is never overwritten.
 */
export async function updateAvailability(
  productId: unknown,
  changes: unknown,
): Promise<AdminResult<{ stale: string[] }>> {
  if (!(await getAdminSession())) return { status: "forbidden" };
  if (!isId(productId)) return { status: "not-found" };

  const parsed = parseStockChanges(changes);
  if (!parsed.ok) return { status: "invalid", errors: parsed.errors };

  const updated = await setStockQuantities(productId, parsed.value);
  revalidateCatalog([productId]);
  return {
    status: "ok",
    stale: parsed.value.map((change) => change.stockId).filter((id) => !updated.has(id)),
  };
}
