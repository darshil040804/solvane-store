"use server";

import { type AdminResult, isId } from "@/lib/admin/action";
import { adjustStockBy } from "@/lib/admin/catalog";
import { parseAdjustment } from "@/lib/admin/product-input";
import { revalidateCatalog } from "@/lib/admin/revalidate";
import { getAdminSession } from "@/lib/auth/session";

// Inventory mutations. Like every admin action, this checks the admin role
// before anything else (actions are reachable by direct POST) and validates
// all input on the server.

/**
 * Adds or removes units for one size ("+5" received, "-2" damaged), relative
 * to the current available quantity, so it never overwrites a concurrent
 * checkout reservation or release.
 */
export async function adjustStock(
  stockId: unknown,
  delta: unknown,
): Promise<AdminResult<{ quantity: number }>> {
  if (!(await getAdminSession())) return { status: "forbidden" };
  if (!isId(stockId)) return { status: "not-found" };

  const parsed = parseAdjustment(delta);
  if (!parsed.ok) return { status: "invalid", errors: parsed.errors };

  const result = await adjustStockBy(stockId, parsed.value);
  if (!result.ok) {
    if (result.error === "not-found") return { status: "not-found" };
    return {
      status: "conflict",
      message:
        parsed.value < 0
          ? `Only ${result.quantity} available, so ${-parsed.value} can't be removed.`
          : `That would take this size over 9,999 units (it has ${result.quantity}).`,
    };
  }

  revalidateCatalog([result.productId]);
  return { status: "ok", quantity: result.quantity };
}
