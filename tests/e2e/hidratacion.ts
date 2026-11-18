import type { Page } from "@playwright/test";

/**
 * Waits until React has hydrated `selector` (it attaches a `__reactFiber$…`
 * key to every DOM node it owns). Keyboard/focus interactions sent before
 * that are lost, and WebKit hydrates noticeably later than Chromium.
 */
export async function esperarHidratacion(page: Page, selector = "main") {
  await page.waitForFunction((sel) => {
    const nodo = document.querySelector(sel);
    return nodo !== null && Object.keys(nodo).some((clave) => clave.startsWith("__reactFiber$"));
  }, selector);
}

/**
 * The rating screen renders inside a <Suspense> boundary that hydrates after
 * <main>, so waiting on <main> isn't enough: under load WebKit can drop the
 * first click on a level. The boundary hydrates as a unit, so its first
 * radiogroup being hydrated means every control is.
 */
export async function esperarCalificacion(page: Page) {
  await esperarHidratacion(page, '[role="radiogroup"]');
}

/**
 * Report pages: opens "Ver gráficos detallados" (PRD §11 v1.2) and waits for
 * its Recharts charts, which only load once that section is open. The
 * toggle sits in a Suspense boundary, so wait for it to hydrate first.
 */
export async function abrirGraficosDetallados(page: Page) {
  await esperarHidratacion(page, "h2 > button[aria-expanded]");
  await page.getByRole("button", { name: "Ver gráficos detallados" }).click();
  await page.locator("figure svg.recharts-surface").first().waitFor({ state: "visible" });
}
