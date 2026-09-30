import "server-only";

import { asc, desc, eq, inArray, ne, sql } from "drizzle-orm";
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
