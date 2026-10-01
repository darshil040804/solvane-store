// Sample catalog loaded into Postgres by `npm run db:seed` (src/db/seed.ts).
// Images are from Unsplash (https://unsplash.com/license).
import { ONE_SIZE } from "@/db/catalog-schema";
import { type Photo, unsplash, unsplashDetail } from "@/lib/images";

export type SeedStock = { size: string; quantity: number }[];

export type SeedProduct = {
  slug: string;
  name: string;
  categorySlug: string;
  /** Drives the Women and Men collections; unisex pieces appear in both. */
  audience: "women" | "men" | "unisex";
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

const menShoeSizes = (quantities: number[]): SeedStock =>
  ["40", "41", "42", "43", "44", "45"].map((size, i) => ({
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
  // Added October 2026. Photos are free (non-Unsplash+) Unsplash images with
  // no visible third-party branding.
  {
    slug: "belted-camel-wrap-coat",
    name: "Belted Wrap Coat in Camel Wool",
    categorySlug: "ready-to-wear",
    audience: "women",
    priceCents: 189000,
    isNew: true,
    color: "Camel",
    description:
      "A wrap coat in double-faced camel wool with wide notched lapels and a self-tie belt. Unlined for a soft, fluid drape that still holds its shape.",
    details: [
      "Double-faced virgin wool",
      "Self-tie belt with loops",
      "Two patch pockets",
      "Unlined, with bound seams",
      "Made in Italy",
    ],
    care: "Dry clean only. Brush after wearing and hang on a shaped hanger.",
    stock: letterSizes([1, 3, 3, 2, 1]),
    images: [
      unsplash(
        "1677444576987-397c8a5ad04e",
        "Woman in a belted camel wrap coat standing beside a snowy road",
        1200,
      ),
    ],
  },
  {
    slug: "champagne-silk-slip-dress",
    name: "Bias-Cut Slip Dress in Silk Satin",
    categorySlug: "ready-to-wear",
    audience: "women",
    priceCents: 128000,
    isNew: true,
    color: "Champagne",
    description:
      "Cut on the bias from heavy silk satin so it skims the body and moves with every step. Fine adjustable straps and a softly draped cowl neck.",
    details: [
      "100% silk satin",
      "Bias cut",
      "Draped cowl neckline",
      "Adjustable straps",
      "Made in France",
    ],
    care: "Dry clean only. Steam gently on the reverse.",
    stock: letterSizes([2, 2, 3, 1, 0]),
    images: [
      unsplash(
        "1706816997334-c51bcd0f52e0",
        "Woman in a champagne silk slip dress walking through a sunlit stone arcade",
        1200,
      ),
    ],
  },
  {
    slug: "chunky-rib-cardigan",
    name: "Chunky Rib Cardigan",
    categorySlug: "ready-to-wear",
    audience: "women",
    priceCents: 64000,
    color: "Oatmeal grey",
    description:
      "An oversized cardigan in a lofty rib of alpaca and merino, worn open and slouched or belted over a slip dress.",
    details: [
      "Alpaca and merino blend",
      "Oversized fit",
      "Dropped shoulders",
      "Ribbed cuffs and hem",
    ],
    care: "Hand wash cold and dry flat. Store folded.",
    stock: letterSizes([1, 2, 3, 2, 1]),
    images: [
      unsplash(
        "1636178566141-f5b806a2d2b3",
        "Woman in an oversized oatmeal rib-knit cardigan over a grey camisole",
        1200,
      ),
    ],
  },
  {
    slug: "cotton-poplin-shirt",
    name: "Oversized Shirt in Cotton Poplin",
    categorySlug: "ready-to-wear",
    audience: "women",
    priceCents: 42000,
    color: "Optic white",
    description:
      "A crisp poplin shirt with a relaxed, slightly oversized cut. Tuck it into denim or wear it loose over tailoring.",
    details: [
      "100% cotton poplin",
      "Relaxed fit",
      "Mother-of-pearl buttons",
      "Single-button cuffs",
    ],
    care: "Machine wash at 30°C. Iron while damp.",
    stock: letterSizes([2, 3, 4, 3, 2]),
    images: [
      unsplash(
        "1669059921524-327a4c52cff3",
        "Close crop of a white poplin shirt tucked into light-wash jeans",
        1200,
      ),
    ],
  },
  {
    slug: "cognac-leather-ankle-boot",
    name: "Ankle Boot in Cognac Calfskin",
    categorySlug: "shoes",
    audience: "women",
    priceCents: 79000,
    isNew: true,
    color: "Cognac",
    description:
      "A pull-on ankle boot in burnished calfskin with a stacked block heel and a gently squared toe.",
    details: [
      "Burnished calfskin",
      "45 mm stacked leather heel",
      "Leather lining and sole",
      "Made in Spain",
    ],
    care: "Wipe clean and treat with a neutral leather cream.",
    stock: shoeSizes([1, 2, 2, 2, 1, 1]),
    images: [
      unsplash(
        "1531310197839-ccf54634509e",
        "Cognac leather ankle boots with block heels worn with dark trousers",
        1200,
      ),
    ],
  },
  {
    slug: "cognac-leather-tote",
    name: "Everyday Tote in Cognac Leather",
    categorySlug: "bags",
    audience: "women",
    priceCents: 98000,
    color: "Cognac",
    description:
      "An unstructured tote in full-grain leather that develops a rich patina over time. Large enough for a laptop, with an internal zip pocket.",
    details: [
      "Full-grain vegetable-tanned leather",
      "Internal zip pocket",
      "Fits a 14-inch laptop",
      "Made in Italy",
    ],
    care: "Condition every few months. Keep away from water and direct heat.",
    stock: oneSize(4),
    images: [
      unsplash(
        "1624687943971-e86af76d57de",
        "Cognac full-grain leather tote bag hanging against a white door",
        1200,
      ),
    ],
  },
  {
    slug: "gold-dome-hoop-earrings",
    name: "Dome Hoop Earrings in Gold Vermeil",
    categorySlug: "jewelry",
    audience: "women",
    priceCents: 32000,
    color: "Gold",
    description:
      "Small, weighty hoops with a softly domed profile, in 18k gold vermeil over recycled sterling silver.",
    details: [
      "18k gold vermeil",
      "Recycled sterling silver core",
      "Hinged clicker closure",
      "Sold as a pair",
    ],
    care: "Remove before swimming. Polish with a soft cloth.",
    stock: oneSize(6),
    images: [
      unsplash(
        "1632525230528-ec17c49bc168",
        "Pair of polished gold dome hoop earrings on a white surface",
        1200,
      ),
    ],
  },
  {
    slug: "ivory-double-breasted-overcoat",
    name: "Double-Breasted Overcoat in Ivory Wool",
    categorySlug: "ready-to-wear",
    audience: "men",
    priceCents: 210000,
    isNew: true,
    color: "Ivory",
    description:
      "A double-breasted overcoat in dense ivory wool with peak lapels and a half belt at the back. Cut to layer over tailoring.",
    details: [
      "Virgin wool with a touch of cashmere",
      "Peak lapels",
      "Half belt at the back",
      "Fully lined",
      "Made in Italy",
    ],
    care: "Dry clean only. Brush after wearing.",
    stock: letterSizes([0, 1, 2, 2, 1]),
    images: [
      unsplash(
        "1737508945707-ebdccee97cc5",
        "Man in an ivory double-breasted overcoat and sunglasses on a city street",
        1200,
      ),
    ],
  },
  {
    slug: "cable-knit-wool-sweater",
    name: "Cable-Knit Sweater in Merino Wool",
    categorySlug: "ready-to-wear",
    audience: "men",
    priceCents: 58000,
    isNew: true,
    color: "Bottle green",
    description:
      "A substantial crew-neck sweater with traditional cables, knitted from extra-fine merino for warmth without bulk.",
    details: [
      "Extra-fine merino wool",
      "Traditional cable knit",
      "Crew neck",
      "Ribbed cuffs and hem",
    ],
    care: "Hand wash cold and dry flat.",
    stock: letterSizes([1, 2, 3, 3, 2]),
    images: [
      unsplash(
        "1610901157620-340856d0a50f",
        "Man in a bottle-green cable-knit sweater standing on a wooden dock",
        1200,
      ),
    ],
  },
  {
    slug: "band-collar-linen-shirt",
    name: "Band-Collar Shirt in Washed Linen",
    categorySlug: "ready-to-wear",
    audience: "men",
    priceCents: 36000,
    color: "Ecru",
    description:
      "A lightweight shirt in garment-washed linen with a band collar and a relaxed fit that softens with every wear.",
    details: ["100% washed linen", "Band collar", "Relaxed fit", "Corozo buttons"],
    care: "Machine wash at 30°C. Line dry.",
    stock: letterSizes([1, 3, 4, 3, 1]),
    images: [
      unsplash(
        "1627686011747-74adda3d2343",
        "Man in an ecru band-collar linen shirt with rolled sleeves outdoors",
        1200,
      ),
    ],
  },
  {
    slug: "brown-leather-chelsea-boot",
    name: "Chelsea Boot in Polished Calfskin",
    categorySlug: "shoes",
    audience: "men",
    priceCents: 74000,
    isNew: true,
    color: "Chestnut",
    description:
      "A sleek Chelsea boot in hand-polished calfskin with elasticated side panels and a Goodyear-welted leather sole.",
    details: [
      "Hand-polished calfskin",
      "Elasticated side panels",
      "Goodyear-welted leather sole",
      "Made in Portugal",
    ],
    care: "Use shoe trees. Polish with a matching wax cream.",
    stock: menShoeSizes([1, 2, 3, 2, 1, 1]),
    images: [
      unsplash(
        "1777987601423-f350ac29b3e9",
        "Pair of chestnut leather Chelsea boots resting on a wooden board",
        1200,
      ),
    ],
  },
  {
    slug: "leather-weekender-bag",
    name: "Weekender in Tan Leather",
    categorySlug: "bags",
    audience: "men",
    priceCents: 135000,
    color: "Tan",
    description:
      "A roomy weekend bag in full-grain leather with rolled handles, a detachable shoulder strap and brass hardware.",
    details: [
      "Full-grain leather",
      "Detachable shoulder strap",
      "Solid brass hardware",
      "Cotton canvas lining",
    ],
    care: "Condition regularly. Stuff with paper when stored.",
    stock: oneSize(3),
    images: [
      unsplash(
        "1541336318489-083c7d277b8e",
        "Tan leather weekender bag on an escalator beside a traveller's white trainers",
        1200,
      ),
    ],
  },
  {
    slug: "braided-leather-belt",
    name: "Braided Belt in Calf Leather",
    categorySlug: "bags",
    audience: "men",
    priceCents: 26000,
    color: "Chestnut",
    description:
      "Hand-braided strips of soft calf leather on a full-grain leather tip, with a brushed gunmetal buckle. The weave gives a little stretch for a comfortable fit.",
    details: [
      "Hand-braided calf leather",
      "Full-grain leather tip and keeper",
      "Brushed gunmetal buckle",
      "35 mm wide",
      "Made in Italy",
    ],
    care: "Roll rather than fold. Condition occasionally with a leather balm.",
    stock: [
      { size: "85 cm", quantity: 2 },
      { size: "90 cm", quantity: 3 },
      { size: "95 cm", quantity: 3 },
      { size: "100 cm", quantity: 2 },
    ],
    images: [
      unsplash(
        "1711443982852-b3df5c563448",
        "Chestnut braided leather belt wrapped around a white roll, with a gunmetal buckle",
        1200,
      ),
    ],
  },
  {
    slug: "sculpted-gold-ring",
    name: "Sculpted Ring in Gold Vermeil",
    categorySlug: "jewelry",
    audience: "unisex",
    priceCents: 29000,
    color: "Gold",
    description:
      "A bold, softly faceted ring in 18k gold vermeil, weighty enough to wear on its own.",
    details: [
      "18k gold vermeil",
      "Recycled sterling silver core",
      "Polished finish",
      "Made in Portugal",
    ],
    care: "Remove before washing hands. Polish with a soft cloth.",
    stock: oneSize(5),
    images: [
      unsplash(
        "1724261366524-657929c7e0b2",
        "Hand wearing a chunky sculpted gold ring, resting on a leather bag strap",
        1200,
      ),
    ],
  },
  {
    slug: "white-leather-trainer",
    name: "Trainer in White Leather and Suede",
    categorySlug: "shoes",
    audience: "unisex",
    priceCents: 46000,
    isNew: true,
    color: "White and grey",
    description:
      "A low-profile trainer in smooth white leather with grey suede overlays and a natural gum sole.",
    details: [
      "Leather and suede upper",
      "Natural gum rubber sole",
      "Leather lining",
      "Made in Portugal",
    ],
    care: "Wipe clean. Brush the suede with a soft brush.",
    stock: shoeSizes([2, 2, 3, 3, 2, 2]),
    images: [
      unsplash(
        "1620989928625-08536e746255",
        "Hand holding a white leather trainer with grey suede overlays and a gum sole",
        1200,
      ),
    ],
  },
  {
    slug: "hand-stitched-card-wallet",
    name: "Hand-Stitched Card Wallet",
    categorySlug: "bags",
    audience: "unisex",
    priceCents: 18000,
    color: "Tan",
    description:
      "A slim bifold for cards and a few notes, saddle-stitched by hand from vegetable-tanned leather.",
    details: [
      "Vegetable-tanned leather",
      "Hand saddle-stitched",
      "Four card slots",
      "Note compartment",
    ],
    care: "Condition occasionally with a leather balm.",
    stock: oneSize(8),
    images: [
      unsplash(
        "1628483211662-9bcc692c46dc",
        "Tan hand-stitched leather card wallet on a workbench beside leather tools",
        1200,
      ),
    ],
  },
  {
    slug: "tortoiseshell-acetate-frames",
    name: "Optical Frames in Tortoiseshell Acetate",
    categorySlug: "eyewear",
    audience: "unisex",
    priceCents: 34000,
    color: "Tortoiseshell",
    description:
      "Softly squared frames in hand-polished Italian acetate with gold-tone hinges. Supplied with demo lenses, ready for your prescription.",
    details: [
      "Italian acetate",
      "Five-barrel hinges",
      "Demo lenses included",
      "Comes with a leather case",
    ],
    care: "Clean with the microfibre cloth provided.",
    stock: oneSize(6),
    images: [
      unsplash(
        "1760446031441-65f456460d59",
        "Tortoiseshell acetate optical frames on a neutral background",
        1200,
      ),
    ],
  },

  // The original sample catalog.
  {
    slug: "nappa-leather-biker-jacket",
    name: "Biker Jacket in Nappa Leather",
    categorySlug: "ready-to-wear",
    audience: "men",
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
    audience: "unisex",
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
    audience: "women",
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
    audience: "women",
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
    audience: "unisex",
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
    audience: "women",
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
    audience: "men",
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
    audience: "women",
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
    audience: "unisex",
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
    audience: "unisex",
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
    audience: "women",
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
    audience: "women",
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
    audience: "unisex",
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
