import type { ReactNode } from "react";

// Shared frame for the sign-in and sign-up pages.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="container-narrow section flex flex-1 flex-col items-center">
      <div className="flex w-full max-w-sm flex-col gap-8">{children}</div>
    </main>
  );
}
