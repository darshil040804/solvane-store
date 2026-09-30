import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

// Same env loading as drizzle.config.ts. Point DATABASE_URL at a Neon dev
// branch: the tests create accounts (…@e2e.solvane.test) and delete them after.
config({ path: ".env.local" });
config();

const baseURL = "http://localhost:3000";

export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  fullyParallel: true,
  // Most tests sign up a fresh account, and password hashing is CPU-heavy; more
  // workers than this overload the single dev server and cause timeouts.
  workers: 4,
  forbidOnly: !!process.env.CI,
  reporter: "list",
  use: { baseURL, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "npm run dev",
    url: `${baseURL}/api/auth/ok`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
