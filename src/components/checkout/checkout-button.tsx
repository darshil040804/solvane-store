"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { startCheckout } from "@/app/checkout/actions";
import { SpinnerIcon } from "@/components/icons";

/**
 * Starts Stripe Checkout from the review page. On success the server action
 * returns the Stripe URL and the browser goes there, staying in the loading
 * state until the page changes; otherwise it returns a message shown here.
 */
export function CheckoutButton({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const [transitionPending, startTransition] = useTransition();
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = transitionPending || redirecting;

  // Coming back from Stripe with the back button can restore this page from
  // the browser's cache, still mid-redirect; make the button usable again.
  useEffect(() => {
    const reset = (event: PageTransitionEvent) => {
      if (event.persisted) setRedirecting(false);
    };
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        disabled={disabled || pending}
        aria-busy={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              const result = await startCheckout();
              if (result.status === "redirect") {
                setRedirecting(true);
                window.location.assign(result.url);
              } else if (result.status === "unauthenticated") {
                router.push("/sign-in?redirectTo=%2Fcheckout");
              } else if (result.status === "empty") {
                router.replace("/cart");
              } else if (result.status === "cart-changed") {
                // Show the latest availability alongside the message.
                setError(result.message);
                router.refresh();
              } else {
                // Nothing in the bag changed; just explain.
                setError(result.message);
              }
            } catch {
              setError("We couldn't start checkout. Please try again in a moment.");
            }
          });
        }}
        className="btn btn-primary btn-block"
      >
        {pending ? (
          <>
            <SpinnerIcon />
            Preparing secure checkout…
          </>
        ) : (
          "Continue to payment"
        )}
      </button>
      <p role="status" className="sr-only">
        {pending ? "Preparing secure checkout" : ""}
      </p>
      {pending && (
        <p className="text-caption text-ink-muted">
          Reserving your pieces and taking you to Stripe. Please don&apos;t close this
          page.
        </p>
      )}
      {error && (
        <p role="alert" className="border-l-2 border-danger py-1 pl-4 text-body-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
