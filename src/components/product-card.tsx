import Image from "next/image";
import Link from "next/link";
import { WishlistButton } from "@/components/wishlist-button";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/lib/products";

export function ProductCard({
  product,
  sizes = "(min-width: 64rem) 25vw, (min-width: 48rem) 33vw, 50vw",
}: {
  product: Product;
  sizes?: string;
}) {
  const [image] = product.images;
  const soldOut = product.stock <= 0;
  const eyebrow = soldOut ? "Sold out" : product.isNew ? "New" : null;

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
        productName={product.name}
        className="absolute top-2 right-2 z-10"
      />
      <div className="flex flex-col gap-1 px-3 pt-3 pb-6 md:px-4">
        {eyebrow && <p className="eyebrow text-ink-muted">{eyebrow}</p>}
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
