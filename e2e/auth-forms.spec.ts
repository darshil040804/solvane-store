import { expect, test, type Page } from "@playwright/test";
import { ADMIN_EMAIL, PASSWORD, uniqueEmail } from "./support";

function form(page: Page) {
  const main = page.getByRole("main");
  return {
    name: main.getByLabel("Full name"),
    email: main.getByLabel("Email address"),
    password: main.getByLabel("Password"),
    alert: main.getByRole("alert"),
  };
}

test.describe("validation", () => {
  test("empty sign-up shows every field error, focuses the first and sends nothing", async ({
    page,
  }) => {
    let requests = 0;
    await page.route("**/api/auth/sign-up/email", (route) => {
      requests++;
      return route.continue();
    });
    await page.goto("/sign-up");
    await page.getByRole("button", { name: "Create account" }).click();

    const f = form(page);
    await expect(page.getByText("Please enter your full name.")).toBeVisible();
    await expect(page.getByText("Please enter your email address.")).toBeVisible();
    await expect(page.getByText("Please create a password.")).toBeVisible();
    await expect(f.name).toBeFocused();
    await expect(f.email).toHaveAttribute("aria-invalid", "true");
    await expect(f.email).toHaveAccessibleDescription("Please enter your email address.");
    expect(requests).toBe(0);
  });

  test("checks email format and password length, and clears errors once fixed", async ({
    page,
  }) => {
    await page.goto("/sign-up");
    const f = form(page);
    await f.email.fill("not-an-email");
    await f.password.fill("short");
    await f.password.blur();

    await expect(page.getByText("Please enter a valid email address, like name@example.com.")).toBeVisible();
    await expect(page.getByText("Use at least 8 characters.")).toBeVisible();
    // The hint is replaced by the error, not shown alongside it.
    await expect(page.getByText("At least 8 characters.", { exact: true })).toHaveCount(0);

    await f.email.fill("name@example.com");
    await f.password.fill(PASSWORD);
    await expect(f.email).not.toHaveAttribute("aria-invalid");
    await expect(f.password).not.toHaveAttribute("aria-invalid");
    await expect(page.getByText("At least 8 characters.", { exact: true })).toBeVisible();
  });

  test("errors wait until a field has been left", async ({ page }) => {
    await page.goto("/sign-in");
    await form(page).email.fill("half-typed");
    await expect(page.getByText(/valid email address/)).toHaveCount(0);
  });
});

test.describe("loading", () => {
  test("shows progress and locks the form while signing in", async ({ page }) => {
    let release!: () => void;
    const held = new Promise<void>((resolve) => (release = resolve));
    await page.route("**/api/auth/sign-in/email", async (route) => {
      await held;
      await route.continue();
    });

    await page.goto("/sign-in");
    const f = form(page);
    await f.email.fill(ADMIN_EMAIL);
    await f.password.fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByRole("button", { name: "Signing in…" })).toBeVisible();
    await expect(f.email).toHaveAttribute("readonly");
    await expect(page.getByRole("main").getByRole("status")).toHaveText("Signing in…");

    release();
    await expect(page).toHaveURL("/account");
  });
});

test.describe("server errors", () => {
  test("wrong password explains, clears the password and focuses it", async ({ page }) => {
    await page.goto("/sign-in");
    const f = form(page);
    await f.email.fill(ADMIN_EMAIL);
    await f.password.fill("wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(f.alert).toHaveText("The email or password is incorrect. Please try again.");
    await expect(f.password).toHaveValue("");
    await expect(f.password).toBeFocused();
    await expect(page.getByText("Please enter your password.")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Sign in" })).toBeEnabled();
  });

  test("an existing email offers a way to sign in", async ({ page }) => {
    await page.goto("/sign-up?redirectTo=%2Faccount%2Forders");
    const f = form(page);
    await f.name.fill("Existing");
    await f.email.fill(ADMIN_EMAIL);
    await f.password.fill(PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(f.alert).toContainText("An account already exists with this email.");
    await expect(f.email).toHaveAttribute("aria-invalid", "true");
    await expect(f.email).toBeFocused();

    // Editing the email clears the server error on that field.
    await f.email.fill(uniqueEmail("fresh"));
    await expect(f.email).not.toHaveAttribute("aria-invalid");

    await f.alert.getByRole("link", { name: "Sign in instead" }).click();
    await expect(page).toHaveURL("/sign-in?redirectTo=%2Faccount%2Forders");
  });

  test("rate limiting asks the customer to wait", async ({ page }) => {
    await page.route("**/api/auth/sign-in/email", (route) =>
      route.fulfill({ status: 429, json: { message: "Too many requests" } }),
    );
    await page.goto("/sign-in");
    const f = form(page);
    await f.email.fill(ADMIN_EMAIL);
    await f.password.fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(f.alert).toHaveText("Too many attempts. Please wait a moment and try again.");
  });

  test("a network failure is reported and the form can be retried", async ({ page }) => {
    await page.route("**/api/auth/sign-up/email", (route) => route.abort("internetdisconnected"));
    await page.goto("/sign-up");
    const f = form(page);
    await f.name.fill("Offline");
    await f.email.fill(uniqueEmail("offline"));
    await f.password.fill(PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(f.alert).toHaveText("We couldn't connect. Check your connection and try again.");
    await expect(f.email).not.toHaveAttribute("readonly");
    await expect(page.getByRole("button", { name: "Create account" })).toBeVisible();
  });
});
