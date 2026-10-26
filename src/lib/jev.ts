import "server-only";
import { APIError, APITimeoutError, noul, RateLimitError, score, TypeSafeClient } from "@typesafe-ai/sdk";
import { z } from "zod";
import type { Competencia, Indicador } from "@/config/competencias";
import { NIVELES, VALORES_NIVEL, type NivelValor } from "@/config/niveles";
import { TEXTOS } from "@/config/textos";
import { MARGEN_MINIMO, UMBRAL_CONFIANZA, type SugerenciaJev } from "@/lib/sugerencia";
import { TOLERANCIA_SUMA_PROBABILIDADES } from "@/lib/validacion";

// Jev client (PRD §8, CLAUDE.md → Jev integration). Only /api/jev and the
// golden-set script call it; the API key never leaves the server.
//
// One request per "Analizar" with two questions over the same state: a Score
// over the 4 level descriptions (0-based, Básico → Experto) and a Noul that
// checks the text is about the indicator. The state is built only from server
// config plus the observation: no ids, participant codes or names.
//
// This module never logs: the caller logs status, latency and model only.

export { MARGEN_MINIMO, UMBRAL_CONFIANZA, UMBRAL_PERTINENCIA } from "@/lib/sugerencia";

/** Total budget for one analysis (PRD §8.3: timeout → 504). */
export const TIEMPO_LIMITE_MS = 8000;
const MODELO_PREDETERMINADO = "jev-1.13.0";

// ---------------------------------------------------------------------------
// Question wording: the part people audit and edit, kept in one place.

const INSTRUCCION_NIVEL = "Nivel de conducta que mejor describe la observación para este indicador";
const INSTRUCCION_PERTINENCIA = "La observación describe comportamientos observables relacionados con el indicador";

export function solicitudJev(competencia: Competencia, indicador: Indicador, texto: string) {
  return {
    state: {
      competencia: `${competencia.nombre}: ${competencia.definicion}`,
      indicador: indicador.titulo,
      observacion: texto,
    },
    questions: {
      nivel: score(
        INSTRUCCION_NIVEL,
        NIVELES.map((n) => `${n.etiqueta}: ${indicador.niveles[n.valor]}`),
      ),
      pertinente: noul(INSTRUCCION_PERTINENCIA),
    },
  };
}

// ---------------------------------------------------------------------------
// Client

let cliente: TypeSafeClient | null = null;

/**
 * Created on first use, so importing this module (e.g. during `next build`)
 * doesn't need TYPESAFE_API_KEY. The SDK's timeout is per attempt with no
 * total budget, so retries are off: one 8 s attempt, and the evaluator can
 * tap "Analizar" again. Logging is off because the SDK's debug level logs
 * request bodies, i.e. the observation text.
 */
function getCliente(): TypeSafeClient {
  cliente ??= new TypeSafeClient({
    defaultModel: process.env.JEV_MODEL || MODELO_PREDETERMINADO,
    timeout: TIEMPO_LIMITE_MS,
    retry: { maxRetries: 0 },
    logLevel: "off",
  });
  return cliente;
}

/** Tests only: drop the cached client so env changes take effect. */
export function reiniciarCliente(): void {
  cliente = null;
}

// ---------------------------------------------------------------------------
// Response validation and mapping to the proxy contract

const probabilidad = z.number().finite().min(0).max(1);
// Absorbs float noise in the sum, as in validacion.ts.
const RUIDO_FLOTANTE = 1e-9;
const CLAVES_SCORE = NIVELES.map((_, i) => String(i));

const esquemaRespuesta = z.object({
  model: z.string().min(1),
  answers: z.object({
    nivel: z.object({
      type: z.literal("score"),
      confidence: probabilidad,
      probabilities: z
        .record(z.string(), probabilidad)
        .refine((p) => Object.keys(p).length === CLAVES_SCORE.length && CLAVES_SCORE.every((c) => c in p))
        .refine(
          (p) => Math.abs(Object.values(p).reduce((s, v) => s + v, 0) - 1) <= TOLERANCIA_SUMA_PROBABILIDADES + RUIDO_FLOTANTE,
        ),
    }),
    pertinente: z.object({ type: z.literal("noul"), noul: probabilidad }),
  }),
});

/**
 * Maps a raw Jev response to the PRD §8.3 contract, or null if it doesn't
 * have the expected shape (wrong answer types, not exactly 4 probabilities,
 * a sum off by more than 0.02, values outside [0, 1]).
 */
export function mapear(respuesta: unknown): SugerenciaJev | null {
  const forma = esquemaRespuesta.safeParse(respuesta);
  if (!forma.success) return null;
  const { model, answers } = forma.data;

  const probabilidades: Record<string, number> = {};
  for (const [i, valor] of VALORES_NIVEL.entries()) probabilidades[String(valor)] = answers.nivel.probabilities[String(i)];

  // Highest first; a tie keeps the lower level first (stable sort).
  const orden = [...VALORES_NIVEL].sort((a, b) => probabilidades[b] - probabilidades[a]);
  const [primero, segundo] = orden as [NivelValor, NivelValor];
  const tope = probabilidades[primero];
  const bajaConfianza = tope < UMBRAL_CONFIANZA || tope - probabilidades[segundo] < MARGEN_MINIMO;

  return {
    nivelSugerido: primero,
    probabilidades,
    confianza: answers.nivel.confidence,
    pertinencia: answers.pertinente.noul,
    baja_confianza: bajaConfianza,
    alternativa: bajaConfianza ? segundo : null,
    modelo: model,
  };
}

export type ResultadoJev =
  | { ok: true; sugerencia: SugerenciaJev }
  | { ok: false; status: 429 | 502 | 504; error: string; retryAfterS?: number; statusJev?: number };

/** Maps an SDK failure to the proxy's status (PRD §8.3). */
export function mapearError(error: unknown): Extract<ResultadoJev, { ok: false }> {
  if (error instanceof RateLimitError) {
    const retryAfterS = error.retryAfterMs !== undefined ? Math.max(1, Math.ceil(error.retryAfterMs / 1000)) : undefined;
    return { ok: false, status: 429, error: TEXTOS.ia.error, retryAfterS, statusJev: 429 };
  }
  // Before any APIConnectionError check: a timeout is a kind of connection error.
  if (error instanceof APITimeoutError) return { ok: false, status: 504, error: TEXTOS.ia.tiempoAgotado };
  // 5xx and 529, but also 400/401/422: those mean our request or key is wrong,
  // which the evaluator can't fix either.
  if (error instanceof APIError) return { ok: false, status: 502, error: TEXTOS.ia.error, statusJev: error.status };
  // Connection failures, a missing API key (TypeSafeError), anything else.
  return { ok: false, status: 502, error: TEXTOS.ia.error };
}

/**
 * Asks Jev for a level suggestion for one indicator. Never throws. The
 * evaluator always decides: the result is only shown, never applied.
 */
export async function sugerirNivel(competencia: Competencia, indicador: Indicador, texto: string): Promise<ResultadoJev> {
  let respuesta: unknown;
  try {
    respuesta = await getCliente().systemOne(solicitudJev(competencia, indicador, texto));
  } catch (error) {
    return mapearError(error);
  }
  const sugerencia = mapear(respuesta);
  if (!sugerencia) return { ok: false, status: 502, error: TEXTOS.ia.error };
  return { ok: true, sugerencia };
}
