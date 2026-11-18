import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { equipoDeCompetencia } from "@/config/equipos";
import { generarParticipantes } from "@/config/participantes";
import { TEXTOS } from "@/config/textos";
import { MENSAJES_VALIDACION } from "@/lib/validacion";

// PUT /api/asistencia (PRD §5.13, §10) with the db layer and the session
// mocked. The atomic "refuse after sending" SQL is covered against a real
// Postgres in asistencia-db.test.ts.

const db = vi.hoisted(() => ({ marcarAsistencia: vi.fn() }));
const dbParticipantes = vi.hoisted(() => ({ obtenerParticipantes: vi.fn() }));
const sesion = vi.hoisted(() => ({ getSesion: vi.fn() }));
vi.mock("@/lib/db/asistencia", () => db);
vi.mock("@/lib/db/participantes", () => dbParticipantes);
vi.mock("@/lib/sesion", () => sesion);

const { PUT } = await import("@/app/api/asistencia/route");

const SID = "0123456789abcdef0123";
// Each jornada's Adaptabilidad team, from config (never by number or size).
const MANANA = equipoDeCompetencia("manana", "adaptabilidad")!;
const NOCHE = equipoDeCompetencia("noche", "adaptabilidad")!;
const EVALUADOR = MANANA.integrantes[0].id;
const COMPANERO = MANANA.integrantes[1].id;
const EVALUADOR_NOCHE = NOCHE.integrantes[0].id;

const CUERPO = { competenciaId: "adaptabilidad", participanteId: "P03", ausente: true };

function marcar(cuerpo: unknown) {
  return PUT(
    new Request("http://localhost/api/asistencia", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: typeof cuerpo === "string" ? cuerpo : JSON.stringify(cuerpo),
    }),
  );
}

function como(rol: "evaluador" | "docente" | "admin", jornada: "manana" | "noche" = "manana", integranteId?: string) {
  sesion.getSesion.mockResolvedValue({ rol, sid: SID, jornada, ...(integranteId ? { integranteId } : {}) });
}

beforeEach(() => {
  como("evaluador", "manana", EVALUADOR);
  dbParticipantes.obtenerParticipantes.mockResolvedValue(generarParticipantes(20));
  db.marcarAsistencia.mockResolvedValue({ ok: true, actualizadoEn: "2026-11-17T15:00:00.000Z" });
});

afterEach(() => {
  vi.resetAllMocks();
  vi.restoreAllMocks();
});

describe("PUT /api/asistencia", () => {
  it("401 sin sesión y 403 para admin, sin tocar la base de datos", async () => {
    sesion.getSesion.mockResolvedValue(null);
    expect((await marcar(CUERPO)).status).toBe(401);
    como("admin");
    expect((await marcar(CUERPO)).status).toBe(403);
    expect(db.marcarAsistencia).not.toHaveBeenCalled();
  });

  it("un evaluador marca a su nombre: el evaluador sale de la sesión", async () => {
    const respuesta = await marcar(CUERPO);
    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get("cache-control")).toBe("no-store");
    await expect(respuesta.json()).resolves.toEqual({
      participanteId: "P03",
      ausente: true,
      actualizadoEn: "2026-11-17T15:00:00.000Z",
    });
    expect(db.marcarAsistencia).toHaveBeenCalledWith(
      "manana",
      { competenciaId: "adaptabilidad", evaluadorId: EVALUADOR, participanteId: "P03" },
      true,
    );
  });

  it("Marcar presente guarda ausente = false", async () => {
    await marcar({ ...CUERPO, evaluadorId: EVALUADOR, ausente: false });
    expect(db.marcarAsistencia.mock.calls[0][2]).toBe(false);
  });

  it("403 si un evaluador marca a nombre de otra persona de su equipo", async () => {
    const respuesta = await marcar({ ...CUERPO, evaluadorId: COMPANERO });
    expect(respuesta.status).toBe(403);
    await expect(respuesta.json()).resolves.toEqual({ error: TEXTOS.sesion.otroEvaluador });
    expect(db.marcarAsistencia).not.toHaveBeenCalled();
  });

  it("el docente nombra al integrante del equipo; sin evaluadorId es 400", async () => {
    como("docente");
    expect((await marcar({ ...CUERPO, evaluadorId: COMPANERO })).status).toBe(200);
    expect(db.marcarAsistencia.mock.calls[0][1]).toMatchObject({ evaluadorId: COMPANERO });
    const sinEvaluador = await marcar(CUERPO);
    expect(sinEvaluador.status).toBe(400);
    await expect(sinEvaluador.json()).resolves.toEqual({ error: MENSAJES_VALIDACION.asistencia });
  });

  it("409 «Ya envió una evaluación para esta persona.» si ya la envió", async () => {
    db.marcarAsistencia.mockResolvedValue({ ok: false, motivo: "enviada" });
    const respuesta = await marcar(CUERPO);
    expect(respuesta.status).toBe(409);
    await expect(respuesta.json()).resolves.toEqual({ error: "Ya envió una evaluación para esta persona." });
  });

  it.each([
    ["JSON inválido", "{no", MENSAJES_VALIDACION.asistencia],
    ["sin ausente", { competenciaId: "adaptabilidad", participanteId: "P03" }, MENSAJES_VALIDACION.asistencia],
    ["ausente no booleano", { ...CUERPO, ausente: "sí" }, MENSAJES_VALIDACION.asistencia],
    ["competencia inexistente", { ...CUERPO, competenciaId: "liderazgo" }, MENSAJES_VALIDACION.competencia],
    ["participante inexistente", { ...CUERPO, participanteId: "P42" }, MENSAJES_VALIDACION.participante],
  ])("400: %s", async (_caso, cuerpo, mensaje) => {
    const respuesta = await marcar(cuerpo);
    expect(respuesta.status).toBe(400);
    await expect(respuesta.json()).resolves.toEqual({ error: mensaje });
    expect(db.marcarAsistencia).not.toHaveBeenCalled();
  });

  it("400 para un participante que el admin ocultó en la jornada", async () => {
    dbParticipantes.obtenerParticipantes.mockResolvedValue(generarParticipantes(2));
    const respuesta = await marcar(CUERPO);
    expect(respuesta.status).toBe(400);
    await expect(respuesta.json()).resolves.toEqual({ error: MENSAJES_VALIDACION.participante });
  });

  describe("alcance por jornada (siempre la de la sesión)", () => {
    it("la lista de participantes y la escritura usan la jornada de la sesión", async () => {
      como("evaluador", "noche", EVALUADOR_NOCHE);
      expect((await marcar(CUERPO)).status).toBe(200);
      expect(dbParticipantes.obtenerParticipantes).toHaveBeenCalledWith("noche");
      expect(db.marcarAsistencia).toHaveBeenCalledWith(
        "noche",
        { competenciaId: "adaptabilidad", evaluadorId: EVALUADOR_NOCHE, participanteId: "P03" },
        true,
      );
    });

    it("una jornada en el cuerpo se ignora", async () => {
      await marcar({ ...CUERPO, jornada: "noche" });
      expect(db.marcarAsistencia.mock.calls[0][0]).toBe("manana");
    });

    it("el docente no puede marcar como integrante del equipo de la otra jornada", async () => {
      como("docente", "manana");
      const respuesta = await marcar({ ...CUERPO, evaluadorId: EVALUADOR_NOCHE });
      expect(respuesta.status).toBe(400);
      await expect(respuesta.json()).resolves.toEqual({ error: MENSAJES_VALIDACION.evaluador });
      expect(db.marcarAsistencia).not.toHaveBeenCalled();
    });
  });

  it("500 si falla la base de datos, sin registrar ids ni nombres", async () => {
    const registro = vi.spyOn(console, "error").mockImplementation(() => {});
    db.marcarAsistencia.mockRejectedValue(Object.assign(new Error(`Failed query: params: ${EVALUADOR},P03`), { code: "57P01" }));
    const respuesta = await marcar(CUERPO);
    expect(respuesta.status).toBe(500);
    await expect(respuesta.json()).resolves.toEqual({ error: "No se pudo guardar la asistencia. Intente de nuevo." });
    const registrado = registro.mock.calls.flat().map(String).join(" ");
    expect(registrado).toContain("57P01");
    expect(registrado).not.toContain(EVALUADOR);
  });
});
