import type { Metadata } from "next";
import { ProductListing, selectedCategoryFrom } from "@/components/product-listing";
import { getCatalogCategories, getCatalogProducts } from "@/lib/products";

export const metadata: Metadata = {
  title: "Shop all | Solvane",
  description: "Every Solvane piece: ready-to-wear, shoes, bags, jewelry, watches and eyewear.",
};

export default async function ShopPage(props: PageProps<"/shop">) {
  const { category } = await props.searchParams;
  const categories = await getCatalogCategories();
  const selected = selectedCategoryFrom(category, categories);
  const products = await getCatalogProducts(selected ? { categorySlugs: [selected] } : {});

  return (
    <ProductListing
      eyebrow="The collection"
      title="Shop all"
      description="Every piece in the collection, newest first. Filter by category to narrow it down."
      breadcrumb="Shop all"
      basePath="/shop"
      categories={categories}
      selectedCategory={selected}
      products={products}
    />
  );
}
