import type { Metadata } from "next";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { isAdmin, requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Admin | Solvane",
  robots: { index: false },
};

const dateFormat = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

export default async function AdminPage() {
  const { user } = await requireAdmin();
  // The admin plugin also checks the caller's role on this endpoint.
  const { users, total } = await auth.api.listUsers({
    query: { limit: 50, sortBy: "createdAt", sortDirection: "desc" },
    headers: await headers(),
  });

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-heading">Customers</h1>
        <p className="text-body-sm text-ink-muted">
          Signed in as {user.email} · {total} {total === 1 ? "account" : "accounts"}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] text-left text-body-sm">
          <thead className="border-b text-ink-muted">
            <tr>
              <th scope="col" className="py-3 pr-6 font-normal">Name</th>
              <th scope="col" className="py-3 pr-6 font-normal">Email</th>
              <th scope="col" className="py-3 pr-6 font-normal">Role</th>
              <th scope="col" className="py-3 font-normal">Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((row) => (
              <tr key={row.id} className="border-b">
                <td className="py-3 pr-6">{row.name}</td>
                <td className="py-3 pr-6">{row.email}</td>
                <td className="py-3 pr-6">{isAdmin(row) ? "Admin" : "Customer"}</td>
                <td className="py-3 text-ink-muted">
                  {dateFormat.format(new Date(row.createdAt))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
