// Content pages (services, help, about, legal). Each entry is rendered by
// src/app/(content)/[...page]/page.tsx at its `path`. Solvane is a portfolio
// demo: contact details are fictional and the legal pages are placeholders.

export type PageSection = {
  heading: string;
  paragraphs?: string[];
  list?: string[];
};

export type SitePage = {
  path: string;
  /** Breadcrumb trail between Home and this page. */
  parent?: { label: string; href: string };
  eyebrow: string;
  title: string;
  description: string;
  sections: PageSection[];
  /** Links shown under the content. */
  related?: { label: string; href: string }[];
};

const DEMO_NOTE =
  "Solvane is a portfolio demo. No real orders are fulfilled and no payments are taken.";

const services = { label: "Services", href: "/services" };
const help = { label: "Help", href: "/help" };
const about = { label: "Our story", href: "/about" };
const legal = { label: "Legal", href: "/legal/terms" };

const serviceLinks = [
  { label: "Delivery", href: "/services/delivery" },
  { label: "Returns & exchanges", href: "/services/returns" },
  { label: "Personalization", href: "/services/personalization" },
  { label: "Care & repairs", href: "/services/care" },
];

export const sitePages: SitePage[] = [
  {
    path: "/services",
    eyebrow: "Solvane Services",
    title: "The Art of Care",
    description:
      "From complimentary delivery to lifetime repairs, our client services look after every piece long after it leaves the atelier.",
    sections: [
      {
        heading: "Complimentary delivery",
        paragraphs: [
          "Every order ships free by express courier in our signature box, with tracking from the atelier to your door.",
        ],
      },
      {
        heading: "Returns within 30 days",
        paragraphs: ["Return or exchange any unworn piece within 30 days, free of charge."],
      },
      {
        heading: "Personalization",
        paragraphs: ["Add hot-stamped initials to leather goods to make a piece your own."],
      },
      {
        heading: "Care & repairs",
        paragraphs: [
          "Our artisans clean, restore and repair Solvane pieces so they can be worn for decades.",
        ],
      },
    ],
    related: serviceLinks,
  },
  {
    path: "/services/delivery",
    parent: services,
    eyebrow: "Services",
    title: "Delivery",
    description: "Complimentary express delivery on every order, within the United States.",
    sections: [
      {
        heading: "Timing",
        paragraphs: [
          "Orders placed before 2 pm ET on a business day are dispatched the same day and arrive in 2–4 business days.",
        ],
      },
      {
        heading: "Packaging",
        list: [
          "Signature box with tissue and dust bag",
          "Recyclable outer carton",
          "Gift message on request",
        ],
      },
      { heading: "Please note", paragraphs: [DEMO_NOTE] },
    ],
    related: serviceLinks,
  },
  {
    path: "/services/returns",
    parent: services,
    eyebrow: "Services",
    title: "Returns & exchanges",
    description: "Return or exchange any unworn piece within 30 days, free of charge.",
    sections: [
      {
        heading: "How it works",
        list: [
          "Start a return from your account within 30 days of delivery",
          "Pack the piece with its tags and dust bag",
          "Drop it at any courier point with the prepaid label",
        ],
      },
      {
        heading: "Refunds",
        paragraphs: [
          "Refunds go back to your original payment method within 5 business days of the return arriving.",
        ],
      },
      { heading: "Please note", paragraphs: [DEMO_NOTE] },
    ],
    related: serviceLinks,
  },
  {
    path: "/services/personalization",
    parent: services,
    eyebrow: "Services",
    title: "Personalization",
    description: "Hot-stamped initials on leather goods, applied by hand in our atelier.",
    sections: [
      {
        heading: "What we can personalize",
        list: ["Totes and weekenders", "Card wallets", "Leather straps"],
      },
      {
        heading: "Details",
        paragraphs: [
          "Choose up to three initials in blind, gold or silver foil. Personalized pieces ship within five business days.",
        ],
      },
    ],
    related: serviceLinks,
  },
  {
    path: "/services/care",
    parent: services,
    eyebrow: "Services",
    title: "Care & repairs",
    description: "Cleaning, restoration and repairs by the artisans who made your piece.",
    sections: [
      {
        heading: "Leather and shoes",
        paragraphs: [
          "Resoling, recolouring, edge painting and hardware replacement for bags and shoes.",
        ],
      },
      {
        heading: "Ready-to-wear",
        paragraphs: ["Invisible mending for knitwear and relining for coats and jackets."],
      },
      {
        heading: "Everyday care",
        list: [
          "Store leather in its dust bag, away from direct sunlight",
          "Hang coats on shaped hangers",
          "Fold knitwear rather than hanging it",
        ],
      },
    ],
    related: serviceLinks,
  },
  {
    path: "/contact",
    eyebrow: "Client services",
    title: "Contact us",
    description: "Our client advisors are here to help with orders, sizing and care.",
    sections: [
      {
        heading: "Get in touch",
        list: [
          "Email: clientservices@solvane.example",
          "Phone: +1 (212) 555-0142",
          "Monday to Saturday, 9 am – 7 pm ET",
        ],
      },
      { heading: "Please note", paragraphs: [`${DEMO_NOTE} These contact details are fictional.`] },
    ],
    related: [
      { label: "Help & FAQ", href: "/help" },
      { label: "Track an order", href: "/account/orders" },
      { label: "Size guide", href: "/help/sizing" },
    ],
  },
  {
    path: "/help",
    eyebrow: "Help",
    title: "Frequently asked questions",
    description: "Quick answers about orders, delivery, returns and your account.",
    sections: [
      {
        heading: "How do I track my order?",
        paragraphs: ["Sign in and open My account, then Orders, to see every order and its status."],
      },
      {
        heading: "Can I pay with a real card?",
        paragraphs: [
          "No. Payments run in Stripe test mode. Use card 4242 4242 4242 4242 with any future expiry and any CVC.",
        ],
      },
      {
        heading: "How do I save a piece for later?",
        paragraphs: ["Tap the heart on any piece. Saved pieces appear in your wishlist."],
      },
      {
        heading: "What is your returns policy?",
        paragraphs: ["Unworn pieces can be returned or exchanged within 30 days, free of charge."],
      },
    ],
    related: [
      { label: "Size guide", href: "/help/sizing" },
      { label: "Delivery", href: "/services/delivery" },
      { label: "Contact us", href: "/contact" },
    ],
  },
  {
    path: "/help/sizing",
    parent: help,
    eyebrow: "Help",
    title: "Size guide",
    description: "How our sizes compare, so you can choose with confidence.",
    sections: [
      {
        heading: "Ready-to-wear",
        list: ["XS: US 0–2", "S: US 4–6", "M: US 8–10", "L: US 12–14", "XL: US 16"],
      },
      {
        heading: "Shoes (EU)",
        list: ["36: US 6", "37: US 7", "38: US 8", "39: US 9", "40: US 10 / men's 7", "41–45: men's 8–12"],
      },
      {
        heading: "Between sizes?",
        paragraphs: ["Choose the larger size for coats and knitwear, and your usual size for shoes."],
      },
    ],
    related: [{ label: "Contact us", href: "/contact" }],
  },
  {
    path: "/about",
    eyebrow: "About Solvane",
    title: "Our story",
    description: "A Parisian house making pieces designed to be worn for years.",
    sections: [
      {
        heading: "Designed in Paris",
        paragraphs: [
          "Solvane began in a small studio in the Marais with a simple idea: fewer, better pieces, made with care and meant to last.",
        ],
      },
      {
        heading: "Made in Europe",
        paragraphs: [
          "Every piece is made by hand in small family ateliers in Italy, Portugal, Spain and France.",
        ],
      },
    ],
    related: [
      { label: "Craftsmanship", href: "/about/craftsmanship" },
      { label: "Sustainability", href: "/about/sustainability" },
      { label: "Careers", href: "/careers" },
    ],
  },
  {
    path: "/about/craftsmanship",
    parent: about,
    eyebrow: "About Solvane",
    title: "Craftsmanship",
    description: "Slow, careful making by artisans who have mastered their craft.",
    sections: [
      {
        heading: "Materials",
        paragraphs: [
          "Full-grain and vegetable-tanned leathers, virgin wools and silks chosen to age beautifully.",
        ],
      },
      {
        heading: "Hands",
        paragraphs: ["Saddle stitching, hand-polished finishes and Goodyear-welted soles."],
      },
    ],
    related: [{ label: "Our story", href: "/about" }],
  },
  {
    path: "/about/sustainability",
    parent: about,
    eyebrow: "About Solvane",
    title: "Sustainability",
    description: "Making less, and making it last.",
    sections: [
      {
        heading: "Our approach",
        list: [
          "Small production runs to avoid overstock",
          "Recycled sterling silver in our jewelry",
          "Lifetime repairs to keep pieces in use",
        ],
      },
    ],
    related: [{ label: "Care & repairs", href: "/services/care" }],
  },
  {
    path: "/careers",
    eyebrow: "About Solvane",
    title: "Careers",
    description: "Join a small team that cares about how things are made.",
    sections: [
      {
        heading: "Open roles",
        paragraphs: ["There are no open roles at the moment. Solvane is a portfolio demo."],
      },
    ],
    related: [{ label: "Our story", href: "/about" }],
  },
  {
    path: "/legal/terms",
    parent: legal,
    eyebrow: "Legal",
    title: "Terms of sale",
    description: "Placeholder terms for this portfolio demo.",
    sections: [
      {
        heading: "Demo only",
        paragraphs: [
          `${DEMO_NOTE} This page is a placeholder and does not form a contract.`,
        ],
      },
    ],
    related: [
      { label: "Privacy policy", href: "/legal/privacy" },
      { label: "Accessibility", href: "/legal/accessibility" },
    ],
  },
  {
    path: "/legal/privacy",
    parent: legal,
    eyebrow: "Legal",
    title: "Privacy policy",
    description: "How this demo handles the little data it stores.",
    sections: [
      {
        heading: "What we store",
        list: [
          "Your name, email and a hashed password, for your account",
          "Your bag, wishlist and orders",
          "Shipping details entered at Stripe Checkout (test mode)",
        ],
      },
      {
        heading: "Demo only",
        paragraphs: [`${DEMO_NOTE} Please don't enter real personal or payment details.`],
      },
    ],
    related: [{ label: "Terms of sale", href: "/legal/terms" }],
  },
  {
    path: "/legal/accessibility",
    parent: legal,
    eyebrow: "Legal",
    title: "Accessibility",
    description: "Our commitment to a store everyone can use.",
    sections: [
      {
        heading: "What we aim for",
        list: [
          "Keyboard access to every control",
          "Text alternatives for product images",
          "Readable contrast and responsive layouts",
        ],
      },
      {
        heading: "Feedback",
        paragraphs: ["If something is hard to use, please let us know through the contact page."],
      },
    ],
    related: [{ label: "Contact us", href: "/contact" }],
  },
];

export function getSitePage(path: string) {
  return sitePages.find((page) => page.path === path) ?? null;
}
