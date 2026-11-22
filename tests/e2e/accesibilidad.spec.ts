import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { CUENTA_OTRO_EQUIPO, DOMINIO_PRUEBA, correoDePrueba } from "./cuentas";
import { abrirGraficosDetallados, esperarCalificacion, esperarHidratacion } from "./hidratacion";
import { iniciarSesion, type Rol } from "./sesion";
import { sinEnviosEnServidor } from "./servidor";

// Automated WCAG 2.2 A/AA scan (axe-core) of every screen, at phone width,
// in each browser project (PRD §13 → Accessibility). Charts are scanned once
// they have drawn. axe can't judge everything (focus order, meaningful
// labels); the component and flow specs cover those by hand.

const ETIQUETAS_WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function analizar(page: Page, { marcos = true }: { marcos?: boolean } = {}) {
  // @axe-core/playwright injects into every frame and waits on one it can't
  // script (sandbox=""), until the test times out; .options({ iframes: false })
  // doesn't stop it (and would drop withTags' runOnly). So such frames are
  // taken out of the page right before the scan.
  if (!marcos) await page.evaluate(() => document.querySelectorAll("iframe[sandbox]").forEach((f) => f.remove()));
  const resultado = await new AxeBuilder({ page }).withTags(ETIQUETAS_WCAG).analyze();
  const resumen = resultado.violations.map((v) => ({
    regla: v.id,
    impacto: v.impact,
    nodos: v.nodes.map((n) => n.target.join(" ")).slice(0, 5),
  }));
  expect(resumen).toEqual([]);
}

type Pantalla = {
  nombre: string;
  ruta: string;
  rol?: Rol;
  preparar?: (page: Page) => Promise<void>;
  /** false removes sandboxed iframes before the scan (see analizar). */
  marcos?: boolean;
};

const PANTALLAS: Pantalla[] = [
  { nombre: "Acceso", ruta: "/acceso" },
  { nombre: "Inicio", ruta: "/", rol: "evaluador" },
  { nombre: "Evaluador", ruta: "/adaptabilidad/evaluador", rol: "docente" },
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
      // Scan the simple charts and the detailed (Recharts) ones together.
      await abrirGraficosDetallados(page);
    },
  },
  {
    nombre: "Reporte individual",
    ruta: "/reportes/adaptabilidad/P01",
    rol: "docente",
    preparar: async (page) => {
      // Scan the simple charts and the detailed (Recharts) ones together.
      await abrirGraficosDetallados(page);
    },
  },
  {
    nombre: "Uso de la aplicación",
    ruta: "/reportes/uso",
    rol: "docente",
    preparar: async (page) => {
      await expect(page.getByRole("heading", { level: 1, name: "Uso de la aplicación" })).toBeVisible();
    },
  },
  {
    nombre: "Resumen del grupo (ambas jornadas)",
    ruta: "/reportes/adaptabilidad/grupo?jornada=ambas",
    rol: "docente",
    preparar: async (page) => {
      await expect(page.getByRole("heading", { name: "Resumen del grupo" })).toBeVisible();
    },
  },
  {
    // Read-only: the scan never opens the confirmation or sends anything.
    // The email preview is a sandboxed iframe holding the email's own HTML
    // (not app UI; tests/unit cover the template), so frames are skipped.
    nombre: "Enviar resultados",
    ruta: "/reportes/consolidado/enviar",
    rol: "docente",
    marcos: false,
    preparar: async (page) => {
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
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

// v1.2 states that only appear after an interaction (PRD §5.12, §5.13). None
// of them writes: an unknown email gets the code step and nothing is sent; an
// activated account's email only answers "contrasena"; the attendance dialog
// is scanned open and then cancelled.
test("Acceso · paso de contraseña cumple WCAG 2.2 AA (axe)", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/acceso");
  await esperarHidratacion(page, "form");
  await page.getByLabel("Correo electrónico").fill(correoDePrueba(CUENTA_OTRO_EQUIPO));
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByLabel("Contraseña")).toBeVisible();
  await analizar(page);
});

test("Acceso · paso del código cumple WCAG 2.2 AA (axe)", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/acceso");
  await esperarHidratacion(page, "form");
  await page.getByLabel("Correo electrónico").fill(`fuera-de-la-lista@${DOMINIO_PRUEBA}`);
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByLabel("Código de verificación")).toBeVisible();
  await analizar(page);
});

test("Diálogo «Marcar ausente» cumple WCAG 2.2 AA (axe)", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await iniciarSesion(page, "evaluador");
  // Whatever the dev database holds, P03 reads as not sent and present.
  await sinEnviosEnServidor(page);
  await page.goto("/adaptabilidad/P03");
  await esperarCalificacion(page);
  await page.getByRole("main").getByRole("button", { name: "Marcar ausente" }).click();
  const dialogo = page.getByRole("dialog", { name: "Marcar ausente" });
  await expect(dialogo).toBeVisible();
  await analizar(page);
  await dialogo.getByRole("button", { name: "Cancelar" }).click();
  await expect(dialogo).toBeHidden();
});

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
    await analizar(page, { marcos: pantalla.marcos });
  });
}
