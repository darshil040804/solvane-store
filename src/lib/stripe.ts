import "server-only";

import Stripe from "stripe";

// Server-side Stripe client. Created lazily so builds and pages that never
// touch payments don't need the key. Prefer a restricted key (rk_…) with only
// Checkout Sessions write access; keep it in the environment, never in code.

let client: Stripe | undefined;

export function getStripe() {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    // The SDK pins the API version it was built for (2026-08-26.dahlia for 22.6).
    client = new Stripe(key, { appInfo: { name: "Solvane storefront" } });
  }
  return client;
}

/** Tags our sessions in the Stripe Dashboard so this checkout flow can be tracked. */
export const CHECKOUT_INTEGRATION_ID = "solvane_hosted_checkout_qhvzrmwk";

/** Absolute base URL for Stripe redirects. */
export function appUrl() {
  const url = process.env.NEXT_PUBLIC_APP_URL ?? process.env.BETTER_AUTH_URL;
  if (!url) throw new Error("NEXT_PUBLIC_APP_URL is not set");
  return url.replace(/\/$/, "");
}
