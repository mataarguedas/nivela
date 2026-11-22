import { expect, test, type Page } from "@playwright/test";
import { competenciasDeJornada } from "../../src/config/competencias";
import { competenciaDisponible, equipoDeCompetencia } from "../../src/config/equipos";
import { iniciarSesion } from "./sesion";

// "Uso de la aplicación" (PRD §11.6, v1.14): which evaluators activated their
// account and which are rating, every team of the docente's jornada. Data:
// `npm run db:seed` plus the fake accounts of `npm run cuentas:prueba` (the
// global setup). Counts depend on what other specs activate, so this checks
// the structure: one section per team (named by config, never a hard-coded
// number), every member listed, and no email anywhere on the page.

const RUTA = "/reportes/uso";

/** The visible page (Cache Components keeps the previous route mounted but hidden). */
function principal(page: Page) {
  return page.locator("main").filter({ visible: true });
}

async function sinDesborde(page: Page) {
  const desborde = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(desborde).toBeLessThanOrEqual(0);
}

test.describe("como docente", () => {
  test.beforeEach(async ({ page }) => {
    await iniciarSesion(page, "docente");
  });

  test("abre el uso de la aplicación desde Reportes: indicadores, pendientes y un apartado por equipo", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/reportes");
    await principal(page).getByRole("link", { name: /^Uso de la aplicación/ }).click();
    await expect(page).toHaveURL(new RegExp(`${RUTA}$`));

    const vista = principal(page);
    await expect(vista.getByRole("heading", { level: 1, name: "Uso de la aplicación" })).toBeVisible();
    await expect(vista.getByText("Evaluadores de todos los equipos · Jornada: Mañana", { exact: true })).toBeVisible();
    for (const kpi of ["Cuentas activadas", "Ya evalúan", "Completaron", "Sin activar"]) {
      await expect(vista.getByText(kpi, { exact: true }).first()).toBeVisible();
    }
    await expect(vista.getByText(/^\d+ de \d+ evaluadores activaron su cuenta; \d+ ya evalúan y \d+ completaron/)).toBeVisible();
    await expect(vista.getByRole("heading", { name: "Aún no activan su cuenta" })).toBeVisible();

    // One section per team of the jornada, titled from config, listing every member.
    for (const competencia of competenciasDeJornada("manana").filter((c) => competenciaDisponible("manana", c.id))) {
      const equipo = equipoDeCompetencia("manana", competencia.id)!;
      const seccion = vista.getByRole("region", { name: `Equipo ${equipo.numero} · ${competencia.nombre}` });
      await expect(seccion).toBeVisible();
      // At 375 px each member is a card in a list.
      const tarjetas = seccion.getByRole("list").getByRole("listitem");
      await expect(tarjetas).toHaveCount(equipo.integrantes.length);
      await expect(tarjetas.first()).toContainText(/Sin activar|Sin evaluaciones|Evaluando|Completó/);
    }

    // Account status only: never an email.
    expect(await vista.innerText()).not.toContain("@");
    await sinDesborde(page);
  });

  test("en escritorio cada equipo es una tabla con activación, último ingreso y última evaluación", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(RUTA);
    const tabla = principal(page).getByRole("table").first();
    await expect(tabla.getByRole("columnheader")).toHaveText([
      "Nombre",
      "Curso",
      "Cuenta",
      "Activada el",
      "Último ingreso",
      "Última evaluación",
      "Enviadas",
      "Uso",
    ]);
  });
});

test("el rol evaluador no accede al uso de la aplicación", async ({ page }) => {
  await iniciarSesion(page, "evaluador");
  await page.goto(RUTA);
  await expect(page).toHaveURL(/\/acceso\?/);
  expect(new URL(page.url()).searchParams.get("motivo")).toBe("docente");
});
