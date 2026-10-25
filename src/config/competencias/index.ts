import type { NivelValor } from "../niveles";
import { adaptabilidad } from "./adaptabilidad";
import { autorregulacionEmocional } from "./autorregulacion-emocional";
import { orientacionDetalle } from "./orientacion-detalle";
import { orientacionResultados } from "./orientacion-resultados";
import { pensamientoCritico } from "./pensamiento-critico";

export type Indicador = {
  id: string;
  numero: number;
  titulo: string;
  /** Behavior description per level, 1 (Básico) to 4 (Experto). */
  niveles: Record<NivelValor, string>;
};

export type Competencia = {
  id: string;
  nombre: string;
  habilitada: boolean;
  /** Empty until the competencia's template arrives. */
  definicion: string;
  fuente: string;
  indicadores: Indicador[];
};

// Display order follows the team numbers (PRD Appendix B).
export const COMPETENCIAS: readonly Competencia[] = [
  pensamientoCritico,
  autorregulacionEmocional,
  orientacionDetalle,
  adaptabilidad,
  orientacionResultados,
];

export function obtenerCompetencia(id: string): Competencia | undefined {
  return COMPETENCIAS.find((c) => c.id === id);
}

/** Only competencias that can be rated; use this for every user-facing lookup. */
export function obtenerCompetenciaHabilitada(id: string): Competencia | undefined {
  const competencia = obtenerCompetencia(id);
  return competencia?.habilitada ? competencia : undefined;
}

export function obtenerIndicador(competencia: Competencia, indicadorId: string): Indicador | undefined {
  return competencia.indicadores.find((i) => i.id === indicadorId);
}
