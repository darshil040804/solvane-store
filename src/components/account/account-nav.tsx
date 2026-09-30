"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/auth/sign-out-button";

export type AccountNavItem = { label: string; href: string };

// Sections stay highlighted on their detail pages (e.g. /account/orders/<id>);
// the overview only matches itself.
function isCurrent(pathname: string, href: string) {
  return pathname === href || (href !== "/account" && pathname.startsWith(`${href}/`));
}

/** Account section navigation: a tab row on small screens, a vertical list from lg. */
export function AccountNav({ items }: { items: AccountNavItem[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="My account">
      <ul className="rail auto-cols-max gap-6 border-b lg:flex lg:flex-col lg:items-start lg:gap-1 lg:border-b-0">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={isCurrent(pathname, item.href) ? "page" : undefined}
              className="tab"
            >
              {item.label}
            </Link>
          </li>
        ))}
        <li>
          <SignOutButton className="tab cursor-pointer disabled:cursor-default" />
        </li>
      </ul>
    </nav>
  );
}
