import { neon } from "@neondatabase/serverless";
import { expect, type Page } from "@playwright/test";

// Every account the suite creates uses this domain so teardown can remove them.
export const TEST_EMAIL_DOMAIN = "e2e.solvane.test";
export const PASSWORD = "correct-horse-battery";
export const ADMIN_EMAIL = `admin@${TEST_EMAIL_DOMAIN}`;

export function uniqueEmail(label: string) {
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  return `${label}-${id}@${TEST_EMAIL_DOMAIN}`;
}

export function sql() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  return neon(process.env.DATABASE_URL);
}

/** Removes every test account. Orders go first: customers with orders can't be deleted. */
export async function deleteTestUsers() {
  const db = sql();
  const pattern = `%@${TEST_EMAIL_DOMAIN}`;
  await db`delete from orders where user_id in (select id from "user" where email like ${pattern})`;
  // Sessions, accounts and cart lines go with the user (cascade).
  await db`delete from "user" where email like ${pattern}`;
}

export async function signUp(page: Page, name: string, email: string, password = PASSWORD) {
  await page.goto("/sign-up");
  await page.getByRole("main").getByLabel("Full name").fill(name);
  await page.getByRole("main").getByLabel("Email address").fill(email);
  await page.getByRole("main").getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
}

export async function signIn(page: Page, email: string, password = PASSWORD, path = "/sign-in") {
  await page.goto(path);
  await page.getByRole("main").getByLabel("Email address").fill(email);
  await page.getByRole("main").getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

export async function expectSignInRedirect(page: Page, from: string) {
  await expect(page).toHaveURL(`/sign-in?redirectTo=${encodeURIComponent(from)}`);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
}

// Catalog fixtures. Each cart test creates its own product so tests that change
// stock or prices can run in parallel; teardown deletes the whole category.
export const FIXTURE_CATEGORY = "e2e-fixtures";
const FIXTURE_IMAGE =
  "https://images.unsplash.com/photo-1520975954732-35dd22299614?auto=format&fit=crop&w=1200&q=80";

export type FixtureProduct = { id: string; slug: string; name: string; priceCents: number };

/** `stock` maps size → quantity; use { "One size": n } for an unsized product. */
export async function createProduct(
  label: string,
  stock: Record<string, number>,
  priceCents = 125_000,
): Promise<FixtureProduct> {
  const slug = `e2e-${label}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const name = `E2E ${label}`;
  const stockRows = JSON.stringify(
    Object.entries(stock).map(([size, quantity], position) => ({ size, quantity, position })),
  );
  // One statement, so pages listing products never see it without its image or stock.
  const [product] = await sql()`
    with category as (
      insert into categories (slug, name) values (${FIXTURE_CATEGORY}, 'E2E fixtures')
      on conflict (slug) do update set name = excluded.name
      returning id
    ), product as (
      insert into products (category_id, slug, name, description, price_cents)
      select id, ${slug}, ${name}, 'Test fixture', ${priceCents} from category
      returning id
    ), image as (
      insert into product_images (product_id, url, alt, position)
      select id, ${FIXTURE_IMAGE}, ${name}, 0 from product
    ), stock as (
      insert into product_stock (product_id, size, quantity, position)
      select product.id, s.size, s.quantity, s.position
      from product, jsonb_to_recordset(${stockRows}::jsonb) as s(size text, quantity int, position int)
    )
    select id from product`;
  return { id: product.id, slug, name, priceCents };
}

export async function setStock(productId: string, size: string, quantity: number) {
  await sql()`update product_stock set quantity = ${quantity}
    where product_id = ${productId} and size = ${size}`;
}

export async function setPrice(productId: string, priceCents: number) {
  await sql()`update products set price_cents = ${priceCents} where id = ${productId}`;
}

export async function deleteFixtureProducts() {
  const db = sql();
  // Images, stock and cart lines go with the products (cascade).
  await db`delete from products where category_id in
    (select id from categories where slug = ${FIXTURE_CATEGORY})`;
  await db`delete from categories where slug = ${FIXTURE_CATEGORY}`;
}

export type OrderStatus = "pending" | "paid" | "needs_review" | "failed" | "cancelled" | "expired";

/**
 * Inserts an order (with one line) directly, as the checkout flow and the verified
 * webhook would leave it. Paid orders get the Stripe details the schema requires.
 */
export async function seedOrder(
  userId: string,
  email: string,
  product: FixtureProduct,
  status: OrderStatus,
  {
    quantity = 2,
    size = "M",
    createdAt = new Date().toISOString(),
    expiresInMinutes = 31,
  }: { quantity?: number; size?: string; createdAt?: string; expiresInMinutes?: number } = {},
) {
  const db = sql();
  const paid = status === "paid" || status === "needs_review";
  const sessionId = `cs_test_e2e_${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
  const subtotal = product.priceCents * quantity;
  const address = JSON.stringify({
    line1: "350 5th Ave",
    line2: "Floor 2",
    city: "New York",
    state: "NY",
    postalCode: "10118",
    country: "US",
  });
  const [order] = await db`
    insert into orders (
      user_id, status, payment_status, subtotal_cents, email, created_at, expires_at,
      stripe_checkout_session_id, stripe_payment_intent_id, amount_paid_cents,
      paid_at, shipping_name, shipping_address
    ) values (
      ${userId}, ${status}, ${paid ? "paid" : status === "failed" ? "failed" : "unpaid"},
      ${subtotal}, ${email}, ${createdAt},
      now() + ${`${expiresInMinutes} minutes`}::interval, ${sessionId},
      ${paid ? `pi_e2e_${sessionId}` : null}, ${paid ? subtotal : null},
      ${paid ? createdAt : null},
      ${paid ? "Ada Customer" : null}, ${paid ? address : null}::jsonb
    ) returning id`;
  await db`insert into order_items (order_id, product_id, product_name, size, unit_price_cents, quantity)
    values (${order.id}, ${product.id}, ${product.name}, ${size}, ${product.priceCents}, ${quantity})`;
  return { orderId: order.id as string, sessionId };
}
