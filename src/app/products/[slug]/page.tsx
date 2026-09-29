import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { PlusIcon } from "@/components/icons";
import { ProductCard } from "@/components/product-card";
import { ProductPurchase } from "@/components/product-purchase";
import { SectionHeading } from "@/components/section-heading";
import { StockStatus } from "@/components/stock-status";
import { formatPrice } from "@/lib/format";
import {
  getProductBySlug,
  getProductSlugs,
  getRelatedProducts,
} from "@/lib/products";

// Prerender every product at build; products added later render on first visit.
export const dynamicParams = true;
// Refresh price and stock from the database every minute.
export const revalidate = 60;

export async function generateStaticParams() {
  const slugs = await getProductSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata(
  props: PageProps<"/products/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const product = await getProductBySlug(slug);
  if (!product) return {};

  return {
    title: `${product.name} | Solvane`,
    description: product.description,
    openGraph: {
      title: product.name,
      description: product.description,
      images: [{ url: product.images[0].src, alt: product.images[0].alt }],
    },
  };
}

export default async function ProductPage(
  props: PageProps<"/products/[slug]">,
) {
  const { slug } = await props.params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const categoryHref = `/collections/${product.category.slug}`;
  const related = await getRelatedProducts(product, 4);

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
          <li>
            <Link href={categoryHref} className="link-quiet">
              {product.category.name}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-ink">
            {product.name}
          </li>
        </ol>
      </nav>

      <div className="lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        {/* Swipeable on small screens, stacked full-width images from lg. */}
        <div
          aria-label={`${product.name} images`}
          role="group"
          className="rail auto-cols-[88%] md:auto-cols-[50%] lg:auto-cols-fr lg:grid-flow-row lg:overflow-visible"
        >
          {product.images.map((image, index) => (
            <div key={image.src} className="media aspect-product">
              <Image
                src={image.src}
                alt={image.alt}
                fill
                preload={index === 0}
                sizes="(min-width: 64rem) 60vw, (min-width: 48rem) 50vw, 88vw"
              />
            </div>
          ))}
        </div>

        <div className="px-gutter py-8 lg:sticky lg:top-header lg:self-start lg:py-12 xl:px-16">
          <div className="flex max-w-xl flex-col gap-8">
            <div className="flex flex-col gap-3">
              <Link
                href={categoryHref}
                className="eyebrow link-quiet self-start text-ink-muted"
              >
                {product.category.name}
              </Link>
              <h1 className="text-heading">{product.name}</h1>
              <p className="text-body-lg">{formatPrice(product.priceCents)}</p>
              <StockStatus stock={product.stock} />
            </div>

            {product.color && (
              <p className="text-body-sm">
                Color: <span className="text-ink-muted">{product.color}</span>
              </p>
            )}

            <ProductPurchase
              productName={product.name}
              sizes={product.sizes}
              inStock={product.stock > 0}
            />

            <p className="text-body text-ink-muted">{product.description}</p>

            <div className="border-b">
              <Accordion title="Product details" defaultOpen>
                <ul className="flex list-disc flex-col gap-1.5 pl-5">
                  {product.details.map((detail) => (
                    <li key={detail}>{detail}</li>
                  ))}
                </ul>
              </Accordion>
              <Accordion title="Materials & care">
                <p>{product.care}</p>
              </Accordion>
              <Accordion title="Delivery & returns">
                <p>
                  Complimentary express delivery in 2–4 business days. Returns
                  and exchanges are free within 30 days, online or in store.{" "}
                  <Link href="/services/returns" className="link">
                    Learn more
                  </Link>
                </p>
              </Accordion>
            </div>

            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-caption text-ink-muted">
              <li>Complimentary delivery</li>
              <li>30-day returns</li>
              <li>Signature gift packaging</li>
            </ul>
          </div>
        </div>
      </div>

      <section className="section" aria-labelledby="related-title">
        <SectionHeading
          id="related-title"
          eyebrow="Discover more"
          title="You May Also Like"
          href={categoryHref}
          linkLabel={`Shop ${product.category.name}`}
        />
        <div className="grid grid-cols-2 gap-grid lg:grid-cols-4">
          {related.map((item) => (
            <ProductCard
              key={item.slug}
              product={item}
              sizes="(min-width: 64rem) 25vw, 50vw"
            />
          ))}
        </div>
      </section>
    </main>
  );
}

function Accordion({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details className="group border-t" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-body-sm [&::-webkit-details-marker]:hidden">
        {title}
        <PlusIcon className="transition-transform duration-150 ease-standard group-open:rotate-45" />
      </summary>
      <div className="pb-5 text-body-sm text-ink-muted">{children}</div>
    </details>
  );
}
