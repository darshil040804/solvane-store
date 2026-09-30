// Grants the admin role to an existing account:
//   npm run auth:make-admin -- someone@example.com
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Same env loading as seed.ts; importing "@/db" would throw before the env is loaded.
config({ path: ".env.local" });
config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const db = drizzle({ client: neon(process.env.DATABASE_URL), schema });

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) throw new Error("Usage: npm run auth:make-admin -- <email>");

  const updated = await db
    .update(schema.user)
    .set({ role: "admin" })
    .where(eq(schema.user.email, email))
    .returning({ id: schema.user.id });

  if (updated.length === 0) {
    throw new Error(`No account found for ${email}. Sign up first.`);
  }
  console.log(`${email} is now an admin.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
