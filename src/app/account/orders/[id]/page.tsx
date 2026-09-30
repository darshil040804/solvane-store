import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PendingConfirmation } from "@/components/checkout/pending-confirmation";
import {
  OrderDetailsCard,
  OrderItemsSection,
  OrderStatusBadge,
  OrderStatusSection,
} from "@/components/orders/order-parts";
import { getSignedInCustomerOrder } from "@/lib/customer-orders";
import { formatOrderNumber } from "@/lib/format";
import { isInOrderHistory } from "@/lib/orders";

export const metadata: Metadata = {
  title: "Order details | Solvane",
  robots: { index: false },
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Rendered inside the account layout. getSignedInCustomerOrder takes the
// customer from the session and filters by order id AND owner, so another
// customer's order id is indistinguishable from one that doesn't exist.
export default async function OrderDetailsPage(props: PageProps<"/account/orders/[id]">) {
  const { id } = await props.params;
  if (!UUID.test(id)) notFound();

  const order = await getSignedInCustomerOrder(id, `/account/orders/${id}`);
  // Checkouts that never took a payment aren't orders in the history.
  if (!order || !isInOrderHistory(order)) notFound();

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-3">
        <Link href="/account/orders" className="eyebrow link-quiet self-start text-ink-muted">
          All orders
        </Link>
        <h1 className="text-heading">Order {formatOrderNumber(order.id)}</h1>
        <OrderStatusBadge status={order.status} />
        {order.status === "pending" && (
          // Re-reads the order every few seconds so the state stays current.
          <PendingConfirmation
            className="text-body-sm"
            message={
              <>
                We&apos;re still waiting for confirmation of your payment.
                There&apos;s no need to pay again; this page updates automatically.
              </>
            }
          />
        )}
        {order.status === "needs_review" && (
          <p role="status" className="max-w-xl text-body-sm text-ink-muted">
            We&apos;ve received your payment. Our client services team will be in
            touch to confirm your order.
          </p>
        )}
      </div>

      <OrderStatusSection order={order} />
      <OrderItemsSection order={order} />
      <OrderDetailsCard order={order} />

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Link href="/account/orders" className="btn btn-secondary">
          Back to all orders
        </Link>
        <Link href="/contact" className="link text-body-sm">
          Need help with this order?
        </Link>
      </div>
    </div>
  );
}
