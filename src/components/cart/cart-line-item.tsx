"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import {
  removeCartItem,
  updateCartItem,
  type CartActionResult,
} from "@/app/cart/actions";
import { QuantityStepper } from "@/components/cart/quantity-stepper";
import { SpinnerIcon } from "@/components/icons";
import { StockStatus } from "@/components/stock-status";
import type { CartLine } from "@/lib/cart";
import { formatPrice, getStockState } from "@/lib/format";

function errorMessage(result: CartActionResult) {
  switch (result.status) {
    case "insufficient-stock":
      return result.available > 0
        ? `Only ${result.available} available, so we couldn't change the quantity.`
        : "This piece is no longer available.";
    case "not-found":
      return "This item is no longer in your bag.";
    default:
      return "Something went wrong. Please try again.";
  }
}

/**
 * One line of the bag. Everything shown comes from getCart() on the server;
 * changes go through the cart server actions, which re-check stock.
 */
export function CartLineItem({ line }: { line: CartLine }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setOptimisticQuantity] = useOptimistic(line.quantity);

  function run(action: () => Promise<CartActionResult>, optimisticQuantity?: number) {
    setError(null);
    startTransition(async () => {
      if (optimisticQuantity !== undefined) setOptimisticQuantity(optimisticQuantity);
      let result: CartActionResult;
      try {
        result = await action();
      } catch {
        setError("We couldn't update your bag. Please try again.");
        setRemoving(false);
        return;
      }
      if (result.status === "unauthenticated") {
        router.push("/sign-in?redirectTo=%2Fcart");
      } else if (result.status !== "ok") {
        setError(errorMessage(result));
        setRemoving(false);
        // Show the latest stock and prices after a rejected change.
        router.refresh();
      }
    });
  }

  const href = `/products/${line.slug}`;
  const unavailable = line.issue?.kind === "unavailable";
  const limited = line.issue?.kind === "limited";
  const lowStock = !line.issue && getStockState(line.available).status === "low-stock";
  const atMax = !line.issue && !lowStock && quantity >= line.available;
  const hintId = `cart-line-${line.id}-hint`;

  return (
    <li
      aria-label={line.name}
      aria-busy={pending}
      className={`grid grid-cols-[6rem_minmax(0,1fr)] gap-4 border-b py-6 transition-opacity duration-150 ease-standard sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-6 ${
        removing ? "pointer-events-none opacity-40" : ""
      }`}
    >
      <Link href={href} tabIndex={-1} aria-hidden="true" className="media aspect-product">
        {line.image && (
          <Image
            src={line.image.src}
            alt=""
            fill
            sizes="(min-width: 40rem) 8rem, 6rem"
            className={unavailable ? "opacity-50 grayscale" : ""}
          />
        )}
      </Link>

      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            {unavailable && <p className="eyebrow text-ink-muted">Sold out</p>}
            <h2 className="text-body">
              <Link href={href} className="link-quiet">
                {line.name}
              </Link>
            </h2>
            {line.size && (
              <p className="text-body-sm text-ink-muted">Size: {line.size}</p>
            )}
            <p className="text-body-sm text-ink-muted">
              {formatPrice(line.unitPriceCents)}
              {quantity > 1 && !unavailable && " each"}
            </p>
          </div>
          <p
            data-testid="line-total"
            className={`shrink-0 text-body transition-opacity duration-150 ${
              pending ? "opacity-40" : ""
            } ${unavailable ? "text-ink-muted line-through" : ""}`}
          >
            {formatPrice(unavailable ? line.unitPriceCents * line.quantity : line.lineTotalCents)}
          </p>
        </div>

        {unavailable && (
          <p className="text-body-sm text-danger">
            This piece is no longer available and isn&apos;t included in your
            subtotal.
          </p>
        )}
        {limited && (
          <p className="text-body-sm text-danger">
            Only {line.available} available in {line.size ? "this size" : "stock"}.
            You have {line.quantity} in your bag.
          </p>
        )}
        {lowStock && <StockStatus stock={line.available} />}

        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          {!line.issue && (
            <QuantityStepper
              label={line.name}
              value={quantity}
              max={line.available}
              disabled={pending}
              describedBy={atMax ? hintId : undefined}
              onChange={(next) => run(() => updateCartItem(line.id, next), next)}
            />
          )}
          {limited && (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => updateCartItem(line.id, line.available), line.available)}
              className="btn btn-secondary btn-sm"
            >
              Update to {line.available}
            </button>
          )}
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setRemoving(true);
              run(() => removeCartItem(line.id));
            }}
            className="link cursor-pointer text-body-sm disabled:cursor-default"
          >
            Remove
            <span className="sr-only"> {line.name}</span>
          </button>
          {pending && (
            <span role="status" className="flex items-center gap-2 text-caption text-ink-muted">
              <SpinnerIcon aria-hidden="true" />
              {removing ? "Removing…" : "Updating…"}
            </span>
          )}
        </div>

        {atMax && (
          <p id={hintId} className="text-caption text-ink-muted">
            That&apos;s all we have {line.size ? "in this size" : "in stock"}.
          </p>
        )}
        {error && (
          <p role="alert" className="text-caption text-danger">
            {error}
          </p>
        )}
      </div>
    </li>
  );
}
