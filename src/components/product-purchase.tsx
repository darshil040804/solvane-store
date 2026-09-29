"use client";

import Link from "next/link";
import { useState } from "react";
import { WishlistButton } from "@/components/wishlist-button";
import type { ProductSize } from "@/lib/products";

// TODO: there is no cart yet; "Add to bag" only validates the size and confirms.
export function ProductPurchase({
  productName,
  sizes,
  inStock,
}: {
  productName: string;
  sizes?: ProductSize[];
  inStock: boolean;
}) {
  const [size, setSize] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    tone: "error" | "success";
    text: string;
  } | null>(null);

  const sizeOptions = sizes ?? [];
  const needsSize = sizeOptions.length > 0;

  function addToBag() {
    if (needsSize && !size) {
      setMessage({ tone: "error", text: "Please select a size." });
      return;
    }
    setMessage({
      tone: "success",
      text: `${productName}${size ? `, size ${size},` : ""} was added to your bag.`,
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
        </fieldset>
      )}

      <div className="flex items-center gap-3">
        {inStock ? (
          <button
            type="button"
            onClick={addToBag}
            className="btn btn-primary flex-1"
          >
            Add to bag
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
        {message?.text}
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
