import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AvailabilityEditor } from "@/components/admin/availability-editor";
import { ProductForm, type ProductFormValues } from "@/components/admin/product-form";
import { StockStatus } from "@/components/stock-status";
import { isId } from "@/lib/admin/action";
import { type AdminProduct, getAdminProduct, listCategoryOptions } from "@/lib/admin/catalog";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Edit product | Admin | Solvane",
  robots: { index: false },
};

/** Stored cents back to what an admin would type: 1250 or 199.99. */
function priceInput(cents: number) {
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
}

function formValues(product: AdminProduct): ProductFormValues {
  return {
    name: product.name,
    slug: product.slug,
    categoryId: product.categoryId,
    price: priceInput(product.priceCents),
    color: product.color ?? "",
    description: product.description,
    details: product.details.join("\n"),
    care: product.care,
    isNew: product.isNew,
    images: product.images.map(({ url, alt }) => ({ url, alt })),
  };
}

export default async function EditProductPage(props: PageProps<"/admin/products/[id]">) {
  const { id } = await props.params;
  await requireAdmin(`/admin/products/${encodeURIComponent(id)}`);
  if (!isId(id)) notFound();

  const [product, categories] = await Promise.all([getAdminProduct(id), listCategoryOptions()]);
  if (!product) notFound();
  const total = product.stock.reduce((sum, row) => sum + row.quantity, 0);

  return (
    <div className="flex flex-col gap-12">
      <div className="flex flex-col gap-3">
        <Link href="/admin/products" className="eyebrow link-quiet self-start text-ink-muted">
          All products
        </Link>
        <h1 className="text-heading">{product.name}</h1>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-body-sm">
          <StockStatus stock={total} />
          <Link href={`/products/${product.slug}`} className="link">
            View in store
          </Link>
        </div>
      </div>

      <section aria-labelledby="availability-title" className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h2 id="availability-title" className="text-title">
            Availability
          </h2>
          <p className="max-w-2xl text-body-sm text-ink-muted">
            &ldquo;Available to sell&rdquo; excludes units held by checkouts in progress; held
            units return automatically if those checkouts don&apos;t complete. Set a size to 0
            to show it as sold out.
          </p>
        </div>
        <AvailabilityEditor
          productId={product.id}
          rows={product.stock.map(({ id, size, quantity, held }) => ({ id, size, quantity, held }))}
        />
      </section>

      <ProductForm
        mode="edit"
        productId={product.id}
        categories={categories}
        initial={formValues(product)}
      />
    </div>
  );
}
