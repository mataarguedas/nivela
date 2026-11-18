import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { obtenerCompetencia } from "@/config/competencias";
import type { Equipo } from "@/config/equipos";
import { crearParticipante } from "@/config/participantes";
import { agregarReporte, type FilaReporte } from "@/lib/reportes";
import { seleccionarDestinatarios, type UltimoEnvio } from "@/lib/resultados";

// enviarResultados (PRD §5.14) with the mail provider and the DB mocked:
// only recipients are sent, already-sent ones need "Reenviar", every attempt
// is recorded, one failure never stops the rest, a rate limit is retried
// once, sends are paced, and each carries its idempotency key.

const correo = vi.hoisted(() => ({ enviarCorreo: vi.fn() }));
const envios = vi.hoisted(() => ({ registrarEnvio: vi.fn(), leerUltimosEnvios: vi.fn() }));
vi.mock("@/lib/correo", async (original) => ({ ...(await original<typeof import("@/lib/correo")>()), ...correo }));
vi.mock("@/lib/db/envios", () => envios);
vi.mock("@/lib/db/participantes", () => ({ obtenerParticipantes: vi.fn(), obtenerCorreosParticipantes: vi.fn() }));
vi.mock("@/lib/db/reportes", () => ({ obtenerReporte: vi.fn() }));

const { ErrorCorreo } = await import("@/lib/correo");
const { enviarPrueba, enviarResultados, plantillaParaParticipante } = await import("@/lib/envioResultados");
type ContextoEnvio = import("@/lib/envioResultados").ContextoEnvio;

const competencia = obtenerCompetencia("manana", "adaptabilidad")!;
const equipo: Equipo = {
  id: "equipo-prueba",
  numero: 4,
  jornada: "manana",
  competenciaId: "adaptabilidad",
  integrantes: [{ id: "e1", nombre: "Evaluadora Uno", curso: "AGRH 315 Psicología 2" }],
};
const ACTUALIZADO = "2026-11-17T15:00:00.000Z";

function evaluacion(participanteId: string, nivel: number): FilaReporte[] {
  return [1, 2, 3, 4].map((n) => ({
    evaluadorId: "e1",
    participanteId,
    actualizadoEn: ACTUALIZADO,
    indicadorId: `adaptabilidad-${n}`,
    nivel,
    origen: "manual" as const,
    observacion: null,
    iaNivelSugerido: null,
    iaConfianza: null,
  }));
}

// P01–P04 evaluated; P04 has no email; P05 has no evaluations.
const participantes = [1, 2, 3, 4, 5].map((n) => crearParticipante(n, `Persona ${n}`, `10000000${n}`));
const reporte = agregarReporte(competencia, equipo, participantes, [
  ...evaluacion("P01", 3),
  ...evaluacion("P02", 2),
  ...evaluacion("P03", 4),
  ...evaluacion("P04", 1),
]);
const correoDe = (id: string) => `${id.toLowerCase()}@ejemplo.test`;

function contexto(enviosPrevios: Record<string, UltimoEnvio> = {}): ContextoEnvio {
  const correos = new Map(["P01", "P02", "P03", "P05"].map((id) => [id, correoDe(id)]));
  const mapaEnvios = new Map(Object.entries(enviosPrevios));
  return {
    jornada: "manana",
    competencia,
    reporte,
    nombres: new Map(participantes.map((p) => [p.id, p.nombre])),
    correos,
    envios: mapaEnvios,
    seleccion: seleccionarDestinatarios(reporte.participantes, new Set(correos.keys()), mapaEnvios),
  };
}

const dormir = vi.fn<(ms: number) => Promise<void>>(async () => {});
const opciones = { pausaMs: 600, dormir };

beforeEach(() => {
  correo.enviarCorreo.mockResolvedValue({ id: "re_1" });
  envios.registrarEnvio.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.resetAllMocks();
});

describe("enviarResultados", () => {
  it("envía a cada destinatario su propio correo con clave de idempotencia, y registra cada envío", async () => {
    const resultado = await enviarResultados(contexto(), ["P01", "P02"], false, opciones);
    expect(resultado).toEqual({ enviados: 2, errores: [] });
    expect(correo.enviarCorreo).toHaveBeenCalledTimes(2);
    const [primero] = correo.enviarCorreo.mock.calls[0];
    expect(primero).toMatchObject({
      plantilla: "resultados",
      para: "p01@ejemplo.test",
      asunto: "Sus resultados de Adaptabilidad · Nivela",
      idempotencia: `manana-adaptabilidad-P01-${Date.parse(ACTUALIZADO)}`,
    });
    expect(primero.texto).toContain("Hola, Persona 1:");
    expect(primero.texto).not.toContain("Evaluadora Uno");
    expect(envios.registrarEnvio.mock.calls).toEqual([
      ["manana", "adaptabilidad", "P01", "enviado", null],
      ["manana", "adaptabilidad", "P02", "enviado", null],
    ]);
    // One pause between the two sends, none before the first.
    expect(dormir.mock.calls).toEqual([[600]]);
  });

  it("no envía a quien no es destinatario ni a un id desconocido; lo informa sin registrarlo", async () => {
    const resultado = await enviarResultados(contexto(), ["P04", "P05", "P77", "P01", "P01"], false, opciones);
    expect(resultado).toEqual({
      enviados: 1,
      errores: [
        { participanteId: "P04", motivo: "sin-correo" },
        { participanteId: "P05", motivo: "sin-evaluaciones" },
        { participanteId: "P77", motivo: "no-existe" },
      ],
    });
    expect(correo.enviarCorreo).toHaveBeenCalledTimes(1);
    expect(envios.registrarEnvio).toHaveBeenCalledTimes(1);
  });

  it("a quien ya recibió sus resultados solo se le reenvía con «Reenviar», con una clave nueva", async () => {
    const previos = { P01: { estado: "enviado" as const, enviadoEn: "2026-11-17T18:00:00.000Z", enviados: 1 } };
    const sinReenviar = await enviarResultados(contexto(previos), ["P01"], false, opciones);
    expect(sinReenviar).toEqual({ enviados: 0, errores: [{ participanteId: "P01", motivo: "ya-enviado" }] });
    expect(correo.enviarCorreo).not.toHaveBeenCalled();

    const conReenviar = await enviarResultados(contexto(previos), ["P01"], true, opciones);
    expect(conReenviar).toEqual({ enviados: 1, errores: [] });
    expect(correo.enviarCorreo.mock.calls[0][0].idempotencia).toBe(`manana-adaptabilidad-P01-${Date.parse(ACTUALIZADO)}-reenvio-1`);
  });

  it("tras un error, el siguiente envío reintenta solo con la misma clave (sin duplicar si Resend ya lo aceptó)", async () => {
    const previos = { P01: { estado: "error" as const, enviadoEn: "2026-11-17T18:00:00.000Z", enviados: 0 } };
    await enviarResultados(contexto(previos), ["P01"], false, opciones);
    expect(correo.enviarCorreo.mock.calls[0][0].idempotencia).toBe(`manana-adaptabilidad-P01-${Date.parse(ACTUALIZADO)}`);
  });

  it("un fallo del proveedor se registra e informa, y los demás se envían igual", async () => {
    correo.enviarCorreo.mockRejectedValueOnce(new ErrorCorreo("rechazado", 422)).mockResolvedValue({ id: "re_2" });
    const resultado = await enviarResultados(contexto(), ["P01", "P02", "P03"], false, opciones);
    expect(resultado).toEqual({ enviados: 2, errores: [{ participanteId: "P01", motivo: "rechazado" }] });
    expect(envios.registrarEnvio.mock.calls.map((c) => [c[2], c[3], c[4]])).toEqual([
      ["P01", "error", "rechazado"],
      ["P02", "enviado", null],
      ["P03", "enviado", null],
    ]);
  });

  it("ante un límite de Resend espera (Retry-After, con tope) y reintenta una vez", async () => {
    correo.enviarCorreo.mockRejectedValueOnce(new ErrorCorreo("limite", 429, 2)).mockResolvedValueOnce({ id: "re_3" });
    expect(await enviarResultados(contexto(), ["P01"], false, opciones)).toEqual({ enviados: 1, errores: [] });
    expect(dormir.mock.calls).toEqual([[2000]]);

    correo.enviarCorreo.mockReset();
    dormir.mockClear();
    correo.enviarCorreo.mockRejectedValue(new ErrorCorreo("limite", 429, 60));
    expect(await enviarResultados(contexto(), ["P02"], false, opciones)).toEqual({
      enviados: 0,
      errores: [{ participanteId: "P02", motivo: "limite" }],
    });
    expect(correo.enviarCorreo).toHaveBeenCalledTimes(2);
    expect(dormir.mock.calls).toEqual([[5000]]);
  });
});

describe("vista previa y prueba", () => {
  it("la vista previa es el mismo correo; sin evaluaciones no hay", () => {
    const plantilla = plantillaParaParticipante(contexto(), "P03")!;
    expect(plantilla.texto).toContain("Nivel general: Experto");
    expect(plantillaParaParticipante(contexto(), "P05")).toBeNull();
    expect(plantillaParaParticipante(contexto(), "P77")).toBeNull();
  });

  it("la prueba va a la dirección indicada, marcada en el asunto, sin registrarse ni clave de idempotencia", async () => {
    expect(await enviarPrueba(contexto(), "P02", "docente@ejemplo.test")).toBe(true);
    const [enviado] = correo.enviarCorreo.mock.calls[0];
    expect(enviado).toMatchObject({ para: "docente@ejemplo.test", asunto: "[Prueba] Sus resultados de Adaptabilidad · Nivela" });
    expect(enviado.idempotencia).toBeUndefined();
    expect(envios.registrarEnvio).not.toHaveBeenCalled();
    expect(await enviarPrueba(contexto(), "P05", "docente@ejemplo.test")).toBe(false);
  });
});
