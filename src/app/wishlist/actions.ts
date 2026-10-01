"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { setWishlisted } from "@/lib/wishlist";

export type WishlistActionResult =
  | { status: "ok"; saved: boolean }
  | { status: "unauthenticated" }
  | { status: "invalid" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Saves (`saved: true`) or removes a product from the signed-in customer's wishlist. */
export async function setWishlistItem(
  productId: unknown,
  saved: unknown,
): Promise<WishlistActionResult> {
  const session = await getSession();
  if (!session) return { status: "unauthenticated" };
  if (typeof productId !== "string" || !UUID.test(productId) || typeof saved !== "boolean") {
    return { status: "invalid" };
  }
  if (!(await setWishlisted(session.user.id, productId, saved))) return { status: "invalid" };
  revalidatePath("/wishlist");
  return { status: "ok", saved };
}
