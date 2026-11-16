import { expect, test, type Page } from "@playwright/test";
import { esperarCalificacion, esperarHidratacion } from "./hidratacion";
import { iniciarSesion } from "./sesion";
import { sinEnviosEnServidor } from "./servidor";

// "Volver" in the nav (PRD §12 Nav, FR-18, §15.10): always the logical
// parent, never the browser history.

const CLAVE_EVALUADOR = "nivela:v1:evaluador:adaptabilidad";
const CLAVE_BORRADOR = "nivela:v1:adaptabilidad:jimena-salgado";

function volver(page: Page) {
  return page.getByRole("navigation", { name: "Navegación principal" }).getByRole("link", { name: /^Volver a / });
}

async function elegirEvaluadora(page: Page) {
  await page.goto("/");
  await page.evaluate((clave) => localStorage.setItem(clave, "jimena-salgado"), CLAVE_EVALUADOR);
}

test.describe("evaluador", () => {
  test.beforeEach(async ({ page }) => {
    await iniciarSesion(page);
    await sinEnviosEnServidor(page);
  });

  test("de la calificación a la lista y de la lista a Inicio", async ({ page }) => {
    await elegirEvaluadora(page);
    // Opened directly, so there is no history to go "back" to: the link
    // still knows the parent.
    await page.goto("/adaptabilidad/P03");
    await esperarCalificacion(page);

    await expect(volver(page)).toHaveAccessibleName("Volver a Participantes");
    await expect(volver(page)).toHaveText("Volver");
    await volver(page).click();
    await expect(page).toHaveURL(/\/adaptabilidad$/);
    await expect(page.getByRole("heading", { level: 1, name: "Participantes" })).toBeVisible();

    await expect(volver(page)).toHaveAccessibleName("Volver a Inicio");
    await volver(page).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(volver(page)).toHaveCount(0);
  });

  test("una calificación hecha justo antes de tocar Volver sobrevive a la recarga", async ({ page }) => {
    await elegirEvaluadora(page);
    await page.goto("/adaptabilidad/P04");
    await esperarCalificacion(page);

    // Click within the 300 ms debounce: Volver must flush the pending write.
    await page
      .getByRole("radiogroup", { name: /^Indicador 2\./ })
      .getByRole("radio", { name: "Experto", exact: true })
      .click();
    await volver(page).click();
    await expect(page).toHaveURL(/\/adaptabilidad$/);
    const guardado = await page.evaluate((clave) => JSON.parse(localStorage.getItem(clave) ?? "null"), CLAVE_BORRADOR);
    expect(guardado?.participantes?.P04?.calificaciones?.["adaptabilidad-2"]?.nivel).toBe(4);

    await page.goto("/adaptabilidad/P04");
    await esperarCalificacion(page);
    await expect(
      page.getByRole("radiogroup", { name: /^Indicador 2\./ }).getByRole("radio", { name: "Experto", exact: true }),
    ).toBeChecked();
  });

  test("no aparece en Inicio ni en acceso", async ({ page }) => {
    await page.goto("/");
    await esperarHidratacion(page);
    await expect(volver(page)).toHaveCount(0);
    await page.goto("/acceso");
    await expect(volver(page)).toHaveCount(0);
  });
});

test("docente: del Reporte individual al Reporte general, luego a Reportes", async ({ page }) => {
  await iniciarSesion(page, "docente");
  await page.goto("/reportes/adaptabilidad/P01");

  await expect(volver(page)).toHaveAccessibleName("Volver a Reporte general");
  await volver(page).click();
  await expect(page).toHaveURL(/\/reportes\/adaptabilidad$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Reporte general");

  await expect(volver(page)).toHaveAccessibleName("Volver a Reportes");
  await volver(page).click();
  await expect(page).toHaveURL(/\/reportes$/);
});

test("admin: sin Volver en /admin", async ({ page }) => {
  await iniciarSesion(page, "admin");
  await page.goto("/admin");
  await expect(page.getByRole("navigation", { name: "Navegación principal" })).toBeVisible();
  await expect(volver(page)).toHaveCount(0);
});

for (const ancho of [360, 375, 390]) {
  test(`sin desborde horizontal a ${ancho} px con Volver`, async ({ page }) => {
    await page.setViewportSize({ width: ancho, height: 740 });
    await iniciarSesion(page, "docente");
    await page.goto("/reportes/adaptabilidad/P01");
    await expect(volver(page)).toBeVisible();
    const marca = page.getByRole("link", { name: "Nivela, ir a Inicio" });
    await expect(marca).toHaveText("Nivela");
    const desborde = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(desborde).toBe(0);
    // The wordmark is never truncated.
    expect(await marca.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  });
}
