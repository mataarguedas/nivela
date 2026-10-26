import { afterEach, describe, expect, it, vi } from "vitest";
import { analizarTexto, leerSugerencia } from "@/lib/sugerencia";

// Client side of "Analizar": what goes out to /api/jev (PRD §8.4: never the
// participant or the evaluator) and how the reply is checked.

const SUGERENCIA = {
  nivelSugerido: 3,
  probabilidades: { "1": 0.05, "2": 0.17, "3": 0.78, "4": 0 },
  confianza: 0.71,
  pertinencia: 0.93,
  baja_confianza: false,
  alternativa: null,
  modelo: "jev-1.13.0",
};

const SOLICITUD = { competenciaId: "adaptabilidad", indicadorId: "adaptabilidad-1", texto: "Adaptó su método sin ayuda al nuevo procedimiento." };

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("leerSugerencia", () => {
  it("acepta el contrato", () => {
    expect(leerSugerencia(SUGERENCIA)).toEqual(SUGERENCIA);
    expect(leerSugerencia({ ...SUGERENCIA, baja_confianza: true, alternativa: 2 })).toMatchObject({ alternativa: 2 });
  });

  it.each([
    ["nulo", null],
    ["nivel fuera de rango", { ...SUGERENCIA, nivelSugerido: 5 }],
    ["3 probabilidades", { ...SUGERENCIA, probabilidades: { "1": 0.2, "2": 0.3, "3": 0.5 } }],
    ["probabilidad no numérica", { ...SUGERENCIA, probabilidades: { ...SUGERENCIA.probabilidades, "4": "0" } }],
    ["pertinencia ausente", { ...SUGERENCIA, pertinencia: undefined }],
    ["alternativa inválida", { ...SUGERENCIA, alternativa: 0 }],
    ["sin modelo", { ...SUGERENCIA, modelo: "" }],
  ])("rechaza: %s", (_caso, datos) => {
    expect(leerSugerencia(datos)).toBeNull();
  });
});

describe("analizarTexto", () => {
  it("envía solo competenciaId, indicadorId y texto", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json(SUGERENCIA));
    vi.stubGlobal("fetch", fetch);
    // Extra fields on the argument must not leak into the body.
    const conExtra = { ...SOLICITUD, participanteId: "P07", evaluadorId: "jimena-salgado" };
    await expect(analizarTexto(conExtra)).resolves.toEqual({ ok: true, sugerencia: SUGERENCIA });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("/api/jev");
    expect(JSON.parse(init.body)).toEqual(SOLICITUD);
  });

  it("devuelve el estado HTTP de un error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ error: "x" }, { status: 429 })));
    await expect(analizarTexto(SOLICITUD)).resolves.toEqual({ ok: false, status: 429 });
  });

  it("un fallo de red o un cuerpo inválido es status 0, sin lanzar", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(analizarTexto(SOLICITUD)).resolves.toEqual({ ok: false, status: 0 });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ nivelSugerido: 9 })));
    await expect(analizarTexto(SOLICITUD)).resolves.toEqual({ ok: false, status: 0 });
  });

  it("se puede cancelar", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init: RequestInit) => new Promise((_, rechazar) => init.signal!.addEventListener("abort", () => rechazar(new DOMException("abort", "AbortError"))))),
    );
    const control = new AbortController();
    const promesa = analizarTexto(SOLICITUD, control.signal);
    control.abort();
    await expect(promesa).resolves.toEqual({ ok: false, status: 0 });
  });
});
