import type { Page } from "@playwright/test";

/**
 * Answers GET /api/evaluaciones with "nothing sent", so specs about local
 * drafts see the same statuses whatever the dev database holds (the seed
 * sends every evaluator × participant). POSTs still reach the server.
 */
export async function sinEnviosEnServidor(page: Page) {
  await page.route(/\/api\/evaluaciones(\?|$)/, async (ruta) => {
    if (ruta.request().method() !== "GET") return ruta.fallback();
    await ruta.fulfill({ json: { evaluaciones: [] } });
  });
}
