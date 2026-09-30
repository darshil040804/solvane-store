import type { Metadata } from "next";
import Link from "next/link";
import { StockAdjuster } from "@/components/admin/stock-adjuster";
import { SearchIcon } from "@/components/icons";
import { StockStatus } from "@/components/stock-status";
import { listInventory } from "@/lib/admin/catalog";
import {
  type InventoryFilters,
  type InventoryStatus,
  parseInventoryFilters,
} from "@/lib/admin/product-input";
import { requireAdmin } from "@/lib/auth/session";
import { LOW_STOCK_THRESHOLD } from "@/lib/format";

export const metadata: Metadata = {
  title: "Inventory | Admin | Solvane",
  robots: { index: false },
};

const statusTabs: { status: InventoryStatus; label: string }[] = [
  { status: "all", label: "All" },
  { status: "low", label: "Low stock" },
  { status: "out", label: "Out of stock" },
];

function inventoryHref({ q, status }: InventoryFilters) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (status !== "all") params.set("status", status);
  const query = params.toString();
  return query ? `/admin/inventory?${query}` : "/admin/inventory";
}

export default async function InventoryPage(props: PageProps<"/admin/inventory">) {
  await requireAdmin("/admin/inventory");
  const filters = parseInventoryFilters(await props.searchParams);
  const rows = await listInventory(filters);

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-heading">Inventory</h1>
        <p className="max-w-2xl text-body-sm text-ink-muted">
          &ldquo;Available&rdquo; is what customers can buy now. &ldquo;In checkout&rdquo; is held
          by checkouts in progress and returns automatically if they don&apos;t complete. Adjust
          by the number of units received or removed, like +5 or -2. Low stock means{" "}
          {LOW_STOCK_THRESHOLD} or fewer available.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        <form method="get" action="/admin/inventory" role="search" className="flex max-w-md gap-2">
          <label htmlFor="inventory-search" className="sr-only">
            Search products
          </label>
          <input
            id="inventory-search"
            type="search"
            name="q"
            defaultValue={filters.q}
            placeholder="Search by product name or slug"
            className="field"
          />
          {filters.status !== "all" && <input type="hidden" name="status" value={filters.status} />}
          <button type="submit" className="btn btn-secondary shrink-0 px-5">
            <SearchIcon />
            <span className="sr-only">Search</span>
          </button>
        </form>

        <nav aria-label="Stock status">
          <ul className="rail auto-cols-max gap-6 border-b">
            {statusTabs.map(({ status, label }) => (
              <li key={status}>
                <Link
                  href={inventoryHref({ q: filters.q, status })}
                  aria-current={filters.status === status ? "page" : undefined}
                  className="tab"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-start gap-6 border-t pt-8">
          <p className="text-body text-ink-muted">No sizes match these filters.</p>
          {(filters.q || filters.status !== "all") && (
            <Link href="/admin/inventory" className="btn btn-secondary">
              Clear filters
            </Link>
          )}
        </div>
      ) : (
        // `relative` keeps the visually hidden labels inside the scroll area; without
        // it they're positioned against the page and widen it on small screens.
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[52rem] text-left text-body-sm">
            <caption className="sr-only">
              Stock by product and size, {rows.length} {rows.length === 1 ? "row" : "rows"}
            </caption>
            <thead className="border-b text-ink-muted">
              <tr>
                <th scope="col" className="py-3 pr-6 font-normal">Product</th>
                <th scope="col" className="py-3 pr-6 font-normal">Size</th>
                <th scope="col" className="py-3 pr-6 text-right font-normal">Available</th>
                <th scope="col" className="py-3 pr-6 text-right font-normal">In checkout</th>
                <th scope="col" className="py-3 pr-6 text-right font-normal">On hand</th>
                <th scope="col" className="py-3 pr-6 font-normal">Status</th>
                <th scope="col" className="py-3 font-normal">Adjust</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b align-top">
                  <td className="py-4 pr-6">
                    <div className="flex flex-col gap-1">
                      <Link href={`/admin/products/${row.productId}`} className="link">
                        {row.productName}
                      </Link>
                      <span className="text-caption text-ink-muted">{row.categoryName}</span>
                    </div>
                  </td>
                  <td className="py-4 pr-6">{row.size}</td>
                  <td className="py-4 pr-6 text-right tabular-nums" data-testid="available">
                    {row.quantity}
                  </td>
                  <td className="py-4 pr-6 text-right tabular-nums text-ink-muted" data-testid="held">
                    {row.held}
                  </td>
                  <td className="py-4 pr-6 text-right tabular-nums" data-testid="on-hand">
                    {row.quantity + row.held}
                  </td>
                  <td className="py-4 pr-6">
                    <StockStatus stock={row.quantity} />
                  </td>
                  <td className="py-2">
                    <StockAdjuster stockId={row.id} label={`${row.size} of ${row.productName}`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
