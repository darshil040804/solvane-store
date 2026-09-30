import type { FullConfig } from "@playwright/test";
import {
  ADMIN_EMAIL,
  deleteFixtureProducts,
  deleteTestUsers,
  PASSWORD,
  sql,
} from "./support";

// Creates the admin account through the real sign-up endpoint, then promotes
// it the same way `npm run auth:make-admin` does.
export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL!;
  const db = sql();
  await deleteTestUsers();
  await deleteFixtureProducts();

  const response = await fetch(`${baseURL}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: baseURL },
    body: JSON.stringify({ name: "E2E Admin", email: ADMIN_EMAIL, password: PASSWORD }),
  });
  if (!response.ok) {
    throw new Error(`Admin sign-up failed: ${response.status} ${await response.text()}`);
  }
  await db`update "user" set role = 'admin' where email = ${ADMIN_EMAIL}`;
}
