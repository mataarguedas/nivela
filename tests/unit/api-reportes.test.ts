import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FilaReporte } from "@/lib/reportes";

// /api/reportes/[competencia] and its /csv with the db layer and the session
// mocked. The aggregation itself is covered in reportes.test.ts.

const db = vi.hoisted(() => ({ leerFilasReporte: vi.fn(), obtenerReporte: vi.fn() }));
const sesion = vi.hoisted(() => ({ getSesion: vi.fn() }));
vi.mock("@/lib/db/reportes", () => db);
vi.mock("@/lib/sesion", () => sesion);

const { GET: GET_REPORTE } = await import("@/app/api/reportes/[competencia]/route");
const { GET: GET_CSV } = await import("@/app/api/reportes/[competencia]/csv/route");

const OBSERVACION = "Reorganizó sus actividades sin ayuda tras el cambio de prioridades.";
const DOCENTE = { rol: "docente", sid: "0123456789abcdef0123" };

const FILA: FilaReporte = {
  evaluadorId: "kristel-barrantes-lopez",
  participanteId: "P03",
  actualizadoEn: "2026-10-25T20:05:00.000Z",
  indicadorId: "adaptabilidad-2",
  nivel: 2,
  origen: "manual",
  observacion: OBSERVACION,
  iaNivelSugerido: null,
  iaConfianza: null,
};

function contexto(competencia: string) {
  return { params: Promise.resolve({ competencia }) };
}

const pedirReporte = (competencia = "adaptabilidad") =>
  GET_REPORTE(new Request(`http://localhost/api/reportes/${competencia}`), contexto(competencia));
const pedirCsv = (competencia = "adaptabilidad") =>
  GET_CSV(new Request(`http://localhost/api/reportes/${competencia}/csv`), contexto(competencia));

beforeEach(() => {
  sesion.getSesion.mockResolvedValue(DOCENTE);
});

afterEach(() => {
  vi.resetAllMocks();
  vi.restoreAllMocks();
});

describe.each([
  ["GET /api/reportes/[competencia]", pedirReporte],
  ["GET /api/reportes/[competencia]/csv", pedirCsv],
])("%s", (_ruta, pedir) => {
  it("401 sin sesión, sin tocar la base de datos", async () => {
    sesion.getSesion.mockResolvedValue(null);
    const respuesta = await pedir();
    expect(respuesta.status).toBe(401);
    await expect(respuesta.json()).resolves.toEqual({ error: "Debe ingresar el código de acceso para continuar." });
    expect(db.obtenerReporte).not.toHaveBeenCalled();
    expect(db.leerFilasReporte).not.toHaveBeenCalled();
  });

  it("403 para el rol evaluador", async () => {
    sesion.getSesion.mockResolvedValue({ rol: "evaluador", sid: "0123456789abcdef0123" });
    const respuesta = await pedir();
    expect(respuesta.status).toBe(403);
    await expect(respuesta.json()).resolves.toEqual({ error: "Esta sección requiere el código docente." });
  });

  it.each(["inexistente", "pensamiento-critico", ""])("404 para la competencia %j", async (competencia) => {
    const respuesta = await pedir(competencia);
    expect(respuesta.status).toBe(404);
    await expect(respuesta.json()).resolves.toEqual({ error: "La competencia no existe o no está habilitada." });
  });

  it("500 si falla la base de datos, sin registrar el texto de las observaciones", async () => {
    const registro = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = Object.assign(new Error(`Failed query: select ... params: ${OBSERVACION}`), { cause: { code: "57P01" } });
    db.obtenerReporte.mockRejectedValue(error);
    db.leerFilasReporte.mockRejectedValue(error);
    const respuesta = await pedir();
    expect(respuesta.status).toBe(500);
    expect((await respuesta.json()).error).toMatch(/^No se pudo (cargar el reporte|generar el CSV)\. Intente de nuevo\.$/);
    const registrado = registro.mock.calls.flat().map(String).join(" ");
    expect(registrado).toContain("57P01");
    expect(registrado).not.toContain(OBSERVACION);
  });
});

describe("GET /api/reportes/[competencia]", () => {
  it("devuelve el reporte agregado sin caché", async () => {
    db.obtenerReporte.mockResolvedValue({ vacio: true });
    const respuesta = await pedirReporte();
    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get("cache-control")).toBe("no-store");
    await expect(respuesta.json()).resolves.toEqual({ vacio: true });
    const [competencia, equipo] = db.obtenerReporte.mock.calls[0];
    expect(competencia.id).toBe("adaptabilidad");
    expect(equipo.competenciaId).toBe("adaptabilidad");
  });
});

describe("GET /api/reportes/[competencia]/csv", () => {
  it("descarga UTF-8 con BOM, nombre nivela-{competencia}-{fecha}.csv y tildes intactas", async () => {
    vi.useFakeTimers({ now: new Date("2026-10-26T03:00:00Z"), toFake: ["Date"] }); // 25/10 21:00 in Costa Rica
    db.leerFilasReporte.mockResolvedValue([FILA]);
    const respuesta = await pedirCsv();
    vi.useRealTimers();

    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(respuesta.headers.get("content-disposition")).toBe('attachment; filename="nivela-adaptabilidad-2026-10-25.csv"');
    expect(respuesta.headers.get("cache-control")).toBe("no-store");
    expect(db.leerFilasReporte).toHaveBeenCalledWith("adaptabilidad");

    const bytes = new Uint8Array(await respuesta.arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const texto = new TextDecoder("utf-8", { ignoreBOM: true }).decode(bytes);
    expect(texto).toContain("Adaptabilidad,Kristel Barrantes López,AGRH 613 Seminario Integrado de RRHH,P03,2,2,Intermedio,manual");
    expect(texto).toContain(OBSERVACION);
  });
});
