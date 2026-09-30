"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/auth/sign-out-button";

export type AccountNavItem = { label: string; href: string };

// Sections stay highlighted on their detail pages (e.g. /account/orders/<id>);
// the root section only matches itself.
function isCurrent(pathname: string, href: string, rootHref: string) {
  return pathname === href || (href !== rootHref && pathname.startsWith(`${href}/`));
}

/**
 * Section navigation for the account area (and the admin area, which passes its
 * own label and root): a tab row on small screens, a vertical list from lg.
 */
export function AccountNav({
  items,
  label = "My account",
  rootHref = "/account",
  signOut = true,
}: {
  items: AccountNavItem[];
  label?: string;
  rootHref?: string;
  signOut?: boolean;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label={label}>
      <ul className="rail auto-cols-max gap-6 border-b lg:flex lg:flex-col lg:items-start lg:gap-1 lg:border-b-0">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={isCurrent(pathname, item.href, rootHref) ? "page" : undefined}
              className="tab"
            >
              {item.label}
            </Link>
          </li>
        ))}
        {signOut && (
          <li>
            <SignOutButton className="tab cursor-pointer disabled:cursor-default" />
          </li>
        )}
      </ul>
    </nav>
  );
}
