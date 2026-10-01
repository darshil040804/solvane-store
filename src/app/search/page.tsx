import type { Metadata } from "next";
import Link from "next/link";
import { ProductListing, selectedCategoryFrom } from "@/components/product-listing";
import { SearchIcon } from "@/components/icons";
import { getCatalogCategories, getCatalogProducts } from "@/lib/products";

export const metadata: Metadata = {
  title: "Search | Solvane",
  robots: { index: false },
};

const MAX_QUERY = 80;

export default async function SearchPage(props: PageProps<"/search">) {
  const { q, category } = await props.searchParams;
  const query = typeof q === "string" ? q.trim().slice(0, MAX_QUERY) : "";

  const categories = query ? await getCatalogCategories({ query }) : [];
  const selected = selectedCategoryFrom(category, categories);
  const products = query
    ? await getCatalogProducts({ query, categorySlugs: selected ? [selected] : undefined })
    : [];

  return (
    <ProductListing
      eyebrow="Search"
      title={query ? `Results for “${query}”` : "Search the collection"}
      breadcrumb="Search"
      basePath="/search"
      params={{ q: query || undefined }}
      categories={categories}
      selectedCategory={selected}
      products={products}
      intro={
        <form action="/search" role="search" className="mt-2 flex max-w-xl gap-3">
          <label htmlFor="search-query" className="sr-only">
            Search products
          </label>
          <input
            id="search-query"
            name="q"
            type="search"
            defaultValue={query}
            maxLength={MAX_QUERY}
            placeholder="Coat, leather, gold…"
            autoComplete="off"
            className="field"
          />
          <button type="submit" className="btn btn-primary shrink-0">
            <SearchIcon />
            Search
          </button>
        </form>
      }
      empty={
        query ? (
          <>
            <p className="text-body text-ink-muted">
              Nothing matched “{query}”. Try a broader word, such as a colour or material.
            </p>
            <Link href="/shop" className="btn btn-secondary">
              Shop all pieces
            </Link>
          </>
        ) : (
          <p className="text-body text-ink-muted">
            Search by name, colour, material or category.
          </p>
        )
      }
    />
  );
}
