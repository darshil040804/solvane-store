import { expect, type Page, test } from "@playwright/test";
import {
  ADMIN_EMAIL,
  createProduct,
  type FixtureProduct,
  holdStock,
  setStock,
  signInAsAdmin,
  signUp,
  sql,
  stockOf,
  uniqueEmail,
} from "./support";

// Each test works on its own fixture product and searches for its slug, so
// rows from tests running in parallel never show up.

async function openInventory(page: Page, product: FixtureProduct) {
  await page.goto(`/admin/inventory?q=${product.slug}`);
  await expect(page.getByRole("heading", { level: 1, name: "Inventory" })).toBeVisible();
}

const row = (page: Page, size: string) =>
  page.getByRole("row").filter({ has: page.getByRole("cell", { name: size, exact: true }) });

async function adjust(page: Page, product: FixtureProduct, size: string, amount: string) {
  const target = row(page, size);
  await target.getByLabel(`Adjust ${size} of ${product.name}`).fill(amount);
  await target.getByRole("button", { name: `Apply to ${size} of ${product.name}` }).click();
  return target;
}

async function adminId() {
  const [admin] = await sql()`select id from "user" where email = ${ADMIN_EMAIL}`;
  return admin.id as string;
}

test("customers and anonymous callers can't adjust stock", async ({ page, browser, playwright }) => {
  const product = await createProduct("inventory-forbidden", { M: 5 });
  await signInAsAdmin(page);
  await openInventory(page, product);

  // Capture a real adjustment request made by the admin.
  const [request] = await Promise.all([
    page.waitForRequest((r) => r.method() === "POST" && Boolean(r.headers()["next-action"])),
    adjust(page, product, "M", "+1"),
  ]);
  await expect(row(page, "M").getByText("Saved. 6 available.")).toBeVisible();

  const replay = {
    headers: {
      "next-action": request.headers()["next-action"],
      "content-type": request.headers()["content-type"],
      accept: "text/x-component",
      origin: "http://localhost:3000",
    },
    data: request.postData()!.replace('"+1"', '"+500"'),
  };

  const customer = await browser.newContext();
  const customerPage = await customer.newPage();
  await signUp(customerPage, "Sneaky Customer", uniqueEmail("inventory-sneaky"));
  await expect(customerPage).toHaveURL("/account");
  expect(await (await customerPage.request.post(request.url(), replay)).text()).toContain(
    '"forbidden"',
  );
  await customer.close();

  // A forged cookie gets past the proxy's cookie check, so this reaches the action itself.
  const anonymous = await playwright.request.newContext();
  const asAnonymous = await anonymous.post(request.url(), {
    ...replay,
    headers: { ...replay.headers, cookie: "better-auth.session_token=forged.value" },
  });
  expect(await asAnonymous.text()).toContain('"forbidden"');
  await anonymous.dispose();

  expect(await stockOf(product.id, "M")).toBe(6);
});

test("shows available, in-checkout and on-hand stock, with filters", async ({ page }) => {
  const product = await createProduct("inventory-view", { S: 10, M: 2, L: 0 });
  await holdStock(await adminId(), product, "S", 2);
  await signInAsAdmin(page);
  await openInventory(page, product);

  const small = row(page, "S");
  await expect(small.getByTestId("available")).toHaveText("8");
  await expect(small.getByTestId("held")).toHaveText("2");
  await expect(small.getByTestId("on-hand")).toHaveText("10");
  await expect(small.getByRole("link", { name: product.name })).toHaveAttribute(
    "href",
    `/admin/products/${product.id}`,
  );
  await expect(page.locator("tbody tr")).toHaveCount(3);

  const tabs = page.getByRole("navigation", { name: "Stock status" });
  await tabs.getByRole("link", { name: "Low stock" }).click();
  await expect(page).toHaveURL(`/admin/inventory?q=${product.slug}&status=low`);
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(row(page, "M")).toBeVisible();

  await tabs.getByRole("link", { name: "Out of stock" }).click();
  await expect(page).toHaveURL(`/admin/inventory?q=${product.slug}&status=out`);
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(row(page, "L")).toBeVisible();

  await page.goto(`/admin/inventory?q=no-such-product-${product.slug}`);
  await expect(page.getByText("No sizes match these filters.")).toBeVisible();
});

test("adds and removes units, and refuses to go below zero", async ({ page }) => {
  const product = await createProduct("inventory-adjust", { M: 4 });
  await signInAsAdmin(page);
  await openInventory(page, product);

  let medium = await adjust(page, product, "M", "+5");
  await expect(medium.getByText("Saved. 9 available.")).toBeVisible();
  await expect(medium.getByTestId("available")).toHaveText("9");

  medium = await adjust(page, product, "M", "-2");
  await expect(medium.getByText("Saved. 7 available.")).toBeVisible();
  expect(await stockOf(product.id, "M")).toBe(7);

  medium = await adjust(page, product, "M", "-8");
  await expect(medium.getByRole("alert")).toHaveText("Only 7 available, so 8 can't be removed.");

  for (const [amount, message] of [
    ["abc", "Enter a whole number of units, like +5 or -2."],
    ["0", "Enter an amount other than 0."],
    ["+10000", "Enter a whole number of units, like +5 or -2."],
    ["1.5", "Enter a whole number of units, like +5 or -2."],
  ]) {
    medium = await adjust(page, product, "M", amount);
    await expect(medium.getByRole("alert")).toHaveText(message);
  }
  expect(await stockOf(product.id, "M")).toBe(7);
});

test("adjustments apply on top of changes made since the page loaded", async ({ page }) => {
  const product = await createProduct("inventory-concurrent", { M: 5 });
  await signInAsAdmin(page);
  await openInventory(page, product);
  await expect(row(page, "M").getByTestId("available")).toHaveText("5");

  // A checkout reserves two units while the admin has the page open.
  await setStock(product.id, "M", 3);
  const medium = await adjust(page, product, "M", "+3");
  await expect(medium.getByText("Saved. 6 available.")).toBeVisible();
  expect(await stockOf(product.id, "M")).toBe(6);
});

test("releasing a checkout hold after an adjustment returns the held units", async ({ page }) => {
  const product = await createProduct("inventory-hold", { M: 5 });
  const orderId = await holdStock(await adminId(), product, "M", 2);
  expect(await stockOf(product.id, "M")).toBe(3);

  await signInAsAdmin(page);
  await openInventory(page, product);
  const medium = await adjust(page, product, "M", "+4");
  await expect(medium.getByText("Saved. 7 available.")).toBeVisible();

  // The checkout is abandoned: the customer's cancel link releases the hold.
  await page.goto(`/checkout/cancel?order=${orderId}`);
  // The review page sends a customer with an empty bag on to the bag.
  await expect(page).toHaveURL(/\/(checkout|cart)(\?|$)/);
  const [order] = await sql()`select status from orders where id = ${orderId}`;
  expect(order.status).toBe("cancelled");
  expect(await stockOf(product.id, "M")).toBe(9);
});

test("stock adjusted to zero shows as sold out to customers", async ({ page, browser }) => {
  const product = await createProduct("inventory-storefront", { "One size": 2 });

  const customer = await browser.newContext();
  const shopper = await customer.newPage();
  await signUp(shopper, "Inventory Customer", uniqueEmail("inventory-bag"));
  await expect(shopper).toHaveURL("/account");
  await shopper.goto(`/products/${product.slug}`);
  await shopper.getByRole("button", { name: "Add to bag" }).click();
  await expect(shopper.locator("#size-message")).toContainText("was added");

  await signInAsAdmin(page);
  await openInventory(page, product);
  const line = await adjust(page, product, "One size", "-2");
  await expect(line.getByText("Saved. 0 available.")).toBeVisible();

  await shopper.goto(`/products/${product.slug}`);
  await expect(shopper.getByRole("button", { name: "Out of stock" })).toBeDisabled();
  await shopper.goto("/cart");
  await expect(
    shopper.getByRole("listitem", { name: product.name }).getByText("Sold out", { exact: true }),
  ).toBeVisible();
  await customer.close();
});

test("saving product details keeps unsaved availability edits", async ({ page }) => {
  const product = await createProduct("inventory-editor", { S: 1, M: 5 });
  await signInAsAdmin(page);
  await page.goto(`/admin/products/${product.id}`);

  await page.getByLabel("S", { exact: true }).fill("7");
  await page.getByLabel("Name", { exact: true }).fill(`${product.name} renamed`);
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Changes saved.")).toBeVisible();

  await expect(page.getByLabel("S", { exact: true })).toHaveValue("7");
  expect(await stockOf(product.id, "S")).toBe(1);
});

test("the inventory page fits small screens", async ({ page }) => {
  const product = await createProduct("inventory-layout-with-a-rather-long-product-name", {
    XS: 1,
    S: 2,
  });
  await signInAsAdmin(page);
  await openInventory(page, product);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
