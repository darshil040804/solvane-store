import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { StockStatus } from "@/components/stock-status";
import { listAdminProducts } from "@/lib/admin/catalog";
import { requireAdmin } from "@/lib/auth/session";
import { formatPrice } from "@/lib/format";

export const metadata: Metadata = {
  title: "Products | Admin | Solvane",
  robots: { index: false },
};

export default async function AdminProductsPage() {
  await requireAdmin("/admin/products");
  const products = await listAdminProducts();

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-heading">Products</h1>
          <p className="text-body-sm text-ink-muted">
            {products.length} {products.length === 1 ? "product" : "products"}
          </p>
        </div>
        <Link href="/admin/products/new" className="btn btn-primary btn-sm">
          New product
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="flex flex-col items-start gap-6 border-t pt-8">
          <p className="text-body text-ink-muted">There are no products yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] text-left text-body-sm">
            <thead className="border-b text-ink-muted">
              <tr>
                <th scope="col" className="py-3 pr-6 font-normal">Product</th>
                <th scope="col" className="py-3 pr-6 font-normal">Category</th>
                <th scope="col" className="py-3 pr-6 text-right font-normal">Price</th>
                <th scope="col" className="py-3 font-normal">Availability</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const total = product.stock.reduce((sum, row) => sum + row.quantity, 0);
                const image = product.images[0];
                return (
                  <tr key={product.id} className="border-b">
                    <td className="py-3 pr-6">
                      <div className="flex items-center gap-4">
                        <div className="media aspect-product w-10 shrink-0">
                          {image && (
                            <Image src={image.url} alt="" fill sizes="2.5rem" className="object-cover" />
                          )}
                        </div>
                        <div className="flex min-w-0 flex-col gap-1">
                          <Link href={`/admin/products/${product.id}`} className="link">
                            {product.name}
                          </Link>
                          <span className="text-caption text-ink-muted">{product.slug}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-6">{product.category.name}</td>
                    <td className="py-3 pr-6 text-right tabular-nums">
                      {formatPrice(product.priceCents)}
                    </td>
                    <td className="py-3">
                      <div className="flex flex-col gap-1">
                        <StockStatus stock={total} />
                        <span className="text-caption text-ink-muted">
                          {total} available
                          {product.stock.length > 1 && ` across ${product.stock.length} sizes`}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
