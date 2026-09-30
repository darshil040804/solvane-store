import type { Metadata } from "next";
import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { getNewArrivals } from "@/lib/products";

// Refresh stock and "Sold out" badges from the database every minute.
export const revalidate = 60;

const NEW_ARRIVALS_LIMIT = 24;

export const metadata: Metadata = {
  title: "New Arrivals | Solvane",
  description:
    "The latest Solvane ready-to-wear, leather goods, shoes and jewelry, newly arrived from our European ateliers.",
};

export default async function NewArrivalsPage() {
  const products = await getNewArrivals(NEW_ARRIVALS_LIMIT);

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
            New Arrivals
          </li>
        </ol>
      </nav>

      <header className="container-narrow flex flex-col items-center gap-4 pt-6 pb-10 text-center md:pt-10 md:pb-14">
        <p className="eyebrow text-ink-muted">Just in</p>
        <h1 className="text-display">New Arrivals</h1>
        <p className="max-w-md text-body text-ink-muted">
          The latest pieces from our ateliers, from supple leather to
          finishing touches, added as they arrive.
        </p>
      </header>

      {products.length > 0 ? (
        <section aria-label="New arrivals" className="pb-section">
          <p className="container-page mb-4 text-caption text-ink-muted">
            {products.length} {products.length === 1 ? "item" : "items"}
          </p>
          <div className="product-grid">
            {products.map((product) => (
              <ProductCard key={product.slug} product={product} />
            ))}
          </div>
        </section>
      ) : (
        <section className="container-narrow flex flex-col items-center gap-5 pb-section text-center">
          <p className="text-body text-ink-muted">
            New pieces are on their way. Please check back soon.
          </p>
          <Link href="/" className="btn btn-secondary">
            Return to the homepage
          </Link>
        </section>
      )}
    </main>
  );
}
