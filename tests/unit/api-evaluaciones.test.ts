import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generarParticipantes } from "@/config/participantes";
import { MENSAJES_VALIDACION } from "@/lib/validacion";

// /api/evaluaciones with the db layer and the session mocked. The upsert's SQL
// behaviour is covered against a real Postgres in evaluaciones-db.test.ts.

const db = vi.hoisted(() => ({ guardarEvaluacion: vi.fn(), listarEnviadas: vi.fn() }));
const dbParticipantes = vi.hoisted(() => ({ obtenerParticipantes: vi.fn() }));
const sesion = vi.hoisted(() => ({ getSesion: vi.fn() }));
vi.mock("@/lib/db/evaluaciones", () => db);
vi.mock("@/lib/db/participantes", () => dbParticipantes);
vi.mock("@/lib/sesion", () => sesion);

const { GET, POST } = await import("@/app/api/evaluaciones/route");

const OBSERVACION = "Reorganizó sus actividades sin ayuda tras el cambio de prioridades.";

const CUERPO = {
  competenciaId: "adaptabilidad",
  evaluadorId: "jimena-salgado",
  participanteId: "P01",
  calificaciones: [1, 2, 3, 4].map((n) => ({
    indicadorId: `adaptabilidad-${n}`,
    nivel: n,
    origen: "manual",
    observacion: n === 3 ? OBSERVACION : undefined,
  })),
};

function enviar(cuerpo: unknown) {
  return POST(
    new Request("http://localhost/api/evaluaciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: typeof cuerpo === "string" ? cuerpo : JSON.stringify(cuerpo),
    }),
  );
}

function consultar(query: string) {
  return GET(new Request(`http://localhost/api/evaluaciones?${query}`));
}

beforeEach(() => {
  sesion.getSesion.mockResolvedValue({ rol: "evaluador", sid: "0123456789abcdef0123" });
  dbParticipantes.obtenerParticipantes.mockResolvedValue(generarParticipantes(20));
});

afterEach(() => {
  vi.resetAllMocks();
  vi.restoreAllMocks();
});

describe("POST /api/evaluaciones", () => {
  it("401 sin sesión, sin tocar la base de datos", async () => {
    sesion.getSesion.mockResolvedValue(null);
    const respuesta = await enviar(CUERPO);
    expect(respuesta.status).toBe(401);
    await expect(respuesta.json()).resolves.toEqual({ error: "Debe ingresar el código de acceso para continuar." });
    expect(db.guardarEvaluacion).not.toHaveBeenCalled();
  });

  it("403 para el rol admin, también en GET", async () => {
    sesion.getSesion.mockResolvedValue({ rol: "admin", sid: "0123456789abcdef0123" });
    expect((await enviar(CUERPO)).status).toBe(403);
    expect((await consultar("competencia=adaptabilidad&evaluador=jimena-salgado")).status).toBe(403);
    expect(db.guardarEvaluacion).not.toHaveBeenCalled();
    expect(db.listarEnviadas).not.toHaveBeenCalled();
  });

  it("400 para un participante que el admin ocultó", async () => {
    dbParticipantes.obtenerParticipantes.mockResolvedValue(generarParticipantes(5));
    const respuesta = await enviar({ ...CUERPO, participanteId: "P07" });
    expect(respuesta.status).toBe(400);
    await expect(respuesta.json()).resolves.toEqual({ error: MENSAJES_VALIDACION.participante });
    expect(db.guardarEvaluacion).not.toHaveBeenCalled();
  });

  it("guarda la evaluación validada y devuelve { id, actualizadoEn } sin caché", async () => {
    db.guardarEvaluacion.mockResolvedValue({ id: "e1", actualizadoEn: "2026-10-25T10:00:00.000Z" });
    const respuesta = await enviar(CUERPO);
    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get("cache-control")).toBe("no-store");
    await expect(respuesta.json()).resolves.toEqual({ id: "e1", actualizadoEn: "2026-10-25T10:00:00.000Z" });
    const guardada = db.guardarEvaluacion.mock.calls[0][0];
    expect(guardada.calificaciones).toHaveLength(4);
    expect(guardada.calificaciones[2].observacion).toBe(OBSERVACION);
  });

  it("acepta también el rol docente", async () => {
    sesion.getSesion.mockResolvedValue({ rol: "docente", sid: "0123456789abcdef0123" });
    db.guardarEvaluacion.mockResolvedValue({ id: "e1", actualizadoEn: "2026-10-25T10:00:00.000Z" });
    expect((await enviar(CUERPO)).status).toBe(200);
  });

  it.each([
    ["JSON inválido", "{no es json", MENSAJES_VALIDACION.cuerpo],
    ["evaluador ajeno", { ...CUERPO, evaluadorId: "felipe-lopez" }, MENSAJES_VALIDACION.evaluador],
    ["faltan indicadores", { ...CUERPO, calificaciones: CUERPO.calificaciones.slice(1) }, MENSAJES_VALIDACION.indicadores],
  ])("400 con mensaje en español: %s", async (_caso, cuerpo, mensaje) => {
    const respuesta = await enviar(cuerpo);
    expect(respuesta.status).toBe(400);
    await expect(respuesta.json()).resolves.toEqual({ error: mensaje });
    expect(db.guardarEvaluacion).not.toHaveBeenCalled();
  });

  it("500 si falla la base de datos, sin registrar el texto de la observación", async () => {
    const registro = vi.spyOn(console, "error").mockImplementation(() => {});
    // Drizzle's real error message embeds the query parameters.
    db.guardarEvaluacion.mockRejectedValue(
      Object.assign(new Error(`Failed query: insert ... params: ${OBSERVACION}`), { cause: { code: "57P01" } }),
    );
    const respuesta = await enviar(CUERPO);
    expect(respuesta.status).toBe(500);
    await expect(respuesta.json()).resolves.toEqual({ error: "No se pudo guardar la evaluación. Intente de nuevo." });
    const registrado = registro.mock.calls.flat().map(String).join(" ");
    expect(registrado).toContain("57P01");
    expect(registrado).not.toContain(OBSERVACION);
    expect(registrado).not.toContain("jimena");
  });
});

describe("GET /api/evaluaciones", () => {
  it("401 sin sesión", async () => {
    sesion.getSesion.mockResolvedValue(null);
    expect((await consultar("competencia=adaptabilidad&evaluador=jimena-salgado")).status).toBe(401);
  });

  it("lista los participantes ya enviados por esa persona evaluadora", async () => {
    db.listarEnviadas.mockResolvedValue([{ participanteId: "P02", actualizadoEn: "2026-10-25T10:00:00.000Z" }]);
    const respuesta = await consultar("competencia=adaptabilidad&evaluador=jimena-salgado");
    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get("cache-control")).toBe("no-store");
    await expect(respuesta.json()).resolves.toEqual({
      evaluaciones: [{ participanteId: "P02", actualizadoEn: "2026-10-25T10:00:00.000Z" }],
    });
    expect(db.listarEnviadas).toHaveBeenCalledWith("adaptabilidad", "jimena-salgado");
  });

  it.each([
    ["competencia=adaptabilidad", MENSAJES_VALIDACION.consulta],
    ["competencia=pensamiento-critico&evaluador=felipe-lopez", MENSAJES_VALIDACION.competencia],
    ["competencia=adaptabilidad&evaluador=felipe-lopez", MENSAJES_VALIDACION.evaluador],
  ])("400 para %s", async (query, mensaje) => {
    const respuesta = await consultar(query);
    expect(respuesta.status).toBe(400);
    await expect(respuesta.json()).resolves.toEqual({ error: mensaje });
  });

  it("500 si falla la base de datos", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    db.listarEnviadas.mockRejectedValue(new Error("fetch failed"));
    const respuesta = await consultar("competencia=adaptabilidad&evaluador=jimena-salgado");
    expect(respuesta.status).toBe(500);
    await expect(respuesta.json()).resolves.toEqual({
      error: "No se pudieron consultar las evaluaciones enviadas. Intente de nuevo.",
    });
  });
});
