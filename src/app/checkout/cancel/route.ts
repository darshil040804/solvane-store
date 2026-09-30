import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { cancelCheckout } from "@/lib/checkout";
import { getOrderForCustomer } from "@/lib/orders";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Stripe's cancel_url: the customer left Checkout. Expire the session with
// Stripe, return the reserved stock, and send them back to the review page.
export async function GET(request: NextRequest) {
  const orderId = request.nextUrl.searchParams.get("order");
  const session = await getSession();
  if (!session) {
    redirect(`/sign-in?redirectTo=${encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)}`);
  }
  if (!orderId || !UUID.test(orderId)) redirect("/cart");

  const order = await getOrderForCustomer({ orderId }, session.user.id);
  if (!order || order.status !== "pending") redirect("/cart");

  const result = await cancelCheckout({
    id: order.id,
    sessionId: order.stripeCheckoutSessionId,
    createdAt: order.createdAt,
  });
  if (result === "completed" && order.stripeCheckoutSessionId) {
    // They paid after all (e.g. in another tab); let the webhook confirm it.
    redirect(`/checkout/success?session_id=${order.stripeCheckoutSessionId}`);
  }
  redirect("/checkout?checkout=cancelled");
}
