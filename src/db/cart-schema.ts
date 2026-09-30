import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";
import { products } from "./catalog-schema";

// One row per (user, product, size). Prices are never stored here: the cart
// always reads the current products.price_cents.
export const cartItems = pgTable(
  "cart_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    // A product_stock size. Not a foreign key: the seed replaces stock rows,
    // which would empty every cart. A missing size reads as unavailable.
    size: text("size").notNull(),
    quantity: integer("quantity").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    unique("cart_items_user_product_size_unique").on(
      table.userId,
      table.productId,
      table.size,
    ),
    check("cart_items_quantity_positive", sql`${table.quantity} > 0`),
    index("cart_items_user_id_idx").on(table.userId),
  ],
);

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  user: one(user, { fields: [cartItems.userId], references: [user.id] }),
  product: one(products, {
    fields: [cartItems.productId],
    references: [products.id],
  }),
}));
