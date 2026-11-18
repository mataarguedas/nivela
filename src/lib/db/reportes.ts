import "server-only";
import { and, asc, eq } from "drizzle-orm";
import type { Competencia } from "@/config/competencias";
import type { Equipo } from "@/config/equipos";
import type { JornadaId } from "@/config/jornadas";
import { estadoCuenta } from "@/lib/cuentas";
import { agregarReporte, type FilaReporte, type InfoCuenta, type Reporte } from "@/lib/reportes";
import { leerAusenciasReporte } from "./asistencia";
import { cuentasPorIds } from "./cuentas";
import { getDb } from "./index";
import { obtenerParticipantes } from "./participantes";
import { calificaciones, evaluaciones } from "./schema";

// Reads for the report routes, always for one jornada (its team, its
// participants, its evaluations): one join over a competencia's evaluaciones and
// calificaciones (a few hundred rows for 8 evaluators × 20 participants).
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
  const [participantes, filas, ausencias, cuentas] = await Promise.all([
    obtenerParticipantes(jornada),
    leerFilasReporte(jornada, competencia.id),
    leerAusenciasReporte(jornada, competencia.id),
    leerCuentasEquipo(equipo),
  ]);
  return agregarReporte(competencia, equipo, participantes, filas, ausencias, cuentas);
}

/**
 * Account status and last access of the team's members, for "Avance de
 * evaluadores" (PRD §11.2). The email is read only to derive "Sin correo"
 * and never leaves this function.
 */
async function leerCuentasEquipo(equipo: Equipo): Promise<Record<string, InfoCuenta>> {
  const filas = await cuentasPorIds(getDb(), equipo.integrantes.map((i) => i.id));
  return Object.fromEntries(
    filas.map((f) => [f.integranteId, { estado: estadoCuenta(f), ultimoAcceso: f.ultimoAcceso?.toISOString() ?? null }]),
  );
}
