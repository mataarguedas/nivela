import { expect, test, type Page } from "@playwright/test";
import { obtenerCompetenciaHabilitada } from "../../src/config/competencias";
import { equipoDeCompetencia } from "../../src/config/equipos";
import type { JornadaId } from "../../src/config/jornadas";
import { esperarCalificacion } from "./hidratacion";
import { iniciarSesion } from "./sesion";

// Attendance (PRD §5.13, §15.13) against the real API and the dev database.
// Each browser project signs in as its own Adaptabilidad member, so parallel
// projects never share an attendance row: two from the morning team, two from
// the night team, picked by position from each jornada's team in config
// (never by number or size), and never one another spec signs in as.
// Each test sets its own preconditions through the API and restores them.

const COMPETENCIA = "adaptabilidad";
/** The seed leaves P18 unsent and marked absent for every member but the team's last. */
const PARTICIPANTE = "P18";
const ENVIADO = "P01";

const POR_PROYECTO: Record<string, { jornada: JornadaId; posicion: number }> = {
  "iPhone 13": { jornada: "manana", posicion: 0 },
  "Pixel 7": { jornada: "manana", posicion: 1 },
  Firefox: { jornada: "noche", posicion: 0 },
  "Desktop Chrome": { jornada: "noche", posicion: 1 },
};

function evaluadorDe(proyecto: string) {
  const asignado = POR_PROYECTO[proyecto];
  if (!asignado) return null;
  const equipo = equipoDeCompetencia(asignado.jornada, COMPETENCIA);
  const integrante = equipo?.integrantes[asignado.posicion];
  return integrante ? { jornada: asignado.jornada, id: integrante.id } : null;
}

function barra(page: Page) {
  return page.getByRole("region", { name: "Envío" });
}

function fila(page: Page, numero: string) {
  return page.getByRole("listitem").filter({ hasText: `Participante ${numero}` });
}

async function fijarAsistencia(page: Page, participanteId: string, ausente: boolean) {
  const respuesta = await page.request.put("/api/asistencia", { data: { competenciaId: COMPETENCIA, participanteId, ausente } });
  return respuesta.status();
}

async function sinDesborde(page: Page) {
  const desborde = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(desborde).toBeLessThanOrEqual(0);
}

test.describe("asistencia", () => {
  // The tests of one project share its evaluator's rows: run them in order.
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }, info) => {
    const evaluador = evaluadorDe(info.project.name);
    test.skip(!evaluador, `no evaluator assigned to project ${info.project.name}`);
    await iniciarSesion(page, { integranteId: evaluador!.id });
    await page.setViewportSize({ width: 375, height: 667 });
  });

  test("marcar ausente → chip y resumen → persiste al recargar → Marcar presente devuelve el envío", async ({ page }) => {
    expect(await fijarAsistencia(page, PARTICIPANTE, false)).toBe(200);
    try {
      await page.goto(`/${COMPETENCIA}/${PARTICIPANTE}`);
      await esperarCalificacion(page);
      await expect(barra(page).getByRole("button", { name: "Enviar evaluación" })).toBeVisible();

      await page.getByRole("main").getByRole("button", { name: "Marcar ausente" }).click();
      const dialogo = page.getByRole("dialog", { name: "Marcar ausente" });
      await expect(dialogo).toContainText(
        /¿Marcar a .+ como ausente\? No podrá enviar su evaluación mientras esté marcada así\./,
      );
      await dialogo.getByRole("button", { name: "Marcar ausente" }).click();

      await expect(barra(page)).toContainText("Marcó a esta persona como ausente.");
      await expect(barra(page).getByRole("button", { name: "Marcar presente" })).toBeVisible();
      await expect(barra(page).getByRole("button", { name: "Enviar evaluación" })).toHaveCount(0);
      // The level pickers stay visible.
      await expect(page.getByRole("radiogroup").first()).toBeVisible();
      await sinDesborde(page);

      // Saved on the server, not in the draft: a reload keeps it.
      await page.reload();
      await esperarCalificacion(page);
      await expect(barra(page).getByRole("button", { name: "Marcar presente" })).toBeVisible();

      // The list: chip "Ausente", and absents counted apart from the total.
      await page.goto(`/${COMPETENCIA}`);
      await expect(fila(page, "18").getByText("Ausente", { exact: true })).toBeVisible();
      await expect(page.getByText(/^\d+ de \d+ enviadas · \d+ ausentes?$/)).toBeVisible();
      await sinDesborde(page);

      // Marcar presente: sending is available again (disabled until all 4 levels are set).
      await fila(page, "18").getByRole("link").click();
      await esperarCalificacion(page);
      await barra(page).getByRole("button", { name: "Marcar presente" }).click();
      await expect(barra(page).getByRole("button", { name: "Enviar evaluación" })).toBeVisible();
      await expect(page.getByRole("main").getByRole("button", { name: "Marcar ausente" })).toBeVisible();

      await page.goto(`/${COMPETENCIA}`);
      await expect(fila(page, "18").getByRole("link")).toBeVisible();
      await expect(fila(page, "18").getByText("Ausente", { exact: true })).toHaveCount(0);
    } finally {
      // Back to the seeded state (marked absent, nothing sent).
      await fijarAsistencia(page, PARTICIPANTE, true);
    }
  });

  test("no se puede marcar ausente a alguien cuya evaluación ya envió", async ({ page }, info) => {
    const evaluador = evaluadorDe(info.project.name)!;
    const competencia = obtenerCompetenciaHabilitada(evaluador.jornada, COMPETENCIA);
    expect(competencia).toBeDefined();
    // Precondition: present, and sent (an upsert, so re-running is harmless).
    expect(await fijarAsistencia(page, ENVIADO, false)).toBe(200);
    const envio = await page.request.post("/api/evaluaciones", {
      data: {
        competenciaId: COMPETENCIA,
        evaluadorId: evaluador.id,
        participanteId: ENVIADO,
        calificaciones: competencia!.indicadores.map((i) => ({ indicadorId: i.id, nivel: 3, origen: "manual" })),
      },
    });
    expect(envio.status()).toBe(200);

    expect(await fijarAsistencia(page, ENVIADO, true)).toBe(409);

    await page.goto(`/${COMPETENCIA}/${ENVIADO}`);
    await esperarCalificacion(page);
    await page.getByRole("main").getByRole("button", { name: "Marcar ausente" }).click();
    await page.getByRole("dialog", { name: "Marcar ausente" }).getByRole("button", { name: "Marcar ausente" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Ya envió una evaluación para esta persona." })).toBeVisible();
    // Still present: the bar keeps the send button, never the absent notice.
    await expect(barra(page).getByRole("button", { name: "Enviar evaluación" })).toBeVisible();
    await expect(barra(page)).not.toContainText("Marcó a esta persona como ausente.");
  });

  test("sin red: el aviso de error y la marca no cambia", async ({ page }) => {
    expect(await fijarAsistencia(page, PARTICIPANTE, false)).toBe(200);
    try {
      await page.route("**/api/asistencia", (ruta) => ruta.abort("internetdisconnected"));
      await page.goto(`/${COMPETENCIA}/${PARTICIPANTE}`);
      await esperarCalificacion(page);
      await page.getByRole("main").getByRole("button", { name: "Marcar ausente" }).click();
      await page.getByRole("dialog", { name: "Marcar ausente" }).getByRole("button", { name: "Marcar ausente" }).click();
      await expect(page.getByRole("status").filter({ hasText: "No se pudo guardar la asistencia. Intente de nuevo." })).toBeVisible();
      await expect(barra(page).getByRole("button", { name: "Enviar evaluación" })).toBeVisible();
    } finally {
      await page.unroute("**/api/asistencia");
      await fijarAsistencia(page, PARTICIPANTE, true);
    }
  });
});
