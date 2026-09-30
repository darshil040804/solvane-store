import { expect, test } from "@playwright/test";
import {
  ADMIN_EMAIL,
  expectSignInRedirect,
  PASSWORD,
  signIn,
  signUp,
  sql,
  uniqueEmail,
} from "./support";

const origin = { origin: "http://localhost:3000" };

test.describe("unauthenticated", () => {
  for (const path of [
    "/account",
    "/account/orders",
    "/admin",
    "/admin/products",
    "/admin/inventory",
    "/admin/categories",
    "/admin/orders",
  ]) {
    test(`${path} redirects to sign-in`, async ({ page }) => {
      await page.goto(path);
      await expectSignInRedirect(page, path);
    });
  }

  test("a forged session cookie passes the proxy but not the server check", async ({
    page,
    context,
  }) => {
    await context.addCookies([
      { name: "better-auth.session_token", value: "forged.value", url: "http://localhost:3000" },
    ]);
    await page.goto("/account");
    await expectSignInRedirect(page, "/account");
  });

  test("admin API endpoints reject anonymous callers", async ({ request }) => {
    const response = await request.get("/api/auth/admin/list-users");
    expect(response.status()).toBe(401);
  });
});

test.describe("sign up", () => {
  test("creates an account, signs in and lands on the account page", async ({ page }) => {
    const email = uniqueEmail("signup");
    await signUp(page, "Ada Customer", email);

    await expect(page).toHaveURL("/account");
    await expect(page.getByRole("heading", { name: "Welcome, Ada Customer" })).toBeVisible();
    await expect(page.getByText(email)).toBeVisible();
    await expect(page.getByRole("link", { name: "Admin" })).toHaveCount(0);
  });

  test("rejects an email that is already registered", async ({ page }) => {
    await signUp(page, "Duplicate", ADMIN_EMAIL);
    await expect(page.getByRole("main").getByRole("alert")).toBeVisible();
    await expect(page).toHaveURL("/sign-up");
  });

  test("cannot grant itself a role", async ({ request }) => {
    const email = uniqueEmail("role");
    const response = await request.post("/api/auth/sign-up/email", {
      headers: origin,
      data: { name: "Mallory", email, password: PASSWORD, role: "admin" },
    });
    expect(response.status()).toBe(400);
    const rows = await sql()`select 1 from "user" where email = ${email}`;
    expect(rows).toHaveLength(0);
  });
});

test.describe("sign in and sessions", () => {
  test("wrong password shows an error and sets no session", async ({ page, context }) => {
    await signIn(page, ADMIN_EMAIL, "not-the-password");
    await expect(page.getByRole("main").getByRole("alert")).toBeVisible();
    const cookies = await context.cookies();
    expect(cookies.some((cookie) => cookie.name.includes("session_token"))).toBe(false);
  });

  test("returns to the requested page after sign-in", async ({ page }) => {
    const email = uniqueEmail("redirect");
    await signUp(page, "Redirect Test", email);
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL("/");

    await page.goto("/account/orders");
    await expectSignInRedirect(page, "/account/orders");
    await page.getByRole("main").getByLabel("Email address").fill(email);
    await page.getByRole("main").getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL("/account/orders");
    await expect(page.getByRole("heading", { name: "My orders" })).toBeVisible();
  });

  test("ignores off-site redirect targets", async ({ page }) => {
    const email = uniqueEmail("openredirect");
    await signUp(page, "Open Redirect", email);
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL("/");

    await signIn(page, email, PASSWORD, "/sign-in?redirectTo=//evil.example");
    await expect(page).toHaveURL("/account");
  });

  test("session persists across reloads and new tabs, with a 30-day cookie", async ({
    page,
    context,
  }) => {
    await signUp(page, "Persistent", uniqueEmail("persist"));
    await expect(page).toHaveURL("/account");

    await page.reload();
    await expect(page.getByRole("heading", { name: "Welcome, Persistent" })).toBeVisible();

    const second = await context.newPage();
    await second.goto("/account/orders");
    await expect(second.getByRole("heading", { name: "My orders" })).toBeVisible();

    const cookie = (await context.cookies()).find((c) => c.name.endsWith("session_token"));
    expect(cookie?.httpOnly).toBe(true);
    const days = (cookie!.expires * 1000 - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(29);
  });

  test("signed-in users are sent away from the sign-in page", async ({ page }) => {
    await signUp(page, "Already In", uniqueEmail("already"));
    await expect(page).toHaveURL("/account");
    await page.goto("/sign-in");
    await expect(page).toHaveURL("/account");
  });

  test("sign out ends the session", async ({ page }) => {
    await signUp(page, "Leaving", uniqueEmail("signout"));
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL("/");

    await page.goto("/account");
    await expectSignInRedirect(page, "/account");
  });
});

test.describe("authorization", () => {
  test("customers get a 404 on admin pages and 403 from admin actions", async ({ page }) => {
    await signUp(page, "Curious Customer", uniqueEmail("customer"));
    await expect(page).toHaveURL("/account");

    const response = await page.goto("/admin");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Customers" })).toHaveCount(0);

    const list = await page.request.get("/api/auth/admin/list-users");
    expect(list.status()).toBe(403);

    const me = await page.request.get("/api/auth/get-session");
    const { user } = await me.json();
    const promote = await page.request.post("/api/auth/admin/set-role", {
      headers: origin,
      data: { userId: user.id, role: "admin" },
    });
    expect(promote.status()).toBe(403);
    const [row] = await sql()`select role from "user" where id = ${user.id}`;
    expect(row.role).toBe("user");
  });

  test("admins can open the admin area", async ({ page }) => {
    await signIn(page, ADMIN_EMAIL);
    await expect(page).toHaveURL("/account");
    await page.getByRole("link", { name: "Admin" }).click();

    await expect(page).toHaveURL("/admin");
    await expect(page.getByRole("heading", { name: "Customers" })).toBeVisible();
    // The list shows only the newest 50 accounts, which the admin may not be among
    // once many test users exist, so check the signed-in banner instead.
    await expect(page.getByText(`Signed in as ${ADMIN_EMAIL}`)).toBeVisible();
    await expect(page.getByRole("table")).toBeVisible();

    const list = await page.request.get("/api/auth/admin/list-users");
    expect(list.status()).toBe(200);
  });
});
