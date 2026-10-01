import "server-only";

import { getPendingOrders, releaseOrder } from "@/lib/orders";
import { getStripe } from "@/lib/stripe";

export type CancelResult =
  | "released"
  | "completed"
  | "in_progress"
  | "not_pending"
  | "failed";

/** Stripe's answer when a session id doesn't exist on this account. */
function isMissingSession(error: unknown) {
  return (error as { code?: unknown } | null)?.code === "resource_missing";
}

/**
 * Cancels a customer's pending checkout and returns its stock, but only once
 * Stripe confirms the session can no longer be paid: the session is expired
 * first, and if Stripe reports it complete the order is left for the webhook.
 * A session that doesn't exist on this Stripe account (e.g. created with
 * another account's keys) can never be paid here, so its order is released.
 */
export async function cancelCheckout(order: {
  id: string;
  sessionId: string | null;
  createdAt: Date;
}): Promise<CancelResult> {
  if (order.sessionId) {
    const stripe = getStripe();
    try {
      await stripe.checkout.sessions.expire(order.sessionId);
    } catch (error) {
      if (!isMissingSession(error)) {
        // Stripe refuses to expire a session that is already complete or expired.
        const session = await stripe.checkout.sessions.retrieve(order.sessionId);
        if (session.status === "complete") return "completed";
        if (session.status !== "expired") throw error;
      }
    }
  } else if (Date.now() - order.createdAt.getTime() < 60_000) {
    // Another request is probably still creating this order's Stripe session.
    return "in_progress";
  }

  const released = await releaseOrder(order.id, "cancelled", {
    sessionId: order.sessionId ?? undefined,
  });
  return released ? "released" : "not_pending";
}

/**
 * Cancels every checkout the customer left unfinished, returning their stock.
 * Best effort: a checkout that can't be cleaned up is logged and left pending,
 * and never stops the customer from starting a new one.
 */
export async function cancelPendingCheckouts(userId: string) {
  const pending = await getPendingOrders(userId);
  const results = await Promise.allSettled(pending.map((order) => cancelCheckout(order)));
  return results.map((result, index): CancelResult => {
    if (result.status === "fulfilled") return result.value;
    console.error(`Could not cancel pending order ${pending[index].id}`, result.reason);
    return "failed";
  });
}
