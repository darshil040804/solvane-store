"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { cartItems, ONE_SIZE, productStock } from "@/db/schema";
import { getSession } from "@/lib/auth/session";

// Cart mutations. They accept only ids, a size and a quantity: prices always come
// from the catalog (see getCart), and every stock check happens inside the same
// SQL statement as the write, so concurrent requests can't exceed stock.
// Stock is not reserved or decremented here; that belongs to checkout.

export type CartActionResult =
  | { status: "ok"; quantity: number }
  | { status: "unauthenticated" }
  | { status: "invalid" }
  | { status: "not-found" }
  | { status: "insufficient-stock"; available: number; inCart: number };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_QUANTITY = 99;

const isId = (value: unknown): value is string => typeof value === "string" && UUID.test(value);
const isQuantity = (value: unknown): value is number =>
  Number.isInteger(value) && (value as number) >= 1 && (value as number) <= MAX_QUANTITY;

async function currentUserId() {
  const session = await getSession();
  return session?.user.id ?? null;
}

/** Current stock for a size and how many of it are already in this user's cart. */
async function availability(userId: string, productId: string, size: string) {
  const [row] = await db
    .select({
      available: productStock.quantity,
      inCart: sql<number>`coalesce(${cartItems.quantity}, 0)`.mapWith(Number),
    })
    .from(productStock)
    .leftJoin(
      cartItems,
      and(
        eq(cartItems.userId, userId),
        eq(cartItems.productId, productStock.productId),
        eq(cartItems.size, productStock.size),
      ),
    )
    .where(and(eq(productStock.productId, productId), eq(productStock.size, size)));
  return row ?? { available: 0, inCart: 0 };
}

/** Adds `quantity` of a product (and size; null for unsized products) to the cart. */
export async function addToCart(input: {
  productId: unknown;
  size: unknown;
  quantity?: unknown;
}): Promise<CartActionResult> {
  const userId = await currentUserId();
  if (!userId) return { status: "unauthenticated" };

  const { productId, quantity = 1 } = input;
  const size = input.size === null ? ONE_SIZE : input.size;
  if (
    !isId(productId) ||
    typeof size !== "string" ||
    !size ||
    size.length > 32 ||
    !isQuantity(quantity)
  ) {
    return { status: "invalid" };
  }

  // Inserts only if the size exists with enough stock; on an existing line,
  // increments only if the new total still fits within stock.
  const { rows } = await db.execute<{ quantity: number }>(sql`
    insert into cart_items (user_id, product_id, size, quantity)
    select ${userId}, s.product_id, s.size, ${quantity}
    from product_stock s
    where s.product_id = ${productId} and s.size = ${size} and s.quantity >= ${quantity}
    on conflict (user_id, product_id, size) do update
      set quantity = cart_items.quantity + excluded.quantity, updated_at = now()
      where cart_items.quantity + excluded.quantity <= (
        select quantity from product_stock
        where product_id = excluded.product_id and size = excluded.size
      )
    returning quantity
  `);

  if (rows.length === 0) {
    return { status: "insufficient-stock", ...(await availability(userId, productId, size)) };
  }
  revalidatePath("/cart");
  return { status: "ok", quantity: Number(rows[0].quantity) };
}

/** Sets a cart line's quantity, if the line belongs to the user and stock allows it. */
export async function updateCartItem(
  itemId: unknown,
  quantity: unknown,
): Promise<CartActionResult> {
  const userId = await currentUserId();
  if (!userId) return { status: "unauthenticated" };
  if (!isId(itemId) || !isQuantity(quantity)) return { status: "invalid" };

  const updated = await db
    .update(cartItems)
    .set({ quantity })
    .where(
      and(
        eq(cartItems.id, itemId),
        eq(cartItems.userId, userId),
        sql`${quantity} <= (
          select ${productStock.quantity} from ${productStock}
          where ${productStock.productId} = ${cartItems.productId}
            and ${productStock.size} = ${cartItems.size}
        )`,
      ),
    )
    .returning({ quantity: cartItems.quantity });

  if (updated.length === 0) {
    const [line] = await db
      .select({ productId: cartItems.productId, size: cartItems.size })
      .from(cartItems)
      .where(and(eq(cartItems.id, itemId), eq(cartItems.userId, userId)));
    if (!line) return { status: "not-found" };
    return {
      status: "insufficient-stock",
      ...(await availability(userId, line.productId, line.size)),
    };
  }
  revalidatePath("/cart");
  return { status: "ok", quantity: updated[0].quantity };
}

/** Removes a cart line, if it belongs to the user. */
export async function removeCartItem(itemId: unknown): Promise<CartActionResult> {
  const userId = await currentUserId();
  if (!userId) return { status: "unauthenticated" };
  if (!isId(itemId)) return { status: "invalid" };

  const removed = await db
    .delete(cartItems)
    .where(and(eq(cartItems.id, itemId), eq(cartItems.userId, userId)))
    .returning({ id: cartItems.id });

  if (removed.length === 0) return { status: "not-found" };
  revalidatePath("/cart");
  return { status: "ok", quantity: 0 };
}
