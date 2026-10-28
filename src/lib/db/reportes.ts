import "server-only";
import { asc, eq } from "drizzle-orm";
import type { Competencia } from "@/config/competencias";
import type { Equipo } from "@/config/equipos";
import { agregarReporte, type FilaReporte, type Reporte } from "@/lib/reportes";
import { getDb } from "./index";
import { obtenerParticipantes } from "./participantes";
import { calificaciones, evaluaciones } from "./schema";

// Reads for the report routes: one join over a competencia's evaluaciones and
// calificaciones (a few hundred rows for 8 evaluators × 20 participants).
// Aggregation lives in lib/reportes.ts, so it is unit-tested without a DB.

export async function leerFilasReporte(competenciaId: string): Promise<FilaReporte[]> {
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
    .where(eq(evaluaciones.competenciaId, competenciaId))
    .orderBy(asc(evaluaciones.participanteId), asc(evaluaciones.evaluadorId), asc(calificaciones.indicadorId));
  return filas.map((f) => ({ ...f, actualizadoEn: f.actualizadoEn.toISOString() }));
}

/** Everything both reports need for one competencia, over the active participants. */
export async function obtenerReporte(competencia: Competencia, equipo: Equipo): Promise<Reporte> {
  const [participantes, filas] = await Promise.all([obtenerParticipantes(), leerFilasReporte(competencia.id)]);
  return agregarReporte(competencia, equipo, participantes, filas);
}
