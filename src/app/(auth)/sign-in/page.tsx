import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { getSession, safeRedirect } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Sign in | Solvane",
  robots: { index: false },
};

export default async function SignInPage(props: PageProps<"/sign-in">) {
  const { redirectTo } = await props.searchParams;
  const target = safeRedirect(redirectTo);
  if (await getSession()) redirect(target);

  return (
    <>
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="eyebrow text-ink-muted">My account</p>
        <h1 className="text-heading">Sign in</h1>
      </div>

      <AuthForm mode="sign-in" redirectTo={target} />

      <p className="text-center text-body-sm text-ink-muted">
        New to Solvane?{" "}
        <Link
          href={`/sign-up?redirectTo=${encodeURIComponent(target)}`}
          className="link text-ink"
        >
          Create an account
        </Link>
      </p>
    </>
  );
}
