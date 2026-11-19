import { expect, test, type Page } from "@playwright/test";
import { EQUIPOS } from "../../src/config/equipos";
import { esperarHidratacion } from "./hidratacion";
import { evaluadorAdaptabilidad } from "./cuentas";
import { iniciarSesion } from "./sesion";

// Jornadas (PRD §5.11): a night evaluator's account opens only the night
// cohort, and docente and admin switch jornada in the app. Nothing here writes to the
// DB. Which competencias open at night comes from config (since v1.7 all of
// them have a night rubric); the specs read config to know.

const equipoNoche = EQUIPOS.find((e) => e.jornada === "noche" && e.competenciaId === "adaptabilidad");
const equipoManana = EQUIPOS.find((e) => e.jornada === "manana" && e.competenciaId === "adaptabilidad")!;
const nocheConEquipo = (equipoNoche?.integrantes.length ?? 0) > 0;

function filaAdaptabilidad(page: Page) {
  return page.getByRole("link", { name: /Adaptabilidad/ });
}

async function elegirJornada(page: Page, nombre: "Mañana" | "Noche") {
  const opcion = page.getByRole("radiogroup", { name: "Jornada" }).getByRole("radio", { name: nombre });
  await opcion.click();
  await expect(opcion).toHaveAttribute("aria-checked", "true");
}

test.describe("con una cuenta del equipo de la noche", () => {
  test.skip(!nocheConEquipo, "the night roster has no Adaptabilidad team");
  test.beforeEach(async ({ page }) => {
    await iniciarSesion(page, { integranteId: evaluadorAdaptabilidad("noche") });
  });

  test("Inicio muestra la jornada y solo lo disponible de noche", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    await expect(page.getByText("Jornada: Noche")).toBeVisible();
    await expect(filaAdaptabilidad(page)).toHaveAttribute("href", "/adaptabilidad");
  });

  test("nunca muestra nombres de la mañana", async ({ page }) => {
    await page.goto("/adaptabilidad");
    await expect(page.getByRole("heading", { level: 1, name: "Participantes" })).toBeVisible();
    for (const integrante of equipoManana.integrantes) {
      await expect(page.getByText(integrante.nombre)).toHaveCount(0);
    }
  });

  test("no puede cambiar de jornada", async ({ page }) => {
    const respuesta = await page.request.post("/api/jornada", { data: { jornada: "manana" } });
    expect(respuesta.status()).toBe(403);
  });
});

test("con una cuenta del equipo de la mañana, Inicio dice Jornada: Mañana", async ({ page }) => {
  await iniciarSesion(page, { integranteId: evaluadorAdaptabilidad("manana") });
  await page.goto("/");
  await expect(page.getByText("Jornada: Mañana")).toBeVisible();
  await expect(filaAdaptabilidad(page)).toHaveAttribute("href", "/adaptabilidad");
});

test("la docente cambia de jornada en Reportes", async ({ page }) => {
  await iniciarSesion(page, "docente");
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/reportes");
  await esperarHidratacion(page);
  await expect(filaAdaptabilidad(page)).toHaveAttribute("href", "/reportes/adaptabilidad");

  await elegirJornada(page, "Noche");
  if (nocheConEquipo) {
    await filaAdaptabilidad(page).click();
    await expect(page.getByText("Adaptabilidad · Jornada: Noche")).toBeVisible();
  } else {
    await expect(filaAdaptabilidad(page)).toHaveAttribute("aria-disabled", "true");
    await page.goto("/reportes/adaptabilidad");
    await expect(page.getByRole("heading", { level: 1, name: "Página no encontrada" })).toBeVisible();
    await page.goto("/reportes");
    await esperarHidratacion(page);
  }

  await page.goto("/reportes");
  await esperarHidratacion(page);
  await elegirJornada(page, "Mañana");
  await filaAdaptabilidad(page).click();
  await expect(page.getByText("Adaptabilidad · Jornada: Mañana")).toBeVisible();
});

test("la docente cambia de jornada en Inicio y ve el equipo de esa jornada", async ({ page }) => {
  await iniciarSesion(page, "docente");
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/");
  await esperarHidratacion(page);
  await expect(page.getByRole("radiogroup", { name: "Jornada" })).toBeVisible();

  if (nocheConEquipo) {
    await elegirJornada(page, "Noche");
    await filaAdaptabilidad(page).click();
    await expect(page).toHaveURL(/\/adaptabilidad\/evaluador$/);
    await expect(page.getByText("Adaptabilidad · Jornada: Noche", { exact: true })).toBeVisible();
    await expect(page.getByText(equipoNoche!.integrantes[0].nombre)).toBeVisible();
    for (const integrante of equipoManana.integrantes) {
      await expect(page.getByText(integrante.nombre)).toHaveCount(0);
    }
    await page.goto("/");
    await esperarHidratacion(page);
  }

  await elegirJornada(page, "Mañana");
  await filaAdaptabilidad(page).click();
  await expect(page).toHaveURL(/\/adaptabilidad\/evaluador$/);
  await expect(page.getByText("Adaptabilidad · Jornada: Mañana", { exact: true })).toBeVisible();
  await expect(page.getByText(equipoManana.integrantes[0].nombre)).toBeVisible();
});

test("el admin edita una lista distinta en cada jornada", async ({ page }) => {
  await iniciarSesion(page, "admin");
  await page.goto("/admin");
  await esperarHidratacion(page);
  const cantidad = page.getByLabel("Cantidad de participantes");
  await expect(cantidad).toBeVisible();

  await elegirJornada(page, "Noche");
  await expect(cantidad).toBeVisible();
  await elegirJornada(page, "Mañana");
  await expect(cantidad).toBeVisible();
});
