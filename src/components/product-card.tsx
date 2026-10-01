import Image from "next/image";
import Link from "next/link";
import { WishlistButton } from "@/components/wishlist-button";
import { formatPrice, getStockState } from "@/lib/format";
import type { Product } from "@/lib/products";

export function ProductCard({
  product,
  sizes = "(min-width: 64rem) 25vw, (min-width: 48rem) 33vw, 50vw",
}: {
  product: Product;
  sizes?: string;
}) {
  const [image] = product.images;
  const stock = getStockState(product.stock);
  // Availability outranks the "New" label: sold out, then low stock, then new.
  const eyebrow =
    stock.status === "out-of-stock"
      ? "Sold out"
      : stock.status === "low-stock"
        ? stock.label
        : product.isNew
          ? "New"
          : null;

  return (
    <article className="group relative bg-surface">
      <div className="media aspect-product">
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes={sizes}
          className="transition-transform duration-700 ease-standard group-hover:scale-[1.03]"
        />
      </div>
      <WishlistButton
        productId={product.id}
        productName={product.name}
        className="absolute top-2 right-2 z-10 bg-surface/80 backdrop-blur-sm hover:bg-surface"
      />
      <div className="flex flex-col gap-1 px-3 pt-3 pb-6 md:px-4">
        {eyebrow && (
          <p
            className={`eyebrow ${stock.status === "low-stock" ? "text-danger" : "text-ink-muted"}`}
          >
            {eyebrow}
          </p>
        )}
        <h3 className="text-body-sm">
          {/* Stretched link: the whole card is clickable. */}
          <Link
            href={`/products/${product.slug}`}
            className="after:absolute after:inset-0"
          >
            {product.name}
          </Link>
        </h3>
        <p className="text-body-sm text-ink-muted">
          {formatPrice(product.priceCents)}
        </p>
      </div>
    </article>
  );
}
