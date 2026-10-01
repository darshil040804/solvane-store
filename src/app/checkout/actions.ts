"use server";

import { revalidatePath } from "next/cache";
import { ONE_SIZE } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { getCart } from "@/lib/cart";
import { cancelPendingCheckouts } from "@/lib/checkout";
import {
  attachCheckoutSession,
  createPendingOrder,
  releaseOrder,
  StockUnavailableError,
} from "@/lib/orders";
import { appUrl, CHECKOUT_INTEGRATION_ID, getStripe } from "@/lib/stripe";

export type CheckoutResult =
  | { status: "redirect"; url: string }
  | { status: "unauthenticated" }
  | { status: "empty" }
  | { status: "cart-changed"; message: string }
  | { status: "error"; message: string };

/**
 * Starts Stripe Checkout for the signed-in customer's bag. Takes no input:
 * the customer comes from the session, and every price, total and stock level
 * from PostgreSQL. On success it returns the Stripe Checkout URL to open.
 */
export async function startCheckout(): Promise<CheckoutResult> {
  const session = await getSession();
  if (!session) return { status: "unauthenticated" };
  const { user } = session;

  // Return stock held by an earlier checkout the customer abandoned.
  await cancelPendingCheckouts(user.id);

  const cart = await getCart(user.id);
  if (cart.lines.length === 0) return { status: "empty" };
  if (cart.lines.some((line) => line.issue)) {
    revalidatePath("/cart");
    return {
      status: "cart-changed",
      message: "Availability has changed for some pieces. Please review your bag.",
    };
  }

  let order;
  try {
    order = await createPendingOrder({ id: user.id, email: user.email }, cart);
  } catch (error) {
    if (!(error instanceof StockUnavailableError)) throw error;
    revalidatePath("/cart");
    return {
      status: "cart-changed",
      message: "Some pieces sold out while you were checking out. Please review your bag.",
    };
  }

  const imageBySize = new Map(
    cart.lines.map((line) => [`${line.productId}:${line.stockSize}`, line.image?.src]),
  );
  let checkoutUrl: string | null;
  try {
    const checkout = await getStripe().checkout.sessions.create(
      {
        mode: "payment",
        line_items: order.lines.map((line) => {
          const image = imageBySize.get(`${line.productId}:${line.size}`);
          return {
            quantity: line.quantity,
            price_data: {
              currency: "usd",
              unit_amount: line.unitPriceCents,
              product_data: {
                name:
                  line.size === ONE_SIZE
                    ? line.productName
                    : `${line.productName} — Size ${line.size}`,
                ...(image && { images: [image] }),
                metadata: { productId: line.productId, size: line.size },
              },
            },
          };
        }),
        client_reference_id: order.orderId,
        metadata: { orderId: order.orderId },
        payment_intent_data: { metadata: { orderId: order.orderId } },
        customer_email: user.email,
        shipping_address_collection: { allowed_countries: ["US"] },
        expires_at: Math.floor(order.expiresAt.getTime() / 1000),
        success_url: `${appUrl()}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl()}/checkout/cancel?order=${order.orderId}`,
        integration_identifier: CHECKOUT_INTEGRATION_ID,
      },
      { idempotencyKey: `checkout-session-${order.orderId}` },
    );

    if (!(await attachCheckoutSession(order.orderId, checkout.id))) {
      // The order was released while Stripe was creating the session.
      await getStripe().checkout.sessions.expire(checkout.id).catch(() => {});
      throw new Error("Order was released before checkout started");
    }
    checkoutUrl = checkout.url;
  } catch (error) {
    console.error("Could not start Stripe Checkout", error);
    await releaseOrder(order.orderId, "failed");
    return {
      status: "error",
      message: "We couldn't start checkout. Please try again in a moment.",
    };
  }

  if (!checkoutUrl) {
    await releaseOrder(order.orderId, "failed");
    return { status: "error", message: "We couldn't start checkout. Please try again." };
  }
  // The browser navigates itself: a server redirect to an external URL reaches
  // the client as a rejected action, which briefly showed an error first.
  return { status: "redirect", url: checkoutUrl };
}
