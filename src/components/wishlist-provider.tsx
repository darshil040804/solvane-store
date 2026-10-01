"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { setWishlistItem } from "@/app/wishlist/actions";

type WishlistState = {
  /** Null until the customer's list has loaded. */
  savedIds: Set<string> | null;
  signedIn: boolean;
  toggle: (productId: string) => void;
};

const WishlistContext = createContext<WishlistState | null>(null);

/**
 * Holds the signed-in customer's saved product ids for every heart on the page.
 * Product pages are cached for everyone, so the list is fetched in the browser;
 * it is re-read on each navigation so signing in or out is picked up.
 */
export function WishlistProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [savedIds, setSavedIds] = useState<Set<string> | null>(null);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/wishlist", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { signedIn: boolean; productIds: string[] }) => {
        if (!active) return;
        setSignedIn(data.signedIn);
        setSavedIds(new Set(data.productIds));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [pathname]);

  const toggle = useCallback(
    (productId: string) => {
      if (!signedIn) {
        router.push(`/sign-in?redirectTo=${encodeURIComponent(pathname)}`);
        return;
      }
      const saved = !(savedIds?.has(productId) ?? false);
      const apply = (on: boolean) =>
        setSavedIds((current) => {
          const next = new Set(current);
          if (on) next.add(productId);
          else next.delete(productId);
          return next;
        });
      apply(saved);
      setWishlistItem(productId, saved)
        .then((result) => {
          if (result.status === "unauthenticated") {
            apply(!saved);
            router.push(`/sign-in?redirectTo=${encodeURIComponent(pathname)}`);
          } else if (result.status !== "ok") {
            apply(!saved);
          } else if (pathname === "/wishlist") {
            router.refresh();
          }
        })
        .catch(() => apply(!saved));
    },
    [pathname, router, savedIds, signedIn],
  );

  const value = useMemo(() => ({ savedIds, signedIn, toggle }), [savedIds, signedIn, toggle]);
  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) throw new Error("useWishlist must be used inside WishlistProvider");
  return context;
}
