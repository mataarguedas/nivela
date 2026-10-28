// Report aggregation (PRD §11): one pure function turns the raw rows of a
// competencia into everything the Reporte general and the Reporte individual
// show. No DB access here (see db/reportes.ts) and no math of its own: every
// score, distribution, agreement and ratio comes from puntajes.ts.
//
// Rows whose evaluador, participante or indicador isn't in config (e.g. an id
// removed after the activity) are left out, so every mean and the cobertura
// describe the same population the config defines.

import type { Competencia } from "@/config/competencias";
import type { Equipo } from "@/config/equipos";
import { esNivelValor, type NivelValor } from "@/config/niveles";
import type { Participante } from "@/config/participantes";
import {
  acuerdo,
  cobertura,
  distribucion,
  nivelGeneral,
  promedio,
  proporcion,
  puntajeGeneral,
  puntajeIndicador,
  redondear2,
  type Acuerdo,
} from "@/lib/puntajes";

/** One calificación joined with its evaluación, as read from the DB. */
export type FilaReporte = {
  evaluadorId: string;
  participanteId: string;
  /** evaluaciones.updated_at, ISO. */
  actualizadoEn: string;
  indicadorId: string;
  nivel: number;
  origen: "manual" | "ia";
  observacion: string | null;
  iaNivelSugerido: number | null;
  iaConfianza: number | null;
};

export type Observacion = { evaluador: string; nivel: NivelValor; texto: string };

export type ResumenIndicador = {
  indicadorId: string;
  numero: number;
  titulo: string;
  media: number | null;
  distribucion: Record<NivelValor, number>;
  acuerdo: Acuerdo | null;
  observaciones: Observacion[];
};

export type ReporteParticipante = {
  id: string;
  etiqueta: string;
  /** Evaluations received (distinct evaluators). */
  evaluaciones: number;
  indicadores: ResumenIndicador[];
  puntajeGeneral: number | null;
  nivelGeneral: NivelValor | null;
  /** Share of this participant's levels that came from an applied AI suggestion. */
  proporcionIa: number | null;
};

export type DistribucionIndicador = {
  indicadorId: string;
  numero: number;
  titulo: string;
  conteo: Record<NivelValor, number>;
  total: number;
};

export type PosicionRanking = { id: string; etiqueta: string; puntaje: number; nivel: NivelValor };

/** How many places the "puntajes más altos" block shows (ties at the cut are all kept). */
export const CANTIDAD_MEJORES = 5;

export type Destacado = PosicionRanking & {
  /** 1-based; participants with the same displayed puntaje share it (1, 2, 2, 4…). */
  posicion: number;
  evaluaciones: number;
  /** Aligned with the competencia's indicators. */
  medias: (number | null)[];
};

export type FilaCobertura = {
  evaluadorId: string;
  nombre: string;
  /** Aligned with `participantes` (config order). */
  enviadas: boolean[];
  total: number;
};

export type Reporte = {
  competencia: { id: string; nombre: string };
  vacio: boolean;
  kpis: {
    participantesEvaluados: number;
    participantesTotal: number;
    recibidas: number;
    esperadas: number;
    cobertura: number | null;
    puntajePromedio: number | null;
    proporcionIa: number | null;
  };
  distribucion: DistribucionIndicador[];
  /** Evaluated participants only, puntaje descending (ties by id). */
  ranking: PosicionRanking[];
  /** The top CANTIDAD_MEJORES places of `ranking`, in the same order. */
  mejores: Destacado[];
  /** Every participant in config order, evaluated or not. */
  participantes: ReporteParticipante[];
  cobertura: { participantes: { id: string; etiqueta: string }[]; filas: FilaCobertura[] };
};

type FilaValida = FilaReporte & { nivel: NivelValor };

export function agregarReporte(
  competencia: Competencia,
  equipo: Equipo,
  participantes: readonly Participante[],
  filas: readonly FilaReporte[],
): Reporte {
  const nombres = new Map(equipo.integrantes.map((i) => [i.id, i.nombre]));
  const ordenEvaluador = new Map(equipo.integrantes.map((i, indice) => [i.id, indice]));
  const idsParticipantes = new Set(participantes.map((p) => p.id));
  const idsIndicadores = new Set(competencia.indicadores.map((i) => i.id));

  const validas: FilaValida[] = filas.filter(
    (f): f is FilaValida =>
      nombres.has(f.evaluadorId) &&
      idsParticipantes.has(f.participanteId) &&
      idsIndicadores.has(f.indicadorId) &&
      esNivelValor(f.nivel),
  );

  // participante → its rows, and participante → evaluadores who sent.
  const porParticipante = new Map<string, FilaValida[]>();
  const evaluadoresPorParticipante = new Map<string, Set<string>>();
  for (const fila of validas) {
    const propias = porParticipante.get(fila.participanteId) ?? [];
    propias.push(fila);
    porParticipante.set(fila.participanteId, propias);
    const enviados = evaluadoresPorParticipante.get(fila.participanteId) ?? new Set<string>();
    enviados.add(fila.evaluadorId);
    evaluadoresPorParticipante.set(fila.participanteId, enviados);
  }

  const reportesParticipantes = participantes.map((participante): ReporteParticipante => {
    const propias = porParticipante.get(participante.id) ?? [];
    const indicadores = competencia.indicadores.map((indicador): ResumenIndicador => {
      const delIndicador = propias
        .filter((f) => f.indicadorId === indicador.id)
        .sort((a, b) => (ordenEvaluador.get(a.evaluadorId) ?? 0) - (ordenEvaluador.get(b.evaluadorId) ?? 0));
      const niveles = delIndicador.map((f) => f.nivel);
      return {
        indicadorId: indicador.id,
        numero: indicador.numero,
        titulo: indicador.titulo,
        media: puntajeIndicador(niveles),
        distribucion: distribucion(niveles),
        acuerdo: acuerdo(niveles),
        observaciones: delIndicador.flatMap((f) => {
          const texto = f.observacion?.trim();
          return texto ? [{ evaluador: nombres.get(f.evaluadorId) ?? f.evaluadorId, nivel: f.nivel, texto }] : [];
        }),
      };
    });
    const medias = indicadores.flatMap((i) => (i.media === null ? [] : [i.media]));
    const puntaje = puntajeGeneral(medias);
    return {
      id: participante.id,
      etiqueta: participante.etiqueta,
      evaluaciones: evaluadoresPorParticipante.get(participante.id)?.size ?? 0,
      indicadores,
      puntajeGeneral: puntaje,
      nivelGeneral: puntaje === null ? null : nivelGeneral(puntaje),
      proporcionIa: proporcion(propias.filter((f) => f.origen === "ia").length, propias.length),
    };
  });

  const ranking = reportesParticipantes
    .flatMap((p): PosicionRanking[] =>
      p.puntajeGeneral === null || p.nivelGeneral === null
        ? []
        : [{ id: p.id, etiqueta: p.etiqueta, puntaje: p.puntajeGeneral, nivel: p.nivelGeneral }],
    )
    // Compare at display precision, so participants shown with the same score
    // are ordered by code rather than by float noise.
    .sort((a, b) => redondear2(b.puntaje) - redondear2(a.puntaje) || a.id.localeCompare(b.id));

  // Standard competition ranking at display precision: a tie shares the
  // position and skips the next ones, and everyone tied at the cut stays in,
  // so the block never ranks one of two equal scores above the other.
  const porId = new Map(reportesParticipantes.map((p) => [p.id, p]));
  const mejores: Destacado[] = [];
  for (const [indice, posicion] of ranking.entries()) {
    const anterior = mejores.at(-1);
    const lugar = anterior && redondear2(anterior.puntaje) === redondear2(posicion.puntaje) ? anterior.posicion : indice + 1;
    if (lugar > CANTIDAD_MEJORES) break;
    const participante = porId.get(posicion.id);
    mejores.push({
      ...posicion,
      posicion: lugar,
      evaluaciones: participante?.evaluaciones ?? 0,
      medias: participante?.indicadores.map((i) => i.media) ?? [],
    });
  }

  const recibidas = reportesParticipantes.reduce((suma, p) => suma + p.evaluaciones, 0);
  const evaluadores = equipo.integrantes.length;

  const filasCobertura = equipo.integrantes.map((integrante): FilaCobertura => {
    const enviadas = participantes.map((p) => evaluadoresPorParticipante.get(p.id)?.has(integrante.id) ?? false);
    return {
      evaluadorId: integrante.id,
      nombre: integrante.nombre,
      enviadas,
      total: enviadas.filter(Boolean).length,
    };
  });

  return {
    competencia: { id: competencia.id, nombre: competencia.nombre },
    vacio: validas.length === 0,
    kpis: {
      participantesEvaluados: ranking.length,
      participantesTotal: participantes.length,
      recibidas,
      esperadas: evaluadores * participantes.length,
      cobertura: cobertura(recibidas, evaluadores, participantes.length),
      puntajePromedio: promedio(ranking.map((r) => r.puntaje)),
      proporcionIa: proporcion(validas.filter((f) => f.origen === "ia").length, validas.length),
    },
    distribucion: competencia.indicadores.map((indicador) => {
      const niveles = validas.filter((f) => f.indicadorId === indicador.id).map((f) => f.nivel);
      return {
        indicadorId: indicador.id,
        numero: indicador.numero,
        titulo: indicador.titulo,
        conteo: distribucion(niveles),
        total: niveles.length,
      };
    }),
    ranking,
    mejores,
    participantes: reportesParticipantes,
    cobertura: {
      participantes: participantes.map(({ id, etiqueta }) => ({ id, etiqueta })),
      filas: filasCobertura,
    },
  };
}
