import { expect, test, type Page } from "@playwright/test";
import {
  createProduct,
  expectSignInRedirect,
  seedOrder,
  signUp,
  sql,
  uniqueEmail,
  type FixtureProduct,
} from "./support";

const usd = (cents: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);

const longDate = (iso: string) =>
  new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(new Date(iso));

const orderNumber = (id: string) => id.slice(0, 8).toUpperCase();

async function customer(page: Page, label = "history") {
  const email = uniqueEmail(label);
  await signUp(page, "History Customer", email);
  await expect(page).toHaveURL("/account");
  const [row] = await sql()`select id from "user" where email = ${email}`;
  return { email, userId: row.id as string };
}

const rowFor = (page: Page, orderId: string) =>
  page.getByRole("listitem", { name: `Order ${orderNumber(orderId)}` });

const navOrders = (page: Page) =>
  page.getByRole("navigation", { name: "My account" }).getByRole("link", { name: "Orders" });

test.describe("order history list", () => {
  test("a customer with no orders sees an empty state", async ({ page }) => {
    await customer(page);
    await page.goto("/account/orders");
    await expect(page.getByRole("heading", { level: 1, name: "My orders" })).toBeVisible();
    await expect(page.getByText("You haven't placed any orders yet.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Discover new arrivals" })).toBeVisible();
    await expect(page.getByRole("list", { name: "Your orders" })).toHaveCount(0);
    await expect(navOrders(page)).toHaveAttribute("aria-current", "page");
  });

  test("each order shows its date, payment status and total", async ({ page }) => {
    const sweater = await createProduct("history-a", { M: 5 }, 89_000);
    const { userId, email } = await customer(page);
    const created = "2026-03-14T15:00:00.000Z";
    const paid = await seedOrder(userId, email, sweater, "paid", { createdAt: created });
    const review = await seedOrder(userId, email, sweater, "needs_review", {
      quantity: 1,
      createdAt: "2026-03-15T15:00:00.000Z",
    });
    const pending = await seedOrder(userId, email, sweater, "pending", {
      quantity: 3,
      createdAt: "2026-03-16T15:00:00.000Z",
    });

    await page.goto("/account/orders");

    const first = rowFor(page, paid.orderId);
    await expect(first).toContainText(longDate(created));
    await expect(first.getByTestId("payment-status")).toHaveText("Paid");
    await expect(first.getByTestId("order-list-total")).toHaveText(usd(178_000));
    await expect(first).toContainText("2 items");
    await expect(first.getByRole("link", { name: `Order ${orderNumber(paid.orderId)}` })).toHaveAttribute(
      "href",
      `/account/orders/${paid.orderId}`,
    );

    const flagged = rowFor(page, review.orderId);
    await expect(flagged.getByTestId("payment-status")).toHaveText("Paid · Under review");
    await expect(flagged).toContainText("1 item");
    await expect(flagged.getByTestId("order-list-total")).toHaveText(usd(89_000));

    const waiting = rowFor(page, pending.orderId);
    await expect(waiting.getByTestId("payment-status")).toHaveText("Awaiting confirmation");
    await expect(waiting.getByTestId("order-list-total")).toHaveText(usd(267_000));

    // Newest first.
    const labels = await page.getByRole("list", { name: "Your orders" }).getByRole("listitem").evaluateAll(
      (nodes) => nodes.map((node) => node.getAttribute("aria-label")),
    );
    expect(labels).toEqual([pending, review, paid].map(({ orderId }) => `Order ${orderNumber(orderId)}`));
  });

  test("only checkouts that took a payment appear in the history", async ({ page }) => {
    const product = await createProduct("history-hidden", { M: 5 }, 30_000);
    const { userId, email } = await customer(page);
    const shown = await seedOrder(userId, email, product, "paid");
    const hidden = await Promise.all([
      seedOrder(userId, email, product, "failed"),
      seedOrder(userId, email, product, "cancelled"),
      seedOrder(userId, email, product, "expired"),
    ]);
    // Past its hold but not released: it may be a delayed payment still
    // processing, or a paid order whose webhook is late. Never hide it.
    const lapsed = await seedOrder(userId, email, product, "pending", { expiresInMinutes: -60 });

    await page.goto("/account/orders");
    await expect(page.getByRole("list", { name: "Your orders" }).getByRole("listitem")).toHaveCount(2);
    await expect(rowFor(page, shown.orderId)).toBeVisible();
    await expect(rowFor(page, lapsed.orderId).getByTestId("payment-status")).toHaveText(
      "Awaiting confirmation",
    );
    for (const { orderId } of hidden) await expect(rowFor(page, orderId)).toHaveCount(0);
  });

  test("a customer only ever sees their own orders", async ({ browser }) => {
    const product = await createProduct("history-private", { M: 5 }, 45_000);
    const alicePage = await browser.newPage();
    const alice = await customer(alicePage, "alice");
    const aliceOrder = await seedOrder(alice.userId, alice.email, product, "paid");

    const bobPage = await browser.newPage();
    const bob = await customer(bobPage, "bob");
    const bobOrder = await seedOrder(bob.userId, bob.email, product, "paid", { quantity: 1 });

    await alicePage.goto("/account/orders");
    await expect(rowFor(alicePage, aliceOrder.orderId)).toBeVisible();
    await expect(rowFor(alicePage, bobOrder.orderId)).toHaveCount(0);
    await expect(alicePage.getByRole("list", { name: "Your orders" }).getByRole("listitem")).toHaveCount(1);

    await bobPage.goto("/account/orders");
    await expect(rowFor(bobPage, bobOrder.orderId)).toBeVisible();
    await expect(rowFor(bobPage, aliceOrder.orderId)).toHaveCount(0);
    await alicePage.close();
    await bobPage.close();
  });

  test("the list does not scroll horizontally", async ({ page }) => {
    const product = await createProduct("history-overflow-with-a-rather-long-product-name", { M: 5 });
    const { userId, email } = await customer(page, "a-very-long-address-for-wrapping-in-narrow-layouts");
    for (let i = 0; i < 4; i++) await seedOrder(userId, email, product, "paid");
    await page.goto("/account/orders");
    await expect(page.getByRole("list", { name: "Your orders" }).getByRole("listitem")).toHaveCount(4);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe("order details", () => {
  async function paidOrder(page: Page, product: FixtureProduct) {
    const { userId, email } = await customer(page, "detail");
    const order = await seedOrder(userId, email, product, "paid", { createdAt: "2026-04-02T12:00:00.000Z" });
    return { ...order, email, userId };
  }

  test("opening an order shows its full details", async ({ page }) => {
    const product = await createProduct("history-detail", { M: 5 }, 89_000);
    const { orderId, email } = await paidOrder(page, product);

    await page.goto("/account/orders");
    await rowFor(page, orderId).getByRole("link", { name: /Order/ }).click();
    await expect(page).toHaveURL(`/account/orders/${orderId}`);

    await expect(page.getByRole("heading", { level: 1, name: `Order ${orderNumber(orderId)}` })).toBeVisible();
    await expect(page.getByTestId("payment-status")).toHaveText("Paid");
    const item = page.getByRole("listitem", { name: product.name });
    await expect(item).toContainText("Size: M");
    await expect(item).toContainText(`Qty 2 × ${usd(89_000)}`);
    await expect(item.locator("img")).toHaveCount(1);
    await expect(page.getByTestId("order-total")).toHaveText(usd(178_000));
    await expect(page.getByText("Total paid")).toBeVisible();

    const details = page.getByRole("region", { name: "Order details" });
    await expect(details).toContainText(orderNumber(orderId));
    await expect(details).toContainText(longDate("2026-04-02T12:00:00.000Z"));
    await expect(details).toContainText(email);
    await expect(details).toContainText("350 5th Ave, Floor 2");
    await expect(details).toContainText("New York, NY 10118");

    // The Orders tab stays highlighted, and there is a way back.
    await expect(navOrders(page)).toHaveAttribute("aria-current", "page");
    await page.getByRole("link", { name: "All orders", exact: true }).click();
    await expect(page).toHaveURL("/account/orders");
  });

  test("a pending order explains that payment confirmation is awaited", async ({ page }) => {
    const product = await createProduct("history-detail-pending", { M: 5 }, 20_000);
    const { userId, email } = await customer(page, "pending");
    const { orderId } = await seedOrder(userId, email, product, "pending");
    await page.goto(`/account/orders/${orderId}`);
    await expect(page.getByTestId("payment-status")).toHaveText("Awaiting confirmation");
    await expect(page.getByText("still waiting for confirmation of your payment")).toBeVisible();
    await expect(page.getByText("Total", { exact: true })).toBeVisible();
    await expect(page.getByText("Total paid")).toHaveCount(0);
  });

  test("an order under review is acknowledged", async ({ page }) => {
    const product = await createProduct("history-detail-review", { M: 5 }, 20_000);
    const { userId, email } = await customer(page, "review");
    const { orderId } = await seedOrder(userId, email, product, "needs_review");
    await page.goto(`/account/orders/${orderId}`);
    await expect(page.getByTestId("payment-status")).toHaveText("Paid · Under review");
    await expect(page.getByText("Our client services team will be in touch")).toBeVisible();
  });

  test("other customers' orders, non-orders and bad ids are not found", async ({ browser }) => {
    const product = await createProduct("history-detail-private", { M: 5 }, 20_000);
    const ownerPage = await browser.newPage();
    const owner = await customer(ownerPage, "owner");
    const ownerOrder = await seedOrder(owner.userId, owner.email, product, "paid");

    const otherPage = await browser.newPage();
    const other = await customer(otherPage, "other");
    const failed = await seedOrder(other.userId, other.email, product, "failed");
    const unknown = "00000000-0000-4000-8000-000000000000";

    for (const id of [ownerOrder.orderId, failed.orderId, unknown, "not-a-uuid"]) {
      const response = await otherPage.goto(`/account/orders/${id}`);
      expect(response?.status(), id).toBe(404);
      await expect(otherPage.getByTestId("order-number")).toHaveCount(0);
    }
    await ownerPage.close();
    await otherPage.close();
  });

  test("the order status shows when it was placed and paid", async ({ page }) => {
    const product = await createProduct("history-status-paid", { M: 5 }, 20_000);
    const { orderId } = await paidOrder(page, product);
    await page.goto(`/account/orders/${orderId}`);

    const status = page.getByRole("region", { name: "Order status" });
    const steps = status.getByRole("listitem");
    await expect(steps).toHaveCount(2);
    await expect(steps.nth(0)).toContainText("Order placed");
    await expect(steps.nth(0)).toContainText(longDate("2026-04-02T12:00:00.000Z"));
    await expect(steps.nth(1)).toContainText("Payment confirmed");
    await expect(steps.nth(1)).toContainText(longDate("2026-04-02T12:00:00.000Z"));
    await expect(status.getByText("(complete)")).toHaveCount(2);
  });

  test("a pending order's state updates by itself once payment is confirmed", async ({ page }) => {
    const product = await createProduct("history-status-live", { M: 5 }, 20_000);
    const { userId, email } = await customer(page, "live");
    const { orderId } = await seedOrder(userId, email, product, "pending");
    await page.goto(`/account/orders/${orderId}`);

    const status = page.getByRole("region", { name: "Order status" });
    await expect(status).toContainText("Awaiting payment confirmation");
    await expect(status.getByText("(in progress)")).toHaveCount(1);
    await expect(page.getByTestId("payment-status")).toHaveText("Awaiting confirmation");

    // What the verified webhook does; the page must reflect it without a reload.
    await sql()`update orders set status = 'paid', payment_status = 'paid', paid_at = now(),
      amount_paid_cents = subtotal_cents, stripe_payment_intent_id = ${`pi_e2e_${orderId}`}
      where id = ${orderId}`;
    await expect(page.getByTestId("payment-status")).toHaveText("Paid", { timeout: 15_000 });
    await expect(status).toContainText("Payment confirmed");
    await expect(page.getByText("Total paid")).toBeVisible();
    await expect(page.getByText("still waiting for confirmation")).toHaveCount(0);
  });

  test("an order under review shows the payment as received", async ({ page }) => {
    const product = await createProduct("history-status-review", { M: 5 }, 20_000);
    const { userId, email } = await customer(page, "reviewstate");
    const { orderId } = await seedOrder(userId, email, product, "needs_review");
    await page.goto(`/account/orders/${orderId}`);
    const status = page.getByRole("region", { name: "Order status" });
    await expect(status).toContainText("Payment received");
    await expect(status).toContainText("Being reviewed by client services");
  });

  test("the detail page does not scroll horizontally", async ({ page }) => {
    const product = await createProduct("history-detail-overflow-with-a-long-name", { M: 5 });
    const { userId, email } = await customer(page, "a-long-address-for-wrapping-the-order-detail");
    const { orderId } = await seedOrder(userId, email, product, "paid");
    await page.goto(`/account/orders/${orderId}`);
    await expect(page.getByRole("region", { name: "Order status" })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("order pages require sign-in", async ({ page }) => {
    const path = "/account/orders/00000000-0000-4000-8000-000000000000";
    await page.goto(path);
    await expectSignInRedirect(page, path);
  });

  test("the confirmation page's account link leads to the new order", async ({ page }) => {
    const product = await createProduct("history-from-confirmation", { M: 5 }, 20_000);
    const { userId, email } = await customer(page, "flow");
    const { orderId, sessionId } = await seedOrder(userId, email, product, "paid");
    await page.goto(`/checkout/success?session_id=${sessionId}`);
    await page.getByRole("link", { name: "Go to your account" }).click();
    await page.goto("/account/orders");
    await expect(rowFor(page, orderId)).toBeVisible();
  });
});
