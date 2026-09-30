import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";
import { products } from "./catalog-schema";

// Orders created at checkout. Amounts are integer cents computed on the server
// from the catalog; payment status is only ever set from Stripe server data
// (verified webhooks or a server-side Checkout Session lookup).

/** Order lifecycle. Every transition is a guarded `where status = …` update. */
export const orderStatus = pgEnum("order_status", [
  "pending", // stock reserved, waiting for Stripe Checkout
  "paid",
  "cancelled", // customer left Checkout; stock released
  "expired", // Checkout Session expired; stock released
  "failed", // payment or session creation failed; stock released
  "needs_review", // paid, but the charged amount didn't match the order
]);

/** Payment state as reported by Stripe, kept separate from the order lifecycle. */
export const paymentStatus = pgEnum("payment_status", ["unpaid", "paid", "failed"]);

/** Shipping details copied from the Checkout Session once paid. */
export type ShippingAddress = {
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Orders are financial records: deleting a customer who has orders is
    // refused rather than cascaded.
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    status: orderStatus("status").notNull().default("pending"),
    paymentStatus: paymentStatus("payment_status").notNull().default("unpaid"),
    currency: text("currency").notNull().default("usd"),
    /** Sum of order_items at checkout, computed on the server. */
    subtotalCents: integer("subtotal_cents").notNull(),
    /** What Stripe actually charged; set when paid. */
    amountPaidCents: integer("amount_paid_cents"),
    email: text("email").notNull(),
    stripeCheckoutSessionId: text("stripe_checkout_session_id").unique(),
    stripePaymentIntentId: text("stripe_payment_intent_id").unique(),
    shippingName: text("shipping_name"),
    shippingAddress: jsonb("shipping_address").$type<ShippingAddress>(),
    /** When the reservation lapses; mirrors the Checkout Session's expires_at. */
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("orders_user_id_idx").on(table.userId),
    index("orders_status_idx").on(table.status),
    check("orders_subtotal_non_negative", sql`${table.subtotalCents} >= 0`),
    check(
      "orders_amount_paid_non_negative",
      sql`${table.amountPaidCents} is null or ${table.amountPaidCents} >= 0`,
    ),
    // Only paid (or paid-but-mismatched) orders can have a paid payment…
    check(
      "orders_payment_matches_status",
      sql`(${table.paymentStatus} = 'paid') = (${table.status} in ('paid', 'needs_review'))`,
    ),
    // …and a paid payment always records what Stripe charged, and when.
    check(
      "orders_paid_details_present",
      sql`${table.paymentStatus} <> 'paid' or (
        ${table.paidAt} is not null
        and ${table.amountPaidCents} is not null
        and ${table.stripePaymentIntentId} is not null
        and ${table.stripeCheckoutSessionId} is not null
      )`,
    ),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    // Kept as history if the product is later deleted.
    productId: uuid("product_id").references(() => products.id, {
      onDelete: "set null",
    }),
    // Snapshots taken at checkout; later catalog changes don't affect the order.
    productName: text("product_name").notNull(),
    size: text("size").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    quantity: integer("quantity").notNull(),
  },
  (table) => [
    index("order_items_order_id_idx").on(table.orderId),
    check("order_items_quantity_positive", sql`${table.quantity} > 0`),
    check("order_items_unit_price_non_negative", sql`${table.unitPriceCents} >= 0`),
  ],
);

/** Stripe webhook events already processed, for de-duplication and audit. */
export const stripeEvents = pgTable("stripe_events", {
  /** Stripe event id (evt_…). */
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(user, { fields: [orders.userId], references: [user.id] }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));
