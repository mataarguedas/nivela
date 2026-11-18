import type { JornadaId } from "../jornadas";
import type { NivelValor } from "../niveles";
import { adaptabilidad } from "./adaptabilidad";
import { autorregulacionEmocional } from "./autorregulacion-emocional";
import { orientacionDetalle } from "./orientacion-detalle";
import { orientacionResultados } from "./orientacion-resultados";
import { pensamientoCritico } from "./pensamiento-critico";

// Competencias and their rubrics (PRD §9.1, Appendix A). Each jornada's team
// writes its own template, so a rubric belongs to jornada + competencia: a
// competencia is enabled in a jornada exactly when it has a rubric there.
// Every lookup below takes the jornada (always the session's, PRD §5.11).
//
// Indicator ids are stored in the DB (calificaciones.indicador_id), scoped
// by the evaluation's jornada. Never reuse an id for a different text: when a
// jornada gets its own rubric, give it new ids (e.g. "pensamiento-critico-noche-1")
// so rows already stored are never relabelled. The config test enforces it.

export type Indicador = {
  id: string;
  numero: number;
  titulo: string;
  /** Behavior description per level, 1 (Básico) to 4 (Experto). */
  niveles: Record<NivelValor, string>;
};

/** One team's template: what the rating screen shows and what Jev is sent. */
export type Rubrica = {
  /** Paragraphs are separated by "\n". */
  definicion: string;
  fuente: string;
  indicadores: Indicador[];
};

/** A competencia as config defines it: its name, plus one rubric per jornada whose team sent its template. */
export type DefinicionCompetencia = {
  id: string;
  nombre: string;
  rubricas: Partial<Record<JornadaId, Rubrica>>;
};

/**
 * A competencia as one jornada sees it. Without a rubric for that jornada it
 * is disabled ("Próximamente") and has no definition or indicators.
 */
export type Competencia = Rubrica & {
  id: string;
  nombre: string;
  habilitada: boolean;
};

// Display order follows the morning team numbers (PRD Appendix B).
export const DEFINICIONES_COMPETENCIA: readonly DefinicionCompetencia[] = [
  pensamientoCritico,
  autorregulacionEmocional,
  orientacionDetalle,
  adaptabilidad,
  orientacionResultados,
];

const SIN_RUBRICA: Rubrica = { definicion: "", fuente: "", indicadores: [] };

function resolver(definicion: DefinicionCompetencia, jornada: JornadaId): Competencia {
  const rubrica = definicion.rubricas[jornada];
  return { id: definicion.id, nombre: definicion.nombre, habilitada: rubrica !== undefined, ...(rubrica ?? SIN_RUBRICA) };
}

/** All competencias, in display order, as the jornada sees them (enabled or not). */
export function competenciasDeJornada(jornada: JornadaId): Competencia[] {
  return DEFINICIONES_COMPETENCIA.map((d) => resolver(d, jornada));
}

/** Config entry by id, without a jornada: only for names and ids, never for a rubric. */
export function obtenerDefinicionCompetencia(id: string): DefinicionCompetencia | undefined {
  return DEFINICIONES_COMPETENCIA.find((d) => d.id === id);
}

export function obtenerCompetencia(jornada: JornadaId, id: string): Competencia | undefined {
  const definicion = obtenerDefinicionCompetencia(id);
  return definicion && resolver(definicion, jornada);
}

/** Only competencias with a rubric in this jornada; use this for every lookup that rates, suggests or reports. */
export function obtenerCompetenciaHabilitada(jornada: JornadaId, id: string): Competencia | undefined {
  const competencia = obtenerCompetencia(jornada, id);
  return competencia?.habilitada ? competencia : undefined;
}

export function obtenerIndicador(competencia: Competencia, indicadorId: string): Indicador | undefined {
  return competencia.indicadores.find((i) => i.id === indicadorId);
}
