import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckoutButton } from "@/components/checkout/checkout-button";
import { requireSession } from "@/lib/auth/session";
import { getCart, type CartLine } from "@/lib/cart";
import { formatPrice } from "@/lib/format";

export const metadata: Metadata = {
  title: "Checkout | Solvane",
  robots: { index: false },
};

const items = (count: number) => `${count} ${count === 1 ? "item" : "items"}`;

/**
 * Review step before payment. Everything shown comes from getCart() (current
 * prices and stock from PostgreSQL); the button starts Stripe Checkout, which
 * re-validates stock and re-prices the order on the server.
 */
export default async function CheckoutPage(props: PageProps<"/checkout">) {
  const { user } = await requireSession("/checkout");
  const cart = await getCart(user.id);
  if (cart.lines.length === 0) redirect("/cart");

  const { checkout } = await props.searchParams;
  const cancelled = checkout === "cancelled";
  const unavailable = cart.lines.filter((line) => line.issue?.kind === "unavailable");
  const hasIssues = cart.lines.some((line) => line.issue);

  return (
    <main className="flex-1">
      <nav aria-label="Breadcrumb" className="container-page py-4">
        <ol className="flex flex-wrap items-center gap-2 text-caption text-ink-muted">
          <li>
            <Link href="/" className="link-quiet">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/cart" className="link-quiet">
              Shopping bag
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-ink">
            Checkout
          </li>
        </ol>
      </nav>

      <div className="container-content pt-6 pb-section md:pt-10">
        <div className="mb-8 flex flex-col gap-2 md:mb-10">
          <p className="eyebrow text-ink-muted">Checkout</p>
          <h1 className="text-heading">Review your order</h1>
        </div>

        {cancelled && !hasIssues && (
          <p
            role="status"
            className="mb-8 max-w-2xl border-l-2 border-line-strong py-1 pl-4 text-body-sm text-ink-muted"
          >
            Checkout was cancelled and no payment was taken. Your bag is unchanged,
            so you can continue whenever you&apos;re ready.
          </p>
        )}

        {hasIssues && (
          <div
            role="alert"
            className="mb-8 flex max-w-2xl flex-col items-start gap-2 border-l-2 border-danger py-1 pl-4 text-body-sm text-danger"
          >
            <p>
              Availability has changed for some pieces in your bag. Please update
              your bag before paying.
            </p>
            <Link href="/cart" className="link-cta">
              Review your bag
            </Link>
          </div>
        )}

        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start lg:gap-16 xl:gap-24">
          <section aria-labelledby="items-title">
            <div className="flex items-baseline justify-between gap-4 pb-4">
              <h2 id="items-title" className="text-title">
                Your items{" "}
                <span className="text-ink-muted">({items(cart.itemCount)})</span>
              </h2>
              <Link href="/cart" className="link text-body-sm">
                Edit bag
              </Link>
            </div>
            <ul aria-label="Items in your order" className="border-t">
              {cart.lines.map((line) => (
                <CheckoutLineItem key={line.id} line={line} />
              ))}
            </ul>

            <div className="mt-10 flex flex-col gap-2 border-t pt-6 text-body-sm">
              <h2 className="text-title">Delivery</h2>
              <p className="text-ink-muted">
                Complimentary express delivery in 2–4 business days, within the
                United States. You&apos;ll enter your delivery address on the next
                step, where you&apos;ll also choose how to pay.
              </p>
            </div>
          </section>

          <section
            aria-labelledby="summary-title"
            className="mt-10 flex flex-col gap-5 bg-surface-muted p-6 md:p-8 lg:sticky lg:top-[calc(var(--header-h)+2rem)] lg:mt-0"
          >
            <h2 id="summary-title" className="text-title">
              Order summary
            </h2>
            <dl className="flex flex-col gap-3 border-t pt-4 text-body-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">
                  Subtotal ({items(cart.itemCount)})
                </dt>
                <dd data-testid="checkout-subtotal">{formatPrice(cart.subtotalCents)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">Delivery</dt>
                <dd>Complimentary</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-t pt-4 text-body">
                <dt>Total</dt>
                <dd data-testid="checkout-total" className="text-body-lg">
                  {formatPrice(cart.subtotalCents)}
                </dd>
              </div>
            </dl>
            {unavailable.length > 0 && (
              <p className="text-caption text-danger">
                {unavailable.length === 1
                  ? "1 piece is no longer available and isn't included."
                  : `${unavailable.length} pieces are no longer available and aren't included.`}
              </p>
            )}
            <CheckoutButton disabled={hasIssues} />
            {hasIssues && (
              <p className="text-caption text-ink-muted">
                Payment is unavailable until the pieces marked above are resolved.
              </p>
            )}
            <p className="text-caption text-ink-muted">
              Payment is handled securely by Stripe. You won&apos;t be charged until
              you confirm on the next page.
            </p>
            <Link href="/collections/new-in" className="link-cta self-start text-body-sm">
              Continue shopping
            </Link>
          </section>
        </div>
      </div>
    </main>
  );
}

function CheckoutLineItem({ line }: { line: CartLine }) {
  const unavailable = line.issue?.kind === "unavailable";
  const limited = line.issue?.kind === "limited";

  return (
    <li
      aria-label={line.name}
      className="grid grid-cols-[5rem_minmax(0,1fr)] gap-4 border-b py-5 sm:grid-cols-[6rem_minmax(0,1fr)] sm:gap-6"
    >
      <Link
        href={`/products/${line.slug}`}
        tabIndex={-1}
        aria-hidden="true"
        className="media aspect-product"
      >
        {line.image && (
          <Image
            src={line.image.src}
            alt=""
            fill
            sizes="(min-width: 40rem) 6rem, 5rem"
            className={unavailable ? "opacity-50 grayscale" : ""}
          />
        )}
      </Link>

      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            {unavailable && <p className="eyebrow text-ink-muted">Sold out</p>}
            <h3 className="text-body">{line.name}</h3>
            {line.size && <p className="text-body-sm text-ink-muted">Size: {line.size}</p>}
            <p className="text-body-sm text-ink-muted">
              Qty {line.quantity} × {formatPrice(line.unitPriceCents)}
            </p>
          </div>
          <p
            data-testid="line-total"
            className={`shrink-0 text-body ${unavailable ? "text-ink-muted line-through" : ""}`}
          >
            {formatPrice(unavailable ? line.unitPriceCents * line.quantity : line.lineTotalCents)}
          </p>
        </div>
        {unavailable && (
          <p className="text-body-sm text-danger">
            No longer available and not included in your total.
          </p>
        )}
        {limited && (
          <p className="text-body-sm text-danger">
            Only {line.available} available. You have {line.quantity} in your bag.
          </p>
        )}
      </div>
    </li>
  );
}
