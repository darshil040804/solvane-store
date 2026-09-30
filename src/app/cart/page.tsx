import type { Metadata } from "next";
import Link from "next/link";
import { CartLineItem } from "@/components/cart/cart-line-item";
import { requireSession } from "@/lib/auth/session";
import { getCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";

export const metadata: Metadata = {
  title: "Shopping bag | Solvane",
  robots: { index: false },
};

const items = (count: number) => `${count} ${count === 1 ? "item" : "items"}`;

export default async function CartPage() {
  const { user } = await requireSession("/cart");
  const cart = await getCart(user.id);

  if (cart.lines.length === 0) {
    return (
      <main className="container-narrow section flex flex-1 flex-col items-center justify-center gap-5 text-center">
        <p className="eyebrow text-ink-muted">Shopping bag</p>
        <h1 className="text-display">Your bag is empty</h1>
        <p className="max-w-sm text-body text-ink-muted">
          Pieces you add to your bag will appear here.
        </p>
        <Link href="/collections/new-in" className="btn btn-secondary mt-3">
          Discover new arrivals
        </Link>
      </main>
    );
  }

  const unavailable = cart.lines.filter((line) => line.issue?.kind === "unavailable");
  const hasIssues = cart.lines.some((line) => line.issue);

  return (
    <main className="container-content section flex-1">
      <div className="mb-8 flex flex-col gap-2 md:mb-10">
        <p className="eyebrow text-ink-muted">Shopping bag</p>
        <h1 className="text-heading">
          Your bag <span className="text-ink-muted">({items(cart.itemCount)})</span>
        </h1>
      </div>

      {hasIssues && (
        <p
          role="status"
          className="mb-8 max-w-2xl border-l-2 border-danger py-1 pl-4 text-body-sm text-danger"
        >
          Availability has changed for some pieces in your bag. Please review
          them below.
        </p>
      )}

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-16 xl:gap-24">
        <ul aria-label="Items in your bag" className="border-t">
          {cart.lines.map((line) => (
            <CartLineItem key={line.id} line={line} />
          ))}
        </ul>

        <section
          aria-labelledby="summary-title"
          className="mt-10 flex flex-col gap-5 bg-surface-muted p-6 md:p-8 lg:sticky lg:top-[calc(var(--header-h)+2rem)] lg:mt-0"
        >
          <h2 id="summary-title" className="text-title">
            Order summary
          </h2>
          <dl className="flex items-baseline justify-between gap-4 border-t border-b py-4 text-body">
            <dt>
              Subtotal{" "}
              <span className="text-ink-muted">({items(cart.itemCount)})</span>
            </dt>
            <dd data-testid="cart-subtotal" className="text-body-lg">
              {formatPrice(cart.subtotalCents)}
            </dd>
          </dl>
          {unavailable.length > 0 && (
            <p className="text-caption text-danger">
              {unavailable.length === 1
                ? "1 piece is no longer available and isn't included."
                : `${unavailable.length} pieces are no longer available and aren't included.`}
            </p>
          )}
          {hasIssues ? (
            <>
              <button type="button" disabled className="btn btn-primary btn-block">
                Checkout
              </button>
              <p className="text-caption text-ink-muted">
                Review the pieces marked above before checking out.
              </p>
            </>
          ) : (
            <Link href="/checkout" className="btn btn-primary btn-block">
              Checkout
            </Link>
          )}
          <p className="text-caption text-ink-muted">
            Complimentary delivery within the United States. You&apos;ll review
            your order before paying.
          </p>
          <Link href="/collections/new-in" className="link-cta self-start text-body-sm">
            Continue shopping
          </Link>
        </section>
      </div>
    </main>
  );
}
