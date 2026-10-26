import { expect, test, type Page, type Request } from "@playwright/test";
import { esperarCalificacion } from "./hidratacion";
import { iniciarSesion } from "./sesion";
import { sinEnviosEnServidor } from "./servidor";

// Jev suggestion panel (PRD §5.6, §15.5, §15.6) with POST /api/jev mocked:
// the normal, low-confidence, off-topic and error states, nothing applied
// without a tap, what the request carries, and how an applied suggestion
// reaches the submission.

const CLAVE_EVALUADOR = "nivela:v1:evaluador:adaptabilidad";
const TEXTO = "Apenas recibió el nuevo procedimiento, reorganizó por su cuenta la forma de revisar las solicitudes.";

const NORMAL = {
  nivelSugerido: 3,
  probabilidades: { "1": 0.05, "2": 0.17, "3": 0.78, "4": 0 },
  confianza: 0.71,
  pertinencia: 0.93,
  baja_confianza: false,
  alternativa: null,
  modelo: "jev-1.13.0",
};

const BAJA_CONFIANZA = {
  ...NORMAL,
  nivelSugerido: 2,
  probabilidades: { "1": 0.05, "2": 0.5, "3": 0.42, "4": 0.03 },
  confianza: 0.38,
  baja_confianza: true,
  alternativa: 3,
};

function seccion(page: Page, n: number) {
  return page.getByRole("region", { name: new RegExp(`^Indicador ${n}\\.`) });
}

function radio(page: Page, n: number, nivel: string) {
  return page.getByRole("radiogroup", { name: new RegExp(`^Indicador ${n}\\.`) }).getByRole("radio", { name: nivel, exact: true });
}

function interruptor(page: Page, n: number) {
  return seccion(page, n).getByRole("button", { name: "¿No está seguro del nivel?" });
}

/** Mocks /api/jev with `cuerpo` (or a status) and records every request. */
async function simularJev(page: Page, respuesta: object | number) {
  const solicitudes: Request[] = [];
  await page.route("**/api/jev", async (ruta) => {
    solicitudes.push(ruta.request());
    if (typeof respuesta === "number") {
      return ruta.fulfill({ status: respuesta, json: { error: "No fue posible analizar el texto en este momento." } });
    }
    await ruta.fulfill({ json: respuesta });
  });
  return solicitudes;
}

async function analizar(page: Page, n: number, texto = TEXTO) {
  if ((await interruptor(page, n).getAttribute("aria-expanded")) !== "true") await interruptor(page, n).click();
  await seccion(page, n).getByRole("textbox", { name: "Describa lo que observó" }).fill(texto);
  await seccion(page, n).getByRole("button", { name: "Analizar" }).click();
}

test.beforeEach(async ({ page }) => {
  await iniciarSesion(page);
  await sinEnviosEnServidor(page);
  await page.goto("/");
  await page.evaluate((clave) => localStorage.setItem(clave, "jimena-salgado"), CLAVE_EVALUADOR);
});

test("normal: sugiere con porcentaje, no aplica nada hasta tocar, y el envío lleva origen ia", async ({ page }) => {
  const solicitudes = await simularJev(page, NORMAL);
  let envio: unknown = null;
  await page.route("**/api/evaluaciones", async (ruta) => {
    if (ruta.request().method() !== "POST") return ruta.fallback();
    envio = ruta.request().postDataJSON();
    await ruta.fulfill({ json: { id: "simulada", actualizadoEn: new Date().toISOString() } });
  });

  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/adaptabilidad/P11");
  await esperarCalificacion(page);
  await analizar(page, 1);

  const panel = seccion(page, 1);
  await expect(panel.getByText(/^Nivel sugerido: Avanzado · 78\s%$/)).toBeVisible();
  const probabilidades = panel.getByRole("list", { name: "Probabilidad por nivel" }).getByRole("listitem");
  await expect(probabilidades).toHaveCount(4);
  await expect(probabilidades.nth(1)).toHaveText(/Intermedio\s*17\s%/);
  await expect(panel.getByRole("checkbox", { name: "Usar este texto como observación" })).toBeChecked();

  // Nothing applied yet (PRD §5.6.3, §15.5).
  for (const nivel of ["Básico", "Intermedio", "Avanzado", "Experto"]) {
    await expect(radio(page, 1, nivel)).toHaveAttribute("aria-checked", "false");
  }

  // The request carries exactly these three fields: no participant, no names (§15.6).
  expect(solicitudes).toHaveLength(1);
  expect(solicitudes[0].postDataJSON()).toEqual({ competenciaId: "adaptabilidad", indicadorId: "adaptabilidad-1", texto: TEXTO });
  expect(JSON.stringify(solicitudes[0].headers())).not.toMatch(/typesafe/i);

  // At 375 px the result card fits: no horizontal scroll.
  const desborde = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(desborde).toBeLessThanOrEqual(0);

  await panel.getByRole("button", { name: "Aplicar sugerencia" }).click();
  await expect(radio(page, 1, "Avanzado")).toHaveAttribute("aria-checked", "true");
  await expect(panel.getByRole("textbox", { name: "Observaciones (opcional)" })).toHaveValue(TEXTO);
  await expect(panel.getByRole("status")).toHaveText("Nivel aplicado: Avanzado.");

  // Indicator 2: applied, then changed by hand → manual, metadata kept (PRD §5.6.7).
  await analizar(page, 2);
  await seccion(page, 2).getByRole("checkbox", { name: "Usar este texto como observación" }).uncheck();
  await seccion(page, 2).getByRole("button", { name: "Aplicar sugerencia" }).click();
  await expect(seccion(page, 2).getByRole("textbox", { name: "Observaciones (opcional)" })).toHaveValue("");
  await radio(page, 2, "Experto").click();
  await radio(page, 3, "Intermedio").click();
  await radio(page, 4, "Básico").click();

  await page.getByRole("region", { name: "Envío" }).getByRole("button", { name: "Enviar evaluación" }).click();
  await expect(page).toHaveURL(/\/adaptabilidad$/);
  const IA = { nivelSugerido: 3, probabilidades: NORMAL.probabilidades, confianza: 0.71, modelo: "jev-1.13.0" };
  expect(envio).toMatchObject({
    participanteId: "P11",
    calificaciones: [
      { indicadorId: "adaptabilidad-1", nivel: 3, origen: "ia", observacion: TEXTO, ia: IA },
      { indicadorId: "adaptabilidad-2", nivel: 4, origen: "manual", ia: IA },
      { indicadorId: "adaptabilidad-3", nivel: 2, origen: "manual" },
      { indicadorId: "adaptabilidad-4", nivel: 1, origen: "manual" },
    ],
  });
});

test("baja confianza: muestra los dos niveles, cada uno con su Aplicar", async ({ page }) => {
  await simularJev(page, BAJA_CONFIANZA);
  await page.goto("/adaptabilidad/P12");
  await esperarCalificacion(page);
  await analizar(page, 3);

  const panel = seccion(page, 3);
  await expect(panel.getByText("La IA no está segura entre dos niveles. Revise ambos:")).toBeVisible();
  await expect(panel.getByText(/^Nivel sugerido/)).toHaveCount(0);
  await expect(panel.getByRole("button", { name: "Aplicar sugerencia" })).toHaveCount(0);
  await expect(panel.getByText(/^Intermedio · 50\s%$/)).toBeVisible();
  await expect(panel.getByText(/^Avanzado · 42\s%$/)).toBeVisible();

  await panel.getByRole("button", { name: "Aplicar Avanzado" }).click();
  await expect(radio(page, 3, "Avanzado")).toHaveAttribute("aria-checked", "true");
  await expect(radio(page, 3, "Intermedio")).toHaveAttribute("aria-checked", "false");
  // The draft keeps what Jev suggested (Intermedio) alongside the applied
  // level. Polled: draft writes are debounced 300 ms.
  await expect
    .poll(() =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem("nivela:v1:adaptabilidad:jimena-salgado") ?? "null")?.participantes?.P12?.calificaciones?.["adaptabilidad-3"],
      ),
    )
    .toMatchObject({ nivel: 3, origen: "ia", ia: { nivelSugerido: 2 } });
});

test("fuera de tema: advierte y deja la sugerencia atenuada pero utilizable", async ({ page }) => {
  await simularJev(page, { ...NORMAL, pertinencia: 0.12 });
  await page.goto("/adaptabilidad/P13");
  await esperarCalificacion(page);
  await analizar(page, 2, "Llegó con una camisa azul y habló del partido de fútbol del fin de semana.");

  const panel = seccion(page, 2);
  await expect(
    panel.getByText("La descripción no parece relacionarse con este indicador. Agregue comportamientos observables."),
  ).toBeVisible();
  await expect(panel.getByText(/^Nivel sugerido: Avanzado/)).toBeVisible();
  await panel.getByRole("button", { name: "Aplicar sugerencia" }).click();
  await expect(radio(page, 2, "Avanzado")).toHaveAttribute("aria-checked", "true");
});

test("error: muestra el mensaje y la calificación manual sigue funcionando", async ({ page }) => {
  const solicitudes = await simularJev(page, 502);
  await page.goto("/adaptabilidad/P14");
  await esperarCalificacion(page);

  // Too short: a field error, and nothing is sent.
  await analizar(page, 1, "Muy corto.");
  await expect(seccion(page, 1).getByText("Escriba al menos 20 caracteres para analizar.")).toBeVisible();
  expect(solicitudes).toHaveLength(0);

  await analizar(page, 1);
  await expect(seccion(page, 1).getByRole("alert")).toHaveText(
    "No fue posible analizar el texto en este momento. Intente de nuevo o seleccione el nivel manualmente.",
  );
  await expect(seccion(page, 1).getByRole("button", { name: "Analizar" })).toBeEnabled();
  await radio(page, 1, "Intermedio").click();
  await expect(radio(page, 1, "Intermedio")).toHaveAttribute("aria-checked", "true");
});

test("texto de más de 1 000 caracteres: no se ofrece copiarlo a Observaciones", async ({ page }) => {
  await simularJev(page, NORMAL);
  await page.goto("/adaptabilidad/P15");
  await esperarCalificacion(page);
  await analizar(page, 4, `${TEXTO} `.repeat(11).trim());

  const panel = seccion(page, 4);
  await expect(panel.getByRole("checkbox", { name: "Usar este texto como observación" })).toBeDisabled();
  await expect(panel.getByText(/El texto no cabe en Observaciones/)).toBeVisible();
  await panel.getByRole("button", { name: "Aplicar sugerencia" }).click();
  await expect(radio(page, 4, "Avanzado")).toHaveAttribute("aria-checked", "true");
  await expect(panel.getByRole("textbox", { name: "Observaciones (opcional)" })).toHaveValue("");
});

test("un solo panel abierto a la vez: un único Analizar en pantalla", async ({ page }) => {
  await page.goto("/adaptabilidad/P16");
  await esperarCalificacion(page);
  await interruptor(page, 1).click();
  await seccion(page, 1).getByRole("textbox", { name: "Describa lo que observó" }).fill("Texto a medio escribir");
  await interruptor(page, 2).click();
  await expect(interruptor(page, 1)).toHaveAttribute("aria-expanded", "false");
  await expect(interruptor(page, 2)).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("button", { name: "Analizar" })).toHaveCount(1);

  // Closing keeps what was typed.
  await interruptor(page, 1).click();
  await expect(seccion(page, 1).getByRole("textbox", { name: "Describa lo que observó" })).toHaveValue("Texto a medio escribir");
});
