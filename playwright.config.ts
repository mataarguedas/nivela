import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig, devices } from "@playwright/test";

// Load the same env files `next dev` reads (.env.local wins over .env), so
// the specs know CODIGO_DOCENTE / E2E_CONTRASENA. Existing variables (e.g. CI
// secrets) are never overwritten. Next 16 allows one dev server per project,
// so a running `npm run dev` is reused and must share these values.
for (const archivo of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(archivo);
  } catch {
    // File not present: fine.
  }
}

// macOS 26+ denies one app access to another app's data, and Firefox reads
// `~/Library/Application Support/Firefox` at startup even when it is given
// `-profile`. On a Mac that has Firefox installed, Playwright's own build
// dies there with "Could not find profile folder" and no test can run.
// CFFIXED_USER_HOME gives it an empty home of its own, so it never looks at
// the installed Firefox's data. Only macOS needs it; CI can set its own.
const hogarFirefox =
  process.platform === "darwin"
    ? { CFFIXED_USER_HOME: process.env.CFFIXED_USER_HOME ?? mkdtempSync(join(tmpdir(), "nivela-firefox-")) }
    : {};

const ADMIN = /admin\.spec\.ts$/;
const PORT = 3000;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  // Compiles every route before the tests; see the note in precalentar.ts.
  globalSetup: "./tests/e2e/precalentar.ts",
  fullyParallel: true,
  // The default (half the CPU cores) launches 8 browsers here, and together
  // with Turbopack's first compiles that exhausted memory and crashed the dev
  // server mid-run ("JavaScript heap out of memory"). 4 is stable and fast.
  workers: process.env.CI ? 1 : 4,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    locale: "es-CR",
    trace: "on-first-retry",
  },
  projects: [
    { name: "iPhone 13", testIgnore: ADMIN, use: { ...devices["iPhone 13"] } },
    { name: "Pixel 7", testIgnore: ADMIN, use: { ...devices["Pixel 7"] } },
    {
      // Firefox doesn't support isMobile, so emulate a phone-sized viewport only.
      name: "Firefox",
      testIgnore: ADMIN,
      use: {
        ...devices["Desktop Firefox"],
        viewport: { width: 390, height: 844 },
        launchOptions: { env: { ...process.env, ...hogarFirefox } },
      },
    },
    // The docente reads reports on a laptop; the whole flow must work there too.
    { name: "Desktop Chrome", testIgnore: ADMIN, use: { ...devices["Desktop Chrome"] } },
    // admin.spec renames the shared participant list every other spec reads,
    // so it runs once, after all of them (and restores the list).
    {
      name: "Admin",
      testMatch: ADMIN,
      dependencies: ["iPhone 13", "Pixel 7", "Firefox", "Desktop Chrome"],
      use: { ...devices["iPhone 13"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
