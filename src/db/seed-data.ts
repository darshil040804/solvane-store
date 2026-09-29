// Sample catalog loaded into Postgres by `npm run db:seed` (src/db/seed.ts).
// Images are from Unsplash (https://unsplash.com/license).
import { ONE_SIZE } from "@/db/catalog-schema";
import { type Photo, unsplash, unsplashDetail } from "@/lib/images";

export type SeedStock = { size: string; quantity: number }[];

export type SeedProduct = {
  slug: string;
  name: string;
  categorySlug: string;
  priceCents: number;
  isNew?: boolean;
  color?: string;
  description: string;
  details: string[];
  care: string;
  /** In display order; a single "One size" entry for unsized products. */
  stock: SeedStock;
  /** The first image is the primary one used on product cards. */
  images: [Photo, ...Photo[]];
};

// Quantities are listed in size order.
const letterSizes = (quantities: number[]): SeedStock =>
  ["XS", "S", "M", "L", "XL"].map((size, i) => ({
    size,
    quantity: quantities[i],
  }));

const shoeSizes = (quantities: number[]): SeedStock =>
  ["36", "37", "38", "39", "40", "41"].map((size, i) => ({
    size,
    quantity: quantities[i],
  }));

const oneSize = (quantity: number): SeedStock => [{ size: ONE_SIZE, quantity }];

export const seedCategories = [
  { slug: "ready-to-wear", name: "Ready-to-wear" },
  { slug: "shoes", name: "Shoes" },
  { slug: "bags", name: "Bags" },
  { slug: "watches", name: "Watches" },
  { slug: "eyewear", name: "Eyewear" },
  { slug: "jewelry", name: "Jewelry" },
];

// Listed newest first: the first eight are the homepage's New Arrivals.
export const seedProducts: SeedProduct[] = [
  {
    slug: "nappa-leather-biker-jacket",
    name: "Biker Jacket in Nappa Leather",
    categorySlug: "ready-to-wear",
    priceCents: 245000,
    isNew: true,
    color: "Black",
    description:
      "A classic biker silhouette cut from supple lambskin nappa that softens with wear. Asymmetric zip front, notched lapels with snap closures and zipped pockets keep the lines sharp.",
    details: [
      "Lambskin nappa leather",
      "Asymmetric front zip closure",
      "Three zipped pockets",
      "Snap-fastened lapels",
      "Fully lined in cupro",
      "Made in Italy",
    ],
    care: "Professional leather clean only. Store on a wide hanger away from direct sunlight.",
    stock: letterSizes([1, 2, 2, 1, 0]),
    images: [
      // Cropped below the photo's third-party garment label.
      unsplashDetail(
        "1551028719-00167b16eac5",
        "Black leather biker jacket laid flat, showing its zips and snap lapels",
        [0.28, 0.82],
        1.7,
      ),
      unsplash(
        "1520975954732-35dd22299614",
        "Model wearing the black leather biker jacket with sunglasses on a rooftop",
        1200,
      ),
    ],
  },
  {
    slug: "satin-bomber-jacket",
    name: "Satin Bomber Jacket",
    categorySlug: "ready-to-wear",
    priceCents: 139000,
    isNew: true,
    color: "Rust",
    description:
      "A lightweight bomber in fluid technical satin with a soft sheen. Ribbed collar, cuffs and hem give a relaxed, gathered shape.",
    details: [
      "Technical satin shell",
      "Two-way front zip",
      "Welt side pockets and a zipped sleeve pocket",
      "Ribbed collar, cuffs and hem",
      "Made in Portugal",
    ],
    care: "Machine wash cold on a delicate cycle. Do not tumble dry.",
    stock: letterSizes([2, 3, 3, 2, 2]),
    images: [
      unsplash(
        "1591047139829-d91aecb6caea",
        "Rust-colored satin bomber jacket held up on a hanger",
        1200,
      ),
      unsplashDetail(
        "1591047139829-d91aecb6caea",
        "Close-up of the pocket and ribbed hem on the rust satin bomber jacket",
        [0.4, 0.75],
        2.2,
      ),
    ],
  },
  {
    slug: "crochet-fringe-poncho",
    name: "Crochet Fringe Poncho",
    categorySlug: "ready-to-wear",
    priceCents: 115000,
    color: "Ivory",
    description:
      "Hand-crocheted in an open mesh of organic cotton, finished with a long knotted fringe. Drapes easily over tailoring or a simple slip dress.",
    details: [
      "Organic cotton",
      "Hand-crocheted open mesh",
      "V-neckline",
      "Knotted fringe hem",
      "One size",
      "Made in Peru",
    ],
    care: "Hand wash cold and dry flat. Do not hang when wet.",
    stock: oneSize(3),
    images: [
      unsplash(
        "1434389677669-e08b4cac3105",
        "Ivory open-knit poncho with fringed hem on a wooden hanger",
        1200,
      ),
      unsplashDetail(
        "1434389677669-e08b4cac3105",
        "Close-up of the crochet mesh and knotted fringe of the ivory poncho",
        [0.5, 0.8],
      ),
    ],
  },
  {
    slug: "relaxed-pleated-trouser",
    name: "Relaxed Pleated Trouser",
    categorySlug: "ready-to-wear",
    priceCents: 78000,
    color: "Blush",
    description:
      "An easy, high-rise trouser in washed crepe with an elasticated waist and gathered cuffs. Patch pockets add a utilitarian note.",
    details: [
      "Washed viscose crepe",
      "Elasticated high-rise waist",
      "Front patch pockets",
      "Elasticated cuffs",
      "Made in Portugal",
    ],
    care: "Machine wash cold. Cool iron on the reverse.",
    stock: letterSizes([0, 2, 3, 2, 1]),
    images: [
      unsplash(
        "1594633312681-425c7b97ccd1",
        "Blush pink relaxed trousers with elasticated cuffs",
        1200,
      ),
      unsplashDetail(
        "1594633312681-425c7b97ccd1",
        "Close-up of the patch pockets and elasticated waist on the blush trousers",
        [0.3, 0.25],
      ),
    ],
  },
  {
    slug: "essential-cotton-tee",
    name: "Essential Cotton T-Shirt",
    categorySlug: "ready-to-wear",
    priceCents: 29000,
    color: "Black",
    description:
      "The everyday T-shirt, made from a dense long-staple cotton jersey that holds its shape wash after wash.",
    details: [
      "Long-staple cotton jersey",
      "Crew neckline",
      "Regular fit",
      "Printed chest emblem",
      "Made in Portugal",
    ],
    care: "Machine wash cold inside out. Do not tumble dry.",
    stock: letterSizes([3, 4, 5, 5, 3]),
    images: [
      unsplash(
        "1618354691373-d851c5c3a990",
        "Black cotton t-shirt with a small chest emblem on a hanger",
        1200,
      ),
      unsplashDetail(
        "1618354691373-d851c5c3a990",
        "Close-up of the black cotton jersey",
        [0.3, 0.7],
        2.5,
      ),
    ],
  },
  {
    slug: "fleur-stiletto-pump",
    name: "Fleur Stiletto Pump",
    categorySlug: "shoes",
    priceCents: 89000,
    isNew: true,
    color: "Blue floral",
    description:
      "A pointed-toe pump in printed satin, set on a slender 100 mm heel. The floral print is placed by hand so no two pairs are the same.",
    details: [
      "Printed silk satin upper",
      "Leather lining and sole",
      "100 mm stiletto heel",
      "Pointed toe",
      "Made in Italy",
    ],
    care: "Wipe with a soft dry cloth. Store in the dust bag provided.",
    stock: shoeSizes([0, 1, 1, 0, 0, 0]),
    images: [
      unsplash(
        "1543163521-1bf539c55dd2",
        "Pair of blue floral-print pointed stiletto pumps",
        1200,
      ),
      unsplashDetail(
        "1543163521-1bf539c55dd2",
        "Close-up of the stiletto heel of the blue floral pump",
        [0.4, 0.68],
      ),
    ],
  },
  {
    slug: "suede-wingtip-loafer",
    name: "Suede Wingtip Loafer",
    categorySlug: "shoes",
    priceCents: 96000,
    color: "Teal",
    description:
      "A laceless take on the wingtip in soft calf suede, with hand-punched broguing and a flexible Blake-stitched sole.",
    details: [
      "Calf suede upper",
      "Hand-punched broguing",
      "Leather lining",
      "Blake-stitched leather sole",
      "Made in Spain",
    ],
    care: "Brush with a suede brush and treat with a protective spray.",
    stock: shoeSizes([0, 1, 1, 1, 1, 1]),
    images: [
      unsplash(
        "1560343090-f0409e92791a",
        "Teal suede wingtip loafer with a brown sole",
        1200,
      ),
      unsplashDetail(
        "1560343090-f0409e92791a",
        "Close-up of the broguing on the teal suede loafer",
        [0.65, 0.6],
      ),
    ],
  },
  {
    slug: "aline-chain-shoulder-bag",
    name: "Aline Chain Shoulder Bag",
    categorySlug: "bags",
    priceCents: 185000,
    isNew: true,
    color: "Rose",
    description:
      "A structured flap bag in smooth calfskin with an inlaid chevron. The sliding chain strap can be worn long across the body or doubled on the shoulder.",
    details: [
      "Smooth calfskin with leather inlay",
      "Magnetic flap closure",
      "Sliding chain strap, 110 cm",
      "Interior slip pocket",
      "Dimensions: 22 × 14 × 6 cm",
      "Made in Italy",
    ],
    care: "Keep away from water and store stuffed in its dust bag.",
    stock: oneSize(4),
    images: [
      unsplash(
        "1566150905458-1bf1fc113f0d",
        "Pink leather shoulder bag with a silver chain strap",
        1200,
      ),
      unsplashDetail(
        "1566150905458-1bf1fc113f0d",
        "Close-up of the chevron inlay on the pink shoulder bag",
        [0.5, 0.45],
      ),
    ],
  },
  {
    slug: "minimal-leather-strap-watch",
    name: "Minimal Leather Strap Watch",
    categorySlug: "watches",
    priceCents: 120000,
    color: "Taupe",
    description:
      "A slim 36 mm case with a clean white dial and burgundy indices, on a soft taupe calfskin strap.",
    details: [
      "36 mm rose gold-tone steel case",
      "Swiss quartz movement",
      "Sapphire crystal",
      "Calfskin strap with pin buckle",
      "Water resistant to 30 m",
    ],
    care: "Avoid water on the leather strap. Battery service every two years.",
    stock: oneSize(9),
    images: [
      unsplash(
        "1524592094714-0f0654e20314",
        "Hand holding a white-dial watch with a taupe leather strap",
        1200,
      ),
      unsplashDetail(
        "1524592094714-0f0654e20314",
        "Close-up of the white watch dial with burgundy indices",
        [0.5, 0.45],
      ),
    ],
  },
  {
    slug: "round-metal-sunglasses",
    name: "Round Metal Sunglasses",
    categorySlug: "eyewear",
    priceCents: 42000,
    color: "Gold / Green",
    description:
      "Fine gold-tone round frames with mineral glass lenses in bottle green. Adjustable nose pads for an easy fit.",
    details: [
      "Gold-tone metal frame",
      "Green mineral glass lenses",
      "100% UV protection",
      "Adjustable nose pads",
      "Includes leather case",
    ],
    care: "Clean with the microfiber cloth provided.",
    stock: oneSize(15),
    images: [
      unsplash(
        "1511499767150-a48a237f0083",
        "Gold round-frame sunglasses with green lenses on marble",
        1200,
      ),
      unsplashDetail(
        "1511499767150-a48a237f0083",
        "Close-up of the gold frame and green lenses",
        [0.4, 0.5],
      ),
    ],
  },
  {
    slug: "sapphire-drop-earrings",
    name: "Sapphire Drop Earrings",
    categorySlug: "jewelry",
    priceCents: 68000,
    color: "Sapphire blue",
    description:
      "Statement drops with a pear-cut blue stone framed by baguette and round crystals, on a silver-plated setting.",
    details: [
      "Silver-plated brass",
      "Pear-cut glass stone",
      "Hand-set crystals",
      "Post back",
      "Length: 5.5 cm",
    ],
    care: "Store separately in the pouch provided. Avoid perfume and water.",
    stock: oneSize(2),
    images: [
      unsplash(
        "1535632066927-ab7c9ab60908",
        "Pair of crystal drop earrings with blue centre stones",
        1200,
      ),
      unsplashDetail(
        "1535632066927-ab7c9ab60908",
        "Close-up of the blue pear-cut stone and crystal setting",
        [0.5, 0.7],
      ),
    ],
  },
  {
    slug: "pearl-strand-necklace",
    name: "Pearl Strand Necklace",
    categorySlug: "jewelry",
    priceCents: 210000,
    color: "White",
    description:
      "A single strand of hand-matched freshwater pearls, finished with a pavé rose clasp in sterling silver.",
    details: [
      "7–7.5 mm freshwater pearls",
      "Hand-knotted on silk",
      "Sterling silver pavé clasp",
      "Length: 45 cm",
      "Presented in a gift box",
    ],
    care: "Wipe with a soft cloth after wearing. Restring every few years.",
    stock: oneSize(0),
    images: [
      // Centred on the clasp: the photo has a shallow depth of field.
      unsplashDetail(
        "1515562141207-7a88fb7ce338",
        "Single-strand pearl necklace in an open gift box",
        [0.5, 0.62],
        1.25,
      ),
      unsplashDetail(
        "1515562141207-7a88fb7ce338",
        "Close-up of the rose-shaped pavé clasp on the pearl necklace",
        [0.45, 0.72],
        2.2,
      ),
    ],
  },
  {
    slug: "city-canvas-backpack",
    name: "City Backpack in Canvas",
    categorySlug: "bags",
    priceCents: 105000,
    color: "Navy",
    description:
      "A clean-lined backpack in water-repellent cotton canvas with a padded laptop sleeve and leather top handle.",
    details: [
      "Water-repellent cotton canvas",
      "Padded sleeve for a 15-inch laptop",
      "Zipped front pocket",
      "Leather top handle",
      "Dimensions: 30 × 42 × 12 cm",
    ],
    care: "Spot clean with a damp cloth.",
    stock: oneSize(7),
    images: [
      unsplash(
        "1553062407-98eeb64c6a62",
        "Navy canvas backpack standing on a tiled floor",
        1200,
      ),
      unsplashDetail(
        "1553062407-98eeb64c6a62",
        "Close-up of the top handle and front of the navy canvas backpack",
        [0.4, 0.35],
      ),
    ],
  },
];
