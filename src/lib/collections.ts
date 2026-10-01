import type { CatalogFilter } from "@/lib/products";

// Storefront collections: named views of the catalog for the menu. Each one
// is a fixed filter; listings add an optional category choice on top.

export type CollectionDefinition = {
  slug: string;
  title: string;
  eyebrow: string;
  description: string;
  filter: CatalogFilter;
};

export const collections: CollectionDefinition[] = [
  {
    slug: "women",
    title: "Women",
    eyebrow: "Collection",
    description: "Ready-to-wear, shoes, bags and jewelry for women, plus our unisex pieces.",
    filter: { audiences: ["women", "unisex"] },
  },
  {
    slug: "men",
    title: "Men",
    eyebrow: "Collection",
    description: "Tailoring, knitwear, shoes and accessories for men, plus our unisex pieces.",
    filter: { audiences: ["men", "unisex"] },
  },
  {
    slug: "bags",
    title: "Bags & Small Leather Goods",
    eyebrow: "Leather goods",
    description: "Totes, weekenders and wallets in full-grain leather that ages beautifully.",
    filter: { categorySlugs: ["bags"] },
  },
  {
    slug: "shoes",
    title: "Shoes",
    eyebrow: "Footwear",
    description: "Boots, loafers, pumps and trainers, made by hand in Europe.",
    filter: { categorySlugs: ["shoes"] },
  },
  {
    slug: "jewelry",
    title: "Jewelry & Watches",
    eyebrow: "Finishing touches",
    description: "Gold vermeil jewelry, watches and eyewear to finish every look.",
    filter: { categorySlugs: ["jewelry", "watches", "eyewear"] },
  },
];

export function getCollection(slug: string) {
  return collections.find((collection) => collection.slug === slug) ?? null;
}
