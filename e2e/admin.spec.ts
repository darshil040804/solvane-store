import { expect, test } from "@playwright/test";
import { ADMIN_EMAIL, signIn, signUp, sql, uniqueEmail } from "./support";

const sections = [
  { path: "/admin", link: "Customers", heading: "Customers" },
  { path: "/admin/products", link: "Products", heading: "Products" },
  { path: "/admin/inventory", link: "Inventory", heading: "Inventory" },
  { path: "/admin/categories", link: "Categories", heading: "Categories" },
  { path: "/admin/orders", link: "Orders", heading: "Orders" },
];

test("customers get a 404 and no admin navigation on every admin route", async ({ page }) => {
  await signUp(page, "Curious Customer", uniqueEmail("adminroutes"));
  await expect(page).toHaveURL("/account");

  for (const { path } of sections) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(404);
    await expect(page.getByRole("navigation", { name: "Admin" })).toHaveCount(0);
  }
});

test("admins can move between the admin sections", async ({ page }) => {
  await signIn(page, ADMIN_EMAIL);
  await expect(page).toHaveURL("/account");

  for (const { path, link, heading } of sections) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();

    const nav = page.getByRole("navigation", { name: "Admin" });
    await expect(nav.getByRole("link")).toHaveText(sections.map((section) => section.link));
    await expect(nav.locator('[aria-current="page"]')).toHaveText([link]);
  }

  await page.getByRole("navigation", { name: "Admin" }).getByRole("link", { name: "Orders" }).click();
  await expect(page).toHaveURL("/admin/orders");

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("losing the admin role takes effect on the next request", async ({ page }) => {
  const email = uniqueEmail("exadmin");
  await signUp(page, "Former Admin", email);
  await expect(page).toHaveURL("/account");
  await sql()`update "user" set role = 'admin' where email = ${email}`;

  expect((await page.goto("/admin/products"))?.status()).toBe(200);

  await sql()`update "user" set role = 'user' where email = ${email}`;
  expect((await page.goto("/admin/products"))?.status()).toBe(404);
});
