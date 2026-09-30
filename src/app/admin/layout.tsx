import type { ReactNode } from "react";
import { AccountNav, type AccountNavItem } from "@/components/account/account-nav";
import { getSession, isAdmin } from "@/lib/auth/session";

const items: AccountNavItem[] = [
  { label: "Customers", href: "/admin" },
  { label: "Products", href: "/admin/products" },
  { label: "Inventory", href: "/admin/inventory" },
  { label: "Categories", href: "/admin/categories" },
  { label: "Orders", href: "/admin/orders" },
];

// Shared shell for /admin/*. Access is enforced by each page's requireAdmin()
// and each action's getAdminSession(); the session here only decides whether to
// draw the shell. Non-admins get the bare page, whose guard redirects or 404s.
// Don't add a loading.tsx under /admin: streaming would turn that 404 into a 200.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session || !isAdmin(session.user)) return children;

  return (
    <main className="container-content section flex-1 lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-16 xl:gap-24">
      <aside className="mb-10 flex flex-col gap-4 lg:mb-0">
        <p className="eyebrow text-ink-muted">Admin</p>
        <AccountNav items={items} label="Admin" rootHref="/admin" signOut={false} />
      </aside>
      <div className="min-w-0">{children}</div>
    </main>
  );
}
