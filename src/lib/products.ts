import "server-only";

import { and, asc, count, desc, eq, ilike, inArray, ne, or, sql, type SQL } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db";
import {
  categories,
  ONE_SIZE,
  productImages,
  products,
  productStock,
} from "@/db/schema";
import type { Photo } from "@/lib/images";

export type ProductSize = {
  label: string;
  inStock: boolean;
  /** Units of this size available to buy now. */
  stock: number;
};

export type Audience = "women" | "men" | "unisex";

/** Storefront view of a product, assembled from its category, images and stock rows. */
export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  details: string[];
  care: string;
  color: string | null;
  priceCents: number;
  isNew: boolean;
  audience: Audience;
  category: { id: string; slug: string; name: string };
  /** The first image is the primary one used on product cards. */
  images: [Photo, ...Photo[]];
  /** Units available across all sizes. */
  stock: number;
  /** Omitted for unsized ("One size") products. */
  sizes?: ProductSize[];
};

const productWith = {
  category: true as const,
  images: { orderBy: [asc(productImages.position)] },
  stock: { orderBy: [asc(productStock.position)] },
};

function findProductBySlug(slug: string) {
  return db.query.products.findFirst({
    where: eq(products.slug, slug),
    with: productWith,
  });
}

type ProductRow = NonNullable<Awaited<ReturnType<typeof findProductBySlug>>>;

function toProduct(row: ProductRow): Product {
  const [primary, ...otherImages] = row.images.map((image) => ({
    src: image.url,
    alt: image.alt,
  }));
  if (!primary) throw new Error(`Product "${row.slug}" has no images`);

  const unsized = row.stock.length === 1 && row.stock[0].size === ONE_SIZE;

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    details: row.details,
    care: row.care,
    color: row.color,
    priceCents: row.priceCents,
    isNew: row.isNew,
    audience: row.audience,
    category: {
      id: row.category.id,
      slug: row.category.slug,
      name: row.category.name,
    },
    images: [primary, ...otherImages],
    stock: row.stock.reduce((total, size) => total + size.quantity, 0),
    sizes: unsized
      ? undefined
      : row.stock.map((size) => ({
          label: size.size,
          inStock: size.quantity > 0,
          stock: size.quantity,
        })),
  };
}

export const getProductBySlug = cache(async (slug: string) => {
  const row = await findProductBySlug(slug);
  return row ? toProduct(row) : null;
});

export const getProductSlugs = cache(async () => {
  const rows = await db.select({ slug: products.slug }).from(products);
  return rows.map((row) => row.slug);
});

/** Newest products first. */
export const getNewArrivals = cache(async (limit = 8) => {
  const rows = await db.query.products.findMany({
    with: productWith,
    orderBy: [desc(products.createdAt)],
    limit,
  });
  return rows.map(toProduct);
});

export const getProductsByCategory = cache(
  async (categorySlugs: string[], limit?: number) => {
    const rows = await db.query.products.findMany({
      where: inArray(
        products.categoryId,
        db
          .select({ id: categories.id })
          .from(categories)
          .where(inArray(categories.slug, categorySlugs)),
      ),
      with: productWith,
      orderBy: [desc(products.createdAt)],
      limit,
    });
    return rows.map(toProduct);
  },
);

/** Same-category products first, then the newest of the rest. */
export const getRelatedProducts = cache(
  async (product: Product, limit = 4) => {
    const rows = await db.query.products.findMany({
      where: ne(products.id, product.id),
      with: productWith,
      orderBy: (table) => [
        desc(sql`${table.categoryId} = ${product.category.id}`),
        desc(table.createdAt),
      ],
      limit,
    });
    return rows.map(toProduct);
  },
);

/** What a product listing shows; every part is optional and they combine. */
export type CatalogFilter = {
  /** Women's listings include unisex pieces, and so do men's. */
  audiences?: Audience[];
  categorySlugs?: string[];
  /** Free-text search over name, description, colour and category. */
  query?: string;
};

const categoryIdsFor = (slugs: string[]) =>
  db.select({ id: categories.id }).from(categories).where(inArray(categories.slug, slugs));

/** Escapes LIKE wildcards so a search for "100%" matches literally. */
const likePattern = (text: string) => `%${text.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

function catalogWhere(filter: CatalogFilter): SQL | undefined {
  const conditions: SQL[] = [];
  if (filter.audiences?.length) conditions.push(inArray(products.audience, filter.audiences));
  if (filter.categorySlugs?.length) {
    conditions.push(inArray(products.categoryId, categoryIdsFor(filter.categorySlugs)));
  }
  const query = filter.query?.trim();
  if (query) {
    const pattern = likePattern(query);
    conditions.push(
      or(
        ilike(products.name, pattern),
        ilike(products.description, pattern),
        ilike(products.color, pattern),
        inArray(
          products.categoryId,
          db.select({ id: categories.id }).from(categories).where(ilike(categories.name, pattern)),
        ),
      )!,
    );
  }
  return conditions.length ? and(...conditions) : undefined;
}

/** Products matching the filter, newest first. */
export async function getCatalogProducts(filter: CatalogFilter = {}) {
  const rows = await db.query.products.findMany({
    where: catalogWhere(filter),
    with: productWith,
    orderBy: [desc(products.createdAt)],
  });
  return rows.map(toProduct);
}

export type CategoryOption = { slug: string; name: string; count: number };

/**
 * Categories that have products for this filter (ignoring its own category
 * choice), with counts, for the category filter on listings.
 */
export async function getCatalogCategories(filter: CatalogFilter = {}): Promise<CategoryOption[]> {
  return db
    .select({ slug: categories.slug, name: categories.name, count: count(products.id) })
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .where(catalogWhere({ ...filter, categorySlugs: undefined }))
    .groupBy(categories.slug, categories.name)
    .orderBy(asc(categories.name));
}

/** Products by id, in the order given (ids that no longer exist are skipped). */
export async function getProductsByIds(ids: string[]) {
  if (ids.length === 0) return [];
  const rows = await db.query.products.findMany({
    where: inArray(products.id, ids),
    with: productWith,
  });
  const byId = new Map(rows.map((row) => [row.id, toProduct(row)]));
  return ids.map((id) => byId.get(id)).filter((product) => product !== undefined);
}
