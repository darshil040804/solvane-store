import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "My account | Solvane",
  robots: { index: false },
};

const memberSince = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });

export default async function AccountPage() {
  const { user } = await requireSession("/account");

  const details = [
    { label: "Name", value: user.name },
    { label: "Email", value: user.email },
    { label: "Member since", value: memberSince.format(new Date(user.createdAt)) },
  ];

  return (
    <div className="flex flex-col gap-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-heading">Welcome, {user.name}</h1>
        <p className="text-body text-ink-muted">
          Your account information and sign-in details.
        </p>
      </div>

      <section aria-labelledby="personal-information" className="flex flex-col gap-4">
        <h2 id="personal-information" className="text-title">
          Personal information
        </h2>
        <dl className="border-t">
          {details.map((detail) => (
            <div
              key={detail.label}
              className="flex flex-col gap-1 border-b py-4 text-body-sm sm:grid sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-6"
            >
              <dt className="text-ink-muted">{detail.label}</dt>
              <dd className="break-words">{detail.value}</dd>
            </div>
          ))}
        </dl>
        <p className="text-caption text-ink-muted">
          To change your name or email, please contact client services.
        </p>
      </section>

      <section
        aria-labelledby="client-services"
        className="flex flex-col items-start gap-3 bg-surface-muted p-6 md:p-8"
      >
        <h2 id="client-services" className="text-title">
          Client services
        </h2>
        <p className="max-w-md text-body text-ink-muted">
          Our client advisors can help with your account, sizing and care, by
          email or phone.
        </p>
        <Link href="/contact" className="link-cta mt-1 text-body-sm">
          Contact us
        </Link>
      </section>
    </div>
  );
}
