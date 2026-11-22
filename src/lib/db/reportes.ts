import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { competenciasDeJornada, type Competencia } from "@/config/competencias";
import { equipoDeCompetencia, type Equipo } from "@/config/equipos";
import type { JornadaId } from "@/config/jornadas";
import type { Participante } from "@/config/participantes";
import { estadoCuenta } from "@/lib/cuentas";
import {
  agregarConsolidado,
  agregarParticipanteConsolidado,
  agregarReporte,
  agregarResumenGrupo,
  agregarUsoAplicacion,
  type EntradaConsolidado,
  type FilaReporte,
  type InfoCuenta,
  type Reporte,
  type ReporteConsolidado,
  type ReporteParticipanteConsolidado,
  type ResumenGrupo,
  type UsoAplicacion,
} from "@/lib/reportes";
import type { JornadaResumen } from "@/lib/validacion";
import { leerAusenciasReporte } from "./asistencia";
import { cuentasPorIds } from "./cuentas";
import { getDb } from "./index";
import { obtenerParticipantes } from "./participantes";
import { calificaciones, evaluaciones } from "./schema";

// Reads for the report routes, always for one jornada (its team, its
// participants, its evaluations): one join over a competencia's evaluaciones and
// calificaciones (a few hundred rows for one team of evaluators × ~20 participants).
// Aggregation lives in lib/reportes.ts, so it is unit-tested without a DB.

export async function leerFilasReporte(jornada: JornadaId, competenciaId: string): Promise<FilaReporte[]> {
  const filas = await getDb()
    .select({
      evaluadorId: evaluaciones.evaluadorId,
      participanteId: evaluaciones.participanteId,
      actualizadoEn: evaluaciones.updatedAt,
      indicadorId: calificaciones.indicadorId,
      nivel: calificaciones.nivel,
      origen: calificaciones.origen,
      observacion: calificaciones.observacion,
      iaNivelSugerido: calificaciones.iaNivelSugerido,
      iaConfianza: calificaciones.iaConfianza,
    })
    .from(evaluaciones)
    .innerJoin(calificaciones, eq(calificaciones.evaluacionId, evaluaciones.id))
    .where(and(eq(evaluaciones.jornada, jornada), eq(evaluaciones.competenciaId, competenciaId)))
    .orderBy(asc(evaluaciones.participanteId), asc(evaluaciones.evaluadorId), asc(calificaciones.indicadorId));
  return filas.map((f) => ({ ...f, actualizadoEn: f.actualizadoEn.toISOString() }));
}

/** Everything both reports need for one competencia of the jornada, over its active participants. */
export async function obtenerReporte(jornada: JornadaId, competencia: Competencia, equipo: Equipo): Promise<Reporte> {
  return reporteSobre(jornada, competencia, equipo, obtenerParticipantes(jornada));
}

/** `participantes` may be pending, so a single report reads it alongside its rows. */
async function reporteSobre(
  jornada: JornadaId,
  competencia: Competencia,
  equipo: Equipo,
  participantes: readonly Participante[] | Promise<readonly Participante[]>,
): Promise<Reporte> {
  const [lista, filas, ausencias, cuentas] = await Promise.all([
    participantes,
    leerFilasReporte(jornada, competencia.id),
    leerAusenciasReporte(jornada, competencia.id),
    leerCuentasEquipo(equipo),
  ]);
  return agregarReporte(competencia, equipo, lista, filas, ausencias, cuentas);
}

/**
 * Every competencia of the jornada, each over its own rubric and team, all
 * over the jornada's one participant list (read once). A competencia without
 * a rubric or a team in the jornada comes back with `reporte: null`. Also
 * used by the results email (lib/envioResultados.ts, PRD §5.14 v1.13).
 */
export async function leerEntradasConsolidado(
  jornada: JornadaId,
): Promise<{ participantes: Participante[]; entradas: EntradaConsolidado[] }> {
  const participantes = await obtenerParticipantes(jornada);
  const entradas = await Promise.all(
    competenciasDeJornada(jornada).map(async (competencia) => {
      const equipo = competencia.habilitada ? equipoDeCompetencia(jornada, competencia.id) : undefined;
      return {
        id: competencia.id,
        nombre: competencia.nombre,
        reporte: equipo ? await reporteSobre(jornada, competencia, equipo, participantes) : null,
      };
    }),
  );
  return { participantes, entradas };
}

/** The Reporte consolidado (PRD §11.4) of the session's jornada. Read-only. */
export async function obtenerReporteConsolidado(jornada: JornadaId): Promise<ReporteConsolidado> {
  const { participantes, entradas } = await leerEntradasConsolidado(jornada);
  return agregarConsolidado(participantes, entradas);
}

/**
 * The Reporte del participante (PRD §11.5): one participant across every
 * competencia of the session's jornada, plus the active list (carnet labels)
 * for the previous/next links. `reporte` is null when the id isn't active in
 * the jornada. Read-only.
 */
export async function obtenerParticipanteConsolidado(
  jornada: JornadaId,
  participanteId: string,
): Promise<{ reporte: ReporteParticipanteConsolidado | null; lista: { id: string; etiqueta: string }[] }> {
  const { participantes, entradas } = await leerEntradasConsolidado(jornada);
  return {
    reporte: agregarParticipanteConsolidado(participantes, entradas, participanteId),
    lista: participantes.map((p) => ({ id: p.id, etiqueta: p.etiquetaReporte })),
  };
}

/** "Uso de la aplicación" (PRD §11.6, v1.14): every team of the session's jornada. Read-only. */
export async function obtenerUsoAplicacion(jornada: JornadaId): Promise<UsoAplicacion> {
  const { entradas } = await leerEntradasConsolidado(jornada);
  return agregarUsoAplicacion(entradas);
}

/**
 * The group summary (PRD §11.3) for the jornadas validarSeleccionResumen()
 * resolved: each jornada's own report (its team, participants, evaluations),
 * read in parallel, then combined. Read-only.
 */
export async function obtenerResumenGrupo(jornadas: readonly JornadaResumen[]): Promise<ResumenGrupo> {
  const reportes = await Promise.all(jornadas.map((j) => obtenerReporte(j.jornada, j.competencia, j.equipo)));
  return agregarResumenGrupo(jornadas.map((j, i) => ({ ...j, reporte: reportes[i] })));
}

/**
 * Account status and last access of the team's members, for "Avance de
 * evaluadores" (PRD §11.2). The email is read only to derive "Sin correo"
 * and never leaves this function.
 */
async function leerCuentasEquipo(equipo: Equipo): Promise<Record<string, InfoCuenta>> {
  const filas = await cuentasPorIds(getDb(), equipo.integrantes.map((i) => i.id));
  return Object.fromEntries(
    filas.map((f) => [
      f.integranteId,
      { estado: estadoCuenta(f), ultimoAcceso: f.ultimoAcceso?.toISOString() ?? null, activadaEn: f.activadaEn?.toISOString() ?? null },
    ]),
  );
}
