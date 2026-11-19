import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { JornadaResumen } from "@/lib/validacion";
import { sinRubrica } from "./sinRubrica";

// GET /api/reportes/[competencia]/grupo (PRD §10, §11.3) with the db layer
// and the session mocked: the docente-only role check, and the single
// request-chosen jornada of the app (§5.11), which falls back to the
// session's and is never written anywhere. The aggregation itself is covered
// in resumen-grupo.test.ts.

const db = vi.hoisted(() => ({ obtenerResumenGrupo: vi.fn() }));
const sesion = vi.hoisted(() => ({ getSesion: vi.fn() }));
vi.mock("@/lib/db/reportes", () => db);
vi.mock("@/lib/sesion", () => sesion);

const { GET } = await import("@/app/api/reportes/[competencia]/grupo/route");

const DOCENTE = { rol: "docente", sid: "0123456789abcdef0123", jornada: "noche" };
const RESUMEN = { competencia: { id: "adaptabilidad", nombre: "Adaptabilidad" }, seleccion: "noche", vacio: true };

function pedir(competencia: string, consulta = "") {
  return GET(new Request(`http://localhost/api/reportes/${competencia}/grupo${consulta}`), {
    params: Promise.resolve({ competencia }),
  });
}

/** The jornadas the route asked the DB layer for, with each one's team number. */
function jornadasPedidas(): [string, number][] {
  const [jornadas] = db.obtenerResumenGrupo.mock.calls[0] as [JornadaResumen[]];
  return jornadas.map((j) => [j.jornada, j.equipo.numero]);
}

beforeEach(() => {
  sesion.getSesion.mockResolvedValue(DOCENTE);
  db.obtenerResumenGrupo.mockResolvedValue(RESUMEN);
});

afterEach(() => {
  vi.resetAllMocks();
  vi.restoreAllMocks();
});

describe("GET /api/reportes/[competencia]/grupo", () => {
  it("401 sin sesión y 403 para evaluador o admin, sin tocar la base de datos", async () => {
    sesion.getSesion.mockResolvedValue(null);
    expect((await pedir("adaptabilidad")).status).toBe(401);
    sesion.getSesion.mockResolvedValue({ ...DOCENTE, rol: "evaluador", integranteId: "gabriela-salgado" });
    expect((await pedir("adaptabilidad", "?jornada=ambas")).status).toBe(403);
    sesion.getSesion.mockResolvedValue({ ...DOCENTE, rol: "admin" });
    expect((await pedir("adaptabilidad")).status).toBe(403);
    expect(db.obtenerResumenGrupo).not.toHaveBeenCalled();
  });

  it("sin ?jornada= usa la jornada de la sesión", async () => {
    const respuesta = await pedir("adaptabilidad");
    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get("Cache-Control")).toBe("no-store");
    await expect(respuesta.json()).resolves.toEqual(RESUMEN);
    expect(jornadasPedidas()).toEqual([["noche", 1]]);
  });

  it.each(["?jornada=tarde", "?jornada=", "?jornada=Ambas", "?otra=manana"])("un valor inválido (%s) vuelve a la jornada de la sesión", async (consulta) => {
    expect((await pedir("adaptabilidad", consulta)).status).toBe(200);
    expect(jornadasPedidas()).toEqual([["noche", 1]]);
  });

  it("«ambas» compara cada jornada con su propio equipo (Equipo 4 en la mañana, Equipo 1 en la noche)", async () => {
    expect((await pedir("adaptabilidad", "?jornada=ambas")).status).toBe(200);
    expect(jornadasPedidas()).toEqual([
      ["manana", 4],
      ["noche", 1],
    ]);
  });

  it("es de solo lectura: no firma una sesión nueva", async () => {
    const respuesta = await pedir("adaptabilidad", "?jornada=manana");
    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get("Set-Cookie")).toBeNull();
    expect(jornadasPedidas()).toEqual([["manana", 4]]);
  });

  it("404 para una competencia sin plantilla en la jornada pedida ni en la de la sesión", async () => {
    sinRubrica("noche", "pensamiento-critico"); // no real night-less rubric since v1.7
    const respuesta = await pedir("pensamiento-critico", "?jornada=ambas");
    expect(respuesta.status).toBe(404);
    await expect(respuesta.json()).resolves.toEqual({ error: "La competencia no existe o no está habilitada." });
    expect((await pedir("no-existe")).status).toBe(404);
    expect(db.obtenerResumenGrupo).not.toHaveBeenCalled();
  });

  it("500 con mensaje en español si falla la base de datos", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    db.obtenerResumenGrupo.mockRejectedValue(new Error("db caída"));
    const respuesta = await pedir("adaptabilidad");
    expect(respuesta.status).toBe(500);
    await expect(respuesta.json()).resolves.toEqual({ error: "No se pudo cargar el reporte. Intente de nuevo." });
  });
});
