import { expect, test, type Page } from "@playwright/test";
import { createProduct, seedOrder, signUp, sql, uniqueEmail } from "./support";

// The confirmation page renders only what is stored on the order, which only the
// verified Stripe webhook can mark paid, so these tests seed orders directly.

const usd = (cents: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);

async function customer(page: Page) {
  const email = uniqueEmail("confirm");
  await signUp(page, "Confirm Customer", email);
  await expect(page).toHaveURL("/account");
  const [row] = await sql()`select id from "user" where email = ${email}`;
  return { email, userId: row.id as string };
}

const heading = (page: Page) => page.getByTestId("order-heading");

test.describe("confirmed orders", () => {
  test("a paid order shows the full confirmation", async ({ page }) => {
    const product = await createProduct("confirm-paid", { M: 3 }, 89_000);
    const { userId, email } = await customer(page);
    const { orderId, sessionId } = await seedOrder(userId, email, product, "paid");

    await page.goto(`/checkout/success?session_id=${sessionId}`);
    await expect(heading(page)).toHaveText("Thank you for your order");
    await expect(page.getByText("Order confirmed", { exact: true })).toBeVisible();
    await expect(page.getByTestId("order-number")).toHaveText(orderId.slice(0, 8).toUpperCase());

    const item = page.getByRole("listitem", { name: product.name });
    await expect(item).toContainText("Size: M");
    await expect(item).toContainText(`Qty 2 × ${usd(89_000)}`);
    await expect(item).toContainText(usd(178_000));
    await expect(item.locator("img")).toHaveCount(1);
    await expect(page.getByRole("heading", { name: /Your order/ })).toContainText("(2 items)");

    await expect(page.getByTestId("order-total")).toHaveText(usd(178_000));
    await expect(page.getByText("Total paid")).toBeVisible();
    await expect(page.getByTestId("payment-state")).toHaveText("Paid");
    await expect(page.getByText(email)).toBeVisible();
    const details = page.getByRole("region", { name: "Order details" });
    await expect(details).toContainText("Ada Customer");
    await expect(details).toContainText("350 5th Ave, Floor 2");
    await expect(details).toContainText("New York, NY 10118");
    await expect(details).toContainText("Complimentary express delivery in 2–4 business days");

    await expect(page.getByRole("link", { name: "Continue shopping" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Go to your account" })).toBeVisible();
    await expect(page.getByText("Confirming your payment")).toHaveCount(0);
  });

  test("an order flagged for review is acknowledged without promising delivery", async ({ page }) => {
    const product = await createProduct("confirm-review", { "One size": 2 }, 40_000);
    const { userId, email } = await customer(page);
    const { sessionId } = await seedOrder(userId, email, product, "needs_review", {
      size: "One size",
      quantity: 1,
    });
    await page.goto(`/checkout/success?session_id=${sessionId}`);
    await expect(heading(page)).toHaveText("We're confirming your order");
    await expect(page.getByText("Our client services team will be in touch")).toBeVisible();
    await expect(page.getByTestId("payment-state")).toHaveText("Paid");
    // Unsized products don't show a size line.
    await expect(page.getByRole("listitem", { name: product.name })).not.toContainText("Size:");
  });
});

test.describe("pending confirmation", () => {
  test("shows a waiting state and never marks the order paid itself", async ({ page }) => {
    const product = await createProduct("confirm-pending", { M: 3 }, 50_000);
    const { userId, email } = await customer(page);
    const { orderId, sessionId } = await seedOrder(userId, email, product, "pending");

    await page.goto(`/checkout/success?session_id=${sessionId}`);
    await expect(heading(page)).toHaveText("Confirming your payment");
    await expect(page.getByText("This page updates automatically")).toBeVisible();
    await expect(page.getByTestId("payment-state")).toHaveText("Awaiting confirmation");
    await expect(page.getByTestId("order-total")).toHaveText(usd(100_000));
    await expect(page.getByText("Total", { exact: true })).toBeVisible();
    await expect(page.getByText("Total paid")).toHaveCount(0);
    await expect(page.getByText("Shipping to")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Go to your account" })).toHaveCount(0);

    const [row] = await sql()`select status, payment_status from orders where id = ${orderId}`;
    expect(row).toEqual({ status: "pending", payment_status: "unpaid" });
  });

  test("updates by itself when the payment is confirmed", async ({ page }) => {
    const product = await createProduct("confirm-live", { M: 3 }, 50_000);
    const { userId, email } = await customer(page);
    const { orderId, sessionId } = await seedOrder(userId, email, product, "pending");

    await page.goto(`/checkout/success?session_id=${sessionId}`);
    await expect(heading(page)).toHaveText("Confirming your payment");

    // What the verified webhook does; the page must pick it up without a reload.
    await sql()`update orders set status = 'paid', payment_status = 'paid', paid_at = now(),
      amount_paid_cents = subtotal_cents, stripe_payment_intent_id = ${`pi_e2e_${orderId}`}
      where id = ${orderId}`;
    await expect(heading(page)).toHaveText("Thank you for your order", { timeout: 15_000 });
    await expect(page.getByTestId("payment-state")).toHaveText("Paid");
    await expect(page.getByText("Total paid")).toBeVisible();
  });

  test("explains a long wait and lets the customer check again", async ({ page }) => {
    const product = await createProduct("confirm-slow", { M: 3 }, 50_000);
    const { userId, email } = await customer(page);
    const { sessionId } = await seedOrder(userId, email, product, "pending");

    await page.clock.install();
    await page.goto(`/checkout/success?session_id=${sessionId}`);
    await expect(heading(page)).toHaveText("Confirming your payment");
    // The heading is server-rendered, so the polling timer may not exist yet;
    // keep advancing the clock until it has started and runs out.
    const slow = page.getByText("This is taking longer than usual.");
    await expect(async () => {
      await page.clock.fastForward(65_000);
      await expect(slow).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: 20_000 });
    await expect(slow).toBeVisible();
    await expect(page.getByText("There's no need to pay again")).toBeVisible();
    await expect(page.getByRole("link", { name: "Return to your bag" })).toBeVisible();

    await page.getByRole("button", { name: "Check again" }).click();
    await expect(page.getByText("This page updates automatically")).toBeVisible();
  });
});

test.describe("orders that did not complete", () => {
  for (const [status, title, eyebrow] of [
    ["failed", "Your payment didn't go through", "Payment unsuccessful"],
    ["cancelled", "This checkout was not completed", "Checkout"],
    ["expired", "This checkout was not completed", "Checkout"],
  ] as const) {
    test(`a ${status} order shows that nothing was charged`, async ({ page }) => {
      const product = await createProduct(`confirm-${status}`, { M: 3 });
      const { userId, email } = await customer(page);
      const { sessionId } = await seedOrder(userId, email, product, status);

      await page.goto(`/checkout/success?session_id=${sessionId}`);
      await expect(heading(page)).toHaveText(title);
      await expect(page.getByText(eyebrow, { exact: true })).toBeVisible();
      await expect(page.getByText("No payment was taken and your bag is unchanged")).toBeVisible();
      // No order details or "thank you": this isn't a confirmation.
      await expect(page.getByTestId("order-number")).toHaveCount(0);
      await expect(page.getByText("Thank you for your order")).toHaveCount(0);
      await expect(page.getByRole("link", { name: "Return to your bag" })).toHaveAttribute("href", "/cart");
    });
  }
});

test.describe("access", () => {
  test("only the customer who placed the order can see it", async ({ browser }) => {
    const product = await createProduct("confirm-private", { M: 3 });
    const owner = await browser.newPage();
    const { userId, email } = await customer(owner);
    const { sessionId } = await seedOrder(userId, email, product, "paid");

    const other = await browser.newPage();
    await customer(other);
    const response = await other.goto(`/checkout/success?session_id=${sessionId}`);
    expect(response?.status()).toBe(404);
    await expect(other.getByTestId("order-number")).toHaveCount(0);
    await owner.close();
    await other.close();
  });

  test("unknown or malformed session ids are not found", async ({ page }) => {
    await customer(page);
    for (const id of ["cs_test_doesnotexist123", "not-a-session", "cs_test_../etc"]) {
      const response = await page.goto(`/checkout/success?session_id=${encodeURIComponent(id)}`);
      expect(response?.status()).toBe(404);
    }
    expect((await page.goto("/checkout/success"))?.status()).toBe(404);
  });
});
