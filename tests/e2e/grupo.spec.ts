import { expect, test, type Page } from "@playwright/test";
import { equipoDeCompetencia } from "../../src/config/equipos";
import { esperarHidratacion } from "./hidratacion";
import { iniciarSesion } from "./sesion";

// Resumen del grupo (PRD §11.3, §15.16) against the dev database filled by
// `npm run db:seed` (both jornadas' Adaptabilidad teams). Assertions are about
// structure, not seeded values. Team numbers and sizes come from config:
// the columns compare morning and night by competencia, never by number.

const RUTA = "/reportes/adaptabilidad/grupo";

/**
 * The current page. With Cache Components, Next keeps the previous route
 * mounted but hidden (<Activity>), so the Reporte general's KPI labels and
 * subtitle are still in the DOM after navigating here: match visible only.
 */
function principal(page: Page) {
  return page.locator("main").filter({ visible: true });
}

function selector(page: Page) {
  return principal(page).getByRole("radiogroup", { name: "Jornada" });
}

/** The page's subtitle ("Adaptabilidad · Jornada: Mañana"). */
function subtitulo(page: Page, texto: string) {
  return principal(page).getByText(texto, { exact: true });
}

async function sinDesborde(page: Page) {
  const desborde = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(desborde).toBeLessThanOrEqual(0);
}

test.describe("como docente", () => {
  test.beforeEach(async ({ page }) => {
    await iniciarSesion(page, "docente");
  });

  test("abre el resumen desde el Reporte general, cambia a «Ambas jornadas» y ve la comparación", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/reportes/adaptabilidad");
    await principal(page).getByRole("link", { name: "Resumen del grupo" }).click();

    // Default: the session's jornada (a docente session starts in the morning).
    await expect(page).toHaveURL(new RegExp(`${RUTA}$`));
    await expect(principal(page).getByRole("heading", { level: 1, name: "Resumen del grupo" })).toBeVisible();
    await expect(subtitulo(page, "Adaptabilidad · Jornada: Mañana")).toBeVisible();
    await expect(principal(page).getByText("Aún no hay evaluaciones enviadas"), "run `npm run db:seed` first").toHaveCount(0);
    await expect(selector(page).getByRole("radio")).toHaveText(["Mañana", "Noche", "Ambas jornadas"]);
    await expect(selector(page).getByRole("radio", { name: "Mañana" })).toHaveAttribute("aria-checked", "true");

    await expect(principal(page).getByText("Puntaje del grupo", { exact: true })).toBeVisible();
    await expect(principal(page).getByText("Evaluadores completos", { exact: true })).toBeVisible();
    await expect(principal(page).getByText(/^El grupo alcanzó un nivel (Básico|Intermedio|Avanzado|Experto) \(\d{1,3}\)\. /)).toBeVisible();
    for (const titulo of ["Participantes por nivel", "Puntaje promedio por indicador"]) {
      await expect(principal(page).getByRole("heading", { level: 2, name: titulo })).toBeVisible();
    }
    await expect(principal(page).locator('figure[aria-labelledby="por-indicador-titulo por-indicador-mensaje"] .barras-horizontales li')).toHaveCount(4);
    await expect(principal(page).getByRole("heading", { level: 2, name: "Mañana y Noche" })).toHaveCount(0);
    await expect(principal(page).getByRole("button", { name: "Imprimir o guardar PDF" })).toBeVisible();
    await sinDesborde(page);

    // "Ambas jornadas": the query param changes, the session doesn't.
    await esperarHidratacion(page, '[role="radiogroup"]');
    await selector(page).getByRole("radio", { name: "Ambas jornadas" }).click();
    await expect(page).toHaveURL(new RegExp(`${RUTA}\\?jornada=ambas$`));
    await expect(subtitulo(page, "Adaptabilidad · Ambas jornadas")).toBeVisible();
    await expect(selector(page).getByRole("radio", { name: "Ambas jornadas" })).toHaveAttribute("aria-checked", "true");

    const manana = equipoDeCompetencia("manana", "adaptabilidad")!;
    const noche = equipoDeCompetencia("noche", "adaptabilidad")!;
    const tabla = principal(page).getByRole("table", { name: "Mañana y Noche" });
    await expect(tabla.getByRole("columnheader")).toHaveText([
      "Medida",
      `Mañana · Equipo ${manana.numero}`,
      `Noche · Equipo ${noche.numero}`,
    ]);
    // 8 KPI rows + 4 indicator rows by position (since v1.7 each jornada has its own
    // Adaptabilidad rubric, so each cell names its own indicator), plus the header.
    await expect(tabla.getByRole("row")).toHaveCount(13);
    // Each column counts its own team's evaluators.
    const completos = tabla.getByRole("row", { name: /^Evaluadores completos/ }).getByRole("cell");
    await expect(completos.nth(0)).toHaveText(new RegExp(`^\\d+ de ${manana.integrantes.length}$`));
    await expect(completos.nth(1)).toHaveText(new RegExp(`^\\d+ de ${noche.integrantes.length}$`));
    await sinDesborde(page);

    // "Volver" goes to the Reporte general, still in the session's jornada.
    const volver = page.getByRole("navigation", { name: "Navegación principal" }).getByRole("link", { name: /^Volver a / });
    await expect(volver).toHaveAccessibleName("Volver a Reporte general");
    await volver.click();
    await expect(page).toHaveURL(/\/reportes\/adaptabilidad$/);
    await expect(subtitulo(page, "Adaptabilidad · Jornada: Mañana")).toBeVisible();
  });

  test("un ?jornada= inválido usa la jornada de la sesión", async ({ page }) => {
    expect((await page.request.post("/api/jornada", { data: { jornada: "noche" } })).status()).toBe(200);
    await page.goto(`${RUTA}?jornada=tarde`);
    await expect(subtitulo(page, "Adaptabilidad · Jornada: Noche")).toBeVisible();
    await expect(selector(page).getByRole("radio", { name: "Noche" })).toHaveAttribute("aria-checked", "true");

    // Since v1.7 every competencia has a rubric in both jornadas, so each offers "Ambas jornadas".
    await page.goto("/reportes/pensamiento-critico/grupo?jornada=ambas");
    await expect(subtitulo(page, "Pensamiento crítico y analítico · Ambas jornadas")).toBeVisible();
    await expect(selector(page).getByRole("radio")).toHaveText(["Mañana", "Noche", "Ambas jornadas"]);
  });
});

test("el rol evaluador no accede al resumen del grupo", async ({ page }) => {
  await iniciarSesion(page, "evaluador");
  const api = await page.request.get("/api/reportes/adaptabilidad/grupo?jornada=ambas");
  expect(api.status()).toBe(403);

  await page.goto(`${RUTA}?jornada=ambas`);
  await expect(page).toHaveURL(/\/acceso\?/);
  expect(new URL(page.url()).searchParams.get("motivo")).toBe("docente");
});
