import { esNivelValor, VALORES_NIVEL, type NivelValor } from "@/config/niveles";

// The /api/jev contract (PRD §8.3), shared by the server (src/lib/jev.ts) and
// the rating screen. Client-safe: no zod, no SDK. The thresholds live here so
// the UI reads the same pertinence cut-off the server documents; jev.ts
// re-exports them.

/** Below this top probability the suggestion is "low confidence" (PRD §5.6.4). */
export const UMBRAL_CONFIANZA = 0.6;
/** Below this gap between the top two levels the suggestion is "low confidence". */
export const MARGEN_MINIMO = 0.15;
/** Below this Noul the description looks unrelated to the indicator (PRD §5.6.5). */
export const UMBRAL_PERTINENCIA = 0.5;

export type SugerenciaJev = {
  nivelSugerido: NivelValor;
  /** Keyed "1".."4" (1-based levels). */
  probabilidades: Record<string, number>;
  confianza: number;
  pertinencia: number;
  baja_confianza: boolean;
  /** The second-best level when `baja_confianza`, else null. */
  alternativa: NivelValor | null;
  modelo: string;
};

export type SolicitudJev = { competenciaId: string; indicadorId: string; texto: string };

export type RespuestaJev = { ok: true; sugerencia: SugerenciaJev } | { ok: false; status: number };

/** Above the server's 8 s Jev timeout, so the server's 504 normally arrives first. */
const LIMITE_CLIENTE_MS = 15_000;

/**
 * Asks /api/jev for a suggestion. Never throws: a network failure, a timeout
 * or a malformed body is `{ ok: false, status: 0 }`; an aborted request too.
 */
export async function analizarTexto(solicitud: SolicitudJev, senal?: AbortSignal): Promise<RespuestaJev> {
  // AbortSignal.any() needs Safari 17.4; iOS 16.4 is supported, so combine by hand.
  const control = new AbortController();
  const abortar = () => control.abort();
  senal?.addEventListener("abort", abortar);
  const temporizador = setTimeout(abortar, LIMITE_CLIENTE_MS);
  try {
    const respuesta = await fetch("/api/jev", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Only these three fields: never the participant or the evaluator (PRD §8.4).
      body: JSON.stringify({
        competenciaId: solicitud.competenciaId,
        indicadorId: solicitud.indicadorId,
        texto: solicitud.texto,
      }),
      cache: "no-store",
      signal: control.signal,
    });
    if (!respuesta.ok) return { ok: false, status: respuesta.status };
    const sugerencia = leerSugerencia(await respuesta.json());
    return sugerencia ? { ok: true, sugerencia } : { ok: false, status: 0 };
  } catch {
    return { ok: false, status: 0 };
  } finally {
    clearTimeout(temporizador);
    senal?.removeEventListener("abort", abortar);
  }
}

const esProbabilidad = (valor: unknown): valor is number =>
  typeof valor === "number" && Number.isFinite(valor) && valor >= 0 && valor <= 1;

/** Checks a 200 body against the contract by hand (zod stays out of the client bundle). */
export function leerSugerencia(datos: unknown): SugerenciaJev | null {
  if (typeof datos !== "object" || datos === null) return null;
  const d = datos as Record<string, unknown>;
  const p = d.probabilidades;
  if (typeof p !== "object" || p === null) return null;
  const probabilidades = p as Record<string, unknown>;
  const claves = VALORES_NIVEL.map(String);
  if (Object.keys(probabilidades).length !== claves.length || !claves.every((c) => esProbabilidad(probabilidades[c]))) {
    return null;
  }
  if (
    !esNivelValor(d.nivelSugerido) ||
    !esProbabilidad(d.confianza) ||
    !esProbabilidad(d.pertinencia) ||
    typeof d.baja_confianza !== "boolean" ||
    !(d.alternativa === null || esNivelValor(d.alternativa)) ||
    typeof d.modelo !== "string" ||
    d.modelo === ""
  ) {
    return null;
  }
  return {
    nivelSugerido: d.nivelSugerido,
    probabilidades: probabilidades as Record<string, number>,
    confianza: d.confianza,
    pertinencia: d.pertinencia,
    baja_confianza: d.baja_confianza,
    alternativa: d.alternativa,
    modelo: d.modelo,
  };
}
