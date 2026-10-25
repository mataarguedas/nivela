import { expect, test, type Page } from "@playwright/test";
import { esperarHidratacion } from "./hidratacion";
import { iniciarSesion } from "./sesion";

// Inicio → evaluator step → participant list, local drafts and Borrar todo
// (PRD §5.2–§5.4, §5.8, §9.3).

const EVALUADORA = "Jimena Salgado";
const OTRA = "Stacy Zamora Rodríguez";
const CLAVE_EVALUADOR = "nivela:v1:evaluador:adaptabilidad";
const CLAVE_BORRADOR = "nivela:v1:adaptabilidad:jimena-salgado";

function nav(page: Page) {
  return page.getByRole("navigation", { name: "Navegación principal" });
}

function fila(page: Page, etiqueta: string) {
  return page.getByRole("listitem").filter({ hasText: etiqueta });
}

async function elegirEvaluador(page: Page, nombre: string) {
  await page.goto("/adaptabilidad/evaluador");
  await esperarHidratacion(page);
  await page.getByRole("button", { name: nombre }).click();
}

async function clavesNivela(page: Page): Promise<string[]> {
  return page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("nivela:v1:")));
}

test.beforeEach(async ({ page }) => {
  await iniciarSesion(page);
});

test("las competencias deshabilitadas se ven pero no se pueden abrir", async ({ page }) => {
  await page.goto("/");
  await esperarHidratacion(page);
  const deshabilitadas = page.locator("[aria-disabled='true']");
  await expect(deshabilitadas).toHaveCount(4);
  for (const fila of await deshabilitadas.all()) {
    await expect(fila).toContainText("Próximamente");
    await expect(fila).not.toHaveAttribute("href");
  }

  // Playwright refuses to click aria-disabled elements; force the tap anyway.
  await deshabilitadas.filter({ hasText: "Pensamiento crítico y analítico" }).click({ force: true });
  await expect(page).toHaveURL(/\/$/);

  for (const ruta of ["/pensamiento-critico", "/pensamiento-critico/evaluador", "/no-existe/evaluador"]) {
    const respuesta = await page.goto(ruta);
    expect(respuesta?.status(), ruta).toBe(404);
    await expect(page.getByRole("heading", { level: 1, name: "Página no encontrada" })).toBeVisible();
  }
});

test("Inicio lleva a la selección de evaluador de Adaptabilidad", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /Adaptabilidad/ }).click();
  await expect(page).toHaveURL(/\/adaptabilidad\/evaluador$/);
  await expect(page.getByRole("heading", { level: 1, name: "¿Quién está evaluando?" })).toBeVisible();
  // The 8 members of Equipo 4, grouped by curso.
  await expect(page.getByRole("region", { name: "AGRH 315 Psicología 2" }).getByRole("button")).toHaveCount(4);
  await expect(page.getByRole("region", { name: "AGRH 613 Seminario Integrado de RRHH" }).getByRole("button")).toHaveCount(4);
});

test("la lista sin evaluador redirige a la selección", async ({ page }) => {
  await page.goto("/adaptabilidad");
  await expect(page).toHaveURL(/\/adaptabilidad\/evaluador$/);
});

test("la selección del evaluador persiste al recargar", async ({ page }) => {
  await elegirEvaluador(page, EVALUADORA);
  await expect(page).toHaveURL(/\/adaptabilidad$/);
  await expect(page.getByRole("heading", { level: 1, name: "Participantes" })).toBeVisible();
  await expect(nav(page).getByRole("link", { name: `Evaluador: ${EVALUADORA}` })).toBeVisible();
  await expect(page.getByText("0 de 20 enviadas")).toBeVisible();

  await page.reload();
  await expect(page).toHaveURL(/\/adaptabilidad$/);
  await expect(nav(page).getByRole("link", { name: `Evaluador: ${EVALUADORA}` })).toBeVisible();
  await expect(fila(page, "Participante 01").getByText("Pendiente")).toBeVisible();

  await page.goto("/adaptabilidad/evaluador");
  await expect(page.getByRole("button", { name: EVALUADORA })).toHaveAttribute("aria-current", "true");
});

test("cambiar de evaluador pide confirmación", async ({ page }) => {
  await elegirEvaluador(page, EVALUADORA);
  await expect(page).toHaveURL(/\/adaptabilidad$/);

  await nav(page).getByRole("link", { name: `Evaluador: ${EVALUADORA}` }).click();
  await expect(page).toHaveURL(/\/adaptabilidad\/evaluador$/);
  await esperarHidratacion(page);
  await page.getByRole("button", { name: OTRA }).click();

  const dialogo = page.getByRole("dialog", { name: "¿Cambiar de evaluador?" });
  await expect(dialogo).toContainText(EVALUADORA);
  await dialogo.getByRole("button", { name: "Cancelar" }).click();
  await expect(dialogo).toBeHidden();
  expect(await page.evaluate((k) => localStorage.getItem(k), CLAVE_EVALUADOR)).toBe("jimena-salgado");

  await page.getByRole("button", { name: OTRA }).click();
  await dialogo.getByRole("button", { name: "Cambiar" }).click();
  await expect(page).toHaveURL(/\/adaptabilidad$/);
  await expect(nav(page).getByRole("link", { name: `Evaluador: ${OTRA}` })).toBeVisible();
});

test("los estados reflejan el borrador local", async ({ page }) => {
  await elegirEvaluador(page, EVALUADORA);
  await expect(page).toHaveURL(/\/adaptabilidad$/);
  await page.evaluate((clave) => {
    const ahora = new Date().toISOString();
    const nivel = (n: number) => ({ nivel: n, origen: "manual" });
    localStorage.setItem(
      clave,
      JSON.stringify({
        version: 1,
        participantes: {
          P01: { modificadoEn: ahora, calificaciones: { "adaptabilidad-1": nivel(2) } },
          P02: {
            modificadoEn: ahora,
            calificaciones: { "adaptabilidad-1": nivel(1), "adaptabilidad-2": nivel(2), "adaptabilidad-3": nivel(3), "adaptabilidad-4": nivel(4) },
          },
        },
      }),
    );
  }, CLAVE_BORRADOR);
  await page.reload();

  await expect(fila(page, "Participante 01").getByText("En progreso")).toBeVisible();
  await expect(fila(page, "Participante 02").getByText("Completado")).toBeVisible();
  await expect(fila(page, "Participante 03").getByText("Pendiente")).toBeVisible();
});

test("Borrar todo limpia los borradores y el evaluador, y vuelve a Inicio", async ({ page }) => {
  await elegirEvaluador(page, EVALUADORA);
  await expect(page).toHaveURL(/\/adaptabilidad$/);
  await page.evaluate((clave) => {
    localStorage.setItem(clave, JSON.stringify({ version: 1, participantes: {} }));
    localStorage.setItem("otra-app", "conservar");
  }, CLAVE_BORRADOR);
  expect(await clavesNivela(page)).toHaveLength(2);

  await page.getByRole("button", { name: "Borrar todo" }).click();
  const dialogo = page.getByRole("dialog", { name: "Borrar todo" });
  await expect(dialogo).toContainText(
    "¿Desea borrar todas las evaluaciones guardadas en este dispositivo? Las evaluaciones ya enviadas no se eliminan del servidor.",
  );
  await dialogo.getByRole("button", { name: "Borrar todo" }).click();

  await expect(page).toHaveURL(/\/$/);
  expect(await clavesNivela(page)).toEqual([]);
  expect(await page.evaluate(() => localStorage.getItem("otra-app"))).toBe("conservar");
  await expect(nav(page).getByRole("link", { name: /Evaluador:/ })).toHaveCount(0);

  await page.goto("/adaptabilidad");
  await expect(page).toHaveURL(/\/adaptabilidad\/evaluador$/);
});

test("sin localStorage muestra el aviso y sigue funcionando en memoria", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new DOMException("The operation is insecure.", "SecurityError");
      },
    });
  });
  await elegirEvaluador(page, EVALUADORA);
  await expect(page).toHaveURL(/\/adaptabilidad$/);
  await expect(
    page.getByRole("status").filter({ hasText: "Este navegador no permite guardar borradores. No cierre la página hasta enviar." }),
  ).toBeVisible();
  await expect(nav(page).getByRole("link", { name: `Evaluador: ${EVALUADORA}` })).toBeVisible();
  await expect(fila(page, "Participante 01").getByText("Pendiente")).toBeVisible();
});

test("la lista cabe en 375 px con objetivos táctiles de 44 px", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await elegirEvaluador(page, EVALUADORA);
  await expect(page.getByText("0 de 20 enviadas")).toBeVisible();

  const desborde = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(desborde).toBeLessThanOrEqual(0);

  const pequenos = await page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>("main a, main button, nav a, nav button"))
      .filter((el) => el.offsetParent !== null)
      .map((el) => ({ texto: el.textContent?.trim().slice(0, 30), caja: el.getBoundingClientRect() }))
      .filter(({ caja }) => caja.height < 44 || caja.width < 44)
      .map(({ texto, caja }) => `${texto} (${Math.round(caja.width)}×${Math.round(caja.height)})`),
  );
  expect(pequenos).toEqual([]);

  const conSombra = await page.evaluate(() =>
    Array.from(document.querySelectorAll("*")).filter((el) => getComputedStyle(el).boxShadow !== "none").length,
  );
  expect(conSombra).toBe(0);
});
