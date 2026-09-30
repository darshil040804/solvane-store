import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Orders | Admin | Solvane",
  robots: { index: false },
};

export default async function AdminOrdersPage() {
  await requireAdmin("/admin/orders");

  return (
    <div className="flex flex-col gap-10">
      <h1 className="text-heading">Orders</h1>
      <div className="flex flex-col items-start gap-6 border-t pt-8">
        <p className="text-body text-ink-muted">Order management isn&apos;t available yet.</p>
      </div>
    </div>
  );
}
