import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PendingConfirmation } from "@/components/checkout/pending-confirmation";
import {
  isPaid,
  OrderDetailsCard,
  OrderItemsSection,
} from "@/components/orders/order-parts";
import { requireSession } from "@/lib/auth/session";
import { formatOrderNumber } from "@/lib/format";
import { getOrderForCustomer, type CustomerOrder } from "@/lib/orders";

export const metadata: Metadata = {
  title: "Order confirmation | Solvane",
  robots: { index: false },
};

const SESSION_ID = /^cs_[A-Za-z0-9_]+$/;

// Read-only: this page never changes an order, and never asks Stripe anything.
// Everything shown comes from the order in our database, which only the
// verified Stripe webhook can mark paid. While the order is still pending it
// shows a waiting state that refreshes itself until the webhook confirms it.
export default async function CheckoutSuccessPage(props: PageProps<"/checkout/success">) {
  const { session_id: sessionId } = await props.searchParams;
  if (typeof sessionId !== "string" || !SESSION_ID.test(sessionId)) notFound();

  const { user } = await requireSession(
    `/checkout/success?session_id=${encodeURIComponent(sessionId)}`,
  );
  const order = await getOrderForCustomer({ sessionId }, user.id);
  if (!order) notFound();

  const paid = isPaid(order);
  const pending = order.status === "pending";

  return (
    <main className="flex-1">
      <div className="container-content section flex flex-col gap-12">
        <Heading order={order} />

        {(paid || pending) && (
          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start lg:gap-16 xl:gap-24">
            <OrderItemsSection order={order} />
            <OrderDetailsCard order={order} className="mt-10 lg:mt-0" />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          {paid ? (
            <>
              <Link href="/collections/new-in" className="btn btn-secondary">
                Continue shopping
              </Link>
              <Link href="/account" className="link text-body-sm">
                Go to your account
              </Link>
            </>
          ) : pending ? null : (
            <>
              <Link href="/cart" className="btn btn-secondary">
                Return to your bag
              </Link>
              <Link href="/collections/new-in" className="link text-body-sm">
                Continue shopping
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

function Heading({ order }: { order: CustomerOrder }) {
  let eyebrow = "Order confirmed";
  let title = "Thank you for your order";
  let body: React.ReactNode = (
    <p role="status" className="max-w-xl text-body text-ink-muted">
      Your payment has been received and your order is confirmed. Order{" "}
      {formatOrderNumber(order.id)}.
    </p>
  );

  switch (order.status) {
    case "needs_review":
      eyebrow = "Payment received";
      title = "We're confirming your order";
      body = (
        <p role="status" className="max-w-xl text-body text-ink-muted">
          Your payment has been received. Our client services team will be in
          touch to confirm your order.
        </p>
      );
      break;
    case "pending":
      eyebrow = "Almost there";
      title = "Confirming your payment";
      body = <PendingConfirmation />;
      break;
    case "failed":
      eyebrow = "Payment unsuccessful";
      title = "Your payment didn't go through";
      body = (
        <p role="status" className="max-w-xl text-body text-ink-muted">
          No payment was taken and your bag is unchanged. You can try again
          whenever you&apos;re ready.
        </p>
      );
      break;
    case "cancelled":
    case "expired":
      eyebrow = "Checkout";
      title = "This checkout was not completed";
      body = (
        <p role="status" className="max-w-xl text-body text-ink-muted">
          No payment was taken and your bag is unchanged.
        </p>
      );
      break;
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="eyebrow text-ink-muted">{eyebrow}</p>
      <h1 data-testid="order-heading" className="text-heading">
        {title}
      </h1>
      {body}
    </div>
  );
}
