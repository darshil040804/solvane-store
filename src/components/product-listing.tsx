import Link from "next/link";
import type { ReactNode } from "react";
import { ProductCard } from "@/components/product-card";
import type { CategoryOption, Product } from "@/lib/products";

const items = (count: number) => `${count} ${count === 1 ? "piece" : "pieces"}`;

/** Builds a listing URL keeping other query params (like a search) intact. */
function hrefWith(basePath: string, params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) search.set(key, value);
  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
}

/**
 * A titled product grid with a category filter. The filter is plain links
 * (`?category=<slug>`), so it works without JavaScript and is shareable.
 */
export function ProductListing({
  eyebrow,
  title,
  description,
  breadcrumb,
  basePath,
  params = {},
  categories,
  selectedCategory,
  products,
  intro,
  empty,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  /** Label for the current page in the "Home / …" breadcrumb. */
  breadcrumb: string;
  basePath: string;
  /** Other query params to keep when switching category (e.g. a search). */
  params?: Record<string, string | undefined>;
  categories: CategoryOption[];
  selectedCategory: string | null;
  products: Product[];
  /** Extra content under the heading, such as a search form. */
  intro?: ReactNode;
  empty?: ReactNode;
}) {
  const total = categories.reduce((sum, category) => sum + category.count, 0);

  return (
    <main className="flex-1">
      <nav aria-label="Breadcrumb" className="container-page py-4">
        <ol className="flex flex-wrap items-center gap-2 text-caption text-ink-muted">
          <li>
            <Link href="/" className="link-quiet">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-ink">
            {breadcrumb}
          </li>
        </ol>
      </nav>

      <header className="container-page flex flex-col gap-3 pt-6 pb-8 md:pt-10">
        <p className="eyebrow text-ink-muted">{eyebrow}</p>
        <h1 className="text-display">{title}</h1>
        {description && <p className="max-w-xl text-body text-ink-muted">{description}</p>}
        {intro}
      </header>

      {categories.length > 0 && (
        <nav aria-label="Filter by category" className="container-page">
          <ul className="rail auto-cols-max gap-6 border-b">
            <li>
              <Link
                href={hrefWith(basePath, params)}
                aria-current={selectedCategory === null ? "page" : undefined}
                className="tab"
              >
                All <span className="ml-1.5 text-ink-subtle">{total}</span>
              </Link>
            </li>
            {categories.map((category) => (
              <li key={category.slug}>
                <Link
                  href={hrefWith(basePath, { ...params, category: category.slug })}
                  aria-current={selectedCategory === category.slug ? "page" : undefined}
                  className="tab"
                >
                  {category.name}{" "}
                  <span className="ml-1.5 text-ink-subtle">{category.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <section aria-label={`${title} products`} className="pt-6 pb-section">
        {products.length > 0 ? (
          <>
            <p data-testid="result-count" className="container-page mb-4 text-caption text-ink-muted">
              {items(products.length)}
            </p>
            <div className="product-grid">
              {products.map((product) => (
                <ProductCard key={product.slug} product={product} />
              ))}
            </div>
          </>
        ) : (
          <div className="container-narrow flex flex-col items-center gap-5 py-section text-center">
            {empty ?? (
              <>
                <p className="text-body text-ink-muted">Nothing here just yet.</p>
                <Link href="/shop" className="btn btn-secondary">
                  Shop all pieces
                </Link>
              </>
            )}
          </div>
        )}
      </section>
    </main>
  );
}

/** Reads `?category=` and keeps it only if it is one of the listing's categories. */
export function selectedCategoryFrom(
  value: string | string[] | undefined,
  categories: CategoryOption[],
) {
  const slug = typeof value === "string" ? value : null;
  return slug && categories.some((category) => category.slug === slug) ? slug : null;
}
