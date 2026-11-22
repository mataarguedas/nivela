import { expect, test, type Page } from "@playwright/test";
import { competenciasDeJornada } from "../../src/config/competencias";
import { competenciaDisponible, equipoDeCompetencia } from "../../src/config/equipos";
import { correoParticipantePrueba } from "./cuentas";
import { esperarHidratacion } from "./hidratacion";
import { iniciarSesion } from "./sesion";

// Personal results by email (PRD §5.14 v1.13, §15.17) with CORREO_MODO=consola:
// one general report per participant with every competencia of the jornada.
// The dev server keeps the last 20 messages in memory (GET /api/dev/correos).
// Data: `npm run db:seed` (evaluations for every morning rubric) plus the
// fake participant emails that `npm run cuentas:prueba` (the global setup)
// writes: participante-NN.manana@ejemplo.test, except P02 ("Sin correo").
//
// The outbox is small and shared by the parallel projects, so every project
// checks the send page and sends only a test email to its own address; only
// one project sends a whole list.

const RUTA = "/reportes/consolidado/enviar";
const ASUNTO = "Su reporte general de competencias · Nivela";
const PROYECTO_QUE_ENVIA = "Desktop Chrome";

const competenciasManana = () => competenciasDeJornada("manana").filter((c) => competenciaDisponible("manana", c.id));

/** The visible page (Next keeps the previous route mounted but hidden). */
function principal(page: Page) {
  return page.locator("main").filter({ visible: true });
}

type Mensaje = {
  asunto: string;
  texto: string;
  html: string;
  plantilla: string;
  adjuntos: { nombre: string; tipo: string; bytes: number }[];
};

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

  test("abre el envío desde el Reporte consolidado: destinatarios, omitidos, vista previa y una prueba", async ({ page }, info) => {
    const competencias = competenciasManana();
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/reportes/consolidado");
    await principal(page).getByRole("link", { name: "Enviar resultados por correo" }).click();

    await expect(page).toHaveURL(new RegExp(`${RUTA}$`));
    const vista = principal(page);
    await expect(vista.getByRole("heading", { level: 1, name: "Enviar resultados por correo" })).toBeVisible();
    await expect(vista.getByText("Todas las competencias · Jornada: Mañana", { exact: true })).toBeVisible();
    await expect(vista.getByText("Aún no hay evaluaciones enviadas"), "run `npm run db:seed` first").toHaveCount(0);

    // P02 has no email; the lists name participants by carnet or number, never by name.
    const omitidos = vista.getByRole("list", { name: /^No se les enviará/ });
    await expect(omitidos.getByRole("listitem").filter({ hasText: "Sin correo" })).not.toHaveCount(0);
    const destinatarios = vista.getByRole("list", { name: /^Destinatarios/ });
    await expect(destinatarios.getByRole("listitem")).not.toHaveCount(0);
    // Each recipient says in how many of the jornada's competencias they were evaluated.
    await expect(destinatarios.getByRole("listitem").first()).toContainText(new RegExp(`\\d+ de ${competencias.length} competencias`));
    await expect(vista.getByRole("button", { name: /^Enviar a \d+ participantes?$/ })).toBeVisible();

    // The preview is the exact email for the first recipient (P01 has an email and evaluations).
    await expect(vista.getByText(`Para: ${correoParticipantePrueba("manana", 1)}`)).toBeVisible();
    await expect(vista.getByText(`Asunto: ${ASUNTO}`)).toBeVisible();
    const marco = page.frameLocator("iframe[title^='Vista previa del correo']").first();
    await expect(marco.getByRole("heading", { name: "Su reporte general de competencias" })).toBeVisible();
    await expect(marco.getByText("Resultado general", { exact: true })).toBeVisible();
    await expect(marco.getByRole("heading", { name: "Resumen por competencia" })).toBeVisible();
    await sinDesborde(page);

    // "Enviarme una prueba" to this project's own address (not stored).
    const para = `docente-${info.project.name.toLowerCase().replace(/\s+/g, "-")}@ejemplo.test`;
    await esperarHidratacion(page, "form");
    await vista.getByLabel("Su correo electrónico").fill(para);
    await vista.getByRole("button", { name: "Enviarme una prueba" }).click();
    await expect(page.getByText("Prueba enviada")).toBeVisible();
    const prueba = await ultimoCorreo(page, para);
    expect(prueba.asunto).toBe(`[Prueba] ${ASUNTO}`);
    // Greeted by name, or plain "Hola:" for a participant without one.
    expect(prueba.texto).toMatch(/^Hola(, .+)?:$/m);
    expect(prueba.texto).toMatch(/^Promedio entre competencias: \d{1,3} de 100$/m);
    // One summary line per competencia of the jornada.
    for (const c of competencias) expect(prueba.texto).toContain(`- ${c.nombre}: `);
    expect(prueba.texto).toContain("Estos resultados son el promedio de las evaluaciones que hicieron sus pares, en una escala de 0 a 100");
    // Never an evaluator's name, from any team.
    for (const c of competencias) {
      for (const integrante of equipoDeCompetencia("manana", c.id)!.integrantes) {
        expect(prueba.texto).not.toContain(integrante.nombre);
        expect(prueba.html).not.toContain(integrante.nombre);
      }
    }
    // v1.16: the general report goes attached as a PDF.
    expect(prueba.adjuntos).toEqual([{ nombre: "nivela-reporte-general.pdf", tipo: "application/pdf", bytes: expect.any(Number) }]);
    expect(prueba.texto).toContain("Adjuntamos estos resultados en PDF para que pueda guardarlos o imprimirlos.");
  });

  test("«Descargar PDF» baja el reporte general del participante de la vista previa", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(RUTA);
    const enlace = principal(page).getByRole("link", { name: /^Descargar PDF/ }).last();
    await expect(enlace).toHaveAttribute("href", /\/api\/reportes\/consolidado\/pdf\?participante=P\d{2}$/);
    const [descarga] = await Promise.all([page.waitForEvent("download"), enlace.click()]);
    expect(descarga.suggestedFilename()).toMatch(/^nivela-reporte-general-[a-z0-9-]+\.pdf$/);
    const ruta = await descarga.path();
    const { readFileSync } = await import("node:fs");
    expect(readFileSync(ruta).subarray(0, 5).toString("latin1")).toBe("%PDF-");
    await sinDesborde(page);
  });

  test("quien no tiene correo pero sí evaluaciones también tiene su PDF", async ({ page }) => {
    await page.goto(RUTA);
    const omitidos = principal(page).getByRole("list", { name: /^No se les enviará/ });
    const enlace = omitidos.getByRole("listitem").filter({ hasText: "Sin correo" }).first().getByRole("link", { name: /^Descargar PDF/ });
    const href = await enlace.getAttribute("href");
    const respuesta = await page.request.get(href!);
    expect(respuesta.status()).toBe(200);
    expect(respuesta.headers()["content-type"]).toBe("application/pdf");
  });

  test("el Reporte general lleva al mismo envío de todas las competencias", async ({ page }) => {
    await page.goto("/reportes/adaptabilidad");
    await expect(principal(page).getByRole("link", { name: "Enviar resultados por correo" })).toHaveAttribute("href", RUTA);
  });

  test("envía a todos los destinatarios: confirmación, estados «Enviado» y columna «Correo»", async ({ page }, info) => {
    test.skip(info.project.name !== PROYECTO_QUE_ENVIA, "only one project sends a whole list (shared in-memory outbox)");
    test.slow();
    await page.goto(RUTA);
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

    // The last message to P01 is their general report (re-send only P01 so it is the newest).
    const respuesta = await page.request.post("/api/reportes/consolidado/enviar", { data: { participantes: ["P01"], reenviar: true } });
    expect(await respuesta.json()).toEqual({ enviados: 1, errores: [] });
    const mensaje = await ultimoCorreo(page, correoParticipantePrueba("manana", 1));
    expect(mensaje.asunto).toBe(ASUNTO);
    expect(mensaje.plantilla).toBe("resultados");
    expect(mensaje.texto).toContain("Resultado general:");
    expect(mensaje.adjuntos.map((a) => a.tipo)).toEqual(["application/pdf"]);
    await page.goto("/dev/correos");
    await expect(page.getByText(ASUNTO).first()).toBeVisible();
    await expect(page.getByText(/nivela-reporte-general\.pdf \(\d+ KB\)/).first()).toBeVisible();

    // Reporte general of any competencia: the "Correo" column shows the general report's status.
    await page.goto("/reportes/adaptabilidad");
    const tabla = principal(page).getByRole("table", { name: "Tabla de participantes" });
    await expect(tabla.getByRole("columnheader", { name: "Correo" })).toBeVisible();
    await expect(tabla.getByRole("cell", { name: "Enviado", exact: true })).toHaveCount(n);
  });
});

test("el rol evaluador no accede al envío de resultados", async ({ page }) => {
  await iniciarSesion(page, "evaluador");
  const api = await page.request.post("/api/reportes/consolidado/enviar", { data: { participantes: ["P01"] } });
  expect(api.status()).toBe(403);
  expect((await page.request.get("/api/reportes/consolidado/pdf?participante=P01")).status()).toBe(403);
  await page.goto(RUTA);
  await expect(page).toHaveURL(/\/acceso\?/);
});
