import { readFile } from "node:fs/promises";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { esperarHidratacion } from "./hidratacion";
import { iniciarSesion } from "./sesion";

// Docente reports (PRD §5.9, §11, §15.7) against the dev database filled by
// `npm run db:seed` (8 evaluators × 20 participants). Assertions are about
// structure and ordering, not seeded values, so other specs' submissions
// don't break them.

const CABECERA_CSV =
  "competencia,evaluador,curso_evaluador,participante,indicador,nivel,nivel_nombre,origen,ia_nivel_sugerido,ia_confianza,observacion,actualizado";

function tabla(page: Page): Locator {
  return page.getByRole("table", { name: "Tabla de participantes" });
}

/** The puntaje general column (after the code and the 4 indicator means), as numbers; null for "—". */
async function puntajes(page: Page): Promise<(number | null)[]> {
  const textos = await tabla(page).locator("tbody tr").locator("td:nth-of-type(5)").allTextContents();
  return textos.map((t) => (t.trim() === "—" ? null : Number(t.trim().replace(",", "."))));
}

/**
 * Rendered charts on the current page. With Cache Components, Next keeps the
 * previous route mounted but hidden (<Activity>), so count visible ones only.
 */
function graficosVisibles(page: Page): Locator {
  return page.locator("figure svg.recharts-surface:visible");
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
    // Disabled competencias are listed but are not links.
    await expect(page.getByRole("link", { name: /Pensamiento crítico/ })).toHaveAttribute("aria-disabled", "true");
    await page.getByRole("link", { name: /Adaptabilidad/ }).click();

    await expect(page).toHaveURL(/\/reportes\/adaptabilidad$/);
    await expect(page.getByRole("heading", { level: 1, name: "Reporte general" })).toBeVisible();
    await expect(page.getByText("Aún no hay evaluaciones enviadas"), "run `npm run db:seed` first").toHaveCount(0);
    await expect(page.getByText("Participantes evaluados")).toBeVisible();
    await expect(page.getByText("Niveles asistidos por IA")).toBeVisible();
    for (const titulo of ["Distribución de niveles por indicador", "Puntaje por participante", "Cobertura de evaluaciones"]) {
      await expect(page.getByRole("heading", { level: 2, name: titulo })).toBeVisible();
    }
    // Both charts load on the client and each has a text equivalent.
    await expect(graficosVisibles(page)).toHaveCount(2);
    await expect(page.getByRole("table", { name: "Distribución de niveles por indicador" })).toBeAttached();
    await expect(page.getByRole("region", { name: "Cobertura de evaluaciones" }).getByRole("row")).toHaveCount(9);

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
    await expect(graficosVisibles(page)).toHaveCount(2);
    for (const titulo of ["Promedio por indicador", "Calificaciones por indicador", "Coincidencia entre evaluadores", "Observaciones"]) {
      await expect(page.getByRole("heading", { level: 2, name: titulo })).toBeVisible();
    }
    await expect(page.getByText(/coincidencia$/).first()).toBeVisible();
    await sinDesborde(page);

    await page.getByRole("link", { name: "Volver al Reporte general" }).click();
    await expect(page).toHaveURL(/\/reportes\/adaptabilidad$/);
  });

  test("Descargar CSV: UTF-8 con BOM, encabezado exacto y tildes correctas", async ({ page }) => {
    await page.goto("/reportes/adaptabilidad");
    const [descarga] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("link", { name: "Descargar CSV" }).click(),
    ]);
    expect(descarga.suggestedFilename()).toMatch(/^nivela-adaptabilidad-\d{4}-\d{2}-\d{2}\.csv$/);

    const bytes = await readFile(await descarga.path());
    expect([...bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const texto = new TextDecoder("utf-8", { fatal: true }).decode(bytes); // strips the BOM
    const lineas = texto.split("\r\n");
    expect(lineas[0]).toBe(CABECERA_CSV);
    expect(lineas.length).toBeGreaterThan(2);
    expect(texto).toContain("Adaptabilidad,Ramsés Salas Vargas,AGRH 315 Psicología 2,");
    expect(texto).toContain("Adaptabilidad,Kristel Barrantes López,AGRH 613 Seminario Integrado de RRHH,");
  });

  test("una competencia deshabilitada responde 404", async ({ page }) => {
    const respuesta = await page.goto("/reportes/pensamiento-critico");
    expect(respuesta?.status()).toBe(404);
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
