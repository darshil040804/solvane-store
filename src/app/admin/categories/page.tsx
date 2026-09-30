import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Categories | Admin | Solvane",
  robots: { index: false },
};

export default async function AdminCategoriesPage() {
  await requireAdmin("/admin/categories");

  return (
    <div className="flex flex-col gap-10">
      <h1 className="text-heading">Categories</h1>
      <div className="flex flex-col items-start gap-6 border-t pt-8">
        <p className="text-body text-ink-muted">Category management isn&apos;t available yet.</p>
      </div>
    </div>
  );
}
