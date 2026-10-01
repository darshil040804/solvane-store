import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductListing, selectedCategoryFrom } from "@/components/product-listing";
import { collections, getCollection } from "@/lib/collections";
import { getCatalogCategories, getCatalogProducts } from "@/lib/products";

// Only the collections defined in src/lib/collections.ts exist ("new-in" has
// its own route).
export const dynamicParams = false;

export function generateStaticParams() {
  return collections.map(({ slug }) => ({ slug }));
}

export async function generateMetadata(
  props: PageProps<"/collections/[slug]">,
): Promise<Metadata> {
  const collection = getCollection((await props.params).slug);
  if (!collection) return {};
  return { title: `${collection.title} | Solvane`, description: collection.description };
}

export default async function CollectionPage(props: PageProps<"/collections/[slug]">) {
  const collection = getCollection((await props.params).slug);
  if (!collection) notFound();

  const { category } = await props.searchParams;
  const categories = await getCatalogCategories(collection.filter);
  const selected = selectedCategoryFrom(category, categories);
  const products = await getCatalogProducts(
    selected ? { ...collection.filter, categorySlugs: [selected] } : collection.filter,
  );

  return (
    <ProductListing
      eyebrow={collection.eyebrow}
      title={collection.title}
      description={collection.description}
      breadcrumb={collection.title}
      basePath={`/collections/${collection.slug}`}
      categories={categories}
      selectedCategory={selected}
      products={products}
    />
  );
}
