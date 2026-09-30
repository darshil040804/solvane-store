import { expect, type Page, test } from "@playwright/test";
import { createProduct, type FixtureProduct } from "./support";

// Customer-facing stock states: low stock (3 or fewer) and out of stock, for
// the product as a whole on cards and for the chosen size on the product page.

// By slug: other runs can create fixture products with the same name.
const card = (page: Page, product: FixtureProduct) =>
  page.getByRole("article").filter({ has: page.locator(`a[href="/products/${product.slug}"]`) });

test("the product page warns when the chosen size is running low", async ({ page }) => {
  const product = await createProduct("low-size", { S: 10, M: 2, L: 0 });
  await page.goto(`/products/${product.slug}`);

  // Plenty overall, so the product-level status stays "In stock".
  await expect(page.getByText("In stock", { exact: true })).toBeVisible();

  const sizes = page.getByRole("group", { name: /Size/ });
  await sizes.getByText("S", { exact: true }).click();
  await expect(page.getByText(/left in size/)).toHaveCount(0);

  await sizes.getByText("M", { exact: true }).click();
  await expect(page.getByText("Only 2 left in size M")).toBeVisible();

  // Sold-out sizes can't be chosen.
  await expect(sizes.getByRole("radio", { name: "L (sold out)" })).toBeDisabled();
});

test("product cards show low stock and sold out", async ({ page }) => {
  const low = await createProduct("low-card", { "One size": 2 });
  const soldOut = await createProduct("sold-out-card", { "One size": 0 });
  const plenty = await createProduct("plenty-card", { "One size": 12 });

  await page.goto("/collections/new-in");
  await expect(card(page, low).getByText("Only 2 left", { exact: true })).toBeVisible();
  await expect(card(page, soldOut).getByText("Sold out", { exact: true })).toBeVisible();
  await expect(card(page, plenty).getByText(/Only \d+ left|Sold out/)).toHaveCount(0);
});

test("an unsized product that sells out can't be added to the bag", async ({ page }) => {
  const product = await createProduct("sold-out-page", { "One size": 0 });
  await page.goto(`/products/${product.slug}`);

  await expect(page.getByText("Out of stock", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Out of stock" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Add to bag" })).toHaveCount(0);
});
