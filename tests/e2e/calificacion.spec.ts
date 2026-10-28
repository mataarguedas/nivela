import { expect, test, type Page } from "@playwright/test";
import { esperarCalificacion, esperarHidratacion } from "./hidratacion";
import { iniciarSesion } from "./sesion";
import { sinEnviosEnServidor } from "./servidor";

// Rating screen (PRD §5.5, FR-5, FR-6, §15.3–§15.4).

const CLAVE_EVALUADOR = "nivela:v1:evaluador:adaptabilidad";
const CLAVE_BORRADOR = "nivela:v1:adaptabilidad:jimena-salgado";

function grupo(page: Page, n: number) {
  return page.getByRole("radiogroup", { name: new RegExp(`^Indicador ${n}\\.`) });
}

function radio(page: Page, n: number, nivel: string) {
  return grupo(page, n).getByRole("radio", { name: nivel, exact: true });
}

function observacion(page: Page, n: number) {
  return page.getByRole("region", { name: new RegExp(`^Indicador ${n}\\.`) }).getByRole("textbox", { name: "Observaciones (opcional)" });
}

function barra(page: Page) {
  return page.getByRole("region", { name: "Envío" });
}

async function borradorGuardado(page: Page) {
  return page.evaluate((clave) => JSON.parse(localStorage.getItem(clave) ?? "null"), CLAVE_BORRADOR);
}

/** Selects the evaluator directly in storage and opens a participant. */
async function abrir(page: Page, participante = "P01") {
  await page.goto("/");
  await page.evaluate((clave) => localStorage.setItem(clave, "jimena-salgado"), CLAVE_EVALUADOR);
  await page.goto(`/adaptabilidad/${participante}`);
  await esperarCalificacion(page);
}

test.beforeEach(async ({ page }) => {
  await iniciarSesion(page);
  await sinEnviosEnServidor(page);
});

test("calificar 3 de 4, recargar, conservar y habilitar el envío con el 4.º", async ({ page }) => {
  await abrir(page);
  await expect(page.getByRole("heading", { level: 1, name: "Participante 01" })).toBeVisible();
  const enviar = barra(page).getByRole("button", { name: "Enviar evaluación" });
  await expect(barra(page)).toContainText("Faltan 4 indicadores por calificar");
  await expect(enviar).toBeDisabled();

  await radio(page, 1, "Avanzado").click();
  await radio(page, 2, "Básico").click();
  await radio(page, 3, "Experto").click();
  await observacion(page, 1).fill("Adaptó su método al recibir el nuevo procedimiento.");
  await expect(barra(page)).toContainText("Falta 1 indicador por calificar");
  await expect(enviar).toBeDisabled();

  // Wait for the debounced write before reloading.
  await expect.poll(async () => (await borradorGuardado(page))?.participantes?.P01?.calificaciones?.["adaptabilidad-1"]?.observacion).toBe(
    "Adaptó su método al recibir el nuevo procedimiento.",
  );
  await page.reload();
  await esperarCalificacion(page);

  await expect(radio(page, 1, "Avanzado")).toHaveAttribute("aria-checked", "true");
  await expect(radio(page, 2, "Básico")).toHaveAttribute("aria-checked", "true");
  await expect(radio(page, 3, "Experto")).toHaveAttribute("aria-checked", "true");
  await expect(observacion(page, 1)).toHaveValue("Adaptó su método al recibir el nuevo procedimiento.");
  await expect(enviar).toBeDisabled();

  await radio(page, 4, "Intermedio").click();
  await expect(enviar).toBeEnabled();
  await expect(barra(page)).not.toContainText("Falta");

  await page.getByRole("link", { name: "Volver a Participantes" }).click();
  await expect(page).toHaveURL(/\/adaptabilidad$/);
  const fila = page.getByRole("listitem").filter({ hasText: "Participante 01" });
  await expect(fila.getByText("Completado")).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "Participante 02" }).getByText("Pendiente")).toBeVisible();
});

test("un nivel elegido a mano se guarda con origen manual; En progreso en la lista", async ({ page }) => {
  await abrir(page, "P03");
  await radio(page, 2, "Experto").click();
  // Keyboard: arrows move the selection inside the group.
  await radio(page, 2, "Experto").press("ArrowUp");
  await expect(radio(page, 2, "Avanzado")).toHaveAttribute("aria-checked", "true");

  await expect.poll(async () => (await borradorGuardado(page))?.participantes?.P03?.calificaciones?.["adaptabilidad-2"]).toEqual({
    nivel: 3,
    origen: "manual",
  });
  await page.goto("/adaptabilidad");
  await expect(page.getByRole("listitem").filter({ hasText: "Participante 03" }).getByText("En progreso")).toBeVisible();
});

test("la definición se despliega y la nota técnica siempre está visible", async ({ page }) => {
  await abrir(page);
  await expect(page.getByText(/Recuerde enfocarse en la evaluación exclusiva/)).toBeVisible();
  const definicion = page.getByText(/^La adaptabilidad es la capacidad/);
  await expect(definicion).toBeHidden();
  await page.getByRole("button", { name: "Definición de la competencia" }).click();
  await expect(definicion).toBeVisible();
  await expect(page.getByText("Fuente: Govern de les Illes Balears, s. f.")).toBeVisible();
});

test("navega al participante anterior y al siguiente", async ({ page }) => {
  await abrir(page, "P01");
  const otros = page.getByRole("navigation", { name: "Otros participantes" });
  await expect(otros.getByRole("link", { name: /Anterior/ })).toHaveCount(0);
  await otros.getByRole("link", { name: "Siguiente: Participante 02" }).click();
  await expect(page).toHaveURL(/\/adaptabilidad\/P02$/);
  await expect(page.getByRole("heading", { level: 1, name: "Participante 02" })).toBeVisible();
  await otros.getByRole("link", { name: "Anterior: Participante 01" }).click();
  await expect(page).toHaveURL(/\/adaptabilidad\/P01$/);

  await page.goto("/adaptabilidad/P20");
  await expect(page.getByRole("navigation", { name: "Otros participantes" }).getByRole("link", { name: /Siguiente/ })).toHaveCount(0);
});

test("participantes desconocidos dan 404", async ({ page }) => {
  for (const ruta of ["/adaptabilidad/P99", "/adaptabilidad/no-existe", "/pensamiento-critico/P01"]) {
    const respuesta = await page.goto(ruta);
    expect(respuesta?.status(), ruta).toBe(404);
    await expect(page.getByRole("heading", { level: 1, name: "Página no encontrada" })).toBeVisible();
  }
});

test("sin evaluador seleccionado redirige a la selección", async ({ page }) => {
  await page.goto("/adaptabilidad/P01");
  await expect(page).toHaveURL(/\/adaptabilidad\/evaluador$/);
});

test("a 375 px: sin desplazamiento horizontal, sin zoom en iOS y la barra no tapa el último campo", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await abrir(page);

  const desborde = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(desborde).toBeLessThanOrEqual(0);

  const fuentesPequenas = await page.evaluate(() =>
    Array.from(document.querySelectorAll("input, textarea, select"))
      .map((el) => parseFloat(getComputedStyle(el).fontSize))
      .filter((tamano) => tamano < 16),
  );
  expect(fuentesPequenas).toEqual([]);

  const pequenos = await page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>("main a, main button, main [role='radio']"))
      .filter((el) => el.offsetParent !== null)
      .map((el) => ({ texto: el.textContent?.trim().slice(0, 30), caja: el.getBoundingClientRect() }))
      .filter(({ caja }) => caja.height < 44 || caja.width < 44)
      .map(({ texto, caja }) => `${texto} (${Math.round(caja.width)}×${Math.round(caja.height)})`),
  );
  expect(pequenos).toEqual([]);

  const conSombra = await page.evaluate(
    () => Array.from(document.querySelectorAll("*")).filter((el) => getComputedStyle(el).boxShadow !== "none").length,
  );
  expect(conSombra).toBe(0);

  // Scrolled to the end, the last field and the participant navigation sit above the bar.
  // Scroll and measure in one synchronous step, so a late scroll reset from the
  // dev server can't land in between.
  const alFinal = await page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight);
    const textareas = document.querySelectorAll("textarea");
    const abajo = (el: Element) => el.getBoundingClientRect().bottom;
    const barraArriba = document.querySelector("[aria-label='Envío']")!.getBoundingClientRect().top;
    return {
      campo: abajo(textareas[textareas.length - 1]) - barraArriba,
      navegacion: abajo(document.querySelector("nav[aria-label='Otros participantes']")!) - barraArriba,
    };
  });
  expect(alFinal.campo).toBeLessThanOrEqual(0);
  expect(alFinal.navegacion).toBeLessThanOrEqual(0);

  // Focus is never left hidden behind the bar (WCAG 2.4.11), WebKit included:
  // focus a field below the fold, then tab to the next level option.
  async function tapadoPorLaBarra(): Promise<number> {
    return page.evaluate(() => {
      const enfocado = document.activeElement!.getBoundingClientRect();
      const barra = document.querySelector("[aria-label='Envío']")!.getBoundingClientRect();
      return enfocado.bottom - barra.top;
    });
  }
  // The bar hydrates after the radiogroups, and its focus handler is attached
  // in an effect: focusing earlier tested nothing (a WebKit flake). Wait for
  // the bar's hydration, then one frame for passive effects to flush.
  await esperarHidratacion(page, "[aria-label='Envío']");
  await page.evaluate(() => new Promise((listo) => requestAnimationFrame(() => setTimeout(listo))));
  await page.evaluate(() => window.scrollTo(0, 0));
  await observacion(page, 2).focus();
  await expect.poll(tapadoPorLaBarra).toBeLessThanOrEqual(0);
  await radio(page, 3, "Básico").focus();
  await expect.poll(tapadoPorLaBarra).toBeLessThanOrEqual(0);
});
