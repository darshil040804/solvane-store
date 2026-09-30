"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { addToCart, type CartActionResult } from "@/app/cart/actions";
import { SpinnerIcon } from "@/components/icons";
import { StockStatus } from "@/components/stock-status";
import { WishlistButton } from "@/components/wishlist-button";
import { getStockState } from "@/lib/format";
import type { ProductSize } from "@/lib/products";

const isLow = (option: ProductSize) => getStockState(option.stock).status === "low-stock";

function stockMessage(result: Extract<CartActionResult, { status: "insufficient-stock" }>) {
  const { available, inCart } = result;
  if (available <= 0) return "Sorry, this is no longer available.";
  if (inCart >= available) {
    return `You already have all ${available} available in your bag.`;
  }
  return `Only ${available} available${inCart ? `, and you have ${inCart} in your bag` : ""}.`;
}

export function ProductPurchase({
  productId,
  productSlug,
  productName,
  sizes,
  inStock,
}: {
  productId: string;
  productSlug: string;
  productName: string;
  sizes?: ProductSize[];
  inStock: boolean;
}) {
  const router = useRouter();
  const [size, setSize] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    tone: "error" | "success";
    content: ReactNode;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  const sizeOptions = sizes ?? [];
  const needsSize = sizeOptions.length > 0;
  const selected = sizeOptions.find((option) => option.label === size);

  function addToBag() {
    if (pending) return;
    if (needsSize && !size) {
      setMessage({ tone: "error", content: "Please select a size." });
      return;
    }
    setMessage(null);
    startTransition(async () => {
      let result: CartActionResult;
      try {
        result = await addToCart({ productId, size: needsSize ? size : null });
      } catch {
        setMessage({
          tone: "error",
          content: "We couldn't add this to your bag. Please try again.",
        });
        return;
      }

      switch (result.status) {
        case "ok":
          setMessage({
            tone: "success",
            content: (
              <>
                {productName}
                {size ? `, size ${size},` : ""} was added to your bag.{" "}
                <Link href="/cart" className="link">
                  View bag
                </Link>
              </>
            ),
          });
          break;
        case "unauthenticated":
          router.push(`/sign-in?redirectTo=${encodeURIComponent(`/products/${productSlug}`)}`);
          break;
        case "insufficient-stock":
          setMessage({ tone: "error", content: stockMessage(result) });
          break;
        default:
          setMessage({
            tone: "error",
            content: "We couldn't add this to your bag. Please try again.",
          });
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {needsSize && inStock && (
        <fieldset aria-describedby="size-message">
          <legend className="mb-3 text-body-sm">
            Size{size && <span className="text-ink-muted">: {size}</span>}
          </legend>
          <div className="grid grid-cols-6 gap-2">
            {sizeOptions.map((option) => (
              <label
                key={option.label}
                className="relative flex min-h-11 cursor-pointer items-center justify-center rounded-control border text-body-sm transition-colors duration-150 ease-standard hover:border-ink has-checked:border-line-strong has-checked:bg-ink has-checked:text-on-ink has-disabled:cursor-not-allowed has-disabled:text-ink-subtle has-disabled:line-through has-disabled:hover:border-line has-focus-visible:outline has-focus-visible:outline-offset-2"
              >
                <input
                  type="radio"
                  name="size"
                  value={option.label}
                  disabled={!option.inStock}
                  checked={size === option.label}
                  onChange={() => {
                    setSize(option.label);
                    setMessage(null);
                  }}
                  className="sr-only"
                />
                {option.label}
                {!option.inStock && <span className="sr-only"> (sold out)</span>}
              </label>
            ))}
          </div>
          {/* Announced when the chosen size is running low. */}
          <div aria-live="polite">
            {selected && isLow(selected) && (
              <div className="mt-3">
                <StockStatus
                  stock={selected.stock}
                  label={`Only ${selected.stock} left in size ${selected.label}`}
                />
              </div>
            )}
          </div>
        </fieldset>
      )}

      <div className="flex items-center gap-3">
        {inStock ? (
          <button
            type="button"
            onClick={addToBag}
            aria-busy={pending}
            className="btn btn-primary flex-1"
          >
            {pending ? (
              <>
                <SpinnerIcon />
                Adding…
              </>
            ) : (
              "Add to bag"
            )}
          </button>
        ) : (
          <button
            type="button"
            disabled
            className="btn btn-primary flex-1"
          >
            Out of stock
          </button>
        )}
        <WishlistButton
          productName={productName}
          className="size-12 shrink-0 border border-line-strong"
        />
      </div>

      <p
        id="size-message"
        role="status"
        className={`-mt-3 text-body-sm empty:hidden ${
          message?.tone === "error" ? "text-danger" : "text-success"
        }`}
      >
        {message?.content}
      </p>

      {!inStock && (
        <p className="text-body-sm text-ink-muted">
          This piece is currently unavailable online.{" "}
          <Link href="/contact" className="link">
            Contact a client advisor
          </Link>{" "}
          to check availability in store.
        </p>
      )}
    </div>
  );
}
