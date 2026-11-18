import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { obtenerCompetencia } from "../../src/config/competencias";
import { equipoDeCompetencia } from "../../src/config/equipos";
import { correoParticipantePrueba } from "./cuentas";
import { esperarHidratacion } from "./hidratacion";
import { iniciarSesion } from "./sesion";

// Personal results by email (PRD §5.14, §15.17) with CORREO_MODO=consola: the
// dev server keeps the last 20 messages in memory (GET /api/dev/correos).
// Data: `npm run db:seed` (evaluations for every morning rubric) plus the
// fake participant emails that `npm run cuentas:prueba` (the global setup)
// writes: participante-NN.manana@ejemplo.test, except P02 ("Sin correo").
//
// The outbox is small and shared by the parallel projects, so every project
// checks the send page on its own morning competencia and sends only a test
// email to its own address; only one project sends a whole list.

const COMPETENCIA_POR_PROYECTO: Record<string, string> = {
  "iPhone 13": "pensamiento-critico",
  "Pixel 7": "autorregulacion-emocional",
  Firefox: "orientacion-detalle",
  "Desktop Chrome": "orientacion-resultados",
};
const PROYECTO_QUE_ENVIA = "Desktop Chrome";

function competenciaDe(info: TestInfo): string {
  const id = COMPETENCIA_POR_PROYECTO[info.project.name];
  if (!id) throw new Error(`No competencia for project ${info.project.name}`);
  return id;
}

/** The visible page (Next keeps the previous route mounted but hidden). */
function principal(page: Page) {
  return page.locator("main").filter({ visible: true });
}

type Mensaje = { asunto: string; texto: string; html: string; plantilla: string };

async function ultimoCorreo(page: Page, para: string): Promise<Mensaje> {
  const respuesta = await page.request.get(`/api/dev/correos?para=${encodeURIComponent(para)}`);
  expect(respuesta.status(), `no email for ${para}`).toBe(200);
  return (await respuesta.json()) as Mensaje;
}

async function sinDesborde(page: Page) {
  const desborde = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(desborde).toBeLessThanOrEqual(0);
}

test.describe("como docente", () => {
  test.beforeEach(async ({ page }) => {
    await iniciarSesion(page, "docente");
  });

  test("abre el envío desde el Reporte general: destinatarios, omitidos, vista previa y una prueba", async ({ page }, info) => {
    const id = competenciaDe(info);
    const competencia = obtenerCompetencia("manana", id)!;
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`/reportes/${id}`);
    await principal(page).getByRole("link", { name: "Enviar resultados por correo" }).click();

    await expect(page).toHaveURL(new RegExp(`/reportes/${id}/enviar$`));
    const vista = principal(page);
    await expect(vista.getByRole("heading", { level: 1, name: "Enviar resultados por correo" })).toBeVisible();
    await expect(vista.getByText(`${competencia.nombre} · Jornada: Mañana`, { exact: true })).toBeVisible();
    await expect(vista.getByText("Aún no hay evaluaciones enviadas"), "run `npm run db:seed` first").toHaveCount(0);

    // P02 has no email; the lists name participants by carnet or number, never by name.
    const omitidos = vista.getByRole("list", { name: /^No se les enviará/ });
    await expect(omitidos.getByRole("listitem").filter({ hasText: "Sin correo" })).not.toHaveCount(0);
    const destinatarios = vista.getByRole("list", { name: /^Destinatarios/ });
    await expect(destinatarios.getByRole("listitem")).not.toHaveCount(0);
    await expect(vista.getByRole("button", { name: /^Enviar a \d+ participantes?$/ })).toBeVisible();

    // The preview is the exact email for the first recipient (P01 has an email and evaluations).
    await expect(vista.getByText(`Para: ${correoParticipantePrueba("manana", 1)}`)).toBeVisible();
    await expect(vista.getByText(`Asunto: Sus resultados de ${competencia.nombre} · Nivela`)).toBeVisible();
    const marco = page.frameLocator("iframe[title^='Vista previa del correo']").first();
    await expect(marco.getByRole("heading", { name: `Sus resultados de ${competencia.nombre}` })).toBeVisible();
    await expect(marco.getByText("Nivel general", { exact: true })).toBeVisible();
    await sinDesborde(page);

    // "Enviarme una prueba" to this project's own address (not stored).
    const para = `docente-${info.project.name.toLowerCase().replace(/\s+/g, "-")}@ejemplo.test`;
    await esperarHidratacion(page, "form");
    await vista.getByLabel("Su correo electrónico").fill(para);
    await vista.getByRole("button", { name: "Enviarme una prueba" }).click();
    await expect(page.getByText("Prueba enviada")).toBeVisible();
    const prueba = await ultimoCorreo(page, para);
    expect(prueba.asunto).toBe(`[Prueba] Sus resultados de ${competencia.nombre} · Nivela`);
    // Greeted by name, or plain "Hola:" for a participant without one.
    expect(prueba.texto).toMatch(/^Hola(, .+)?:$/m);
    expect(prueba.texto).toContain("Estos resultados son el promedio de las evaluaciones que hicieron sus pares.");
    // Never an evaluator's name.
    for (const integrante of equipoDeCompetencia("manana", id)!.integrantes) {
      expect(prueba.texto).not.toContain(integrante.nombre);
      expect(prueba.html).not.toContain(integrante.nombre);
    }
  });

  test("envía a todos los destinatarios: confirmación, estados «Enviado» y columna «Correo»", async ({ page }, info) => {
    test.skip(info.project.name !== PROYECTO_QUE_ENVIA, "only one project sends a whole list (shared in-memory outbox)");
    test.slow();
    const id = competenciaDe(info);
    const competencia = obtenerCompetencia("manana", id)!;
    await page.goto(`/reportes/${id}/enviar`);
    const vista = principal(page);
    await esperarHidratacion(page, "main ul");

    // Repeatable: anyone already sent by an earlier run is ticked for "Reenviar".
    for (const casilla of await vista.getByRole("checkbox", { name: /^Reenviar/ }).all()) await casilla.check();
    const boton = vista.getByRole("button", { name: /^Enviar a \d+ participantes?$/ });
    const n = Number((await boton.textContent())?.match(/\d+/)?.[0]);
    expect(n).toBeGreaterThan(0);
    await boton.click();

    const dialogo = page.getByRole("dialog", { name: new RegExp(`^¿Enviar los resultados a ${n} participantes?\\?$`) });
    await expect(dialogo).toBeVisible();
    await dialogo.getByRole("button", { name: "Enviar", exact: true }).click();
    await expect(vista.getByRole("status")).toHaveText(n === 1 ? "Se envió 1 correo." : `Se enviaron ${n} correos.`, { timeout: 60_000 });

    // After the refresh every recipient reads "Enviado el dd/mm/aaaa" and offers "Reenviar".
    const destinatarios = vista.getByRole("list", { name: /^Destinatarios/ }).getByRole("listitem");
    await expect(destinatarios.filter({ hasText: /Enviado el \d{2}\/\d{2}\/\d{4}/ })).toHaveCount(n);
    await expect(vista.getByRole("button", { name: "Enviar a 0 participantes" })).toBeDisabled();

    // The last message to P01 is this competencia's results (re-send only P01 so it is the newest).
    const respuesta = await page.request.post(`/api/reportes/${id}/enviar`, { data: { participantes: ["P01"], reenviar: true } });
    expect(await respuesta.json()).toEqual({ enviados: 1, errores: [] });
    const mensaje = await ultimoCorreo(page, correoParticipantePrueba("manana", 1));
    expect(mensaje.asunto).toBe(`Sus resultados de ${competencia.nombre} · Nivela`);
    expect(mensaje.plantilla).toBe("resultados");
    await page.goto("/dev/correos");
    await expect(page.getByText(`Sus resultados de ${competencia.nombre} · Nivela`).first()).toBeVisible();

    // Reporte general: the "Correo" column.
    await page.goto(`/reportes/${id}`);
    const tabla = principal(page).getByRole("table", { name: "Tabla de participantes" });
    await expect(tabla.getByRole("columnheader", { name: "Correo" })).toBeVisible();
    await expect(tabla.getByRole("cell", { name: "Enviado", exact: true })).toHaveCount(n);
  });
});

test("el rol evaluador no accede al envío de resultados", async ({ page }) => {
  await iniciarSesion(page, "evaluador");
  const api = await page.request.post("/api/reportes/adaptabilidad/enviar", { data: { participantes: ["P01"] } });
  expect(api.status()).toBe(403);
  await page.goto("/reportes/adaptabilidad/enviar");
  await expect(page).toHaveURL(/\/acceso\?/);
});
