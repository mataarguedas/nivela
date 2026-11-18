import { readFile } from "node:fs/promises";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { esperarHidratacion } from "./hidratacion";
import { equipoDeCompetencia } from "../../src/config/equipos";
import type { JornadaId } from "../../src/config/jornadas";
import { iniciarSesion } from "./sesion";

// Docente reports (PRD §5.9, §11, §15.7) against the dev database filled by
// `npm run db:seed` (each jornada's Adaptabilidad team × its participants). Assertions are about
// structure and ordering, not seeded values, so other specs' submissions
// don't break them.

const CABECERA_CSV =
  "jornada,competencia,evaluador,curso_evaluador,participante,carnet,indicador,nivel,nivel_nombre,origen,ia_nivel_sugerido,ia_confianza,observacion,actualizado";

function tabla(page: Page): Locator {
  return page.getByRole("table", { name: "Tabla de participantes" });
}

/** The puntaje general column (after the code and the 4 indicator means), as numbers; null for "—". */
async function puntajes(page: Page): Promise<(number | null)[]> {
  const textos = await tabla(page).locator("tbody tr").locator("td:nth-of-type(5)").allTextContents();
  return textos.map((t) => (t.trim() === "—" ? null : Number(t.trim().replace(",", "."))));
}

/**
 * Rendered Recharts charts on the current page (only the detailed ones use
 * it). With Cache Components, Next keeps the previous route mounted but
 * hidden (<Activity>), so count visible ones only.
 */
function graficosVisibles(page: Page): Locator {
  return page.locator("figure svg.recharts-surface:visible");
}

/** The server-drawn bars of a simple chart (PRD §11 v1.2), by its section id. */
function barras(page: Page, id: string): Locator {
  return page.locator(`figure[aria-labelledby="${id}-titulo ${id}-mensaje"]:visible .barras-horizontales li`);
}

/** Opens "Ver gráficos detallados" and checks the disclosure state. */
async function abrirDetallados(page: Page) {
  const boton = page.getByRole("button", { name: "Ver gráficos detallados" });
  await expect(boton).toHaveAttribute("aria-expanded", "false");
  // A click before hydration would be lost.
  await esperarHidratacion(page, "h2 > button[aria-expanded]");
  await boton.click();
  await expect(boton).toHaveAttribute("aria-expanded", "true");
}

async function sinDesborde(page: Page) {
  const desborde = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(desborde).toBeLessThanOrEqual(0);
}

test.describe("como docente", () => {
  test.beforeEach(async ({ page }) => {
    await iniciarSesion(page, "docente");
  });

  test("de Reportes al Reporte general, ordenar la tabla y abrir un Reporte individual", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/reportes");
    await expect(page.getByRole("heading", { level: 1, name: "Reportes" })).toBeVisible();
    // Every competencia has a morning rubric, so each one opens its report.
    await expect(page.getByRole("link", { name: /Pensamiento crítico/ })).toHaveAttribute("href", "/reportes/pensamiento-critico");
    await page.getByRole("link", { name: /Adaptabilidad/ }).click();

    await expect(page).toHaveURL(/\/reportes\/adaptabilidad$/);
    await expect(page.getByRole("heading", { level: 1, name: "Reporte general" })).toBeVisible();
    await expect(page.getByText("Aún no hay evaluaciones enviadas"), "run `npm run db:seed` first").toHaveCount(0);
    await expect(page.getByText("Participantes evaluados")).toBeVisible();
    await expect(page.getByText("Niveles asistidos por IA")).toBeVisible();
    for (const titulo of ["Los 5 puntajes más altos", "Participantes por nivel", "Puntaje por participante", "Cobertura de evaluaciones"]) {
      await expect(page.getByRole("heading", { level: 2, name: titulo })).toBeVisible();
    }
    // Simple charts (PRD §11 v1.2): server-drawn bars titled by their message,
    // every value labelled, each with a text equivalent; no Recharts yet.
    await expect(page.locator("#por-nivel-mensaje")).toHaveText(
      /^(La mayoría de los participantes está en nivel|El nivel más frecuente es|Los niveles .+ empatan|Todos los participantes están en nivel) /,
    );
    await expect(barras(page, "por-nivel")).toHaveCount(4);
    await expect(barras(page, "por-nivel").first()).toHaveText(/^Básico\d+ · \d+\u00a0%$/);
    await expect(page.getByRole("table", { name: "Participantes por nivel" })).toBeAttached();
    await expect(page.locator("#puntajes-mensaje")).toHaveText(
      /^(Los puntajes van de \d{1,3} a \d{1,3}|Todos los participantes tienen el mismo puntaje .+)$/,
    );
    // The value label alone: the row text also holds the carnet, which ends in digits.
    await expect(barras(page, "puntajes").first().locator("span.tabular-nums")).toHaveText(/^\d{1,3} · (Básico|Intermedio|Avanzado|Experto)$/);
    // The threshold lines are labelled with the level they open.
    const figuraPuntajes = page.locator('figure[aria-labelledby="puntajes-titulo puntajes-mensaje"]');
    for (const nivel of ["Intermedio", "Avanzado", "Experto"]) {
      await expect(figuraPuntajes.locator(".barras-horizontales > div").first().getByText(nivel, { exact: true })).toBeVisible();
    }
    await expect(graficosVisibles(page)).toHaveCount(0);
    await expect(page.getByRole("table", { name: "Distribución de niveles por indicador" })).toHaveCount(0);
    const filasCobertura = equipoDeCompetencia("manana", "adaptabilidad")!.integrantes.length + 1;
    await expect(page.getByRole("region", { name: "Cobertura de evaluaciones" }).getByRole("row")).toHaveCount(filasCobertura);

    // 375 px: no horizontal page scroll, full-size actions.
    await sinDesborde(page);
    for (const nombre of ["Descargar CSV", "Imprimir o guardar PDF"]) {
      const caja = await page.getByRole("group", { name: "Acciones del reporte" }).getByRole(nombre === "Descargar CSV" ? "link" : "button", { name: nombre }).boundingBox();
      expect(caja!.height).toBeGreaterThanOrEqual(44);
    }

    // Sorting: puntaje general descending by default; click toggles; code sorts A→Z.
    await esperarHidratacion(page, '[aria-labelledby="tabla-titulo"]');
    const columnaPuntaje = tabla(page).getByRole("columnheader", { name: "Puntaje general" });
    await expect(columnaPuntaje).toHaveAttribute("aria-sort", "descending");
    const descendente = (await puntajes(page)).filter((p) => p !== null);
    expect(descendente.length).toBeGreaterThan(1);
    expect(descendente).toEqual([...descendente].sort((a, b) => b - a));

    // Top 5: at least 5 places (more only on a tie at the cut), the same
    // scores the table opens with, each card linking to its Reporte individual.
    const mejores = page.getByRole("region", { name: "Los 5 puntajes más altos" }).getByRole("listitem");
    const cantidad = await mejores.count();
    expect(cantidad).toBeGreaterThanOrEqual(Math.min(5, descendente.length));
    const puntajesMejores = (await mejores.locator("span.text-h3:not([aria-hidden])").allTextContents()).map((t) =>
      Number(t.trim().replace(",", ".")),
    );
    expect(puntajesMejores).toEqual(descendente.slice(0, cantidad));
    expect(puntajesMejores.slice(5).every((p) => p === puntajesMejores[4])).toBe(true);
    await expect(mejores.first().getByRole("link")).toHaveAttribute("href", /\/reportes\/adaptabilidad\/P\d+$/);

    await columnaPuntaje.getByRole("button").click();
    await expect(columnaPuntaje).toHaveAttribute("aria-sort", "ascending");
    const ascendente = (await puntajes(page)).filter((p) => p !== null);
    expect(ascendente).toEqual([...ascendente].sort((a, b) => a - b));

    const columnaCodigo = tabla(page).getByRole("columnheader", { name: "Participante" });
    await columnaCodigo.getByRole("button").click();
    await expect(columnaCodigo).toHaveAttribute("aria-sort", "ascending");
    await expect(columnaPuntaje).not.toHaveAttribute("aria-sort");
    const codigos = await tabla(page).locator("tbody tr th").allTextContents();
    expect(codigos[0]).toBe("Participante 01");
    expect(codigos).toEqual([...codigos].sort());

    // Each row opens its Reporte individual.
    await tabla(page).getByRole("link", { name: "Participante 03" }).click();
    await expect(page).toHaveURL(/\/reportes\/adaptabilidad\/P03$/);
    await expect(page.getByRole("heading", { level: 1, name: "Participante 03" })).toBeVisible();
    const cabecera = page.locator("main header");
    await expect(cabecera.getByText("Nivel general", { exact: true })).toBeVisible();
    await expect(cabecera.getByText(/^(Básico|Intermedio|Avanzado|Experto)$/)).toBeVisible();
    for (const titulo of ["Puntaje por indicador", "Calificaciones por indicador", "Coincidencia entre evaluadores", "Observaciones"]) {
      await expect(page.getByRole("heading", { level: 2, name: titulo })).toBeVisible();
    }
    // "Puntaje por indicador": 4 bars on the 0–100 axis labelled "75 · Experto".
    await expect(page.locator("#por-indicador-mensaje")).toHaveText(
      /^(El indicador más alto es «.+» \(\d{1,3}\)|Los indicadores .+ empatan como los más altos \(\d{1,3}\)|Todos los indicadores tienen el mismo promedio .+)$/,
    );
    await expect(barras(page, "por-indicador")).toHaveCount(4);
    for (const texto of await barras(page, "por-indicador").allTextContents()) {
      expect(texto).toMatch(/^Indicador \d\. .+\D\d{1,3} · (Básico|Intermedio|Avanzado|Experto)$/);
    }
    // One plain line per indicator instead of the stacked bars.
    const lineas = page.getByRole("region", { name: "Calificaciones por indicador" }).getByRole("listitem");
    await expect(lineas).toHaveCount(4);
    await expect(lineas.first()).toHaveText(/(\d+ de \d+ evaluadores (eligió|eligieron) (Básico|Intermedio|Avanzado|Experto)|Empate entre .+ cada uno)$/);
    await expect(graficosVisibles(page)).toHaveCount(0);
    await expect(page.getByText(/coincidencia$/).first()).toBeVisible();
    await sinDesborde(page);

    await page.getByRole("link", { name: "Volver al Reporte general" }).click();
    await expect(page).toHaveURL(/\/reportes\/adaptabilidad$/);
  });

  test("«Ver gráficos detallados» carga Recharts solo al abrirse: radar y barras apiladas", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    // Reporte individual: closed by default; opening it reveals the radar and
    // the stacked bars, each with its text equivalent.
    await page.goto("/reportes/adaptabilidad/P01");
    await expect(page.getByText("Este participante aún no tiene evaluaciones."), "run `npm run db:seed` first").toHaveCount(0);
    await expect(page.getByRole("heading", { level: 2, name: "Puntaje por indicador" })).toBeVisible();
    await expect(graficosVisibles(page)).toHaveCount(0);
    await expect(page.getByRole("table", { name: "Promedio por indicador" })).toHaveCount(0);
    await abrirDetallados(page);
    for (const titulo of ["Promedio por indicador", "Evaluadores por nivel en cada indicador"]) {
      await expect(page.getByRole("heading", { level: 3, name: titulo })).toBeVisible();
      await expect(page.getByRole("table", { name: titulo })).toBeAttached();
    }
    await expect(graficosVisibles(page)).toHaveCount(2);
    await expect(page.locator("figure .recharts-polar-grid:visible")).toHaveCount(1);
    await sinDesborde(page);

    // Reporte general: the 100 % stacked bars.
    await page.goto("/reportes/adaptabilidad");
    await expect(page.getByRole("heading", { level: 2, name: "Participantes por nivel" })).toBeVisible();
    await expect(graficosVisibles(page)).toHaveCount(0);
    await abrirDetallados(page);
    await expect(page.getByRole("heading", { level: 3, name: "Distribución de niveles por indicador" })).toBeVisible();
    await expect(page.getByRole("table", { name: "Distribución de niveles por indicador" })).toBeAttached();
    await expect(graficosVisibles(page)).toHaveCount(1);
    await sinDesborde(page);
  });

  test("brecha al siguiente nivel y avance de evaluadores, en cada jornada con su propio equipo", async ({ page }) => {
    const gap = /^(Le faltan \d+ puntos para (Intermedio|Avanzado|Experto)|Le falta 1 punto para (Intermedio|Avanzado|Experto)|Nivel máximo alcanzado)$/;
    for (const jornada of ["manana", "noche"] as JornadaId[]) {
      // The number and the size come from config, never from a constant.
      const equipo = equipoDeCompetencia(jornada, "adaptabilidad")!;
      const total = equipo.integrantes.length;
      const titulo = `Avance de evaluadores · Equipo ${equipo.numero}`;
      expect((await page.request.post("/api/jornada", { data: { jornada } })).status()).toBe(200);

      // Phone: a stacked card per evaluator.
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto("/reportes/adaptabilidad");
      await expect(page.getByText("Aún no hay evaluaciones enviadas"), "run `npm run db:seed` first").toHaveCount(0);
      const seccion = page.getByRole("region", { name: titulo });
      await expect(seccion).toBeVisible();
      await expect(seccion.getByText(new RegExp(`^\\d+ de ${total} evaluadores completaron$`))).toBeVisible();
      await expect(seccion.getByText("Solo se cuentan las evaluaciones enviadas; los borradores quedan en el teléfono de cada evaluador.")).toBeVisible();
      await expect(seccion.getByRole("list").getByRole("listitem")).toHaveCount(total);
      await expect(seccion.getByRole("list").getByText(/^(Sin iniciar|En progreso|Completo)$/).first()).toBeVisible();
      await expect(page.getByText("Evaluadores completos")).toBeVisible();
      await expect(tabla(page).getByRole("columnheader", { name: "Para el siguiente nivel" })).toBeVisible();
      await sinDesborde(page);

      // Wider screens: a table, one row per member plus the header.
      await page.setViewportSize({ width: 1280, height: 900 });
      await expect(seccion.getByRole("table", { name: titulo }).getByRole("row")).toHaveCount(total + 1);

      // Reporte individual: the gap under Nivel general and per indicator.
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto("/reportes/adaptabilidad/P01");
      await expect(page.locator("main header").getByText(gap)).toBeVisible();
      const siguiente = page.getByRole("region", { name: "Para el siguiente nivel" });
      await expect(siguiente.getByRole("listitem")).toHaveCount(4);
      await expect(siguiente.getByText(/Le faltan? \d+ puntos? para|Nivel máximo alcanzado/).first()).toBeVisible();
      await sinDesborde(page);
    }
  });

  test("Descargar CSV: UTF-8 con BOM, encabezado exacto y tildes correctas", async ({ page }) => {
    await page.goto("/reportes/adaptabilidad");
    const [descarga] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("link", { name: "Descargar CSV" }).click(),
    ]);
    expect(descarga.suggestedFilename()).toMatch(/^nivela-adaptabilidad-manana-\d{4}-\d{2}-\d{2}\.csv$/);

    const bytes = await readFile(await descarga.path());
    expect([...bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const texto = new TextDecoder("utf-8", { fatal: true }).decode(bytes); // strips the BOM
    const lineas = texto.split("\r\n");
    expect(lineas[0]).toBe(CABECERA_CSV);
    expect(lineas.length).toBeGreaterThan(2);
    expect(texto).toContain("Adaptabilidad,Ramsés Salas Vargas,AGRH 315 Psicología 2,");
    expect(texto).toContain("Adaptabilidad,Kristel Barrantes López,AGRH 613 Seminario Integrado de RRHH,");
  });

  test("una competencia sin rúbrica en la jornada no tiene reporte; una inexistente responde 404", async ({ page }) => {
    const inexistente = await page.goto("/reportes/no-existe");
    expect(inexistente?.status()).toBe(404);
    expect((await page.request.get("/api/reportes/no-existe")).status()).toBe(404);

    // Pensamiento crítico has only the morning team's rubric (PRD Appendix A).
    expect((await page.request.post("/api/jornada", { data: { jornada: "noche" } })).status()).toBe(200);
    await page.goto("/reportes");
    await expect(page.getByRole("link", { name: /Pensamiento crítico/ })).toHaveAttribute("aria-disabled", "true");
    await page.goto("/reportes/pensamiento-critico");
    await expect(page.getByRole("heading", { level: 1, name: "Página no encontrada" })).toBeVisible();
    expect((await page.request.get("/api/reportes/pensamiento-critico")).status()).toBe(404);
  });
});

test("el rol evaluador no accede a los reportes ni al CSV", async ({ page }) => {
  await iniciarSesion(page, "evaluador");
  const csv = await page.request.get("/api/reportes/adaptabilidad/csv");
  expect(csv.status()).toBe(403);
  expect(await csv.json()).toEqual({ error: "Esta sección requiere el código docente." });

  await page.goto("/reportes/adaptabilidad");
  await expect(page).toHaveURL(/\/acceso\?/);
  expect(new URL(page.url()).searchParams.get("motivo")).toBe("docente");
});
