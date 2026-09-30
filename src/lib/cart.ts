import "server-only";

import { and, asc, eq, sql } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db";
import {
  cartItems,
  ONE_SIZE,
  orderItems,
  orders,
  productImages,
  products,
  productStock,
} from "@/db/schema";
import type { Photo } from "@/lib/images";

export type CartLineIssue =
  | { kind: "unavailable" }
  | { kind: "limited"; available: number };

export type CartLine = {
  id: string;
  productId: string;
  slug: string;
  name: string;
  /** Null for unsized ("One size") products. */
  size: string | null;
  /** The product_stock size this line refers to (including "One size"). */
  stockSize: string;
  /** Quantity saved in the cart. */
  quantity: number;
  /** Units available to this customer: stock plus what their own pending checkout holds. */
  available: number;
  /** Units that count towards the subtotal: min(quantity, available). */
  billableQuantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
  image: Photo | null;
  issue: CartLineIssue | null;
};

export type Cart = {
  lines: CartLine[];
  itemCount: number;
  subtotalCents: number;
};

/**
 * The user's cart priced from the current catalog. Prices are never stored in
 * the cart, and lines whose stock has dropped since they were added are
 * flagged and only billed for what is available.
 */
export const getCart = cache(async (userId: string): Promise<Cart> => {
  const rows = await db
    .select({
      id: cartItems.id,
      productId: cartItems.productId,
      size: cartItems.size,
      quantity: cartItems.quantity,
      slug: products.slug,
      name: products.name,
      unitPriceCents: products.priceCents,
      // A size that no longer exists reads as out of stock.
      available: sql<number>`coalesce(${productStock.quantity}, 0)`.mapWith(Number),
      imageUrl: productImages.url,
      imageAlt: productImages.alt,
    })
    .from(cartItems)
    .innerJoin(products, eq(products.id, cartItems.productId))
    .leftJoin(
      productStock,
      and(
        eq(productStock.productId, cartItems.productId),
        eq(productStock.size, cartItems.size),
      ),
    )
    .leftJoin(
      productImages,
      and(eq(productImages.productId, products.id), eq(productImages.position, 0)),
    )
    .where(eq(cartItems.userId, userId))
    .orderBy(asc(cartItems.createdAt));

  // Stock this customer's own unfinished checkout is holding counts as theirs,
  // so returning from Stripe with the back button doesn't show their own
  // reservation as sold out. Starting checkout again releases it first.
  const holds = await db
    .select({
      productId: orderItems.productId,
      size: orderItems.size,
      quantity: sql<number>`sum(${orderItems.quantity})`.mapWith(Number),
    })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(and(eq(orders.userId, userId), eq(orders.status, "pending")))
    .groupBy(orderItems.productId, orderItems.size);
  const held = new Map(holds.map((hold) => [`${hold.productId}:${hold.size}`, hold.quantity]));

  const lines = rows.map((row): CartLine => {
    const available = row.available + (held.get(`${row.productId}:${row.size}`) ?? 0);
    const billableQuantity = Math.min(row.quantity, available);
    return {
      id: row.id,
      productId: row.productId,
      slug: row.slug,
      name: row.name,
      size: row.size === ONE_SIZE ? null : row.size,
      stockSize: row.size,
      quantity: row.quantity,
      available,
      billableQuantity,
      unitPriceCents: row.unitPriceCents,
      lineTotalCents: row.unitPriceCents * billableQuantity,
      image: row.imageUrl ? { src: row.imageUrl, alt: row.imageAlt ?? "" } : null,
      issue:
        available <= 0
          ? { kind: "unavailable" }
          : row.quantity > available
            ? { kind: "limited", available }
            : null,
    };
  });

  return {
    lines,
    itemCount: lines.reduce((total, line) => total + line.billableQuantity, 0),
    subtotalCents: lines.reduce((total, line) => total + line.lineTotalCents, 0),
  };
});
