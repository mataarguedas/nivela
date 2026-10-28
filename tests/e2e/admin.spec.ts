import { expect, test, type Browser, type Page } from "@playwright/test";
import { esperarHidratacion } from "./hidratacion";
import { codigo, iniciarSesion } from "./sesion";

// The admin's participant list (PRD §5.10). It changes the shared dev DB's
// participants, which every other spec reads, so it runs in its own
// playwright project after all of them (playwright.config.ts) and puts back
// the list it found.

test.describe.configure({ mode: "serial" });

const NOMBRES = ["Ana Pérez Solano", "Bruno Céspedes", "Carla Mora", "Diego Vargas Núñez", "Elena Rojas"];

let original: { cantidad: number; nombres: string[] } | null = null;

async function leerEditor(page: Page) {
  const cantidad = Number(await page.getByLabel("Cantidad de participantes").inputValue());
  const nombres = await page.locator("ol input").evaluateAll((campos) => campos.map((c) => (c as HTMLInputElement).value));
  return { cantidad, nombres };
}

async function sesionAdmin(browser: Browser) {
  const contexto = await browser.newContext();
  const page = await contexto.newPage();
  await iniciarSesion(page, "admin");
  return { contexto, page };
}

test.afterAll(async ({ browser }) => {
  if (!original) return;
  const { contexto, page } = await sesionAdmin(browser);
  const respuesta = await page.request.put("/api/admin/participantes", { data: { ...original, confirmar: true } });
  expect(respuesta.status()).toBe(200);
  await contexto.close();
});

test("el código de administración abre /admin y nada más", async ({ page }) => {
  await page.goto("/acceso");
  await page.getByLabel("Ingrese el código de acceso de su clase").fill(codigo("admin"));
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { level: 1, name: "Participantes" })).toBeVisible();

  for (const ruta of ["/", "/adaptabilidad", "/reportes/adaptabilidad"]) {
    await page.goto(ruta);
    await expect(page, ruta).toHaveURL(/\/admin$/);
  }
  expect((await page.request.get("/api/evaluaciones?competencia=adaptabilidad&evaluador=jimena-salgado")).status()).toBe(403);
});

test("el docente no puede abrir /admin", async ({ page }) => {
  await iniciarSesion(page, "docente");
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/acceso\?/);
  await expect(page.getByText("Esta sección requiere el código de administración.")).toBeVisible();
});

test("el admin define 5 participantes con nombre y la persona evaluadora los ve", async ({ page, browser }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await iniciarSesion(page, "admin");
  await page.goto("/admin");
  await esperarHidratacion(page, "form");
  original = await leerEditor(page);

  await page.getByLabel("Cantidad de participantes").fill("5");
  await expect(page.locator("ol input")).toHaveCount(5);
  for (const [i, nombre] of NOMBRES.entries()) {
    await page.getByLabel(`Participante 0${i + 1}`, { exact: true }).fill(nombre);
  }
  // 375 px: no horizontal page scroll with 5 name fields and the bottom bar.
  const desborde = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(desborde).toBeLessThanOrEqual(0);

  await page.getByRole("button", { name: "Guardar cambios" }).click();
  // Seeded data has evaluations for the participants this hides: confirm.
  const dialogo = page.getByRole("dialog", { name: "¿Ocultar participantes con evaluaciones?" });
  const guardado = page.getByText("Cambios guardados");
  await expect(dialogo.or(guardado)).toBeVisible();
  if (await dialogo.isVisible()) {
    await expect(dialogo).toContainText("Las evaluaciones no se eliminan");
    await dialogo.getByRole("button", { name: "Ocultar y guardar" }).click();
  }
  await expect(guardado).toBeVisible();

  // An evaluator, in a separate session, sees exactly those 5 names.
  const evaluador = await browser.newContext({ viewport: { width: 375, height: 667 } });
  const pagina = await evaluador.newPage();
  await iniciarSesion(pagina);
  await pagina.goto("/adaptabilidad/evaluador");
  await esperarHidratacion(pagina);
  await pagina.getByRole("button", { name: "Jimena Salgado" }).click();
  await expect(pagina).toHaveURL(/\/adaptabilidad$/);
  const filas = pagina.getByRole("main").getByRole("listitem");
  await expect(filas).toHaveCount(5);
  await expect(filas.first()).toContainText("Ana Pérez Solano");
  await expect(filas.first()).toContainText("Participante 01");

  await filas.nth(2).getByRole("link").click();
  await expect(pagina.getByRole("heading", { level: 1, name: "Carla Mora" })).toBeVisible();

  // A hidden participant is gone from the rating routes.
  await pagina.goto("/adaptabilidad/P06");
  await expect(pagina.getByRole("heading", { level: 1, name: "Página no encontrada" })).toBeVisible();
  await evaluador.close();
});
