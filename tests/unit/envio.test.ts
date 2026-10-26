import { afterEach, describe, expect, it, vi } from "vitest";
import type { EntradaParticipante } from "@/lib/borrador";
import { consultarEnviadas, cuerpoEvaluacion, enviarEvaluacion } from "@/lib/envio";
import { validarEvaluacion } from "@/lib/validacion";

const INDICADORES = ["adaptabilidad-1", "adaptabilidad-2", "adaptabilidad-3", "adaptabilidad-4"];
const IDS = { competenciaId: "adaptabilidad", evaluadorId: "jimena-salgado", participanteId: "P01" };
const IA = { nivelSugerido: 3, probabilidades: { "1": 0.05, "2": 0.17, "3": 0.78, "4": 0 }, confianza: 0.71, modelo: "jev-1.13.0" };

function entrada(calificaciones: EntradaParticipante["calificaciones"]): EntradaParticipante {
  return { calificaciones, modificadoEn: "2026-10-25T10:00:00.000Z" };
}

const completa = entrada({
  "adaptabilidad-1": { nivel: 3, origen: "ia", ia: IA, observacion: "  Adaptó su método.  " },
  "adaptabilidad-2": { nivel: 2, origen: "manual", observacion: "   " },
  "adaptabilidad-3": { nivel: 4, origen: "manual", ia: IA },
  "adaptabilidad-4": { nivel: 1 },
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("cuerpoEvaluacion", () => {
  it("arma el cuerpo en el orden de los indicadores y pasa la validación del servidor", () => {
    const cuerpo = cuerpoEvaluacion(IDS, completa, INDICADORES);
    expect(cuerpo).toEqual({
      ...IDS,
      calificaciones: [
        { indicadorId: "adaptabilidad-1", nivel: 3, origen: "ia", observacion: "Adaptó su método.", ia: IA },
        { indicadorId: "adaptabilidad-2", nivel: 2, origen: "manual" },
        { indicadorId: "adaptabilidad-3", nivel: 4, origen: "manual", ia: IA },
        { indicadorId: "adaptabilidad-4", nivel: 1, origen: "manual" },
      ],
    });
    expect(validarEvaluacion(cuerpo).ok).toBe(true);
  });

  it("es null mientras falte un nivel", () => {
    const tres = { ...completa.calificaciones };
    delete tres["adaptabilidad-4"];
    expect(cuerpoEvaluacion(IDS, entrada(tres), INDICADORES)).toBeNull();
    expect(cuerpoEvaluacion(IDS, undefined, INDICADORES)).toBeNull();
  });
});

describe("enviarEvaluacion", () => {
  it("devuelve actualizadoEn si el servidor responde 200", async () => {
    const fetchSimulado = vi.fn(async () => Response.json({ id: "x", actualizadoEn: "2026-10-25T10:00:01.000Z" }));
    vi.stubGlobal("fetch", fetchSimulado);
    const cuerpo = cuerpoEvaluacion(IDS, completa, INDICADORES)!;
    await expect(enviarEvaluacion(cuerpo)).resolves.toEqual({ ok: true, actualizadoEn: "2026-10-25T10:00:01.000Z" });
    expect(fetchSimulado).toHaveBeenCalledWith("/api/evaluaciones", expect.objectContaining({ method: "POST", body: JSON.stringify(cuerpo) }));
  });

  it("nunca lanza: estado HTTP o 0 sin red", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ error: "x" }, { status: 500 })));
    await expect(enviarEvaluacion(cuerpoEvaluacion(IDS, completa, INDICADORES)!)).resolves.toEqual({ ok: false, status: 500 });
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))));
    await expect(enviarEvaluacion(cuerpoEvaluacion(IDS, completa, INDICADORES)!)).resolves.toEqual({ ok: false, status: 0 });
  });
});

describe("consultarEnviadas", () => {
  it("indexa updated_at por participante e ignora filas mal formadas", async () => {
    const fetchSimulado = vi.fn(async () =>
      Response.json({
        evaluaciones: [
          { participanteId: "P01", actualizadoEn: "2026-10-25T10:00:00.000Z" },
          { participanteId: 7 },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchSimulado);
    await expect(consultarEnviadas("adaptabilidad", "jimena-salgado")).resolves.toEqual({ P01: "2026-10-25T10:00:00.000Z" });
    expect(fetchSimulado).toHaveBeenCalledWith(
      "/api/evaluaciones?competencia=adaptabilidad&evaluador=jimena-salgado",
      expect.anything(),
    );
  });

  it("null si falla", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ error: "x" }, { status: 401 })));
    await expect(consultarEnviadas("adaptabilidad", "jimena-salgado")).resolves.toBeNull();
  });
});
