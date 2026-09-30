import Image from "next/image";
import type { ReactNode } from "react";
import { ONE_SIZE } from "@/db/schema";
import { formatOrderDate, formatOrderNumber, formatPrice } from "@/lib/format";
import type { CustomerOrder } from "@/lib/orders";

// Order presentation shared by the checkout confirmation page and the account's
// order history. They render only what is stored on the order.

const items = (count: number) => `${count} ${count === 1 ? "item" : "items"}`;

export const orderItemCount = (order: CustomerOrder) =>
  order.items.reduce((total, item) => total + item.quantity, 0);

export const isPaid = (order: Pick<CustomerOrder, "status">) =>
  order.status === "paid" || order.status === "needs_review";

/** The customer-facing payment status of an order. */
const statusStyles: Record<CustomerOrder["status"], { label: string; dot: string }> = {
  paid: { label: "Paid", dot: "bg-success" },
  // The money arrived; the order itself is being checked by client services.
  needs_review: { label: "Paid · Under review", dot: "bg-success" },
  pending: { label: "Awaiting confirmation", dot: "bg-ink-subtle" },
  failed: { label: "Payment failed", dot: "bg-danger" },
  cancelled: { label: "Cancelled", dot: "bg-ink-subtle" },
  expired: { label: "Expired", dot: "bg-ink-subtle" },
};

export function OrderStatusBadge({ status }: { status: CustomerOrder["status"] }) {
  const { label, dot } = statusStyles[status];
  return (
    <p className="flex items-center gap-2 text-body-sm">
      <span aria-hidden="true" className={`size-1.5 shrink-0 rounded-pill ${dot}`} />
      <span data-testid="payment-status">{label}</span>
    </p>
  );
}

export function orderDate(order: Pick<CustomerOrder, "paidAt" | "createdAt">) {
  return formatOrderDate(order.paidAt ?? order.createdAt);
}

export function orderTotalCents(order: Pick<CustomerOrder, "amountPaidCents" | "subtotalCents">) {
  return order.amountPaidCents ?? order.subtotalCents;
}

/** Product thumbnail for an order line; the product may have been deleted. */
export function OrderThumbnail({
  item,
  sizes,
  className = "",
}: {
  item: CustomerOrder["items"][number];
  sizes: string;
  className?: string;
}) {
  const image = item.product?.images[0];
  return (
    <div className={`media aspect-product ${className}`}>
      {image && <Image src={image.url} alt="" fill sizes={sizes} />}
    </div>
  );
}

/** The ordered lines with subtotal, delivery and total. */
export function OrderItemsSection({ order }: { order: CustomerOrder }) {
  const paid = isPaid(order);

  return (
    <section aria-labelledby="items-title">
      <h2 id="items-title" className="pb-4 text-title">
        Your order <span className="text-ink-muted">({items(orderItemCount(order))})</span>
      </h2>
      <ul aria-label="Items in your order" className="border-t">
        {order.items.map((item) => (
          <li
            key={item.id}
            aria-label={item.productName}
            className="grid grid-cols-[5rem_minmax(0,1fr)] gap-4 border-b py-5 sm:grid-cols-[6rem_minmax(0,1fr)] sm:gap-6"
          >
            <OrderThumbnail item={item} sizes="(min-width: 40rem) 6rem, 5rem" />
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 flex-col gap-1">
                <h3 className="text-body">{item.productName}</h3>
                {item.size !== ONE_SIZE && (
                  <p className="text-body-sm text-ink-muted">Size: {item.size}</p>
                )}
                <p className="text-body-sm text-ink-muted">
                  Qty {item.quantity} × {formatPrice(item.unitPriceCents)}
                </p>
              </div>
              <p className="shrink-0 text-body">
                {formatPrice(item.unitPriceCents * item.quantity)}
              </p>
            </div>
          </li>
        ))}
      </ul>
      <dl className="mt-6 flex flex-col gap-3 text-body-sm">
        <div className="flex justify-between gap-6">
          <dt className="text-ink-muted">Subtotal</dt>
          <dd>{formatPrice(order.subtotalCents)}</dd>
        </div>
        <div className="flex justify-between gap-6">
          <dt className="text-ink-muted">Delivery</dt>
          <dd>Complimentary</dd>
        </div>
        <div className="flex items-baseline justify-between gap-6 border-t pt-4 text-body">
          <dt>{paid ? "Total paid" : "Total"}</dt>
          <dd data-testid="order-total" className="text-body-lg">
            {formatPrice(orderTotalCents(order))}
          </dd>
        </div>
      </dl>
    </section>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-ink-muted">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

/** Order number, date, email, payment, shipping address and delivery estimate. */
export function OrderDetailsCard({
  order,
  className = "",
}: {
  order: CustomerOrder;
  className?: string;
}) {
  const paid = isPaid(order);

  return (
    <section
      aria-labelledby="details-title"
      className={`flex flex-col gap-5 bg-surface-muted p-6 md:p-8 ${className}`}
    >
      <h2 id="details-title" className="text-title">
        Order details
      </h2>
      <dl className="flex flex-col gap-4 border-t pt-4 text-body-sm">
        <Detail label="Order number">
          <span data-testid="order-number">{formatOrderNumber(order.id)}</span>
        </Detail>
        <Detail label={paid ? "Placed on" : "Started on"}>{orderDate(order)}</Detail>
        <Detail label="Email">
          <span className="break-all">{order.email}</span>
        </Detail>
        <Detail label="Payment">
          <span data-testid="payment-state">{paid ? "Paid" : "Awaiting confirmation"}</span>
        </Detail>
        {order.shippingAddress && (
          <Detail label="Shipping to">
            <address className="not-italic">
              {order.shippingName && (
                <>
                  {order.shippingName}
                  <br />
                </>
              )}
              {order.shippingAddress.line1}
              {order.shippingAddress.line2 && <>, {order.shippingAddress.line2}</>}
              <br />
              {order.shippingAddress.city}, {order.shippingAddress.state}{" "}
              {order.shippingAddress.postalCode}
            </address>
          </Detail>
        )}
        <Detail label="Delivery">Complimentary express delivery in 2–4 business days</Detail>
      </dl>
    </section>
  );
}

type Step = { label: string; detail: string; done: boolean };

/**
 * Where the order stands, from the states we actually record: placed, then
 * payment. Delivery tracking doesn't exist yet, so it isn't shown as a step.
 */
export function OrderStatusSection({ order }: { order: CustomerOrder }) {
  const paidOn = order.paidAt ? formatOrderDate(order.paidAt) : null;
  const payment: Step =
    order.status === "paid"
      ? { label: "Payment confirmed", detail: paidOn ?? "", done: true }
      : order.status === "needs_review"
        ? {
            label: "Payment received",
            detail: `${paidOn ? `${paidOn} · ` : ""}Being reviewed by client services`,
            done: true,
          }
        : { label: "Awaiting payment confirmation", detail: "Updates as soon as payment clears", done: false };
  const steps: Step[] = [
    { label: "Order placed", detail: formatOrderDate(order.createdAt), done: true },
    payment,
  ];

  return (
    <section aria-labelledby="status-title" className="flex flex-col gap-4">
      <h2 id="status-title" className="text-title">
        Order status
      </h2>
      <ol className="flex flex-col border-t sm:flex-row">
        {steps.map((step, index) => (
          <li
            key={step.label}
            aria-current={!step.done || index === steps.length - 1 ? "step" : undefined}
            className="flex flex-1 items-start gap-3 border-b py-4 sm:border-b-0 sm:pr-6"
          >
            <span
              aria-hidden="true"
              className={`mt-1.5 size-2 shrink-0 rounded-pill ${
                step.done ? "bg-success" : "border border-ink-subtle"
              }`}
            />
            <div className="flex flex-col gap-0.5">
              <p className="text-body-sm">
                {step.label}
                <span className="sr-only">{step.done ? " (complete)" : " (in progress)"}</span>
              </p>
              {step.detail && <p className="text-caption text-ink-muted">{step.detail}</p>}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
