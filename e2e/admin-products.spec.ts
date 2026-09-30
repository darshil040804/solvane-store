import { expect, test } from "@playwright/test";
import {
  createProduct,
  ensureFixtureCategories,
  expectSignInRedirect,
  FIXTURE_CATEGORY_ALT,
  FIXTURE_IMAGE,
  setStock,
  signInAsAdmin,
  signUp,
  sql,
  uniqueEmail,
} from "./support";

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

test.describe("access", () => {
  test("anonymous visitors are sent to sign-in", async ({ page }) => {
    await page.goto("/admin/products/new");
    await expectSignInRedirect(page, "/admin/products/new");
  });

  test("customers get a 404 on product admin pages", async ({ page }) => {
    const product = await createProduct("admin-access", { M: 1 });
    await signUp(page, "Curious Customer", uniqueEmail("productadmin"));
    await expect(page).toHaveURL("/account");

    for (const path of ["/admin/products/new", `/admin/products/${product.id}`]) {
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(404);
    }
  });

  test("customers and anonymous callers can't run product actions", async ({
    page,
    browser,
    playwright,
  }) => {
    const product = await createProduct("admin-forbidden", { M: 1 });
    await signInAsAdmin(page);
    await page.goto(`/admin/products/${product.id}`);

    // Capture a real "save product" server action request made by the admin.
    const adminName = `E2E Admin rename ${uid()}`;
    await page.getByLabel("Name", { exact: true }).fill(adminName);
    const [request] = await Promise.all([
      page.waitForRequest((r) => r.method() === "POST" && Boolean(r.headers()["next-action"])),
      page.getByRole("button", { name: "Save changes" }).click(),
    ]);
    await expect(page.getByText("Changes saved.")).toBeVisible();

    const replay = {
      headers: {
        "next-action": request.headers()["next-action"],
        "content-type": request.headers()["content-type"],
        accept: "text/x-component",
        origin: "http://localhost:3000",
      },
      data: request.postData()!.replaceAll(adminName, "Hacked"),
    };

    const customer = await browser.newContext();
    const customerPage = await customer.newPage();
    await signUp(customerPage, "Sneaky Customer", uniqueEmail("sneaky"));
    await expect(customerPage).toHaveURL("/account");
    const asCustomer = await customerPage.request.post(request.url(), replay);
    expect(await asCustomer.text()).toContain('"forbidden"');
    await customer.close();

    // A forged cookie gets past the proxy's cookie check, so this reaches the action itself.
    const anonymous = await playwright.request.newContext();
    const asAnonymous = await anonymous.post(request.url(), {
      ...replay,
      headers: { ...replay.headers, cookie: "better-auth.session_token=forged.value" },
    });
    expect(await asAnonymous.text()).toContain('"forbidden"');
    await anonymous.dispose();

    const [row] = await sql()`select name from products where id = ${product.id}`;
    expect(row.name).toBe(adminName);
  });
});

test("lists products with their price and availability", async ({ page }) => {
  const product = await createProduct("admin-list", { S: 2, M: 0 }, 19_999);
  await signInAsAdmin(page);
  await page.goto("/admin/products");

  await expect(page.getByRole("heading", { level: 1, name: "Products" })).toBeVisible();
  const row = page.getByRole("row").filter({ hasText: product.slug });
  await expect(row.getByRole("link", { name: product.name })).toHaveAttribute(
    "href",
    `/admin/products/${product.id}`,
  );
  await expect(row).toContainText("$199.99");
  await expect(row).toContainText("2 available across 2 sizes");
});

test("creates a sized product that appears in the store", async ({ page }) => {
  await ensureFixtureCategories();
  const name = `E2E Created ${uid()}`;
  const slug = name.toLowerCase().replaceAll(" ", "-");

  await signInAsAdmin(page);
  await page.goto("/admin/products");
  await page.getByRole("link", { name: "New product" }).click();
  await expect(page).toHaveURL("/admin/products/new");

  await page.getByLabel("Name", { exact: true }).fill(name);
  await expect(page.getByLabel("URL slug")).toHaveValue(slug);
  await page.getByLabel("Description").fill("Created from the admin.");
  await page.getByLabel("Details (optional)").fill("Silk\nMade in Italy");
  await page.getByLabel("Category", { exact: true }).selectOption({ label: "E2E fixtures" });
  await page.getByLabel("Price (USD)").fill("249.50");
  await page.getByLabel("Image 1 URL").fill(FIXTURE_IMAGE);
  await page.getByLabel("Alt text").fill("Front view");
  await page.getByLabel("This product comes in sizes").check();
  await page.getByLabel("Size 1", { exact: true }).fill("S");
  await page.locator("#field-sizes-0-quantity").fill("3");
  await page.getByRole("button", { name: "Add size" }).click();
  await page.getByLabel("Size 2", { exact: true }).fill("M");
  await page.locator("#field-sizes-1-quantity").fill("0");
  await page.getByRole("button", { name: "Create product" }).click();

  await expect(page).toHaveURL(/\/admin\/products\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();

  const db = sql();
  const [product] = await db`select id, price_cents, details from products where slug = ${slug}`;
  expect(product.price_cents).toBe(24_950);
  expect(product.details).toEqual(["Silk", "Made in Italy"]);
  const stock = await db`select size, quantity from product_stock
    where product_id = ${product.id} order by position`;
  expect(stock).toEqual([
    { size: "S", quantity: 3 },
    { size: "M", quantity: 0 },
  ]);

  await page.goto(`/products/${slug}`);
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  await expect(page.getByText("$249.50", { exact: true }).first()).toBeVisible();
});

test("validates input on the server and saves nothing invalid", async ({ page }) => {
  await ensureFixtureCategories();
  const existing = await createProduct("admin-dup", { "One size": 1 });
  const name = `E2E Invalid ${uid()}`;

  await signInAsAdmin(page);
  await page.goto("/admin/products/new");
  await page.getByLabel("Name", { exact: true }).fill(name);
  await page.getByLabel("Description").fill("Should not be saved.");
  await page.getByLabel("Category", { exact: true }).selectOption({ label: "E2E fixtures" });
  await page.getByLabel("Price (USD)").fill("twelve");
  await page.getByLabel("Image 1 URL").fill("https://example.com/photo.jpg");
  await page.getByLabel("Alt text").fill("Front view");
  await page.getByRole("button", { name: "Create product" }).click();

  await expect(
    page.getByRole("alert").filter({ hasText: "Please fix the highlighted fields." }),
  ).toBeVisible();
  await expect(page.getByText("Enter a price in dollars, like 1250 or 199.99.")).toBeVisible();
  await expect(page.getByText("Use an https URL from images.unsplash.com.")).toBeVisible();
  await expect(page.getByLabel("Price (USD)")).toBeFocused();

  // Valid fields, but a slug another product already uses.
  await page.getByLabel("URL slug").fill(existing.slug);
  await page.getByLabel("Price (USD)").fill("120");
  await page.getByLabel("Image 1 URL").fill(FIXTURE_IMAGE);
  await page.getByRole("button", { name: "Create product" }).click();
  await expect(page.getByText("Another product already uses this slug.")).toBeVisible();
  await expect(page.getByLabel("URL slug")).toBeFocused();

  const rows = await sql()`select id from products where name = ${name}`;
  expect(rows).toHaveLength(0);
});

test("edits details, category and price", async ({ page }) => {
  await ensureFixtureCategories();
  const product = await createProduct("admin-edit", { "One size": 4 }, 50_000);
  const name = `E2E Edited ${uid()}`;

  await signInAsAdmin(page);
  await page.goto(`/admin/products/${product.id}`);
  await expect(page.getByLabel("Price (USD)")).toHaveValue("500");

  await page.getByLabel("Name", { exact: true }).fill(name);
  await page.getByLabel("Category", { exact: true }).selectOption({ label: "E2E fixtures alt" });
  await page.getByLabel("Price (USD)").fill("650");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Changes saved.")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();

  const [row] = await sql()`select p.name, p.price_cents, c.slug as category,
      (select count(*)::int from product_images i where i.product_id = p.id) as images
    from products p join categories c on c.id = p.category_id where p.id = ${product.id}`;
  expect(row).toEqual({ name, price_cents: 65_000, category: FIXTURE_CATEGORY_ALT, images: 1 });

  await page.goto(`/products/${product.slug}`);
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  await expect(page.getByText("$650", { exact: true }).first()).toBeVisible();
});

test("updates availability per size", async ({ page }) => {
  const product = await createProduct("admin-stock", { S: 1, M: 5 });
  await signInAsAdmin(page);
  await page.goto(`/admin/products/${product.id}`);

  await page.getByLabel("S", { exact: true }).fill("7");
  await page.getByRole("button", { name: "Save availability" }).click();
  await expect(page.getByText("Availability saved.")).toBeVisible();

  const stock = await sql()`select size, quantity from product_stock
    where product_id = ${product.id} order by position`;
  expect(stock).toEqual([
    { size: "S", quantity: 7 },
    { size: "M", quantity: 5 },
  ]);

  // Sold out: every size set to 0.
  await page.getByRole("button", { name: "Set all to 0" }).click();
  await page.getByRole("button", { name: "Save availability" }).click();
  await expect(page.getByText("Availability saved.")).toBeVisible();
  const [{ total }] = await sql()`select sum(quantity)::int as total from product_stock
    where product_id = ${product.id}`;
  expect(total).toBe(0);

  await page.goto(`/products/${product.slug}`);
  await expect(page.getByRole("button", { name: "Out of stock" })).toBeDisabled();
});

test("doesn't overwrite stock that a checkout changed meanwhile", async ({ page }) => {
  const product = await createProduct("admin-stale", { M: 5 });
  await signInAsAdmin(page);
  await page.goto(`/admin/products/${product.id}`);
  await expect(page.getByLabel("M", { exact: true })).toHaveValue("5");

  // A checkout reserves two units while the admin is editing.
  await setStock(product.id, "M", 3);
  await page.getByLabel("M", { exact: true }).fill("10");
  await page.getByRole("button", { name: "Save availability" }).click();

  await expect(
    page.getByRole("alert").filter({ hasText: "M changed while you were editing" }),
  ).toBeVisible();
  await expect(page.getByLabel("M", { exact: true })).toHaveValue("3");
  const [row] = await sql()`select quantity from product_stock
    where product_id = ${product.id} and size = 'M'`;
  expect(row.quantity).toBe(3);
});

test("the product editor fits small screens", async ({ page }) => {
  const product = await createProduct("admin-layout-with-a-rather-long-product-name", { XS: 1, S: 2, M: 3 });
  await signInAsAdmin(page);
  await page.goto(`/admin/products/${product.id}`);
  await expect(page.getByRole("button", { name: "Save changes" })).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
