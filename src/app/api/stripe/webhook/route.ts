import Stripe from "stripe";
import {
  hasProcessedEvent,
  markOrderPaid,
  recordStripeEvent,
  releaseOrder,
} from "@/lib/orders";

// Stripe webhook endpoint: the only place an order becomes paid. Browser
// redirects (the success page) never change payment or order state.
//
// Subscribe the endpoint to exactly these events (Dashboard or CLI):
//   stripe listen --forward-to localhost:3000/api/stripe/webhook \
//     --events checkout.session.completed,checkout.session.async_payment_succeeded,checkout.session.async_payment_failed,checkout.session.expired
//
// Duplicate deliveries are safe twice over: processed event ids are recorded
// in stripe_events and skipped, and every order transition is a guarded
// `where status = …` update, so a concurrent duplicate can't apply twice.

const HANDLED_EVENTS = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
] as const;

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return new Response("Webhook not configured", { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  // The signature covers the exact raw body, so read it as text, and verify it
  // before looking at anything in the payload. Only the signing secret is
  // needed here, not the API key.
  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = Stripe.webhooks.constructEvent(body, signature, secret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  if (!(HANDLED_EVENTS as readonly string[]).includes(event.type)) {
    // Not part of the checkout flow; acknowledge so Stripe doesn't retry.
    return Response.json({ received: true, ignored: true });
  }
  if (await hasProcessedEvent(event.id)) {
    return Response.json({ received: true, duplicate: true });
  }

  try {
    await handleEvent(event);
  } catch (error) {
    // A 500 makes Stripe retry later; the handlers are safe to run again.
    console.error(`Stripe webhook ${event.type} (${event.id}) failed`, error);
    return new Response("Webhook handler failed", { status: 500 });
  }
  return Response.json({ received: true });
}

async function handleEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object;
      // Delayed payment methods complete the session before the money arrives;
      // those orders stay pending until async_payment_succeeded or _failed.
      if (session.payment_status === "unpaid") {
        await recordStripeEvent(event);
        return;
      }
      const result = await markOrderPaid(session, event);
      if (result === "needs_review" || result === "unknown_order") {
        console.warn(`Checkout session ${session.id}: order ${result}`);
      }
      return;
    }

    case "checkout.session.async_payment_failed":
    case "checkout.session.expired": {
      const session = event.data.object;
      const orderId = session.metadata?.orderId;
      if (!orderId || session.client_reference_id !== orderId) {
        await recordStripeEvent(event);
        return;
      }
      await releaseOrder(
        orderId,
        event.type === "checkout.session.expired" ? "expired" : "failed",
        {
          sessionId: session.id,
          paymentFailed: event.type === "checkout.session.async_payment_failed",
          event,
        },
      );
      return;
    }
  }
}
