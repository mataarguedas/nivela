import { expect, test, type Page } from "@playwright/test";
import { competenciasDeJornada, DEFINICIONES_COMPETENCIA } from "../../src/config/competencias";
import { CURSOS, equipoDeCompetencia } from "../../src/config/equipos";
import { esperarHidratacion } from "./hidratacion";
import { iniciarSesion } from "./sesion";
import { sinEnviosEnServidor } from "./servidor";

// Inicio → evaluator step → participant list, local drafts and Borrar todo
// (PRD §5.2–§5.4, §5.8, §9.3). Since v1.2 only the docente picks which team
// member it rates as (evaluadores are who their account says, see
// cuentas.spec.ts), so these specs sign in as the docente.

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
  await iniciarSesion(page, "docente");
  await sinEnviosEnServidor(page);
});

test("de mañana se abren las 5 competencias", async ({ page }) => {
  await page.goto("/");
  await esperarHidratacion(page);
  // Every competencia has a morning rubric (PRD Appendix A).
  const lista = page.locator("#competencias");
  await expect(lista.locator("[aria-disabled='true']")).toHaveCount(0);
  for (const { id, nombre } of DEFINICIONES_COMPETENCIA) {
    await expect(lista.getByRole("link", { name: new RegExp(nombre) })).toHaveAttribute("href", `/${id}/evaluador`);
  }
});

test("de noche también se abren las 5, cada una con la rúbrica de la noche", async ({ page }) => {
  expect((await page.request.post("/api/jornada", { data: { jornada: "noche" } })).status()).toBe(200);
  await page.goto("/");
  await esperarHidratacion(page);
  // Since v1.7 every competencia has a night rubric (PRD Appendix A.6–A.10).
  // Only the list's rows: the Next dev-tools overlay has aria-disabled buttons too.
  const lista = page.locator("#competencias");
  await expect(lista.locator("[aria-disabled='true']")).toHaveCount(0);
  for (const { id, nombre } of DEFINICIONES_COMPETENCIA) {
    await expect(lista.getByRole("link", { name: new RegExp(nombre) })).toHaveAttribute("href", `/${id}/evaluador`);
  }

  // The night team rates with its own template, never the morning one.
  const competencia = competenciasDeJornada("noche").find((c) => c.id === "pensamiento-critico")!;
  expect(competencia.indicadores[0].titulo).toBe("Analiza y cuestiona la información disponible.");
  const equipo = equipoDeCompetencia("noche", competencia.id)!;
  await page.goto(`/${competencia.id}/evaluador`);
  await esperarHidratacion(page);
  await page.getByRole("button", { name: equipo.integrantes[0].nombre }).click();
  await expect(page).toHaveURL(new RegExp(`/${competencia.id}$`));
  await page.goto(`/${competencia.id}/P01`);
  const indicador = page.getByRole("radiogroup", { name: /^Indicador 1\. Analiza y cuestiona la información disponible\./ });
  await expect(indicador).toBeVisible();
  await expect(indicador.getByText(/Contrasta el modelo parte por parte/)).toBeVisible();
  await expect(page.getByText("Identifica aspectos relevantes de la información presentada.")).toHaveCount(0);

  // An unknown competencia is a real 404 from the layout, in any jornada.
  for (const ruta of ["/no-existe", "/no-existe/evaluador"]) {
    const respuesta = await page.goto(ruta);
    expect(respuesta?.status(), ruta).toBe(404);
    await expect(page.getByRole("heading", { level: 1, name: "Página no encontrada" })).toBeVisible();
  }
});

test("de mañana, una competencia nueva muestra su propia rúbrica", async ({ page }) => {
  const equipo = equipoDeCompetencia("manana", "orientacion-detalle")!;
  await page.goto("/orientacion-detalle/evaluador");
  await esperarHidratacion(page);
  await page.getByRole("button", { name: equipo.integrantes[0].nombre }).click();
  await expect(page).toHaveURL(/\/orientacion-detalle$/);
  await page.goto("/orientacion-detalle/P01");
  const indicador = page.getByRole("radiogroup", { name: /^Indicador 1\. Verifica aspectos minuciosos\./ });
  await expect(indicador).toBeVisible();
  await expect(indicador.getByText(/Comprueba aspectos poco perceptibles/)).toBeVisible();
  // Never another competencia's rubric.
  await expect(page.getByText("Actúa de manera rápida y flexible.")).toHaveCount(0);
});

test("Inicio lleva a la selección de evaluador de Adaptabilidad", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /Adaptabilidad/ }).click();
  await expect(page).toHaveURL(/\/adaptabilidad\/evaluador$/);
  await expect(page.getByRole("heading", { level: 1, name: "¿Quién está evaluando?" })).toBeVisible();
  // The members of the morning Adaptabilidad team, grouped by curso. Team
  // numbers and sizes differ per jornada, so the counts come from config.
  const equipo = equipoDeCompetencia("manana", "adaptabilidad")!;
  for (const curso of CURSOS) {
    const cantidad = equipo.integrantes.filter((i) => i.curso === curso).length;
    await expect(page.getByRole("region", { name: curso }).getByRole("button")).toHaveCount(cantidad);
  }
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

test("una evaluación enviada que se borró del servidor vuelve a Pendiente (PRD §5.4)", async ({ page }) => {
  await elegirEvaluador(page, EVALUADORA);
  await expect(page).toHaveURL(/\/adaptabilidad$/);
  // The server still has P02 only: P01's evaluation was deleted (test data cleared).
  await page.route(/\/api\/evaluaciones(\?|$)/, async (ruta) => {
    if (ruta.request().method() !== "GET") return ruta.fallback();
    await ruta.fulfill({ json: { evaluaciones: [{ participanteId: "P02", actualizadoEn: "2026-10-25T10:00:01.000Z" }], ausentes: [] } });
  });
  await page.evaluate((clave) => {
    const nivel = (n: number) => ({ nivel: n, origen: "manual" });
    const completa = { "adaptabilidad-1": nivel(1), "adaptabilidad-2": nivel(2), "adaptabilidad-3": nivel(3), "adaptabilidad-4": nivel(4) };
    const enviada = { modificadoEn: "2026-10-25T10:00:00.000Z", enviadoEn: "2026-10-25T10:00:00.000Z", calificaciones: completa };
    localStorage.setItem(clave, JSON.stringify({ version: 1, participantes: { P01: enviada, P02: enviada } }));
  }, CLAVE_BORRADOR);
  await page.reload();

  await expect(fila(page, "Participante 01").getByText("Pendiente")).toBeVisible();
  await expect(fila(page, "Participante 02").getByText("Enviado")).toBeVisible();
  // The old ratings leave the stored draft too, so the rating screen starts empty.
  await expect
    .poll(() => page.evaluate((clave) => Object.keys(JSON.parse(localStorage.getItem(clave) ?? "{}").participantes ?? {}), CLAVE_BORRADOR))
    .toEqual(["P02"]);
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
