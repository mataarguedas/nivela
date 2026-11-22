// Pure scoring rules from PRD §7. Every score shown in the app or stored in the
// DB is computed here, so this is the one place the math is tested.
//
// Two scales (PRD §7, v1.6): evaluators rate on the 4 levels (1–4), and the
// stored puntaje of an evaluation is the mean of those levels. Every score in
// the reports and the results email is in points, 0–100: a mean of levels m
// is (m − 1) ÷ 3 × 100, so all-Básico is 0 and all-Experto is 100. Points are
// shown and compared as whole numbers; the level bands (v1.10) are 0–25
// Básico, 26–50 Intermedio, 51–75 Avanzado and 76–100 Experto.
import type { NivelValor } from "@/config/niveles";

/** The report scale (points). */
export const ESCALA_PUNTOS = { min: 0, max: 100 } as const;
/** The lowest whole number of points of each level above Básico (PRD §7). */
export const UMBRALES_NIVEL = { intermedio: 26, avanzado: 51, experto: 76 } as const;

/** Each level's band in whole points: Básico 0–25, Intermedio 26–50, Avanzado 51–75, Experto 76–100. */
export const RANGOS_PUNTOS: Readonly<Record<NivelValor, { min: number; max: number }>> = {
  1: { min: ESCALA_PUNTOS.min, max: UMBRALES_NIVEL.intermedio - 1 },
  2: { min: UMBRALES_NIVEL.intermedio, max: UMBRALES_NIVEL.avanzado - 1 },
  3: { min: UMBRALES_NIVEL.avanzado, max: UMBRALES_NIVEL.experto - 1 },
  4: { min: UMBRALES_NIVEL.experto, max: ESCALA_PUNTOS.max },
};
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

/** Rounds to 2 decimals: the stored puntaje of an evaluation (1–4) and the CSV's AI confidence. */
export function redondear2(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

/**
 * Rounds points to a whole number, the precision every report score is shown,
 * compared and leveled with. The tolerance absorbs float noise such as
 * 24.499999999999996 for a true 24.5.
 */
export function redondearPuntos(valor: number): number {
  return Math.round(valor + TOLERANCIA);
}

/** A mean of levels (1–4) in points (0–100): (m − 1) ÷ 3 × 100, unrounded. */
export function puntosDesdeNiveles(media: number): number {
  return ((media - 1) / 3) * 100;
}

/** Puntaje de una evaluación: mean of its indicator levels (1.00–4.00). Stored in the DB; reports use points. */
export function puntajeEvaluacion(niveles: readonly NivelValor[]): number | null {
  return promedio(niveles);
}

/** Puntaje por indicador, in points: the mean of that indicator's level across evaluators, converted to 0–100. */
export function puntajeIndicador(niveles: readonly NivelValor[]): number | null {
  const media = promedio(niveles);
  return media === null ? null : puntosDesdeNiveles(media);
}

/** Puntaje general, in points: mean of the indicator scores (not of all raw levels). */
export function puntajeGeneral(mediasIndicadores: readonly number[]): number | null {
  return promedio(mediasIndicadores);
}

/**
 * Nivel general from a score in points. The score is rounded to a whole
 * number first so the level always agrees with the number the docente sees
 * (e.g. 25,6 shows as "26" → Intermedio).
 */
export function nivelGeneral(puntaje: number): NivelValor {
  const p = redondearPuntos(puntaje);
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

/**
 * Expected evaluations (PRD §7 Cobertura): evaluators × active participants,
 * minus the evaluator × participant pairs marked absent (§5.13). Never below 0.
 */
export function evaluacionesEsperadas(evaluadores: number, participantes: number, paresAusentes = 0): number {
  return Math.max(0, evaluadores * participantes - paresAusentes);
}

/**
 * Cobertura: evaluations received ÷ expected evaluations (see
 * evaluacionesEsperadas), or null if none are expected.
 */
export function cobertura(recibidas: number, evaluadores: number, participantes: number, paresAusentes = 0): number | null {
  const esperadas = evaluacionesEsperadas(evaluadores, participantes, paresAusentes);
  if (esperadas <= 0) return null;
  return recibidas / esperadas;
}

export type Asistencia = "ausente" | "conflicto";

/**
 * A participant's attendance in the reports (PRD §5.13): "ausente" with at
 * least one absent mark and no evaluations; "conflicto" ("Asistencia en
 * conflicto") with marks and evaluations; null without marks.
 */
export function asistenciaParticipante(marcasAusente: number, evaluaciones: number): Asistencia | null {
  if (marcasAusente <= 0) return null;
  return evaluaciones > 0 ? "conflicto" : "ausente";
}

/** Gap to the next level (PRD §7 "Brecha al siguiente nivel"). */
export type Brecha = {
  nivelActual: NivelValor;
  /** Null at Experto: "Nivel máximo alcanzado". */
  siguiente: NivelValor | null;
  /** The threshold that opens `siguiente` (26 / 51 / 76 points). */
  umbral: number | null;
  /** umbral − score, in whole points. */
  faltante: number | null;
};

const UMBRAL_DEL_SIGUIENTE: Record<Exclude<NivelValor, 4>, number> = {
  1: UMBRALES_NIVEL.intermedio,
  2: UMBRALES_NIVEL.avanzado,
  3: UMBRALES_NIVEL.experto,
};

/**
 * The gap from a score in points (a puntaje general, an indicator score or
 * the group score) to the next level. The score is rounded to a whole number
 * first, exactly like nivelGeneral(), so the number on screen and the gap
 * always agree: 50 → 1 to Avanzado; 50,6 shows as 51 → Avanzado, 25 to Experto.
 */
export function brechaSiguienteNivel(puntaje: number): Brecha {
  const p = redondearPuntos(puntaje);
  const nivelActual = nivelGeneral(p);
  if (nivelActual === 4) return { nivelActual, siguiente: null, umbral: null, faltante: null };
  const umbral = UMBRAL_DEL_SIGUIENTE[nivelActual];
  return { nivelActual, siguiente: (nivelActual + 1) as NivelValor, umbral, faltante: umbral - p };
}

/**
 * Puntaje del grupo (PRD §7): mean of the puntajes generales of the
 * participants with at least 1 evaluation (pass only those). The group's
 * nivel and brecha come from nivelGeneral() and brechaSiguienteNivel().
 * The same mean gives the group's mean per indicator, over the participants'
 * indicator means.
 */
export function puntajeGrupo(puntajes: readonly number[]): number | null {
  return promedio(puntajes);
}

/**
 * Promedio entre competencias (PRD §7, §11.4): mean of a participant's
 * puntajes generales in the competencias where they have at least 1
 * evaluation (pass only those). Its nivel and brecha come from nivelGeneral()
 * and brechaSiguienteNivel(); the report always shows how many competencias
 * it covers, since a partial mean is not comparable at face value.
 */
export function puntajeEntreCompetencias(puntajesGenerales: readonly number[]): number | null {
  return promedio(puntajesGenerales);
}

/**
 * The positions of the highest and lowest values (e.g. the group's strongest
 * and weakest indicator, PRD §11.3), compared at display precision so values
 * shown as equal are a tie. Nulls (no data) are skipped; null if none has data.
 * When every value is equal, both lists hold every position.
 */
export function extremos(valores: readonly (number | null)[]): { maximos: number[]; minimos: number[] } | null {
  const conDatos = valores.flatMap((v, i) => (v === null ? [] : [{ i, v: redondearPuntos(v) }]));
  if (conDatos.length === 0) return null;
  const maximo = Math.max(...conDatos.map((d) => d.v));
  const minimo = Math.min(...conDatos.map((d) => d.v));
  return {
    maximos: conDatos.filter((d) => d.v === maximo).map((d) => d.i),
    minimos: conDatos.filter((d) => d.v === minimo).map((d) => d.i),
  };
}

export type EstadoAvance = "sin-iniciar" | "en-progreso" | "completo";

/**
 * An evaluator's progress (PRD §7 "Avance de un evaluador"). `esperadas` is
 * the active participants minus those this evaluator marked absent. Nothing
 * left to send (everyone sent, or everyone absent) is "completo".
 */
export function estadoAvance(enviadas: number, esperadas: number): EstadoAvance {
  if (enviadas >= esperadas) return "completo";
  return enviadas === 0 ? "sin-iniciar" : "en-progreso";
}
