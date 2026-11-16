import "server-only";
import { and, asc, eq } from "drizzle-orm";
import type { Competencia } from "@/config/competencias";
import type { Equipo } from "@/config/equipos";
import type { JornadaId } from "@/config/jornadas";
import { agregarReporte, type FilaReporte, type Reporte } from "@/lib/reportes";
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
  const [participantes, filas] = await Promise.all([
    obtenerParticipantes(jornada),
    leerFilasReporte(jornada, competencia.id),
  ]);
  return agregarReporte(competencia, equipo, participantes, filas);
}
