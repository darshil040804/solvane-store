"use client";

import { HeartIcon } from "@/components/icons";
import { useWishlist } from "@/components/wishlist-provider";

/** Saves a product to the signed-in customer's wishlist (signed-out: asks to sign in). */
export function WishlistButton({
  productId,
  productName,
  className = "",
}: {
  productId: string;
  productName: string;
  className?: string;
}) {
  const { savedIds, toggle } = useWishlist();
  const saved = savedIds?.has(productId) ?? false;
  // Until the customer's list has loaded we can't know which way to toggle.
  const loading = savedIds === null;

  return (
    <button
      type="button"
      onClick={() => toggle(productId)}
      disabled={loading}
      aria-pressed={saved}
      aria-label={`${saved ? "Remove" : "Add"} ${productName} ${saved ? "from" : "to"} wishlist`}
      className={`btn-icon disabled:cursor-default ${className}`}
    >
      <HeartIcon fill={saved ? "currentColor" : "none"} />
    </button>
  );
}
