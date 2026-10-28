import { defineConfig, devices } from "@playwright/test";

// Load the same env files `next dev` reads (.env.local wins over .env), so
// the specs know CODIGO_ACCESO / CODIGO_DOCENTE. Existing variables (e.g. CI
// secrets) are never overwritten. Next 16 allows one dev server per project,
// so a running `npm run dev` is reused and must share these values.
for (const archivo of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(archivo);
  } catch {
    // File not present: fine.
  }
}

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
    { name: "iPhone 13", use: { ...devices["iPhone 13"] } },
    { name: "Pixel 7", use: { ...devices["Pixel 7"] } },
    {
      // Firefox doesn't support isMobile, so emulate a phone-sized viewport only.
      name: "Firefox",
      use: { ...devices["Desktop Firefox"], viewport: { width: 390, height: 844 } },
    },
    // The docente reads reports on a laptop; the whole flow must work there too.
    { name: "Desktop Chrome", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
