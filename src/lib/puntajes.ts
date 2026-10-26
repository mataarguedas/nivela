// Pure scoring rules from PRD §7. Every score shown in the app or stored in the
// DB is computed here, so this is the one place the math is tested.
import type { NivelValor } from "@/config/niveles";

export const UMBRALES_NIVEL = { intermedio: 1.5, avanzado: 2.5, experto: 3.5 } as const;
export const UMBRALES_COINCIDENCIA = { alta: 0.5, media: 1.0 } as const;

// Absorbs float noise such as sqrt(0.25000000000000006) when comparing to a
// threshold. Far below any real difference between ratings.
const TOLERANCIA = 1e-9;

export type Coincidencia = "alta" | "media" | "baja";

export type Acuerdo = {
  min: number;
  max: number;
  desviacion: number;
  coincidencia: Coincidencia;
};

/** Arithmetic mean, or null for an empty list. */
export function promedio(valores: readonly number[]): number | null {
  if (valores.length === 0) return null;
  return valores.reduce((suma, v) => suma + v, 0) / valores.length;
}

/** Rounds to 2 decimals, the precision every score is displayed and stored with. */
export function redondear2(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

/** Puntaje de una evaluación: mean of its indicator levels (1.00–4.00). */
export function puntajeEvaluacion(niveles: readonly NivelValor[]): number | null {
  return promedio(niveles);
}

/** Puntaje por indicador: mean of that indicator's level across evaluators. */
export function puntajeIndicador(niveles: readonly NivelValor[]): number | null {
  return promedio(niveles);
}

/** Puntaje general: mean of the indicator means (not of all raw levels). */
export function puntajeGeneral(mediasIndicadores: readonly number[]): number | null {
  return promedio(mediasIndicadores);
}

/**
 * Nivel general from a score. The score is rounded to 2 decimals first so the
 * level always agrees with the number the docente sees (e.g. "1,50" → Intermedio).
 */
export function nivelGeneral(puntaje: number): NivelValor {
  const p = redondear2(puntaje);
  if (p < UMBRALES_NIVEL.intermedio) return 1;
  if (p < UMBRALES_NIVEL.avanzado) return 2;
  if (p < UMBRALES_NIVEL.experto) return 3;
  return 4;
}

/**
 * Population standard deviation: the evaluators who rated are the whole group
 * being described, not a sample. A single rating has SD 0.
 */
export function desviacionEstandar(valores: readonly number[]): number | null {
  const media = promedio(valores);
  if (media === null) return null;
  const varianza = valores.reduce((suma, v) => suma + (v - media) ** 2, 0) / valores.length;
  return Math.sqrt(varianza);
}

export function coincidencia(desviacion: number): Coincidencia {
  if (desviacion <= UMBRALES_COINCIDENCIA.alta + TOLERANCIA) return "alta";
  if (desviacion <= UMBRALES_COINCIDENCIA.media + TOLERANCIA) return "media";
  return "baja";
}

/** Acuerdo for one participant and indicator: range, SD and its bucket. */
export function acuerdo(niveles: readonly NivelValor[]): Acuerdo | null {
  const desviacion = desviacionEstandar(niveles);
  if (desviacion === null) return null;
  return {
    min: Math.min(...niveles),
    max: Math.max(...niveles),
    desviacion,
    coincidencia: coincidencia(desviacion),
  };
}

/** How many ratings chose each level. Every level is present, with 0 if none chose it. */
export function distribucion(niveles: readonly NivelValor[]): Record<NivelValor, number> {
  const conteo: Record<NivelValor, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const nivel of niveles) conteo[nivel] += 1;
  return conteo;
}

/** parte ÷ total (e.g. share of AI-assisted levels), or null when total is 0. */
export function proporcion(parte: number, total: number): number | null {
  if (total <= 0) return null;
  return parte / total;
}

/** Cobertura: evaluations received ÷ (evaluators × participants), or null if none are expected. */
export function cobertura(recibidas: number, evaluadores: number, participantes: number): number | null {
  const esperadas = evaluadores * participantes;
  if (esperadas <= 0) return null;
  return recibidas / esperadas;
}
