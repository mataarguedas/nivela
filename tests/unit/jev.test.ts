import { APIConnectionError, APIError, APITimeoutError, TypeSafeError } from "@typesafe-ai/sdk";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { obtenerCompetencia } from "@/config/competencias";

// jev.ts with the SDK client mocked: no network. The real question builders
// and error classes are kept, so the payload and the error mapping are the
// ones production sends and sees. Only `npm run jev:evaluar` calls live Jev.

const sdk = vi.hoisted(() => ({ systemOne: vi.fn(), opciones: [] as unknown[] }));

vi.mock("@typesafe-ai/sdk", async (importOriginal) => {
  const real = await importOriginal<typeof import("@typesafe-ai/sdk")>();
  return {
    ...real,
    TypeSafeClient: vi.fn(function (this: unknown, opciones: unknown) {
      sdk.opciones.push(opciones);
      return { systemOne: sdk.systemOne };
    }),
  };
});

const { mapear, reiniciarCliente, sugerirNivel } = await import("@/lib/jev");

const competencia = obtenerCompetencia("adaptabilidad")!;
const indicador = competencia.indicadores[0];
const TEXTO = "Adaptó su método de trabajo apenas recibió el nuevo procedimiento, sin pedir ayuda.";

function respuesta(probabilities: Record<string, number>, noul = 0.93, extra: { confidence?: number; model?: string } = {}) {
  return {
    model: extra.model ?? "jev-1.13.0",
    answers: {
      nivel: { type: "score", score: 2, confidence: extra.confidence ?? 0.71, legend: {}, probabilities },
      pertinente: { type: "noul", noul },
    },
    usage: { input_tokens: 400, output_tokens: 20 },
  };
}

const NORMAL = { "0": 0.05, "1": 0.17, "2": 0.78, "3": 0 };

beforeEach(() => {
  reiniciarCliente();
  sdk.opciones.length = 0;
  vi.stubEnv("JEV_MODEL", "jev-1.13.0");
});

afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
});

describe("mapear (contrato PRD §8.3)", () => {
  it("normal: nivel = argmax + 1, probabilidades con claves 1–4, sin alternativa", () => {
    expect(mapear(respuesta(NORMAL))).toEqual({
      nivelSugerido: 3,
      probabilidades: { "1": 0.05, "2": 0.17, "3": 0.78, "4": 0 },
      confianza: 0.71,
      pertinencia: 0.93,
      baja_confianza: false,
      alternativa: null,
      modelo: "jev-1.13.0",
    });
  });

  it("baja confianza cuando la mayor probabilidad es < 0,6; la alternativa es el segundo nivel", () => {
    const s = mapear(respuesta({ "0": 0.02, "1": 0.55, "2": 0.03, "3": 0.4 }))!;
    expect(s).toMatchObject({ nivelSugerido: 2, baja_confianza: true, alternativa: 4 });
  });

  it("baja confianza por margen: diferencia < 0,15 con el segundo nivel", () => {
    // Above 0.6 the gap to the second can't be < 0.15 with 4 levels summing
    // to 1 (0.6 + 0.45 > 1), so a margin-only case has the top level below
    // 0.6 too; the 0.65/0.20 case below shows a clear gap stays confident.
    const s = mapear(respuesta({ "0": 0, "1": 0, "2": 0.565, "3": 0.435 }))!;
    expect(s).toMatchObject({ nivelSugerido: 3, baja_confianza: true, alternativa: 4 });
    const holgada = mapear(respuesta({ "0": 0, "1": 0.2, "2": 0.65, "3": 0.15 }))!;
    expect(holgada).toMatchObject({ nivelSugerido: 3, baja_confianza: false, alternativa: null });
  });

  it("un empate se resuelve hacia el nivel más bajo", () => {
    const s = mapear(respuesta({ "0": 0, "1": 0.5, "2": 0.5, "3": 0 }))!;
    expect(s).toMatchObject({ nivelSugerido: 2, alternativa: 3, baja_confianza: true });
  });

  it("fuera de tema: devuelve la pertinencia baja tal cual, con la sugerencia", () => {
    const s = mapear(respuesta(NORMAL, 0.08))!;
    expect(s.pertinencia).toBe(0.08);
    expect(s.nivelSugerido).toBe(3);
  });

  it("usa el modelo que respondió", () => {
    expect(mapear(respuesta(NORMAL, 0.9, { model: "jev-1.13.0-x" }))!.modelo).toBe("jev-1.13.0-x");
  });

  it("acepta una suma dentro de 1 ± 0,02", () => {
    expect(mapear(respuesta({ "0": 0.05, "1": 0.17, "2": 0.79, "3": 0.01 }))).not.toBeNull();
  });

  const malformadas: [string, unknown][] = [
    ["nulo", null],
    ["sin respuestas", { model: "jev-1.13.0", answers: {} }],
    ["tipo de nivel equivocado", { ...respuesta(NORMAL), answers: { ...respuesta(NORMAL).answers, nivel: { type: "choice", choice: "x", confidence: 1, probabilities: NORMAL } } }],
    ["tipo de pertinencia equivocado", { ...respuesta(NORMAL), answers: { ...respuesta(NORMAL).answers, pertinente: { type: "score", noul: 0.5 } } }],
    ["falta la pertinencia", { model: "jev-1.13.0", answers: { nivel: respuesta(NORMAL).answers.nivel } }],
    ["3 claves", respuesta({ "0": 0.2, "1": 0.3, "2": 0.5 })],
    ["una clave de más", respuesta({ ...NORMAL, "4": 0 })],
    ["claves 1–4 en vez de 0–3", respuesta({ "1": 0.05, "2": 0.17, "3": 0.78, "4": 0 })],
    ["suma 0,9", respuesta({ "0": 0.1, "1": 0.1, "2": 0.6, "3": 0.1 })],
    ["NaN", respuesta({ "0": Number.NaN, "1": 0.17, "2": 0.78, "3": 0.05 })],
    ["probabilidad negativa", respuesta({ "0": -0.1, "1": 0.27, "2": 0.78, "3": 0.05 })],
    ["pertinencia > 1", respuesta(NORMAL, 1.4)],
    ["sin modelo", { ...respuesta(NORMAL), model: "" }],
  ];

  it.each(malformadas)("rechaza una respuesta malformada: %s", (_caso, datos) => {
    expect(mapear(datos)).toBeNull();
  });
});

describe("sugerirNivel", () => {
  it("envía una sola solicitud con el estado mínimo y las dos preguntas", async () => {
    sdk.systemOne.mockResolvedValue(respuesta(NORMAL));
    const resultado = await sugerirNivel(competencia, indicador, TEXTO);
    expect(resultado).toMatchObject({ ok: true, sugerencia: { nivelSugerido: 3 } });

    expect(sdk.systemOne).toHaveBeenCalledTimes(1);
    const [solicitud] = sdk.systemOne.mock.calls[0];
    expect(Object.keys(solicitud)).toEqual(["state", "questions"]);
    expect(solicitud.state).toEqual({
      competencia: `Adaptabilidad: ${competencia.definicion}`,
      indicador: "Modifica su forma de actuar ante cambios.",
      observacion: TEXTO,
    });
    expect(solicitud.questions.nivel).toEqual({
      type: "score",
      instructions: "Nivel de conducta que mejor describe la observación para este indicador",
      criteria: [
        `Básico: ${indicador.niveles[1]}`,
        `Intermedio: ${indicador.niveles[2]}`,
        `Avanzado: ${indicador.niveles[3]}`,
        `Experto: ${indicador.niveles[4]}`,
      ],
    });
    expect(solicitud.questions.pertinente).toMatchObject({
      type: "noul",
      instructions: "La observación describe comportamientos observables relacionados con el indicador",
    });
    // No ids, participant codes or evaluator names anywhere in the payload.
    const enviado = JSON.stringify(solicitud);
    expect(enviado).not.toMatch(/P\d\d|adaptabilidad-1|jimena|Participante/i);
  });

  it("crea el cliente con el modelo fijado, 8 s, sin reintentos y sin registro", async () => {
    vi.stubEnv("JEV_MODEL", "jev-1.13.0");
    sdk.systemOne.mockResolvedValue(respuesta(NORMAL));
    await sugerirNivel(competencia, indicador, TEXTO);
    await sugerirNivel(competencia, indicador, TEXTO);
    expect(sdk.opciones).toEqual([
      { defaultModel: "jev-1.13.0", timeout: 8000, retry: { maxRetries: 0 }, logLevel: "off" },
    ]); // created once
  });

  it("sin JEV_MODEL usa jev-1.13.0, nunca jev-latest", async () => {
    vi.stubEnv("JEV_MODEL", "");
    sdk.systemOne.mockResolvedValue(respuesta(NORMAL));
    await sugerirNivel(competencia, indicador, TEXTO);
    expect(sdk.opciones[0]).toMatchObject({ defaultModel: "jev-1.13.0" });
  });

  it("una respuesta malformada es 502", async () => {
    sdk.systemOne.mockResolvedValue(respuesta({ "0": 0.5, "1": 0.5 }));
    await expect(sugerirNivel(competencia, indicador, TEXTO)).resolves.toEqual({
      ok: false,
      status: 502,
      error: "No fue posible analizar el texto en este momento. Intente de nuevo o seleccione el nivel manualmente.",
    });
  });

  it("el tiempo agotado es 504", async () => {
    sdk.systemOne.mockRejectedValue(new APITimeoutError(8000));
    await expect(sugerirNivel(competencia, indicador, TEXTO)).resolves.toMatchObject({
      ok: false,
      status: 504,
      error: "El análisis tardó demasiado. Intente de nuevo o seleccione el nivel manualmente.",
    });
  });

  it("429 de Jev pasa como 429 con Retry-After en segundos", async () => {
    sdk.systemOne.mockRejectedValue(APIError.fromResponse(429, { error: "rate" }, new Headers({ "retry-after": "12" })));
    await expect(sugerirNivel(competencia, indicador, TEXTO)).resolves.toMatchObject({
      ok: false,
      status: 429,
      retryAfterS: 12,
    });
  });

  it("429 sin Retry-After no inventa uno", async () => {
    sdk.systemOne.mockRejectedValue(APIError.fromResponse(429, {}, new Headers()));
    const resultado = await sugerirNivel(competencia, indicador, TEXTO);
    expect(resultado).toMatchObject({ ok: false, status: 429 });
    expect(resultado.ok === false && resultado.retryAfterS).toBeUndefined();
  });

  it.each([500, 503, 529, 401, 422])("Jev %i es 502", async (status) => {
    sdk.systemOne.mockRejectedValue(APIError.fromResponse(status, {}, new Headers()));
    await expect(sugerirNivel(competencia, indicador, TEXTO)).resolves.toMatchObject({ ok: false, status: 502, statusJev: status });
  });

  it("un fallo de conexión es 502", async () => {
    sdk.systemOne.mockRejectedValue(new APIConnectionError("fetch failed"));
    await expect(sugerirNivel(competencia, indicador, TEXTO)).resolves.toMatchObject({ ok: false, status: 502 });
  });

  it("sin API key (el constructor lanza) es 502, sin lanzar", async () => {
    const { TypeSafeClient } = await import("@typesafe-ai/sdk");
    vi.mocked(TypeSafeClient).mockImplementationOnce(function () {
      throw new TypeSafeError("API key is required");
    });
    await expect(sugerirNivel(competencia, indicador, TEXTO)).resolves.toMatchObject({ ok: false, status: 502 });
  });
});
