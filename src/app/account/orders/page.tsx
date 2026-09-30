import type { Metadata } from "next";
import Link from "next/link";
import {
  orderDate,
  orderItemCount,
  orderTotalCents,
  OrderStatusBadge,
  OrderThumbnail,
} from "@/components/orders/order-parts";
import { requireSession } from "@/lib/auth/session";
import { formatOrderNumber, formatPrice } from "@/lib/format";
import { getOrdersForCustomer } from "@/lib/orders";

export const metadata: Metadata = {
  title: "My orders | Solvane",
  robots: { index: false },
};

const MAX_THUMBNAILS = 3;

// Rendered inside the account layout. Only the signed-in customer's own orders
// are ever queried (see getOrdersForCustomer).
export default async function OrdersPage() {
  const { user } = await requireSession("/account/orders");
  const orders = await getOrdersForCustomer(user.id);

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-heading">My orders</h1>
        <p className="text-body text-ink-muted">
          {orders.length === 0
            ? "Your orders will appear here."
            : "Review your past orders and their payment status."}
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-start gap-6 border-t pt-8">
          <p className="text-body text-ink-muted">You haven&apos;t placed any orders yet.</p>
          <Link href="/collections/new-in" className="btn btn-secondary">
            Discover new arrivals
          </Link>
        </div>
      ) : (
        <ul aria-label="Your orders" className="border-t">
          {orders.map((order) => {
            const count = orderItemCount(order);
            const shown = order.items.slice(0, MAX_THUMBNAILS);
            const extra = order.items.length - shown.length;
            return (
              <li
                key={order.id}
                aria-label={`Order ${formatOrderNumber(order.id)}`}
                className="relative flex flex-col gap-4 border-b py-6 transition-colors duration-150 ease-standard hover:bg-surface-muted sm:flex-row sm:justify-between sm:gap-8 sm:px-4"
              >
                <div className="flex min-w-0 flex-col gap-4">
                  <div className="flex min-w-0 flex-col gap-1">
                    <h2 className="text-body">
                      {/* Stretched link: the whole row opens the order. */}
                      <Link
                        href={`/account/orders/${order.id}`}
                        className="after:absolute after:inset-0"
                      >
                        Order {formatOrderNumber(order.id)}
                      </Link>
                    </h2>
                    <p className="text-body-sm text-ink-muted">
                      <time dateTime={(order.paidAt ?? order.createdAt).toISOString()}>
                        {orderDate(order)}
                      </time>{" "}
                      · {count} {count === 1 ? "item" : "items"}
                    </p>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  {/* Below the text so every row shares one left edge. */}
                  <div aria-hidden="true" className="flex gap-1">
                    {shown.map((item) => (
                      <OrderThumbnail
                        key={item.id}
                        item={item}
                        sizes="4rem"
                        className="w-12 shrink-0 sm:w-14"
                      />
                    ))}
                    {extra > 0 && (
                      <div className="grid w-12 shrink-0 place-items-center bg-surface-sunken text-caption text-ink-muted sm:w-14">
                        +{extra}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-baseline justify-between gap-6 sm:flex-col sm:items-end sm:gap-1">
                  <p data-testid="order-list-total" className="text-body">
                    {formatPrice(orderTotalCents(order))}
                  </p>
                  <span aria-hidden="true" className="link-cta text-body-sm">
                    View details
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
