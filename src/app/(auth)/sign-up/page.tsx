import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { getSession, safeRedirect } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Create an account | Solvane",
  robots: { index: false },
};

export default async function SignUpPage(props: PageProps<"/sign-up">) {
  const { redirectTo } = await props.searchParams;
  const target = safeRedirect(redirectTo);
  if (await getSession()) redirect(target);

  return (
    <>
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="eyebrow text-ink-muted">My account</p>
        <h1 className="text-heading">Create an account</h1>
      </div>

      <AuthForm mode="sign-up" redirectTo={target} />

      <p className="text-center text-body-sm text-ink-muted">
        Already have an account?{" "}
        <Link
          href={`/sign-in?redirectTo=${encodeURIComponent(target)}`}
          className="link text-ink"
        >
          Sign in
        </Link>
      </p>
    </>
  );
}
