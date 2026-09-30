import type { Metadata } from "next";
import Link from "next/link";
import { ProductForm } from "@/components/admin/product-form";
import { listCategoryOptions } from "@/lib/admin/catalog";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "New product | Admin | Solvane",
  robots: { index: false },
};

export default async function NewProductPage() {
  await requireAdmin("/admin/products/new");
  const categories = await listCategoryOptions();

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-3">
        <Link href="/admin/products" className="eyebrow link-quiet self-start text-ink-muted">
          All products
        </Link>
        <h1 className="text-heading">New product</h1>
      </div>
      <ProductForm mode="create" categories={categories} />
    </div>
  );
}
