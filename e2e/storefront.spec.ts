import { expect, test, type Page } from "@playwright/test";
import { sitePages } from "../src/lib/site-pages";
import {
  createProduct,
  expectSignInRedirect,
  FIXTURE_CATEGORY,
  signInAsAdmin,
  signUp,
  sql,
  uniqueEmail,
} from "./support";

/** Product slugs on the current listing page, from the cards' links. */
async function cardSlugs(page: Page) {
  const hrefs = await page
    .locator(".product-grid article a[href^='/products/']")
    .evaluateAll((links) => links.map((a) => a.getAttribute("href")!));
  return hrefs.map((href) => href.replace("/products/", ""));
}

/** Audience and category for the given product slugs, from the database. */
async function productInfo(slugs: string[]) {
  const rows = await sql()`select p.slug, p.audience, c.slug as category
    from products p join categories c on c.id = p.category_id where p.slug = any(${slugs})`;
  return new Map(rows.map((r) => [r.slug as string, { audience: r.audience as string, category: r.category as string }]));
}

const filterNav = (page: Page) => page.getByRole("navigation", { name: "Filter by category" });

test.describe("homepage", () => {
  test("has no Autumn-Winter 2026 copy and uses the new hero image", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/Autumn.Winter 2026/)).toHaveCount(0);
    const hero = page.locator("section.hero img");
    await expect(hero).toHaveAttribute("src", /1781454230912-ba9ce1b46b56/);
    await expect(hero).toHaveAttribute("alt", /oatmeal wool coat/);
    await page.getByRole("link", { name: "Discover the collection" }).click();
    await expect(page).toHaveURL("/shop");
  });

  test("every homepage link leads to a real page", async ({ page, request }) => {
    await page.goto("/");
    const hrefs = await page
      .locator("main a[href^='/']")
      .evaluateAll((links) => [...new Set(links.map((a) => a.getAttribute("href")!))]);
    expect(hrefs.length).toBeGreaterThan(10);
    // The homepage is cached for up to a minute, so it can still list test
    // products that other tests deleted straight from the database.
    for (const href of hrefs.filter((h) => !h.startsWith("/products/e2e-"))) {
      const response = await request.get(href);
      expect(response.status(), href).toBe(200);
    }
  });
});

test.describe("navigation", () => {
  test("every menu, header and footer link leads to a real page", async ({ page, request }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Open menu" }).click();
    const menu = page.getByRole("dialog", { name: "Menu" });
    await expect(menu).toBeVisible();
    const menuLinks = await menu.locator("a").evaluateAll((links) =>
      links.map((a) => ({ label: a.textContent!.trim(), href: a.getAttribute("href")! })),
    );
    expect(menuLinks.map((link) => link.label)).toEqual([
      "Home",
      "Shop all",
      "New In",
      "Women",
      "Men",
      "Bags & Small Leather Goods",
      "Shoes",
      "Jewelry & Watches",
      "Services",
      "Contact us",
      "Wishlist",
      "My account",
    ]);
    await page.getByRole("button", { name: "Close menu" }).click();

    const otherLinks = await page
      .locator("header a[href^='/'], footer a[href^='/']")
      .evaluateAll((links) => links.map((a) => a.getAttribute("href")!));
    const hrefs = [...new Set([...menuLinks.map((link) => link.href), ...otherLinks])];
    for (const href of hrefs) {
      // Signed-out visits to account pages land on sign-in, which is a real page too.
      const response = await request.get(href);
      expect(response.status(), href).toBe(200);
    }
  });

  test("the menu's Home link returns to the homepage", async ({ page }) => {
    await page.goto("/shop");
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("dialog", { name: "Menu" }).getByRole("link", { name: "Home" }).click();
    await expect(page).toHaveURL("/");
  });

  test("listing pages have a Home breadcrumb", async ({ page }) => {
    await page.goto("/collections/women");
    await page.getByRole("navigation", { name: "Breadcrumb" }).getByRole("link", { name: "Home" }).click();
    await expect(page).toHaveURL("/");
  });

  test("unknown pages are not found", async ({ request }) => {
    for (const path of ["/collections/autumn-winter-2026", "/services/nope", "/no-such-page"]) {
      expect((await request.get(path)).status(), path).toBe(404);
    }
  });
});

test.describe("collections and category filter", () => {
  test("Shop all filters by category and the counts match", async ({ page }) => {
    await page.goto("/shop");
    const all = await cardSlugs(page);
    const info = await productInfo(all);
    expect(all.length).toBeGreaterThanOrEqual(30);
    await expect(filterNav(page).getByRole("link", { name: /^All/ })).toHaveAttribute("aria-current", "page");

    await filterNav(page).getByRole("link", { name: /^Bags/ }).click();
    await expect(page).toHaveURL("/shop?category=bags");
    await expect(filterNav(page).getByRole("link", { name: /^Bags/ })).toHaveAttribute("aria-current", "page");
    const bags = await cardSlugs(page);
    const bagInfo = await productInfo(bags);
    expect(bags.length).toBeGreaterThan(0);
    for (const slug of bags) expect(bagInfo.get(slug)?.category, slug).toBe("bags");
    const chipCount = await filterNav(page).getByRole("link", { name: /^Bags/ }).locator("span").textContent();
    expect(Number(chipCount)).toBe(bags.length);
    expect([...info.values()].filter((p) => p.category === "bags")).toHaveLength(bags.length);

    await filterNav(page).getByRole("link", { name: /^All/ }).click();
    await expect(page).toHaveURL("/shop");
  });

  for (const [slug, allowed] of [
    ["women", ["women", "unisex"]],
    ["men", ["men", "unisex"]],
  ] as const) {
    test(`the ${slug} collection shows only ${allowed.join(" and ")} pieces`, async ({ page }) => {
      await page.goto(`/collections/${slug}`);
      const slugs = await cardSlugs(page);
      const info = await productInfo(slugs);
      for (const s of slugs) expect(allowed, s).toContain(info.get(s)?.audience);
      const expected = await sql()`select p.slug from products p join categories c on c.id = p.category_id
        where p.audience = any(${[...allowed]}) and c.slug <> ${FIXTURE_CATEGORY} and c.slug not like 'e2e-%'`;
      for (const { slug: s } of expected) expect(slugs, s).toContain(s);

      // The category filter narrows within the collection.
      await filterNav(page).getByRole("link", { name: /^Shoes/ }).click();
      await expect(page).toHaveURL(`/collections/${slug}?category=shoes`);
      const shoes = await productInfo(await cardSlugs(page));
      expect(shoes.size).toBeGreaterThan(0);
      for (const [s, p] of shoes) {
        expect(p.category, s).toBe("shoes");
        expect(allowed, s).toContain(p.audience);
      }
    });
  }

  for (const [slug, categories] of [
    ["bags", ["bags"]],
    ["shoes", ["shoes"]],
    ["jewelry", ["jewelry", "watches", "eyewear"]],
  ] as const) {
    test(`the ${slug} collection shows ${categories.join(", ")}`, async ({ page }) => {
      await page.goto(`/collections/${slug}`);
      const info = await productInfo(await cardSlugs(page));
      expect(info.size).toBeGreaterThan(0);
      for (const [s, p] of info) expect(categories, s).toContain(p.category);
    });
  }

  test("New In can be filtered by category", async ({ page }) => {
    await page.goto("/collections/new-in");
    // Which categories are newest depends on what other tests just created,
    // so use whichever category New In offers.
    const chip = filterNav(page).getByRole("link").nth(1);
    const href = await chip.getAttribute("href");
    const category = new URLSearchParams(href!.split("?")[1]).get("category")!;
    await chip.click();
    await expect(page).toHaveURL(`/collections/new-in?category=${category}`);
    const info = await productInfo(await cardSlugs(page));
    expect(info.size).toBeGreaterThan(0);
    for (const [s, p] of info) expect(p.category, s).toBe(category);
  });

  test("an unknown category shows everything instead of nothing", async ({ page }) => {
    await page.goto("/shop?category=not-a-category");
    await expect(filterNav(page).getByRole("link", { name: /^All/ })).toHaveAttribute("aria-current", "page");
    expect((await cardSlugs(page)).length).toBeGreaterThanOrEqual(30);
  });

  test("new catalog pieces are listed with their images", async ({ page }) => {
    await page.goto("/shop");
    for (const name of ["Belted Wrap Coat in Camel Wool", "Weekender in Tan Leather", "Trainer in White Leather and Suede"]) {
      const card = page.locator(".product-grid article").filter({ has: page.getByRole("link", { name, exact: true }) });
      await expect(card.locator("img")).toHaveAttribute("src", /images\.unsplash\.com|_next\/image/);
    }
  });
});

test.describe("search", () => {
  test("finds products by material and filters the results by category", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Search" }).click();
    await expect(page).toHaveURL("/search");
    await page.getByRole("searchbox", { name: "Search products" }).fill("leather");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page).toHaveURL("/search?q=leather");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Results for “leather”");
    await expect(page.getByRole("link", { name: "Weekender in Tan Leather", exact: true })).toBeVisible();

    await filterNav(page).getByRole("link", { name: /^Shoes/ }).click();
    await expect(page).toHaveURL(/\/search\?q=leather&category=shoes/);
    const info = await productInfo(await cardSlugs(page));
    expect(info.size).toBeGreaterThan(0);
    for (const [s, p] of info) expect(p.category, s).toBe("shoes");
  });

  test("shows a helpful message when nothing matches, and handles wildcards", async ({ page }) => {
    await page.goto("/search?q=zzzz-no-match");
    await expect(page.getByText("Nothing matched “zzzz-no-match”")).toBeVisible();
    const response = await page.goto("/search?q=100%25_");
    expect(response?.status()).toBe(200);
  });
});

test.describe("wishlist", () => {
  test("signed-out shoppers are asked to sign in", async ({ page }) => {
    const product = await createProduct("wish-guest", { "One size": 3 });
    await page.goto(`/products/${product.slug}`);
    await page.getByRole("button", { name: `Add ${product.name} to wishlist` }).click();
    await expectSignInRedirect(page, `/products/${product.slug}`);
    await page.goto("/wishlist");
    await expectSignInRedirect(page, "/wishlist");
  });

  test("saving, viewing and removing pieces", async ({ page, browser }) => {
    const product = await createProduct("wish-save", { "One size": 3 });
    await signUp(page, "Wish Customer", uniqueEmail("wish"));
    await expect(page).toHaveURL("/account");

    await page.goto("/wishlist");
    await expect(page.getByText("Your wishlist is empty.")).toBeVisible();

    await page.goto(`/products/${product.slug}`);
    const heart = page.getByRole("button", { name: new RegExp(`${product.name} (to|from) wishlist`) });
    await expect(heart).toHaveAttribute("aria-pressed", "false");
    await heart.click();
    await expect(heart).toHaveAttribute("aria-pressed", "true");
    await page.reload();
    await expect(heart).toHaveAttribute("aria-pressed", "true");

    await page.goto("/wishlist");
    const card = page.locator(".product-grid article").filter({ has: page.getByRole("link", { name: product.name }) });
    await expect(card).toHaveCount(1);
    await expect(page.getByText("1 piece saved")).toBeVisible();

    // Another customer doesn't see it.
    const other = await browser.newPage();
    await signUp(other, "Other Customer", uniqueEmail("wish-other"));
    await expect(other).toHaveURL("/account");
    await other.goto("/wishlist");
    await expect(other.getByText("Your wishlist is empty.")).toBeVisible();
    await other.close();

    await card.getByRole("button", { name: `Remove ${product.name} from wishlist` }).click();
    await expect(page.getByText("Your wishlist is empty.")).toBeVisible();
  });
});

test.describe("content pages", () => {
  test("every services, help, about and legal page renders", async ({ page }) => {
    for (const sitePage of sitePages) {
      const response = await page.goto(sitePage.path);
      expect(response?.status(), sitePage.path).toBe(200);
      await expect(page.getByRole("heading", { level: 1 }), sitePage.path).toHaveText(sitePage.title);
      await expect(page.getByRole("navigation", { name: "Breadcrumb" }).getByRole("link", { name: "Home" })).toBeVisible();
    }
  });

  test("the contact page shows clearly fictional details", async ({ page }) => {
    await page.goto("/contact");
    await expect(page.getByText("clientservices@solvane.example")).toBeVisible();
    await expect(page.getByText(/These contact details are fictional/)).toBeVisible();
  });
});

test.describe("admin audience", () => {
  test("changing a product's audience moves it between collections", async ({ page }) => {
    const product = await createProduct("audience-move", { "One size": 2 });
    await signInAsAdmin(page);
    await page.goto(`/admin/products/${product.id}`);
    await expect(page.getByLabel("Audience")).toHaveValue("unisex");
    await page.getByLabel("Audience").selectOption("men");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Changes saved.")).toBeVisible();
    const [row] = await sql()`select audience from products where id = ${product.id}`;
    expect(row.audience).toBe("men");

    await page.goto("/collections/men");
    expect(await cardSlugs(page)).toContain(product.slug);
    await page.goto("/collections/women");
    expect(await cardSlugs(page)).not.toContain(product.slug);
  });
});
