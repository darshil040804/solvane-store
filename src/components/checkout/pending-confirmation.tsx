"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { SpinnerIcon } from "@/components/icons";

/**
 * Shown while the order is still pending, i.e. Stripe's confirmation hasn't
 * reached us yet. Re-renders the server page every few seconds (which re-reads
 * the order) until it turns paid, then offers a manual retry if it takes long.
 */
export function PendingConfirmation({
  intervalMs = 2000,
  timeoutMs = 60_000,
  message = (
    <>
      We&apos;ve sent you to complete payment and are waiting for it to be
      confirmed. This page updates automatically.
    </>
  ),
  className = "text-body",
}: {
  intervalMs?: number;
  timeoutMs?: number;
  /** What to say while waiting; defaults to the post-checkout wording. */
  message?: ReactNode;
  className?: string;
}) {
  const router = useRouter();
  const [timedOut, setTimedOut] = useState(false);
  const [round, setRound] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    const timer = setInterval(() => {
      if (Date.now() - startedAt >= timeoutMs) {
        clearInterval(timer);
        setTimedOut(true);
      } else {
        router.refresh();
      }
    }, intervalMs);
    return () => clearInterval(timer);
  }, [router, intervalMs, timeoutMs, round]);

  if (timedOut) {
    return (
      <div role="status" className="flex max-w-xl flex-col items-start gap-3">
        <p className="text-body text-ink-muted">
          This is taking longer than usual. If you completed payment, it may
          still be processing. There&apos;s no need to pay again, and this page
          will show your order once payment is confirmed.
        </p>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setTimedOut(false);
              setRound((current) => current + 1);
              router.refresh();
            }}
          >
            Check again
          </button>
          <Link href="/cart" className="link text-body-sm">
            Return to your bag
          </Link>
        </div>
      </div>
    );
  }

  return (
    <p role="status" className={`flex max-w-xl items-start gap-2 text-ink-muted ${className}`}>
      <SpinnerIcon aria-hidden="true" className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </p>
  );
}
