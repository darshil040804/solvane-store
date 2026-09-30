import { expect, test, type Page } from "@playwright/test";
import {
  createProduct,
  expectSignInRedirect,
  PASSWORD,
  setPrice,
  setStock,
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

async function newCustomer(page: Page, label = "cart") {
  const email = uniqueEmail(label);
  await signUp(page, "Cart Customer", email);
  await expect(page).toHaveURL("/account");
  return email;
}

async function addToBag(page: Page, product: FixtureProduct, size?: string) {
  await page.goto(`/products/${product.slug}`);
  if (size) await page.getByRole("main").getByText(size, { exact: true }).click();
  await page.getByRole("button", { name: "Add to bag" }).click();
}

const status = (page: Page) => page.locator("#size-message");
const subtotal = (page: Page) => page.getByTestId("cart-subtotal");
const line = (page: Page, product: FixtureProduct) =>
  page.getByRole("listitem", { name: product.name });
const stepper = (page: Page, product: FixtureProduct) =>
  line(page, product).getByRole("group", { name: `Quantity for ${product.name}` });
const increase = (page: Page, product: FixtureProduct) =>
  line(page, product).getByRole("button", { name: `Increase quantity of ${product.name}` });
const decrease = (page: Page, product: FixtureProduct) =>
  line(page, product).getByRole("button", { name: `Decrease quantity of ${product.name}` });

async function cartQuantity(email: string, productId: string) {
  const rows = await sql()`
    select ci.quantity from cart_items ci join "user" u on u.id = ci.user_id
    where u.email = ${email} and ci.product_id = ${productId}`;
  return rows[0]?.quantity ?? 0;
}

test.describe("signed out", () => {
  test("adding to bag asks the guest to sign in, then returns to the product", async ({
    page,
  }) => {
    const product = await createProduct("guest", { "One size": 3 });
    await addToBag(page, product);
    await expectSignInRedirect(page, `/products/${product.slug}`);

    await page.getByRole("link", { name: "Create an account" }).click();
    await signUpOnCurrentPage(page, uniqueEmail("guest"));
    await expect(page).toHaveURL(`/products/${product.slug}`);

    await page.getByRole("button", { name: "Add to bag" }).click();
    await expect(status(page)).toContainText("was added to your bag");
  });

  test("the bag page requires sign-in", async ({ page }) => {
    await page.goto("/cart");
    await expectSignInRedirect(page, "/cart");
  });
});

async function signUpOnCurrentPage(page: Page, email: string) {
  const main = page.getByRole("main");
  await main.getByLabel("Full name").fill("Returning Guest");
  await main.getByLabel("Email address").fill(email);
  await main.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
}

test.describe("adding", () => {
  test("a sized product needs a size", async ({ page }) => {
    const product = await createProduct("needs-size", { S: 2, M: 1 });
    await newCustomer(page);
    await addToBag(page, product);
    await expect(status(page)).toHaveText("Please select a size.");
  });

  test("adds, increments and stops at available stock", async ({ page }) => {
    const product = await createProduct("stock-limit", { S: 2, M: 0 }, 125_000);
    const email = await newCustomer(page);

    await addToBag(page, product, "S");
    await expect(status(page)).toContainText(`${product.name}, size S, was added to your bag.`);
    await page.getByRole("button", { name: "Add to bag" }).click();
    await expect(status(page)).toContainText("was added");
    await expect.poll(() => cartQuantity(email, product.id)).toBe(2);

    await page.getByRole("button", { name: "Add to bag" }).click();
    await expect(status(page)).toHaveText("You already have all 2 available in your bag.");
    expect(await cartQuantity(email, product.id)).toBe(2);

    await page.goto("/cart");
    const item = line(page, product);
    await expect(item.getByText("Size: S")).toBeVisible();
    await expect(stepper(page, product).locator("output")).toHaveText("2");
    // Stock is 2, so the + button is disabled and the low-stock state shows.
    await expect(increase(page, product)).toBeDisabled();
    await expect(item.getByText("Only 2 left")).toBeVisible();
    await expect(item.getByTestId("line-total")).toHaveText(usd(250_000));
    await expect(subtotal(page)).toHaveText(usd(250_000));
    await expect(page.getByRole("heading", { level: 1 })).toContainText("(2 items)");
  });
});

test.describe("changing the bag", () => {
  test("the stepper stops at stock and updates totals", async ({ page }) => {
    const product = await createProduct("quantity", { "One size": 4 }, 40_000);
    const email = await newCustomer(page);
    await addToBag(page, product);
    await status(page).getByRole("link", { name: "View bag" }).click();
    await expect(page).toHaveURL("/cart");

    const value = stepper(page, product).locator("output");
    await expect(decrease(page, product)).toBeDisabled();
    for (const expected of ["2", "3", "4"]) {
      await increase(page, product).click();
      await expect(value).toHaveText(expected);
    }
    await expect(subtotal(page)).toHaveText(usd(160_000));
    await expect(line(page, product).getByTestId("line-total")).toHaveText(usd(160_000));
    await expect(increase(page, product)).toBeDisabled();
    await expect(line(page, product).getByText("That's all we have in stock.")).toBeVisible();

    await decrease(page, product).click();
    await expect(subtotal(page)).toHaveText(usd(120_000));
    await expect.poll(() => cartQuantity(email, product.id)).toBe(3);
    await page.reload();
    await expect(value).toHaveText("3");
  });

  test("subtotal sums every line, and removing lines updates it", async ({ page }) => {
    const first = await createProduct("sum-a", { "One size": 5 }, 30_000);
    const second = await createProduct("sum-b", { M: 2 }, 55_000);
    await newCustomer(page);
    await addToBag(page, first);
    await expect(status(page)).toContainText("was added");
    await addToBag(page, second, "M");
    await expect(status(page)).toContainText("was added");

    await page.goto("/cart");
    await expect(subtotal(page)).toHaveText(usd(85_000));

    await line(page, first).getByRole("button", { name: `Remove ${first.name}` }).click();
    await expect(line(page, first)).toHaveCount(0);
    await expect(subtotal(page)).toHaveText(usd(55_000));

    await line(page, second).getByRole("button", { name: `Remove ${second.name}` }).click();
    await expect(page.getByRole("heading", { name: "Your bag is empty" })).toBeVisible();
  });
});

test.describe("current catalog data", () => {
  test("prices come from the current product, not from when it was added", async ({ page }) => {
    const product = await createProduct("price", { "One size": 2 }, 50_000);
    await newCustomer(page);
    await addToBag(page, product);
    await expect(status(page)).toContainText("was added");

    await setPrice(product.id, 65_000);
    await page.goto("/cart");
    await expect(line(page, product)).toContainText(usd(65_000));
    await expect(subtotal(page)).toHaveText(usd(65_000));
  });

  test("lines are limited when stock drops, and excluded when it runs out", async ({ page }) => {
    const product = await createProduct("stock-drop", { "One size": 3 }, 20_000);
    await newCustomer(page);
    await addToBag(page, product);
    await expect(status(page)).toContainText("was added");
    await page.getByRole("button", { name: "Add to bag" }).click();
    await expect(status(page)).toContainText("was added");

    await setStock(product.id, "One size", 1);
    await page.goto("/cart");
    const item = line(page, product);
    await expect(page.getByText("Availability has changed for some pieces")).toBeVisible();
    await expect(item).toContainText("Only 1 available in stock. You have 2 in your bag.");
    await expect(subtotal(page)).toHaveText(usd(20_000));
    await expect(stepper(page, product)).toHaveCount(0);

    // The customer can bring the saved quantity in line with stock.
    await item.getByRole("button", { name: "Update to 1" }).click();
    await expect(stepper(page, product).locator("output")).toHaveText("1");
    await expect(item.getByText("Only 1 left")).toBeVisible();
    await expect(page.getByText("Availability has changed for some pieces")).toHaveCount(0);

    await setStock(product.id, "One size", 0);
    await page.reload();
    await expect(item.getByText("Sold out", { exact: true })).toBeVisible();
    await expect(item).toContainText("no longer available and isn't included in your subtotal");
    await expect(stepper(page, product)).toHaveCount(0);
    await expect(page.getByText("1 piece is no longer available and isn't included.")).toBeVisible();
    await expect(subtotal(page)).toHaveText(usd(0));

    await item.getByRole("button", { name: `Remove ${product.name}` }).click();
    await expect(page.getByRole("heading", { name: "Your bag is empty" })).toBeVisible();
  });

  test("a quantity change is rejected if stock dropped since the page loaded", async ({ page }) => {
    const product = await createProduct("stale", { "One size": 3 }, 10_000);
    const email = await newCustomer(page);
    await addToBag(page, product);
    await expect(status(page)).toContainText("was added");

    await page.goto("/cart");
    await setStock(product.id, "One size", 1);
    await increase(page, product).click();
    await expect(line(page, product).getByRole("alert")).toHaveText(
      "Only 1 available, so we couldn't change the quantity.",
    );
    // The optimistic value rolls back to what is saved.
    await expect(stepper(page, product).locator("output")).toHaveText("1");
    expect(await cartQuantity(email, product.id)).toBe(1);
  });
});

test("each customer only sees their own bag", async ({ browser }) => {
  const product = await createProduct("isolation", { "One size": 4 });
  const alice = await browser.newPage();
  await newCustomer(alice, "alice");
  await addToBag(alice, product);
  await expect(status(alice)).toContainText("was added");

  const bob = await browser.newPage();
  await newCustomer(bob, "bob");
  await bob.goto("/cart");
  await expect(bob.getByRole("heading", { name: "Your bag is empty" })).toBeVisible();
  await alice.close();
  await bob.close();
});
