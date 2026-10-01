import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { products, wishlistItems } from "@/db/schema";
import { getProductsByIds } from "@/lib/products";

// A signed-in customer's saved pieces. Every function takes the customer's id
// from the caller's session; there is no way to read another customer's list.

export async function getWishlistProductIds(userId: string) {
  const rows = await db
    .select({ productId: wishlistItems.productId })
    .from(wishlistItems)
    .where(eq(wishlistItems.userId, userId))
    .orderBy(desc(wishlistItems.createdAt));
  return rows.map((row) => row.productId);
}

/** Saved products, most recently saved first. */
export async function getWishlistProducts(userId: string) {
  return getProductsByIds(await getWishlistProductIds(userId));
}

/** Saves or removes a product. Returns false if the product doesn't exist. */
export async function setWishlisted(userId: string, productId: string, saved: boolean) {
  if (saved) {
    const [product] = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, productId));
    if (!product) return false;
    await db.insert(wishlistItems).values({ userId, productId }).onConflictDoNothing();
  } else {
    await db
      .delete(wishlistItems)
      .where(and(eq(wishlistItems.userId, userId), eq(wishlistItems.productId, productId)));
  }
  return true;
}
