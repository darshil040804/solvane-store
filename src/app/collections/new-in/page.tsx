import type { Metadata } from "next";
import { ProductListing, selectedCategoryFrom } from "@/components/product-listing";
import { getNewArrivals, type CategoryOption } from "@/lib/products";

const NEW_ARRIVALS_LIMIT = 24;

export const metadata: Metadata = {
  title: "New Arrivals | Solvane",
  description:
    "The latest Solvane ready-to-wear, leather goods, shoes and jewelry, newly arrived from our European ateliers.",
};

// The newest pieces; the category filter narrows within them.
export default async function NewArrivalsPage(props: PageProps<"/collections/new-in">) {
  const { category } = await props.searchParams;
  const newest = await getNewArrivals(NEW_ARRIVALS_LIMIT);

  const counts = new Map<string, CategoryOption>();
  for (const { category: c } of newest) {
    const option = counts.get(c.slug) ?? { slug: c.slug, name: c.name, count: 0 };
    counts.set(c.slug, { ...option, count: option.count + 1 });
  }
  const categories = [...counts.values()].sort((a, b) => a.name.localeCompare(b.name));
  const selected = selectedCategoryFrom(category, categories);

  return (
    <ProductListing
      eyebrow="Just in"
      title="New Arrivals"
      description="The latest pieces from our ateliers, from supple leather to finishing touches, added as they arrive."
      breadcrumb="New Arrivals"
      basePath="/collections/new-in"
      categories={categories}
      selectedCategory={selected}
      products={selected ? newest.filter((p) => p.category.slug === selected) : newest}
      empty={<p className="text-body text-ink-muted">New pieces are on their way. Please check back soon.</p>}
    />
  );
}
