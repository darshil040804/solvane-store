// Loads the sample catalog into Postgres: `npm run db:seed`.
// Idempotent: categories and products are upserted by slug, and each product's
// images and stock rows are replaced.
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import { seedCategories, seedProducts } from "./seed-data";

// Same env loading as drizzle.config.ts. This script builds its own client
// because importing "@/db" would throw before the env is loaded.
config({ path: ".env.local" });
config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const db = drizzle({ client: neon(process.env.DATABASE_URL), schema });
const { categories, products, productImages, productStock } = schema;

async function main() {
  const categoryRows = await db
    .insert(categories)
    .values(seedCategories)
    .onConflictDoUpdate({
      target: categories.slug,
      set: { name: sql`excluded.name` },
    })
    .returning({ id: categories.id, slug: categories.slug });
  const categoryIds = new Map(categoryRows.map((row) => [row.slug, row.id]));

  // seedProducts is newest first; space created_at a minute apart to keep that order.
  const now = Date.now();
  const productRows = await db
    .insert(products)
    .values(
      seedProducts.map((product, index) => {
        const categoryId = categoryIds.get(product.categorySlug);
        if (!categoryId) {
          throw new Error(`Unknown category "${product.categorySlug}"`);
        }
        return {
          categoryId,
          slug: product.slug,
          name: product.name,
          description: product.description,
          details: product.details,
          care: product.care,
          color: product.color ?? null,
          priceCents: product.priceCents,
          isNew: product.isNew ?? false,
          createdAt: new Date(now - index * 60_000),
        };
      }),
    )
    .onConflictDoUpdate({
      target: products.slug,
      set: {
        categoryId: sql`excluded.category_id`,
        name: sql`excluded.name`,
        description: sql`excluded.description`,
        details: sql`excluded.details`,
        care: sql`excluded.care`,
        color: sql`excluded.color`,
        priceCents: sql`excluded.price_cents`,
        isNew: sql`excluded.is_new`,
        createdAt: sql`excluded.created_at`,
        updatedAt: sql`now()`,
      },
    })
    .returning({ id: products.id, slug: products.slug });
  const productIds = new Map(productRows.map((row) => [row.slug, row.id]));
  const productId = (slug: string) => {
    const id = productIds.get(slug);
    if (!id) throw new Error(`Product "${slug}" was not upserted`);
    return id;
  };

  const ids = [...productIds.values()];
  const images = seedProducts.flatMap((product) =>
    product.images.map((image, position) => ({
      productId: productId(product.slug),
      url: image.src,
      alt: image.alt,
      position,
    })),
  );
  const stock = seedProducts.flatMap((product) =>
    product.stock.map((row, position) => ({
      productId: productId(product.slug),
      size: row.size,
      quantity: row.quantity,
      position,
    })),
  );

  // neon-http has no interactive transactions; batch() runs these in one.
  await db.batch([
    db.delete(productImages).where(inArray(productImages.productId, ids)),
    db.delete(productStock).where(inArray(productStock.productId, ids)),
    db.insert(productImages).values(images),
    db.insert(productStock).values(stock),
  ]);

  console.log(
    `Seeded ${categoryRows.length} categories, ${productRows.length} products, ` +
      `${images.length} images and ${stock.length} stock rows.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
