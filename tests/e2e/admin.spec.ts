import { expect, test, type Browser, type Page } from "@playwright/test";
import { equipoDeCompetencia } from "../../src/config/equipos";
import { esperarHidratacion } from "./hidratacion";
import { codigo, iniciarSesion } from "./sesion";

// The admin's participant list (PRD §5.10) and evaluator accounts (§5.12). It changes the shared dev DB's
// participants, which every other spec reads, so it runs in its own
// playwright project after all of them (playwright.config.ts) and puts back
// the list it found.

test.describe.configure({ mode: "serial" });

const NOMBRES = ["Ana Pérez Solano", "Bruno Céspedes", "Carla Mora", "Diego Vargas Núñez", "Elena Rojas"];
// Fake carnets (never real ones in tests): the reports show these, not the names.
const CARNETS = ["900000001", "900000002", "", "900000004", "900000005"];

let original: { cantidad: number; nombres: string[]; carnets: string[]; correos: string[] } | null = null;

/** Each row has the name field, then the carnet field, then the email field (PRD §5.14). */
async function leerEditor(page: Page) {
  const cantidad = Number(await page.getByLabel("Cantidad de participantes").inputValue());
  const filas = await page
    .locator("ol li")
    .evaluateAll((items) => items.map((li) => [...li.querySelectorAll("input")].map((c) => c.value)));
  return {
    cantidad,
    nombres: filas.map((f) => f[0] ?? ""),
    carnets: filas.map((f) => f[1] ?? ""),
    correos: filas.map((f) => f[2] ?? ""),
  };
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
  // A fresh admin session starts in the morning, the jornada `original` was read in.
  const respuesta = await page.request.put("/api/admin/participantes", {
    data: { jornada: "manana", ...original, confirmar: true },
  });
  expect(respuesta.status()).toBe(200);
  await contexto.close();
});

test("el código de administración abre /admin y nada más", async ({ page }) => {
  await page.goto("/acceso");
  await esperarHidratacion(page);
  await page.getByRole("button", { name: "Ingresar con código de docente o administración" }).click();
  await page.getByLabel("Ingrese su código de docente o administración").fill(codigo("admin"));
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

test("el admin define 5 participantes con nombre y carné; quien evalúa ve los nombres y el reporte solo los carnés", async ({
  page,
  browser,
}) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await iniciarSesion(page, "admin");
  await page.goto("/admin");
  // The participant editor's own form (the one with the list), not the jornada
  // switch above it: that one hydrates first, and WebKit drops input typed into
  // the editor before the editor itself has hydrated.
  await esperarHidratacion(page, "form:has(ol)");
  original = await leerEditor(page);

  await page.getByLabel("Cantidad de participantes").fill("5");
  await expect(page.locator("ol li")).toHaveCount(5);
  for (const [i, nombre] of NOMBRES.entries()) {
    await page.getByLabel(`Participante 0${i + 1}`, { exact: true }).fill(nombre);
    await page.getByLabel(`Carné · Participante 0${i + 1}`, { exact: true }).fill(CARNETS[i]);
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
  await pagina.goto("/adaptabilidad");
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

  // The docente's report and CSV identify them by carnet ("Participante 03"
  // without one) and never show a name.
  const docente = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const reporte = await docente.newPage();
  await iniciarSesion(reporte, "docente");
  await reporte.goto("/reportes/adaptabilidad");
  const tabla = reporte.getByRole("table", { name: "Tabla de participantes" });
  await expect(tabla.locator("tbody tr th")).toHaveCount(5);
  // The table is sorted by score, so compare as a set.
  const etiquetas = (await tabla.locator("tbody tr th").allTextContents()).map((t) => t.trim()).sort();
  expect(etiquetas).toEqual(["900000001", "900000002", "900000004", "900000005", "Participante 03"]);
  await expect(reporte.getByRole("main")).not.toContainText("Ana Pérez Solano");
  const csv = await (await reporte.request.get("/api/reportes/adaptabilidad/csv")).text();
  expect(csv).not.toContain("Ana Pérez Solano");
  await docente.close();
});

test("«Cuentas de evaluadores»: equipos de la jornada en su orden, editar correo y restablecer acceso", async ({ page }) => {
  // The night team for Adaptabilidad, looked up by competencia; its number is that jornada's label.
  const equipo = equipoDeCompetencia("noche", "adaptabilidad")!;
  const integrante = equipo.integrantes[equipo.integrantes.length - 1];
  await iniciarSesion(page, "admin");
  await page.goto("/admin");
  await esperarHidratacion(page);
  await page.getByRole("radiogroup", { name: "Jornada" }).getByRole("radio", { name: "Noche" }).click();

  const seccion = page.getByRole("region", { name: "Cuentas de evaluadores" });
  const grupo = seccion.getByRole("region", { name: `Equipo ${equipo.numero} · Adaptabilidad` });
  await expect(grupo).toBeVisible();
  const numeros = await seccion.getByRole("heading", { level: 3 }).allInnerTexts();
  const enOrden = numeros.map((t) => Number(/Equipo (\d+)/.exec(t)?.[1]));
  expect(enOrden).toEqual([...enOrden].sort((a, b) => a - b));

  const fila = grupo.getByRole("listitem").filter({ hasText: integrante.nombre });
  await expect(fila.getByText("Activa")).toBeVisible();

  await fila.getByRole("button", { name: `Restablecer acceso: ${integrante.nombre}` }).click();
  const confirmar = page.getByRole("dialog", { name: `¿Restablecer el acceso de ${integrante.nombre}?` });
  await confirmar.getByRole("button", { name: "Restablecer acceso" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Acceso restablecido" })).toBeVisible();
  await expect(fila.getByText("Pendiente de activar")).toBeVisible();

  await fila.getByRole("button", { name: `Editar correo: ${integrante.nombre}` }).click();
  const dialogo = page.getByRole("dialog", { name: `Correo de ${integrante.nombre}` });
  await dialogo.getByLabel("Correo electrónico").fill(`cambiado-${integrante.id}@ejemplo.test`);
  await dialogo.getByRole("button", { name: "Guardar correo" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Correo guardado" })).toBeVisible();
  await expect(fila.getByText(`cambiado-${integrante.id}@ejemplo.test`)).toBeVisible();
});
