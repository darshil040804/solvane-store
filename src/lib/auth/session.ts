import "server-only";

import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { auth, type Session } from "@/lib/auth";

// Server-side session checks. Protected pages, server actions and route
// handlers call these helpers themselves; src/proxy.ts is only a fast pre-filter.

/** The current session, validated against the database (deduped per request). */
export const getSession = cache(async () =>
  auth.api.getSession({ headers: await headers() }),
);

/** Returns the session, or redirects to sign-in and back to `returnTo` afterwards. */
export async function requireSession(returnTo: string) {
  const session = await getSession();
  if (!session) {
    redirect(`/sign-in?redirectTo=${encodeURIComponent(returnTo)}`);
  }
  return session;
}

/** The admin plugin stores multiple roles comma-separated. */
export function isAdmin(user: Session["user"]) {
  return (user.role ?? "")
    .split(",")
    .map((role) => role.trim())
    .includes("admin");
}

/**
 * For admin pages and actions. Signed-out users are sent to sign-in;
 * signed-in non-admins get a 404 so the admin area isn't advertised.
 */
export async function requireAdmin(returnTo = "/admin") {
  const session = await requireSession(returnTo);
  if (!isAdmin(session.user)) notFound();
  return session;
}

/** Only same-origin paths are allowed as post-auth redirect targets. */
export function safeRedirect(target: unknown, fallback = "/account") {
  return typeof target === "string" &&
    target.startsWith("/") &&
    !target.startsWith("//") &&
    !target.startsWith("/\\")
    ? target
    : fallback;
}
