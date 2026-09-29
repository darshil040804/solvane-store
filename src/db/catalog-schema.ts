import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

// Catalog tables: categories, products, their images and per-size stock.

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    details: text("details")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    care: text("care").notNull().default(""),
    color: text("color"),
    // Integer cents; the store sells in USD only for now.
    priceCents: integer("price_cents").notNull(),
    isNew: boolean("is_new").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("products_category_id_idx").on(table.categoryId),
    check("products_price_cents_non_negative", sql`${table.priceCents} >= 0`),
  ],
);

export const productImages = pgTable(
  "product_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    alt: text("alt").notNull(),
    // 0 is the primary image used on product cards.
    position: integer("position").notNull(),
  },
  (table) => [
    unique("product_images_product_id_position_unique").on(
      table.productId,
      table.position,
    ),
  ],
);

/** Size label of the single stock row of an unsized product. */
export const ONE_SIZE = "One size";

// One row per size; products without sizes have a single ONE_SIZE row.
export const productStock = pgTable(
  "product_stock",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    size: text("size").notNull(),
    position: integer("position").notNull(),
    quantity: integer("quantity").notNull().default(0),
  },
  (table) => [
    unique("product_stock_product_id_size_unique").on(
      table.productId,
      table.size,
    ),
    unique("product_stock_product_id_position_unique").on(
      table.productId,
      table.position,
    ),
    check("product_stock_quantity_non_negative", sql`${table.quantity} >= 0`),
  ],
);

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  images: many(productImages),
  stock: many(productStock),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, {
    fields: [productImages.productId],
    references: [products.id],
  }),
}));

export const productStockRelations = relations(productStock, ({ one }) => ({
  product: one(products, {
    fields: [productStock.productId],
    references: [products.id],
  }),
}));
