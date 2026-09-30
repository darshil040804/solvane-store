import "server-only";

import { requireSession } from "@/lib/auth/session";
import { getOrderForCustomer } from "@/lib/orders";

/**
 * The signed-in customer's own order, or null. The customer is taken from the
 * session here rather than passed in, so pages can't ask for another
 * customer's order: the lookup always filters by order id AND this customer.
 * Signed-out visitors are sent to sign in and brought back to `returnTo`.
 */
export async function getSignedInCustomerOrder(orderId: string, returnTo: string) {
  const { user } = await requireSession(returnTo);
  return getOrderForCustomer({ orderId }, user.id);
}
