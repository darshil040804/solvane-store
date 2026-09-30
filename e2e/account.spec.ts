import { expect, test } from "@playwright/test";
import { ADMIN_EMAIL, expectSignInRedirect, signIn, signUp, uniqueEmail } from "./support";

const memberSince = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });

test("shows account information and the account navigation", async ({ page }) => {
  const email = uniqueEmail("account");
  await signUp(page, "Iris Customer", email);
  await expect(page).toHaveURL("/account");

  await expect(page.getByRole("heading", { level: 1, name: "Welcome, Iris Customer" })).toBeVisible();
  const info = page.getByRole("region", { name: "Personal information" });
  await expect(info.getByRole("definition")).toHaveText([
    "Iris Customer",
    email,
    memberSince.format(new Date()),
  ]);

  const nav = page.getByRole("navigation", { name: "My account" });
  await expect(nav.getByRole("link", { name: "Account overview" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  // Customers get the account sections but not the admin link.
  await expect(nav.getByRole("link")).toHaveText(["Account overview", "Orders"]);
  await expect(nav.getByRole("button", { name: "Sign out" })).toBeVisible();
});

test("admins also get an Admin link in the account navigation", async ({ page }) => {
  await signIn(page, ADMIN_EMAIL);
  await expect(page).toHaveURL("/account");
  const nav = page.getByRole("navigation", { name: "My account" });
  await expect(nav.getByRole("link")).toHaveText(["Account overview", "Orders", "Admin"]);
});

test("signing out from the account navigation ends the session", async ({ page }) => {
  await signUp(page, "Nav Sign Out", uniqueEmail("navsignout"));
  await expect(page).toHaveURL("/account");
  await page
    .getByRole("navigation", { name: "My account" })
    .getByRole("button", { name: "Sign out" })
    .click();
  await expect(page).toHaveURL("/");
  await page.goto("/account");
  await expectSignInRedirect(page, "/account");
});

test("the account page does not scroll horizontally", async ({ page }) => {
  await signUp(page, "A Customer With A Particularly Long Name", uniqueEmail("a-very-long-address-for-wrapping"));
  await expect(page).toHaveURL("/account");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
