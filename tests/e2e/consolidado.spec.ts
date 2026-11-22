import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { competenciasDeJornada } from "../../src/config/competencias";
import { competenciaDisponible } from "../../src/config/equipos";
import { esperarHidratacion } from "./hidratacion";
import { iniciarSesion } from "./sesion";

// Reporte consolidado (PRD §11.4) against the dev database filled by
// `npm run db:seed` (every rubric's team in each jornada). Assertions are
// about structure, not seeded values. Which competencias are available in a
// jornada comes from config, never from a hard-coded list.

const RUTA = "/reportes/consolidado";

/** The visible page (Cache Components keeps the previous route mounted but hidden). */
function principal(page: Page) {
  return page.locator("main").filter({ visible: true });
}

async function sinDesborde(page: Page) {
  const desborde = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(desborde).toBeLessThanOrEqual(0);
}

const disponibles = (jornada: "manana" | "noche") =>
  competenciasDeJornada(jornada).filter((c) => competenciaDisponible(jornada, c.id));

test.describe("como docente", () => {
  test.beforeEach(async ({ page }) => {
    await iniciarSesion(page, "docente");
  });

  test("abre el consolidado desde Reportes y ve todas las competencias juntas", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/reportes");
    // A click before hydration can be swallowed while Firefox finishes loading the dev bundle.
    await esperarHidratacion(page, 'a[href="/reportes/consolidado"]');
    await principal(page).getByRole("link", { name: /^Reporte consolidado/ }).click();
    await expect(page).toHaveURL(new RegExp(`${RUTA}$`), { timeout: 15_000 });
    await expect(principal(page).getByRole("heading", { level: 1, name: "Reporte consolidado" })).toBeVisible();
    await expect(principal(page).getByText("Todas las competencias · Jornada: Mañana", { exact: true })).toBeVisible();
    await expect(principal(page).getByText("Aún no hay evaluaciones enviadas"), "run `npm run db:seed` first").toHaveCount(0);

    // "Resumen por competencia": the five competencias in config order, each available one linking to its Reporte general.
    const resumen = principal(page).getByRole("table", { name: "Resumen por competencia" });
    const filas = resumen.getByRole("row");
    await expect(filas).toHaveCount(competenciasDeJornada("manana").length + 1);
    await expect(resumen.getByRole("rowheader")).toHaveText(competenciasDeJornada("manana").map((c) => c.nombre));
    for (const c of disponibles("manana")) {
      await expect(resumen.getByRole("link", { name: c.nombre })).toHaveAttribute("href", `/reportes/${c.id}`);
    }

    // One bar per available competencia.
    await expect(
      principal(page).locator('figure[aria-labelledby="por-competencia-titulo por-competencia-mensaje"] .barras-horizontales li'),
    ).toHaveCount(disponibles("manana").length);

    // The participant table: a column per available competencia, sorted by the promedio (descending).
    await esperarHidratacion(page, '[aria-labelledby="tabla-titulo"]');
    const tabla = principal(page).getByRole("table", { name: "Participantes en todas las competencias" });
    await expect(tabla.getByRole("columnheader")).toHaveText([
      "Participante",
      ...disponibles("manana").map((c) => c.nombre),
      "Competencias evaluadas",
      "Promedio",
      "Nivel",
      "Para el siguiente nivel",
    ].map((t) => new RegExp(`^${t}`)));
    const promedio = tabla.getByRole("columnheader", { name: /^Promedio/ });
    await expect(promedio).toHaveAttribute("aria-sort", "descending");
    await promedio.getByRole("button").click();
    await expect(promedio).toHaveAttribute("aria-sort", "ascending");

    // A rated cell opens that competencia's Reporte individual.
    const celda = tabla.getByRole("link").first();
    await expect(celda).toHaveAttribute("href", /^\/reportes\/[a-z-]+\/P\d{2}$/);

    await sinDesborde(page);

    // "Volver" goes to Reportes.
    const volver = page.getByRole("navigation", { name: "Navegación principal" }).getByRole("link", { name: /^Volver a / });
    await expect(volver).toHaveAccessibleName("Volver a Reportes");
  });

  test("Descargar CSV: una fila por participante con las competencias lado a lado", async ({ page }) => {
    await page.goto(RUTA);
    const [descarga] = await Promise.all([
      page.waitForEvent("download"),
      principal(page).getByRole("link", { name: "Descargar CSV" }).click(),
    ]);
    expect(descarga.suggestedFilename()).toMatch(/^nivela-consolidado-manana-\d{4}-\d{2}-\d{2}\.csv$/);
    const bytes = await readFile(await descarga.path());
    expect([...bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const lineas = new TextDecoder("utf-8", { fatal: true }).decode(bytes).split("\r\n");
    expect(lineas[0]).toBe(
      [
        "jornada,participante,carnet",
        ...disponibles("manana").map((c) => `${c.id}_puntaje,${c.id}_nivel,${c.id}_evaluaciones`),
        "competencias_evaluadas,promedio_competencias,nivel_promedio",
      ].join(","),
    );
    expect(lineas[1]).toMatch(/^Mañana,P01,/);
  });

  test("el tablero resume al grupo y lleva al reporte de cada participante", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(RUTA);

    // Dashboard (PRD §11.4): a plain-language summary and the level map. Since v1.11 there is
    // no "Requieren atención" list and the summary never counts participants in Básico.
    await expect(
      principal(page).getByText(/^El grupo alcanzó un nivel (Básico|Intermedio|Avanzado|Experto) \(\d{1,3}\) como promedio entre competencias\./),
    ).toBeVisible();
    const mapa = principal(page).getByRole("table", { name: /^Mapa de niveles/ });
    await expect(mapa.getByRole("columnheader")).toHaveText(["Participante", ...disponibles("manana").map((c) => c.nombre), "Promedio"]);
    const filas = await mapa.getByRole("row").count();
    expect(filas).toBeGreaterThan(1);
    // Every colored cell also shows its score (color never carries the level alone).
    await expect(mapa.getByRole("cell").first()).toHaveText(/^(\d{1,3} · (Básico|Intermedio|Avanzado|Experto)|—|Aus\.Ausente)$/);
    await expect(principal(page).getByRole("heading", { name: "Requieren atención" })).toHaveCount(0);
    await expect(principal(page).getByText(/al menos una competencia en nivel Básico/)).toHaveCount(0);
    await sinDesborde(page);

    // The first row of the map is the highest promedio; its carnet opens the Reporte del participante.
    const primero = mapa.getByRole("rowheader").first().getByRole("link");
    const etiqueta = (await primero.textContent())!.trim();
    const href = await primero.getAttribute("href");
    expect(href).toMatch(/^\/reportes\/consolidado\/P\d{2}$/);
    const id = href!.split("/").at(-1)!;
    await page.goto(href!);

    await expect(principal(page).getByRole("heading", { level: 1, name: etiqueta })).toBeVisible();
    await expect(principal(page).getByText(/^El promedio entre competencias es \d{1,3} \(/)).toBeVisible();
    await expect(principal(page).getByText("Competencias evaluadas", { exact: true })).toBeVisible();
    const tarjetas = principal(page).locator(".tarjeta-competencia");
    await expect(tarjetas).toHaveCount(competenciasDeJornada("manana").length);
    for (const c of disponibles("manana")) {
      await expect(principal(page).getByRole("link", { name: `Ver reporte individual de ${c.nombre}` })).toHaveAttribute(
        "href",
        `/reportes/${c.id}/${id}`,
      );
    }
    await sinDesborde(page);

    const volver = page.getByRole("navigation", { name: "Navegación principal" }).getByRole("link", { name: /^Volver a / });
    await expect(volver).toHaveAccessibleName("Volver a Reporte consolidado");

    // From a competencia's Reporte individual, back to all of this participant's competencias.
    const competencia = disponibles("manana")[0];
    await page.goto(`/reportes/${competencia.id}/${id}`);
    await expect(principal(page).getByRole("link", { name: "Ver todas sus competencias" })).toHaveAttribute(
      "href",
      `/reportes/consolidado/${id}`,
    );
  });

  test("un participante que no está en la lista responde 404", async ({ page }) => {
    await page.goto(`${RUTA}/P99`);
    await expect(principal(page).getByRole("heading", { level: 1, name: "Página no encontrada" })).toBeVisible();
    const mal = await page.goto(`${RUTA}/no-es-un-id`);
    expect(mal?.status()).toBe(404);
  });

  test("en la noche, el resumen marca «Sin plantilla» solo donde falta (desde v1.7, ninguna)", async ({ page }) => {
    expect((await page.request.post("/api/jornada", { data: { jornada: "noche" } })).status()).toBe(200);
    await page.goto(RUTA);
    await expect(principal(page).getByText("Todas las competencias · Jornada: Noche", { exact: true })).toBeVisible();
    const resumen = principal(page).getByRole("table", { name: "Resumen por competencia" });
    const sinPlantilla = competenciasDeJornada("noche").length - disponibles("noche").length;
    await expect(resumen.getByText("Sin plantilla en esta jornada", { exact: true })).toHaveCount(sinPlantilla);
  });
});

test("el rol evaluador no accede al reporte consolidado", async ({ page }) => {
  await iniciarSesion(page, "evaluador");
  expect((await page.request.get("/api/reportes/consolidado/csv")).status()).toBe(403);
  await page.goto(RUTA);
  await expect(page).toHaveURL(/\/acceso\?/);
  expect(new URL(page.url()).searchParams.get("motivo")).toBe("docente");
});
