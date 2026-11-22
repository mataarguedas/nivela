import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// GET /api/reportes/consolidado/pdf (PRD §10, §5.14 v1.16) with the send
// layer mocked: docente only, the session's jornada only (never one from the
// request), the participant id validated, 404 without evaluations, and a PDF
// download named by the report label, never by name, never cached.

const envio = vi.hoisted(() => ({ cargarContextoEnvio: vi.fn(), pdfParaParticipante: vi.fn() }));
const sesion = vi.hoisted(() => ({ getSesion: vi.fn() }));
vi.mock("@/lib/envioResultados", () => envio);
vi.mock("@/lib/sesion", () => sesion);

const { GET } = await import("@/app/api/reportes/consolidado/pdf/route");

const DOCENTE = { rol: "docente", sid: "0123456789abcdef0123", jornada: "noche" };
const PDF = new TextEncoder().encode("%PDF-1.7 prueba");
const CONTEXTO = {
  consolidado: {
    participantes: [
      { id: "P01", etiqueta: "1-0000-0001" },
      { id: "P02", etiqueta: "Participante 02" },
    ],
  },
};

const pedir = (consulta: string) => GET(new Request(`http://localhost/api/reportes/consolidado/pdf${consulta}`));

beforeEach(() => {
  sesion.getSesion.mockResolvedValue(DOCENTE);
  envio.cargarContextoEnvio.mockResolvedValue(CONTEXTO);
  envio.pdfParaParticipante.mockResolvedValue(PDF);
});

afterEach(() => {
  vi.resetAllMocks();
  vi.restoreAllMocks();
});

describe("GET /api/reportes/consolidado/pdf", () => {
  it("sin sesión 401; otros roles 403", async () => {
    sesion.getSesion.mockResolvedValueOnce(null);
    expect((await pedir("?participante=P01")).status).toBe(401);
    for (const rol of ["evaluador", "admin"]) {
      sesion.getSesion.mockResolvedValueOnce({ ...DOCENTE, rol });
      expect((await pedir("?participante=P01")).status).toBe(403);
    }
    expect(envio.cargarContextoEnvio).not.toHaveBeenCalled();
  });

  it("devuelve el PDF de la jornada de la sesión (nunca la de la consulta), sin caché y con el carné en el nombre", async () => {
    const respuesta = await pedir("?participante=P01&jornada=manana");
    expect(respuesta.status).toBe(200);
    expect(envio.cargarContextoEnvio).toHaveBeenCalledWith("noche");
    expect(envio.pdfParaParticipante).toHaveBeenCalledWith(CONTEXTO, "P01");
    expect(respuesta.headers.get("content-type")).toBe("application/pdf");
    expect(respuesta.headers.get("cache-control")).toBe("no-store");
    expect(respuesta.headers.get("content-disposition")).toBe('attachment; filename="nivela-reporte-general-1-0000-0001.pdf"');
    expect(new Uint8Array(await respuesta.arrayBuffer())).toEqual(PDF);
  });

  it("sin carné el archivo lleva el número del participante", async () => {
    const respuesta = await pedir("?participante=P02");
    expect(respuesta.headers.get("content-disposition")).toBe('attachment; filename="nivela-reporte-general-participante-02.pdf"');
  });

  it("id ausente o mal formado: 400 sin leer la base de datos", async () => {
    for (const consulta of ["", "?participante=", "?participante=../x", "?participante=P1"]) {
      expect((await pedir(consulta)).status).toBe(400);
    }
    expect(envio.cargarContextoEnvio).not.toHaveBeenCalled();
  });

  it("desconocido o sin evaluaciones: 404", async () => {
    expect((await pedir("?participante=P09")).status).toBe(404);
    envio.pdfParaParticipante.mockResolvedValueOnce(null);
    const respuesta = await pedir("?participante=P01");
    expect(respuesta.status).toBe(404);
    expect(await respuesta.json()).toEqual({ error: "Ese participante aún no tiene evaluaciones." });
  });

  it("un fallo se registra sin datos personales y responde 500 en español", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    envio.cargarContextoEnvio.mockRejectedValueOnce(new Error("db caída"));
    const respuesta = await pedir("?participante=P01");
    expect(respuesta.status).toBe(500);
    expect(await respuesta.json()).toEqual({ error: "No se pudo generar el PDF. Intente de nuevo." });
    expect(error).toHaveBeenCalled();
  });
});
