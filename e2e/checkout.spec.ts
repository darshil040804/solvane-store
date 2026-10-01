import { expect, test, type Page } from "@playwright/test";
import Stripe from "stripe";
import {
  createProduct,
  expectSignInRedirect,
  seedOrder,
  setPrice,
  setStock,
  signUp,
  sql,
  uniqueEmail,
  type FixtureProduct,
} from "./support";

// Stripe-dependent tests need STRIPE_SECRET_KEY (sandbox) and
// STRIPE_WEBHOOK_SECRET in the environment the dev server and tests share.
const hasStripe = Boolean(process.env.STRIPE_SECRET_KEY);
const hasWebhookSecret = Boolean(process.env.STRIPE_WEBHOOK_SECRET);

async function customerWithBag(page: Page, product: FixtureProduct, quantity = 1) {
  const email = uniqueEmail("checkout");
  await signUp(page, "Checkout Customer", email);
  await expect(page).toHaveURL("/account");
  const [row] = await sql()`select id from "user" where email = ${email}`;
  await sql()`insert into cart_items (user_id, product_id, size, quantity)
    select ${row.id}, ${product.id}, size, ${quantity} from product_stock where product_id = ${product.id}`;
  return { email, userId: row.id as string };
}

async function stockOf(product: FixtureProduct) {
  const [row] = await sql()`select quantity from product_stock where product_id = ${product.id}`;
  return Number(row.quantity);
}

const usd = (cents: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);

const payButton = (page: Page) =>
  page.getByRole("button", { name: "Continue to payment", exact: true });

test.describe("checkout entry", () => {
  test("checkout pages require sign-in", async ({ page }) => {
    await page.goto("/checkout/success?session_id=cs_test_123");
    await expectSignInRedirect(page, "/checkout/success?session_id=cs_test_123");
    await page.goto("/checkout");
    await expectSignInRedirect(page, "/checkout");
  });

  test("an empty bag sends the customer back to the bag", async ({ page }) => {
    await signUp(page, "Empty Bag", uniqueEmail("emptybag"));
    await expect(page).toHaveURL("/account");
    await page.goto("/checkout");
    await expect(page).toHaveURL("/cart");
    await expect(page.getByRole("heading", { name: "Your bag is empty" })).toBeVisible();
  });

  test("the bag's Checkout link opens the review page", async ({ page }) => {
    const product = await createProduct("checkout-link", { "One size": 3 });
    await customerWithBag(page, product);
    await page.goto("/cart");
    await page.getByRole("link", { name: "Checkout", exact: true }).click();
    await expect(page).toHaveURL("/checkout");
    await expect(page.getByRole("heading", { level: 1, name: "Review your order" })).toBeVisible();
  });

  test("the review shows items, quantities, current prices and totals", async ({ page }) => {
    const sized = await createProduct("review-a", { M: 4 }, 89_000);
    const single = await createProduct("review-b", { "One size": 3 }, 32_000);
    const { userId } = await customerWithBag(page, sized, 2);
    await sql()`insert into cart_items (user_id, product_id, size, quantity)
      values (${userId}, ${single.id}, 'One size', 1)`;

    // Prices come from the database at the time of viewing, not when added.
    await setPrice(sized.id, 90_000);
    await page.goto("/checkout");

    const first = page.getByRole("listitem", { name: sized.name });
    await expect(first).toContainText("Size: M");
    await expect(first).toContainText(`Qty 2 × ${usd(90_000)}`);
    await expect(first.getByTestId("line-total")).toHaveText(usd(180_000));
    const second = page.getByRole("listitem", { name: single.name });
    await expect(second).not.toContainText("Size:");
    await expect(second).toContainText(`Qty 1 × ${usd(32_000)}`);
    await expect(page.getByRole("main").getByTestId("checkout-subtotal")).toHaveText(usd(212_000));
    await expect(page.getByRole("main").getByTestId("checkout-total")).toHaveText(usd(212_000));
    await expect(page.getByRole("heading", { name: /Your items/ })).toContainText("(3 items)");
    await expect(payButton(page)).toBeEnabled();
    await expect(page.getByRole("link", { name: "Edit bag" })).toHaveAttribute("href", "/cart");
  });

  test("availability problems block payment on the bag and the review page", async ({ page }) => {
    const product = await createProduct("checkout-issue", { "One size": 3 });
    await customerWithBag(page, product, 2);
    await setStock(product.id, "One size", 0);

    await page.goto("/cart");
    await expect(page.getByRole("button", { name: "Checkout", exact: true })).toBeDisabled();
    await expect(page.getByText("Review the pieces marked above")).toBeVisible();

    await page.goto("/checkout");
    await expect(payButton(page)).toBeDisabled();
    const alert = page.getByRole("main").getByRole("alert");
    await expect(alert).toContainText("Availability has changed");
    await expect(alert.getByRole("link", { name: "Review your bag" })).toBeVisible();
    await expect(page.getByRole("listitem", { name: product.name })).toContainText("Sold out");
    await expect(page.getByRole("main").getByTestId("checkout-total")).toHaveText(usd(0));
  });

  test("stock lost after the review loaded is reported, and the page refreshes", async ({ page }) => {
    const product = await createProduct("checkout-race", { "One size": 3 });
    const { userId } = await customerWithBag(page, product, 2);
    await page.goto("/checkout");
    await expect(payButton(page)).toBeEnabled();

    await setStock(product.id, "One size", 1);
    await payButton(page).click();
    await expect(page.getByRole("main").getByRole("alert").first()).toContainText(
      "Availability has changed",
    );
    await expect(payButton(page)).toBeDisabled();
    await expect(page.getByRole("listitem", { name: product.name })).toContainText("Only 1 available");
    const [orders] = await sql()`select count(*)::int as n from orders where user_id = ${userId}`;
    expect(orders.n).toBe(0);
  });

  test("shows a progress state while checkout starts", async ({ page }) => {
    const product = await createProduct("checkout-loading", { "One size": 3 });
    await customerWithBag(page, product);
    await page.goto("/checkout");

    let release!: () => void;
    const held = new Promise<void>((resolve) => (release = resolve));
    await page.route("**/checkout", async (route) => {
      if (route.request().method() === "POST") await held;
      await route.continue();
    });
    await payButton(page).click();
    await expect(page.getByRole("button", { name: "Preparing secure checkout…" })).toBeDisabled();
    await expect(page.getByText("Reserving your pieces")).toBeVisible();
    release();
  });

  test("the cancelled notice explains that nothing was charged", async ({ page }) => {
    const product = await createProduct("checkout-cancelled", { "One size": 3 });
    await customerWithBag(page, product);
    await page.goto("/checkout?checkout=cancelled");
    await expect(page.getByRole("main").getByText("Checkout was cancelled and no payment was taken.")).toBeVisible();
    await expect(payButton(page)).toBeEnabled();
  });
});

test.describe("stripe checkout", () => {
  test.skip(!hasStripe, "STRIPE_SECRET_KEY is not set");

  test("reserves stock, sends the customer to Stripe, and cancelling returns it", async ({
    page,
  }) => {
    const product = await createProduct("checkout-start", { "One size": 2 }, 90_000);
    const { userId } = await customerWithBag(page, product, 2);
    await page.goto("/checkout");
    await payButton(page).click();
    await page.waitForURL(/checkout\.stripe\.com/);

    const [order] = await sql()`select * from orders where user_id = ${userId}`;
    expect(order.status).toBe("pending");
    expect(order.subtotal_cents).toBe(180_000);
    expect(order.stripe_checkout_session_id).toMatch(/^cs_/);
    expect(await stockOf(product)).toBe(0);

    // What Stripe's back link does.
    await page.goto(`/checkout/cancel?order=${order.id}`);
    await expect(page).toHaveURL("/checkout?checkout=cancelled");
    await expect(page.getByRole("main").getByText("Checkout was cancelled and no payment was taken.")).toBeVisible();
    // The bag is intact, and payment can be retried straight away.
    await expect(page.getByRole("listitem", { name: product.name })).toContainText("Qty 2");
    await expect(payButton(page)).toBeEnabled();
    const [after] = await sql()`select status from orders where id = ${order.id}`;
    expect(after.status).toBe("cancelled");
    expect(await stockOf(product)).toBe(2);
  });

  test("a leftover checkout whose Stripe session no longer exists doesn't block a new one", async ({
    page,
  }) => {
    const product = await createProduct("checkout-stale", { "One size": 3 }, 30_000);
    const { userId, email } = await customerWithBag(page, product);
    // A pending order from another Stripe account's session, still holding one unit.
    const stale = await seedOrder(userId, email, product, "pending", {
      quantity: 1,
      size: "One size",
    });
    await setStock(product.id, "One size", 2);

    await page.goto("/checkout");
    await payButton(page).click();
    await page.waitForURL(/checkout\.stripe\.com/);

    const [old] = await sql()`select status from orders where id = ${stale.orderId}`;
    expect(old.status).toBe("cancelled");
    const [fresh] = await sql()`select status, stripe_checkout_session_id as sid from orders
      where user_id = ${userId} and id <> ${stale.orderId}`;
    expect(fresh.status).toBe("pending");
    expect(fresh.sid).toMatch(/^cs_test_/);
    // 2 + 1 returned by the stale order - 1 reserved by the new checkout.
    expect(await stockOf(product)).toBe(2);
  });

  test("no error message flashes while redirecting to Stripe", async ({ page }) => {
    const product = await createProduct("checkout-noflash", { "One size": 2 });
    await customerWithBag(page, product);

    // Record any alert text that appears in the page before it navigates away.
    const seen: string[] = [];
    await page.exposeFunction("reportAlert", (text: string) => seen.push(text));
    await page.goto("/checkout");
    await page.evaluate(() => {
      const main = document.querySelector("main")!;
      const report = (window as unknown as { reportAlert: (t: string) => void }).reportAlert;
      new MutationObserver(() => {
        for (const alert of main.querySelectorAll('[role="alert"]')) {
          const text = alert.textContent?.trim();
          if (text) report(text);
        }
      }).observe(main, { subtree: true, childList: true, characterData: true });
    });

    await payButton(page).click();
    await expect(page.getByRole("button", { name: "Preparing secure checkout…" })).toBeVisible();
    await page.waitForURL(/checkout\.stripe\.com/);
    expect(seen).toEqual([]);
  });

  test("the success page never marks an order paid by itself", async ({ page }) => {
    const product = await createProduct("checkout-success", { "One size": 1 });
    const { userId } = await customerWithBag(page, product);
    await page.goto("/checkout");
    await payButton(page).click();
    await page.waitForURL(/checkout\.stripe\.com/);
    const [order] = await sql()`select * from orders where user_id = ${userId}`;

    await page.goto(`/checkout/success?session_id=${order.stripe_checkout_session_id}`);
    // Reaching the success URL alone doesn't confirm anything: it shows the waiting state.
    await expect(page.getByRole("heading", { name: "Confirming your payment" })).toBeVisible();
    const [after] = await sql()`select status, payment_status from orders where id = ${order.id}`;
    expect(after).toEqual({ status: "pending", payment_status: "unpaid" });
  });
});

test.describe("stripe webhook", () => {
  // Signing test events locally needs only the webhook secret, no API key.
  test.skip(!hasWebhookSecret, "STRIPE_WEBHOOK_SECRET is not set");

  async function pendingOrder(product: FixtureProduct, userId: string) {
    const sessionId = `cs_test_e2e_${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
    const [order] = await sql()`
      insert into orders (user_id, subtotal_cents, email, expires_at, stripe_checkout_session_id)
      values (${userId}, 50000, 'e2e@example.com', now() + interval '31 minutes', ${sessionId})
      returning id`;
    await sql()`insert into order_items (order_id, product_id, product_name, size, unit_price_cents, quantity)
      values (${order.id}, ${product.id}, ${product.name}, 'One size', 50000, 1)`;
    await sql()`update product_stock set quantity = quantity - 1 where product_id = ${product.id}`;
    return { orderId: order.id as string, sessionId };
  }

  function send(
    request: import("@playwright/test").APIRequestContext,
    type: string,
    object: Record<string, unknown>,
    id = `evt_e2e_${Date.now()}${Math.random().toString(36).slice(2, 8)}`,
  ) {
    const payload = JSON.stringify({ id, object: "event", type, data: { object } });
    const header = Stripe.webhooks.generateTestHeaderString({
      payload,
      secret: process.env.STRIPE_WEBHOOK_SECRET!,
    });
    return request.post("/api/stripe/webhook", {
      headers: { "stripe-signature": header, "content-type": "application/json" },
      data: payload,
    });
  }

  const session = (orderId: string, sessionId: string, extra: Record<string, unknown> = {}) => ({
    id: sessionId,
    object: "checkout.session",
    metadata: { orderId },
    client_reference_id: orderId,
    payment_status: "paid",
    status: "complete",
    amount_total: 50000,
    currency: "usd",
    payment_intent: `pi_e2e_${orderId}`,
    collected_information: null,
    ...extra,
  });

  test("rejects unsigned or tampered events", async ({ request }) => {
    expect((await request.post("/api/stripe/webhook", { data: "{}" })).status()).toBe(400);
    const bad = await request.post("/api/stripe/webhook", {
      headers: { "stripe-signature": "t=1,v1=deadbeef" },
      data: "{}",
    });
    expect(bad.status()).toBe(400);
  });

  test("a paid session marks the order paid exactly once", async ({ page, request }) => {
    const product = await createProduct("webhook-paid", { "One size": 3 });
    const { userId } = await customerWithBag(page, product);
    const { orderId, sessionId } = await pendingOrder(product, userId);

    const eventId = `evt_e2e_paid_${orderId}`;
    const first = await send(request, "checkout.session.completed", session(orderId, sessionId), eventId);
    expect(first.status()).toBe(200);
    const [order] = await sql()`select * from orders where id = ${orderId}`;
    expect(order.status).toBe("paid");
    expect(order.payment_status).toBe("paid");
    const [cart] = await sql()`select count(*)::int as n from cart_items where user_id = ${userId}`;
    expect(cart.n).toBe(0);

    const duplicate = await send(request, "checkout.session.completed", session(orderId, sessionId), eventId);
    expect(await duplicate.json()).toMatchObject({ duplicate: true });
    const expiredLate = await send(request, "checkout.session.expired", session(orderId, sessionId));
    expect(expiredLate.status()).toBe(200);
    const [still] = await sql()`select status from orders where id = ${orderId}`;
    expect(still.status).toBe("paid");
    expect(await stockOf(product)).toBe(2);
  });

  test("events outside the checkout flow are acknowledged and ignored", async ({ request }) => {
    const response = await send(request, "customer.created", { id: "cus_e2e", object: "customer" });
    expect(response.status()).toBe(200);
    expect(await response.json()).toMatchObject({ ignored: true });
  });

  test("a delayed payment is confirmed by async_payment_succeeded", async ({ page, request }) => {
    const product = await createProduct("webhook-async-ok", { "One size": 3 });
    const { userId } = await customerWithBag(page, product);
    const { orderId, sessionId } = await pendingOrder(product, userId);

    await send(request, "checkout.session.completed", session(orderId, sessionId, { payment_status: "unpaid" }));
    const [processing] = await sql()`select status, payment_status from orders where id = ${orderId}`;
    expect(processing).toEqual({ status: "pending", payment_status: "unpaid" });

    const ok = await send(request, "checkout.session.async_payment_succeeded", session(orderId, sessionId));
    expect(ok.status()).toBe(200);
    const [paid] = await sql()`select status, payment_status from orders where id = ${orderId}`;
    expect(paid).toEqual({ status: "paid", payment_status: "paid" });
    expect(await stockOf(product)).toBe(2);
  });

  test("a failed delayed payment releases the order and its stock", async ({ page, request }) => {
    const product = await createProduct("webhook-async-fail", { "One size": 3 });
    const { userId } = await customerWithBag(page, product);
    const { orderId, sessionId } = await pendingOrder(product, userId);

    const failed = await send(request, "checkout.session.async_payment_failed", session(orderId, sessionId, { payment_status: "unpaid" }));
    expect(failed.status()).toBe(200);
    const [row] = await sql()`select status, payment_status from orders where id = ${orderId}`;
    expect(row).toEqual({ status: "failed", payment_status: "failed" });
    expect(await stockOf(product)).toBe(3);
    const [cart] = await sql()`select count(*)::int as n from cart_items where user_id = ${userId}`;
    expect(cart.n).toBe(1);
  });

  test("an unpaid (delayed) completion waits; expiry returns stock once", async ({ page, request }) => {
    const product = await createProduct("webhook-expire", { "One size": 3 });
    const { userId } = await customerWithBag(page, product);
    const { orderId, sessionId } = await pendingOrder(product, userId);

    await send(request, "checkout.session.completed", session(orderId, sessionId, { payment_status: "unpaid" }));
    const [waiting] = await sql()`select status from orders where id = ${orderId}`;
    expect(waiting.status).toBe("pending");

    const expiredEvent = `evt_e2e_expired_${orderId}`;
    await send(request, "checkout.session.expired", session(orderId, sessionId, { status: "expired", payment_status: "unpaid" }), expiredEvent);
    await send(request, "checkout.session.expired", session(orderId, sessionId, { status: "expired", payment_status: "unpaid" }));
    const [released] = await sql()`select status from orders where id = ${orderId}`;
    expect(released.status).toBe("expired");
    expect(await stockOf(product)).toBe(3);
  });
});
