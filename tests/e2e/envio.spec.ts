import { expect, test, type Page } from "@playwright/test";
import { esperarCalificacion, esperarHidratacion } from "./hidratacion";
import { iniciarSesion } from "./sesion";
import { sinEnviosEnServidor } from "./servidor";

// Submission (PRD §5.7, §15.1): the full happy path against the real API and
// the dev database, plus the failure and expired-session states with the POST
// mocked. The happy path writes one evaluation per browser project, each with
// its own evaluator so parallel projects never share a row; re-running it
// just updates that row.

const EVALUADOR_POR_PROYECTO: Record<string, { id: string; nombre: string }> = {
  "iPhone 13": { id: "allison-campos-morera", nombre: "Allison Campos Morera" },
  "Pixel 7": { id: "angelina-mata-arguedas", nombre: "Angelina Mata Arguedas" },
  Firefox: { id: "kristel-barrantes-lopez", nombre: "Kristel Barrantes López" },
};

function radio(page: Page, n: number, nivel: string) {
  return page.getByRole("radiogroup", { name: new RegExp(`^Indicador ${n}\\.`) }).getByRole("radio", { name: nivel, exact: true });
}

function barra(page: Page) {
  return page.getByRole("region", { name: "Envío" });
}

function fila(page: Page, etiqueta: string) {
  return page.getByRole("listitem").filter({ hasText: etiqueta });
}

function toast(page: Page) {
  return page.getByRole("status").filter({ hasText: "Evaluación enviada" });
}

async function calificarTodo(page: Page, niveles: [string, string, string, string]) {
  for (const [i, nivel] of niveles.entries()) await radio(page, i + 1, nivel).click();
}

test("camino completo: código → Adaptabilidad → evaluador → 4 indicadores → Enviado", async ({ page }, info) => {
  const evaluador = EVALUADOR_POR_PROYECTO[info.project.name];
  test.skip(!evaluador, `no evaluator assigned to project ${info.project.name}`);
  const inicio = Date.now();

  await iniciarSesion(page);
  await page.goto("/");
  await esperarHidratacion(page);
  await page.getByRole("link", { name: /Adaptabilidad/ }).click();
  await expect(page).toHaveURL(/\/adaptabilidad\/evaluador$/);
  await esperarHidratacion(page);
  await page.getByRole("button", { name: evaluador.nombre }).click();
  await expect(page).toHaveURL(/\/adaptabilidad$/);

  await page.getByRole("link", { name: /Participante 20/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Participante 20" })).toBeVisible();
  await esperarCalificacion(page);
  await calificarTodo(page, ["Avanzado", "Intermedio", "Experto", "Avanzado"]);
  await page
    .getByRole("region", { name: /^Indicador 1\./ })
    .getByRole("textbox", { name: "Observaciones (opcional)" })
    .fill("Adaptó su método al recibir el nuevo procedimiento.");

  await barra(page).getByRole("button", { name: "Enviar evaluación" }).click();
  await expect(toast(page)).toBeVisible();
  await expect(page).toHaveURL(/\/adaptabilidad$/);
  await expect(fila(page, "Participante 20").getByText("Enviado")).toBeVisible();
  await expect(page.getByText(/^\d+ de 20 enviadas$/)).toBeVisible();

  // The server has it, with a fresh updated_at.
  const consulta = await page.request.get(`/api/evaluaciones?competencia=adaptabilidad&evaluador=${evaluador.id}`);
  expect(consulta.status()).toBe(200);
  const { evaluaciones } = (await consulta.json()) as { evaluaciones: { participanteId: string; actualizadoEn: string }[] };
  const enviada = evaluaciones.find((e) => e.participanteId === "P20");
  expect(enviada).toBeDefined();
  expect(Date.parse(enviada!.actualizadoEn)).toBeGreaterThan(inicio - 60_000);

  // Editing after sending: back to Completado until it is sent again.
  await fila(page, "Participante 20").getByRole("link").click();
  await esperarCalificacion(page);
  await radio(page, 2, "Avanzado").click();
  await page.getByRole("link", { name: "Volver a Participantes" }).click();
  await expect(fila(page, "Participante 20").getByText("Completado")).toBeVisible();

  await fila(page, "Participante 20").getByRole("link").click();
  await esperarCalificacion(page);
  await barra(page).getByRole("button", { name: "Enviar evaluación" }).click();
  await expect(page).toHaveURL(/\/adaptabilidad$/);
  await expect(fila(page, "Participante 20").getByText("Enviado")).toBeVisible();

  // Without the local draft (another device, or Borrar todo) the status comes from the server.
  await page.evaluate((clave) => localStorage.removeItem(clave), `nivela:v1:adaptabilidad:${evaluador.id}`);
  await page.reload();
  await expect(fila(page, "Participante 20").getByText("Enviado")).toBeVisible();
});

test.describe("con el envío simulado", () => {
  test.beforeEach(async ({ page }) => {
    await iniciarSesion(page);
    await sinEnviosEnServidor(page);
    await page.goto("/");
    await page.evaluate(() => localStorage.setItem("nivela:v1:evaluador:adaptabilidad", "jimena-salgado"));
  });

  test("un fallo conserva las respuestas y ofrece Reintentar", async ({ page }) => {
    let intentos = 0;
    await page.route("**/api/evaluaciones", async (ruta) => {
      if (ruta.request().method() !== "POST") return ruta.fallback();
      intentos += 1;
      if (intentos === 1) return ruta.fulfill({ status: 500, json: { error: "No se pudo guardar la evaluación." } });
      await ruta.fulfill({ json: { id: "simulada", actualizadoEn: new Date().toISOString() } });
    });

    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/adaptabilidad/P07");
    await esperarCalificacion(page);
    await calificarTodo(page, ["Básico", "Intermedio", "Avanzado", "Experto"]);
    await barra(page).getByRole("button", { name: "Enviar evaluación" }).click();

    await expect(barra(page).getByRole("alert")).toHaveText(
      "No se pudo enviar. Sus respuestas siguen guardadas en este dispositivo.",
    );
    await expect(page).toHaveURL(/\/adaptabilidad\/P07$/);
    await expect(radio(page, 4, "Experto")).toHaveAttribute("aria-checked", "true");

    // At 375 px the longer message fits: no horizontal scroll, a full-size button.
    const desborde = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(desborde).toBeLessThanOrEqual(0);
    const caja = await barra(page).getByRole("button", { name: "Reintentar" }).boundingBox();
    expect(caja!.height).toBeGreaterThanOrEqual(44);
    expect(caja!.x + caja!.width).toBeLessThanOrEqual(375);

    await barra(page).getByRole("button", { name: "Reintentar" }).click();
    await expect(toast(page)).toBeVisible();
    await expect(page).toHaveURL(/\/adaptabilidad$/);
    await expect(fila(page, "Participante 07").getByText("Enviado")).toBeVisible();
    expect(intentos).toBe(2);
  });

  test("una sesión expirada lleva a /acceso y vuelve al participante", async ({ page }) => {
    await page.route("**/api/evaluaciones", (ruta) =>
      ruta.request().method() === "POST"
        ? ruta.fulfill({ status: 401, json: { error: "Debe ingresar el código de acceso para continuar." } })
        : ruta.fallback(),
    );
    await page.goto("/adaptabilidad/P08");
    await esperarCalificacion(page);
    await calificarTodo(page, ["Básico", "Básico", "Básico", "Básico"]);
    await barra(page).getByRole("button", { name: "Enviar evaluación" }).click();

    await expect(page).toHaveURL(/\/acceso\?/);
    const url = new URL(page.url());
    expect(url.searchParams.get("next")).toBe("/adaptabilidad/P08");
    expect(url.searchParams.get("motivo")).toBe("expirada");
    await expect(page.getByText("Su sesión expiró. Ingrese el código nuevamente.")).toBeVisible();
  });
});
