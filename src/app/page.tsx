import Image from "next/image";
import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { SectionHeading } from "@/components/section-heading";
import {
  featuredCollections,
  hero,
  knitwearFeature,
  leatherFeature,
  services,
  shopTiles,
} from "@/lib/content";
import { getNewArrivals, getProductsByCategory, type Product } from "@/lib/products";

// Refresh stock and "Sold out" badges from the database every minute.
export const revalidate = 60;

export default async function Home() {
  const [newArrivals, accessories] = await Promise.all([
    getNewArrivals(8),
    getProductsByCategory(["jewelry", "watches", "eyewear"], 5),
  ]);

  return (
    <main className="flex-1">
      <Hero />
      <Intro />
      <NewArrivals products={newArrivals} />
      <FeaturedCollections />
      <KnitwearEditorial />
      <Accessories products={accessories} />
      <ShopByCategory />
      <Services />
    </main>
  );
}

function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <Image
        src={hero.image.src}
        alt={hero.image.alt}
        fill
        preload
        sizes="100vw"
        // The subject stands left of centre; keep her in frame on tall screens.
        className="object-cover object-[38%_30%]"
      />
      <div aria-hidden="true" className="scrim-top absolute inset-0" />
      <div aria-hidden="true" className="scrim-bottom absolute inset-0" />

      <div className="container-page relative flex flex-col items-center gap-4 pb-14 md:pb-20">
        <h1 id="hero-title" className="text-hero">
          {hero.title}
        </h1>
        <p className="max-w-md text-body-lg">{hero.description}</p>
        <Link href={hero.href} className="btn btn-inverse mt-3">
          Discover the collection
        </Link>
      </div>
    </section>
  );
}

function Intro() {
  return (
    <section className="container-narrow section flex flex-col items-center gap-5 text-center">
      <p className="eyebrow text-ink-muted">The House of Solvane</p>
      <p className="text-title md:text-heading">
        Pieces designed in Paris and made by hand in small European ateliers,
        with materials chosen to age beautifully.
      </p>
      <Link href="/about/craftsmanship" className="link-cta text-body-sm">
        Our craftsmanship
      </Link>
    </section>
  );
}

function NewArrivals({ products }: { products: Product[] }) {
  return (
    <section className="pb-section" aria-labelledby="new-arrivals">
      <SectionHeading
        id="new-arrivals"
        eyebrow="Just in"
        title="New Arrivals"
        href="/collections/new-in"
        linkLabel="View all"
      />

      <div className="product-grid">
        <Link
          href={leatherFeature.href}
          className="grid-feature group relative flex aspect-product items-end overflow-hidden bg-surface-muted text-on-ink md:aspect-auto"
        >
          <Image
            src={leatherFeature.image.src}
            alt={leatherFeature.image.alt}
            fill
            sizes="(min-width: 48rem) 66vw, 100vw"
            className="object-cover transition-transform duration-700 ease-standard group-hover:scale-[1.03]"
          />
          <div aria-hidden="true" className="scrim-bottom absolute inset-0" />
          <div className="relative flex flex-col gap-2 p-6 md:p-10">
            <p className="eyebrow">{leatherFeature.eyebrow}</p>
            <p className="text-display">{leatherFeature.title}</p>
            <span className="link-cta mt-2 self-start text-body-sm">
              Shop the edit
            </span>
          </div>
        </Link>

        {products.map((product) => (
          <ProductCard key={product.slug} product={product} />
        ))}
      </div>
    </section>
  );
}

function FeaturedCollections() {
  return (
    <section
      className="grid gap-grid pb-section md:grid-cols-2"
      aria-label="Featured collections"
    >
      {featuredCollections.map((collection) => (
        <Link
          key={collection.slug}
          href={collection.href}
          className="group flex flex-col"
        >
          <div className="media aspect-editorial">
            <Image
              src={collection.image.src}
              alt={collection.image.alt}
              fill
              sizes="(min-width: 48rem) 50vw, 100vw"
              className="transition-transform duration-700 ease-standard group-hover:scale-[1.03]"
            />
          </div>
          <div className="flex flex-col items-center gap-2 px-gutter pt-6 pb-4 text-center">
            <p className="eyebrow text-ink-muted">{collection.eyebrow}</p>
            <h2 className="text-title md:text-heading">{collection.title}</h2>
            <p className="text-body text-ink-muted">{collection.description}</p>
            <span className="link-cta mt-2 text-body-sm">Discover</span>
          </div>
        </Link>
      ))}
    </section>
  );
}

function KnitwearEditorial() {
  return (
    <section
      className="relative grid min-h-[36rem] items-end overflow-hidden text-on-ink md:min-h-[44rem]"
      aria-labelledby="knitwear-title"
    >
      <Image
        src={knitwearFeature.image.src}
        alt={knitwearFeature.image.alt}
        fill
        sizes="100vw"
        className="object-cover"
      />
      {/* The knitwear photo is pale, so it needs a stronger scrim than the hero. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-linear-to-t from-black/60 via-black/25 to-transparent md:bg-linear-to-r md:via-black/20"
      />

      <div className="container-page relative flex max-w-2xl flex-col items-start gap-4 pb-12 md:pb-16">
        <p className="eyebrow">{knitwearFeature.eyebrow}</p>
        <h2 id="knitwear-title" className="text-display">
          {knitwearFeature.title}
        </h2>
        <p className="max-w-md text-body-lg">{knitwearFeature.description}</p>
        <Link href={knitwearFeature.href} className="btn btn-inverse mt-3">
          Shop knitwear
        </Link>
      </div>
    </section>
  );
}

function Accessories({ products }: { products: Product[] }) {
  return (
    <section className="section" aria-labelledby="accessories-title">
      <SectionHeading
        id="accessories-title"
        eyebrow="Finishing touches"
        title="Jewelry & Accessories"
        href="/collections/jewelry"
        linkLabel="Shop all"
      />

      <div className="rail auto-cols-[68%] sm:auto-cols-[40%] md:auto-cols-[minmax(12rem,1fr)]">
        {products.map((product) => (
          <ProductCard
            key={product.slug}
            product={product}
            sizes="(min-width: 48rem) 20vw, (min-width: 40rem) 40vw, 68vw"
          />
        ))}
      </div>
    </section>
  );
}

function ShopByCategory() {
  return (
    <section className="pb-section" aria-labelledby="categories-title">
      <div className="container-page mb-8 flex flex-col items-center gap-2 text-center md:mb-10">
        <p className="eyebrow text-ink-muted">Explore</p>
        <h2 id="categories-title" className="text-heading">
          Shop by Category
        </h2>
      </div>

      <ul className="grid grid-cols-2 gap-grid md:grid-cols-4">
        {shopTiles.map((category) => (
          <li key={category.slug}>
            <Link
              href={`/collections/${category.slug}`}
              className="group flex flex-col"
            >
              <div className="media aspect-editorial">
                <Image
                  src={category.image.src}
                  alt={category.image.alt}
                  fill
                  sizes="(min-width: 48rem) 25vw, 50vw"
                  className="transition-transform duration-700 ease-standard group-hover:scale-[1.03]"
                />
              </div>
              <span className="px-3 pt-4 pb-2 text-center text-body-sm md:text-body">
                {category.name}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Services() {
  return (
    <section
      className="bg-surface-muted"
      aria-labelledby="services-title"
    >
      <div className="container-content section">
        <div className="mb-10 flex flex-col items-center gap-2 text-center md:mb-14">
          <p className="eyebrow text-ink-muted">Solvane Services</p>
          <h2 id="services-title" className="text-heading">
            The Art of Care
          </h2>
        </div>
        <ul className="grid gap-10 text-center md:grid-cols-3 md:gap-8">
          {services.map((service) => (
            <li key={service.title} className="flex flex-col items-center gap-3">
              <h3 className="text-body-lg">{service.title}</h3>
              <p className="max-w-xs text-body text-ink-muted">
                {service.description}
              </p>
              <Link href={service.href} className="link-cta mt-1 text-body-sm">
                {service.cta}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
