"use client";

import { useState } from "react";
import { HeartIcon } from "@/components/icons";

// Local toggle only; persisting the wishlist comes with accounts.
export function WishlistButton({
  productName,
  className = "",
}: {
  productName: string;
  className?: string;
}) {
  const [saved, setSaved] = useState(false);

  return (
    <button
      type="button"
      onClick={() => setSaved((value) => !value)}
      aria-pressed={saved}
      aria-label={`${saved ? "Remove" : "Add"} ${productName} ${saved ? "from" : "to"} wishlist`}
      className={`btn-icon ${className}`}
    >
      <HeartIcon fill={saved ? "currentColor" : "none"} />
    </button>
  );
}
