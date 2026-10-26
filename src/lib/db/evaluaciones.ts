import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import type { NivelValor } from "@/config/niveles";
import { puntajeEvaluacion, redondear2 } from "@/lib/puntajes";
import type { EvaluacionValida } from "@/lib/validacion";
import { getDb } from "./index";
import { calificaciones, evaluaciones } from "./schema";
import type * as schema from "./schema";

// Reads and writes for /api/evaluaciones and the seed script.

type Bd = PgDatabase<PgQueryResultHKT, typeof schema>;

export type EvaluacionGuardada = { id: string; actualizadoEn: string };
export type EnvioRegistrado = { participanteId: string; actualizadoEn: string };

/**
 * The submission upsert (CLAUDE.md → Database) as three statements that must
 * run in one transaction, in order:
 *   1. upsert the evaluación on (competencia, evaluador, participante),
 *      setting puntaje and updated_at = now();
 *   2. delete that evaluación's calificaciones;
 *   3. insert the new ones.
 * Steps 2 and 3 find the evaluación by its natural key, not by step 1's
 * returned id, so the statements work in a neon-http batch. Generic over the
 * database so the integration test can run the same statements on PGlite.
 */
export function sentenciasGuardar<B extends Bd>(db: B, evaluacion: EvaluacionValida) {
  const { competenciaId, evaluadorId, participanteId } = evaluacion;
  const niveles = evaluacion.calificaciones.map((c) => c.nivel as NivelValor);
  // validarEvaluacion() guarantees at least one calificación.
  const puntaje = redondear2(puntajeEvaluacion(niveles) ?? 0);

  const clave = and(
    eq(evaluaciones.competenciaId, competenciaId),
    eq(evaluaciones.evaluadorId, evaluadorId),
    eq(evaluaciones.participanteId, participanteId),
  );
  const idEvaluacion = sql<string>`(${db.select({ id: evaluaciones.id }).from(evaluaciones).where(clave)})`;

  const upsert = db
    .insert(evaluaciones)
    .values({ competenciaId, evaluadorId, participanteId, puntaje })
    .onConflictDoUpdate({
      target: [evaluaciones.competenciaId, evaluaciones.evaluadorId, evaluaciones.participanteId],
      set: { puntaje, updatedAt: sql`now()` },
    })
    .returning({ id: evaluaciones.id, actualizadoEn: evaluaciones.updatedAt });

  const borrar = db.delete(calificaciones).where(eq(calificaciones.evaluacionId, idEvaluacion));

  const insertar = db.insert(calificaciones).values(
    evaluacion.calificaciones.map((c) => ({
      evaluacionId: idEvaluacion,
      indicadorId: c.indicadorId,
      nivel: c.nivel,
      observacion: c.observacion,
      origen: c.origen,
      iaNivelSugerido: c.ia?.nivelSugerido ?? null,
      iaProbabilidades: c.ia?.probabilidades ?? null,
      iaConfianza: c.ia?.confianza ?? null,
      iaModelo: c.ia?.modelo ?? null,
    })),
  );

  return [upsert, borrar, insertar] as const;
}

/** Saves one validated evaluation atomically (one neon-http batch). */
export async function guardarEvaluacion(evaluacion: EvaluacionValida): Promise<EvaluacionGuardada> {
  const db = getDb();
  const [filas] = await db.batch(sentenciasGuardar(db, evaluacion));
  const fila = filas[0];
  if (!fila) throw new Error("upsert returned no row");
  return { id: fila.id, actualizadoEn: fila.actualizadoEn.toISOString() };
}

/** Participants this evaluator has already sent for the competencia, with updated_at. */
export async function listarEnviadas(competenciaId: string, evaluadorId: string): Promise<EnvioRegistrado[]> {
  const filas = await getDb()
    .select({ participanteId: evaluaciones.participanteId, actualizadoEn: evaluaciones.updatedAt })
    .from(evaluaciones)
    .where(and(eq(evaluaciones.competenciaId, competenciaId), eq(evaluaciones.evaluadorId, evaluadorId)))
    .orderBy(asc(evaluaciones.participanteId));
  return filas.map((f) => ({ participanteId: f.participanteId, actualizadoEn: f.actualizadoEn.toISOString() }));
}
