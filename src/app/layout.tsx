import type { Metadata, Viewport } from "next";
import { Jost } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

// Geometric sans used for everything; mapped to --font-sans in globals.css.
const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Solvane | Ready-to-Wear, Leather Goods & Accessories",
  description:
    "Discover Solvane ready-to-wear, bags, shoes and jewelry, designed in Paris and made by hand in European ateliers.",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${jost.variable} h-full [&:has(dialog[open])]:overflow-hidden`}
    >
      <body className="min-h-full flex flex-col bg-surface text-ink">
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
