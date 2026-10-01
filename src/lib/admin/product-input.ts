import "server-only";

import { ONE_SIZE } from "@/db/schema";
import { isId } from "@/lib/admin/action";
import { IMAGE_HOSTS } from "@/lib/images";

// Server-side validation for admin product input. Everything arrives as
// `unknown` from the client and is checked here; error keys match the form's
// field names (rows use "images.0.url", "sizes.1.quantity" and so on).

export type FieldErrors = Record<string, string>;
type Parsed<T> = { ok: true; value: T } | { ok: false; errors: FieldErrors };

export type ProductFields = {
  name: string;
  slug: string;
  categoryId: string;
  priceCents: number;
  color: string | null;
  description: string;
  details: string[];
  care: string;
  isNew: boolean;
  audience: Audience;
  images: { url: string; alt: string }[];
};

export const AUDIENCES = ["women", "men", "unisex"] as const;
export type Audience = (typeof AUDIENCES)[number];

/** Stock rows in display order; unsized products have a single ONE_SIZE row. */
export type StockRows = { size: string; quantity: number }[];

export type StockChange = { stockId: string; expected: number; quantity: number };

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PRICE = /^\d{1,6}(?:\.\d{1,2})?$/;
const QUANTITY = /^\d{1,4}$/;
const MAX_IMAGES = 8;
const MAX_DETAILS = 12;
const MAX_SIZES = 20;

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

/** Dollars as typed ("1250", "1,250.5", "$199.99") to integer cents, or null. */
function parsePrice(value: unknown) {
  const raw = text(value).replace(/^\$/, "").replaceAll(",", "");
  if (!PRICE.test(raw)) return null;
  const [dollars, fraction = ""] = raw.split(".");
  return Number(dollars) * 100 + Number(fraction.padEnd(2, "0"));
}

/** A whole number of units from 0 to 9999, typed or numeric. */
export function parseQuantity(value: unknown) {
  if (typeof value === "number") {
    return Number.isInteger(value) && value >= 0 && value <= 9999 ? value : null;
  }
  const raw = text(value);
  return QUANTITY.test(raw) ? Number(raw) : null;
}

function isAllowedImageUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && IMAGE_HOSTS.includes(parsed.hostname);
  } catch {
    return false;
  }
}

export function parseProductFields(input: unknown): Parsed<ProductFields> {
  const data = record(input);
  const errors: FieldErrors = {};

  const name = text(data.name);
  if (!name) errors.name = "Enter a product name.";
  else if (name.length > 120) errors.name = "Use 120 characters or fewer.";

  const slug = text(data.slug);
  if (!slug) errors.slug = "Enter a URL slug.";
  else if (slug.length > 100) errors.slug = "Use 100 characters or fewer.";
  else if (!SLUG.test(slug)) {
    errors.slug = "Use lowercase letters, numbers and single hyphens, like silk-shirt.";
  }

  const categoryId = data.categoryId;
  if (!isId(categoryId)) errors.categoryId = "Choose a category.";

  const priceCents = parsePrice(data.price);
  if (priceCents === null) errors.price = "Enter a price in dollars, like 1250 or 199.99.";
  else if (priceCents <= 0) errors.price = "The price must be more than $0.";

  const color = text(data.color);
  if (color.length > 60) errors.color = "Use 60 characters or fewer.";

  const description = text(data.description);
  if (!description) errors.description = "Enter a description.";
  else if (description.length > 2000) errors.description = "Use 2,000 characters or fewer.";

  const details = Array.isArray(data.details) ? data.details.map(text).filter(Boolean) : [];
  if (details.length > MAX_DETAILS) errors.details = `List up to ${MAX_DETAILS} details.`;
  else if (details.some((detail) => detail.length > 200)) {
    errors.details = "Keep each detail to 200 characters or fewer.";
  } else if (new Set(details).size !== details.length) {
    errors.details = "Each detail must be different.";
  }

  const care = text(data.care);
  if (care.length > 1000) errors.care = "Use 1,000 characters or fewer.";

  const audience = text(data.audience);
  if (!(AUDIENCES as readonly string[]).includes(audience)) {
    errors.audience = "Choose who this piece is for.";
  }

  const images = (Array.isArray(data.images) ? data.images : []).map((image) => {
    const row = record(image);
    return { url: text(row.url), alt: text(row.alt) };
  });
  if (images.length === 0) errors.images = "Add at least one image.";
  else if (images.length > MAX_IMAGES) errors.images = `Add up to ${MAX_IMAGES} images.`;
  const seenUrls = new Set<string>();
  images.forEach(({ url, alt }, index) => {
    if (!url) errors[`images.${index}.url`] = "Enter an image URL.";
    else if (url.length > 2000 || !isAllowedImageUrl(url)) {
      errors[`images.${index}.url`] = `Use an https URL from ${IMAGE_HOSTS.join(" or ")}.`;
    } else if (seenUrls.has(url)) {
      errors[`images.${index}.url`] = "This image is already listed.";
    }
    seenUrls.add(url);
    if (!alt) errors[`images.${index}.alt`] = "Describe the image for screen readers.";
    else if (alt.length > 200) errors[`images.${index}.alt`] = "Use 200 characters or fewer.";
  });

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      name,
      slug,
      categoryId: categoryId as string,
      priceCents: priceCents!,
      color: color || null,
      description,
      details,
      care,
      isNew: data.isNew === true,
      audience: audience as Audience,
      images,
    },
  };
}

/** Initial stock for a new product: one quantity, or a list of sizes. */
export function parseInitialStock(input: unknown): Parsed<StockRows> {
  const data = record(input);
  const errors: FieldErrors = {};

  if (data.sized !== true) {
    const quantity = parseQuantity(data.quantity);
    if (quantity === null) return { ok: false, errors: { quantity: "Enter a whole number from 0 to 9999." } };
    return { ok: true, value: [{ size: ONE_SIZE, quantity }] };
  }

  const rows = (Array.isArray(data.sizes) ? data.sizes : []).map((row) => {
    const values = record(row);
    return { size: text(values.size), quantity: parseQuantity(values.quantity) };
  });
  if (rows.length === 0) errors.sizes = "Add at least one size.";
  else if (rows.length > MAX_SIZES) errors.sizes = `Add up to ${MAX_SIZES} sizes.`;

  const seen = new Set<string>();
  rows.forEach(({ size, quantity }, index) => {
    const key = size.toLowerCase();
    if (!size) errors[`sizes.${index}.size`] = "Enter a size.";
    else if (size.length > 32) errors[`sizes.${index}.size`] = "Use 32 characters or fewer.";
    else if (key === ONE_SIZE.toLowerCase()) {
      errors[`sizes.${index}.size`] = `"${ONE_SIZE}" is for products without sizes.`;
    } else if (seen.has(key)) errors[`sizes.${index}.size`] = "This size is already listed.";
    seen.add(key);
    if (quantity === null) errors[`sizes.${index}.quantity`] = "Enter 0 to 9999.";
  });

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: rows.map(({ size, quantity }) => ({ size, quantity: quantity! })) };
}

/** Availability edits: new quantities for existing stock rows, with the value each edit started from. */
export function parseStockChanges(input: unknown): Parsed<StockChange[]> {
  const rows = Array.isArray(input) ? input : [];
  if (rows.length === 0 || rows.length > MAX_SIZES) {
    return { ok: false, errors: { form: "There are no availability changes to save." } };
  }

  const errors: FieldErrors = {};
  const changes: StockChange[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const values = record(row);
    const stockId = values.stockId;
    const expected = parseQuantity(values.expected);
    const quantity = parseQuantity(values.quantity);
    if (!isId(stockId) || expected === null || seen.has(stockId)) {
      return { ok: false, errors: { form: "Something was wrong with that request." } };
    }
    seen.add(stockId);
    if (quantity === null) errors[stockId] = "Enter a whole number from 0 to 9999.";
    else changes.push({ stockId, expected, quantity });
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: changes };
}

/** Most units a size can hold (matches parseQuantity). */
export const MAX_QUANTITY = 9999;
/** Largest stock change allowed in one adjustment, either way. */
export const MAX_ADJUSTMENT = 9999;
const DELTA = /^[+-]?\d{1,4}$/;

/**
 * A relative stock adjustment ("+5" received, "-2" damaged). Whether the result
 * stays within 0–9999 is checked by the update statement itself, so it holds
 * even when checkouts change the same row concurrently.
 */
export function parseAdjustment(input: unknown): Parsed<number> {
  const raw = typeof input === "number" ? String(input) : text(input);
  const delta = DELTA.test(raw) ? Number(raw) : NaN;
  if (!Number.isInteger(delta) || Math.abs(delta) > MAX_ADJUSTMENT) {
    return {
      ok: false,
      errors: { delta: "Enter a whole number of units, like +5 or -2." },
    };
  }
  if (delta === 0) return { ok: false, errors: { delta: "Enter an amount other than 0." } };
  return { ok: true, value: delta };
}

export const INVENTORY_STATUSES = ["all", "low", "out"] as const;
export type InventoryStatus = (typeof INVENTORY_STATUSES)[number];
export type InventoryFilters = { q: string; status: InventoryStatus };

/** Inventory page filters from the URL; anything unexpected falls back to no filter. */
export function parseInventoryFilters(params: {
  [key: string]: string | string[] | undefined;
}): InventoryFilters {
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const status = (INVENTORY_STATUSES as readonly unknown[]).includes(params.status)
    ? (params.status as InventoryStatus)
    : "all";
  return { q, status };
}
