import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import type { JornadaId } from "@/config/jornadas";
import type { ParAusente } from "@/lib/reportes";
import { getDb } from "./index";
import { asistencia, evaluaciones } from "./schema";
// Attendance marks (PRD §5.13): reads and writes for /api/asistencia,
// /api/evaluaciones and the reports. Always one jornada, never one from the
// request (the routes pass the session's).

export type ClaveAsistencia = {
  competenciaId: string;
  evaluadorId: string;
  participanteId: string;
};

/**
 * The statement that saves one mark. Marking absent is a single
 * INSERT … SELECT … WHERE NOT EXISTS (the evaluation), so "refused if that
 * evaluator already sent it" can't race a submission: it returns no row
 * when the evaluation exists. Marking present always returns its row.
 * Plain SQL so the integration test runs the same statement on PGlite.
 */
export function sqlMarcar(jornada: JornadaId, clave: ClaveAsistencia, ausente: boolean) {
  const { competenciaId, evaluadorId, participanteId } = clave;
  const condicion = ausente
    ? sql`where not exists (
        select 1 from ${evaluaciones}
        where ${evaluaciones.jornada} = ${jornada}
          and ${evaluaciones.competenciaId} = ${competenciaId}
          and ${evaluaciones.evaluadorId} = ${evaluadorId}
          and ${evaluaciones.participanteId} = ${participanteId}
      )`
    : sql``;
  return sql`
    insert into ${asistencia} (jornada, competencia_id, evaluador_id, participante_id, ausente, updated_at)
    select ${jornada}::text, ${competenciaId}::text, ${evaluadorId}::text, ${participanteId}::text, ${ausente}::boolean, now()
    ${condicion}
    on conflict (jornada, competencia_id, evaluador_id, participante_id)
    do update set ausente = excluded.ausente, updated_at = excluded.updated_at
    returning updated_at
  `;
}

/** Result of a mark: saved, or refused because the evaluation was already sent. */
export type ResultadoMarca = { ok: true; actualizadoEn: string } | { ok: false; motivo: "enviada" };

export async function marcarAsistencia(jornada: JornadaId, clave: ClaveAsistencia, ausente: boolean): Promise<ResultadoMarca> {
  const { rows } = await getDb().execute<{ updated_at: string | Date }>(sqlMarcar(jornada, clave, ausente));
  const fila = rows[0];
  if (!fila) return { ok: false, motivo: "enviada" };
  return { ok: true, actualizadoEn: new Date(fila.updated_at).toISOString() };
}

/** Participants this evaluator marked absent for the competencia in the jornada. */
export async function listarAusentes(jornada: JornadaId, competenciaId: string, evaluadorId: string): Promise<string[]> {
  const filas = await getDb()
    .select({ participanteId: asistencia.participanteId })
    .from(asistencia)
    .where(
      and(
        eq(asistencia.jornada, jornada),
        eq(asistencia.competenciaId, competenciaId),
        eq(asistencia.evaluadorId, evaluadorId),
        eq(asistencia.ausente, true),
      ),
    )
    .orderBy(asc(asistencia.participanteId));
  return filas.map((f) => f.participanteId);
}

/** Whether this evaluator has this participant marked absent (POST /api/evaluaciones refuses it). */
export async function estaAusente(jornada: JornadaId, clave: ClaveAsistencia): Promise<boolean> {
  const filas = await getDb()
    .select({ ausente: asistencia.ausente })
    .from(asistencia)
    .where(
      and(
        eq(asistencia.jornada, jornada),
        eq(asistencia.competenciaId, clave.competenciaId),
        eq(asistencia.evaluadorId, clave.evaluadorId),
        eq(asistencia.participanteId, clave.participanteId),
      ),
    )
    .limit(1);
  return filas[0]?.ausente === true;
}

/** Every absent pair of the competencia in the jornada, for lib/reportes.ts. */
export async function leerAusenciasReporte(jornada: JornadaId, competenciaId: string): Promise<ParAusente[]> {
  return getDb()
    .select({ evaluadorId: asistencia.evaluadorId, participanteId: asistencia.participanteId })
    .from(asistencia)
    .where(and(eq(asistencia.jornada, jornada), eq(asistencia.competenciaId, competenciaId), eq(asistencia.ausente, true)))
    .orderBy(asc(asistencia.participanteId), asc(asistencia.evaluadorId));
}
