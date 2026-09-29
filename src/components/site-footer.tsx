import Link from "next/link";
import { NewsletterForm } from "@/components/newsletter-form";

const footerColumns = [
  {
    title: "Help",
    links: [
      { label: "Contact us", href: "/contact" },
      { label: "FAQ", href: "/help" },
      { label: "Track an order", href: "/account/orders" },
      { label: "Size guide", href: "/help/sizing" },
    ],
  },
  {
    title: "Services",
    links: [
      { label: "Delivery", href: "/services/delivery" },
      { label: "Returns & exchanges", href: "/services/returns" },
      { label: "Personalization", href: "/services/personalization" },
      { label: "Care & repairs", href: "/services/care" },
    ],
  },
  {
    title: "About Solvane",
    links: [
      { label: "Our story", href: "/about" },
      { label: "Craftsmanship", href: "/about/craftsmanship" },
      { label: "Sustainability", href: "/about/sustainability" },
      { label: "Careers", href: "/careers" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms of sale", href: "/legal/terms" },
      { label: "Privacy policy", href: "/legal/privacy" },
      { label: "Accessibility", href: "/legal/accessibility" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="container-content section grid gap-12 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-20">
        <div className="flex flex-col gap-4">
          <h2 className="text-title">Sign up for Solvane updates</h2>
          <p className="max-w-sm text-body text-ink-muted">
            Be the first to hear about new collections, private events and
            services.
          </p>
          <div className="mt-2 max-w-md">
            <NewsletterForm />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
          {footerColumns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h2 className="eyebrow mb-4 text-ink-muted">{column.title}</h2>
              <ul className="flex flex-col gap-2.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="link-quiet text-body-sm">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>

      <div className="container-content flex flex-col items-center gap-3 border-t py-8 text-center md:flex-row md:justify-between md:text-left">
        <Link
          href="/"
          className="text-title tracking-[0.35em] uppercase"
          aria-label="Solvane home"
        >
          Solvane
        </Link>
        <p className="text-caption text-ink-muted">
          United States (USD) · © {new Date().getFullYear()} Solvane
        </p>
      </div>
    </footer>
  );
}
