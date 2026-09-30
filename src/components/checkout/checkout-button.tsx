"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { startCheckout } from "@/app/checkout/actions";
import { SpinnerIcon } from "@/components/icons";

/**
 * Starts Stripe Checkout from the review page. The server action redirects to
 * Stripe on success; otherwise it returns a message shown here so the customer
 * can retry.
 */
export function CheckoutButton({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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
              // Only reached when checkout didn't start; success redirects.
              if (result.status === "unauthenticated") {
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
