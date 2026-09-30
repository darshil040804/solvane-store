import "server-only";

import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import type Stripe from "stripe";
import { db } from "@/db";
import {
  orderItems,
  orders,
  productImages,
  stripeEvents,
  type ShippingAddress,
} from "@/db/schema";
import type { Cart } from "@/lib/cart";

// Order lifecycle. Stock is reserved when an order is created and released
// exactly once if it is cancelled, expires or fails. Every transition is a
// guarded `where status = …` statement, so retries and duplicate Stripe events
// are harmless. Orders only become paid from verified Stripe webhook events.

/** How long stock is held for a checkout. Stripe requires expires_at ≥ 30 min. */
export const CHECKOUT_HOLD_MINUTES = 31;

export class StockUnavailableError extends Error {
  constructor() {
    super("Stock changed before checkout could start");
  }
}

/** Finds a Postgres error code/constraint through driver and ORM wrappers. */
function pgError(error: unknown): { code?: string; constraint?: string } {
  let current: unknown = error;
  for (let depth = 0; current && depth < 5; depth++) {
    const candidate = current as { code?: unknown; constraint?: unknown; cause?: unknown };
    if (typeof candidate.code === "string") {
      return {
        code: candidate.code,
        constraint: typeof candidate.constraint === "string" ? candidate.constraint : undefined,
      };
    }
    current = candidate.cause;
  }
  return {};
}

/**
 * Creates a pending order from a validated cart and reserves its stock, in one
 * transaction. Prices are the cart's server-side prices; nothing comes from the
 * client. Throws StockUnavailableError if any size no longer has enough stock
 * (the product_stock non-negative check rolls the whole batch back).
 */
export async function createPendingOrder(
  customer: { id: string; email: string },
  cart: Cart,
) {
  const orderId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + CHECKOUT_HOLD_MINUTES * 60_000);
  const lines = cart.lines.map((line) => ({
    orderId,
    productId: line.productId,
    productName: line.name,
    size: line.stockSize,
    unitPriceCents: line.unitPriceCents,
    quantity: line.quantity,
  }));
  const subtotalCents = lines.reduce(
    (total, line) => total + line.unitPriceCents * line.quantity,
    0,
  );

  try {
    await db.batch([
      db.insert(orders).values({
        id: orderId,
        userId: customer.id,
        email: customer.email,
        subtotalCents,
        expiresAt,
      }),
      db.insert(orderItems).values(lines),
      db.execute(sql`
        update product_stock s set quantity = s.quantity - oi.quantity
        from order_items oi
        where oi.order_id = ${orderId}
          and s.product_id = oi.product_id and s.size = oi.size
      `),
    ]);
  } catch (error) {
    const { code, constraint } = pgError(error);
    if (code === "23514" && constraint === "product_stock_quantity_non_negative") {
      throw new StockUnavailableError();
    }
    throw error;
  }

  return { orderId, expiresAt, subtotalCents, lines };
}

/** Links the Checkout Session; false if the order stopped being pending meanwhile. */
export async function attachCheckoutSession(orderId: string, sessionId: string) {
  const updated = await db
    .update(orders)
    .set({ stripeCheckoutSessionId: sessionId })
    .where(and(eq(orders.id, orderId), eq(orders.status, "pending")))
    .returning({ id: orders.id });
  return updated.length === 1;
}

function recordEvent(event: Stripe.Event) {
  return db
    .insert(stripeEvents)
    .values({ id: event.id, type: event.type })
    .onConflictDoNothing();
}

export async function hasProcessedEvent(eventId: string) {
  const [row] = await db
    .select({ id: stripeEvents.id })
    .from(stripeEvents)
    .where(eq(stripeEvents.id, eventId));
  return Boolean(row);
}

export async function recordStripeEvent(event: Stripe.Event) {
  await recordEvent(event);
}

type ReleaseStatus = "cancelled" | "expired" | "failed";

/**
 * Moves a pending order to `status` and puts its stock back, in one statement:
 * stock is restored only if this call is the one that left `pending`.
 * With `sessionId`, only acts if the order belongs to that Checkout Session.
 */
function releaseStatement(
  orderId: string,
  status: ReleaseStatus,
  options: { sessionId?: string; paymentFailed?: boolean } = {},
) {
  const sessionGuard = options.sessionId
    ? sql`and (stripe_checkout_session_id = ${options.sessionId} or stripe_checkout_session_id is null)`
    : sql``;
  return db.execute<{ released: number }>(sql`
    with released as (
      update orders
      set status = ${status},
          payment_status = ${options.paymentFailed ? "failed" : "unpaid"},
          updated_at = now()
      where id = ${orderId} and status = 'pending' ${sessionGuard}
      returning id
    ), restocked as (
      update product_stock s set quantity = s.quantity + oi.quantity
      from order_items oi join released r on r.id = oi.order_id
      where s.product_id = oi.product_id and s.size = oi.size
      returning s.id
    )
    select count(*)::int as released from released
  `);
}

/** Returns true if this call released the order (false if it wasn't pending). */
export async function releaseOrder(
  orderId: string,
  status: ReleaseStatus,
  options: { sessionId?: string; paymentFailed?: boolean; event?: Stripe.Event } = {},
) {
  const release = releaseStatement(orderId, status, options);
  if (options.event) {
    const [result] = await db.batch([release, recordEvent(options.event)]);
    return result.rows[0]?.released === 1;
  }
  const result = await release;
  return result.rows[0]?.released === 1;
}

function shippingFrom(session: Stripe.Checkout.Session) {
  const details = session.collected_information?.shipping_details;
  if (!details) return { name: null, address: null };
  const { address } = details;
  const shipping: ShippingAddress = {
    line1: address.line1 ?? "",
    line2: address.line2,
    city: address.city ?? "",
    state: address.state ?? "",
    postalCode: address.postal_code ?? "",
    country: address.country ?? "",
  };
  return { name: details.name, address: shipping };
}

export type PaidResult = "paid" | "needs_review" | "already_processed" | "unknown_order";

/**
 * Marks the order for a paid Checkout Session as paid and removes the purchased
 * lines from the customer's cart. Only call this with a session from a verified
 * webhook event whose payment_status isn't "unpaid".
 *
 * If the charged amount or currency doesn't match the order, or the order had
 * already been released (e.g. a race with cancellation), the order is marked
 * needs_review instead so the payment is never lost.
 */
export async function markOrderPaid(
  session: Stripe.Checkout.Session,
  event: Stripe.Event,
): Promise<PaidResult> {
  const orderId = session.metadata?.orderId;
  if (!orderId || session.client_reference_id !== orderId) {
    await recordStripeEvent(event);
    return "unknown_order";
  }

  const [order] = await db
    .select({
      status: orders.status,
      subtotalCents: orders.subtotalCents,
      currency: orders.currency,
      sessionId: orders.stripeCheckoutSessionId,
    })
    .from(orders)
    .where(eq(orders.id, orderId));
  if (!order || (order.sessionId && order.sessionId !== session.id)) {
    await recordStripeEvent(event);
    return "unknown_order";
  }
  if (order.status === "paid" || order.status === "needs_review") {
    await recordStripeEvent(event);
    return "already_processed";
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;
  // A paid Checkout Session in payment mode always has a PaymentIntent; fail
  // loudly (Stripe retries) rather than record an incomplete payment.
  if (!paymentIntentId || session.amount_total === null) {
    throw new Error(`Paid session ${session.id} has no payment intent or amount`);
  }

  const amountMatches =
    session.amount_total === order.subtotalCents &&
    session.currency === order.currency;
  // Stock for a released order was already returned; a person must follow up.
  const status = amountMatches && order.status === "pending" ? "paid" : "needs_review";
  const shipping = shippingFrom(session);

  const [result] = await db.batch([
    db.execute<{ updated: number }>(sql`
      with paid as (
        update orders
        set status = ${status},
            payment_status = 'paid',
            amount_paid_cents = ${session.amount_total},
            stripe_checkout_session_id = ${session.id},
            stripe_payment_intent_id = ${paymentIntentId},
            shipping_name = ${shipping.name},
            shipping_address = ${shipping.address ? JSON.stringify(shipping.address) : null}::jsonb,
            paid_at = now(),
            updated_at = now()
        where id = ${orderId} and status = ${order.status}
        returning id, user_id
      ), cleared as (
        delete from cart_items ci
        using paid, order_items oi
        where oi.order_id = paid.id
          and ci.user_id = paid.user_id
          and ci.product_id = oi.product_id
          and ci.size = oi.size
        returning ci.id
      )
      select count(*)::int as updated from paid
    `),
    recordEvent(event),
  ]);

  // Another delivery won the race between our read and the guarded update.
  if (result.rows[0]?.updated !== 1) return "already_processed";
  return status;
}

const orderWith = {
  items: {
    // The product may have been deleted since; snapshots on the item still apply.
    with: {
      product: {
        with: { images: { orderBy: [asc(productImages.position)], limit: 1 } },
      },
    },
  },
};

/** A customer's order with its lines, or null if it isn't theirs. */
export async function getOrderForCustomer(
  where: { orderId: string } | { sessionId: string },
  userId: string,
) {
  const order = await db.query.orders.findFirst({
    where: and(
      "orderId" in where
        ? eq(orders.id, where.orderId)
        : eq(orders.stripeCheckoutSessionId, where.sessionId),
      eq(orders.userId, userId),
    ),
    with: orderWith,
  });
  return order ?? null;
}

export type CustomerOrder = NonNullable<Awaited<ReturnType<typeof getOrderForCustomer>>>;

/** Statuses shown in order history. */
const HISTORY_STATUSES = ["paid", "needs_review", "pending"] as const;

/**
 * Order history lists orders that took or may have taken a payment: paid ones
 * (including those flagged for review) and pending ones. Pending orders stay
 * listed even after their stock hold lapses: a delayed payment method can keep
 * a completed checkout processing for days, and a late webhook can leave a paid
 * order pending for a while. Abandoned checkouts leave this list when Stripe's
 * expiry event marks them expired. Failed, cancelled and expired checkouts never
 * charged anything, so they aren't orders from the customer's point of view.
 */
export function isInOrderHistory(order: Pick<CustomerOrder, "status">) {
  return (HISTORY_STATUSES as readonly string[]).includes(order.status);
}

/** The signed-in customer's order history, newest first. Only their own orders. */
export async function getOrdersForCustomer(userId: string) {
  return db.query.orders.findMany({
    where: and(eq(orders.userId, userId), inArray(orders.status, [...HISTORY_STATUSES])),
    orderBy: [desc(orders.createdAt)],
    limit: 100,
    with: orderWith,
  });
}

/** The customer's orders that are still waiting for Checkout. */
export async function getPendingOrders(userId: string) {
  return db
    .select({
      id: orders.id,
      sessionId: orders.stripeCheckoutSessionId,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(and(eq(orders.userId, userId), eq(orders.status, "pending")));
}
