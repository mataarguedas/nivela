// Report aggregation (PRD §11): one pure function turns the raw rows of a
// competencia into everything the Reporte general and the Reporte individual
// show. No DB access here (see db/reportes.ts) and no math of its own: every
// score, distribution, agreement and ratio comes from puntajes.ts.
//
// Rows whose evaluador, participante or indicador isn't in config (e.g. an id
// removed after the activity) are left out, so every mean and the cobertura
// describe the same population the config defines.
//
// Attendance (PRD §5.13): absent marks are per evaluator x participante. A
// participant with marks and no evaluations is "ausente"; with marks and
// evaluations, "conflicto" (Asistencia en conflicto). Absent pairs leave the
// expected evaluations; a pair that has both a mark and a sent evaluation
// (only possible through a race) counts as sent, so cobertura never exceeds
// what was actually expected.
//
// Gaps (PRD §7): every puntaje general and indicator mean carries its gap to
// the next level, plus that level's behavior description from the rubric.
// Evaluator progress (PRD §11.2) covers every member of the jornada's team
// for the competencia; account status comes in from the caller (the DB), so
// this module never reads accounts and never sees an email.

import type { Competencia } from "@/config/competencias";
import type { Equipo } from "@/config/equipos";
import { IDS_JORNADA, type JornadaId, type SeleccionJornada } from "@/config/jornadas";
import type { EstadoCuenta } from "@/lib/cuentas";
import { esNivelValor, type NivelValor } from "@/config/niveles";
import type { Participante } from "@/config/participantes";
import {
  acuerdo,
  asistenciaParticipante,
  brechaSiguienteNivel,
  cobertura,
  distribucion,
  nivelGeneral,
  promedio,
  proporcion,
  puntajeGeneral,
  puntajeIndicador,
  estadoAvance,
  evaluacionesEsperadas,
  extremos,
  puntajeEntreCompetencias,
  puntajeGrupo,
  redondear2,
  type Acuerdo,
  type Asistencia,
  type Brecha,
  type EstadoAvance,
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

/** An evaluator's account as the reports need it: status and last access, never the email. */
export type InfoCuenta = { estado: EstadoCuenta; /** ISO, or null if they never signed in. */ ultimoAcceso: string | null };

/** One absent mark (asistencia.ausente = true), as read from the DB. */
export type ParAusente = { evaluadorId: string; participanteId: string };

export type Observacion = { evaluador: string; nivel: NivelValor; texto: string };

export type ResumenIndicador = {
  indicadorId: string;
  numero: number;
  titulo: string;
  media: number | null;
  distribucion: Record<NivelValor, number>;
  acuerdo: Acuerdo | null;
  observaciones: Observacion[];
  /** Gap from `media` to the next level; null without ratings. */
  brecha: Brecha | null;
  /** The rubric's description of the next level for this indicator; null at Experto or without ratings. */
  descripcionSiguiente: string | null;
};

export type ReporteParticipante = {
  id: string;
  etiqueta: string;
  /** Evaluations received (distinct evaluators). */
  evaluaciones: number;
  indicadores: ResumenIndicador[];
  puntajeGeneral: number | null;
  nivelGeneral: NivelValor | null;
  /** Gap from the puntaje general to the next level; null without evaluations. */
  brecha: Brecha | null;
  /** Share of this participant's levels that came from an applied AI suggestion. */
  proporcionIa: number | null;
  /** Evaluators who marked this participant absent. */
  marcasAusente: number;
  asistencia: Asistencia | null;
  /** The latest evaluaciones.updated_at among this participant's evaluations (ISO); null without any. Keys the results email (PRD §5.14). */
  actualizadoEn: string | null;
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

export type EstadoCobertura = "enviada" | "ausente" | "pendiente";

export type FilaCobertura = {
  evaluadorId: string;
  nombre: string;
  /** Aligned with `participantes` (config order). */
  celdas: EstadoCobertura[];
  /** Sent by this evaluator. */
  total: number;
  /** Active participants minus the ones this evaluator marked absent. */
  esperadas: number;
};

export type AvanceEvaluador = {
  evaluadorId: string;
  nombre: string;
  curso: string;
  cuenta: EstadoCuenta;
  ultimoAcceso: string | null;
  enviadas: number;
  /** Active participants minus the ones this evaluator marked absent. */
  esperadas: number;
  /** Participants this evaluator marked absent (and didn't send). */
  ausentes: number;
  estado: EstadoAvance;
};

/** "Avance de evaluadores" (PRD §11.2). */
export type Avance = {
  /** This jornada's display label for the team ("Equipo 1" at night, "Equipo 4" in the morning for Adaptabilidad). */
  numeroEquipo: number;
  completos: number;
  total: number;
  /** Incomplete first (Sin iniciar, En progreso, then Completo), team order within each. */
  evaluadores: AvanceEvaluador[];
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
    /** Participants whose attendance is "ausente". */
    ausentes: number;
    evaluadoresCompletos: number;
    evaluadoresTotal: number;
  };
  distribucion: DistribucionIndicador[];
  /** Evaluated participants only, puntaje descending (ties by id). */
  ranking: PosicionRanking[];
  /** The top CANTIDAD_MEJORES places of `ranking`, in the same order. */
  mejores: Destacado[];
  /** Every participant in config order, evaluated or not. */
  participantes: ReporteParticipante[];
  cobertura: { participantes: { id: string; etiqueta: string }[]; filas: FilaCobertura[] };
  avance: Avance;
};

const ORDEN_AVANCE: Record<EstadoAvance, number> = { "sin-iniciar": 0, "en-progreso": 1, completo: 2 };
const SIN_CUENTA: InfoCuenta = { estado: "sin-correo", ultimoAcceso: null };

type FilaValida = FilaReporte & { nivel: NivelValor };

export function agregarReporte(
  competencia: Competencia,
  equipo: Equipo,
  participantes: readonly Participante[],
  filas: readonly FilaReporte[],
  ausencias: readonly ParAusente[] = [],
  /** By integrante id; a member without an entry reads as "Sin correo". */
  cuentas: Readonly<Record<string, InfoCuenta>> = {},
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

  // participante -> evaluadores who marked them absent (team and list only).
  const ausentesPorParticipante = new Map<string, Set<string>>();
  for (const { evaluadorId, participanteId } of ausencias) {
    if (!nombres.has(evaluadorId) || !idsParticipantes.has(participanteId)) continue;
    const marcas = ausentesPorParticipante.get(participanteId) ?? new Set<string>();
    marcas.add(evaluadorId);
    ausentesPorParticipante.set(participanteId, marcas);
  }

  const reportesParticipantes = participantes.map((participante): ReporteParticipante => {
    const propias = porParticipante.get(participante.id) ?? [];
    const indicadores = competencia.indicadores.map((indicador): ResumenIndicador => {
      const delIndicador = propias
        .filter((f) => f.indicadorId === indicador.id)
        .sort((a, b) => (ordenEvaluador.get(a.evaluadorId) ?? 0) - (ordenEvaluador.get(b.evaluadorId) ?? 0));
      const niveles = delIndicador.map((f) => f.nivel);
      const media = puntajeIndicador(niveles);
      const brecha = media === null ? null : brechaSiguienteNivel(media);
      return {
        indicadorId: indicador.id,
        numero: indicador.numero,
        titulo: indicador.titulo,
        media,
        distribucion: distribucion(niveles),
        acuerdo: acuerdo(niveles),
        observaciones: delIndicador.flatMap((f) => {
          const texto = f.observacion?.trim();
          return texto ? [{ evaluador: nombres.get(f.evaluadorId) ?? f.evaluadorId, nivel: f.nivel, texto }] : [];
        }),
        brecha,
        descripcionSiguiente: brecha?.siguiente ? indicador.niveles[brecha.siguiente] : null,
      };
    });
    const medias = indicadores.flatMap((i) => (i.media === null ? [] : [i.media]));
    const puntaje = puntajeGeneral(medias);
    const recibidas = evaluadoresPorParticipante.get(participante.id)?.size ?? 0;
    const marcasAusente = ausentesPorParticipante.get(participante.id)?.size ?? 0;
    return {
      id: participante.id,
      // Reports name participants by carnet, never by name (PRD §11).
      etiqueta: participante.etiquetaReporte,
      evaluaciones: recibidas,
      indicadores,
      puntajeGeneral: puntaje,
      nivelGeneral: puntaje === null ? null : nivelGeneral(puntaje),
      brecha: puntaje === null ? null : brechaSiguienteNivel(puntaje),
      proporcionIa: proporcion(propias.filter((f) => f.origen === "ia").length, propias.length),
      marcasAusente,
      asistencia: asistenciaParticipante(marcasAusente, recibidas),
      // ISO strings from the same source compare chronologically.
      actualizadoEn: propias.reduce<string | null>((ultimo, f) => (ultimo === null || f.actualizadoEn > ultimo ? f.actualizadoEn : ultimo), null),
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
    const celdas = participantes.map((p): EstadoCobertura => {
      if (evaluadoresPorParticipante.get(p.id)?.has(integrante.id)) return "enviada";
      return ausentesPorParticipante.get(p.id)?.has(integrante.id) ? "ausente" : "pendiente";
    });
    return {
      evaluadorId: integrante.id,
      nombre: integrante.nombre,
      celdas,
      total: celdas.filter((c) => c === "enviada").length,
      esperadas: evaluacionesEsperadas(1, participantes.length, celdas.filter((c) => c === "ausente").length),
    };
  });
  const avanceEvaluadores = equipo.integrantes
    .map((integrante, indice) => {
      const fila = filasCobertura[indice];
      const cuenta = cuentas[integrante.id] ?? SIN_CUENTA;
      return {
        evaluadorId: integrante.id,
        nombre: integrante.nombre,
        curso: integrante.curso,
        cuenta: cuenta.estado,
        ultimoAcceso: cuenta.ultimoAcceso,
        enviadas: fila.total,
        esperadas: fila.esperadas,
        ausentes: fila.celdas.filter((c) => c === "ausente").length,
        estado: estadoAvance(fila.total, fila.esperadas),
      } satisfies AvanceEvaluador;
    })
    // Array.prototype.sort is stable, so team order holds within each status.
    .sort((a, b) => ORDEN_AVANCE[a.estado] - ORDEN_AVANCE[b.estado]);
  const completos = avanceEvaluadores.filter((a) => a.estado === "completo").length;

  // Absent pairs without an evaluation leave the denominator (PRD §7 Cobertura).
  const paresAusentes = filasCobertura.reduce((suma, f) => suma + f.celdas.filter((c) => c === "ausente").length, 0);

  return {
    competencia: { id: competencia.id, nombre: competencia.nombre },
    vacio: validas.length === 0,
    kpis: {
      participantesEvaluados: ranking.length,
      participantesTotal: participantes.length,
      recibidas,
      esperadas: evaluacionesEsperadas(evaluadores, participantes.length, paresAusentes),
      cobertura: cobertura(recibidas, evaluadores, participantes.length, paresAusentes),
      puntajePromedio: promedio(ranking.map((r) => r.puntaje)),
      proporcionIa: proporcion(validas.filter((f) => f.origen === "ia").length, validas.length),
      ausentes: reportesParticipantes.filter((p) => p.asistencia === "ausente").length,
      evaluadoresCompletos: completos,
      evaluadoresTotal: evaluadores,
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
      participantes: participantes.map(({ id, etiquetaReporte }) => ({ id, etiqueta: etiquetaReporte })),
      filas: filasCobertura,
    },
    avance: { numeroEquipo: equipo.numero, completos, total: evaluadores, evaluadores: avanceEvaluadores },
  };
}

// ---------------------------------------------------------------------------
// Resumen del grupo (PRD §11.3)
// ---------------------------------------------------------------------------
//
// Built on top of each jornada's Reporte (agregarReporte above), so every
// participant figure is the one the Reporte general shows. Participants are
// keyed by jornada + id (P01 exists in both jornadas): each jornada's
// participants stay inside their own Reporte, and the combined figures only
// concatenate those lists, never look a participant up by id across them.
//
// Jornadas are compared by competencia, never by team number: each entry
// carries its own jornada's team (Equipo 4 in the morning, Equipo 1 at night
// for Adaptabilidad), and evaluator counts come from that team's size.

export type IndicadorGrupo = {
  indicadorId: string;
  numero: number;
  titulo: string;
  /** Mean of the participants' means for this indicator; null without ratings. */
  media: number | null;
  nivel: NivelValor | null;
  brecha: Brecha | null;
};

export type CifrasGrupo = {
  /** Puntaje del grupo (PRD §7); null without evaluated participants. */
  puntaje: number | null;
  nivel: NivelValor | null;
  brecha: Brecha | null;
  /** Nivel general of every evaluated participant, for "Participantes por nivel". */
  niveles: NivelValor[];
  participantesEvaluados: number;
  participantesTotal: number;
  ausentes: number;
  recibidas: number;
  esperadas: number;
  cobertura: number | null;
  evaluadoresCompletos: number;
  evaluadoresTotal: number;
  /**
   * Group mean per indicator. Null for "ambas" when the jornadas rate with
   * different rubrics: their indicators can't be averaged together.
   */
  indicadores: IndicadorGrupo[] | null;
  /** The strongest and weakest indicators (ties kept); empty without indicator means. */
  masFuertes: IndicadorGrupo[];
  masDebiles: IndicadorGrupo[];
};

export type ResumenJornada = CifrasGrupo & {
  jornada: JornadaId;
  /** That jornada's display label for its team ("Mañana · Equipo 4", "Noche · Equipo 1"). */
  numeroEquipo: number;
  indicadores: IndicadorGrupo[];
};

export type ResumenGrupo = {
  competencia: { id: string; nombre: string };
  seleccion: SeleccionJornada;
  /** No evaluation sent in any selected jornada. */
  vacio: boolean;
  /** The selected group as a whole (both jornadas together for "ambas"). */
  grupo: CifrasGrupo;
  /** One entry per selected jornada, in JORNADAS order. */
  jornadas: ResumenJornada[];
  /** Every selected jornada rates with the same indicator ids, so indicator means compare side by side. */
  mismaRubrica: boolean;
};

/** One jornada's input: its rubric, its own team and its Reporte. */
export type EntradaResumen = { jornada: JornadaId; competencia: Competencia; equipo: Equipo; reporte: Reporte };

type BaseIndicador = { indicadorId: string; numero: number; titulo: string };

function indicadorGrupo(base: BaseIndicador, medias: readonly (number | null)[]): IndicadorGrupo {
  const media = puntajeGrupo(medias.flatMap((m) => (m === null ? [] : [m])));
  return {
    indicadorId: base.indicadorId,
    numero: base.numero,
    titulo: base.titulo,
    media,
    nivel: media === null ? null : nivelGeneral(media),
    brecha: media === null ? null : brechaSiguienteNivel(media),
  };
}

/** Group figures from the participants of one or more jornadas' reports. */
function cifras(
  reportes: readonly Reporte[],
  /** The shared indicators, aligned with every report's participant indicators; null when they differ. */
  indicadoresBase: readonly BaseIndicador[] | null,
): CifrasGrupo {
  const participantes = reportes.flatMap((r) => r.participantes);
  const evaluados = participantes.filter((p) => p.puntajeGeneral !== null && p.nivelGeneral !== null);
  const puntaje = puntajeGrupo(evaluados.map((p) => p.puntajeGeneral as number));
  const indicadores =
    indicadoresBase?.map((base, i) => indicadorGrupo(base, evaluados.map((p) => p.indicadores[i]?.media ?? null))) ?? null;
  const extremo = indicadores ? extremos(indicadores.map((i) => i.media)) : null;
  const suma = (f: (r: Reporte) => number) => reportes.reduce((total, r) => total + f(r), 0);
  const recibidas = suma((r) => r.kpis.recibidas);
  const esperadas = suma((r) => r.kpis.esperadas);
  return {
    puntaje,
    nivel: puntaje === null ? null : nivelGeneral(puntaje),
    brecha: puntaje === null ? null : brechaSiguienteNivel(puntaje),
    niveles: evaluados.map((p) => p.nivelGeneral as NivelValor),
    participantesEvaluados: evaluados.length,
    participantesTotal: participantes.length,
    ausentes: participantes.filter((p) => p.asistencia === "ausente").length,
    recibidas,
    esperadas,
    cobertura: proporcion(recibidas, esperadas),
    evaluadoresCompletos: suma((r) => r.kpis.evaluadoresCompletos),
    evaluadoresTotal: suma((r) => r.kpis.evaluadoresTotal),
    indicadores,
    masFuertes: indicadores && extremo ? extremo.maximos.map((i) => indicadores[i]) : [],
    masDebiles: indicadores && extremo ? extremo.minimos.map((i) => indicadores[i]) : [],
  };
}

const basesIndicadores = (competencia: Competencia): BaseIndicador[] =>
  competencia.indicadores.map((i) => ({ indicadorId: i.id, numero: i.numero, titulo: i.titulo }));

/**
 * The group summary for one jornada or both (PRD §11.3). Each entry is one
 * jornada's Reporte with its own rubric and team; with two entries the
 * selection is "ambas". Throws on no entries, a repeated jornada or entries
 * of different competencias: the caller resolves the selection first.
 */
export function agregarResumenGrupo(entradas: readonly EntradaResumen[]): ResumenGrupo {
  const [primera] = entradas;
  if (!primera) throw new Error("agregarResumenGrupo: no jornada");
  if (new Set(entradas.map((e) => e.jornada)).size !== entradas.length) throw new Error("agregarResumenGrupo: repeated jornada");
  if (entradas.some((e) => e.competencia.id !== primera.competencia.id)) throw new Error("agregarResumenGrupo: mixed competencias");

  const ordenadas = [...entradas].sort((a, b) => IDS_JORNADA.indexOf(a.jornada) - IDS_JORNADA.indexOf(b.jornada));
  const jornadas = ordenadas.map((e): ResumenJornada => {
    const propias = cifras([e.reporte], basesIndicadores(e.competencia));
    return { ...propias, indicadores: propias.indicadores ?? [], jornada: e.jornada, numeroEquipo: e.equipo.numero };
  });

  const clave = (e: EntradaResumen) => e.competencia.indicadores.map((i) => i.id).join("|");
  const mismaRubrica = ordenadas.every((e) => clave(e) === clave(primera));

  return {
    competencia: { id: primera.competencia.id, nombre: primera.competencia.nombre },
    seleccion: ordenadas.length > 1 ? "ambas" : primera.jornada,
    vacio: ordenadas.every((e) => e.reporte.vacio),
    grupo:
      ordenadas.length === 1
        ? jornadas[0]
        : cifras(
            ordenadas.map((e) => e.reporte),
            mismaRubrica ? basesIndicadores(primera.competencia) : null,
          ),
    jornadas,
    mismaRubrica,
  };
}

// ---------------------------------------------------------------------------
// Reporte consolidado (PRD §11.4)
// ---------------------------------------------------------------------------
//
// All five competencias of one jornada side by side, built on each
// competencia's Reporte (agregarReporte above), so every figure is the one
// that competencia's Reporte general shows. Participants are the jornada's
// list (the same for every competencia), identified by carnet. Competencias
// without a rubric or a team in the jornada stay in the list, marked as not
// available, so the report always shows the five in config order.

/** One competencia's row in "Resumen por competencia". */
export type CompetenciaConsolidada = {
  id: string;
  nombre: string;
  /** It has a rubric and a team in this jornada. */
  disponible: boolean;
  /** This jornada's display label for its team; null when not available. */
  numeroEquipo: number | null;
  /** Available and with at least one evaluation sent. */
  conEvaluaciones: boolean;
  /** Puntaje del grupo (PRD §7) for this competencia; null without evaluated participants. */
  puntaje: number | null;
  nivel: NivelValor | null;
  brecha: Brecha | null;
  participantesEvaluados: number;
  participantesTotal: number;
  recibidas: number;
  esperadas: number;
  cobertura: number | null;
  ausentes: number;
  evaluadoresCompletos: number;
  evaluadoresTotal: number;
};

/** A participant's result in one competencia; null in `celdas` when the competencia isn't available. */
export type CeldaConsolidada = {
  puntaje: number | null;
  nivel: NivelValor | null;
  evaluaciones: number;
  asistencia: Asistencia | null;
};

export type ParticipanteConsolidado = {
  id: string;
  /** Carnet, or "Participante NN" (PRD §11, v1.4). */
  etiqueta: string;
  /** Aligned with ReporteConsolidado.competencias. */
  celdas: (CeldaConsolidada | null)[];
  /** Competencias where this participant has a puntaje general. */
  competenciasEvaluadas: number;
  /** Promedio entre competencias (PRD §7); null without any puntaje general. */
  promedio: number | null;
  nivel: NivelValor | null;
  brecha: Brecha | null;
};

export type ReporteConsolidado = {
  /** No evaluation sent in any competencia of the jornada. */
  vacio: boolean;
  /** Every competencia in config order, available or not. */
  competencias: CompetenciaConsolidada[];
  /** The jornada's active participants, in list order. */
  participantes: ParticipanteConsolidado[];
  kpis: {
    competenciasDisponibles: number;
    competenciasConEvaluaciones: number;
    competenciasTotal: number;
    /** Participants with a puntaje general in at least one competencia. */
    participantesEvaluados: number;
    participantesTotal: number;
    recibidas: number;
    esperadas: number;
    cobertura: number | null;
    /** Mean of the participants' promedios entre competencias (puntajeGrupo). */
    promedioGrupo: number | null;
    nivelGrupo: NivelValor | null;
    brechaGrupo: Brecha | null;
    evaluadoresCompletos: number;
    evaluadoresTotal: number;
  };
};

/** One competencia of the jornada: its Reporte, or null without a rubric or team there. */
export type EntradaConsolidado = { id: string; nombre: string; reporte: Reporte | null };

export function agregarConsolidado(
  participantes: readonly Pick<Participante, "id" | "etiquetaReporte">[],
  entradas: readonly EntradaConsolidado[],
): ReporteConsolidado {
  const competencias = entradas.map(({ id, nombre, reporte }): CompetenciaConsolidada => {
    if (reporte === null) {
      return {
        id,
        nombre,
        disponible: false,
        numeroEquipo: null,
        conEvaluaciones: false,
        puntaje: null,
        nivel: null,
        brecha: null,
        participantesEvaluados: 0,
        participantesTotal: 0,
        recibidas: 0,
        esperadas: 0,
        cobertura: null,
        ausentes: 0,
        evaluadoresCompletos: 0,
        evaluadoresTotal: 0,
      };
    }
    const puntaje = puntajeGrupo(reporte.ranking.map((r) => r.puntaje));
    const { kpis } = reporte;
    return {
      id,
      nombre,
      disponible: true,
      numeroEquipo: reporte.avance.numeroEquipo,
      conEvaluaciones: !reporte.vacio,
      puntaje,
      nivel: puntaje === null ? null : nivelGeneral(puntaje),
      brecha: puntaje === null ? null : brechaSiguienteNivel(puntaje),
      participantesEvaluados: kpis.participantesEvaluados,
      participantesTotal: kpis.participantesTotal,
      recibidas: kpis.recibidas,
      esperadas: kpis.esperadas,
      cobertura: kpis.cobertura,
      ausentes: kpis.ausentes,
      evaluadoresCompletos: kpis.evaluadoresCompletos,
      evaluadoresTotal: kpis.evaluadoresTotal,
    };
  });

  // participante id → its row in each competencia's report (null when not available).
  const porCompetencia = entradas.map(({ reporte }) =>
    reporte === null ? null : new Map(reporte.participantes.map((p) => [p.id, p])),
  );

  const filas = participantes.map((participante): ParticipanteConsolidado => {
    const celdas = porCompetencia.map((mapa): CeldaConsolidada | null => {
      if (mapa === null) return null;
      const propio = mapa.get(participante.id);
      return {
        puntaje: propio?.puntajeGeneral ?? null,
        nivel: propio?.nivelGeneral ?? null,
        evaluaciones: propio?.evaluaciones ?? 0,
        asistencia: propio?.asistencia ?? null,
      };
    });
    const puntajes = celdas.flatMap((c) => (c?.puntaje == null ? [] : [c.puntaje]));
    const media = puntajeEntreCompetencias(puntajes);
    return {
      id: participante.id,
      etiqueta: participante.etiquetaReporte,
      celdas,
      competenciasEvaluadas: puntajes.length,
      promedio: media,
      nivel: media === null ? null : nivelGeneral(media),
      brecha: media === null ? null : brechaSiguienteNivel(media),
    };
  });

  const disponibles = competencias.filter((c) => c.disponible);
  const suma = (f: (c: CompetenciaConsolidada) => number) => disponibles.reduce((total, c) => total + f(c), 0);
  const recibidas = suma((c) => c.recibidas);
  const esperadas = suma((c) => c.esperadas);
  const promedioGrupo = puntajeGrupo(filas.flatMap((f) => (f.promedio === null ? [] : [f.promedio])));

  return {
    vacio: competencias.every((c) => !c.conEvaluaciones),
    competencias,
    participantes: filas,
    kpis: {
      competenciasDisponibles: disponibles.length,
      competenciasConEvaluaciones: competencias.filter((c) => c.conEvaluaciones).length,
      competenciasTotal: competencias.length,
      participantesEvaluados: filas.filter((f) => f.promedio !== null).length,
      participantesTotal: participantes.length,
      recibidas,
      esperadas,
      cobertura: proporcion(recibidas, esperadas),
      promedioGrupo,
      nivelGrupo: promedioGrupo === null ? null : nivelGeneral(promedioGrupo),
      brechaGrupo: promedioGrupo === null ? null : brechaSiguienteNivel(promedioGrupo),
      evaluadoresCompletos: suma((c) => c.evaluadoresCompletos),
      evaluadoresTotal: suma((c) => c.evaluadoresTotal),
    },
  };
}

// --- Dashboard of the Reporte consolidado (PRD §11.4) -----------------------

/** A competencia named in a dashboard sentence, with its score. */
export type CompetenciaDestacada = { id: string; nombre: string; puntaje: number };

/** A participant with at least one competencia in nivel Básico ("Requieren atención"). */
export type ParticipanteAtencion = {
  id: string;
  etiqueta: string;
  promedio: number | null;
  nivel: NivelValor | null;
  /** The competencias where their puntaje general is Básico, in config order. */
  competencias: CompetenciaDestacada[];
};

export type TableroConsolidado = {
  /** The competencias with the highest and lowest puntaje del grupo (ties kept); empty without scores. */
  masFuertes: CompetenciaDestacada[];
  masDebiles: CompetenciaDestacada[];
  /** Participants by nivel of their promedio entre competencias. */
  conteoNiveles: Record<NivelValor, number>;
  /** Lowest promedio first, then id. */
  atencion: ParticipanteAtencion[];
};

function destacadas(candidatas: readonly { id: string; nombre: string; puntaje: number | null }[]) {
  const extremo = extremos(candidatas.map((c) => c.puntaje));
  const tomar = (indices: number[]) =>
    indices.map((i) => ({ id: candidatas[i].id, nombre: candidatas[i].nombre, puntaje: candidatas[i].puntaje as number }));
  return extremo ? { masFuertes: tomar(extremo.maximos), masDebiles: tomar(extremo.minimos) } : { masFuertes: [], masDebiles: [] };
}

/** The dashboard figures, from the consolidated report alone (no new math: levels come from puntajes.ts). */
export function tableroConsolidado(reporte: ReporteConsolidado): TableroConsolidado {
  const disponibles = reporte.competencias.filter((c) => c.disponible);
  const atencion = reporte.participantes
    .map((p) => ({
      id: p.id,
      etiqueta: p.etiqueta,
      promedio: p.promedio,
      nivel: p.nivel,
      competencias: p.celdas.flatMap((celda, i) =>
        celda?.puntaje != null && celda.nivel === 1
          ? [{ id: reporte.competencias[i].id, nombre: reporte.competencias[i].nombre, puntaje: celda.puntaje }]
          : [],
      ),
    }))
    .filter((p) => p.competencias.length > 0)
    .sort((a, b) => redondear2(a.promedio ?? 0) - redondear2(b.promedio ?? 0) || a.id.localeCompare(b.id));
  return {
    ...destacadas(disponibles),
    conteoNiveles: distribucion(reporte.participantes.flatMap((p) => (p.nivel === null ? [] : [p.nivel]))),
    atencion,
  };
}

// --- Reporte del participante (PRD §11.5) ----------------------------------
//
// One participant across every competencia of the jornada, built on each
// competencia's Reporte so every figure matches that competencia's Reporte
// individual. Identified by carnet, never by name.

export type IndicadorParticipante = { numero: number; titulo: string; media: number | null; nivel: NivelValor | null };

export type CompetenciaParticipante = {
  id: string;
  nombre: string;
  /** It has a rubric and a team in this jornada. */
  disponible: boolean;
  puntaje: number | null;
  nivel: NivelValor | null;
  brecha: Brecha | null;
  evaluaciones: number;
  asistencia: Asistencia | null;
  /** Empty when not available. */
  indicadores: IndicadorParticipante[];
  /** Highest and lowest indicator means (ties kept); empty without ratings. */
  indicadoresFuertes: IndicadorParticipante[];
  indicadoresDebiles: IndicadorParticipante[];
};

export type ReporteParticipanteConsolidado = {
  id: string;
  etiqueta: string;
  promedio: number | null;
  nivel: NivelValor | null;
  brecha: Brecha | null;
  competenciasEvaluadas: number;
  competenciasDisponibles: number;
  /** Evaluations received, summed over the competencias. */
  evaluaciones: number;
  /** Every competencia in config order, available or not. */
  competencias: CompetenciaParticipante[];
  masFuertes: CompetenciaDestacada[];
  masDebiles: CompetenciaDestacada[];
};

/** Null when the participant isn't in the jornada's active list. */
export function agregarParticipanteConsolidado(
  participantes: readonly Pick<Participante, "id" | "etiquetaReporte">[],
  entradas: readonly EntradaConsolidado[],
  participanteId: string,
): ReporteParticipanteConsolidado | null {
  const participante = participantes.find((p) => p.id === participanteId);
  if (!participante) return null;

  const competencias = entradas.map(({ id, nombre, reporte }): CompetenciaParticipante => {
    const propio = reporte?.participantes.find((p) => p.id === participanteId);
    const indicadores = (propio?.indicadores ?? []).map((i) => ({
      numero: i.numero,
      titulo: i.titulo,
      media: i.media,
      nivel: i.media === null ? null : nivelGeneral(i.media),
    }));
    const extremo = extremos(indicadores.map((i) => i.media));
    return {
      id,
      nombre,
      disponible: reporte !== null,
      puntaje: propio?.puntajeGeneral ?? null,
      nivel: propio?.nivelGeneral ?? null,
      brecha: propio?.brecha ?? null,
      evaluaciones: propio?.evaluaciones ?? 0,
      asistencia: propio?.asistencia ?? null,
      indicadores,
      indicadoresFuertes: extremo ? extremo.maximos.map((i) => indicadores[i]) : [],
      indicadoresDebiles: extremo ? extremo.minimos.map((i) => indicadores[i]) : [],
    };
  });

  const puntajes = competencias.flatMap((c) => (c.puntaje === null ? [] : [c.puntaje]));
  const promedio = puntajeEntreCompetencias(puntajes);
  return {
    id: participante.id,
    etiqueta: participante.etiquetaReporte,
    promedio,
    nivel: promedio === null ? null : nivelGeneral(promedio),
    brecha: promedio === null ? null : brechaSiguienteNivel(promedio),
    competenciasEvaluadas: puntajes.length,
    competenciasDisponibles: competencias.filter((c) => c.disponible).length,
    evaluaciones: competencias.reduce((suma, c) => suma + c.evaluaciones, 0),
    competencias,
    ...destacadas(competencias.filter((c) => c.disponible)),
  };
}
