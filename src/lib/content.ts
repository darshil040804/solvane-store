// Editorial homepage content (not catalog data; products live in Postgres).
// Images are from Unsplash (https://unsplash.com/license).
import { type Photo, unsplash } from "@/lib/images";

export type Collection = {
  slug: string;
  eyebrow: string;
  title: string;
  description: string;
  image: Photo;
};

// Marketing tiles for "Shop by Category" (these are not the DB categories).
export type ShopTile = {
  slug: string;
  name: string;
  image: Photo;
};

export const hero = {
  eyebrow: "Autumn–Winter 2026",
  title: "The Tailored Season",
  description:
    "Sharp outerwear, fluid tailoring and quiet leather pieces made to be worn for years.",
  href: "/collections/autumn-winter-2026",
  image: unsplash(
    "1485968579580-b6d095142e6e",
    "Woman in a long checked wool coat walking along a city street",
    2400,
  ),
};

export const leatherFeature = {
  eyebrow: "Men",
  title: "Leather, reconsidered",
  href: "/collections/leather",
  image: unsplash(
    "1520975954732-35dd22299614",
    "Man in a black leather biker jacket and sunglasses crouching on a rooftop ledge",
  ),
};

export const knitwearFeature = {
  eyebrow: "The Knitwear Edit",
  title: "Soft structure for colder days",
  description:
    "Cashmere, merino and hand-finished cable knits in a palette of undyed neutrals.",
  href: "/collections/knitwear",
  image: unsplash(
    "1558769132-cb1aea458c5e",
    "Rail of cream and camel knit sweaters beside dried pampas grass",
    2400,
  ),
};

export const featuredCollections: Collection[] = [
  {
    slug: "evening",
    eyebrow: "Women",
    title: "The Evening Collection",
    description: "Liquid silhouettes cut to move.",
    image: unsplash(
      "1595777457583-95e059d581b8",
      "Woman in a flowing red evening gown on stone steps",
    ),
  },
  {
    slug: "tailoring",
    eyebrow: "Men",
    title: "Modern Tailoring",
    description: "Soft-shouldered suiting in wool and flannel.",
    image: unsplash(
      "1507679799987-c73779587ccf",
      "Man in a navy suit and striped tie buttoning his jacket",
    ),
  },
];

export const shopTiles: ShopTile[] = [
  {
    slug: "women",
    name: "Women",
    image: unsplash(
      "1581044777550-4cfa60707c03",
      "Woman in an off-shoulder polka-dot organza blouse",
      1000,
    ),
  },
  {
    slug: "men",
    name: "Men",
    image: unsplash(
      "1617137968427-85924c800a22",
      "Man in a navy suit and white shirt standing outside a glass building",
      1000,
    ),
  },
  {
    slug: "bags",
    name: "Bags & Small Leather Goods",
    image: unsplash(
      "1492707892479-7bc8d5a4ee93",
      "Quilted black crossbody bag with sunglasses, watch and rings laid flat",
      1000,
    ),
  },
  {
    slug: "shoes",
    name: "Shoes",
    image: unsplash(
      "1543163521-1bf539c55dd2",
      "Blue floral-print stiletto pumps on a white plinth",
      1000,
    ),
  },
];

export const services = [
  {
    title: "Complimentary delivery",
    description:
      "Free express shipping on every order, packaged in our signature box.",
    href: "/services/delivery",
    cta: "Delivery options",
  },
  {
    title: "Returns within 30 days",
    description:
      "Changed your mind? Return or exchange online or at any Solvane store.",
    href: "/services/returns",
    cta: "How returns work",
  },
  {
    title: "Personalization",
    description:
      "Add hot-stamped initials to leather goods and make a piece your own.",
    href: "/services/personalization",
    cta: "Discover the service",
  },
];
