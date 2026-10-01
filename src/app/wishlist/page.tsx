import type { Metadata } from "next";
import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { requireSession } from "@/lib/auth/session";
import { getWishlistProducts } from "@/lib/wishlist";

export const metadata: Metadata = {
  title: "Wishlist | Solvane",
  robots: { index: false },
};

export default async function WishlistPage() {
  const { user } = await requireSession("/wishlist");
  const products = await getWishlistProducts(user.id);

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
            Wishlist
          </li>
        </ol>
      </nav>

      <header className="container-page flex flex-col gap-3 pt-6 pb-8 md:pt-10">
        <p className="eyebrow text-ink-muted">Saved pieces</p>
        <h1 className="text-display">Wishlist</h1>
        <p className="max-w-xl text-body text-ink-muted">
          {products.length === 0
            ? "Tap the heart on any piece to save it here."
            : `${products.length} ${products.length === 1 ? "piece" : "pieces"} saved. Tap a heart to remove it.`}
        </p>
      </header>

      {products.length > 0 ? (
        <section aria-label="Saved pieces" className="pb-section">
          <div className="product-grid">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      ) : (
        <div className="container-narrow flex flex-col items-center gap-5 pb-section text-center">
          <p className="text-body text-ink-muted">Your wishlist is empty.</p>
          <Link href="/shop" className="btn btn-secondary">
            Shop all pieces
          </Link>
        </div>
      )}
    </main>
  );
}
