import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins/admin";
import { db } from "@/db";
import * as schema from "@/db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
    // The neon-http driver has no interactive transactions.
    transaction: false,
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    autoSignIn: true,
  },
  // Sessions live in the database; the cookie persists across browser restarts.
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // extend the expiry at most once a day
  },
  plugins: [
    // Adds user.role (not settable at sign-up) and server-enforced /admin/* endpoints.
    admin({ defaultRole: "user", adminRoles: ["admin"] }),
    // nextCookies must be the last plugin
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
