import "server-only";

import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  categories,
  orderItems,
  orders,
  productImages,
  products,
  productStock,
} from "@/db/schema";
import {
  type InventoryFilters,
  MAX_QUANTITY,
  type ProductFields,
  type StockChange,
  type StockRows,
} from "@/lib/admin/product-input";
import { LOW_STOCK_THRESHOLD } from "@/lib/format";
import { pgError } from "@/lib/pg-error";

// Admin catalog reads and writes. Only admin pages and admin server actions
// import this module, and each of them checks the admin role first. Unlike
// src/lib/products.ts it returns raw rows (ids, per-size quantities), not the
// storefront view model.

export type CatalogWriteError = "slug-taken" | "category-missing";

export async function listCategoryOptions() {
  return db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .orderBy(asc(categories.name));
}

export type CategoryOption = Awaited<ReturnType<typeof listCategoryOptions>>[number];

/** Every product, newest first, with its category, card image and stock rows. */
export async function listAdminProducts() {
  return db.query.products.findMany({
    orderBy: [desc(products.createdAt)],
    with: {
      category: { columns: { name: true } },
      images: { orderBy: [asc(productImages.position)], limit: 1 },
      stock: { orderBy: [asc(productStock.position)] },
    },
  });
}

/**
 * One product with all its images and stock rows. `held` is how many units of
 * each size are reserved by checkouts still in progress; `quantity` is already
 * net of those, so on hand = quantity + held.
 */
export async function getAdminProduct(id: string) {
  const product = await db.query.products.findFirst({
    where: eq(products.id, id),
    with: {
      category: { columns: { id: true, name: true } },
      images: { orderBy: [asc(productImages.position)] },
      stock: { orderBy: [asc(productStock.position)] },
    },
  });
  if (!product) return null;

  const held = await heldUnits([id]);
  return {
    ...product,
    stock: product.stock.map((row) => ({ ...row, held: held(row.productId, row.size) })),
  };
}

/**
 * Units reserved by checkouts still in progress, per product and size. Order
 * lines point at sizes by label, the same way checkout reserves and releases.
 */
async function heldUnits(productIds: string[]) {
  const rows =
    productIds.length === 0
      ? []
      : await db
          .select({
            productId: orderItems.productId,
            size: orderItems.size,
            quantity: sql<number>`sum(${orderItems.quantity})`.mapWith(Number),
          })
          .from(orderItems)
          .innerJoin(orders, eq(orders.id, orderItems.orderId))
          .where(and(inArray(orderItems.productId, productIds), eq(orders.status, "pending")))
          .groupBy(orderItems.productId, orderItems.size);
  const bySize = new Map(rows.map((row) => [`${row.productId}:${row.size}`, row.quantity]));
  return (productId: string, size: string) => bySize.get(`${productId}:${size}`) ?? 0;
}

/**
 * One row per product size for the inventory page, ordered by product name and
 * size position. `quantity` is available to sell; `held` is in checkouts.
 */
export async function listInventory({ q, status }: InventoryFilters) {
  const conditions = [];
  if (q) {
    const pattern = `%${q.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
    conditions.push(
      sql`(${products.name} ilike ${pattern} or ${products.slug} ilike ${pattern})`,
    );
  }
  if (status === "out") conditions.push(eq(productStock.quantity, 0));
  if (status === "low") {
    conditions.push(sql`${productStock.quantity} between 1 and ${LOW_STOCK_THRESHOLD}`);
  }

  const rows = await db
    .select({
      id: productStock.id,
      productId: products.id,
      productName: products.name,
      productSlug: products.slug,
      categoryName: categories.name,
      size: productStock.size,
      quantity: productStock.quantity,
    })
    .from(productStock)
    .innerJoin(products, eq(products.id, productStock.productId))
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(products.name), asc(products.id), asc(productStock.position))
    .limit(1000);

  const held = await heldUnits([...new Set(rows.map((row) => row.productId))]);
  return rows.map((row) => ({ ...row, held: held(row.productId, row.size) }));
}

export type InventoryRow = Awaited<ReturnType<typeof listInventory>>[number];

export type AdminProduct = NonNullable<Awaited<ReturnType<typeof getAdminProduct>>>;

function productValues(fields: ProductFields) {
  return {
    name: fields.name,
    slug: fields.slug,
    categoryId: fields.categoryId,
    priceCents: fields.priceCents,
    color: fields.color,
    description: fields.description,
    details: fields.details,
    care: fields.care,
    isNew: fields.isNew,
    audience: fields.audience,
  };
}

function imageRows(productId: string, fields: ProductFields) {
  return fields.images.map((image, position) => ({ productId, ...image, position }));
}

/** Maps the constraint violations an admin can cause to a form error; rethrows the rest. */
function writeError(error: unknown): CatalogWriteError {
  const { code, constraint } = pgError(error);
  if (code === "23505" && constraint === "products_slug_unique") return "slug-taken";
  if (code === "23503" && constraint === "products_category_id_categories_id_fk") {
    return "category-missing";
  }
  throw error;
}

/**
 * Creates a product with its images and stock in one transaction, so pages that
 * list products never see it without an image or stock rows.
 */
export async function insertProduct(
  fields: ProductFields,
  stock: StockRows,
): Promise<{ ok: true; id: string } | { ok: false; error: CatalogWriteError }> {
  const id = crypto.randomUUID();
  try {
    await db.batch([
      db.insert(products).values({ id, ...productValues(fields) }),
      db.insert(productImages).values(imageRows(id, fields)),
      db.insert(productStock).values(
        stock.map((row, position) => ({ productId: id, ...row, position })),
      ),
    ]);
  } catch (error) {
    return { ok: false, error: writeError(error) };
  }
  return { ok: true, id };
}

/**
 * Updates a product's details, category, price and images in one transaction.
 * Images are replaced as a set (positions follow the list order). Stock rows
 * are never touched here; availability has its own update.
 */
export async function updateProduct(
  id: string,
  fields: ProductFields,
): Promise<{ ok: true } | { ok: false; error: CatalogWriteError | "not-found" }> {
  const [existing] = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.id, id));
  if (!existing) return { ok: false, error: "not-found" };

  try {
    await db.batch([
      db.update(products).set(productValues(fields)).where(eq(products.id, id)),
      db.delete(productImages).where(eq(productImages.productId, id)),
      db.insert(productImages).values(imageRows(id, fields)),
    ]);
  } catch (error) {
    return { ok: false, error: writeError(error) };
  }
  return { ok: true };
}

/**
 * Sets new available quantities for a product's sizes. Each row only changes if
 * it still holds the value the admin started from: checkouts reserve and
 * release stock concurrently, and a blind overwrite would undo those changes.
 * Returns the ids of the rows that were updated; the others had moved on.
 */
export async function setStockQuantities(productId: string, changes: StockChange[]) {
  const payload = JSON.stringify(
    changes.map(({ stockId, expected, quantity }) => ({ id: stockId, expected, quantity })),
  );
  const { rows } = await db.execute<{ id: string }>(sql`
    update product_stock s set quantity = c.quantity
    from jsonb_to_recordset(${payload}::jsonb) as c(id uuid, expected int, quantity int)
    where s.id = c.id and s.product_id = ${productId} and s.quantity = c.expected
    returning s.id
  `);
  return new Set(rows.map((row) => row.id));
}

/**
 * Changes one size's available quantity by `delta`, relative to whatever it is
 * at that moment, in a single statement. Checkout reservations and releases on
 * the same row apply before or after it (row lock), so none of them is lost.
 * The result must stay within 0–MAX_QUANTITY; otherwise nothing changes.
 */
export async function adjustStockBy(
  stockId: string,
  delta: number,
): Promise<
  | { ok: true; productId: string; quantity: number }
  | { ok: false; error: "not-found" }
  | { ok: false; error: "out-of-range"; quantity: number }
> {
  const [updated] = await db
    .update(productStock)
    .set({ quantity: sql`${productStock.quantity} + ${delta}` })
    .where(
      and(
        eq(productStock.id, stockId),
        sql`${productStock.quantity} + ${delta} between 0 and ${MAX_QUANTITY}`,
      ),
    )
    .returning({ productId: productStock.productId, quantity: productStock.quantity });
  if (updated) return { ok: true, ...updated };

  // Nothing changed: tell a missing size apart from one the change doesn't fit.
  const [current] = await db
    .select({ quantity: productStock.quantity })
    .from(productStock)
    .where(eq(productStock.id, stockId));
  return current
    ? { ok: false, error: "out-of-range", quantity: current.quantity }
    : { ok: false, error: "not-found" };
}
