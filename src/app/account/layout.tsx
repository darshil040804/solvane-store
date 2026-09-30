import type { ReactNode } from "react";
import { AccountNav, type AccountNavItem } from "@/components/account/account-nav";
import { getSession, isAdmin } from "@/lib/auth/session";

// Shared shell for /account/*. Access is enforced by each page's
// requireSession(); the session here only decides which links to show.
export default async function AccountLayout({ children }: { children: ReactNode }) {
  const session = await getSession();

  const items: AccountNavItem[] = [
    { label: "Account overview", href: "/account" },
    { label: "Orders", href: "/account/orders" },
  ];
  if (session && isAdmin(session.user)) items.push({ label: "Admin", href: "/admin" });

  return (
    <main className="container-content section flex-1 lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-16 xl:gap-24">
      <aside className="mb-10 flex flex-col gap-4 lg:mb-0">
        <p className="eyebrow text-ink-muted">My account</p>
        <AccountNav items={items} />
      </aside>
      <div className="max-w-3xl">{children}</div>
    </main>
  );
}
