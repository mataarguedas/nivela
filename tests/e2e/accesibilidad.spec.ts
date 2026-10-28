import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { esperarCalificacion, esperarHidratacion } from "./hidratacion";
import { iniciarSesion, type Rol } from "./sesion";
import { sinEnviosEnServidor } from "./servidor";

// Automated WCAG 2.2 A/AA scan (axe-core) of every screen, at phone width,
// in each browser project (PRD §13 → Accessibility). Charts are scanned once
// they have drawn. axe can't judge everything (focus order, meaningful
// labels); the component and flow specs cover those by hand.

const ETIQUETAS_WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function analizar(page: Page) {
  const resultado = await new AxeBuilder({ page }).withTags(ETIQUETAS_WCAG).analyze();
  const resumen = resultado.violations.map((v) => ({
    regla: v.id,
    impacto: v.impact,
    nodos: v.nodes.map((n) => n.target.join(" ")).slice(0, 5),
  }));
  expect(resumen).toEqual([]);
}

const PANTALLAS: { nombre: string; ruta: string; rol?: Rol; preparar?: (page: Page) => Promise<void> }[] = [
  { nombre: "Acceso", ruta: "/acceso" },
  { nombre: "Inicio", ruta: "/", rol: "evaluador" },
  { nombre: "Evaluador", ruta: "/adaptabilidad/evaluador", rol: "evaluador" },
  { nombre: "Participantes", ruta: "/adaptabilidad", rol: "evaluador" },
  {
    nombre: "Calificación",
    ruta: "/adaptabilidad/P01",
    rol: "evaluador",
    preparar: async (page) => {
      await esperarCalificacion(page);
      // Open the Jev panel too, so its fields are part of the scan.
      await page.getByText("¿No está seguro del nivel?").first().click();
    },
  },
  { nombre: "Reportes", ruta: "/reportes", rol: "docente" },
  {
    nombre: "Reporte general",
    ruta: "/reportes/adaptabilidad",
    rol: "docente",
    preparar: async (page) => {
      await expect(page.locator("figure svg.recharts-surface:visible").first()).toBeVisible();
    },
  },
  {
    nombre: "Reporte individual",
    ruta: "/reportes/adaptabilidad/P01",
    rol: "docente",
    preparar: async (page) => {
      await expect(page.locator("figure svg.recharts-surface:visible").first()).toBeVisible();
    },
  },
  { nombre: "No encontrado", ruta: "/ruta-inexistente", rol: "evaluador" },
  {
    nombre: "Admin",
    ruta: "/admin",
    rol: "admin",
    preparar: async (page) => {
      await esperarHidratacion(page, "form");
      // Open "Pegar lista" too, so its field is part of the scan. Read-only: nothing is saved.
      await page.getByRole("button", { name: "Pegar lista" }).click();
    },
  },
];

for (const pantalla of PANTALLAS) {
  test(`${pantalla.nombre} cumple WCAG 2.2 AA (axe)`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    if (pantalla.rol) {
      await iniciarSesion(page, pantalla.rol);
      await sinEnviosEnServidor(page);
      await page.goto("/");
      await page.evaluate(() => localStorage.setItem("nivela:v1:evaluador:adaptabilidad", "jimena-salgado"));
    }
    await page.goto(pantalla.ruta);
    await esperarHidratacion(page);
    await pantalla.preparar?.(page);
    await analizar(page);
  });
}
